import { Link } from "react-router-dom";
import { Construction, ArrowLeft } from "lucide-react";
import Logo from "../components/Logo";
import ThemeToggle from "../components/ThemeToggle";

// Placeholder app shell. Milestone 2 adds real Google sign-in; Milestone 4
// replaces this body with the storage dashboard.
export default function AppPage() {
  return (
    <div className="min-h-full">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col items-center px-6 py-24 text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
          <Construction className="h-7 w-7" />
        </span>
        <h1 className="mt-6 text-2xl font-bold">App shell ready</h1>
        <p className="mt-3 max-w-md text-slate-600 dark:text-slate-300">
          Google sign-in and the storage dashboard land in the next milestones.
          This screen confirms routing, theming, and the build pipeline work
          end-to-end.
        </p>
      </main>
    </div>
  );
}
