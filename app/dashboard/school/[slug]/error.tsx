"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { RefreshCw, TriangleAlert } from "lucide-react";

// Renders inside the school layout, so the top bar, tab bar and sidebar stay usable:
// a broken page never strands someone without a way home.
export default function SchoolPageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const params = useParams();
  const slug = params.slug as string;

  useEffect(() => {
    console.error(error);
    // Error boundaries swallow errors, so Sentry only sees them if we pass them on.
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-2 py-16 text-center">
      <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
        <TriangleAlert className="h-7 w-7" aria-hidden="true" />
      </span>
      <h2 className="text-lg font-bold text-slate-900">This page didn&apos;t load</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Nothing you saved is lost. It&apos;s usually a weak connection; try again, or go back to your dashboard.
      </p>
      <div className="mt-8 grid w-full gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => reset()}
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 font-semibold text-white transition-colors hover:bg-blue-700"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again
        </button>
        <Link
          href={`/dashboard/school/${slug}`}
          className="flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-800 transition-colors hover:bg-slate-50"
        >
          Go to dashboard
        </Link>
      </div>
      {error.digest && <p className="mt-6 text-xs text-slate-500">Reference: {error.digest}</p>}
    </div>
  );
}
