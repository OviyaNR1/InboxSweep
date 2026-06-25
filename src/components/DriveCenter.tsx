import { useMemo, useState, type ReactNode } from "react";
import {
  HardDrive,
  Loader2,
  AlertCircle,
  Trash2,
  Copy,
  FolderInput,
  RefreshCw,
  Flame,
} from "lucide-react";
import { useDriveScan } from "../hooks/useDriveScan";
import { findDuplicates, moveFile } from "../lib/driveClient";
import { formatBytes } from "../lib/sizeEstimator";
import { Card, StatCard } from "./Card";
import Modal from "./Modal";
import ProgressBar from "./ProgressBar";
import OrganizePanel from "./OrganizePanel";
import Thumb from "./Thumb";

export default function DriveCenter() {
  const drive = useDriveScan();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [moved, setMoved] = useState(0);
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [moveTo, setMoveTo] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const duplicates = useMemo(() => findDuplicates(drive.files), [drive.files]);
  // Bytes reclaimable if you keep one copy of each duplicate group.
  const dupWaste = useMemo(
    () => duplicates.reduce((sum, g) => sum + g[0].size * (g.length - 1), 0),
    [duplicates]
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }
  const selectedBytes = useMemo(
    () => drive.files.reduce((s, f) => (selected.has(f.id) ? s + f.size : s), 0),
    [drive.files, selected]
  );

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(null), 6000);
  }

  async function trashSelected() {
    if (selected.size === 0) return;
    setBusy(true);
    const res = await drive.trash([...selected]);
    setBusy(false);
    setSelected(new Set());
    flash(
      `Moved ${res.ok.length} file${res.ok.length === 1 ? "" : "s"} to Drive Trash` +
        (res.failed.length ? ` · ${res.failed.length} failed` : "")
    );
  }

  async function moveSelected() {
    if (!moveTo || selected.size === 0) return;
    setBusy(true);
    setMoved(0);
    const ids = [...selected];
    let done = 0;
    const files = drive.files.filter((f) => selected.has(f.id));
    for (const f of files) {
      try {
        await moveFile(f.id, moveTo, f.parents);
      } catch {
        /* skip failures */
      }
      setMoved(++done);
    }
    setBusy(false);
    setSelected(new Set());
    flash(`Moved ${ids.length} file${ids.length === 1 ? "" : "s"} into the folder`);
  }

  async function doEmptyTrash() {
    setConfirmEmpty(false);
    setBusy(true);
    try {
      await drive.emptyTrash();
      flash("Drive Trash emptied — space reclaimed.");
    } catch {
      flash("Couldn't empty Trash. Try again.");
    }
    setBusy(false);
  }

  // ── States ────────────────────────────────────────────────────────────────
  if (drive.status === "idle") {
    return (
      <Empty
        icon={<HardDrive className="h-7 w-7" />}
        title="Scan your Google Drive"
        body="We'll list your files biggest-first, find exact duplicates, and let you clean up or reorganize. Drive is read until you choose an action."
        action={
          <button
            onClick={() => drive.scan()}
            className="mt-6 rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700"
          >
            Scan Drive
          </button>
        }
      />
    );
  }
  if (drive.status === "scanning") {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-600" />
        <p className="mt-4 text-slate-600 dark:text-slate-300">
          Scanning Drive… {drive.scanned.toLocaleString()} files
        </p>
      </div>
    );
  }
  if (drive.status === "error") {
    return (
      <Empty
        icon={<AlertCircle className="h-7 w-7 text-red-500" />}
        title="Couldn't scan Drive"
        body={drive.error ?? "Something went wrong."}
        action={
          <button
            onClick={() => drive.scan()}
            className="mt-6 rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700"
          >
            Try again
          </button>
        }
      />
    );
  }

  const q = drive.quota;

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Drive cleanup</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {drive.files.length.toLocaleString()} files scanned.
          </p>
        </div>
        <button
          onClick={() => drive.scan()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <RefreshCw className="h-4 w-4" /> Rescan
        </button>
      </div>

      {/* Storage overview */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Drive usage"
          value={q ? formatBytes(q.usageInDrive) : "—"}
          sub={q ? `of ${formatBytes(q.limit)} total account` : undefined}
        />
        <StatCard
          label="Reclaimable from duplicates"
          value={formatBytes(dupWaste)}
          sub={`${duplicates.length} duplicate sets`}
        />
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Drive Trash
          </div>
          <div className="mt-1 text-2xl font-bold tabular-nums">
            {q ? formatBytes(q.usageInDriveTrash) : "—"}
          </div>
          <button
            onClick={() => setConfirmEmpty(true)}
            disabled={busy || !q || q.usageInDriveTrash === 0}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            <Flame className="h-3.5 w-3.5" /> Empty Trash (frees space now)
          </button>
        </div>
      </div>

      {/* One-click auto-organize */}
      <OrganizePanel onDone={() => drive.scan()} />

      {/* Duplicates */}
      {duplicates.length > 0 && (
        <Card title={`Exact duplicates · reclaim ${formatBytes(dupWaste)}`}>
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
            Same content hash. Tip: keep the first, select the rest.
          </p>
          <ul className="space-y-3">
            {duplicates.slice(0, 20).map((group) => (
              <li key={group[0].md5} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                  <Copy className="h-4 w-4 text-amber-500" />
                  {group[0].name}{" "}
                  <span className="text-xs font-normal text-slate-500">
                    × {group.length} · {formatBytes(group[0].size)} each
                  </span>
                </div>
                <div className="space-y-1 pl-6">
                  {group.map((f, i) => (
                    <label key={f.id} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={selected.has(f.id)}
                        onChange={() => toggle(f.id)}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600"
                      />
                      {i === 0 ? "Keep (original)" : "Duplicate"} · modified{" "}
                      {new Date(f.modifiedTime).toLocaleDateString()}
                    </label>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Biggest files */}
      <Card title="Biggest files">
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {drive.files.slice(0, 40).map((f) => (
            <li key={f.id} className="flex items-center gap-3 py-2.5">
              <input
                type="checkbox"
                checked={selected.has(f.id)}
                onChange={() => toggle(f.id)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600"
              />
              <Thumb file={f} />
              <div className="min-w-0 flex-1">
                <a
                  href={f.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-sm font-medium text-slate-900 hover:text-brand-600 dark:text-white"
                >
                  {f.name}
                </a>
                <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {f.mimeType.split(/[/.]/).pop()} · {new Date(f.modifiedTime).toLocaleDateString()}
                </div>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                {formatBytes(f.size)}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Sticky action bar */}
      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
            <span className="text-sm font-medium">
              {selected.size} selected · {formatBytes(selectedBytes)}
              {busy && moved > 0 && (
                <span className="ml-2 text-slate-500">moving {moved}…</span>
              )}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={moveTo}
                onChange={(e) => setMoveTo(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="">Move to folder…</option>
                {drive.folders.map((fo) => (
                  <option key={fo.id} value={fo.id}>
                    {fo.name}
                  </option>
                ))}
              </select>
              <button
                onClick={moveSelected}
                disabled={busy || !moveTo}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium disabled:opacity-40 dark:border-slate-700"
              >
                <FolderInput className="h-4 w-4" /> Move
              </button>
              <button
                onClick={trashSelected}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Move to Trash
              </button>
            </div>
          </div>
          {busy && selected.size > 0 && (
            <div className="px-6 pb-2">
              <ProgressBar value={moved} max={selected.size} />
            </div>
          )}
        </div>
      )}

      {/* Empty-trash confirm */}
      <Modal open={confirmEmpty} onClose={() => setConfirmEmpty(false)} title="Empty Drive Trash" maxWidth="max-w-md">
        <div className="space-y-4 p-5">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            This permanently deletes everything in your Drive Trash and frees the
            space immediately. It <strong>cannot be undone</strong>.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setConfirmEmpty(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium dark:border-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={doEmptyTrash}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Empty Trash
            </button>
          </div>
        </div>
      </Modal>

      {notice && (
        <div className="fixed inset-x-0 top-6 z-50 flex justify-center px-4">
          <div className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">
            {notice}
          </div>
        </div>
      )}
    </div>
  );
}

function Empty({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-600/10">
        {icon}
      </span>
      <h2 className="mt-5 text-xl font-bold">{title}</h2>
      <p className="mt-2 text-slate-600 dark:text-slate-300">{body}</p>
      {action}
    </div>
  );
}
