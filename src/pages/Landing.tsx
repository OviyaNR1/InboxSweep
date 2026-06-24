import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Trash2,
  MailMinus,
  Gauge,
  Lock,
  Undo2,
  ArrowRight,
} from "lucide-react";
import Logo from "../components/Logo";
import ThemeToggle from "../components/ThemeToggle";

// NOTE: Real Google sign-in is wired up in Milestone 2 (GIS + PKCE). For now
// the "Connect Gmail" button routes to the app shell so the flow is reviewable.
function ConnectButton({ className = "" }: { className?: string }) {
  return (
    <Link
      to="/app"
      className={
        "inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500 " +
        className
      }
    >
      {/* Inline Google "G" so we don't depend on an external asset. */}
      <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#FFFFFF"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"
        />
        <path
          fill="#FFFFFF"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.24 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
          opacity="0.85"
        />
        <path
          fill="#FFFFFF"
          d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.45.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.95l3.66-2.84Z"
          opacity="0.7"
        />
        <path
          fill="#FFFFFF"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
          opacity="0.55"
        />
      </svg>
      Connect Gmail
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

const features = [
  {
    icon: Gauge,
    title: "See what's eating your storage",
    body: "A clear breakdown of your biggest senders, largest emails, and oldest clutter — with estimated space each is using.",
  },
  {
    icon: Trash2,
    title: "Bulk-clean safely",
    body: "Delete by sender, size, or age in one sweep. Everything goes to Trash first, so a mistake is always reversible.",
  },
  {
    icon: MailMinus,
    title: "One-click unsubscribe",
    body: "Stop the newsletters you forgot you signed up for, and optionally delete everything they ever sent you.",
  },
];

const trust = [
  {
    icon: Lock,
    title: "Your email never leaves your browser",
    body: "InboxSweep processes everything locally. We don't store, read, or forward your messages to any server.",
  },
  {
    icon: ShieldCheck,
    title: "Minimal Google permissions",
    body: "We ask only for what's needed to find and clean up mail — and you can disconnect access at any time.",
  },
  {
    icon: Undo2,
    title: "Reversible by default",
    body: "Deletes move to Trash for 30 days. Permanent deletion is gated behind an explicit, clearly-labeled confirmation.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-full">
      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <div className="flex items-center gap-3">
          <Link
            to="/privacy"
            className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          >
            Privacy
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-10 pt-8 sm:pt-16">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700 dark:bg-brand-600/10 dark:text-brand-400">
            <Sparkle /> Free up your Gmail in minutes
          </span>
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl">
            Reclaim your Gmail storage
            <span className="block text-brand-600">without touching settings</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
            InboxSweep shows you exactly what's filling up your inbox, then helps
            you bulk-delete junk, empty huge attachments, and unsubscribe from
            senders — safely, and in plain English.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3">
            <ConnectButton />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              We never store your email. Processing happens in your browser.
            </p>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-6 sm:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-600/10">
                <f.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust / privacy band */}
      <section className="border-y border-slate-200 bg-white py-14 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-2xl font-bold">
            Built to be safe and private
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {trust.map((t) => (
              <div key={t.title} className="flex gap-4">
                <span className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <t.icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-semibold">{t.title}</h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {t.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 py-16 text-center">
        <h2 className="text-3xl font-bold">Ready to clean house?</h2>
        <p className="mx-auto mt-3 max-w-xl text-slate-600 dark:text-slate-300">
          Connect your Gmail and see your storage breakdown in under a minute.
        </p>
        <div className="mt-8 flex justify-center">
          <ConnectButton />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 dark:border-slate-800">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 text-sm text-slate-500 dark:text-slate-400 sm:flex-row">
          <Logo />
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-slate-900 dark:hover:text-white">
              Privacy
            </Link>
            <span>© {new Date().getFullYear()} InboxSweep</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Tiny decorative sparkle (kept local to avoid another import).
function Sparkle() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l1.8 4.8L18.6 8.6 13.8 10.4 12 15.2 10.2 10.4 5.4 8.6l4.8-1.8L12 2z" />
    </svg>
  );
}
