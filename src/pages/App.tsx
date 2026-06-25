import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  LogOut,
  ShieldCheck,
  Loader2,
  AlertCircle,
  Gauge,
  MailMinus,
  HardDrive,
} from "lucide-react";
import Logo from "../components/Logo";
import ThemeToggle from "../components/ThemeToggle";
import Dashboard from "../components/Dashboard";
import UnsubscribeCenter from "../components/UnsubscribeCenter";
import DriveCenter from "../components/DriveCenter";
import UndoBanner from "../components/UndoBanner";
import { useAuth } from "../store/auth";
import {
  beginSignIn,
  completeSignInFromRedirect,
  refreshAccessToken,
  disconnect,
} from "../hooks/useAuth";

export default function AppPage() {
  const { status, user, error, accessToken } = useAuth();
  const [booting, setBooting] = useState(true);

  // On first load: finish a sign-in redirect if we just came back from Google,
  // otherwise try to silently restore a session from the refresh cookie.
  useEffect(() => {
    let active = true;
    (async () => {
      const completed = await completeSignInFromRedirect();
      if (!completed && active) {
        await refreshAccessToken(); // no-op if there's no valid refresh cookie
      }
      if (active) setBooting(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const isAuthed = !!accessToken;

  return (
    <div className="min-h-full">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <div className="flex items-center gap-3">
          {isAuthed && user?.email && (
            <span className="hidden text-sm text-slate-500 dark:text-slate-400 sm:inline">
              {user.email}
            </span>
          )}
          {isAuthed ? (
            <button
              type="button"
              onClick={() => disconnect()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <LogOut className="h-4 w-4" /> Disconnect
            </button>
          ) : (
            <Link
              to="/"
              className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Home
            </Link>
          )}
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {booting || status === "authenticating" ? (
          <Centered>
            <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
            <p className="mt-4 text-slate-600 dark:text-slate-300">
              {status === "authenticating"
                ? "Finishing sign-in…"
                : "Checking your session…"}
            </p>
          </Centered>
        ) : status === "error" ? (
          <Centered>
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
              <AlertCircle className="h-7 w-7" />
            </span>
            <h1 className="mt-6 text-2xl font-bold">Sign-in didn't complete</h1>
            <p className="mt-3 max-w-md text-slate-600 dark:text-slate-300">
              {error ?? "Something went wrong."}
            </p>
            <button
              type="button"
              onClick={() => beginSignIn()}
              className="mt-6 rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700"
            >
              Try again
            </button>
          </Centered>
        ) : isAuthed ? (
          <AuthedApp />
        ) : (
          <Centered>
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-600/10">
              <ShieldCheck className="h-7 w-7" />
            </span>
            <h1 className="mt-6 text-2xl font-bold">Connect your Gmail to begin</h1>
            <p className="mt-3 max-w-md text-slate-600 dark:text-slate-300">
              We'll ask Google for permission to find and clean up mail. Your
              email is processed in your browser and never stored.
            </p>
            <button
              type="button"
              onClick={() => beginSignIn()}
              className="mt-6 rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700"
            >
              Connect Gmail
            </button>
          </Centered>
        )}
      </main>
    </div>
  );
}

/** Signed-in shell: tab switcher between Dashboard and Unsubscribe + undo toast. */
function AuthedApp() {
  const [view, setView] = useState<"dashboard" | "unsubscribe" | "drive">("dashboard");
  const tabs = [
    { id: "dashboard" as const, label: "Dashboard", icon: Gauge },
    { id: "unsubscribe" as const, label: "Unsubscribe", icon: MailMinus },
    { id: "drive" as const, label: "Drive", icon: HardDrive },
  ];
  return (
    <div className="animate-fade-up">
      <div className="mb-6 inline-flex gap-1 rounded-full border border-white/60 bg-white/70 p-1 shadow-soft backdrop-blur dark:border-white/10 dark:bg-slate-900/60">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setView(t.id)}
            className={
              "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition " +
              (view === t.id
                ? "bg-gradient-to-r from-brand-600 to-grape-600 text-white shadow-soft"
                : "text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800")
            }
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div key={view} className="animate-fade-up">
        {view === "dashboard" && <Dashboard />}
        {view === "unsubscribe" && <UnsubscribeCenter />}
        {view === "drive" && <DriveCenter />}
      </div>

      {/* One undo toast for both views. */}
      <UndoBanner />
    </div>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return <div className="flex flex-col items-center text-center">{children}</div>;
}
