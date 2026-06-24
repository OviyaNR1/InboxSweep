import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Logo from "../components/Logo";
import ThemeToggle from "../components/ThemeToggle";

export default function Privacy() {
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

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          How InboxSweep handles your data.
        </p>

        <div className="prose-sm mt-8 space-y-6 text-slate-700 dark:text-slate-300">
          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Your email stays in your browser
            </h2>
            <p className="mt-2">
              InboxSweep reads and acts on your Gmail directly from your browser
              using Google's official API. We do not store, log, or forward the
              contents of your emails to any server we control.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              What our server does
            </h2>
            <p className="mt-2">
              The only server-side component is a small serverless function that
              completes the Google sign-in handshake. It exists so your Google
              client secret is never exposed in the browser. It does not receive
              or process your email content.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Permissions we request
            </h2>
            <p className="mt-2">
              We request the minimum Google permissions needed to find and clean
              up mail. You can disconnect InboxSweep at any time, which revokes
              its access to your account.
            </p>
          </section>

          <p className="text-sm text-slate-500 dark:text-slate-400">
            This page is finalized in Milestone 7 with full scope disclosures and
            the revoke flow.
          </p>
        </div>
      </main>
    </div>
  );
}
