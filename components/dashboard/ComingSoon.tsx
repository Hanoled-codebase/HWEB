"use client";

import Link from "next/link";
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
    <div className="flex min-h-[60dvh] items-center justify-center p-4">
      <div className="m-rise w-full max-w-lg rounded-2xl border border-slate-200/80 bg-white p-6 text-center shadow-sm sm:p-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <Clock className="h-7 w-7" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-bold text-[#0B1220]">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{blurb}</p>
        <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
          <Rocket className="h-3.5 w-3.5" aria-hidden="true" /> Arriving in the next release
        </p>
        {backHref && (
          <div className="mt-3">
            <Link
              href={backHref}
              className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              Back to dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default ComingSoonCard;
