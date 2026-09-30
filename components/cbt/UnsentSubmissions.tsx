"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Clock, Download, Loader2, RotateCcw, Trash2 } from "lucide-react";
import {
  getFailedSyncs,
  getLease,
  onQueueChanged,
  removeLease,
  removeSyncItem,
  retrySyncItem,
  type SyncFailure,
  type SyncQueueItem,
} from "@/lib/cbt-offline";
import { syncNow } from "@/lib/cbt-sync";

type Tone = "waiting" | "problem";

/** What a student is told about a saved exam the server wouldn't take. */
export function unsentStatus(failure: SyncFailure): { tone: Tone; message: string; canRetry: boolean } {
  if (failure.sentForReview) {
    return {
      tone: "waiting",
      message: "It reached the school after the upload window closed, so a teacher will decide whether it counts.",
      canRetry: true,
    };
  }
  switch (failure.code) {
    case "DISMISSED":
      return { tone: "problem", message: "Your school decided not to count this late submission.", canRetry: false };
    case "OFFLINE_LEASE_REVOKED":
      return {
        tone: "problem",
        message: "This exam was started again on another device, so this copy can't be sent.",
        canRetry: false,
      };
    case "ATTEMPT_NOT_FOUND":
      return { tone: "problem", message: "Your school has removed this exam attempt.", canRetry: false };
    case "CANONICAL_REGISTRATION_REQUIRED":
      return {
        tone: "problem",
        message: "The school needs to fix this exam's registration. Try again once they have.",
        canRetry: true,
      };
    default:
      return {
        tone: "problem",
        message: "The exam server didn't accept this copy. Show this to your teacher, or try again.",
        canRetry: true,
      };
  }
}

type Row = { item: SyncQueueItem; title: string };

function formatWhen(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? "an unknown time"
    : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

// A copy of the answers for the school, without the lease (it is a credential).
function downloadCopy({ item, title }: Row) {
  const record = {
    exam: title,
    examId: item.examId,
    attemptId: item.attemptId,
    finishedOnDeviceAt: item.submittedAt,
    answers: item.answers,
    problem: item.failed?.reason ?? null,
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(record, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `hanoled-exam-${item.attemptId.slice(0, 8)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function readRows(): Promise<Row[]> {
  try {
    const failed = await getFailedSyncs();
    const withTitles = await Promise.all(
      failed.map(async (item) => ({ item, title: (await getLease(item.examId))?.exam.title || "An exam" })),
    );
    return withTitles.sort((a, b) => b.item.submittedAt.localeCompare(a.item.submittedAt));
  } catch {
    return []; // IndexedDB unavailable (private window): nothing to show
  }
}

/**
 * Exams finished offline on this device that the server wouldn't take. The
 * answers stay here (never deleted behind the student's back) until the
 * school accepts them, the student removes them, or a retry goes through.
 */
export function UnsentSubmissions() {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      readRows().then((next) => !cancelled && setRows(next));
    };
    refresh();
    const unsubscribe = onQueueChanged(refresh);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  if (rows.length === 0) return null;

  const retry = async (id: string) => {
    setBusy(id);
    try {
      await retrySyncItem(id);
      await syncNow();
    } finally {
      setBusy(null);
    }
  };

  const checkAgain = async (id: string) => {
    setBusy(id);
    try {
      await syncNow();
    } finally {
      setBusy(null);
    }
  };

  const remove = async ({ item, title }: Row) => {
    if (!window.confirm(`Remove your saved answers for "${title}" from this device? This can't be undone.`)) return;
    await removeSyncItem(item.id);
    await removeLease(item.examId);
  };

  return (
    <section aria-labelledby="unsent-heading" className="rounded-sm border border-[#F5A623]/40 bg-white p-4 sm:p-5">
      <h2 id="unsent-heading" className="flex items-center gap-2 text-sm font-bold text-[#0B1220]">
        <AlertTriangle className="h-4 w-4 text-[#F5A623]" />
        {rows.length === 1 ? "An exam saved on this device wasn't submitted" : `${rows.length} exams saved on this device weren't submitted`}
      </h2>
      <p className="mt-1 text-xs text-slate-500">Your answers are kept here until this is sorted out.</p>

      <ul className="mt-4 divide-y divide-slate-100">
        {rows.map((row) => {
          const { item, title } = row;
          const status = unsentStatus(item.failed!);
          const answered = Object.keys(item.answers).length;
          return (
            <li key={item.id} className="py-3 first:pt-0 last:pb-0">
              <p className="text-sm font-semibold text-[#0B1220]">{title}</p>
              <p className="text-xs text-slate-500">
                Finished {formatWhen(item.submittedAt)} · {answered} {answered === 1 ? "answer" : "answers"} saved
              </p>
              <p
                className={`mt-2 flex items-start gap-1.5 text-xs ${
                  status.tone === "waiting" ? "text-[#0B1220]" : "text-[#F04438]"
                }`}
              >
                {status.tone === "waiting" ? (
                  <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#F5A623]" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                )}
                {status.message}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {status.canRetry && (
                  <button
                    type="button"
                    disabled={busy === item.id}
                    onClick={() => (item.failed?.sentForReview ? checkAgain(item.id) : retry(item.id))}
                    className="inline-flex items-center gap-1.5 rounded-sm bg-[#1447E6] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1447E6]/90 disabled:opacity-60"
                  >
                    {busy === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                    {item.failed?.sentForReview ? "Check again" : "Try again"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => downloadCopy(row)}
                  className="inline-flex items-center gap-1.5 rounded-sm border border-slate-200 px-3 py-2 text-xs font-semibold text-[#0B1220] hover:border-[#1447E6]/40 hover:text-[#1447E6]"
                >
                  <Download className="h-3.5 w-3.5" /> Save a copy
                </button>
                <button
                  type="button"
                  onClick={() => remove(row)}
                  className="inline-flex items-center gap-1.5 rounded-sm px-3 py-2 text-xs font-semibold text-slate-500 hover:text-[#F04438]"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
