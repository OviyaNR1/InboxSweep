import { Sparkles } from "lucide-react";

/** Colorful gradient wordmark used in headers. */
export default function Logo() {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 via-grape-500 to-rose-500 text-white shadow-soft">
        <Sparkles className="h-5 w-5" />
      </span>
      <span className="text-lg font-extrabold tracking-tight">
        Inbox<span className="gradient-text">Sweep</span>
      </span>
    </div>
  );
}
