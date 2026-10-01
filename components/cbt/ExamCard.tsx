"use client";

import React from "react";
import { Clock, FileText, PlayCircle, ArrowRight, Loader2, CheckCircle2, Target, Hourglass, Key, Laptop } from "lucide-react";
import { useExamDeviceStatus } from "@/hooks/useExamDevice";

export interface AssignedExam {
  id: string;
  title: string;
  description: string | null;
  duration: number;
  totalQuestions: number;
  passMark: number;
  startDate?: string | null;
  endDate?: string | null;
  ssceBoard?: string | null;
  ssceYear?: number | null;
  passkeyRequired?: boolean;
  myResult: {
    examId: string;
    status: string;
    percentage: number | null;
    score: number | null;
    resultsReleased?: boolean;
  } | null;
}

interface ExamCardProps {
  exam: AssignedExam;
  startingExamId: string | null;
  onInitiateStart: (exam: AssignedExam) => void;
  onViewResult: (examId: string) => void;
}

export function ExamCard({
  exam,
  startingExamId,
  onInitiateStart,
  onViewResult,
}: ExamCardProps) {
  const isStarted = exam.myResult?.status === "started";
  const isSubmitted = exam.myResult?.status === "submitted" || exam.myResult?.status === "graded";
  const isPending = isSubmitted && exam.myResult?.resultsReleased === false;
  const isStarting = startingExamId === exam.id;
  // Phones can see the exam but not start it; the button says so instead of looking broken.
  const onPhone = useExamDeviceStatus() === "blocked";
  const examType = exam.ssceBoard
    ? `${exam.ssceBoard.toUpperCase()} ${exam.ssceYear ? `(${exam.ssceYear})` : ""}`
    : null;

  return (
    <div className={`group relative rounded-sm border border-slate-200/70 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden ${
      isPending ? "bg-amber-50/20" : isSubmitted ? "bg-green-50/20" : "bg-white"
    }`}>
      <div className="p-5 flex flex-col flex-1">
        {/* Top row: type tag + status */}
        <div className="flex items-start justify-between mb-3 gap-2">
          <span className={`inline-flex items-center text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border ${
            examType
              ? "bg-indigo-50 text-indigo-700 border-indigo-100"
              : "bg-blue-50 text-blue-700 border-blue-100"
          }`}>
            {examType || "Class Assessment"}
          </span>

          {isPending ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
              <Hourglass className="w-3 h-3" />
              Pending Review
            </span>
          ) : isSubmitted ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-100">
              <CheckCircle2 className="w-3 h-3" />
              Completed
            </span>
          ) : null}
          {isStarted && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-100 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              In Progress
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-bold text-slate-800 text-sm leading-snug group-hover:text-blue-700 transition-colors duration-200 capitalize">
          {exam.title}
        </h3>

        {/* Description */}
        {exam.description && (
          <p className="text-slate-500 text-xs mt-1.5 line-clamp-2 leading-relaxed">
            {exam.description}
          </p>
        )}

        {/* Pending review notice — school exam submitted but not yet released */}
        {isPending && (
          <div className="mt-3 flex items-center gap-3 rounded-sm px-3.5 py-2.5 bg-amber-50/60 border border-amber-100">
            <Hourglass className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-xs font-semibold text-amber-800 leading-snug">
              Submitted — your teacher hasn't released the results yet.
            </p>
          </div>
        )}

        {/* Score display for completed exams */}
        {isSubmitted && !isPending && exam.myResult && (() => {
          const percentage = exam.myResult.percentage ?? 0;
          const score = exam.myResult.score ?? 0;
          return (
          <div className="mt-3 flex items-center gap-3 rounded-sm px-3.5 py-2.5">
            <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
              <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#d1d5db" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.5" fill="none"
                  stroke={percentage >= 50 ? "#12B76A" : "#F04438"}
                  strokeWidth="3"
                  strokeDasharray={`${(percentage / 100) * 97.4} 97.4`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-xs font-extrabold text-slate-700">
                {Math.round(percentage)}%
              </span>
            </div>
            <div className="flex-1 min-w-0 leading-none">
              <p className="text-xs font-bold text-slate-700">
                {percentage >= exam.passMark ? "Passed" : "Needs Improvement"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {score}/{exam.totalQuestions} correct
              </p>
            </div>
          </div>
          );
        })()}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom row: metadata + action */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 text-xs font-semibold text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {exam.duration} min
            </span>
            <span className="inline-flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              {exam.totalQuestions} Qs
            </span>
            {exam.passMark > 0 && (
              <span className="inline-flex items-center gap-1" title={`Pass mark: ${exam.passMark}%`}>
                <Target className="w-3.5 h-3.5 text-slate-400" />
                {exam.passMark}%
              </span>
            )}
            {exam.passkeyRequired && !isSubmitted && (
              <span className="inline-flex items-center gap-1 text-[#8a5c10]" title="Ask your teacher for the passkey to start this exam">
                <Key className="w-3.5 h-3.5" />
                Passkey required
              </span>
            )}
          </div>

          {isPending ? (
            <button
              onClick={() => onViewResult(exam.id)}
              className="inline-flex items-center justify-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-4 py-2.5 rounded-sm transition-colors w-full sm:w-auto min-h-[48px] sm:min-h-[44px]"
            >
              <span>View Status</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          ) : isSubmitted ? (
            <button
              onClick={() => onViewResult(exam.id)}
              className="inline-flex items-center justify-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-4 py-2.5 rounded-sm transition-colors w-full sm:w-auto min-h-[48px] sm:min-h-[44px]"
            >
              <span>View Score</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          ) : onPhone ? (
            // Phones can't sit exams (the list's banner says why): a plain note, not a button that only says no.
            <p className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-sm bg-slate-50 px-4 text-sm font-medium text-slate-600 sm:w-auto">
              <Laptop className="h-4 w-4 text-blue-600" aria-hidden="true" />
              {isStarted ? "Resume" : "Start"} on a computer or tablet
            </p>
          ) : (
            <button
              disabled={isStarting}
              onClick={() => onInitiateStart(exam)}
              className={`inline-flex items-center justify-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-sm transition-all duration-200 w-full sm:w-auto min-h-[48px] sm:pointer-fine:min-h-0 ${
                isStarting
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-sm"
                  : isStarted
                  ? "bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-500/10 active:scale-95"
                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/10 active:scale-95"
              }`}
            >
              {isStarting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Starting...</span>
                </>
              ) : isStarted ? (
                <>
                  <PlayCircle className="w-3.5 h-3.5" />
                  <span>Resume</span>
                </>
              ) : (
                <>
                  <PlayCircle className="w-3.5 h-3.5" />
                  <span>Start</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
