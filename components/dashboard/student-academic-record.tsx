"use client";

import { useId } from "react";
import { format } from "date-fns";
import {
  ArrowUpRight,
  BookOpen,
  ClipboardList,
  GraduationCap,
  NotebookPen,
  ScrollText,
  Target,
  UserRound,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMobilePageTitle } from "@/components/dashboard/mobile/MobileMenuProvider";
import { formatScore, getInitials } from "@/lib/spreadsheets";
import {
  StudentPerformanceResponse,
  StudentPerformanceSubject,
  formatAssessmentScore,
  getAssessmentPercentage,
  getOrderedStudentAssessments,
  getStudentFullName,
  getStudentRecordId,
  getSubjectName,
  getSubjectPerformanceSummary,
  getSubjectRecordLabel,
  hasEnteredScore,
} from "@/lib/student-performance";

// ─── Types ────────────────────────────────────────────────────────────────────

type AttendanceInfo = {
  stats: {
    total: number;
    present: number;
    absent: number;
    excused: number;
    late: number;
    attendanceRate: number;
  };
  records?: { id: string; date: string; status: "present" | "absent" | "excused" | "late" }[];
};

type StudentAcademicRecordProps = {
  student: StudentPerformanceResponse["student"];
  subjects: StudentPerformanceSubject[];
  attendance?: AttendanceInfo;
  description?: string;
  actionLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  onOpenSubject?: (subject: StudentPerformanceSubject) => void;
  /** Hand the learner's name to the phone top bar (off where the record is one of several on the page). */
  titlesPage?: boolean;
};

// ─── Color helpers ────────────────────────────────────────────────────────────
// Pure high-contrast Black & White palette per institutional report requirements.

type ScoreColors = {
  arc: string; // SVG stroke color for the filled arc
  track: string; // SVG stroke color for the empty track
  bar: string; // Tailwind class for the segmented bar fill
};

function getScoreColors(pct: number | null): ScoreColors {
  if (pct === null) {
    return { arc: "#E5E7EB", track: "#F3F4F6", bar: "bg-neutral-200" };
  }
  return { arc: "#000000", track: "#E5E7EB", bar: "bg-black" };
}

function getGradeBadgeClass(label: string): string {
  const l = label.toLowerCase();
  if (l === "distinction") return "bg-black text-white font-bold border-black";
  if (l === "merit") return "bg-neutral-200 text-black font-bold border-neutral-300";
  if (l === "pass") return "bg-neutral-100 text-neutral-800 border-neutral-300 font-semibold";
  if (l === "needs support") return "bg-neutral-50 text-neutral-700 border-neutral-200 font-medium";
  if (l === "grading in progress") return "bg-neutral-50 text-neutral-600 border-dashed border-neutral-300 italic";
  return "bg-neutral-50 text-neutral-500 border-neutral-200";
}

// ─── Assessment icon ──────────────────────────────────────────────────────────

function getAssessmentIcon(name: string) {
  const n = name.trim().toLowerCase();
  if (n.includes("class")) return ClipboardList;
  if (n.includes("assign") || n.includes("asg")) return NotebookPen;
  if (n.includes("exam")) return ScrollText;
  return BookOpen;
}

// ─── SVG Progress Ring ────────────────────────────────────────────────────────
//
// Uses an SVG viewBox so the ring scales perfectly with its container.
// The track circle is always rendered (visible gray), so even a null / 0%
// state looks intentional rather than broken.
// The outer div uses `aspect-square` + a fixed Tailwind width so the ring
// column in the parent grid is exactly the ring's width — zero wasted space.

const RING_VIEWBOX = 200; // viewBox units
const RING_STROKE_W = 20; // viewBox units (ring thickness)
const RING_RADIUS = (RING_VIEWBOX - RING_STROKE_W) / 2; // 90
const RING_CIRC = 2 * Math.PI * RING_RADIUS; // ≈ 565.5

function ProgressRing({
  percentage,
  value,
  compact = false,
}: {
  percentage: number | null;
  value: string;
  compact?: boolean;
}) {
  const bounded = Math.max(0, Math.min(percentage ?? 0, 100));
  const colors = getScoreColors(percentage !== null ? bounded : null);
  const offset = RING_CIRC * (1 - bounded / 100);

  // Compact cards use a smaller ring so the card can breathe on narrow panes.
  // `aspect-square` keeps the container a perfect square at any viewport.
  const containerCn = compact ? "w-32 sm:w-36 xl:w-40" : "w-44 sm:w-48";

  return (
    <div className={cn("relative mx-auto aspect-square shrink-0", containerCn)}>
      {/* SVG ring — rotated so progress starts at 12 o'clock */}
      <svg
        viewBox={`0 0 ${RING_VIEWBOX} ${RING_VIEWBOX}`}
        className="absolute inset-0 h-full w-full -rotate-90"
        aria-hidden="true"
      >
        {/* Track (always visible) */}
        <circle
          cx={RING_VIEWBOX / 2}
          cy={RING_VIEWBOX / 2}
          r={RING_RADIUS}
          fill="none"
          stroke={colors.track}
          strokeWidth={RING_STROKE_W}
          strokeLinecap="round"
        />
        {/* Filled arc (only when there is a real score) */}
        {percentage !== null && bounded > 0 && (
          <circle
            cx={RING_VIEWBOX / 2}
            cy={RING_VIEWBOX / 2}
            r={RING_RADIUS}
            fill="none"
            stroke={colors.arc}
            strokeWidth={RING_STROKE_W}
            strokeLinecap="round"
            strokeDasharray={RING_CIRC}
            strokeDashoffset={offset}
          />
        )}
      </svg>

      {/* Center labels — sit on top of the SVG */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {/* Percentage or dash */}
        <p
          className={cn(
            "font-bold leading-none tracking-tight",
            compact
              ? "text-[1.75rem] sm:text-[2rem]"
              : "text-[2.25rem] sm:text-[2.75rem]",
            percentage === null ? "text-slate-300" : "text-slate-900",
          )}
        >
          {percentage === null ? "—" : `${Math.round(bounded)}%`}
        </p>

        {/* Raw score / recorded count */}
        <p
          className={cn(
            "mt-1.5 font-medium text-slate-500",
            compact ? "text-xs sm:text-[11px]" : "text-xs sm:text-sm",
          )}
        >
          {value}
        </p>

        {/* Decorative target: dropped in the compact ring so "Avg. score" stays inside the arc. */}
        {!compact && <Target className="mt-2 h-3.5 w-3.5 text-slate-300" />}

        {/* "Avg. score" — short label that fits inside even the compact ring */}
        <p
          className={cn(
            "mt-1 font-semibold uppercase text-slate-600",
            compact
              ? "text-xs tracking-[0.08em]"
              : "text-xs  tracking-[0.12em]",
          )}
        >
          Avg. score
        </p>
      </div>
    </div>
  );
}

// ─── Segmented progress bar ───────────────────────────────────────────────────

function SegmentedBar({ percentage }: { percentage: number | null }) {
  const safe = Math.max(0, Math.min(percentage ?? 0, 100));
  const colors = getScoreColors(percentage !== null ? safe : null);
  const count = 4;

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1">
      {Array.from({ length: count }).map((_, i) => {
        const start = (i / count) * 100;
        const end = ((i + 1) / count) * 100;
        let fill = 0;

        if (safe >= end) fill = 100;
        else if (safe > start) fill = ((safe - start) / (end - start)) * 100;

        return (
          <div
            key={i}
            className="relative h-2 flex-1 overflow-hidden rounded-full bg-slate-100"
          >
            <div
              className={cn(
                "absolute inset-y-0 left-0 rounded-full",
                colors.bar,
              )}
              style={{ width: `${fill}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}

// ─── Subject card ─────────────────────────────────────────────────────────────

function SubjectCard({
  subject,
  onOpen,
}: {
  subject: StudentPerformanceSubject;
  onOpen?: (subject: StudentPerformanceSubject) => void;
}) {
  const summary = getSubjectPerformanceSummary(subject);
  const orderedAssessments = getOrderedStudentAssessments(subject.assessments);
  const gradeLabel = getSubjectRecordLabel(summary);
  const updatedLabel = subject.updatedAt
    ? `Updated ${format(new Date(subject.updatedAt), "MMM d, yyyy")}`
    : "Awaiting update";

  const ringValue =
    summary.possible > 0
      ? `${formatScore(summary.scored)} / ${formatScore(summary.possible)}`
      : `${summary.enteredCount} recorded`;

  const inner = (
    <div className="flex h-full flex-col gap-5">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-bold tracking-tight text-slate-900 md:text-xl">
            {getSubjectName(subject)}
          </h3>
          <p className="mt-1 max-w-[18rem] text-sm leading-5 text-slate-500">
            {summary.enteredCount} of {summary.totalCount} assessments recorded
          </p>
        </div>

        <Badge
          variant="outline"
          className={cn(
            "shrink-0 rounded-full px-3 py-1 text-xs font-semibold md:text-[11px] md:uppercase md:tracking-[0.14em]",
            getGradeBadgeClass(gradeLabel),
          )}
        >
          {gradeLabel}
        </Badge>
      </div>

      {/* ── Body: ring + assessment list ────────────────────────────── */}
      {/*
        `auto 1fr` means the first column (ring) is exactly the ring's
        natural pixel width (w-40 or w-48). No minmax fraction that can
        stretch it to 400 px and leave a sea of white space.
      */}
      <div className="grid gap-5 md:grid-cols-[auto_minmax(0,1fr)] md:items-start">
        <div className="hidden md:block">
          <ProgressRing
            percentage={summary.percentage}
            value={ringValue}
            compact={true}
          />
        </div>

        {/* Phones: the ring's number as one line */}
        <p className="-mt-2 flex items-baseline gap-2 md:hidden">
          <span className="text-2xl font-bold tabular-nums text-slate-900">
            {summary.percentage === null || summary.enteredCount === 0 ? "—" : `${Math.round(summary.percentage)}%`}
          </span>
          <span className="text-sm text-slate-500">{summary.enteredCount === 0 ? "No scores yet" : ringValue}</span>
        </p>

        {/* Assessment list (a tappable card opens the subject instead, on phones) */}
        <div className={cn("min-w-0 rounded-2xl bg-slate-50/50 px-4 py-3 sm:px-5", onOpen && "max-md:hidden")}>
          <div className="divide-y divide-slate-100/70">
            {orderedAssessments.map((assessment, i) => {
              const AssessmentIcon = getAssessmentIcon(assessment.name);
              const pct = getAssessmentPercentage(assessment);
              const entered = hasEnteredScore(assessment.score);
              const isOnly = orderedAssessments.length === 1;

              return (
                <div
                  key={`${subject.spreadsheetId}-${assessment.originalIndex}-${assessment.name}`}
                  className={cn(
                    "grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3",
                    isOnly
                      ? "py-3"
                      : i === 0
                        ? "pb-3.5"
                        : i === orderedAssessments.length - 1
                          ? "pt-3.5"
                          : "py-3.5",
                  )}
                >
                  {/* Icon chip */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100/60 text-slate-600">
                    <AssessmentIcon className="h-4 w-4" />
                  </div>

                  {/* Content */}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800">
                        {assessment.name}
                      </p>
                      {!entered && (
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-600 border border-neutral-200">
                          Waiting
                        </span>
                      )}
                    </div>

                    {entered ? (
                      <div className="mt-2 flex items-center gap-3">
                        <SegmentedBar percentage={pct} />
                        <p className="shrink-0 text-sm font-bold tabular-nums text-slate-700">
                          {formatAssessmentScore(
                            assessment.score,
                            assessment.total,
                          )}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-0.5 text-xs text-slate-500">
                        Not entered
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-slate-100/70 pt-4">
        <p className="text-xs leading-5 text-slate-500">{updatedLabel}</p>
        {onOpen && (
          <span className="flex items-center gap-1 text-xs font-semibold text-slate-500">
            Open subject
            <ArrowUpRight className="h-4 w-4" />
          </span>
        )}
      </div>
    </div>
  );

  const cardCn = cn(
    "w-full overflow-hidden rounded-3xl bg-white p-5 shadow-sm sm:p-6",
    "md:min-h-[20rem]",
  );

  if (onOpen) {
    return (
      <button
        type="button"
        onClick={() => onOpen(subject)}
        className={cn(
          cardCn,
          "text-left transition-shadow duration-200 hover:shadow-md",
        )}
      >
        {inner}
      </button>
    );
  }

  return <article className={cardCn}>{inner}</article>;
}

// ─── Student Academic Record ──────────────────────────────────────────────────

export function StudentAcademicRecord({
  student,
  subjects,
  attendance,
  description = "Track subject performance, assessment breakdown, and the latest score updates in one place.",
  actionLabel = "View Academic Record",
  emptyTitle = "No subjects recorded yet",
  emptyDescription = "This learner does not have any published subject records yet.",
  onOpenSubject,
  titlesPage = true,
}: StudentAcademicRecordProps) {
  const subjectsAnchorId = useId();
  const studentName = getStudentFullName(student);
  useMobilePageTitle(titlesPage ? studentName : null);

  return (
    <div className="space-y-5">
      {/* ── Student header card ─────────────────────────────────────── */}
      <section className="rounded-3xl bg-white p-4 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          {/* Avatar + info */}
          <div className="flex flex-row items-center gap-4 sm:gap-5">
            <Avatar
              size="lg"
              className="h-14 w-14 shrink-0 rounded-full bg-slate-100 shadow-sm sm:h-20 sm:w-20"
            >
              <AvatarFallback className="bg-slate-100 text-xl font-bold text-slate-600">
                {getInitials(studentName) || <UserRound className="h-8 w-8" />}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <h1 className="hidden truncate text-3xl font-bold tracking-tight text-slate-900 md:block lg:text-4xl">
                {studentName}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 md:mt-3 md:gap-y-2">
                <div className="flex items-center gap-1.5 text-sm">
                  <GraduationCap className="h-3.5 w-3.5 text-slate-600" />
                  <span className="text-slate-500 font-normal">Class:</span>
                  <span className="text-slate-900 font-semibold">
                    {student.classLevel?.name || "Unassigned class"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="text-slate-500 font-normal">Student ID:</span>
                  <span className="text-slate-900 font-semibold">
                    {getStudentRecordId(student)}
                  </span>
                </div>
                {attendance && (() => {
                  const today = new Date().toISOString().slice(0, 10);
                  const todayRecord = attendance.records?.find(
                    (r) => r.date.slice(0, 10) === today
                  );
                  const todayStatus = todayRecord?.status;
                  return todayStatus ? (
                    <div className="flex items-center gap-1.5 text-sm">
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border",
                        todayStatus === "present" ? "bg-black text-white border-black" :
                        todayStatus === "late" ? "bg-neutral-200 text-black border-neutral-300" :
                        todayStatus === "excused" ? "bg-neutral-100 text-neutral-800 border-neutral-300" :
                        "bg-neutral-100 text-neutral-900 border-neutral-400"
                      )}>
                        <span className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          todayStatus === "present" ? "bg-white" : "bg-neutral-600"
                        )} />
                        {todayStatus === "present" ? "In school" :
                         todayStatus === "late" ? "Late" :
                         todayStatus === "excused" ? "Excused" :
                         "Absent"}
                      </span>
                    </div>
                  ) : null;
                })()}
              </div>
              <p className="mt-4 hidden max-w-2xl text-sm leading-6 text-slate-500 md:block">
                {description}
              </p>
            </div>
          </div>

          {/* CTA (phones scroll straight into the subjects anyway) */}
          <div className="hidden shrink-0 md:block">
            <Button
              type="button"
              variant="outline"
              disabled={subjects.length === 0}
              className="h-11 rounded-2xl bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 border-0"
              onClick={() =>
                document
                  .getElementById(subjectsAnchorId)
                  ?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
            >
              {actionLabel}
            </Button>
          </div>
        </div>

        {/* ── Academic summary micro-grid ──────────────────────────── */}
        {subjects.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4 sm:mt-6 sm:grid-cols-4 sm:gap-4 sm:pt-6">
            {(() => {
              const totalScored = subjects.reduce(
                (sum, s) => sum + (getSubjectPerformanceSummary(s).scored || 0),
                0,
              );
              const totalPossible = subjects.reduce(
                (sum, s) => sum + (getSubjectPerformanceSummary(s).possible || 0),
                0,
              );
              const avgPct = totalPossible > 0
                ? Math.round((totalScored / totalPossible) * 100)
                : null;
              const attRate = attendance?.stats.attendanceRate ?? null;

              return (
                <>
                  <div className="rounded-xl bg-slate-50/50 p-3 text-center sm:p-4">
                    <p className="text-xs font-medium text-slate-500">
                      Total Score
                    </p>
                    <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                      {formatScore(totalScored)}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      / {formatScore(totalPossible)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50/50 p-3 text-center sm:p-4">
                    <p className="text-xs font-medium text-slate-500">
                      Average
                    </p>
                    <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                      {avgPct !== null ? `${avgPct}%` : "—"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Across {subjects.length} subject{subjects.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50/50 p-3 text-center sm:p-4">
                    <p className="text-xs font-medium text-slate-500">
                      Subjects
                    </p>
                    <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                      {subjects.length}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Assessments recorded
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50/50 p-3 text-center sm:p-4">
                    <p className="text-xs font-medium text-slate-500">
                      Attendance
                    </p>
                    <p className="mt-1 text-2xl font-black tracking-tight sm:text-3xl text-black tabular-nums">
                      {attRate !== null ? `${Math.round(attRate)}%` : "—"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Attendance rate
                    </p>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </section>

      {/* ── Subject cards ───────────────────────────────────────────── */}
      <section id={subjectsAnchorId}>
        {subjects.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm sm:p-14">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
              <BookOpen className="h-7 w-7" />
            </div>
            <h2 className="mt-5 text-xl font-bold text-slate-800">
              {emptyTitle}
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
              {emptyDescription}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Subjects</h2>
            <div className="grid gap-3 sm:gap-5 xl:grid-cols-2">
              {subjects.map((subject, index) => (
                <SubjectCard
                  key={`${subject.subject?.id || subject.spreadsheetId}-${index}`}
                  subject={subject}
                  onOpen={onOpenSubject}
                />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
