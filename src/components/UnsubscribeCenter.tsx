import { useMemo, useState, type ReactNode } from "react";
import {
  MailMinus,
  Check,
  ExternalLink,
  Loader2,
  Trash2,
  Inbox,
} from "lucide-react";
import { useScanStore } from "../store/scan";
import { formatBytes, type SenderAgg } from "../lib/sizeEstimator";
import {
  parseUnsubscribe,
  unsubMethod,
  oneClickUnsubscribe,
  mailtoUrl,
} from "../lib/unsubscribe";
import { senderQuery } from "../lib/queries";
import { listMessageIds } from "../lib/gmailClient";
import { useBatchAction } from "../hooks/useBatchAction";

type RowStatus = "idle" | "working" | "done" | "opened" | "failed";

export default function UnsubscribeCenter() {
  const { aggregates, status } = useScanStore();
  const batch = useBatchAction();
  const [rowStatus, setRowStatus] = useState<Record<string, RowStatus>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  // Only senders that actually carry an unsubscribe header.
  const subs = useMemo(
    () => (aggregates?.senders ?? []).filter((s) => s.hasUnsubscribe),
    [aggregates]
  );

  if (status !== "done" || !aggregates) {
    return (
      <Empty
        icon={<MailMinus className="h-7 w-7" />}
        title="Run a scan first"
        body="Head to the Dashboard and scan your mailbox — we'll list every sender you can unsubscribe from here."
      />
    );
  }

  if (subs.length === 0) {
    return (
      <Empty
        icon={<Check className="h-7 w-7" />}
        title="No subscriptions found"
        body="None of the scanned senders included an unsubscribe link. Try a deeper scan to find more."
      />
    );
  }

  function setStatus(key: string, s: RowStatus) {
    setRowStatus((prev) => ({ ...prev, [key]: s }));
  }

  async function doUnsubscribe(s: SenderAgg): Promise<boolean> {
    const key = s.email || s.name;
    const targets = parseUnsubscribe(s.listUnsubscribe, s.listUnsubscribePost);
    const method = unsubMethod(targets);

    if (method === "one-click" && targets.httpsUrl) {
      setStatus(key, "working");
      const ok = await oneClickUnsubscribe(targets.httpsUrl);
      setStatus(key, ok ? "done" : "failed");
      return ok;
    }
    if (method === "manual-link" && targets.httpsUrl) {
      // Open the sender's unsubscribe page for the user to finish manually.
      window.open(targets.httpsUrl, "_blank", "noopener,noreferrer");
      setStatus(key, "opened");
      return true;
    }
    if (method === "mailto") {
      window.open(mailtoUrl(targets), "_blank", "noopener,noreferrer");
      setStatus(key, "opened");
      return true;
    }
    setStatus(key, "failed");
    return false;
  }

  /** Unsubscribe, then move everything from this sender to Trash. */
  async function doUnsubscribeAndDelete(s: SenderAgg) {
    await doUnsubscribe(s);
    const ids: string[] = [];
    let token: string | undefined;
    do {
      const page = await listMessageIds(senderQuery(s.email || s.name), token, 500);
      ids.push(...page.ids);
      token = page.nextPageToken;
    } while (token && ids.length < 5000);
    if (ids.length) await batch.run("trash", ids);
  }

  const keyOf = (s: SenderAgg) => s.email || s.name;
  const allSelected = subs.length > 0 && selected.size === subs.length;

  function toggle(key: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(subs.map(keyOf)));
  }

  /**
   * Bulk action over the selected senders. `mode`:
   *  - "unsub":  one-click unsubscribe each (manual-only senders are flagged)
   *  - "delete": trash all their mail in one combined batch
   *  - "both":   unsubscribe + trash
   */
  async function bulkAction(mode: "unsub" | "delete" | "both") {
    const chosen = subs.filter((s) => selected.has(keyOf(s)));
    if (chosen.length === 0) return;
    setBulkBusy(true);
    try {
      if (mode === "unsub" || mode === "both") {
        for (const s of chosen) {
          const t = parseUnsubscribe(s.listUnsubscribe, s.listUnsubscribePost);
          if (unsubMethod(t) === "one-click" && t.httpsUrl) {
            setStatus(keyOf(s), "working");
            const ok = await oneClickUnsubscribe(t.httpsUrl);
            setStatus(keyOf(s), ok ? "done" : "failed");
          } else {
            // Can't bulk-open dozens of tabs; flag for individual action.
            setStatus(keyOf(s), "opened");
          }
        }
      }
      if (mode === "delete" || mode === "both") {
        const ids: string[] = [];
        for (const s of chosen) {
          let token: string | undefined;
          do {
            const page = await listMessageIds(senderQuery(keyOf(s)), token, 500);
            ids.push(...page.ids);
            token = page.nextPageToken;
          } while (token && ids.length < 8000);
        }
        if (ids.length) await batch.run("trash", ids.slice(0, 8000));
      }
      setSelected(new Set());
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Unsubscribe center</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {subs.length} sender{subs.length === 1 ? "" : "s"} from the last scan offer an
          unsubscribe link.
        </p>
      </div>

      {/* Bulk toolbar — select all + act on many at once */}
      <div className="card-surface flex flex-wrap items-center justify-between gap-3 p-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          {selected.size > 0 ? `${selected.size} selected` : "Select all"}
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={selected.size === 0 || bulkBusy}
            onClick={() => bulkAction("unsub")}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-white disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {bulkBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailMinus className="h-4 w-4" />}
            Unsubscribe
          </button>
          <button
            type="button"
            disabled={selected.size === 0 || bulkBusy}
            onClick={() => bulkAction("delete")}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-white disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Trash2 className="h-4 w-4" /> Delete all
          </button>
          <button
            type="button"
            disabled={selected.size === 0 || bulkBusy}
            onClick={() => bulkAction("both")}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-600 to-grape-600 px-4 py-1.5 text-sm font-semibold text-white shadow-soft hover:brightness-105 disabled:opacity-40"
          >
            {bulkBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Unsubscribe + Delete
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {subs.map((s) => {
            const key = s.email || s.name;
            const st = rowStatus[key] ?? "idle";
            const targets = parseUnsubscribe(s.listUnsubscribe, s.listUnsubscribePost);
            const method = unsubMethod(targets);
            const busy = st === "working" || batch.running;

            return (
              <li
                key={key}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3 sm:items-center">
                  <input
                    type="checkbox"
                    checked={selected.has(key)}
                    onChange={() => toggle(key)}
                    className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500 sm:mt-0"
                  />
                  <div className="min-w-0">
                  <div className="truncate font-medium text-slate-900 dark:text-white">
                    {s.name || s.email}
                  </div>
                  <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {s.email} · {s.count} email{s.count === 1 ? "" : "s"} ·{" "}
                    {formatBytes(s.bytes)}
                  </div>
                    <MethodNote method={method} status={st} />
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    disabled={busy || method === "none" || st === "done"}
                    onClick={() => doUnsubscribe(s)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {st === "working" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : st === "done" ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : method === "one-click" ? (
                      <MailMinus className="h-4 w-4" />
                    ) : (
                      <ExternalLink className="h-4 w-4" />
                    )}
                    {st === "done" ? "Unsubscribed" : "Unsubscribe"}
                  </button>
                  <button
                    type="button"
                    disabled={busy || method === "none"}
                    onClick={() => doUnsubscribeAndDelete(s)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="hidden sm:inline">+ Delete all</span>
                    <span className="sm:hidden">+ Trash</span>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <Inbox className="h-3.5 w-3.5" />
        "Delete all" moves that sender's mail to Trash (reversible for 30 days).
      </p>
    </div>
  );
}

function MethodNote({
  method,
  status,
}: {
  method: ReturnType<typeof unsubMethod>;
  status: RowStatus;
}) {
  if (status === "done")
    return <Note className="text-emerald-600 dark:text-emerald-400">Unsubscribe sent ✓</Note>;
  if (status === "opened")
    return <Note className="text-amber-600 dark:text-amber-400">Finish in the opened tab</Note>;
  if (status === "failed")
    return <Note className="text-red-600 dark:text-red-400">Couldn't unsubscribe automatically</Note>;
  if (method === "one-click")
    return <Note>One-click supported</Note>;
  if (method === "manual-link")
    return <Note>Opens unsubscribe page</Note>;
  if (method === "mailto")
    return <Note>Sends via your email app</Note>;
  return <Note>No unsubscribe method available</Note>;
}

function Note({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={"mt-0.5 text-[11px] " + (className || "text-slate-400 dark:text-slate-500")}>
      {children}
    </div>
  );
}

function Empty({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-600/10">
        {icon}
      </span>
      <h2 className="mt-5 text-xl font-bold">{title}</h2>
      <p className="mt-2 text-slate-600 dark:text-slate-300">{body}</p>
    </div>
  );
}
