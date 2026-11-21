import React from "react";
import type { AnswerValue, Question } from "@/store/exam";
import { MathRenderer } from "@/components/MathRenderer";

interface QuestionCardProps {
  question: Question;
  index: number;
  /** The chosen option index, or typed text for a theory question. */
  value: AnswerValue;
  onAnswer: (value: number | string) => void;
  totalQuestions: number;
}

// Matches HCBT's limit on a typed answer (validators/cbt.js MAX_TEXT_ANSWER).
const MAX_TEXT_ANSWER = 10000;

import { HCBT_BASE } from "@/lib/api";
import { optionLabel } from "@/lib/cbt-options";

const CBT_BACKEND_URL = HCBT_BASE;

export function QuestionCard({
  question,
  index,
  value,
  onAnswer,
  totalQuestions,
}: QuestionCardProps) {
  const selectedOptionIndex = typeof value === "number" ? value : null;
  const isTheory = question.type === "theory";

  return (
    <div className="bg-slate-800/80 p-5 sm:p-7 rounded-2xl border border-slate-700/50 shadow-sm space-y-6 sm:space-y-8">
      {/* Question Progress + Mark Badge */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm">
          <span className="text-blue-400 font-bold">{String(index + 1).padStart(2, "0")}</span>
          <span className="text-slate-400 mx-0.5">/</span>
          <span className="text-slate-400">{String(totalQuestions).padStart(2, "0")}</span>
        </span>
        <span className="text-xs font-bold text-blue-300 bg-blue-500/15 px-3 py-1 rounded-full uppercase tracking-wider shrink-0">
          {question.marks} {question.marks > 1 ? "MARKS" : "MARK"}
        </span>
      </div>

      {/* Question Prompt */}
      <p className="text-base font-bold text-slate-100 leading-relaxed">
        <MathRenderer text={question.text} />
      </p>

      {/* Reading Passage */}
      {question.passage && (
        <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl max-h-48 overflow-y-auto">
          <span className="text-xs font-bold text-amber-300 uppercase tracking-wider block mb-2">
            Reading Passage
          </span>
          <div className="text-sm text-slate-200 leading-relaxed">
            <MathRenderer text={question.passage} />
          </div>
        </div>
      )}

      {/* Diagram / Image */}
      {question.imageUrl && (
        <div className="flex justify-center">
          <img
            src={`${CBT_BACKEND_URL}${question.imageUrl}`}
            alt="Question diagram"
            className="max-h-56 object-contain rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-sm"
          />
        </div>
      )}

      {/* Theory: a typed answer, marked by a teacher */}
      {isTheory && (
        <div className="space-y-2">
          <label htmlFor={`answer-${question.id}`} className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Your answer
          </label>
          <textarea
            id={`answer-${question.id}`}
            value={typeof value === "string" ? value : ""}
            onChange={(event) => onAnswer(event.target.value)}
            maxLength={MAX_TEXT_ANSWER}
            rows={10}
            spellCheck={false}
            placeholder="Type your answer here. Your teacher will mark it."
            className="w-full resize-y rounded-xl border border-slate-600/40 bg-slate-900/60 p-4 text-sm leading-relaxed text-slate-100 placeholder:text-slate-400 focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/30 select-text"
          />
          <p className="text-right text-xs text-slate-400 tabular-nums">
            {(typeof value === "string" ? value.length : 0).toLocaleString()} / {MAX_TEXT_ANSWER.toLocaleString()} characters
          </p>
        </div>
      )}

      {/* Answer Options */}
      <div className={isTheory ? "hidden" : "space-y-3"}>
        {question.options.map((option, optIdx) => {
          const isSelected = selectedOptionIndex === optIdx;

          return (
            <label
              key={optIdx}
              className={`flex min-h-14 items-center gap-3 p-4 sm:p-5 rounded-xl cursor-pointer transition-all border ${
                 isSelected
                   ? "bg-blue-500/10 border-blue-500/40"
                   : "bg-slate-800/60 border-slate-600/30 hover:bg-slate-700/50 hover:border-slate-500/40"
               }`}
            >
              <input
                type="radio"
                name={`question-${question.id}`}
                className="sr-only"
                checked={isSelected}
                onChange={() => onAnswer(optIdx)}
              />
              {/* Hollow circle (unselected) or filled circle (selected) */}
              <span className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                isSelected ? "border-blue-500" : "border-slate-500"
              }`}>
                {isSelected && <span className="w-2 h-2 rounded-full bg-blue-500" />}
              </span>

              {/* Letter badge */}
              <span className={`w-7 h-7 rounded-sm flex items-center justify-center text-xs font-extrabold shrink-0 ${
                isSelected
                  ? "bg-blue-500 text-white"
                  : "bg-slate-700 text-slate-300"
              }`}>
                {optionLabel(optIdx)}
              </span>

              {/* Option text */}
              <span className={`text-sm leading-snug ${isSelected ? "text-slate-100" : "text-slate-300"}`}>
                <MathRenderer text={option} />
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
