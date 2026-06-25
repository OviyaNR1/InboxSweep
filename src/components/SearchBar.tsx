import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { SEARCH_CHIPS } from "../lib/queries";

/**
 * Free-text Gmail search. Accepts raw Gmail query syntax; helper chips append
 * common operators. Submitting opens the review modal for that query.
 */
export default function SearchBar({ onSearch }: { onSearch: (query: string) => void }) {
  const [value, setValue] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (q) onSearch(q);
  }

  return (
    <div>
      <form onSubmit={submit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Search, e.g. from:news@site.com older_than:1y larger:5M"
            aria-label="Search your mail with Gmail query syntax"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>
        <button
          type="submit"
          className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Search
        </button>
      </form>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {SEARCH_CHIPS.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() =>
              setValue((v) => (v ? `${v.trimEnd()} ${chip.insert}` : chip.insert))
            }
            className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}
