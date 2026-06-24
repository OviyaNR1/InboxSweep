import { useCallback, useRef } from "react";
import {
  listMessageIds,
  getMessageMetadata,
  type MessageMeta,
} from "../lib/gmailClient";
import { mapLimit, GmailApiError } from "../lib/backoff";
import { aggregate } from "../lib/sizeEstimator";
import { useScanStore } from "../store/scan";

class ScanCancelled extends Error {}

export interface ScanOptions {
  /** Gmail query. Empty string scans the whole mailbox (excludes Spam/Trash). */
  query?: string;
  /** Hard cap on messages fetched, to keep scans fast and within rate limits. */
  cap?: number;
}

/**
 * Drives a storage scan: list matching message IDs (paginated), fetch each
 * message's metadata + sizeEstimate with bounded concurrency, then aggregate.
 * Cancellable, and reports live progress into the scan store.
 */
export function useScan() {
  const store = useScanStore();
  const cancelRef = useRef(false);

  const cancel = useCallback(() => {
    cancelRef.current = true;
  }, []);

  const startScan = useCallback(
    async ({ query = "", cap = 2000 }: ScanOptions = {}) => {
      const s = useScanStore.getState();
      cancelRef.current = false;
      s.reset();
      s.setTotals(0, cap, query);
      s.setStatus("listing");

      try {
        // Phase 1 — collect message IDs up to the cap.
        const ids: string[] = [];
        let pageToken: string | undefined;
        let total = 0;
        do {
          if (cancelRef.current) throw new ScanCancelled();
          const page = await listMessageIds(query, pageToken, 500);
          if (!total) total = page.resultSizeEstimate;
          ids.push(...page.ids);
          pageToken = page.nextPageToken;
        } while (pageToken && ids.length < cap);

        const capped = ids.slice(0, cap);
        useScanStore.getState().setTotals(total, cap, query);
        useScanStore.getState().setStatus("scanning");

        // Phase 2 — fetch metadata with bounded concurrency + progress.
        const messages = await mapLimit<string, MessageMeta>(
          capped,
          18,
          (id) => {
            if (cancelRef.current) throw new ScanCancelled();
            return getMessageMetadata(id);
          },
          (done) => useScanStore.getState().setProgress(done)
        );

        // Phase 3 — aggregate into the dashboard views.
        const aggregates = aggregate(messages);
        useScanStore.getState().setResult(messages, aggregates);
      } catch (err) {
        if (err instanceof ScanCancelled) {
          useScanStore.getState().setStatus("cancelled");
          return;
        }
        const msg =
          err instanceof GmailApiError
            ? err.status === 401
              ? "Your session expired. Please reconnect Gmail."
              : `Gmail error: ${err.message}`
            : err instanceof Error
              ? err.message
              : "Scan failed";
        useScanStore.getState().setStatus("error", msg);
      }
    },
    []
  );

  return {
    ...store,
    startScan,
    cancel,
  };
}
