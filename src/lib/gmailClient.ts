// Thin Gmail REST client that runs entirely in the browser using the short-lived
// access token. Google serves the Gmail API with CORS, so no server proxy is
// needed for reads/edits — only the secret-bearing OAuth steps live server-side.

import { getValidAccessToken } from "../hooks/useAuth";
import { withBackoff, mapLimit, GmailApiError } from "./backoff";

const BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

/** Parsed, app-friendly view of a Gmail message (metadata only). */
export interface MessageMeta {
  id: string;
  threadId: string;
  sizeEstimate: number; // bytes (Gmail's own estimate)
  fromRaw: string;
  fromEmail: string;
  fromName: string;
  subject: string;
  date: number; // epoch ms (0 if unknown)
  labelIds: string[];
  listUnsubscribe?: string; // raw List-Unsubscribe header
  listUnsubscribePost?: string; // raw List-Unsubscribe-Post header
}

export interface GmailProfile {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
}

/** Authenticated fetch against the Gmail API with backoff + typed errors. */
async function gapi<T>(path: string, init?: RequestInit): Promise<T> {
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
        /* non-JSON error body */
      }
      throw new GmailApiError(res.status, reason, message);
    }
    // 204 (no content) → undefined
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  });
}

export async function getProfile(): Promise<GmailProfile> {
  return gapi<GmailProfile>("/profile");
}

/**
 * List message IDs matching a Gmail query (`q` uses Gmail search syntax:
 * larger:10M, older_than:1y, from:, category:promotions, has:attachment, list:).
 * Returns one page; pass the returned nextPageToken to continue.
 */
export async function listMessageIds(
  q: string,
  pageToken?: string,
  maxResults = 500
): Promise<{
  ids: string[];
  nextPageToken?: string;
  resultSizeEstimate: number;
}> {
  const params = new URLSearchParams({ maxResults: String(maxResults) });
  if (q) params.set("q", q);
  if (pageToken) params.set("pageToken", pageToken);

  const data = await gapi<{
    messages?: { id: string; threadId: string }[];
    nextPageToken?: string;
    resultSizeEstimate?: number;
  }>(`/messages?${params.toString()}`);

  return {
    ids: (data.messages ?? []).map((m) => m.id),
    nextPageToken: data.nextPageToken,
    resultSizeEstimate: data.resultSizeEstimate ?? 0,
  };
}

/** Just the total count for a query — used to show "scanned X of ~N". */
export async function countMessages(q: string): Promise<number> {
  const { resultSizeEstimate } = await listMessageIds(q, undefined, 1);
  return resultSizeEstimate;
}

const META_HEADERS = ["From", "Subject", "Date", "List-Unsubscribe", "List-Unsubscribe-Post"];

/** Fetch one message in metadata format (headers only — fast, no body download). */
export async function getMessageMetadata(id: string): Promise<MessageMeta> {
  const params = new URLSearchParams({ format: "metadata" });
  for (const h of META_HEADERS) params.append("metadataHeaders", h);

  const m = await gapi<{
    id: string;
    threadId: string;
    sizeEstimate: number;
    labelIds?: string[];
    payload?: { headers?: { name: string; value: string }[] };
  }>(`/messages/${id}?${params.toString()}`);

  const headers = new Map(
    (m.payload?.headers ?? []).map((h) => [h.name.toLowerCase(), h.value])
  );
  const fromRaw = headers.get("from") ?? "";
  const { name, email } = parseFrom(fromRaw);
  const dateStr = headers.get("date");

  return {
    id: m.id,
    threadId: m.threadId,
    sizeEstimate: m.sizeEstimate ?? 0,
    fromRaw,
    fromEmail: email,
    fromName: name,
    subject: headers.get("subject") ?? "(no subject)",
    date: dateStr ? Date.parse(dateStr) || 0 : 0,
    labelIds: m.labelIds ?? [],
    listUnsubscribe: headers.get("list-unsubscribe"),
    listUnsubscribePost: headers.get("list-unsubscribe-post"),
  };
}

/** Fetch metadata for many IDs with bounded concurrency + progress reporting. */
export async function getManyMetadata(
  ids: string[],
  onProgress?: (done: number, total: number) => void,
  concurrency = 8
): Promise<MessageMeta[]> {
  return mapLimit(
    ids,
    concurrency,
    (id) => getMessageMetadata(id),
    (done) => onProgress?.(done, ids.length)
  );
}

/** Parse a raw `From` header into display name + email. */
export function parseFrom(raw: string): { name: string; email: string } {
  if (!raw) return { name: "", email: "" };
  const angle = raw.match(/^(.*)<([^>]+)>\s*$/);
  if (angle) {
    const name = angle[1].trim().replace(/^"|"$/g, "").trim();
    const email = angle[2].trim().toLowerCase();
    return { name: name || email, email };
  }
  const email = raw.trim().toLowerCase();
  return { name: email, email };
}

// ── Mutations (Milestone 5 uses these) ────────────────────────────────────────

/** Bulk add/remove labels. Archive = remove "INBOX". Max 1000 ids per call. */
export async function batchModify(
  ids: string[],
  addLabelIds: string[] = [],
  removeLabelIds: string[] = []
): Promise<void> {
  await gapi<void>("/messages/batchModify", {
    method: "POST",
    body: JSON.stringify({ ids, addLabelIds, removeLabelIds }),
  });
}

/** Move a single message to Trash (reversible; auto-deletes after 30 days). */
export async function trashMessage(id: string): Promise<void> {
  await gapi<void>(`/messages/${id}/trash`, { method: "POST" });
}

/** Restore a single message from Trash. */
export async function untrashMessage(id: string): Promise<void> {
  await gapi<void>(`/messages/${id}/untrash`, { method: "POST" });
}

/**
 * Permanently delete messages (NOT reversible). Requires the broad
 * https://mail.google.com/ scope — gated behind explicit confirmation in the UI.
 */
export async function batchDelete(ids: string[]): Promise<void> {
  await gapi<void>("/messages/batchDelete", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}

/** Number of messages currently in Trash. */
export async function getTrashCount(): Promise<number> {
  return countMessages("in:trash");
}

// ── Labels & filters (Gmail Organize) ────────────────────────────────────────

export interface GmailLabel {
  id: string;
  name: string;
  type?: string; // "system" | "user"
}

export async function listLabels(): Promise<GmailLabel[]> {
  const data = await gapi<{ labels?: GmailLabel[] }>("/labels");
  return data.labels ?? [];
}

export async function createLabel(name: string): Promise<GmailLabel> {
  return gapi<GmailLabel>("/labels", {
    method: "POST",
    body: JSON.stringify({
      name,
      labelListVisibility: "labelShow",
      messageListVisibility: "show",
    }),
  });
}

/** Return an existing label's id by name, creating it if missing. */
export async function ensureLabel(name: string, existing: GmailLabel[]): Promise<string> {
  const found = existing.find((l) => l.name.toLowerCase() === name.toLowerCase());
  if (found) return found.id;
  const created = await createLabel(name);
  existing.push(created); // keep cache fresh for subsequent calls
  return created.id;
}

/**
 * Apply label changes to every message matching a query, in batches.
 * Set removeLabelIds=["INBOX"] to also archive (declutter) them.
 */
export async function applyLabelToQuery(
  query: string,
  addLabelIds: string[],
  removeLabelIds: string[] = [],
  onProgress?: (done: number, total: number) => void,
  cap = 10000
): Promise<number> {
  const ids: string[] = [];
  let pageToken: string | undefined;
  do {
    const page = await listMessageIds(query, pageToken, 500);
    ids.push(...page.ids);
    pageToken = page.nextPageToken;
  } while (pageToken && ids.length < cap);

  const CHUNK = 1000;
  let done = 0;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const part = ids.slice(i, i + CHUNK);
    await batchModify(part, addLabelIds, removeLabelIds);
    done += part.length;
    onProgress?.(done, ids.length);
  }
  return ids.length;
}

/**
 * Create a Gmail filter so FUTURE mail is auto-sorted. Requires the
 * gmail.settings.basic scope. `criteria.query` accepts Gmail search syntax.
 */
export async function createFilter(
  criteria: { query?: string; from?: string },
  action: { addLabelIds?: string[]; removeLabelIds?: string[] }
): Promise<void> {
  await gapi<void>("/settings/filters", {
    method: "POST",
    body: JSON.stringify({ criteria, action }),
  });
}

/**
 * Empty Gmail Trash by permanently deleting everything in it — THIS is what
 * actually frees storage. Lists all trashed IDs then batchDeletes in chunks.
 * Requires the broad mail.google.com scope.
 */
export async function emptyGmailTrash(
  onProgress?: (done: number, total: number) => void
): Promise<number> {
  const ids: string[] = [];
  let pageToken: string | undefined;
  do {
    const page = await listMessageIds("in:trash", pageToken, 500);
    ids.push(...page.ids);
    pageToken = page.nextPageToken;
  } while (pageToken);

  const CHUNK = 1000; // batchDelete accepts up to 1000 ids per call
  let done = 0;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const part = ids.slice(i, i + CHUNK);
    await batchDelete(part);
    done += part.length;
    onProgress?.(done, ids.length);
  }
  return ids.length;
}
