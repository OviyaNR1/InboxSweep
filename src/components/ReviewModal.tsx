import { useEffect, useMemo, useState } from "react";
import { Loader2, Trash2, Archive, Flame } from "lucide-react";
import Modal from "./Modal";
import ConfirmDelete from "./ConfirmDelete";
import ProgressBar from "./ProgressBar";
import {
  listMessageIds,
  getManyMetadata,
  countMessages,
  type MessageMeta,
} from "../lib/gmailClient";
import { formatBytes } from "../lib/sizeEstimator";
import { useBatchAction } from "../hooks/useBatchAction";
import type { ActionType } from "../store/action";

const LOAD_CAP = 300; // messages shown in the list
const ACT_CAP = 5000; // safety ceiling for "select all matching"

export interface ReviewResult {
  type: ActionType;
  succeeded: number;
  failed: number;
  error?: string;
}

export default function ReviewModal({
  open,
  title,
  query,
  onClose,
}: {
  open: boolean;
  title: string;
  query: string;
  onClose: (result?: ReviewResult) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<MessageMeta[]>([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [allMatching, setAllMatching] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const batch = useBatchAction();

  // Load the message list whenever the modal opens with a query.
  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setAllMatching(false);
    (async () => {
      try {
        const [count, firstPage] = await Promise.all([
          countMessages(query),
          listMessageIds(query, undefined, LOAD_CAP),
        ]);
        const metas = await getManyMetadata(firstPage.ids.slice(0, LOAD_CAP));
        if (!active) return;
        setTotal(count);
        setMessages(metas);
        setSelected(new Set(metas.map((m) => m.id))); // default: all selected
      } catch {
        if (active) setMessages([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [open, query]);

  const selectedBytes = useMemo(
    () =>
      messages.reduce((sum, m) => (selected.has(m.id) ? sum + m.sizeEstimate : sum), 0),
    [messages, selected]
  );

  const allLoadedSelected = messages.length > 0 && selected.size === messages.length;
  const moreThanLoaded = total > messages.length;

  function toggle(id: string) {
    setAllMatching(false);
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleAllLoaded() {
    setAllMatching(false);
    setSelected(allLoadedSelected ? new Set() : new Set(messages.map((m) => m.id)));
  }

  /** Gather every matching ID (no metadata) for "select all N matching". */
  async function gatherAllIds(): Promise<string[]> {
    const ids: string[] = [];
    let token: string | undefined;
    do {
      const page = await listMessageIds(query, token, 500);
      ids.push(...page.ids);
      token = page.nextPageToken;
    } while (token && ids.length < ACT_CAP);
    return ids.slice(0, ACT_CAP);
  }

  async function performAction(type: ActionType) {
    const ids = allMatching ? await gatherAllIds() : [...selected];
    if (ids.length === 0) return;
    const result = await batch.run(type, ids);
    onClose({
      type,
      succeeded: result.succeeded.length,
      failed: result.failed.length,
      error: result.error,
    });
  }

  const actCount = allMatching ? total : selected.size;
  const running = batch.running;

  return (
    <>
      <Modal open={open} onClose={() => onClose()} title={title} maxWidth="max-w-2xl">
        {/* Selection summary + bulk toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-3 text-sm dark:border-slate-800">
          <label className="flex items-center gap-2 font-medium">
            <input
              type="checkbox"
              checked={allLoadedSelected}
              onChange={toggleAllLoaded}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            Select all
          </label>
          <span className="text-slate-500 dark:text-slate-400">
            {actCount.toLocaleString()} selected
            {!allMatching && ` · ${formatBytes(selectedBytes)} (est.)`}
          </span>
        </div>

        {/* "select all matching" affordance */}
        {moreThanLoaded && !loading && (
          <div className="border-b border-slate-200 bg-amber-50 px-5 py-2 text-xs text-amber-800 dark:border-slate-800 dark:bg-amber-500/10 dark:text-amber-300">
            Showing the first {messages.length} of {total.toLocaleString()} matching emails.{" "}
            {allMatching ? (
              <button className="font-semibold underline" onClick={() => setAllMatching(false)}>
                Just use my selection
              </button>
            ) : (
              <button
                className="font-semibold underline"
                onClick={() => setAllMatching(true)}
              >
                Select all {total.toLocaleString()} matching
              </button>
            )}
          </div>
        )}

        {/* Message list */}
        <div className="min-h-[12rem] flex-1 overflow-y-auto px-5">
          {loading ? (
            <div className="flex h-48 items-center justify-center text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading emails…
            </div>
          ) : messages.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
              No emails match this filter.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {messages.map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={selected.has(m.id)}
                    onChange={() => toggle(m.id)}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-900 dark:text-white">
                      {m.subject}
                    </div>
                    <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {m.fromName || m.fromEmail}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-slate-500 dark:text-slate-400">
                    {formatBytes(m.sizeEstimate)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Action bar */}
        <div className="border-t border-slate-200 px-5 py-4 dark:border-slate-800">
          {running ? (
            <div>
              <ProgressBar
                value={batch.processed}
                max={batch.total}
                label={`Working… ${batch.processed.toLocaleString()} of ${batch.total.toLocaleString()}`}
              />
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Trash is reversible for 30 days.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={actCount === 0}
                  onClick={() => performAction("archive")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Archive className="h-4 w-4" /> Archive
                </button>
                <button
                  type="button"
                  disabled={actCount === 0}
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-40 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
                >
                  <Flame className="h-4 w-4" /> Delete forever
                </button>
                <button
                  type="button"
                  disabled={actCount === 0}
                  onClick={() => performAction("trash")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" /> Move to Trash
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDelete
        open={confirmDelete}
        count={actCount}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          performAction("delete");
        }}
      />
    </>
  );
}
