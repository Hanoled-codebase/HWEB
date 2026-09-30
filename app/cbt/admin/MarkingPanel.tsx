"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, PenLine } from "lucide-react";
import { toast } from "sonner";
import { cbtApi, type MarkingSheet } from "@/lib/api-cbt";
import { MathRenderer } from "@/components/MathRenderer";

type Script = MarkingSheet["questions"][number]["scripts"][number];

/**
 * Marking theory answers, one question across every script (the usual way to
 * mark fairly). Each save updates that student's score straight away; results
 * can't be released until nothing is left to mark. Renders nothing for an
 * exam without theory questions.
 */
export default function MarkingPanel({
  examId,
  locked,
  onMarked,
}: {
  examId: string;
  /** Results are released: marks can't change until the release is withdrawn. */
  locked: boolean;
  onMarked: () => void;
}) {
  const [sheet, setSheet] = useState<MarkingSheet | null>(null);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let cancelled = false;
    cbtApi
      .getMarkingSheet(examId)
      .then((data) => !cancelled && setSheet(data))
      .catch(() => !cancelled && setSheet({ questions: [], awaitingMarking: 0 }));
    return () => {
      cancelled = true;
    };
  }, [examId]);

  if (!sheet || sheet.questions.length === 0) return null;
  const question = sheet.questions[Math.min(current, sheet.questions.length - 1)];

  const saved = (resultId: string, marks: number, comment: string | null) => {
    setSheet((prev) => {
      if (!prev) return prev;
      let newlyMarked = 0;
      const questions = prev.questions.map((q) => {
        if (q.questionId !== question.questionId) return q;
        const scripts = q.scripts.map((script) => {
          if (script.resultId !== resultId) return script;
          if (!script.marked) newlyMarked = 1;
          return { ...script, marks, comment, marked: true };
        });
        return { ...q, scripts, awaitingMarking: q.awaitingMarking - newlyMarked };
      });
      return { questions, awaitingMarking: prev.awaitingMarking - newlyMarked };
    });
    onMarked();
  };

  return (
    <section className="mb-6 rounded-xl border border-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-bold text-[#0B1220]">
          <PenLine className="h-4 w-4 text-[#1447E6]" /> Theory answers
        </p>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            sheet.awaitingMarking > 0 ? "bg-[#F5A623]/15 text-[#0B1220]" : "bg-[#12B76A]/15 text-[#0B1220]"
          }`}
        >
          {sheet.awaitingMarking > 0 ? `${sheet.awaitingMarking} to mark` : "All marked"}
        </span>
      </div>

      {sheet.questions.length > 1 && (
        <div className="flex flex-wrap gap-1.5 px-4 pt-3" role="tablist" aria-label="Theory questions">
          {sheet.questions.map((q, index) => (
            <button
              key={q.questionId}
              type="button"
              role="tab"
              aria-selected={index === current}
              onClick={() => setCurrent(index)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                index === current ? "bg-[#1447E6] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Question {index + 1}
              {q.awaitingMarking > 0 && ` · ${q.awaitingMarking}`}
            </button>
          ))}
        </div>
      )}

      <div className="px-4 py-3">
        <p className="text-sm text-[#0B1220]">
          <MathRenderer text={question.text} />
          <span className="ml-1 text-xs text-slate-500">({question.marks} {question.marks === 1 ? "mark" : "marks"})</span>
        </p>
        {question.markingGuide && (
          <p className="mt-2 rounded-lg bg-[#1447E6]/5 p-2.5 text-xs text-[#0B1220]">
            <strong>Marking guide:</strong> {question.markingGuide}
          </p>
        )}
        {locked && (
          <p className="mt-2 text-xs text-slate-500">Results are released, so marks are fixed. Withdraw the release to change them.</p>
        )}

        {question.scripts.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Nobody has answered this question yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {question.scripts.map((script) => (
              <ScriptRow
                key={script.resultId}
                examId={examId}
                questionId={question.questionId}
                maxMarks={question.marks}
                script={script}
                locked={locked}
                onSaved={saved}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function ScriptRow({
  examId,
  questionId,
  maxMarks,
  script,
  locked,
  onSaved,
}: {
  examId: string;
  questionId: string;
  maxMarks: number;
  script: Script;
  locked: boolean;
  onSaved: (resultId: string, marks: number, comment: string | null) => void;
}) {
  const [marks, setMarks] = useState(script.marked ? String(script.marks) : "");
  const [comment, setComment] = useState(script.comment || "");
  const [saving, setSaving] = useState(false);

  if (!script.textAnswer) {
    return (
      <li className="rounded-lg border border-slate-100 p-3 text-xs text-slate-500">
        <span className="font-semibold text-[#0B1220]">{script.studentName}</span> left this blank (0 marks).
      </li>
    );
  }

  const value = Number(marks);
  const valid = marks.trim() !== "" && Number.isFinite(value) && value >= 0 && value <= maxMarks && Number.isInteger(value * 2);
  const unchanged = script.marked && value === script.marks && (comment.trim() || null) === (script.comment || null);

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      await cbtApi.markAnswer(examId, script.resultId, questionId, { marks: value, comment: comment.trim() || null });
      onSaved(script.resultId, value, comment.trim() || null);
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "Couldn't save that mark. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="rounded-lg border border-slate-200 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-[#0B1220]">
          {script.studentName}
          {script.admissionNumber && <span className="ml-1.5 font-mono font-normal text-slate-500">{script.admissionNumber}</span>}
        </p>
        {script.marked && (
          <span className="flex items-center gap-1 text-xs font-semibold text-[#12B76A]">
            <Check className="h-3.5 w-3.5" /> {script.marks}/{maxMarks}
          </span>
        )}
      </div>
      <p className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-2.5 text-sm leading-relaxed text-[#0B1220]">{script.textAnswer}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-slate-600">
          Marks
          <input
            type="number"
            inputMode="decimal"
            min={0}
            max={maxMarks}
            step={0.5}
            value={marks}
            disabled={locked}
            onChange={(event) => setMarks(event.target.value)}
            className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-sm text-[#0B1220] disabled:bg-slate-50"
            aria-label={`Marks for ${script.studentName}, out of ${maxMarks}`}
          />
          <span>/ {maxMarks}</span>
        </label>
        <input
          type="text"
          value={comment}
          disabled={locked}
          maxLength={1000}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Comment for the student (optional)"
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-[#0B1220] disabled:bg-slate-50"
        />
        <button
          type="button"
          onClick={save}
          disabled={locked || !valid || saving || unchanged}
          className="inline-flex items-center gap-1 rounded-lg bg-[#1447E6] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1447E6]/90 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-3 w-3 animate-spin" />}
          {script.marked ? "Update" : "Save mark"}
        </button>
      </div>
    </li>
  );
}
