import { useEffect, useState } from "react";
import { Flame, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { getTrashCount, emptyGmailTrash } from "../lib/gmailClient";
import { GmailApiError } from "../lib/backoff";
import Modal from "./Modal";
import ProgressBar from "./ProgressBar";

/**
 * Reclaim space: permanently empty the Gmail Trash. Moving mail to Trash hides
 * it but doesn't free storage until Trash is emptied — this does that in-app.
 * Permanent + irreversible, so it's gated behind a confirm.
 */
export default function EmptyTrashCard() {
  const [count, setCount] = useState<number | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      setCount(await getTrashCount());
    } catch {
      setCount(null);
    }
  }
  useEffect(() => {
    refresh();
  }, []);

  async function doEmpty() {
    setConfirm(false);
    setBusy(true);
    setError(null);
    setResult(null);
    setProgress({ done: 0, total: count ?? 0 });
    try {
      const n = await emptyGmailTrash((done, total) => setProgress({ done, total }));
      setResult(`Permanently deleted ${n.toLocaleString()} message${n === 1 ? "" : "s"}. Storage freed.`);
      await refresh();
    } catch (e) {
      setError(
        e instanceof GmailApiError && (e.status === 403 || e.status === 401)
          ? "This needs Gmail's full permission. Disconnect and reconnect to grant it."
          : e instanceof Error
            ? e.message
            : "Couldn't empty Trash."
      );
    } finally {
      setBusy(false);
    }
  }

  const nothing = count === 0;

  return (
    <div className="card-surface flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-soft">
          <Flame className="h-5 w-5" />
        </span>
        <div>
          <h3 className="font-semibold">Reclaim space — empty Gmail Trash</h3>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {count === null
              ? "Trashed mail still counts against your storage until it's emptied."
              : nothing
                ? "Your Trash is already empty. 🎉"
                : `${count.toLocaleString()} message${count === 1 ? "" : "s"} in Trash. Permanently deleting them frees the space now.`}
          </p>
          {result && (
            <p className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-emerald-600">
              <CheckCircle2 className="h-4 w-4" /> {result}
            </p>
          )}
          {error && (
            <p className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-red-600">
              <AlertCircle className="h-4 w-4" /> {error}
            </p>
          )}
          {busy && (
            <div className="mt-2 w-56">
              <ProgressBar value={progress.done} max={progress.total || 1} />
            </div>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => setConfirm(true)}
        disabled={busy || nothing || count === null}
        className="inline-flex items-center justify-center gap-1.5 rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-40 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flame className="h-4 w-4" />}
        Empty Trash
      </button>

      <Modal open={confirm} onClose={() => setConfirm(false)} title="Empty Gmail Trash" maxWidth="max-w-md">
        <div className="space-y-4 p-5">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            This <strong>permanently deletes</strong> {count?.toLocaleString()} message
            {count === 1 ? "" : "s"} in your Trash and frees the space immediately. It{" "}
            <strong>cannot be undone</strong>.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirm(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium dark:border-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={doEmpty}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Permanently empty
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
