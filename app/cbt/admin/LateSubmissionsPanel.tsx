"use client";

import { useEffect, useState } from "react";
import { Check, Clock, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { cbtApi, type LateSubmission } from "@/lib/api-cbt";

function when(iso: string | null) {
  if (!iso) return "unknown";
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** "3 days" / "5 hours" after the deadline, for judging how late it is. */
function lateness(deadlineAt: string | null, at: string | null) {
  if (!deadlineAt || !at) return null;
  const hours = Math.round((new Date(at).getTime() - new Date(deadlineAt).getTime()) / 3_600_000);
  if (hours < 1) return "before the deadline";
  return hours < 48 ? `${hours} hours after the deadline` : `${Math.round(hours / 24)} days after the deadline`;
}

/**
 * Offline attempts whose device stayed offline past the upload window. Their
 * answers reached the cloud but count only once an admin accepts them; see
 * Hcbt services/lateSubmission.js. Renders nothing when none are waiting.
 */
export default function LateSubmissionsPanel({ orgSlug }: { orgSlug: string }) {
  const [items, setItems] = useState<LateSubmission[]>([]);
  const [deciding, setDeciding] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    cbtApi
      .getLateSubmissions(orgSlug)
      .then((rows) => !cancelled && setItems(Array.isArray(rows) ? rows : []))
      .catch(() => undefined); // an optional panel: stay quiet if it can't load
    return () => {
      cancelled = true;
    };
  }, [orgSlug]);

  if (items.length === 0) return null;

  const decide = async (item: LateSubmission, decision: "accept" | "dismiss") => {
    const who = item.student.name || item.student.admissionNumber || "this student";
    if (decision === "dismiss" && !window.confirm(`Don't count ${who}'s late answers for "${item.exam.title}"?`)) return;
    setDeciding(item.id);
    try {
      const outcome = await cbtApi.decideLateSubmission(orgSlug, item.id, decision);
      toast.success(
        decision === "accept"
          ? `Accepted. ${who} scored ${outcome.score ?? 0}/${outcome.totalMarks ?? item.exam.questionCount}.`
          : `Dismissed. ${who}'s late answers won't count.`,
      );
      setItems((current) => current.filter((row) => row.id !== item.id));
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "Couldn't save that decision. Try again.");
    } finally {
      setDeciding(null);
    }
  };

  return (
    <section aria-labelledby="late-heading" className="rounded-2xl border border-[#F5A623]/40 bg-white p-5 sm:p-6">
      <h3 id="late-heading" className="flex items-center gap-2 text-sm font-bold text-[#0B1220]">
        <Clock className="h-4 w-4 text-[#F5A623]" />
        {items.length === 1 ? "1 late offline submission to review" : `${items.length} late offline submissions to review`}
      </h3>
      <p className="mt-1 text-sm text-slate-500">
        These students finished offline but their devices only reconnected after the upload window closed. Accept to grade
        their answers, or dismiss to leave the attempt as it is.
      </p>

      <ul className="mt-4 divide-y divide-slate-100">
        {items.map((item) => (
          <li key={item.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#0B1220]">
                {item.student.name || "Unknown student"}
                {item.student.admissionNumber && (
                  <span className="ml-2 font-mono text-xs font-normal text-slate-500">{item.student.admissionNumber}</span>
                )}
              </p>
              <p className="text-xs text-slate-500">
                {item.exam.title} · {item.answered} of {item.exam.questionCount} answered
              </p>
              <p className="text-xs text-slate-500">
                Finished on the device {when(item.deviceSubmittedAt)}
                {lateness(item.deadlineAt, item.deviceSubmittedAt) && ` (${lateness(item.deadlineAt, item.deviceSubmittedAt)})`}
                {" · "}reached us {when(item.receivedAt)}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={deciding === item.id}
                onClick={() => decide(item, "accept")}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1447E6] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1447E6]/90 disabled:opacity-60"
              >
                {deciding === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Accept and grade
              </button>
              <button
                type="button"
                disabled={deciding === item.id}
                onClick={() => decide(item, "dismiss")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-[#0B1220] hover:border-[#F04438]/40 hover:text-[#F04438] disabled:opacity-60"
              >
                <X className="h-3.5 w-3.5" /> Dismiss
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
