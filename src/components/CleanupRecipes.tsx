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

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {RECIPES.map((r) => {
        const count = counts[r.id];
        const loaded = count !== undefined;
        const empty = count === 0;
        return (
          <button
            key={r.id}
            type="button"
            disabled={empty}
            onClick={() => onRun(r)}
            className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-brand-300 hover:shadow disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-600/50"
          >
            <span
              className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${TONE_RING[r.tone]}`}
            >
              <Sparkles className="h-5 w-5" />
            </span>
            <h3 className="mt-3 font-semibold text-slate-900 dark:text-white">{r.title}</h3>
            <p className="mt-1 flex-1 text-sm text-slate-600 dark:text-slate-300">
              {r.description}
            </p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {!loaded ? (
                  <span className="inline-flex items-center gap-1">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> counting…
                  </span>
                ) : count === null ? (
                  "—"
                ) : empty ? (
                  "Nothing to clean"
                ) : (
                  `${count.toLocaleString()} emails`
                )}
              </span>
              {!empty && loaded && (
                <span className="inline-flex items-center text-sm font-medium text-brand-600 group-hover:gap-1">
                  Review <ChevronRight className="h-4 w-4" />
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
