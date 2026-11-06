"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  AlertTriangle,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Printer,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { downloadReportCardPdf } from "@/lib/report-card-download";

import ReportCardPrintModal, {
  computeNigerianGrade,
} from "@/components/results/ReportCardPrintModal";
import { StudentAcademicRecord } from "@/components/dashboard/student-academic-record";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganization } from "@/hooks/useOrganization";
import { DataStateCard } from "@/components/dashboard/shared";
import { apiFetch, HSMS_BASE, isForbiddenError } from "@/lib/api";
import { authFetchInit } from "@/lib/auth-tokens";
import { formatScore, getInitials, toNumericValue } from "@/lib/spreadsheets";
import {
  formatAssessmentScore,
  getAssessmentPercentage,
  getCurriculumSubjectsForClass,
  getOrderedStudentAssessments,
  getStudentRecordId,
  getSubjectName,
  getSubjectPerformanceSummary,
  getSubjectRecordLabel,
  hasEnteredScore,
  matchSubjectAlias,
  StudentPerformanceResponse,
  StudentPerformanceSubject,
} from "@/lib/student-performance";
import { cn } from "@/lib/utils";

type Assessment = {
  name: string;
  total?: number;
};

type ResultSheet = {
  id: string;
  assessments?: Assessment[];
  title: string;
  columns: string[];
  values: Array<string | number | null>;
  subject?: { id?: string; name?: string | null } | null;
  classLevel?: {
    id?: string;
    name?: string | null;
    level?: string | null;
  } | null;
  updatedAt?: string;
};

type StudentResultGroup = {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber?: string;
    classLevel?: {
      id?: string;
      name?: string | null;
      level?: string | null;
    } | null;
  };
  results: ResultSheet[];
  approvedTemplate?: {
    id: string;
    name: string;
    classLevelId?: string | null;
    isDefault: boolean;
    isApproved: boolean;
    metrics: Array<{ name: string; label: string; weight: number }>;
    gradeScale: Array<{ grade: string; min: number; max: number }>;
  } | null;
  isTemplateApproved?: boolean;
};

type ParentNotification = {
  id: string;
  title: string;
  message: string;
  assessmentName: string;
  expectedTotal: number;
  score: number;
  percentage: number;
  updatedAt?: string;
  student?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    admissionNumber?: string;
  } | null;
  subject?: { name?: string | null } | null;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return fallback;
}

function toPerformanceSubjects(
  results: ResultSheet[],
  classLevelName?: string | null,
): StudentPerformanceSubject[] {
  // Only display subjects where the student actually has a record/score entered under their spreadsheet
  const resultsWithScores = results.filter((result) =>
    result.values.some((v) => v !== null && v !== undefined && v !== ""),
  );

  const seen = new Set<string>();
  const performanceSubjects: StudentPerformanceSubject[] = [];

  for (const match of resultsWithScores) {
    const rawName = match.subject?.name || match.title || "Untitled Subject";
    const key = rawName.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const assessments = (
      match.assessments?.length
        ? match.assessments
        : match.columns.map((column) => ({ name: column, total: undefined }))
    ).map((assessment, originalIndex) => ({
      name: assessment.name,
      total: assessment.total,
      score: match.values[originalIndex] ?? "",
      originalIndex,
    }));

    performanceSubjects.push({
      spreadsheetId: match.id,
      status: "active" as const,
      updatedAt: match.updatedAt,
      subject: {
        id: match.subject?.id || match.id,
        name: rawName,
      },
      classLevel: match.classLevel
        ? {
            id: match.classLevel.id,
            name: match.classLevel.name,
            level: match.classLevel.level,
          }
        : classLevelName ? { name: classLevelName } : null,
      totalScore: match.values.reduce<number>(
        (sum, value) => sum + (toNumericValue(value) ?? 0),
        0,
      ),
      assessments,
    });
  }

  return performanceSubjects;
}

function getMobileBadgeClass(label: string) {
  const normalized = label.toLowerCase();

  if (normalized === "distinction") {
    return "bg-black text-white font-bold border border-black";
  }

  if (normalized === "merit") {
    return "bg-neutral-200 text-black font-bold border border-neutral-300";
  }

  if (normalized === "pass") {
    return "bg-neutral-100 text-neutral-800 border border-neutral-300 font-semibold";
  }

  if (normalized === "grading in progress") {
    return "bg-neutral-50 text-neutral-600 border border-dashed border-neutral-300 italic";
  }

  if (normalized === "waiting for score") {
    return "bg-neutral-50 text-neutral-500 border border-dotted border-neutral-300";
  }

  return "bg-neutral-100 text-neutral-700 border border-neutral-300";
}

function getScoreTone(percentage: number | null) {
  if (percentage === null) {
    return { stroke: "#E5E7EB", text: "text-neutral-400" };
  }

  return { stroke: "#000000", text: "text-black" };
}

function MobileScoreRing({ percentage }: { percentage: number | null }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const bounded = Math.max(0, Math.min(percentage ?? 0, 100));
  const tone = getScoreTone(percentage);

  return (
    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
      <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 48 48">
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke="#F3F4F6"
          strokeWidth="4"
        />
        {percentage !== null && (
          <circle
            cx="24"
            cy="24"
            r={radius}
            fill="none"
            stroke={tone.stroke}
            strokeLinecap="round"
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - bounded / 100)}
          />
        )}
      </svg>
      <span className={`text-sm font-black tabular-nums ${tone.text}`}>
        {percentage === null ? "--" : `${Math.round(bounded)}%`}
      </span>
    </div>
  );
}

function MobileSubjectBreakdown({
  subject,
  open,
  onOpenChange,
}: {
  subject: StudentPerformanceSubject | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!subject) return null;

  const summary = getSubjectPerformanceSummary(subject);
  const assessments = getOrderedStudentAssessments(subject.assessments);
  const label = getSubjectRecordLabel(summary);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto rounded-t-[2rem] border-slate-200 p-6 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="pr-8 text-xl font-bold text-slate-950">
            {getSubjectName(subject)}
          </DialogTitle>
          <DialogDescription>
            Full assessment breakdown and recorded scores.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total score</p>
              <p className="mt-1 text-2xl font-bold text-slate-950">
                {summary.percentage === null
                  ? "In progress"
                  : `${Math.round(summary.percentage)}%`}
              </p>
            </div>
            <span
              className={`rounded-full px-4 py-2 text-sm font-bold ${getMobileBadgeClass(label)}`}
            >
              {label}
            </span>
          </div>
          <p className="mt-4 text-sm font-medium text-slate-500">
            {summary.enteredCount} of {summary.totalCount} assessments recorded
          </p>
        </div>

        <div className="mt-5 space-y-3">
          {assessments.map((assessment) => {
            const pct = getAssessmentPercentage(assessment);
            const entered = hasEnteredScore(assessment.score);

            return (
              <div
                key={`${subject.spreadsheetId}-${assessment.originalIndex}-${assessment.name}`}
                className="rounded-2xl border border-slate-200 bg-white p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-bold text-slate-950">
                      {assessment.name}
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      {entered
                        ? formatAssessmentScore(
                            assessment.score,
                            assessment.total,
                          )
                        : "Grading in progress"}
                    </p>
                  </div>
                  <MobileScoreRing percentage={pct} />
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ResultsPage() {
  const { currentOrg, currentMember } = useOrganization();

  const [resultGroups, setResultGroups] = useState<StudentResultGroup[]>([]);
  const [notifications, setNotifications] = useState<ParentNotification[]>([]);
  // ?student=<id> preselects a learner (a parent tapping one child on the home screen lands on that child).
  const [selectedStudentId, setSelectedStudentId] = useState(() =>
    typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("student") ?? "",
  );
  const [selectedSubject, setSelectedSubject] =
    useState<StudentPerformanceSubject | null>(null);
  const [showAllMobileSubjects, setShowAllMobileSubjects] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [exportTerm, setExportTerm] = useState("Term 1");
  const [exportYear, setExportYear] = useState("2026/2027");
  const [printModalGroup, setPrintModalGroup] = useState<StudentResultGroup | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("all");
  const [isDownloadingBatch, setIsDownloadingBatch] = useState(false);
  const [isRosterOpen, setIsRosterOpen] = useState(false);

  const handleBatchExport = async () => {
    const targetClassId =
      selectedClassId !== "all"
        ? selectedClassId
        : resultGroups[0]?.student?.classLevel?.id;
    if (!targetClassId || !currentOrg?.slug) {
      toast.error("Please select a class level to export batch bundle.");
      return;
    }

    try {
      setIsDownloadingBatch(true);
      const baseUrl = HSMS_BASE;
      const res = await fetch(
        `${baseUrl}/export/${currentOrg.slug}/report-card-bundle/${targetClassId}?term=${encodeURIComponent(
          exportTerm
        )}&academicYear=${encodeURIComponent(exportYear)}`,
        authFetchInit("hcore")
      );

      if (!res.ok) {
        const errJson = await res
          .json()
          .catch(() => ({ error: "Failed to generate report cards bundle" }));
        throw new Error(
          errJson.error || errJson.message || "Failed to generate batch PDF"
        );
      }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `Report_Cards_Bundle_${exportTerm.replace(/\s+/g, "_")}_${exportYear.replace(/[/\\?%*:|"<>]/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
      toast.success("Batch report cards PDF downloaded successfully!");
    } catch (err: any) {
      toast.error(err.message || "Error downloading batch report cards PDF");
    } finally {
      setIsDownloadingBatch(false);
    }
  };

  const availableClassOptions = useMemo(() => {
    const classMap = new Map<string, string>();
    for (const group of resultGroups) {
      if (group.student.classLevel?.id && group.student.classLevel?.name) {
        classMap.set(group.student.classLevel.id, group.student.classLevel.name);
      }
    }
    return Array.from(classMap.entries()).map(([id, name]) => ({ id, name }));
  }, [resultGroups]);

  const filteredResultGroups = useMemo(() => {
    return resultGroups.filter((group) => {
      const matchesClass =
        selectedClassId === "all" ||
        group.student.classLevel?.id === selectedClassId;
      const fullName = `${group.student.firstName} ${group.student.lastName}`.toLowerCase();
      const admNum = (group.student.admissionNumber || "").toLowerCase();
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query || fullName.includes(query) || admNum.includes(query);

      return matchesClass && matchesSearch;
    });
  }, [resultGroups, selectedClassId, searchQuery]);

  const fetchParentData = useCallback(
    async ({ refresh = false, showSuccessToast = false } = {}) => {
      if (!currentOrg || !currentMember) {
        setResultGroups([]);
        setNotifications([]);
        setSelectedStudentId("");
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      try {
        if (refresh) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }
        setForbidden(false);

        const [resultsData, notificationsData] = await Promise.all([
          apiFetch<StudentResultGroup[]>(
            `/spreadsheets/${currentOrg.slug}/results`,
          ),
          apiFetch<ParentNotification[]>(
            `/spreadsheets/${currentOrg.slug}/notifications`,
          ).catch(() => []),
        ]);

        setResultGroups(resultsData || []);
        setNotifications(notificationsData || []);

        if (showSuccessToast) {
          toast.success("Results refreshed");
        }
      } catch (error) {
        if (isForbiddenError(error)) {
          setForbidden(true);
        } else {
          toast.error(getErrorMessage(error, "Failed to load results"));
        }
      } finally {
        if (refresh) {
          setIsRefreshing(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [currentOrg, currentMember],
  );

  useEffect(() => {
    fetchParentData();
  }, [fetchParentData]);

  useEffect(() => {
    if (resultGroups.length === 0) {
      setSelectedStudentId("");
      return;
    }

    if (
      !selectedStudentId ||
      !resultGroups.some((group) => group.student.id === selectedStudentId)
    ) {
      setSelectedStudentId(resultGroups[0].student.id);
    }
  }, [resultGroups, selectedStudentId]);

  const selectedGroup = useMemo(
    () =>
      resultGroups.find((group) => group.student.id === selectedStudentId) ||
      resultGroups[0] ||
      null,
    [resultGroups, selectedStudentId],
  );

  const currentIndex = useMemo(() => {
    if (!selectedGroup) return -1;
    return filteredResultGroups.findIndex(
      (g) => g.student.id === selectedGroup.student.id
    );
  }, [filteredResultGroups, selectedGroup]);

  const hasPrev = currentIndex > 0;
  const hasNext =
    currentIndex !== -1 && currentIndex < filteredResultGroups.length - 1;

  const handlePrev = useCallback(() => {
    if (hasPrev) {
      setSelectedStudentId(filteredResultGroups[currentIndex - 1].student.id);
      setShowAllMobileSubjects(false);
      setSelectedSubject(null);
    }
  }, [hasPrev, filteredResultGroups, currentIndex]);

  const handleNext = useCallback(() => {
    if (hasNext) {
      setSelectedStudentId(filteredResultGroups[currentIndex + 1].student.id);
      setShowAllMobileSubjects(false);
      setSelectedSubject(null);
    }
  }, [hasNext, filteredResultGroups, currentIndex]);

  const selectedNotifications = useMemo(() => {
    if (!selectedGroup) {
      return notifications;
    }

    return notifications.filter(
      (notification) => notification.student?.id === selectedGroup.student.id,
    );
  }, [notifications, selectedGroup]);

  const performanceSubjects = useMemo(
    () =>
      selectedGroup
        ? toPerformanceSubjects(
            selectedGroup.results,
            selectedGroup.student.classLevel?.name ||
              selectedGroup.student.classLevel?.level,
          )
        : [],
    [selectedGroup],
  );

  const visibleMobileSubjects = showAllMobileSubjects
    ? performanceSubjects
    : performanceSubjects.slice(0, 4);

  return (
    <div className="min-h-full bg-slate-50/60 pb-16">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 md:gap-6 md:px-6 md:py-8 lg:px-8">
        <div className="hidden flex-col items-start justify-between gap-5 md:flex md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Published Results
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              Review each child&apos;s academic record in a visual format,
              including subject averages, assessment progress, and low-score
              alerts.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select
                value={exportTerm}
                onChange={(e) => setExportTerm(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 font-semibold"
              >
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
              </select>
              <input
                type="text"
                value={exportYear}
                onChange={(e) => setExportYear(e.target.value)}
                className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 font-semibold"
                placeholder="Year"
              />
              {currentMember?.role !== "parent" && currentOrg?.slug && (resultGroups[0]?.student?.classLevel?.id || selectedClassId !== "all") && (
                <Button
                  type="button"
                  onClick={handleBatchExport}
                  disabled={isDownloadingBatch}
                  className="bg-black hover:bg-neutral-800 text-white text-xs font-semibold h-8 gap-1.5 px-3 rounded-lg shadow-sm border border-black"
                >
                  {isDownloadingBatch ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Printer className="h-3.5 w-3.5" />
                  )}
                  Batch Class Bundle (PDF)
                </Button>
              )}
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() =>
              fetchParentData({ refresh: true, showSuccessToast: true })
            }
            disabled={isLoading || isRefreshing}
            className="h-11 shrink-0 rounded-2xl border-neutral-300 bg-white px-5 text-sm font-semibold text-black shadow-xs hover:bg-neutral-50"
          >
            {isRefreshing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-5">
            <Skeleton className="h-28 rounded-[30px]" />
            <Skeleton className="h-56 rounded-[30px]" />
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
              <Skeleton className="h-[34rem] rounded-[30px]" />
              <div className="space-y-5">
                <Skeleton className="h-[16rem] rounded-[30px]" />
                <Skeleton className="h-[16rem] rounded-[30px]" />
              </div>
            </div>
          </div>
        ) : forbidden ? (
          <DataStateCard
            variant="forbidden"
            title="You don't have access to these results"
            description="You must be an administrator, class teacher, or parent of an enrolled learner to view results."
          />
        ) : resultGroups.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-14 text-center shadow-sm">
            <h2 className="text-base sm:text-xl font-bold text-slate-800">
              No published results yet
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">
              Results will appear here once the school publishes active
              spreadsheets for the learners in your class or linked to your account.
            </p>
          </div>
        ) : (
          <>
            {/* Search and Class Level Filter Bar (Mobile only, Desktop uses Top-Docked Bar) */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between md:hidden">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="search"
                  placeholder="Search by name or admission no."
                  aria-label="Search students"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 bg-white pl-10 md:text-sm"
                />
              </div>

              {availableClassOptions.length > 0 && (
                <div className="w-full sm:w-56">
                  <Select
                    value={selectedClassId}
                    onValueChange={(val) => setSelectedClassId(String(val ?? "all"))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Class Levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Class Levels</SelectItem>
                      {availableClassOptions.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {selectedGroup && (
              <section className="md:hidden">
                {/* Who these results belong to. A few children: full-name chips. A school's worth: a picker. */}
                {resultGroups.length > 1 && resultGroups.length <= 4 ? (
                  <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
                    {resultGroups.map((group) => {
                      const isActive = group.student.id === selectedGroup.student.id;
                      return (
                        <button
                          key={group.student.id}
                          type="button"
                          aria-pressed={isActive}
                          onClick={() => {
                            setSelectedStudentId(group.student.id);
                            setShowAllMobileSubjects(false);
                            setSelectedSubject(null);
                          }}
                          className={cn(
                            "min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold capitalize",
                            isActive ? "border-black bg-black text-white font-bold" : "border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50",
                          )}
                        >
                          {group.student.firstName} {group.student.lastName}
                        </button>
                      );
                    })}
                  </div>
                ) : resultGroups.length > 4 ? (
                  <Select
                    value={selectedGroup.student.id}
                    onValueChange={(val) => {
                      setSelectedStudentId(String(val));
                      setShowAllMobileSubjects(false);
                      setSelectedSubject(null);
                    }}
                  >
                    <SelectTrigger aria-label="Choose a learner" className="h-12 w-full rounded-xl bg-white capitalize">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(filteredResultGroups.length > 0 ? filteredResultGroups : resultGroups).map((group) => (
                        <SelectItem key={group.student.id} value={group.student.id} className="capitalize">
                          {group.student.firstName} {group.student.lastName}
                          {group.student.classLevel?.name ? ` · ${group.student.classLevel.name}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}

                <div className={cn("mt-4 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4", resultGroups.length > 4 ? "hidden" : "flex")}>
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-bold uppercase text-black border border-neutral-200">
                    {getInitials(`${selectedGroup.student.firstName} ${selectedGroup.student.lastName}`)}
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-bold capitalize text-slate-900">
                      {selectedGroup.student.firstName} {selectedGroup.student.lastName}
                    </h2>
                    <p className="truncate text-sm text-slate-600">
                      {selectedGroup.student.classLevel?.name || "Not in a class"}
                      <span className="mx-1.5 text-slate-300">·</span>
                      {getStudentRecordId(selectedGroup.student as StudentPerformanceResponse["student"])}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex items-baseline justify-between gap-3">
                  <h2 className="text-base font-semibold text-slate-900">Subjects</h2>
                  <p className="text-sm text-slate-500">{performanceSubjects.length} enrolled subjects</p>
                </div>

                <div className="mt-3 space-y-3">
                  {visibleMobileSubjects.map((subject) => {
                    const summary = getSubjectPerformanceSummary(subject);
                    const label = getSubjectRecordLabel(summary);
                    const inProgress = summary.enteredCount < summary.totalCount;

                    return (
                      <button
                        key={subject.spreadsheetId}
                        type="button"
                        onClick={() => setSelectedSubject(subject)}
                        className={cn(
                          "flex w-full flex-col gap-2 rounded-2xl border bg-white p-4 text-left",
                          inProgress
                            ? "border-dashed border-slate-300"
                            : "border-slate-200",
                        )}
                      >
                        <div className="flex w-full items-center gap-3">
                          {inProgress ? (
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-neutral-100 text-black">
                              <BookOpen className="h-6 w-6" />
                            </div>
                          ) : (
                            <MobileScoreRing percentage={summary.percentage} />
                          )}

                          <p className="min-w-0 flex-1 truncate text-base font-bold text-slate-950">
                            {getSubjectName(subject)}
                          </p>

                          <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
                        </div>

                        <div className="flex items-center justify-between gap-3 pl-[68px]">
                          <p className="min-w-0 truncate text-sm font-medium text-slate-500">
                            {inProgress
                              ? `${summary.enteredCount} of ${summary.totalCount} scores in · grading in progress`
                              : `${summary.enteredCount} of ${summary.totalCount} assessments`}
                          </p>

                          {inProgress ? null : (
                            <span
                              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${getMobileBadgeClass(label)}`}
                            >
                              {label}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}

                  {performanceSubjects.length > 4 && (
                    <button
                      type="button"
                      onClick={() => setShowAllMobileSubjects((value) => !value)}
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-neutral-300 bg-white text-sm font-bold text-black hover:bg-neutral-50"
                    >
                      {showAllMobileSubjects
                        ? "Show Less"
                        : `View ${performanceSubjects.length - 4} More Subjects`}
                      <ChevronDown
                        className={cn(
                          "h-5 w-5 transition-transform",
                          showAllMobileSubjects && "rotate-180",
                        )}
                      />
                    </button>
                  )}
                </div>

                <MobileSubjectBreakdown
                  subject={selectedSubject}
                  open={Boolean(selectedSubject)}
                  onOpenChange={(open) => {
                    if (!open) setSelectedSubject(null);
                  }}
                />
              </section>
            )}

            {/* ── Top-Docked Student Control Bar (Option 2 - Zero Scroll) ── */}
            {selectedGroup && (
              <div className="hidden md:flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  {/* Left: Active Student Info with Quick Dropdown */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-black text-base font-black text-white shadow-xs border border-black">
                      {getInitials(`${selectedGroup.student.firstName} ${selectedGroup.student.lastName}`)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Select
                          value={selectedGroup.student.id}
                          onValueChange={(val) => {
                            if (val) {
                              setSelectedStudentId(String(val));
                              setShowAllMobileSubjects(false);
                              setSelectedSubject(null);
                            }
                          }}
                        >
                          <SelectTrigger className="h-9 border-none p-0 text-xl font-bold text-slate-900 shadow-none hover:text-neutral-700 focus:ring-0 capitalize">
                            <span className="truncate max-w-[280px]">
                              {selectedGroup.student.firstName} {selectedGroup.student.lastName}
                            </span>
                          </SelectTrigger>
                          <SelectContent className="max-h-72">
                            {filteredResultGroups.map((group) => (
                              <SelectItem key={group.student.id} value={group.student.id} className="capitalize">
                                {group.student.firstName} {group.student.lastName}
                                {group.student.classLevel?.name ? ` · ${group.student.classLevel.name}` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>{selectedGroup.student.classLevel?.name || "Unassigned class"}</span>
                        <span>&middot;</span>
                        <span>{getStudentRecordId(selectedGroup.student as StudentPerformanceResponse["student"])}</span>
                        <span>&middot;</span>
                        <span className="font-semibold text-slate-900">{performanceSubjects.length} subjects</span>
                        <span>&middot;</span>
                        {selectedGroup.isTemplateApproved ? (
                          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                            ✓ Template Approved
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 text-[10px] font-bold">
                            Template Pending Approval
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Center: Stepper (Prev / Next Student) */}
                  {filteredResultGroups.length > 1 && (
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={!hasPrev}
                        onClick={handlePrev}
                        className="h-8 gap-1 rounded-xl px-3 text-xs font-semibold text-slate-700 hover:bg-white hover:shadow-xs disabled:opacity-40"
                        title="Previous student"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span>Prev</span>
                      </Button>
                      <span className="px-2.5 text-xs font-medium text-slate-500 tabular-nums">
                        <span className="font-bold text-slate-900">{currentIndex + 1}</span> of {filteredResultGroups.length}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={!hasNext}
                        onClick={handleNext}
                        className="h-8 gap-1 rounded-xl px-3 text-xs font-semibold text-slate-700 hover:bg-white hover:shadow-xs disabled:opacity-40"
                        title="Next student"
                      >
                        <span>Next</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {/* Right: Quick Actions (Print / PDF) & Browse Roster Button */}
                  <div className="flex items-center gap-2">
                    {/* Browse Full Roster Sheet */}
                    {resultGroups.length > 1 && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsRosterOpen(true)}
                          className="h-9 gap-2 rounded-xl border-neutral-300 bg-white px-3.5 text-xs font-semibold text-black hover:bg-neutral-50 shadow-xs"
                        >
                          <Users className="h-3.5 w-3.5 text-neutral-500" />
                          <span>Browse Roster</span>
                          <Badge variant="secondary" className="ml-0.5 h-5 rounded-full px-1.5 text-[10px] font-bold">
                            {filteredResultGroups.length}
                          </Badge>
                        </Button>
                        <Sheet open={isRosterOpen} onOpenChange={setIsRosterOpen}>
                          <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col h-full bg-white">
                            <SheetHeader className="p-6 border-b border-slate-100 pb-4">
                              <SheetTitle className="text-lg font-bold text-slate-900">
                                Student Roster ({filteredResultGroups.length})
                              </SheetTitle>
                              <SheetDescription className="text-xs text-slate-500">
                                Select a student to view their published academic record.
                              </SheetDescription>
                              <div className="mt-3 relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                <Input
                                  type="search"
                                  placeholder="Search roster..."
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                  className="h-9 pl-9 text-xs"
                                />
                              </div>
                            </SheetHeader>
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                              {filteredResultGroups.map((group) => {
                                const isCurrent = group.student.id === selectedGroup?.student.id;
                                return (
                                  <div
                                    key={group.student.id}
                                    className={cn(
                                      "group relative flex items-center justify-between gap-3 rounded-2xl border p-3 text-left transition-all",
                                      isCurrent
                                        ? "border-black bg-neutral-100 shadow-xs"
                                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                                    )}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedStudentId(group.student.id);
                                        setIsRosterOpen(false);
                                      }}
                                      className="flex flex-1 items-center gap-3 min-w-0 text-left"
                                    >
                                      <div
                                        className={cn(
                                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                                          isCurrent
                                            ? "bg-black text-white"
                                            : "bg-slate-100 text-slate-700"
                                        )}
                                      >
                                        {getInitials(`${group.student.firstName} ${group.student.lastName}`)}
                                      </div>
                                      <div className="min-w-0 flex-1 pr-2">
                                        <p className="truncate text-sm font-semibold capitalize text-slate-900">
                                          {group.student.firstName} {group.student.lastName}
                                        </p>
                                        <p className="truncate text-xs text-slate-500">
                                          {group.student.classLevel?.name || "Unassigned"} &middot; {group.results.length} subjects
                                        </p>
                                      </div>
                                    </button>
                                    {currentOrg?.slug && (
                                      <div className="flex items-center gap-1 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => setPrintModalGroup(group)}
                                          className="rounded-lg p-1.5 text-neutral-400 hover:text-black hover:bg-neutral-100"
                                          title="Print Report Card"
                                        >
                                          <Printer className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            void downloadReportCardPdf({
                                              orgSlug: currentOrg.slug,
                                              studentId: group.student.id,
                                              studentName: `${group.student.firstName} ${group.student.lastName}`,
                                              term: exportTerm,
                                              academicYear: exportYear,
                                            })
                                          }
                                          className="rounded-lg p-1.5 text-neutral-400 hover:text-black hover:bg-neutral-100"
                                          title="Download PDF"
                                        >
                                          <Download className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </SheetContent>
                        </Sheet>
                      </>
                    )}

                    {/* Print and Download for Active Student */}
                    {currentOrg?.slug && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setPrintModalGroup(selectedGroup)}
                          className="h-9 gap-1.5 rounded-xl border-black bg-black px-3.5 text-xs font-bold text-white hover:bg-neutral-800 shadow-xs transition-colors"
                          title="Print or preview report card"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          <span>Print Report</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            void downloadReportCardPdf({
                              orgSlug: currentOrg.slug,
                              studentId: selectedGroup.student.id,
                              studentName: `${selectedGroup.student.firstName} ${selectedGroup.student.lastName}`,
                              term: exportTerm,
                              academicYear: exportYear,
                            })
                          }
                          className="h-9 gap-1.5 rounded-xl border-neutral-300 bg-white px-3.5 text-xs font-semibold text-black hover:border-black hover:bg-neutral-50 shadow-xs transition-colors"
                          title="Download PDF"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>PDF</span>
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Bottom Row of Bar: Search and Class Filter */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="search"
                      placeholder="Search students by name or admission no..."
                      aria-label="Search students"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-9 bg-slate-50/60 pl-9 text-xs"
                    />
                  </div>
                  {availableClassOptions.length > 0 && (
                    <div className="w-48">
                      <Select
                        value={selectedClassId}
                        onValueChange={(val) => setSelectedClassId(String(val ?? "all"))}
                      >
                        <SelectTrigger className="h-9 text-xs bg-slate-50/60 border-slate-200">
                          <SelectValue placeholder="All Class Levels" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Class Levels</SelectItem>
                          {availableClassOptions.map((cls) => (
                            <SelectItem key={cls.id} value={cls.id}>
                              {cls.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Template Pending Approval Banner */}
            {selectedGroup && !selectedGroup.isTemplateApproved && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-2xs">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-200/80 text-amber-900 font-bold text-sm">
                    !
                  </div>
                  <div>
                    <p className="font-bold text-sm text-amber-950">
                      Result Template Pending Approval for {selectedGroup.student.classLevel?.name || "this class"}
                    </p>
                    <p className="text-amber-800 text-xs">
                      Official scores and positions become finalized once an administrator approves the template for this class.
                    </p>
                  </div>
                </div>
                {currentMember?.role !== "parent" && currentOrg?.slug && (
                  <Link
                    href={`/dashboard/school/${currentOrg.slug}/result-templates`}
                    className="shrink-0 self-start sm:self-center font-bold text-amber-900 underline hover:text-amber-950 text-xs"
                  >
                    Go to Result Templates &rarr;
                  </Link>
                )}
              </div>
            )}

            {/* Desktop Academic Record - Renders immediately at top of page! Zero scrolling! */}
            {selectedGroup && (
              <div className="hidden md:block">
                <StudentAcademicRecord
                  titlesPage={false}
                  student={
                    selectedGroup.student as StudentPerformanceResponse["student"]
                  }
                  subjects={performanceSubjects}
                  description="A visual summary of the published subject performance for this student, including assessment progress and recorded scores."
                  actionLabel="View Academic Record"
                  emptyTitle="No subject records available"
                  emptyDescription="The school has not published any subject spreadsheets for this student yet."
                />
              </div>
            )}

            {selectedNotifications.length > 0 && (
              <section className="hidden rounded-3xl border border-neutral-300 bg-white p-6 shadow-xs sm:p-8 md:block">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-black border border-neutral-200">
                      <AlertTriangle className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-neutral-500">
                        Alerts
                      </p>
                      <h2 className="mt-0.5 text-base sm:text-xl font-black text-black">
                        Low score notices
                      </h2>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="rounded-full border-black bg-black px-3 py-1 text-sm font-bold text-white"
                  >
                    {selectedNotifications.length} active
                  </Badge>
                </div>

                <div className="mt-5 grid gap-3 lg:grid-cols-2">
                  {selectedNotifications.map((notification) => (
                    <article
                      key={notification.id}
                      className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-black">
                            {notification.assessmentName}
                          </h3>
                          <p className="mt-1 text-sm leading-5 text-neutral-600">
                            {notification.message}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="shrink-0 rounded-full border-black bg-black px-2.5 py-0.5 text-xs font-black text-white tabular-nums"
                        >
                          {formatScore(notification.percentage)}%
                        </Badge>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-black">
                        <span className="rounded-full border border-neutral-300 bg-white px-3 py-1">
                          {notification.subject?.name || "Subject"}
                        </span>
                        <span className="rounded-full border border-neutral-300 bg-white px-3 py-1 tabular-nums">
                          {formatScore(notification.score)}/
                          {formatScore(notification.expectedTotal)}
                        </span>
                        {notification.updatedAt && (
                          <span className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-neutral-500 font-medium">
                            {format(
                              new Date(notification.updatedAt),
                              "MMM d, yyyy",
                            )}
                          </span>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {printModalGroup && currentOrg?.slug && (
              <ReportCardPrintModal
                orgSlug={currentOrg.slug}
                orgName={currentOrg.name}
                orgLogo={currentOrg.logo || undefined}
                orgAddress={currentOrg.address || undefined}
                orgEmail={currentOrg.email ? `Email: ${currentOrg.email}` : undefined}
                student={printModalGroup.student}
                term={exportTerm}
                academicYear={exportYear}
                classStudentCount={
                  resultGroups.filter(
                    (g) =>
                      g.student.classLevel?.id ===
                      printModalGroup.student.classLevel?.id
                  ).length || 17
                }
                results={printModalGroup.results
                  .filter((r) =>
                    r.values.some(
                      (v) => v !== null && v !== undefined && v !== "",
                    ),
                  )
                  .map((r) => {
                  const total = r.values.reduce<number>(
                    (sum, val) => sum + (toNumericValue(val) ?? 0),
                    0
                  );
                  const rounded = Math.round(total);
                  const gradeObj = computeNigerianGrade(rounded);

                  const assessmentsList = r.assessments?.length
                    ? r.assessments
                    : r.columns.map((c) => ({ name: c, total: undefined }));

                  let classExercises: number | string | null = null;
                  let assignments: number | string | null = null;
                  let periodicTests: number | string | null = null;
                  let examScore: number | string | null = null;

                  assessmentsList.forEach((a, idx) => {
                    const val = r.values[idx];
                    const numVal = toNumericValue(val);
                    const name = (a.name || "").toLowerCase();

                    if (
                      name.includes("exercise") ||
                      name.includes("ca 1") ||
                      name.includes("first ca") ||
                      name.includes("cw")
                    ) {
                      classExercises = numVal ?? val;
                    } else if (
                      name.includes("assign") ||
                      name.includes("homework") ||
                      name.includes("ca 2") ||
                      name.includes("hw")
                    ) {
                      assignments = numVal ?? val;
                    } else if (
                      name.includes("test") ||
                      name.includes("ca 3") ||
                      name.includes("periodic")
                    ) {
                      periodicTests = numVal ?? val;
                    } else if (name.includes("exam")) {
                      examScore = numVal ?? val;
                    } else if (idx === 0 && classExercises === null) {
                      classExercises = numVal ?? val;
                    } else if (idx === 1 && assignments === null) {
                      assignments = numVal ?? val;
                    } else if (idx === 2 && periodicTests === null) {
                      periodicTests = numVal ?? val;
                    } else if (idx === 3 && examScore === null) {
                      examScore = numVal ?? val;
                    }
                  });

                  const classScoresForSubject = resultGroups
                    .filter(
                      (g) =>
                        g.student.classLevel?.id ===
                        printModalGroup.student.classLevel?.id
                    )
                    .map((g) => {
                      const match = g.results.find(
                        (res) =>
                          res.id === r.id ||
                          res.title === r.title ||
                          res.subject?.name === r.subject?.name
                      );
                      if (!match) return null;
                      return match.values.reduce<number>(
                        (s, v) => s + (toNumericValue(v) ?? 0),
                        0
                      );
                    })
                    .filter((s): s is number => s !== null);

                  const highestScore =
                    classScoresForSubject.length > 0
                      ? Math.round(Math.max(...classScoresForSubject))
                      : 100;
                  const lowestScore =
                    classScoresForSubject.length > 0
                      ? Math.round(Math.min(...classScoresForSubject))
                      : 0;

                  return {
                    subject: r.subject?.name || r.title || "Subject",
                    score: rounded,
                    maxScore: 100,
                    grade: gradeObj.grade,
                    classExercises,
                    assignments,
                    periodicTests,
                    examScore,
                    highestScore,
                    lowestScore,
                  };
                })}
                onClose={() => setPrintModalGroup(null)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
