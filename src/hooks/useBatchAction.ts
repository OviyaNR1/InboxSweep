import { useCallback } from "react";
import { batchModify, batchDelete } from "../lib/gmailClient";
import { GmailApiError } from "../lib/backoff";
import { useActionStore, type ActionType, type UndoInfo } from "../store/action";
import { useScanStore } from "../store/scan";

// Gmail's batchModify/batchDelete accept up to 1000 ids, but smaller chunks
// give smoother progress and more graceful partial-failure handling.
const CHUNK = 200;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Apply one action to a chunk of IDs. */
async function applyChunk(type: ActionType, ids: string[]): Promise<void> {
  switch (type) {
    case "trash":
      // Move to Trash (reversible). Adding TRASH + removing INBOX mirrors what
      // messages.trash does, but in one bulk call.
      return batchModify(ids, ["TRASH"], ["INBOX"]);
    case "archive":
      return batchModify(ids, [], ["INBOX"]);
    case "delete":
      // Permanent — requires the broad mail.google.com scope.
      return batchDelete(ids);
  }
}

export interface ActionResult {
  succeeded: string[];
  failed: string[];
  error?: string;
}

/**
 * Runs a bulk action over a list of message IDs in resumable chunks with live
 * progress. Failures in one chunk don't abort the rest — they're collected and
 * reported. Successful IDs are removed from the dashboard, and reversible
 * actions arm the Undo banner.
 */
export function useBatchAction() {
  const action = useActionStore();

  const run = useCallback(
    async (type: ActionType, ids: string[]): Promise<ActionResult> => {
      const store = useActionStore.getState();
      const chunks = chunk(ids, CHUNK);
      const succeeded: string[] = [];
      const failed: string[] = [];
      let fatal: string | undefined;

      store.begin(type, ids.length);

      for (const group of chunks) {
        try {
          await applyChunk(type, group);
          succeeded.push(...group);
        } catch (err) {
          // A 403 on permanent delete almost always means we lack the broad
          // scope. Surface a clear, actionable message and stop.
          if (
            type === "delete" &&
            err instanceof GmailApiError &&
            (err.status === 403 || err.status === 401)
          ) {
            fatal =
              "Permanent delete needs broader Google permission than InboxSweep requested. Use Move to Trash instead — it auto-deletes after 30 days.";
            failed.push(...group);
            break;
          }
          failed.push(...group);
        }
        useActionStore.getState().setProgress(succeeded.length, failed.length);
      }

      // Reflect the change in the dashboard immediately.
      if (succeeded.length) useScanStore.getState().removeMessages(succeeded);

      // Arm undo for reversible actions only.
      const undo: UndoInfo | null =
        succeeded.length && type !== "delete"
          ? { ids: succeeded, type, count: succeeded.length }
          : null;
      useActionStore.getState().finish(undo);

      return { succeeded, failed, error: fatal };
    },
    []
  );

  /** Reverse the most recent reversible action (restore from Trash / re-inbox). */
  const reverse = useCallback(async (info: UndoInfo): Promise<void> => {
    const store = useActionStore.getState();
    store.begin(info.type, info.ids.length);
    const chunks = chunk(info.ids, CHUNK);
    let processed = 0;
    for (const group of chunks) {
      try {
        if (info.type === "trash") {
          await batchModify(group, ["INBOX"], ["TRASH"]); // restore
        } else {
          await batchModify(group, ["INBOX"], []); // un-archive
        }
      } catch {
        /* best-effort restore */
      }
      processed += group.length;
      useActionStore.getState().setProgress(processed, 0);
    }
    useActionStore.getState().finish(null);
  }, []);

  // `action.undo` is the UndoInfo for the banner; `reverse` performs the undo.
  return { ...action, run, reverse };
}
