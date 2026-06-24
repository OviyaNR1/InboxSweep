import { useState } from "react";
import {
  Search,
  Loader2,
  AlertCircle,
  RefreshCw,
  Gauge,
  Clock,
} from "lucide-react";
import { useScan } from "../hooks/useScan";
import { formatBytes } from "../lib/sizeEstimator";
import { Card, StatCard } from "./Card";
import ProgressBar from "./ProgressBar";
import SenderTable from "./SenderTable";
import CategoryBreakdown from "./CategoryBreakdown";
import LargestEmails from "./LargestEmails";

const DEPTHS = [
  { label: "Quick", cap: 1000, hint: "~1 min" },
  { label: "Standard", cap: 2500, hint: "~2–3 min" },
  { label: "Deep", cap: 6000, hint: "~5+ min" },
];

export default function Dashboard() {
  const scan = useScan();
  const [depth, setDepth] = useState(1); // default Standard

  const denom = Math.min(scan.cap || 1, scan.total || scan.cap || 1);

  // ── Idle: prompt to scan ────────────────────────────────────────────────
  if (scan.status === "idle") {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-600/10">
          <Gauge className="h-7 w-7" />
        </span>
        <h1 className="mt-6 text-2xl font-bold">Scan your mailbox</h1>
        <p className="mx-auto mt-3 max-w-md text-slate-600 dark:text-slate-300">
          We'll estimate how much storage each sender, category, and large email
          is using. Nothing is changed — this is read-only.
        </p>

        <div className="mt-6 inline-flex rounded-xl border border-slate-200 p-1 dark:border-slate-700">
          {DEPTHS.map((d, i) => (
            <button
              key={d.label}
              type="button"
              onClick={() => setDepth(i)}
              className={
                "rounded-lg px-4 py-2 text-sm font-medium transition " +
                (i === depth
                  ? "bg-brand-600 text-white"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800")
              }
            >
              {d.label}
              <span className="ml-1 text-xs opacity-70">{d.hint}</span>
            </button>
          ))}
        </div>

        <div>
          <button
            type="button"
            onClick={() => scan.startScan({ cap: DEPTHS[depth].cap })}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700"
          >
            <Search className="h-5 w-5" /> Start scan
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Scans your most recent {DEPTHS[depth].cap.toLocaleString()} messages.
        </p>
      </div>
    );
  }

  // ── Scanning ────────────────────────────────────────────────────────────
  if (scan.status === "listing" || scan.status === "scanning") {
    return (
      <div className="mx-auto max-w-xl py-20 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-600" />
        <h2 className="mt-4 text-lg font-semibold">
          {scan.status === "listing" ? "Finding your emails…" : "Estimating storage…"}
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {scan.status === "scanning"
            ? `Scanned ${scan.scanned.toLocaleString()} of ~${denom.toLocaleString()}`
            : "Listing messages in your mailbox"}
        </p>
        <div className="mx-auto mt-6 max-w-md">
          <ProgressBar value={scan.scanned} max={denom} />
        </div>
        <button
          type="button"
          onClick={scan.cancel}
          className="mt-6 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Cancel
        </button>
      </div>
    );
  }

  // ── Error / cancelled ───────────────────────────────────────────────────
  if (scan.status === "error" || scan.status === "cancelled") {
    return (
      <div className="mx-auto max-w-xl py-20 text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
          <AlertCircle className="h-7 w-7" />
        </span>
        <h2 className="mt-4 text-lg font-semibold">
          {scan.status === "cancelled" ? "Scan cancelled" : "Scan failed"}
        </h2>
        {scan.error && (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{scan.error}</p>
        )}
        <button
          type="button"
          onClick={() => scan.startScan({ cap: DEPTHS[depth].cap })}
          className="mt-6 rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700"
        >
          Scan again
        </button>
      </div>
    );
  }

  // ── Done: the dashboard ─────────────────────────────────────────────────
  const agg = scan.aggregates!;
  const partial = scan.total > scan.scanned;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Your storage breakdown</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            All sizes are estimates from Gmail.
            {partial &&
              ` Based on the ${scan.scanned.toLocaleString()} most recent of ~${scan.total.toLocaleString()} messages.`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => scan.startScan({ cap: DEPTHS[depth].cap })}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <RefreshCw className="h-4 w-4" /> Rescan
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Scanned size (est.)"
          value={formatBytes(agg.totalBytes)}
          sub={`${agg.scanned.toLocaleString()} emails`}
        />
        <StatCard label="Top senders" value={agg.senders.length.toLocaleString()} sub="by storage" />
        <StatCard
          label="Older than 1 year"
          value={formatBytes(agg.ageBuckets[0].bytes)}
          sub={`${agg.ageBuckets[0].count.toLocaleString()} emails`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Top senders by storage" className="lg:col-span-2">
          <SenderTable senders={agg.senders} />
        </Card>

        <div className="space-y-6">
          <Card title="By category">
            <CategoryBreakdown categories={agg.categories} />
          </Card>

          <Card title="By age">
            <ul className="space-y-3">
              {agg.ageBuckets.map((b) => (
                <li key={b.key} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                    <Clock className="h-4 w-4 text-slate-400" />
                    {b.label}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {formatBytes(b.bytes)} · {b.count}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <Card title="Largest emails">
        <LargestEmails messages={agg.largest} limit={10} />
      </Card>
    </div>
  );
}
