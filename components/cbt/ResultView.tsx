import React, { useState } from "react";
import { CheckCircle2, XCircle, AlertCircle, ShieldAlert } from "lucide-react";
import { MathRenderer } from "@/components/MathRenderer";

function formatOption(text: string): string {
  let t = text.trim();
  t = t.replace(/\.+$/, "");
  if (t.length > 0) t = t.charAt(0).toUpperCase() + t.slice(1);
  return t;
}

import { HCBT_BASE } from "@/lib/api";

const CBT_BACKEND_URL = HCBT_BASE;

interface AnswerCorrection {
  question: {
    id: string;
    text: string;
    options: string[];
    correctAnswer: number;
    explanation: string | null;
    marks: number;
    imageUrl?: string | null;
    passage?: string | null;
  };
  selectedOption: number | null;
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

export function ResultView({ result }: ResultViewProps) {
  const { score, totalMarks, percentage, timeTaken, exam, answers, cheatingStatus, tabSwitchCount } = result;
  const isCheating = cheatingStatus === "cheating";
  const passed = !isCheating && percentage >= exam.passMark;
  const labels = ["A", "B", "C", "D"];

  const [activeFilter, setActiveFilter] = useState<"all" | "passed" | "failed">("all");

  const passedCount = answers.filter((a) => a.isCorrect).length;
  const failedCount = answers.length - passedCount;

  const filteredAnswers = answers.filter((ans) => {
    if (activeFilter === "passed") return ans.isCorrect;
    if (activeFilter === "failed") return !ans.isCorrect;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {isCheating && (
        <div className="p-8 rounded-sm border border-rose-300 bg-rose-50/90 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl pointer-events-none bg-rose-400/20" />
          <div className="relative z-10 text-center">
            <div className="w-16 h-16 bg-rose-100 border border-rose-200 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3 bg-rose-100 text-rose-800">
              Cheating Detected
            </span>
            <h2 className="text-3xl font-extrabold mb-2 tracking-tight text-rose-900">Exam Disqualified</h2>
            <p className="text-sm font-medium mb-4 max-w-md mx-auto text-rose-700/80">
              This exam was auto-failed due to {tabSwitchCount || 3} proctoring violation{(tabSwitchCount || 3) > 1 ? "s" : ""}. 
              Multiple tab switches were detected during the examination.
            </p>
            <p className="text-xs font-bold text-rose-600 bg-rose-100/60 inline-block px-4 py-2 rounded-sm">
              Score: 0 / {totalMarks} (0%) — Result flagged as CHEATING
            </p>
          </div>
        </div>
      )}

      {!isCheating && (
        <div className={`p-8 rounded-sm border ${passed ? "bg-emerald-50/70 border-emerald-200" : "bg-rose-50/70 border-rose-200"} relative overflow-hidden shadow-sm`}>
          <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl pointer-events-none ${passed ? "bg-emerald-400/20" : "bg-rose-400/20"}`} />
          <div className="relative z-10 text-center">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3 ${
              passed ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
            }`}>
              {passed ? "Pass" : "Failed"}
            </span>
            <h2 className={`text-3xl font-extrabold mb-2 tracking-tight ${passed ? "text-emerald-900" : "text-rose-900"}`}>
              {passed ? "Congratulations! You Passed" : "Keep Practicing!"}
            </h2>
            <p className={`text-sm font-medium mb-8 max-w-md mx-auto ${passed ? "text-emerald-700/80" : "text-rose-700/80"}`}>
              You completed {exam.title} with a final score of <strong className="text-base">{percentage}%</strong>.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              <div className="bg-white p-4 rounded-sm shadow-sm border border-slate-100 flex flex-col justify-center">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Total Score</p>
                <p className="text-xl font-black text-slate-800">{score} / {totalMarks}</p>
              </div>
              <div className="bg-white p-4 rounded-sm shadow-sm border border-slate-100 flex flex-col justify-center">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Time Taken</p>
                <p className="text-xl font-black text-slate-800">{Math.floor(timeTaken / 60)}m {timeTaken % 60}s</p>
              </div>
              <div className="bg-white p-4 rounded-sm shadow-sm border border-slate-100 flex flex-col justify-center">
                <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Correct
                </p>
                <p className="text-xl font-black text-emerald-700">{passedCount}</p>
              </div>
              <div className="bg-white p-4 rounded-sm shadow-sm border border-slate-100 flex flex-col justify-center">
                <p className="text-xs text-rose-600 font-bold uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                  <XCircle className="w-3 h-3" /> Incorrect
                </p>
                <p className="text-xl font-black text-rose-700">{failedCount}</p>
              </div>
            </div>
            {cheatingStatus && cheatingStatus !== "none" && !isCheating && (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-sm p-3 inline-flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-medium text-amber-800">
                  {tabSwitchCount} proctoring warning{(tabSwitchCount || 0) > 1 ? "s" : ""} recorded
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dynamic Tabs & Filters Bar */}
      <div className="bg-white p-4 rounded-sm border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-extrabold text-slate-850 tracking-tight">Review Corrections Sheet</h3>
          <p className="text-xs text-slate-500 font-medium">Analyze your answers and read detailed explanations below.</p>
        </div>

        {/* Filters Button Group */}
        <div className="flex bg-slate-100 p-1 rounded-sm w-full sm:w-auto">
          <button
            onClick={() => setActiveFilter("all")}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-sm text-xs font-bold transition-all ${
              activeFilter === "all"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            All ({answers.length})
          </button>
          
          <button
            onClick={() => setActiveFilter("passed")}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-sm text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeFilter === "passed"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-emerald-600/80 hover:text-emerald-700 hover:bg-emerald-50/50"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
            <span>Passed ({passedCount})</span>
          </button>
          
          <button
            onClick={() => setActiveFilter("failed")}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-sm text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeFilter === "failed"
                ? "bg-rose-600 text-white shadow-sm"
                : "text-rose-600/80 hover:text-rose-700 hover:bg-rose-50/50"
            }`}
          >
            <XCircle className="w-3.5 h-3.5 text-white" />
            <span>Failed ({failedCount})</span>
          </button>
        </div>
      </div>

      {/* Corrections List */}
      <div className="space-y-6">
        {filteredAnswers.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-sm p-12 text-center shadow-sm">
            <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-semibold text-sm">No questions match this filter.</p>
            <button
              onClick={() => setActiveFilter("all")}
              className="mt-2 text-xs font-bold text-blue-600 hover:text-blue-700"
            >
              Reset to view all questions
            </button>
          </div>
        ) : (
          filteredAnswers.map((ans, idx) => (
            <div
              key={ans.question.id}
              className={`bg-white p-6 rounded-sm border transition-all shadow-sm ${
                ans.isCorrect ? "border-slate-200 hover:border-emerald-200" : "border-rose-100 hover:border-rose-200"
              }`}
            >
              <div className="flex justify-between items-start gap-3 mb-5">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <span className="text-slate-500 font-mono text-sm font-bold shrink-0 mt-0.5">Q-{idx + 1}.</span>
                  <h4 className="text-sm sm:text-base font-bold text-slate-800 leading-snug">
                    <MathRenderer text={ans.question.text} />
                  </h4>
                </div>
                
                <span className={`px-2.5 py-1 rounded-sm text-xs font-bold shrink-0 whitespace-nowrap ${
                  ans.isCorrect ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100"
                }`}>
                  {ans.isCorrect ? "Correct" : "Incorrect"} • {ans.marksObtained}/{ans.question.marks}
                </span>
              </div>

              {/* Reading Passage */}
              {ans.question.passage && (
                <div className="bg-amber-50/60 border border-amber-200/50 p-4 rounded-sm max-h-36 overflow-y-auto mb-5">
                  <span className="text-xs font-extrabold text-amber-600 uppercase tracking-widest block mb-1.5">📖 Reading Passage</span>
                  <div className="text-xs text-slate-700 leading-relaxed">
                    <MathRenderer text={ans.question.passage} />
                  </div>
                </div>
              )}

              {/* Diagram / Image */}
              {ans.question.imageUrl && (
                <div className="flex justify-center mb-5">
                  <img
                    src={`${CBT_BACKEND_URL}${ans.question.imageUrl}`}
                    alt="Question diagram"
                    className="max-h-44 object-contain rounded-sm border border-slate-200 bg-white p-2 shadow-sm"
                  />
                </div>
              )}

              {/* Choices Breakdown */}
              <div className="space-y-2.5 mb-5">
                {ans.question.options.map((opt, optIdx) => {
                  let containerClass = "bg-white border-slate-200 hover:bg-slate-50 text-slate-700";
                  let badge = null;

                  if (optIdx === ans.question.correctAnswer) {
                    containerClass = "bg-emerald-50/80 border-emerald-300 text-emerald-900 font-medium";
                  } else if (optIdx === ans.selectedOption && !ans.isCorrect) {
                    containerClass = "bg-rose-50/80 border-rose-300 text-rose-900 font-medium";
                    badge = (
                      <span className="flex items-center gap-1 text-xs font-extrabold uppercase text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-sm whitespace-nowrap">
                        <XCircle className="w-3 h-3 text-rose-600" /> Your Answer
                      </span>
                    );
                  }

                  return (
                    <div
                      key={optIdx}
                      className={`p-3.5 rounded-sm border flex items-center justify-between gap-2 transition-all text-xs sm:text-sm ${containerClass}`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="w-6 h-6 rounded-sm bg-white shadow-sm border border-slate-100 flex items-center justify-center font-bold text-xs text-slate-500 shrink-0">
                          {labels[optIdx]}
                        </span>
                        <span className="leading-snug"><MathRenderer text={formatOption(opt)} /></span>
                      </div>
                      {badge}
                    </div>
                  );
                })}
              </div>

              {/* Unanswered Banner */}
              {!ans.isCorrect && ans.selectedOption === null && (
                <div className="bg-rose-50/30 border border-rose-100 rounded-sm p-3 text-left mb-5 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <p className="text-xs font-bold text-rose-600">
                    You did not select an answer for this question. It was automatically marked as zero points.
                  </p>
                </div>
              )}

              {/* Premium Explanation Drawer */}
              {ans.question.explanation && (
                <div className="bg-blue-50/65 p-4 rounded-sm border border-blue-100/80 text-blue-900 text-xs sm:text-sm leading-relaxed shadow-inner">
                  <strong className="block mb-1 text-xs text-blue-800 font-black uppercase tracking-wider">
                    Explanation & Solution Guide:
                  </strong>
                  <MathRenderer text={ans.question.explanation} />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
