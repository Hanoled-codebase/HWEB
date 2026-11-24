import React, { useState } from "react";
import { CheckCircle2, XCircle, AlertCircle, ShieldAlert, BookOpen, Clock, Award, HelpCircle } from "lucide-react";
import { MathRenderer } from "@/components/MathRenderer";
import { HCBT_BASE } from "@/lib/api";
import { optionLabel } from "@/lib/cbt-options";
import { cn } from "@/lib/utils";

const CBT_BACKEND_URL = HCBT_BASE;

function formatOption(text: string): string {
  let t = text.trim();
  t = t.replace(/\.+$/, "");
  if (t.length > 0) t = t.charAt(0).toUpperCase() + t.slice(1);
  return t;
}

interface AnswerCorrection {
  question: {
    id: string;
    type?: "objective" | "theory";
    text: string;
    options: string[];
    correctAnswer: number;
    explanation: string | null;
    marks: number;
    imageUrl?: string | null;
    passage?: string | null;
  };
  selectedOption: number | null;
  textAnswer?: string | null;
  markerComment?: string | null;
  isCorrect: boolean;
  marksObtained: number;
}

interface ResultViewProps {
  result: {
    score: number;
    totalMarks: number;
    percentage: number;
    timeTaken: number;
    cheatingStatus?: string;
    tabSwitchCount?: number;
    exam: {
      title: string;
      passMark: number;
      duration: number;
    };
    answers: AnswerCorrection[];
  };
}

/**
 * Distilled CBT exam result view:
 * - Direct visual hierarchy: outcome first, key performance numbers, then question corrections.
 * - Free of decorative blur halos and redundant nested borders.
 * - High-contrast, accessible answer breakdown with clear option states.
 * - Full support for KaTeX math notation and theory marker commentary.
 */
export function ResultView({ result }: ResultViewProps) {
  const { score, totalMarks, percentage, timeTaken, exam, answers, cheatingStatus, tabSwitchCount } = result;
  const isCheating = cheatingStatus === "cheating";
  const passed = !isCheating && percentage >= exam.passMark;

  const [activeFilter, setActiveFilter] = useState<"all" | "passed" | "failed">("all");

  const isObjective = (ans: AnswerCorrection) => ans.question.type !== "theory";
  const objectiveAnswers = answers.filter(isObjective);
  const passedCount = objectiveAnswers.filter((a) => a.isCorrect).length;
  const failedCount = objectiveAnswers.length - passedCount;

  const filteredAnswers = answers.filter((ans) => {
    if (activeFilter === "passed") return isObjective(ans) && ans.isCorrect;
    if (activeFilter === "failed") return isObjective(ans) && !ans.isCorrect;
    return true;
  });

  const minutes = Math.floor(timeTaken / 60);
  const seconds = timeTaken % 60;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* ── 1. Outcome Hero Card ── */}
      {isCheating ? (
        <section
          aria-label="Exam Result"
          className="rounded-2xl border border-rose-200 bg-rose-50/90 p-6 sm:p-8 text-center shadow-xs"
        >
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <span className="inline-flex items-center rounded-full bg-rose-200/80 px-3 py-1 text-xs font-bold uppercase tracking-wider text-rose-900">
            Cheating Detected
          </span>
          <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-rose-950">
            Exam Disqualified
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-rose-800 leading-relaxed">
            Auto-failed due to {tabSwitchCount || 3} proctoring violation{(tabSwitchCount || 3) > 1 ? "s" : ""}.
            Multiple tab switches were recorded during this session.
          </p>
          <div className="mt-4 inline-block rounded-xl bg-white/80 border border-rose-200 px-4 py-2 text-xs font-bold text-rose-700">
            Final Score: 0 / {totalMarks} (0%)
          </div>
        </section>
      ) : (
        <section
          aria-label="Exam Result"
          className={cn(
            "rounded-2xl border p-6 sm:p-8 shadow-xs transition-all",
            passed ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200 bg-white",
          )}
        >
          <div className="text-center">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider",
                passed ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800",
              )}
            >
              {passed ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" /> : <AlertCircle className="h-3.5 w-3.5 text-amber-700" />}
              {passed ? "Passed" : "Keep Practicing"}
            </span>

            <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              {passed ? "Congratulations, you passed!" : "Review your answers and try again"}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {exam.title} · Pass mark: <span className="font-semibold text-slate-800">{exam.passMark}%</span>
            </p>

            {/* Score Strip */}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 text-center">
                <span className="block text-xs font-semibold text-slate-500">Score</span>
                <span className="mt-0.5 block text-xl sm:text-2xl font-bold tabular-nums text-slate-900">
                  {score} <span className="text-xs font-medium text-slate-400">/ {totalMarks}</span>
                </span>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 text-center">
                <span className="block text-xs font-semibold text-slate-500">Percentage</span>
                <span
                  className={cn(
                    "mt-0.5 block text-xl sm:text-2xl font-bold tabular-nums",
                    passed ? "text-emerald-700" : "text-amber-700",
                  )}
                >
                  {percentage}%
                </span>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 text-center">
                <span className="block text-xs font-semibold text-slate-500">Time Taken</span>
                <span className="mt-0.5 block text-xl sm:text-2xl font-bold tabular-nums text-slate-900">
                  {minutes}m {seconds}s
                </span>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 text-center">
                <span className="block text-xs font-semibold text-slate-500">Accuracy</span>
                <span className="mt-0.5 block text-xl sm:text-2xl font-bold tabular-nums text-slate-900">
                  {passedCount} <span className="text-xs font-medium text-slate-400">/ {objectiveAnswers.length}</span>
                </span>
              </div>
            </div>

            {cheatingStatus && cheatingStatus !== "none" && !isCheating && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-1.5 text-xs text-amber-800">
                <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
                <span>{tabSwitchCount} tab switch warning{(tabSwitchCount || 0) > 1 ? "s" : ""} recorded during the test</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── 2. Distilled Corrections Navigation Bar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Questions Breakdown</h2>
          <p className="text-xs text-slate-500">
            Showing {filteredAnswers.length} of {answers.length} question{answers.length === 1 ? "" : "s"}
          </p>
        </div>

        {/* Filter Segmented Pills */}
        <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-medium" role="tablist" aria-label="Question filters">
          <button
            type="button"
            role="tab"
            aria-selected={activeFilter === "all"}
            onClick={() => setActiveFilter("all")}
            className={cn(
              "rounded-lg px-3.5 py-1.5 transition-colors pointer-coarse:min-h-11",
              activeFilter === "all" ? "bg-white font-semibold text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900",
            )}
          >
            All ({answers.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeFilter === "passed"}
            onClick={() => setActiveFilter("passed")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition-colors pointer-coarse:min-h-11",
              activeFilter === "passed" ? "bg-white font-semibold text-emerald-800 shadow-xs" : "text-slate-600 hover:text-slate-900",
            )}
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>Correct ({passedCount})</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeFilter === "failed"}
            onClick={() => setActiveFilter("failed")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition-colors pointer-coarse:min-h-11",
              activeFilter === "failed" ? "bg-white font-semibold text-rose-800 shadow-xs" : "text-slate-600 hover:text-slate-900",
            )}
          >
            <XCircle className="h-3.5 w-3.5 text-rose-600" />
            <span>Incorrect ({failedCount})</span>
          </button>
        </div>
      </div>

      {/* ── 3. Question Cards List ── */}
      <div className="space-y-4">
        {filteredAnswers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">No questions match this filter</p>
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
            >
              Reset to view all questions
            </button>
          </div>
        ) : (
          filteredAnswers.map((ans, idx) => {
            const isTheory = ans.question.type === "theory";

            return (
              <article
                key={ans.question.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs transition-shadow hover:shadow-xs"
              >
                {/* Header: Number, Marks, and Status */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-600">
                      {idx + 1}
                    </span>
                    <h3 className="text-sm sm:text-base font-semibold text-slate-900 leading-snug">
                      <MathRenderer text={ans.question.text} />
                    </h3>
                  </div>

                  <div className="shrink-0">
                    {isTheory ? (
                      <span className="inline-flex items-center rounded-lg bg-blue-50 border border-blue-200/80 px-2.5 py-1 text-xs font-semibold text-blue-800">
                        Theory · {ans.marksObtained}/{ans.question.marks}
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold",
                          ans.isCorrect
                            ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                            : "bg-rose-50 border border-rose-200 text-rose-800",
                        )}
                      >
                        {ans.isCorrect ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <XCircle className="h-3.5 w-3.5 text-rose-600" />}
                        {ans.isCorrect ? "Correct" : "Incorrect"} ({ans.marksObtained}/{ans.question.marks})
                      </span>
                    )}
                  </div>
                </div>

                {/* Reading Passage (if applicable) */}
                {ans.question.passage && (
                  <div className="mb-4 rounded-xl border border-amber-200/70 bg-amber-50/50 p-4">
                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-800 mb-1.5">
                      <BookOpen className="h-3.5 w-3.5" />
                      Reading Passage
                    </span>
                    <div className="max-h-40 overflow-y-auto text-xs text-slate-700 leading-relaxed">
                      <MathRenderer text={ans.question.passage} />
                    </div>
                  </div>
                )}

                {/* Question Image (if applicable) */}
                {ans.question.imageUrl && (
                  <div className="mb-4 flex justify-center">
                    <img
                      src={`${CBT_BACKEND_URL}${ans.question.imageUrl}`}
                      alt="Question illustration"
                      className="max-h-48 rounded-xl border border-slate-200 bg-slate-50 p-2 object-contain"
                    />
                  </div>
                )}

                {/* Theory: Student response + Teacher grading */}
                {isTheory && (
                  <div className="space-y-3 mb-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                      <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Your Written Answer
                      </span>
                      {ans.textAnswer ? (
                        <p className="whitespace-pre-wrap text-sm text-slate-800 leading-relaxed">{ans.textAnswer}</p>
                      ) : (
                        <p className="text-sm italic text-slate-400">No answer submitted.</p>
                      )}
                    </div>

                    {ans.markerComment && (
                      <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
                        <span className="block text-xs font-semibold text-blue-800 uppercase tracking-wider mb-1">
                          Teacher Feedback
                        </span>
                        <p className="text-sm text-slate-800 leading-relaxed">{ans.markerComment}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Objective choices breakdown */}
                {!isTheory && (
                  <div className="space-y-2 mb-4">
                    {ans.question.options.map((opt, optIdx) => {
                      const isCorrectChoice = optIdx === ans.question.correctAnswer;
                      const isStudentWrongChoice = optIdx === ans.selectedOption && !ans.isCorrect;

                      return (
                        <div
                          key={optIdx}
                          className={cn(
                            "flex items-center justify-between gap-3 rounded-xl border p-3 text-xs sm:text-sm transition-colors",
                            isCorrectChoice
                              ? "border-emerald-300 bg-emerald-50/70 text-emerald-950 font-medium"
                              : isStudentWrongChoice
                              ? "border-rose-300 bg-rose-50/70 text-rose-950 font-medium"
                              : "border-slate-200 bg-white text-slate-700",
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span
                              className={cn(
                                "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                                isCorrectChoice
                                  ? "bg-emerald-200 text-emerald-900"
                                  : isStudentWrongChoice
                                  ? "bg-rose-200 text-rose-900"
                                  : "bg-slate-100 text-slate-600",
                              )}
                            >
                              {optionLabel(optIdx)}
                            </span>
                            <span className="leading-snug break-words">
                              <MathRenderer text={formatOption(opt)} />
                            </span>
                          </div>

                          {isCorrectChoice && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 shrink-0">
                              <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                              Correct Answer
                            </span>
                          )}

                          {isStudentWrongChoice && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-800 shrink-0">
                              <XCircle className="h-3 w-3 text-rose-700" />
                              Your Choice
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Unanswered alert */}
                {!isTheory && !ans.isCorrect && ans.selectedOption === null && (
                  <div className="mb-4 flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>This question was left unanswered and scored zero marks.</span>
                  </div>
                )}

                {/* Solution & Explanation */}
                {ans.question.explanation && (
                  <div className="rounded-xl border border-blue-150 bg-blue-50/70 p-4 text-xs sm:text-sm text-blue-950 leading-relaxed">
                    <span className="block text-xs font-bold uppercase tracking-wider text-blue-800 mb-1">
                      Explanation & Solution
                    </span>
                    <MathRenderer text={ans.question.explanation} />
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
