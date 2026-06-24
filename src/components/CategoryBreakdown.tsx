import type { ScanAggregates } from "../lib/sizeEstimator";
import { CATEGORY_META, formatBytes, type CategoryKey } from "../lib/sizeEstimator";

const ORDER: CategoryKey[] = ["promotions", "social", "updates", "forums", "personal"];

const BAR_COLOR: Record<CategoryKey, string> = {
  promotions: "bg-rose-500",
  social: "bg-sky-500",
  updates: "bg-violet-500",
  forums: "bg-amber-500",
  personal: "bg-emerald-500",
};

/** Estimated storage split across Gmail's categories. */
export default function CategoryBreakdown({
  categories,
}: {
  categories: ScanAggregates["categories"];
}) {
  const max = Math.max(1, ...ORDER.map((k) => categories[k].bytes));

  return (
    <div className="space-y-3">
      {ORDER.map((k) => {
        const c = categories[k];
        const pct = (c.bytes / max) * 100;
        return (
          <div key={k}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-slate-700 dark:text-slate-200">
                {CATEGORY_META[k].label}
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                {formatBytes(c.bytes)} · {c.count}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={`h-full rounded-full ${BAR_COLOR[k]}`}
                style={{ width: `${Math.max(2, pct)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
