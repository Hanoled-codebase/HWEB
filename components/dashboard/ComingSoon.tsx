"use client";

import { Clock, Rocket } from "lucide-react";

/**
 * Placeholder card for features parked ahead of the MVP launch.
 *
 * Reminder for every agent / developer: finding one of these does NOT mean
 * the feature is missing. Its full implementation sits in the same file,
 * deliberately gated (search for the file's PARKED marker, e.g. MVP_LAUNCH)
 * so it can be switched on screen by screen after launch.
 */
export function ComingSoonCard({
  title,
  blurb,
  backHref,
}: {
  title: string;
  blurb: string;
  /** Optional "go back" chip — most callers omit it. */
  backHref?: string;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200/80 bg-white/90 p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <Clock className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        <p className="mt-2 text-xs sm:text-sm text-slate-500">{blurb}</p>
        <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-600">
          <Rocket className="h-3.5 w-3.5" /> Arriving in the next release
        </p>
        {backHref && (
          <a
            href={backHref}
            className="mt-4 block text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline"
          >
            Back to dashboard
          </a>
        )}
      </div>
    </div>
  );
}

export default ComingSoonCard;
