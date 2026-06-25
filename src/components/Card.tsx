import type { ReactNode } from "react";

/** Frosted rounded panel used across the app. */
export function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={"card-surface p-5 sm:p-6 " + className}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

type Accent = "brand" | "rose" | "emerald" | "amber" | "sky" | "grape";

const ACCENT_BG: Record<Accent, string> = {
  brand: "from-brand-500 to-grape-500",
  rose: "from-rose-500 to-pink-500",
  emerald: "from-emerald-500 to-teal-500",
  amber: "from-amber-500 to-orange-500",
  sky: "from-sky-500 to-cyan-500",
  grape: "from-grape-500 to-fuchsia-500",
};

/** Big headline metric with a colorful accent bar. */
export function StatCard({
  label,
  value,
  sub,
  accent = "brand",
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: Accent;
}) {
  return (
    <div className="card-surface relative overflow-hidden p-5">
      {/* colorful top accent */}
      <span
        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${ACCENT_BG[accent]}`}
      />
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-2xl font-extrabold tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{sub}</div>}
    </div>
  );
}
