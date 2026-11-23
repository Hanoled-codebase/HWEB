"use client";

import React, { useMemo } from "react";
import {
  buildSubjectMatrix,
  formatOrdinalRank,
  type StudentOverviewRow,
} from "@/lib/results-overview";
import { cn } from "@/lib/utils";

export interface SubjectPerformanceMatrixProps {
  rows: StudentOverviewRow[];
  onSelectStudent: (studentId: string) => void;
}

function getScoreBadgeClasses(score: number | null): string {
  if (score === null) return "text-slate-400";
  if (score >= 75) return "bg-emerald-50 text-emerald-800 font-bold";
  if (score >= 50) return "bg-slate-100 text-slate-800 font-semibold";
  return "bg-rose-50 text-rose-700 font-semibold";
}

export function SubjectPerformanceMatrix({
  rows,
  onSelectStudent,
}: SubjectPerformanceMatrixProps) {
  const matrix = useMemo(() => buildSubjectMatrix(rows), [rows]);

  if (rows.length === 0 || matrix.subjects.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-2xs">
        No recorded subject scores available to build the subject performance
        matrix.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
      <div
        role="region"
        aria-labelledby="subject-matrix-caption"
        tabIndex={0}
        className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      >
        <table className="w-full border-collapse text-left text-xs">
          <caption id="subject-matrix-caption" className="sr-only">
            Subject performance matrix across learners and subjects
          </caption>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
              <th
                scope="col"
                className="sticky left-0 z-10 min-w-[200px] border-r border-slate-200 bg-slate-50 px-4 py-3"
              >
                Learner
              </th>
              {matrix.subjects.map((subject) => (
                <th
                  key={subject.key}
                  scope="col"
                  className="min-w-[110px] px-3 py-3 text-center"
                >
                  <span className="line-clamp-2">{subject.name}</span>
                </th>
              ))}
              <th scope="col" className="min-w-[90px] px-3 py-3 text-right">
                Average
              </th>
              <th scope="col" className="min-w-[75px] px-3 py-3 text-right">
                Rank
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {matrix.rows.map((matrixRow) => {
              const row = matrixRow.overview;
              return (
                <tr
                  key={row.studentId}
                  className="transition-colors hover:bg-slate-50/80"
                >
                  <th
                    scope="row"
                    className="sticky left-0 z-10 border-r border-slate-100 bg-white px-4 py-2.5 font-normal"
                  >
                    <button
                      type="button"
                      onClick={() => onSelectStudent(row.studentId)}
                      className="group rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                    >
                      <p className="font-semibold text-slate-900 group-hover:text-[var(--primary-text)] group-hover:underline">
                        {row.fullName}
                      </p>
                      <p className="text-[11px] text-slate-500 tabular-nums">
                        {row.admissionNumber}
                      </p>
                    </button>
                  </th>
                  {matrix.subjects.map((subject) => {
                    const score =
                      matrixRow.scoresBySubjectKey.get(subject.key) ?? null;
                    return (
                      <td
                        key={subject.key}
                        className="px-3 py-2.5 text-center tabular-nums"
                      >
                        <span
                          className={cn(
                            "inline-flex min-w-[48px] items-center justify-center rounded-md px-2 py-0.5 text-xs",
                            getScoreBadgeClasses(score),
                          )}
                        >
                          {typeof score === "number"
                            ? `${score.toFixed(1)}%`
                            : "—"}
                        </span>
                      </td>
                    );
                  })}
                  <td className="px-3 py-2.5 text-right font-bold text-slate-900 tabular-nums">
                    {typeof row.averageScore === "number"
                      ? `${row.averageScore.toFixed(1)}%`
                      : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold text-slate-700 tabular-nums">
                    {formatOrdinalRank(row.classRank)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 bg-[var(--primary-light)]/50 text-xs font-bold text-slate-900">
              <th
                scope="row"
                className="sticky left-0 z-10 border-r border-slate-200 bg-[var(--primary-light)] px-4 py-3 text-left text-[var(--primary-text)]"
              >
                Subject Average
              </th>
              {matrix.subjects.map((subject) => {
                const avg = matrix.subjectAverages.get(subject.key) ?? null;
                return (
                  <td
                    key={subject.key}
                    className="px-3 py-3 text-center text-[var(--primary-text)] tabular-nums"
                  >
                    {typeof avg === "number" ? `${avg.toFixed(1)}%` : "—"}
                  </td>
                );
              })}
              <td colSpan={2} className="px-3 py-3 text-right text-slate-500">
                Click any learner to view full result
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
