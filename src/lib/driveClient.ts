// Google Drive REST client (v3), browser-side using the access token.
// Unlike the read-only Drive connector, the Drive API itself supports moving
// (changing a file's parents) and trashing — which is what powers organize +
// cleanup. Requires the `drive` OAuth scope.

import { getValidAccessToken } from "../hooks/useAuth";
import { withBackoff, mapLimit, GmailApiError } from "./backoff";

const BASE = "https://www.googleapis.com/drive/v3";

export interface DriveFile {
  id: string;
  name: string;
  size: number; // bytes actually consuming quota
  mimeType: string;
  md5?: string;
  modifiedTime: number;
  parents: string[];
  webViewLink?: string;
  thumbnailLink?: string; // preview URL (images, video, PDF, etc.)
  iconLink?: string; // Drive's per-type icon, fallback when no thumbnail
}

export interface DriveFolder {
  id: string;
  name: string;
  parents: string[];
}

export interface StorageQuota {
  limit: number;
  usage: number;
  usageInDrive: number;
  usageInDriveTrash: number;
}

async function driveFetch<T>(path: string, init?: RequestInit): Promise<T> {
  return withBackoff(async () => {
    const token = await getValidAccessToken();
    if (!token) throw new GmailApiError(401, "no_token", "Not signed in");
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      let reason: string | undefined;
      let message = res.statusText;
      try {
        const body = await res.json();
        reason = body?.error?.errors?.[0]?.reason ?? body?.error?.status;
        message = body?.error?.message ?? message;
      } catch {
        /* non-JSON */
      }
      throw new GmailApiError(res.status, reason, message);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  });
}

/** Total account storage usage (shared across Drive/Gmail/Photos). */
export async function getStorageQuota(): Promise<StorageQuota> {
  const data = await driveFetch<{ storageQuota: Record<string, string> }>(
    "/about?fields=storageQuota"
  );
  const q = data.storageQuota;
  return {
    limit: Number(q.limit ?? 0),
    usage: Number(q.usage ?? 0),
    usageInDrive: Number(q.usageInDrive ?? 0),
    usageInDriveTrash: Number(q.usageInDriveTrash ?? 0),
  };
}

/**
 * List the user's own files (not folders, not trashed), biggest first.
 * `quotaBytesUsed desc` lets Drive do the size sorting server-side.
 */
export async function listFilesBySize(
  onProgress?: (count: number) => void,
  cap = 4000
): Promise<DriveFile[]> {
  const files: DriveFile[] = [];
  let pageToken: string | undefined;
  const fields =
    "nextPageToken,files(id,name,size,quotaBytesUsed,mimeType,md5Checksum,modifiedTime,parents,webViewLink,thumbnailLink,iconLink)";
  const q =
    "'me' in owners and trashed = false and mimeType != 'application/vnd.google-apps.folder'";

  do {
    const params = new URLSearchParams({
      q,
      fields,
      orderBy: "quotaBytesUsed desc",
      pageSize: "1000",
      spaces: "drive",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const data = await driveFetch<{
      files?: Array<Record<string, string>>;
      nextPageToken?: string;
    }>(`/files?${params.toString()}`);

    for (const f of data.files ?? []) {
      files.push({
        id: f.id,
        name: f.name,
        size: Number(f.quotaBytesUsed ?? f.size ?? 0),
        mimeType: f.mimeType,
        md5: f.md5Checksum,
        modifiedTime: f.modifiedTime ? Date.parse(f.modifiedTime) : 0,
        parents: (f.parents as unknown as string[]) ?? [],
        webViewLink: f.webViewLink,
        thumbnailLink: f.thumbnailLink,
        iconLink: f.iconLink,
      });
    }
    onProgress?.(files.length);
    pageToken = data.nextPageToken;
  } while (pageToken && files.length < cap);

  return files;
}

/** List the user's folders, for the "move into folder" picker. */
export async function listFolders(): Promise<DriveFolder[]> {
  const folders: DriveFolder[] = [];
  let pageToken: string | undefined;
  const q =
    "'me' in owners and trashed = false and mimeType = 'application/vnd.google-apps.folder'";
  do {
    const params = new URLSearchParams({
      q,
      fields: "nextPageToken,files(id,name,parents)",
      pageSize: "1000",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const data = await driveFetch<{
      files?: Array<{ id: string; name: string; parents?: string[] }>;
      nextPageToken?: string;
    }>(`/files?${params.toString()}`);
    for (const f of data.files ?? [])
      folders.push({ id: f.id, name: f.name, parents: f.parents ?? [] });
    pageToken = data.nextPageToken;
  } while (pageToken);
  return folders;
}

/** Move a file to Trash (reversible for 30 days, then auto-purged). */
export async function trashFile(id: string): Promise<void> {
  await driveFetch<void>(`/files/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ trashed: true }),
  });
}

/** Bulk-trash with bounded concurrency + progress; collects failures. */
export async function trashFiles(
  ids: string[],
  onProgress?: (done: number) => void
): Promise<{ ok: string[]; failed: string[] }> {
  const ok: string[] = [];
  const failed: string[] = [];
  let done = 0;
  await mapLimit(ids, 8, async (id) => {
    try {
      await trashFile(id);
      ok.push(id);
    } catch {
      failed.push(id);
    }
    onProgress?.(++done);
  });
  return { ok, failed };
}

/** Permanently empty the Drive trash (frees space immediately). */
export async function emptyTrash(): Promise<void> {
  await driveFetch<void>("/files/trash", { method: "DELETE" });
}

/** Create a folder (optionally inside a parent) and return its id. */
export async function createFolder(name: string, parentId?: string): Promise<string> {
  const body: Record<string, unknown> = {
    name,
    mimeType: "application/vnd.google-apps.folder",
  };
  if (parentId) body.parents = [parentId];
  const f = await driveFetch<{ id: string }>("/files?fields=id", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return f.id;
}

/** Move a file into a folder by swapping its parent. */
export async function moveFile(
  id: string,
  addParent: string,
  removeParents: string[]
): Promise<void> {
  const params = new URLSearchParams({
    addParents: addParent,
    removeParents: removeParents.join(","),
    fields: "id,parents",
  });
  await driveFetch<void>(`/files/${id}?${params.toString()}`, { method: "PATCH" });
}

/** Group exact-duplicate files by content hash (md5). Returns groups of 2+. */
export function findDuplicates(files: DriveFile[]): DriveFile[][] {
  const byHash = new Map<string, DriveFile[]>();
  for (const f of files) {
    if (!f.md5) continue; // md5 only present for binary files
    const arr = byHash.get(f.md5) ?? [];
    arr.push(f);
    byHash.set(f.md5, arr);
  }
  return [...byHash.values()]
    .filter((g) => g.length > 1)
    .sort((a, b) => b[0].size * b.length - a[0].size * a.length);
}
