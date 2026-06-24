import { MailMinus } from "lucide-react";
import type { SenderAgg } from "../lib/sizeEstimator";
import { formatBytes } from "../lib/sizeEstimator";

interface SenderTableProps {
  senders: SenderAgg[];
  /** Called when the user wants to review/clean a sender's mail (Milestone 5). */
  onReview?: (sender: SenderAgg) => void;
  limit?: number;
}

function relativeDate(ms: number): string {
  if (!ms) return "—";
  const days = Math.floor((Date.now() - ms) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

/** Top senders by estimated storage. */
export default function SenderTable({ senders, onReview, limit = 15 }: SenderTableProps) {
  const rows = senders.slice(0, limit);
  const maxBytes = rows[0]?.bytes ?? 1;

  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
        No senders found in the scanned messages.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
          <tr>
            <th className="py-2 pr-4 font-medium">Sender</th>
            <th className="py-2 pr-4 text-right font-medium">Emails</th>
            <th className="py-2 pr-4 text-right font-medium">Est. size</th>
            <th className="py-2 pr-4 text-right font-medium">Last</th>
            <th className="py-2 font-medium" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((s) => (
            <tr key={s.email || s.name} className="group">
              <td className="max-w-[16rem] py-3 pr-4">
                <div className="truncate font-medium text-slate-900 dark:text-white">
                  {s.name}
                  {s.hasUnsubscribe && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                      <MailMinus className="h-3 w-3" /> sub
                    </span>
                  )}
                </div>
                <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {s.email}
                </div>
                {/* tiny inline storage bar */}
                <div className="mt-1 h-1 w-full max-w-[12rem] overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${Math.max(4, (s.bytes / maxBytes) * 100)}%` }}
                  />
                </div>
              </td>
              <td className="py-3 pr-4 text-right tabular-nums">{s.count}</td>
              <td className="py-3 pr-4 text-right font-medium tabular-nums">
                {formatBytes(s.bytes)}
              </td>
              <td className="py-3 pr-4 text-right text-slate-500 dark:text-slate-400">
                {relativeDate(s.lastDate)}
              </td>
              <td className="py-3 text-right">
                {onReview && (
                  <button
                    type="button"
                    onClick={() => onReview(s)}
                    className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Review
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
