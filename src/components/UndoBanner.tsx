import { useEffect } from "react";
import { Undo2, X, CheckCircle2 } from "lucide-react";
import { useBatchAction } from "../hooks/useBatchAction";

/**
 * Toast shown after a reversible bulk action. "Moved N emails to Trash · they'll
 * auto-delete in 30 days · Undo". Undo restores them via batchModify.
 */
export default function UndoBanner() {
  const batch = useBatchAction();
  const info = batch.undo;

  // Auto-dismiss after 12s so it doesn't linger forever.
  useEffect(() => {
    if (!info) return;
    const t = setTimeout(() => batch.clearUndo(), 12_000);
    return () => clearTimeout(t);
  }, [info, batch]);

  if (!info) return null;

  const verb = info.type === "trash" ? "Moved" : "Archived";
  const tail =
    info.type === "trash" ? " · they'll auto-delete in 30 days" : "";

  return (
    <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">
        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
        <span>
          {verb} <strong>{info.count.toLocaleString()}</strong> email
          {info.count === 1 ? "" : "s"}
          {tail}
        </span>
        <button
          type="button"
          onClick={() => batch.reverse(info)}
          className="ml-2 inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 font-medium hover:bg-white/20"
        >
          <Undo2 className="h-4 w-4" /> Undo
        </button>
        <button
          type="button"
          onClick={() => batch.clearUndo()}
          aria-label="Dismiss"
          className="rounded-lg p-1 text-slate-400 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
