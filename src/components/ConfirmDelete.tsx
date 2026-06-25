import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import Modal from "./Modal";

/**
 * Hard confirmation for permanent deletion. The user must type DELETE — a
 * deliberate speed bump for the one irreversible action in the app.
 */
export default function ConfirmDelete({
  open,
  count,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  count: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [typed, setTyped] = useState("");
  const armed = typed.trim().toUpperCase() === "DELETE";

  return (
    <Modal open={open} onClose={onCancel} title="Permanently delete" maxWidth="max-w-md">
      <div className="space-y-4 p-5">
        <div className="flex gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p>
            This permanently deletes <strong>{count.toLocaleString()}</strong>{" "}
            email{count === 1 ? "" : "s"}. They will <strong>not</strong> go to
            Trash and <strong>cannot be recovered</strong>.
          </p>
        </div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Type <span className="font-mono font-bold">DELETE</span> to confirm
          <input
            autoFocus
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            placeholder="DELETE"
          />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!armed}
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition enabled:hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Permanently delete
          </button>
        </div>
      </div>
    </Modal>
  );
}
