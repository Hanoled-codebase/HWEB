"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Edit3,
  FileText,
  Printer,
} from "lucide-react";
import {
  formatOrdinalRank,
  type CompletionStatus,
  type StudentOverviewRow,
} from "@/lib/results-overview";
import { cn } from "@/lib/utils";

export interface AllStudentsResultsTableProps {
  rows: StudentOverviewRow[];
  orgSlug: string;
  selectedIds: ReadonlySet<string>;
  onToggleSelect: (studentId: string) => void;
  onToggleSelectAll: (studentIds: string[]) => void;
  onViewResult: (studentId: string) => void;
  onPrintReport: (studentId: string) => void;
  onBulkPrint?: () => void;
  isBulkPrinting?: boolean;
}

type SortColumn = "student" | "average" | "rank";
type SortDirection = "ascending" | "descending";

function getInitials(name: string): string {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "ST";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function renderStatusBadge(status: CompletionStatus, mobileLabel = false) {
  if (status === "recorded") {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
        Recorded
      </span>
    );
  }
  if (status === "draft") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
        {mobileLabel ? "Draft" : "Incomplete"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
      Pending
    </span>
  );
}

export function AllStudentsResultsTable({
  rows,
  orgSlug,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onViewResult,
  onPrintReport,
  onBulkPrint,
  isBulkPrinting = false,
}: AllStudentsResultsTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>("rank");
  const [sortDirection, setSortDirection] =
    useState<SortDirection>("ascending");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    const dir = sortDirection === "ascending" ? 1 : -1;

    copy.sort((a, b) => {
      if (sortColumn === "student") {
        return a.fullName.localeCompare(b.fullName) * dir;
      }
      if (sortColumn === "average") {
        if (a.averageScore === null && b.averageScore === null) {
          return a.fullName.localeCompare(b.fullName);
        }
        if (a.averageScore === null) return 1;
        if (b.averageScore === null) return -1;
        return (a.averageScore - b.averageScore) * dir;
      }
      if (a.classRank === null && b.classRank === null) {
        return a.fullName.localeCompare(b.fullName);
      }
      if (a.classRank === null) return 1;
      if (b.classRank === null) return -1;
      return (a.classRank - b.classRank) * dir;
    });

    return copy;
  }, [rows, sortColumn, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, safePage, pageSize]);

  const allVisibleSelected =
    paginatedRows.length > 0 &&
    paginatedRows.every((row) => selectedIds.has(row.studentId));

  const handleSort = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortDirection((prev) =>
        prev === "ascending" ? "descending" : "ascending",
      );
    } else {
      setSortColumn(col);
      setSortDirection(col === "average" ? "descending" : "ascending");
    }
    setPage(1);
  };

  const renderSortIcon = (col: SortColumn) => {
    if (sortColumn !== col) {
      return (
        <ArrowUpDown
          className="h-3.5 w-3.5 text-slate-400"
          aria-hidden="true"
        />
      );
    }
    return sortDirection === "ascending" ? (
      <ArrowUp
        className="h-3.5 w-3.5 text-[var(--primary-text)]"
        aria-hidden="true"
      />
    ) : (
      <ArrowDown
        className="h-3.5 w-3.5 text-[var(--primary-text)]"
        aria-hidden="true"
      />
    );
  };

  const startIndex =
    sortedRows.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIndex = Math.min(sortedRows.length, safePage * pageSize);

  // A row with nothing recorded has no average or rank to show.
  const hasRowMetrics = (row: StudentOverviewRow) =>
    typeof row.averageScore === "number" ||
    (typeof row.classRank === "number" && row.classRank > 0);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
      <div role="status" aria-live="polite" className="sr-only">
        Sorted by {sortColumn} ({sortDirection})
      </div>

      {/* Mobile card-row list. The tab above already says "All Students (n)",
          so the list starts straight at the first learner. */}
      <div className="md:hidden">
        {paginatedRows.length === 0 ? (
          <div className="px-4 py-10 text-center text-xs text-slate-500">
            No students match the selected filters.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {paginatedRows.map((row) => (
              <li
                key={row.studentId}
                className="flex flex-col gap-2 px-3.5 py-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="inline-flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-full bg-[var(--primary-light)] text-[10px] font-bold text-[var(--primary-text)]"
                    >
                      {getInitials(row.fullName)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold uppercase tracking-tight text-slate-900">
                        {row.fullName}
                      </p>
                      <p className="truncate text-[11px] text-slate-500 tabular-nums">
                        {row.admissionNumber}
                      </p>
                      <p className="truncate text-[11px] font-medium text-slate-500">
                        {row.className}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-0.5">
                    {renderStatusBadge(row.completionStatus, true)}
                    <span className="text-[11px] text-slate-500 tabular-nums">
                      ({row.completedSubjects}/{row.expectedSubjects} subjects)
                    </span>
                  </div>
                </div>

                <div
                  className={cn(
                    "flex items-center justify-between gap-2",
                    hasRowMetrics(row) ? "border-t border-slate-100 pt-1.5" : "pt-0",
                  )}
                >
                  <div className="flex items-center gap-3 text-xs tabular-nums">
                    {/* A pending learner has no score yet: "--" and "—" were
                        noise, the status badge already says pending. */}
                    {typeof row.averageScore === "number" && (
                      <span>
                        Avg:{" "}
                        <strong className="font-bold text-slate-900">
                          {row.averageScore.toFixed(1)}%
                        </strong>
                      </span>
                    )}
                    {typeof row.classRank === "number" && row.classRank > 0 && (
                      <span>
                        Rank:{" "}
                        <strong className="font-bold text-slate-900">
                          {formatOrdinalRank(row.classRank)}
                        </strong>
                      </span>
                    )}
                  </div>

                  <div className="ml-auto flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onViewResult(row.studentId)}
                      className="inline-flex h-7.5 items-center rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:border-[var(--primary-border)] hover:bg-[var(--primary-light)] hover:text-[var(--primary-text)]"
                    >
                      View Result
                    </button>
                    {row.group.results.length > 0 && (
                      <button
                        type="button"
                        onClick={() => onPrintReport(row.studentId)}
                        className="inline-flex h-7.5 items-center gap-1 rounded-lg border border-[var(--primary-border)] bg-[var(--primary-light)] px-2 text-xs font-semibold text-[var(--primary-text)] shadow-2xs"
                      >
                        <Printer className="h-3 w-3" aria-hidden="true" />
                        <span>Print</span>
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Desktop accessible responsive table */}
      <div
        role="region"
        aria-labelledby="all-students-table-caption"
        tabIndex={0}
        className="hidden overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] md:block"
      >
        <table className="w-full border-collapse text-left text-sm">
          <caption id="all-students-table-caption" className="sr-only">
            All students general results overview table
          </caption>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
              <th scope="col" className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  aria-label="Select all students on this page"
                  checked={allVisibleSelected}
                  onChange={() =>
                    onToggleSelectAll(paginatedRows.map((r) => r.studentId))
                  }
                  className="h-4 w-4 rounded border-slate-300 accent-[var(--primary)]"
                />
              </th>
              <th
                scope="col"
                aria-sort={
                  sortColumn === "student" ? sortDirection : undefined
                }
                className="px-4 py-3"
              >
                <button
                  type="button"
                  onClick={() => handleSort("student")}
                  className="inline-flex items-center gap-1.5 rounded font-semibold text-slate-700 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                >
                  <span>Student Name &amp; ID</span>
                  {renderSortIcon("student")}
                </button>
              </th>
              <th scope="col" className="px-4 py-3">
                Subject Completion
              </th>
              <th
                scope="col"
                aria-sort={
                  sortColumn === "average" ? sortDirection : undefined
                }
                className="px-4 py-3"
              >
                <button
                  type="button"
                  onClick={() => handleSort("average")}
                  className="inline-flex items-center gap-1.5 rounded font-semibold text-slate-700 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                >
                  <span>Average Score</span>
                  {renderSortIcon("average")}
                </button>
              </th>
              <th
                scope="col"
                aria-sort={sortColumn === "rank" ? sortDirection : undefined}
                className="px-4 py-3"
              >
                <button
                  type="button"
                  onClick={() => handleSort("rank")}
                  className="inline-flex items-center gap-1.5 rounded font-semibold text-slate-700 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                >
                  <span>Class Rank</span>
                  {renderSortIcon("rank")}
                </button>
              </th>
              <th scope="col" className="px-4 py-3">
                Status
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-sm text-slate-500"
                >
                  No learners match the current filter criteria.
                </td>
              </tr>
            ) : (
              paginatedRows.map((row) => {
                const isSelected = selectedIds.has(row.studentId);
                const completionPct = Math.min(
                  100,
                  Math.round(row.completionRatio * 100),
                );
                const barColor =
                  row.completionStatus === "recorded"
                    ? "bg-emerald-600"
                    : row.completionStatus === "draft"
                      ? "bg-amber-500"
                      : "bg-slate-300";

                return (
                  <tr
                    key={row.studentId}
                    className={cn(
                      "transition-colors hover:bg-slate-50/90",
                      isSelected && "bg-[var(--primary-light)]/40",
                    )}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Select ${row.fullName}`}
                        checked={isSelected}
                        onChange={() => onToggleSelect(row.studentId)}
                        className="h-4 w-4 rounded border-slate-300 accent-[var(--primary)]"
                      />
                    </td>
                    <th scope="row" className="px-4 py-3 font-normal">
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden="true"
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary-light)] text-xs font-bold text-[var(--primary-text)]"
                        >
                          {getInitials(row.fullName)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">
                            {row.fullName}
                          </p>
                          <p className="truncate text-xs text-slate-500 tabular-nums">
                            {row.admissionNumber} · {row.className}
                          </p>
                        </div>
                      </div>
                    </th>
                    <td className="px-4 py-3">
                      <div className="w-40 space-y-1.5">
                        <p className="text-xs font-semibold text-slate-700 tabular-nums">
                          {row.completedSubjects} of {row.expectedSubjects}{" "}
                          Subjects
                        </p>
                        <div
                          className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200"
                          aria-hidden="true"
                        >
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              barColor,
                            )}
                            style={{ width: `${completionPct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 tabular-nums">
                      {typeof row.averageScore === "number"
                        ? `${row.averageScore.toFixed(1)}%`
                        : "--"}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700 tabular-nums">
                      {formatOrdinalRank(row.classRank)}
                    </td>
                    <td className="px-4 py-3">
                      {renderStatusBadge(row.completionStatus)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onViewResult(row.studentId)}
                          className="inline-flex min-h-8 items-center gap-1 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition-colors hover:border-[var(--primary-border)] hover:bg-[var(--primary-light)] hover:text-[var(--primary-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                        >
                          <FileText
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                          <span>View Result</span>
                        </button>
                        <button
                          type="button"
                          disabled={row.group.results.length === 0}
                          onClick={() => onPrintReport(row.studentId)}
                          className="inline-flex min-h-8 items-center gap-1 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition-colors hover:border-[var(--primary-border)] hover:bg-[var(--primary-light)] hover:text-[var(--primary-text)] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                        >
                          <Printer
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                          <span>Print Report</span>
                        </button>
                        <Link
                          href={
                            row.classId && row.classId !== "unassigned"
                              ? `/dashboard/school/${orgSlug}/spreadsheets?classLevelId=${encodeURIComponent(row.classId)}`
                              : `/dashboard/school/${orgSlug}/spreadsheets`
                          }
                          className="inline-flex min-h-8 items-center gap-1 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition-colors hover:border-[var(--primary-border)] hover:bg-[var(--primary-light)] hover:text-[var(--primary-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                        >
                          <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Edit Scores</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination & Mobile Sticky Bottom Action Bar */}
      <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-medium text-slate-600 tabular-nums">
          Showing {startIndex}–{endIndex} of {sortedRows.length} students
        </p>

        <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex min-h-11 md:pointer-fine:min-h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 disabled:opacity-45"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Previous</span>
            </button>
            <span className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-lg bg-[var(--primary)] px-2.5 py-1 text-xs font-bold text-[var(--primary-foreground)] tabular-nums">
              {safePage}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex min-h-11 md:pointer-fine:min-h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 disabled:opacity-45"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <label htmlFor="results-page-size" className="font-medium">
              Show
            </label>
            <select
              id="results-page-size"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="min-h-11 md:pointer-fine:min-h-8 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          {onBulkPrint && (
            <button
              type="button"
              onClick={onBulkPrint}
              disabled={isBulkPrinting || sortedRows.length === 0}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-[var(--primary)] px-3.5 py-2 text-xs font-semibold text-[var(--primary-foreground)] shadow-2xs disabled:opacity-50 md:hidden"
            >
              <Printer className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{isBulkPrinting ? "Preparing..." : "Print all"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
