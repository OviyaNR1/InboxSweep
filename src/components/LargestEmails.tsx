import { Paperclip } from "lucide-react";
import type { MessageMeta } from "../lib/gmailClient";
import { formatBytes } from "../lib/sizeEstimator";

/** The single biggest messages by estimated size. */
export default function LargestEmails({
  messages,
  limit = 10,
}: {
  messages: MessageMeta[];
  limit?: number;
}) {
  const rows = messages.slice(0, limit);
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
        Nothing scanned yet.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {rows.map((m) => (
        <li key={m.id} className="flex items-center gap-3 py-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <Paperclip className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-slate-900 dark:text-white">
              {m.subject}
            </div>
            <div className="truncate text-xs text-slate-500 dark:text-slate-400">
              {m.fromName || m.fromEmail}
            </div>
          </div>
          <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">
            {formatBytes(m.sizeEstimate)}
          </span>
        </li>
      ))}
    </ul>
  );
}
