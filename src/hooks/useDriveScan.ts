import { useCallback } from "react";
import {
  listFilesBySize,
  listFolders,
  getStorageQuota,
  trashFiles,
  emptyTrash as emptyTrashApi,
} from "../lib/driveClient";
import { GmailApiError } from "../lib/backoff";
import { useDriveStore } from "../store/drive";

/** Loads Drive contents and exposes cleanup actions. */
export function useDriveScan() {
  const store = useDriveStore();

  const scan = useCallback(async () => {
    const s = useDriveStore.getState();
    s.reset();
    s.setStatus("scanning");
    try {
      // Quota + folders + files in parallel where possible.
      const [quota, folders] = await Promise.all([
        getStorageQuota().catch(() => null),
        listFolders().catch(() => []),
      ]);
      const files = await listFilesBySize((n) => useDriveStore.getState().setProgress(n));
      useDriveStore.getState().setResult(files, folders, quota);
    } catch (err) {
      const msg =
        err instanceof GmailApiError
          ? err.status === 401 || err.status === 403
            ? "Drive access isn't granted yet. Reconnect and allow Drive permission."
            : `Drive error: ${err.message}`
          : err instanceof Error
            ? err.message
            : "Drive scan failed";
      useDriveStore.getState().setStatus("error", msg);
    }
  }, []);

  /** Trash files, update the list, and return how many succeeded/failed. */
  const trash = useCallback(async (ids: string[]) => {
    const res = await trashFiles(ids);
    if (res.ok.length) useDriveStore.getState().removeFiles(res.ok);
    return res;
  }, []);

  const emptyTrash = useCallback(() => emptyTrashApi(), []);

  return { ...store, scan, trash, emptyTrash };
}
