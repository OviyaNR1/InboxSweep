import { useEffect, useMemo, useState } from "react";
import { Wand2, Loader2, Check, FolderTree, FileText } from "lucide-react";
import { useDriveStore } from "../store/drive";
import { getRootId, createFolder, moveFile } from "../lib/driveClient";
import { buildPlan } from "../lib/organize";
import { Card } from "./Card";
import ProgressBar from "./ProgressBar";

/**
 * One-click auto-organize: groups top-level folders into tidy categories,
 * shows the plan for review, then creates the category folders and moves
 * everything in via the Drive API. No manual drag-drop.
 */
export default function OrganizePanel({ onDone }: { onDone: () => void }) {
  const folders = useDriveStore((s) => s.folders);
  const files = useDriveStore((s) => s.files);
  const [rootId, setRootId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [finished, setFinished] = useState<{ moved: number; failed: number } | null>(null);

  useEffect(() => {
    getRootId().then(setRootId).catch(() => setRootId("root"));
  }, []);

  const plan = useMemo(
    () => (rootId ? buildPlan(folders, files, rootId) : null),
    [folders, files, rootId]
  );

  async function execute() {
    if (!plan) return;
    setRunning(true);
    setFinished(null);
    setDone(0);
    const root = rootId && rootId !== "root" ? rootId : await getRootId();

    // Reuse any category folder that already exists at root.
    const existing = new Map<string, string>();
    for (const f of folders) {
      if (f.parents.includes(root)) existing.set(f.name.toLowerCase(), f.id);
    }

    let moved = 0;
    let failed = 0;
    let processed = 0;
    for (const group of plan.groups) {
      let catId = existing.get(group.category.label.toLowerCase());
      if (!catId) {
        try {
          catId = await createFolder(group.category.label);
        } catch {
          failed += group.folders.length;
          continue;
        }
      }
      // Move matching folders, then loose files, into the category folder.
      for (const item of [...group.folders, ...group.files]) {
        try {
          await moveFile(item.id, catId, item.parents);
          moved++;
        } catch {
          failed++;
        }
        setDone(++processed);
      }
    }
    setRunning(false);
    setFinished({ moved, failed });
    onDone(); // trigger a rescan in the parent
  }

  if (!plan) {
    return (
      <Card title="Auto-organize">
        <div className="flex items-center gap-2 py-4 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Analyzing your folders…
        </div>
      </Card>
    );
  }

  if (plan.movesCount === 0) {
    return (
      <Card title="Auto-organize">
        <p className="py-2 text-sm text-slate-500 dark:text-slate-400">
          Your top-level folders already look tidy — nothing to reorganize.
        </p>
      </Card>
    );
  }

  return (
    <Card
      title="Auto-organize"
      action={
        finished ? (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600">
            <Check className="h-4 w-4" /> Moved {finished.moved}
          </span>
        ) : (
          <button
            type="button"
            onClick={execute}
            disabled={running}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {running ? "Organizing…" : `Organize ${plan.movesCount} items`}
          </button>
        )
      }
    >
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        I'll create these folders and move your existing ones inside. Nested
        folders are left untouched. {plan.skipped > 0 && `${plan.skipped} unmatched folders stay where they are.`}
      </p>

      {running && (
        <div className="mb-4">
          <ProgressBar value={done} max={plan.movesCount} label={`Moving ${done} of ${plan.movesCount}`} />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {plan.groups.map((g) => (
          <div key={g.category.key} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
            <div className="mb-2 flex items-center gap-2 font-medium">
              <span>{g.category.emoji}</span>
              {g.category.label}
              <span className="text-xs font-normal text-slate-400">
                {g.folders.length + g.files.length}
              </span>
            </div>
            <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
              {g.folders.map((f) => (
                <li key={f.id} className="flex items-center gap-1.5 truncate">
                  <FolderTree className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="truncate">{f.name}</span>
                </li>
              ))}
              {g.files.map((f) => (
                <li key={f.id} className="flex items-center gap-1.5 truncate text-slate-500">
                  <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="truncate">{f.name}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}
