"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  GraduationCap,
  Users,
} from "lucide-react";
import {
  formatEditionTitle,
  groupEditionsByYear,
  type EditionChildSummary,
  type ResultEdition,
} from "@/lib/results-overview";
import { cn } from "@/lib/utils";

export interface ResultEditionsCatalogProps {
  variant: "staff" | "family";
  editions: ResultEdition[];
  isLoading?: boolean;
  onSelectEdition: (edition: ResultEdition) => void;
  childrenList?: EditionChildSummary[];
  selectedChildId?: string;
  onSelectChild?: (studentId: string) => void;
  transcriptHref?: string;
  emptyTitle?: string;
  emptyMessage?: string;
}

export function ResultEditionsCatalog({
  variant,
  editions,
  isLoading = false,
  onSelectEdition,
  childrenList = [],
  selectedChildId,
  onSelectChild,
  transcriptHref,
  emptyTitle = "No result editions available yet",
  emptyMessage = "Published or recorded academic results will appear here grouped by session and term.",
}: ResultEditionsCatalogProps) {
  const yearGroups = useMemo(() => groupEditionsByYear(editions), [editions]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((idx) => (
          <div
            key={idx}
            className="h-44 animate-pulse rounded-2xl border border-slate-200 bg-white p-5"
          >
            <div className="h-4 w-24 rounded bg-slate-200" />
            <div className="mt-4 h-6 w-3/4 rounded bg-slate-200" />
            <div className="mt-3 h-3 w-1/2 rounded bg-slate-100" />
            <div className="mt-8 h-9 w-full rounded-xl bg-slate-100" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {(childrenList.length > 0 || transcriptHref) && (
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
          {childrenList.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Select Ward:
              </span>
              <div
                role="group"
                aria-label="Select ward"
                className="flex flex-wrap items-center gap-1.5"
              >
                {childrenList.map((child) => {
                  const isActive = child.id === selectedChildId;
                  const childName =
                    `${child.firstName} ${child.lastName}`.trim();
                  const className =
                    child.classLevel?.name || child.classLevel?.level || null;
                  return (
                    <button
                      key={child.id}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => onSelectChild?.(child.id)}
                      className="inline-flex min-h-11 md:pointer-fine:min-h-9 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-[var(--primary-border)] hover:bg-[var(--primary-light)] aria-pressed:border-[var(--primary)] aria-pressed:bg-[var(--primary)] aria-pressed:text-[var(--primary-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                    >
                      <GraduationCap
                        className="h-3.5 w-3.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span>{childName}</span>
                      {className && (
                        <span
                          className={cn(
                            "rounded-md px-1.5 py-0.5 text-[10px]",
                            isActive
                              ? "bg-white/20 text-[var(--primary-foreground)]"
                              : "bg-slate-200/70 text-slate-600",
                          )}
                        >
                          {className}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <BookOpen
                className="h-4 w-4 text-[var(--primary-text)]"
                aria-hidden="true"
              />
              <span>
                Select a result below to open your full academic report and
                print slip.
              </span>
            </div>
          )}

          {transcriptHref && (
            <Link
              href={transcriptHref}
              className="inline-flex min-h-11 md:pointer-fine:min-h-9 items-center justify-center gap-1.5 rounded-xl border border-[var(--primary-border)] bg-[var(--primary-light)] px-3.5 py-2 text-xs font-semibold text-[var(--primary-text)] transition-colors hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              <FileSpreadsheet
                className="h-3.5 w-3.5 shrink-0"
                aria-hidden="true"
              />
              <span>Academic Transcript</span>
            </Link>
          )}
        </div>
      )}

      {yearGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-light)] text-[var(--primary-text)]">
            <FileSpreadsheet className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-base font-bold text-slate-900">
            {emptyTitle}
          </h2>
          <p className="mt-1 max-w-md text-xs text-slate-600 sm:text-sm">
            {emptyMessage}
          </p>
        </div>
      ) : (
        yearGroups.map((group) => (
          <section key={group.academicYear} className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
              <div className="flex items-center gap-2">
                <Calendar
                  className="h-4 w-4 text-[var(--primary-text)]"
                  aria-hidden="true"
                />
                <h2 className="text-sm font-bold tracking-tight text-slate-900 sm:text-base">
                  {group.academicYear} Academic Session
                </h2>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 tabular-nums">
                {group.editions.length}{" "}
                {group.editions.length === 1 ? "Result" : "Results"}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.editions.map((edition) => {
                const title =
                  edition.title ||
                  formatEditionTitle(edition.academicTerm, edition.resultType);
                const isMidTerm = edition.resultType === "MID_TERM";
                const totalStudents = edition.totalStudents ?? 0;
                const recordedCount = edition.recordedCount ?? 0;
                const completionPct =
                  totalStudents > 0
                    ? Math.min(
                        100,
                        Math.round((recordedCount / totalStudents) * 100),
                      )
                    : 0;
                const childSubjectCount =
                  selectedChildId &&
                  edition.subjectCountsByStudent &&
                  typeof edition.subjectCountsByStudent[selectedChildId] ===
                    "number"
                    ? edition.subjectCountsByStudent[selectedChildId]
                    : edition.subjectCount;

                if (variant === "family") {
                  return (
                    <article
                      key={edition.key}
                      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:border-[var(--primary-border)] hover:shadow-md"
                    >
                      <div
                        className="h-1 w-full bg-[var(--primary)]"
                        aria-hidden="true"
                      />
                      <div className="flex flex-1 flex-col justify-between p-5">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                                isMidTerm
                                  ? "border border-amber-200 bg-amber-50 text-amber-800"
                                  : "border border-[var(--primary-border)] bg-[var(--primary-light)] text-[var(--primary-text)]",
                              )}
                            >
                              {isMidTerm
                                ? "Mid-term Report"
                                : "End-of-term Report"}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                              <CheckCircle2
                                className="h-3 w-3"
                                aria-hidden="true"
                              />
                              Available
                            </span>
                          </div>

                          <div>
                            <h3 className="text-base font-bold text-slate-900 group-hover:text-[var(--primary-text)]">
                              {title}
                            </h3>
                            <p className="mt-0.5 text-xs font-medium text-slate-500">
                              {edition.academicTerm} · {edition.academicYear}
                            </p>
                          </div>

                          {typeof childSubjectCount === "number" &&
                            childSubjectCount > 0 && (
                              <p className="text-xs font-medium text-slate-600 tabular-nums">
                                {childSubjectCount}{" "}
                                {childSubjectCount === 1
                                  ? "subject recorded"
                                  : "subjects recorded"}
                              </p>
                            )}
                        </div>

                        <div className="mt-5 border-t border-slate-100 pt-3">
                          <button
                            type="button"
                            onClick={() => onSelectEdition(edition)}
                            className="inline-flex min-h-11 md:pointer-fine:min-h-9 w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-[var(--primary-foreground)] shadow-2xs transition-colors hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                          >
                            <span>View {title}</span>
                            <ArrowRight
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                }

                // Staff (Admin / Owner / Class Teacher) catalog card
                const isPublished =
                  Boolean(edition.isPublished) || recordedCount > 0;
                const statusBadge = isPublished ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                    Published
                  </span>
                ) : (edition.incompleteCount ?? 0) > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--primary-border)] bg-[var(--primary-light)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--primary-text)]">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    In Progress
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                    Pending
                  </span>
                );

                return (
                  <article
                    key={edition.key}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:border-[var(--primary-border)] hover:shadow-md"
                  >
                    <div
                      className="h-1 w-full bg-[var(--primary)]"
                      aria-hidden="true"
                    />
                    <div className="flex flex-1 flex-col justify-between p-5">
                      <div className="space-y-3.5">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                              isMidTerm
                                ? "border border-amber-200 bg-amber-50 text-amber-800"
                                : "border border-slate-200 bg-slate-100 text-slate-700",
                            )}
                          >
                            {isMidTerm ? "Mid-term" : "End-of-term"}
                          </span>
                          {statusBadge}
                        </div>

                        <div>
                          <h3 className="text-base font-bold text-slate-900 group-hover:text-[var(--primary-text)]">
                            {title}
                          </h3>
                        </div>

                        <div className="space-y-1.5 rounded-xl bg-slate-50/90 p-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="inline-flex items-center gap-1.5 font-medium text-slate-600">
                              <Users
                                className="h-3.5 w-3.5 text-slate-400"
                                aria-hidden="true"
                              />
                              Learners Recorded
                            </span>
                            <span className="font-bold text-slate-900 tabular-nums">
                              {recordedCount} / {totalStudents} ({completionPct}
                              %)
                            </span>
                          </div>
                          <div
                            className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200"
                            aria-hidden="true"
                          >
                            <div
                              className="h-full rounded-full bg-[var(--primary)] transition-all"
                              style={{ width: `${completionPct}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 tabular-nums">
                            <span>
                              Class Avg:{" "}
                              <strong className="font-semibold text-slate-800">
                                {typeof edition.averageScore === "number"
                                  ? `${edition.averageScore.toFixed(1)}%`
                                  : "—"}
                              </strong>
                            </span>
                            {typeof edition.classCount === "number" &&
                              edition.classCount > 0 && (
                                <span>
                                  {edition.classCount}{" "}
                                  {edition.classCount === 1
                                    ? "Class"
                                    : "Classes"}
                                </span>
                              )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 border-t border-slate-100 pt-3">
                        <button
                          type="button"
                          onClick={() => onSelectEdition(edition)}
                          className="inline-flex min-h-11 md:pointer-fine:min-h-9 w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-[var(--primary-foreground)] shadow-2xs transition-colors hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                        >
                          <span>Open Overview</span>
                          <ArrowRight
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
