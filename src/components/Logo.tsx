import { Sparkles } from "lucide-react";

/** Small wordmark used in headers. */
export default function Logo() {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
        <Sparkles className="h-5 w-5" />
      </span>
      <span className="text-lg font-bold tracking-tight">
        Inbox<span className="text-brand-600">Sweep</span>
      </span>
    </div>
  );
}
