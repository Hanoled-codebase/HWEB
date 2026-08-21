import React from "react";
import type { Question } from "@/store/exam";
import { MathRenderer } from "@/components/MathRenderer";

interface QuestionCardProps {
  question: Question;
  index: number;
  selectedOptionIndex: number | null;
  onSelectOption: (optionIndex: number) => void;
  totalQuestions: number;
}

const CBT_BACKEND_URL = process.env.NEXT_PUBLIC_CBT_API_URL?.replace(/\/api$/, "") || "http://localhost:4002";

export function QuestionCard({
  question,
  index,
  selectedOptionIndex,
  onSelectOption,
  totalQuestions,
}: QuestionCardProps) {
  const labels = ["A", "B", "C", "D"];

  return (
    <div className="bg-slate-800/80 p-7 rounded-3xl border border-slate-700/50 shadow-sm space-y-8">
      {/* Question Progress + Mark Badge */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm">
          <span className="text-blue-400 font-bold">{String(index + 1).padStart(2, "0")}</span>
          <span className="text-slate-500 mx-0.5">/</span>
          <span className="text-slate-500">{String(totalQuestions).padStart(2, "0")}</span>
        </span>
        <span className="text-[10px] font-extrabold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full uppercase tracking-wider shrink-0">
          {question.marks} {question.marks > 1 ? "MARKS" : "MARK"}
        </span>
      </div>

      {/* Question Prompt */}
      <p className="text-base font-bold text-slate-100 leading-relaxed">
        <MathRenderer text={question.text} />
      </p>

      {/* Reading Passage */}
      {question.passage && (
        <div className="bg-amber-500/5 border border-amber-500/15 p-4 rounded-xl max-h-48 overflow-y-auto">
          <span className="text-[9px] font-extrabold text-amber-400 uppercase tracking-widest block mb-2">
            Reading Passage
          </span>
          <div className="text-sm text-slate-300 leading-relaxed">
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

      {/* Answer Options */}
      <div className="space-y-3">
        {question.options.map((option, optIdx) => {
          const isSelected = selectedOptionIndex === optIdx;

          return (
            <label
              key={optIdx}
              className={`flex items-center gap-3 p-4 sm:p-5 rounded-2xl cursor-pointer transition-all border ${
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
                onChange={() => onSelectOption(optIdx)}
              />
              {/* Hollow circle (unselected) or filled circle (selected) */}
              <span className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                isSelected ? "border-blue-500" : "border-slate-500"
              }`}>
                {isSelected && <span className="w-2 h-2 rounded-full bg-blue-500" />}
              </span>

              {/* Letter badge */}
              <span className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-extrabold shrink-0 ${
                isSelected
                  ? "bg-blue-500 text-white"
                  : "bg-slate-700 text-slate-300"
              }`}>
                {labels[optIdx]}
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
