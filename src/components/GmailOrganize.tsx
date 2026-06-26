import { useEffect, useRef, useState } from "react";
import { Tag, Loader2, Check, Archive, Wand2, AlertCircle } from "lucide-react";
import {
  countMessages,
  listLabels,
  ensureLabel,
  applyLabelToQuery,
  createFilter,
  type GmailLabel,
} from "../lib/gmailClient";
import { senderQuery } from "../lib/queries";
import { LABEL_RECIPES, type LabelRecipe } from "../lib/gmailOrganize";
import { useScanStore } from "../store/scan";
import { Card } from "./Card";
import { GmailApiError } from "../lib/backoff";

type RowState = "idle" | "working" | "labeled" | "archived" | "failed";

export default function GmailOrganize() {
  const aggregates = useScanStore((s) => s.aggregates);
  const labelsRef = useRef<GmailLabel[]>([]); // cache of existing labels
  const [counts, setCounts] = useState<Record<string, number | null>>({});
  const [rowState, setRowState] = useState<Record<string, RowState>>({});
  const [filters, setFilters] = useState<"idle" | "working" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        labelsRef.current = await listLabels();
      } catch {
        /* ignore */
      }
      for (const r of LABEL_RECIPES) {
        try {
          const n = await countMessages(r.query);
          if (active) setCounts((c) => ({ ...c, [r.key]: n }));
        } catch {
          if (active) setCounts((c) => ({ ...c, [r.key]: null }));
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  function setRow(key: string, s: RowState) {
    setRowState((p) => ({ ...p, [key]: s }));
  }

  async function applyLabel(r: LabelRecipe, archive: boolean) {
    setRow(r.key, "working");
    setError(null);
    try {
      const labelId = await ensureLabel(r.name, labelsRef.current);
      await applyLabelToQuery(r.query, [labelId], archive ? ["INBOX"] : []);
      setRow(r.key, archive ? "archived" : "labeled");
    } catch (e) {
      setRow(r.key, "failed");
      setError(scopeError(e) ?? "Couldn't apply that label.");
    }
  }

  async function createAllFilters() {
    setFilters("working");
    setError(null);
    try {
      for (const r of LABEL_RECIPES) {
        const labelId = await ensureLabel(r.name, labelsRef.current);
        await createFilter(
          { query: r.query },
          {
            addLabelIds: [labelId],
            removeLabelIds: r.archiveByDefault ? ["INBOX"] : [],
          }
        );
      }
      setFilters("done");
    } catch (e) {
      setFilters("error");
      setError(
        scopeError(e) ??
          "Couldn't create rules. Reconnect to grant the Gmail settings permission."
      );
    }
  }

  const topSenders = (aggregates?.senders ?? []).slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Organize Gmail</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Create smart labels, tidy your inbox, and auto-sort future mail. Labels
          are non-destructive — remove them anytime.
        </p>
      </div>

      {error && (
        <div className="card-surface flex items-center gap-2 p-3 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {/* 1 — Smart labels */}
      <div>
        <h2 className="mb-3 text-lg font-bold">Smart labels</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LABEL_RECIPES.map((r) => {
            const count = counts[r.key];
            const st = rowState[r.key] ?? "idle";
            const busy = st === "working";
            return (
              <div key={r.key} className="card-surface flex flex-col p-4">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{r.emoji}</span>
                  <span className="text-right text-sm text-slate-500 dark:text-slate-400">
                    {count === undefined ? (
                      <Loader2 className="ml-auto h-4 w-4 animate-spin" />
                    ) : count === null ? (
                      "—"
                    ) : (
                      `${count.toLocaleString()} emails`
                    )}
                  </span>
                </div>
                <h3 className="mt-2 font-semibold">{r.name}</h3>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => applyLabel(r, false)}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : st === "labeled" || st === "archived" ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Tag className="h-4 w-4" />
                    )}
                    {st === "labeled" ? "Labeled" : "Label"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    title="Label and archive out of inbox"
                    onClick={() => applyLabel(r, true)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-brand-600 to-grape-600 px-3 py-2 text-sm font-semibold text-white hover:brightness-105 disabled:opacity-50"
                  >
                    <Archive className="h-4 w-4" />
                    {st === "archived" ? "Done" : "Archive"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2 — Auto-sort future mail (filters) */}
      <Card title="Auto-sort future mail">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xl text-sm text-slate-500 dark:text-slate-400">
            Create Gmail rules so new mail is labeled automatically (and Shopping /
            Social skip the inbox). Applies going forward — your existing mail isn't
            touched here.
          </p>
          <button
            type="button"
            disabled={filters === "working"}
            onClick={createAllFilters}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-600 to-grape-600 px-4 py-2 text-sm font-semibold text-white shadow-soft hover:brightness-105 disabled:opacity-50"
          >
            {filters === "working" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : filters === "done" ? (
              <Check className="h-4 w-4" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            {filters === "done" ? "Rules created" : "Create rules"}
          </button>
        </div>
      </Card>

      {/* 3 — Label top senders */}
      {topSenders.length > 0 && (
        <Card title="Label your top senders">
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
            One label per major sender, so their whole history is one click away.
          </p>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {topSenders.map((s) => {
              const key = `sender:${s.email || s.name}`;
              const st = rowState[key] ?? "idle";
              return (
                <li key={key} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{s.name || s.email}</div>
                    <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {s.email} · {s.count} emails
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={st === "working"}
                    onClick={async () => {
                      setRow(key, "working");
                      try {
                        const labelId = await ensureLabel(
                          s.name || s.email || "Sender",
                          labelsRef
                        );
                        await applyLabelToQuery(senderQuery(s.email || s.name), [labelId]);
                        setRow(key, "labeled");
                      } catch (e) {
                        setRow(key, "failed");
                        setError(scopeError(e) ?? "Couldn't label that sender.");
                      }
                    }}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-white disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    {st === "working" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : st === "labeled" ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Tag className="h-4 w-4" />
                    )}
                    {st === "labeled" ? "Labeled" : "Label"}
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}

/** Friendly message when an action needs a permission we haven't been granted. */
function scopeError(e: unknown): string | null {
  if (e instanceof GmailApiError && (e.status === 403 || e.status === 401)) {
    return "This needs an extra Gmail permission. Disconnect and reconnect to grant it.";
  }
  return null;
}
