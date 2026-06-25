import { useEffect, useState } from "react";
import { Sparkles, ChevronRight, Loader2 } from "lucide-react";
import { RECIPES, type CleanupRecipe } from "../lib/queries";
import { countMessages } from "../lib/gmailClient";
import { mapLimit } from "../lib/backoff";

const TONE_RING: Record<CleanupRecipe["tone"], string> = {
  promo: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
  size: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  social: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
  old: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
  newsletter: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
};

/**
 * Predefined "cleanup recipes". Counts are fetched lazily (cheap — one
 * messages.list call each). Clicking a card opens the review modal.
 */
export default function CleanupRecipes({
  onRun,
}: {
  onRun: (recipe: CleanupRecipe) => void;
}) {
  const [counts, setCounts] = useState<Record<string, number | null>>({});

  useEffect(() => {
    let active = true;
    mapLimit(RECIPES, 3, async (r) => {
      try {
        const n = await countMessages(r.query);
        if (active) setCounts((c) => ({ ...c, [r.id]: n }));
      } catch {
        if (active) setCounts((c) => ({ ...c, [r.id]: null }));
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Hide recipes with nothing to clean once their count has loaded, so the
  // grid only shows actionable sweeps instead of dead "Nothing to clean" cards.
  const allLoaded = RECIPES.every((r) => counts[r.id] !== undefined);
  const visible = RECIPES.filter((r) => {
    const c = counts[r.id];
    return c === undefined || (c ?? 0) > 0; // still counting, or has results
  });

  if (allLoaded && visible.length === 0) {
    return (
      <div className="card-surface flex items-center gap-3 p-5 text-sm text-slate-600 dark:text-slate-300">
        <Sparkles className="h-5 w-5 text-emerald-500" />
        Your mailbox is already tidy — no quick cleanups needed right now.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {visible.map((r) => {
        const count = counts[r.id];
        const loaded = count !== undefined;
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onRun(r)}
            className="card-surface group flex flex-col p-4 text-left transition hover:-translate-y-0.5 hover:shadow-soft"
          >
            <div className="flex items-start justify-between gap-2">
              <span
                className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${TONE_RING[r.tone]}`}
              >
                <Sparkles className="h-5 w-5" />
              </span>
              <div className="text-right">
                {!loaded ? (
                  <Loader2 className="ml-auto h-4 w-4 animate-spin text-slate-400" />
                ) : (
                  <>
                    <div className="text-xl font-extrabold leading-none tabular-nums">
                      {(count ?? 0).toLocaleString()}
                    </div>
                    <div className="text-[11px] uppercase tracking-wide text-slate-400">
                      emails
                    </div>
                  </>
                )}
              </div>
            </div>
            <h3 className="mt-3 font-semibold text-slate-900 dark:text-white">{r.title}</h3>
            <p className="mt-1 flex-1 text-xs text-slate-500 dark:text-slate-400">
              {r.description}
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 transition group-hover:gap-2">
              Review &amp; clean <ChevronRight className="h-4 w-4" />
            </span>
          </button>
        );
      })}
    </div>
  );
}
