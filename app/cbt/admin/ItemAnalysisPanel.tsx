"use client";

import { useState } from "react";
import { AlertTriangle, BarChart3, ChevronDown, Loader2 } from "lucide-react";
import { cbtApi, type ItemAnalysis, type ItemFlag } from "@/lib/api-cbt";
import { optionLabel } from "@/lib/cbt-options";
import { MathRenderer } from "@/components/MathRenderer";

const FLAG_COPY: Record<ItemFlag, { text: string; tone: "alert" | "warning" | "info" }> = {
  CHECK_ANSWER_KEY: { text: "Weaker students did better than stronger ones. Check the answer key.", tone: "alert" },
  WEAK_DISCRIMINATION: { text: "Doesn't separate students who know the topic from those who don't.", tone: "warning" },
  TOO_HARD: { text: "Very few got this right.", tone: "info" },
  TOO_EASY: { text: "Almost everyone got this right.", tone: "info" },
};

const TONE_CLASS = {
  alert: "text-[#F04438]",
  warning: "text-[#0B1220]",
  info: "text-slate-500",
};

const percent = (share: number | null) => (share === null ? "—" : `${Math.round(share * 100)}%`);

// The usual reading of the discrimination index D (top 27% minus bottom 27%).
function separation(d: number) {
  if (d < 0) return "reversed";
  if (d < 0.2) return "poorly";
  if (d < 0.3) return "fairly";
  return "well";
}

/**
 * Per-question breakdown for an exam's results: how many got each question
 * right, whether it separates strong from weak students, and which choices
 * they picked. Loaded only when opened.
 */
export default function ItemAnalysisPanel({ examId }: { examId: string }) {
  const [open, setOpen] = useState(false);
  const [analysis, setAnalysis] = useState<ItemAnalysis | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (!next || analysis || loading) return;
    setLoading(true);
    setError("");
    try {
      setAnalysis(await cbtApi.getItemAnalysis(examId));
    } catch {
      setError("Couldn't load the question analysis. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const needsReview = analysis?.items.filter((item) => item.flags.includes("CHECK_ANSWER_KEY")).length ?? 0;

  return (
    <section className="mt-6 rounded-xl border border-slate-200">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-[#0B1220]">
          <BarChart3 className="h-4 w-4 text-[#1447E6]" /> How each question did
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-slate-100 px-4 py-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Working it out…
            </div>
          ) : error ? (
            <p role="alert" className="text-sm text-[#F04438]">{error}</p>
          ) : analysis ? (
            <>
              <p className="text-xs text-slate-500">
                Based on {analysis.candidates} {analysis.candidates === 1 ? "student" : "students"}
                {analysis.excludedForCheating > 0 && `; ${analysis.excludedForCheating} left out for cheating`}.
                {analysis.groupSize === 0 && " With fewer than 10 students, only the share who got each question right is shown."}
              </p>
              {needsReview > 0 && (
                <p className="mt-2 flex items-start gap-1.5 text-xs font-semibold text-[#F04438]">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {needsReview === 1 ? "1 question needs its answer key checked." : `${needsReview} questions need their answer keys checked.`}
                </p>
              )}

              <ol className="mt-4 space-y-5">
                {analysis.items.map((item) => {
                  const top = Math.max(1, ...item.choiceCounts, item.blank);
                  return (
                    <li key={item.questionId}>
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 text-sm text-[#0B1220]">
                          <span className="mr-1 font-bold">Q{item.number}.</span>
                          <MathRenderer text={item.text} />
                        </p>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-bold tabular-nums text-[#0B1220]">{percent(item.difficulty)}</p>
                          <p className="text-[11px] text-slate-500">{item.type === "theory" ? "average mark" : "got it right"}</p>
                        </div>
                      </div>
                      {item.discrimination !== null && (
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          Separates strong from weak students: {separation(item.discrimination)}
                        </p>
                      )}
                      {item.type === "theory" && (
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          Theory question
                          {item.awaitingMarking ? ` · ${item.awaitingMarking} still to mark` : ""}
                          {item.blank ? ` · ${item.blank} left blank` : ""}
                        </p>
                      )}
                      {item.flags.map((flag) => (
                        <p key={flag} className={`mt-1 text-xs ${TONE_CLASS[FLAG_COPY[flag].tone]}`}>
                          {FLAG_COPY[flag].text}
                        </p>
                      ))}

                      <ul className="mt-2 space-y-1">
                        {item.options.map((option, index) => {
                          const count = item.choiceCounts[index] ?? 0;
                          const isKey = index === item.correctAnswer;
                          return (
                            <li key={index} className="flex items-center gap-2 text-xs">
                              <span className={`w-4 font-bold ${isKey ? "text-[#12B76A]" : "text-slate-500"}`}>{optionLabel(index)}</span>
                              <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                                <span
                                  className={`absolute inset-y-0 left-0 rounded-full ${isKey ? "bg-[#12B76A]" : "bg-[#1447E6]/40"}`}
                                  style={{ width: `${(count / top) * 100}%` }}
                                />
                              </span>
                              <span className="w-6 text-right tabular-nums text-slate-600">{count}</span>
                              <span className="hidden w-40 truncate text-slate-500 sm:inline" title={option}>
                                {option}
                              </span>
                            </li>
                          );
                        })}
                        {item.blank > 0 && (
                          <li className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="w-4">–</span>
                            <span className="flex-1">Left blank</span>
                            <span className="w-6 text-right tabular-nums">{item.blank}</span>
                            <span className="hidden w-40 sm:inline" />
                          </li>
                        )}
                      </ul>
                    </li>
                  );
                })}
              </ol>
            </>
          ) : null}
        </div>
      )}
    </section>
  );
}
