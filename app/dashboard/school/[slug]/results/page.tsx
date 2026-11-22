"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Loader2,
  Printer,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  downloadReportCardPdf,
  downloadReportCardBundle,
  openReportCardBundle,
  openReportCardPdf,
} from "@/lib/report-card-download";

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
import { apiFetch, isForbiddenError } from "@/lib/api";
import { formatScore, getInitials, toNumericValue } from "@/lib/spreadsheets";
import {
  formatAssessmentScore,
  getAssessmentPercentage,
  getOrderedStudentAssessments,
  getStudentRecordId,
  getSubjectName,
  getSubjectPerformanceSummary,
  getSubjectRecordLabel,
  hasEnteredScore,
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

function getMobileStatusTone(label: string) {
  const normalized = label.toLowerCase();
  if (normalized === "distinction") return "text-emerald-700";
  if (normalized === "merit") return "text-[#1447E6]";
  if (normalized === "grading in progress") return "text-amber-700";
  return "text-slate-600";
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-baseline justify-between gap-3 pr-8">
            <DialogTitle className="text-lg font-bold text-[#0B1220]">
              {getSubjectName(subject)}
            </DialogTitle>
            <span className="shrink-0 text-lg font-bold tabular-nums text-[#0B1220]">
              {summary.percentage === null ? "—" : `${Math.round(summary.percentage)}%`}
            </span>
          </div>
          <DialogDescription className="text-xs text-slate-600">
            <span className={cn("font-semibold", getMobileStatusTone(label))}>{label}</span>
            <span className="mx-1.5 text-slate-300">·</span>
            <span className="tabular-nums">
              {summary.enteredCount} of {summary.totalCount} assessments
            </span>
          </DialogDescription>
        </DialogHeader>

        <ul className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {assessments.map((assessment) => {
            const pct = getAssessmentPercentage(assessment);
            const entered = hasEnteredScore(assessment.score);

            return (
              <li
                key={`${subject.spreadsheetId}-${assessment.originalIndex}-${assessment.name}`}
                className="flex min-h-14 items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#0B1220]">
                    {assessment.name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {entered ? "Recorded" : "Pending"}
                  </p>
                </div>
                <div className="shrink-0 text-right tabular-nums">
                  <p className="text-sm font-bold text-[#0B1220]">
                    {entered
                      ? formatAssessmentScore(assessment.score, assessment.total)
                      : "—"}
                  </p>
                  {pct !== null && (
                    <p className="text-xs text-slate-500">{Math.round(pct)}%</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
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
  // Free-form to match how terms are stored (e.g. "First Term") — the PDF
  // export looks the stored result up by this exact string.
  const [exportTerm, setExportTerm] = useState("First Term");
  const [exportYear, setExportYear] = useState("2026/2027");
  // Which stored result the PDF exports render: mid-term (raw stage %) or
  // end-of-term (mid-term share + end-of-term components).
  const [exportResultType, setExportResultType] = useState<"MID_TERM" | "END_OF_TERM">("END_OF_TERM");
  // Term/year options come from the school's HCORE academic periods — free-text
  // terms silently computed as 0, so typing is no longer offered.
  const [periodOptions, setPeriodOptions] = useState<{ academicYear: string; term: string }[]>([]);
  // Computed template results for the selected term/year/type, shown per student.
  const [computedResults, setComputedResults] = useState<
    Record<string, { totalScore: number; grade: string; position: number | null; published: boolean }>
  >({});
  const [printModalGroup, setPrintModalGroup] = useState<StudentResultGroup | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("all");
  const [isDownloadingBatch, setIsDownloadingBatch] = useState(false);
  const [isRosterOpen, setIsRosterOpen] = useState(false);
  const [isMobileOptionsOpen, setIsMobileOptionsOpen] = useState(false);

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

  // Load the school's academic periods once so the term control is a real
  // select backed by HCORE instead of free text.
  useEffect(() => {
    if (!currentOrg?.slug) return;
    let cancelled = false;
    apiFetch<{ success: boolean; data: { academicYear: string; term: string }[] }>(
      `/result-templates/periods/${currentOrg.slug}`,
    )
      .then(({ data: periods }) => {
        if (!cancelled && Array.isArray(periods)) setPeriodOptions(periods);
      })
      .catch(() => {
        // Periods stay empty; the select falls back to the current values.
      });
    return () => {
      cancelled = true;
    };
  }, [currentOrg?.slug]);

  // Computed results for the selected term/year/type, keyed by student, so the
  // on-screen cards reflect the chosen result type (mid-term vs end-of-term).
  useEffect(() => {
    if (!currentOrg?.slug || !exportTerm || !exportYear) return;
    let cancelled = false;
    apiFetch<
      { success: boolean; data: {
        studentId: string;
        totalScore: number;
        grade: string;
        position: number | null;
        publishedAt: string | null;
      }[] }
    >(
      `/result-templates/results/${currentOrg.slug}?term=${encodeURIComponent(
        exportTerm,
      )}&academicYear=${encodeURIComponent(exportYear)}&resultType=${exportResultType}`,
    )
      .then(({ data: rows }) => {
        if (cancelled) return;
        const map: typeof computedResults = {};
        for (const row of rows || []) {
          map[row.studentId] = {
            totalScore: row.totalScore,
            grade: row.grade,
            position: row.position,
            published: Boolean(row.publishedAt),
          };
        }
        setComputedResults(map);
      })
      .catch(() => {
        if (!cancelled) setComputedResults({});
      });
    return () => {
      cancelled = true;
    };
  }, [currentOrg?.slug, exportTerm, exportYear, exportResultType]);

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

  const hasActiveSearchOrClassFilter =
    Boolean(searchQuery.trim()) || selectedClassId !== "all";

  const selectedGroup = useMemo(() => {
    const pool = hasActiveSearchOrClassFilter ? filteredResultGroups : resultGroups;
    return (
      pool.find((group) => group.student.id === selectedStudentId) ||
      pool[0] ||
      null
    );
  }, [filteredResultGroups, hasActiveSearchOrClassFilter, resultGroups, selectedStudentId]);

  // The selected student's computed result for the currently selected
  // term/year/result type (mid-term vs end-of-term), if one was computed.
  const computedResult = selectedGroup ? computedResults[selectedGroup.student.id] : undefined;

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

  const batchClassId = () =>
    selectedClassId !== "all"
      ? selectedClassId
      : resultGroups[0]?.student?.classLevel?.id;

  const handleBatchExport = async (mode: "download" | "view") => {
    const targetClassId = batchClassId();
    if (!targetClassId || !currentOrg?.slug) {
      toast.error("Please select a class level to export batch bundle.");
      return;
    }

    try {
      setIsDownloadingBatch(true);
      const options = {
        orgSlug: currentOrg.slug,
        classLevelId: targetClassId,
        className:
          availableClassOptions.find((c) => c.id === targetClassId)?.name ||
          selectedGroup?.student?.classLevel?.name ||
          "class",
        term: exportTerm,
        academicYear: exportYear,
        resultType: exportResultType,
      };
      if (mode === "view") {
        await openReportCardBundle(options);
      } else if (await downloadReportCardBundle(options)) {
        toast.success("Batch report cards PDF downloaded successfully!");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error opening batch report cards PDF");
    } finally {
      setIsDownloadingBatch(false);
    }
  };

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
    : performanceSubjects.slice(0, 6);

  const hasActiveMobileFilter =
    selectedClassId !== "all" || exportResultType === "MID_TERM";
  const canExportClassBundle =
    currentMember?.role !== "parent" &&
    Boolean(currentOrg?.slug) &&
    Boolean(resultGroups[0]?.student?.classLevel?.id || selectedClassId !== "all");

  return (
    <div className="min-h-full bg-slate-50/60 pb-16 md:bg-transparent md:pb-0">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 md:gap-6 md:px-6 md:py-8 lg:px-8">
        {/* Mobile Distilled Top Bar: current period context + single Filters/Export sheet trigger */}
        <div className="flex items-center justify-between gap-3 md:hidden">
          <p className="min-w-0 truncate text-xs font-semibold text-slate-600">
            <span className="text-[#0B1220]">{exportTerm}</span>
            <span className="mx-1.5 text-slate-300">·</span>
            <span className="tabular-nums">{exportYear}</span>
            <span className="mx-1.5 text-slate-300">·</span>
            <span>{exportResultType === "MID_TERM" ? "Mid-term" : "End-of-term"}</span>
          </p>
          <button
            type="button"
            onClick={() => setIsMobileOptionsOpen(true)}
            className="relative inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-[#0B1220] shadow-2xs transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1447E6]"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" />
            <span>Options</span>
            {hasActiveMobileFilter && (
              <span
                className="h-1.5 w-1.5 rounded-full bg-[#1447E6]"
                aria-label="Filters active"
              />
            )}
          </button>
        </div>

        {/* Mobile Options & Class Export Bottom Sheet */}
        <Sheet open={isMobileOptionsOpen} onOpenChange={setIsMobileOptionsOpen}>
          <SheetContent side="bottom" className="bg-white p-0 md:hidden">
            <SheetHeader className="border-b border-slate-100 px-5 pb-3 pt-5 text-left">
              <SheetTitle className="text-base font-bold text-[#0B1220]">
                {canExportClassBundle ? "Term, filters & export" : "Term & filters"}
              </SheetTitle>
              <SheetDescription className="text-xs text-slate-500">
                {canExportClassBundle
                  ? "Change academic period, filter by class, or export class report bundles."
                  : "Change academic period or switch report type."}
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 px-5 py-4">
              <div>
                <label
                  htmlFor="mobile-results-period"
                  className="mb-1.5 block text-xs font-semibold text-slate-700"
                >
                  Academic period
                </label>
                <select
                  id="mobile-results-period"
                  value={`${exportYear}|${exportTerm}`}
                  onChange={(e) => {
                    const [year, term] = e.target.value.split("|");
                    if (year && term) {
                      setExportYear(year);
                      setExportTerm(term);
                    }
                  }}
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-[#0B1220] outline-none focus:border-[#1447E6]"
                >
                  {periodOptions.length > 0 ? (
                    periodOptions.map((p) => (
                      <option key={`${p.academicYear}|${p.term}`} value={`${p.academicYear}|${p.term}`}>
                        {p.term} — {p.academicYear}
                      </option>
                    ))
                  ) : (
                    <option value={`${exportYear}|${exportTerm}`}>
                      {exportTerm} — {exportYear}
                    </option>
                  )}
                </select>
              </div>

              <div>
                <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Report type
                </span>
                <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    aria-pressed={exportResultType === "END_OF_TERM"}
                    onClick={() => setExportResultType("END_OF_TERM")}
                    className={cn(
                      "min-h-11 rounded-lg text-xs font-semibold transition-colors",
                      exportResultType === "END_OF_TERM"
                        ? "bg-white text-[#0B1220] shadow-2xs"
                        : "text-slate-600",
                    )}
                  >
                    End-of-term
                  </button>
                  <button
                    type="button"
                    aria-pressed={exportResultType === "MID_TERM"}
                    onClick={() => setExportResultType("MID_TERM")}
                    className={cn(
                      "min-h-11 rounded-lg text-xs font-semibold transition-colors",
                      exportResultType === "MID_TERM"
                        ? "bg-white text-[#0B1220] shadow-2xs"
                        : "text-slate-600",
                    )}
                  >
                    Mid-term
                  </button>
                </div>
              </div>

              {availableClassOptions.length > 0 && (
                <div>
                  <label
                    htmlFor="mobile-results-class"
                    className="mb-1.5 block text-xs font-semibold text-slate-700"
                  >
                    Class level
                  </label>
                  <select
                    id="mobile-results-class"
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value || "all")}
                    className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-[#0B1220] outline-none focus:border-[#1447E6]"
                  >
                    <option value="all">All Class Levels</option>
                    {availableClassOptions.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2 border-t border-slate-100 pt-3">
                {canExportClassBundle && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={isDownloadingBatch}
                      onClick={() => {
                        setIsMobileOptionsOpen(false);
                        void handleBatchExport("view");
                      }}
                      className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-[#0B1220] hover:bg-slate-50 disabled:opacity-60"
                    >
                      <Eye className="h-4 w-4 text-slate-500" aria-hidden="true" />
                      View bundle
                    </button>
                    <button
                      type="button"
                      disabled={isDownloadingBatch}
                      onClick={() => {
                        setIsMobileOptionsOpen(false);
                        void handleBatchExport("download");
                      }}
                      className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[#1447E6] px-3 text-xs font-semibold text-white hover:bg-[#0F36B8] disabled:opacity-60"
                    >
                      {isDownloadingBatch ? (
                        <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                      ) : (
                        <Download className="h-4 w-4" aria-hidden="true" />
                      )}
                      Download bundle
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  disabled={isLoading || isRefreshing}
                  onClick={() => {
                    setIsMobileOptionsOpen(false);
                    void fetchParentData({ refresh: true, showSuccessToast: true });
                  }}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  <RefreshCw
                    className={cn("h-4 w-4", isRefreshing && "animate-spin motion-reduce:animate-none")}
                    aria-hidden="true"
                  />
                  Refresh results
                </button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Desktop Header & Controls Row */}
        <div className="hidden md:flex md:flex-row md:items-start md:justify-between gap-4">
          <div className="w-full min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-[#0B1220] md:text-4xl">
              Published Results
            </h1>

            {/* Row 1: Period + Term Selects */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select
                value={`${exportYear}|${exportTerm}`}
                onChange={(e) => {
                  const [year, term] = e.target.value.split("|");
                  if (year && term) {
                    setExportYear(year);
                    setExportTerm(term);
                  }
                }}
                className="min-h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 shadow-2xs focus-visible:outline-2 focus-visible:outline-offset-2 md:pointer-fine:min-h-0 md:pointer-fine:h-10"
                aria-label="Academic period"
              >
                {periodOptions.length > 0 ? (
                  periodOptions.map((p) => (
                    <option key={`${p.academicYear}|${p.term}`} value={`${p.academicYear}|${p.term}`}>
                      {p.term} — {p.academicYear}
                    </option>
                  ))
                ) : (
                  <option value={`${exportYear}|${exportTerm}`}>
                    {exportTerm} — {exportYear}
                  </option>
                )}
              </select>

              <select
                value={exportResultType}
                onChange={(e) =>
                  setExportResultType(
                    e.target.value === "MID_TERM" ? "MID_TERM" : "END_OF_TERM",
                  )
                }
                className="min-h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 shadow-2xs focus-visible:outline-2 focus-visible:outline-offset-2 md:pointer-fine:min-h-0 md:pointer-fine:h-10"
                aria-label="Report type for PDF exports"
              >
                <option value="END_OF_TERM">End-of-term</option>
                <option value="MID_TERM">Mid-term</option>
              </select>

              {/* Desktop Button Bundle */}
              {canExportClassBundle && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => void handleBatchExport("view")}
                    disabled={isDownloadingBatch}
                    className="bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold h-9.5 gap-1.5 px-3 rounded-xl shadow-2xs border border-slate-200 cursor-pointer"
                    title="Open the class bundle PDF in a new tab"
                  >
                    <Eye className="size-4 text-slate-500" />
                    View Bundle
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void handleBatchExport("download")}
                    disabled={isDownloadingBatch}
                    className="bg-[#1447E6] hover:bg-[#0F36B8] text-white text-sm font-bold h-9.5 gap-1.5 px-3 rounded-xl shadow-xs border border-transparent cursor-pointer"
                  >
                    {isDownloadingBatch ? (
                      <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                    ) : (
                      <Printer className="size-4" />
                    )}
                    Download Bundle
                  </Button>
                </div>
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
            className="inline-flex h-9.5 shrink-0 rounded-xl border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
          >
            {isRefreshing ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
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
            {/* Mobile Distilled Search (only when there are multiple learners to search) */}
            {resultGroups.length > 1 && (
              <div className="relative md:hidden">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <Input
                  type="search"
                  placeholder="Find a learner"
                  aria-label="Search students"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 rounded-2xl border-slate-200 bg-white pl-10 text-base placeholder:text-slate-400"
                />
              </div>
            )}

            {!selectedGroup && hasActiveSearchOrClassFilter && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500">
                No learner matches that filter.
              </div>
            )}

            {selectedGroup && (
              <section className="space-y-4 md:hidden">
                {/* Learner switcher: horizontal pills for <= 4, clean stepper for > 4 */}
                {filteredResultGroups.length > 1 && filteredResultGroups.length <= 4 ? (
                  <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5">
                    {filteredResultGroups.map((group) => {
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
                            "min-h-11 shrink-0 rounded-full border px-4 text-xs font-semibold capitalize transition-colors motion-reduce:transition-none",
                            isActive
                              ? "border-[#1447E6] bg-[#1447E6] text-white"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                          )}
                        >
                          {group.student.firstName} {group.student.lastName}
                        </button>
                      );
                    })}
                  </div>
                ) : filteredResultGroups.length > 4 ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!hasPrev}
                      onClick={handlePrev}
                      aria-label="Previous learner"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 disabled:opacity-35"
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <Select
                        value={selectedGroup.student.id}
                        onValueChange={(val) => {
                          setSelectedStudentId(String(val));
                          setShowAllMobileSubjects(false);
                          setSelectedSubject(null);
                        }}
                      >
                        <SelectTrigger
                          aria-label="Choose a learner"
                          className="h-11 w-full rounded-xl border-slate-200 bg-white text-sm font-semibold capitalize"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredResultGroups.map((group) => (
                            <SelectItem key={group.student.id} value={group.student.id} className="capitalize">
                              {group.student.firstName} {group.student.lastName}
                              {group.student.classLevel?.name ? ` · ${group.student.classLevel.name}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <button
                      type="button"
                      disabled={!hasNext}
                      onClick={handleNext}
                      aria-label="Next learner"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 disabled:opacity-35"
                    >
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ) : null}

                {/* Distilled Learner Card with single primary CTA */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EEF0FF] text-sm font-bold uppercase text-[#1447E6]"
                    >
                      {getInitials(`${selectedGroup.student.firstName} ${selectedGroup.student.lastName}`)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-base font-bold capitalize text-[#0B1220]">
                        {selectedGroup.student.firstName} {selectedGroup.student.lastName}
                      </h2>
                      <p className="truncate text-xs text-slate-500">
                        {selectedGroup.student.classLevel?.name || "Unassigned"}
                        <span className="mx-1.5 text-slate-300">·</span>
                        {getStudentRecordId(selectedGroup.student as StudentPerformanceResponse["student"])}
                      </p>
                    </div>
                  </div>

                  {computedResult && (
                    <dl className="mt-3.5 grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 pt-3 text-center">
                      <div>
                        <dt className="text-xs text-slate-500">Score</dt>
                        <dd className="mt-0.5 text-base font-bold tabular-nums text-[#0B1220]">
                          {computedResult.totalScore}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Grade</dt>
                        <dd className="mt-0.5 text-base font-bold text-[#1447E6]">
                          {computedResult.grade}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Position</dt>
                        <dd className="mt-0.5 text-base font-bold tabular-nums text-[#0B1220]">
                          {computedResult.position ? `#${computedResult.position}` : "—"}
                        </dd>
                      </div>
                    </dl>
                  )}

                  {currentOrg?.slug && (
                    <Button
                      type="button"
                      onClick={() => setPrintModalGroup(selectedGroup)}
                      className="mt-3.5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1447E6] text-sm font-semibold text-white transition-colors hover:bg-[#0F36B8]"
                    >
                      <Printer className="h-4 w-4" aria-hidden="true" />
                      Print Report
                    </Button>
                  )}
                </div>

                {/* Quiet single-row pending notice on mobile */}
                {!selectedGroup.isTemplateApproved && (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 py-2.5 text-xs text-amber-950">
                    <span className="min-w-0 font-medium">
                      Template pending approval for {selectedGroup.student.classLevel?.name || "this class"}.
                    </span>
                    {currentMember?.role !== "parent" && currentOrg?.slug && (
                      <Link
                        href={`/dashboard/school/${currentOrg.slug}/result-templates`}
                        className="-my-2 -mr-2 inline-flex min-h-11 shrink-0 items-center px-2.5 font-semibold text-amber-950 underline underline-offset-2"
                      >
                        Approve
                      </Link>
                    )}
                  </div>
                )}

                {/* Distilled Subjects List */}
                <div>
                  <div className="mb-2.5 flex items-baseline justify-between gap-3 px-0.5">
                    <h2 className="text-sm font-bold text-[#0B1220]">Subjects</h2>
                    <span className="text-xs font-medium tabular-nums text-slate-500">
                      {performanceSubjects.length}
                    </span>
                  </div>

                  {performanceSubjects.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500">
                      No subject scores recorded yet.
                    </div>
                  ) : (
                    <>
                      <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
                        {visibleMobileSubjects.map((subject) => {
                          const summary = getSubjectPerformanceSummary(subject);
                          const label = getSubjectRecordLabel(summary);
                          const inProgress = summary.enteredCount < summary.totalCount;

                          return (
                            <li key={subject.spreadsheetId}>
                              <button
                                type="button"
                                onClick={() => setSelectedSubject(subject)}
                                className="flex min-h-[60px] w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50/70 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#1447E6] motion-reduce:transition-none"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[15px] font-semibold text-[#0B1220]">
                                    {getSubjectName(subject)}
                                  </p>
                                  <p className="mt-0.5 truncate text-xs text-slate-500 tabular-nums">
                                    {inProgress ? (
                                      `${summary.enteredCount}/${summary.totalCount} entered · In progress`
                                    ) : (
                                      <>
                                        <span>
                                          {summary.enteredCount}/{summary.totalCount} assessments
                                        </span>
                                        <span className="mx-1.5 text-slate-300">·</span>
                                        <span className={cn("font-semibold", getMobileStatusTone(label))}>
                                          {label}
                                        </span>
                                      </>
                                    )}
                                  </p>
                                </div>

                                <div className="flex shrink-0 items-center gap-2">
                                  <span
                                    className={cn(
                                      "text-[15px] font-bold tabular-nums",
                                      inProgress || summary.percentage === null
                                        ? "text-xs font-medium text-slate-500"
                                        : "text-[#0B1220]",
                                    )}
                                  >
                                    {inProgress || summary.percentage === null
                                      ? "Grading"
                                      : `${Math.round(summary.percentage)}%`}
                                  </span>
                                  <ChevronRight
                                    className="h-4 w-4 shrink-0 text-slate-400"
                                    aria-hidden="true"
                                  />
                                </div>
                              </button>
                            </li>
                          );
                        })}
                      </ul>

                      {performanceSubjects.length > 6 && (
                        <button
                          type="button"
                          onClick={() => setShowAllMobileSubjects((value) => !value)}
                          className="mt-2.5 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                        >
                          {showAllMobileSubjects
                            ? "Show fewer"
                            : `Show all ${performanceSubjects.length} subjects`}
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 transition-transform motion-reduce:transition-none",
                              showAllMobileSubjects && "rotate-180",
                            )}
                            aria-hidden="true"
                          />
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Distilled Low-Score Notices (native progressive disclosure on mobile) */}
                {selectedNotifications.length > 0 && (
                  <details className="group rounded-2xl border border-rose-200 bg-white">
                    <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left marker:hidden [&::-webkit-details-marker]:hidden">
                      <span className="flex items-center gap-2 text-sm font-semibold text-rose-700">
                        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {selectedNotifications.length}{" "}
                        {selectedNotifications.length === 1 ? "low-score notice" : "low-score notices"}
                      </span>
                      <ChevronDown
                        className="h-4 w-4 shrink-0 text-rose-500 transition-transform group-open:rotate-180 motion-reduce:transition-none"
                        aria-hidden="true"
                      />
                    </summary>
                    <ul className="divide-y divide-slate-100 border-t border-rose-100">
                      {selectedNotifications.map((notification) => (
                        <li key={notification.id} className="px-4 py-3">
                          <div className="flex items-baseline justify-between gap-3">
                            <p className="truncate text-sm font-semibold text-[#0B1220]">
                              {notification.subject?.name || "Subject"} · {notification.assessmentName}
                            </p>
                            <span className="shrink-0 text-xs font-bold tabular-nums text-rose-700">
                              {formatScore(notification.score)}/{formatScore(notification.expectedTotal)} (
                              {formatScore(notification.percentage)}%)
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-5 text-slate-600">
                            {notification.message}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}

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
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-base font-black text-[#1447E6] shadow-2xs border border-blue-200">
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
                        <span className="font-semibold text-slate-900">
                          {`${performanceSubjects.length} ${performanceSubjects.length === 1 ? "subject" : "subjects"}`}
                        </span>
                        <span>&middot;</span>
                        {selectedGroup.isTemplateApproved ? (
                          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-bold">
                            ✓ Template Approved
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800 text-xs font-bold">
                            Template Pending Approval
                          </Badge>
                        )}
                        {computedResult && (
                          <Badge variant="outline" className="border-blue-200 bg-blue-50 text-[#1447E6] text-xs font-bold">
                            {exportResultType === "MID_TERM" ? "Mid-term" : "End-of-term"}:{" "}
                            {computedResult.totalScore} · {computedResult.grade}
                            {computedResult.position ? ` · #${computedResult.position}` : ""}
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
                          className="h-9 gap-2 rounded-xl border-neutral-300 bg-white px-3.5 text-sm font-semibold text-black hover:bg-neutral-50 shadow-xs"
                        >
                          <Users className="h-3.5 w-3.5 text-neutral-500" />
                          <span>Browse Roster</span>
                          <Badge variant="secondary" className="ml-0.5 h-5 rounded-full px-1.5 text-xs font-bold">
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
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-600" />
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
                                          className="rounded-lg p-1.5 text-neutral-600 hover:text-black hover:bg-neutral-100"
                                          title="Print Report Card"
                                          aria-label={`Print report card for ${group.student.firstName} ${group.student.lastName}`}
                                        >
                                          <Printer className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            void openReportCardPdf({
                                              orgSlug: currentOrg.slug,
                                              studentId: group.student.id,
                                              studentName: `${group.student.firstName} ${group.student.lastName}`,
                                              term: exportTerm,
                                              academicYear: exportYear,
                                              resultType: exportResultType,
                                            })
                                          }
                                          className="rounded-lg p-1.5 text-neutral-600 hover:text-black hover:bg-neutral-100"
                                          title="View PDF"
                                          aria-label={`View PDF report card for ${group.student.firstName} ${group.student.lastName}`}
                                        >
                                          <Eye className="h-3.5 w-3.5" />
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
                                              resultType: exportResultType,
                                            })
                                          }
                                          className="rounded-lg p-1.5 text-neutral-600 hover:text-black hover:bg-neutral-100"
                                          title="Download PDF"
                                          aria-label={`Download PDF report card for ${group.student.firstName} ${group.student.lastName}`}
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
                          className="h-9 gap-1.5 rounded-xl bg-[#1447E6] px-3.5 text-xs sm:text-sm font-bold text-white hover:bg-[#1447E6]/90 shadow-xs cursor-pointer"
                          title="Print or preview report card"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          <span>Print Report</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            void openReportCardPdf({
                              orgSlug: currentOrg.slug,
                              studentId: selectedGroup.student.id,
                              studentName: `${selectedGroup.student.firstName} ${selectedGroup.student.lastName}`,
                              term: exportTerm,
                              academicYear: exportYear,
                              resultType: exportResultType,
                            })
                          }
                          className="h-9 gap-1.5 rounded-xl border-slate-200 bg-white px-3 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer"
                          title="View PDF in a new tab"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View</span>
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
                              resultType: exportResultType,
                            })
                          }
                          className="h-9 gap-1.5 rounded-xl border-slate-200 bg-white px-3 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer"
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
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-600" />
                    <Input
                      type="search"
                      placeholder="Search students by name or admission no..."
                      aria-label="Search students"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-12 bg-slate-50/60 pl-9 text-sm placeholder:text-slate-600"
                    />
                  </div>
                  {availableClassOptions.length > 0 && (
                    <div className="w-48">
                      <Select
                        value={selectedClassId}
                        onValueChange={(val) => setSelectedClassId(String(val ?? "all"))}
                      >
                        <SelectTrigger aria-label="Class level" className="border-slate-300 bg-slate-50/60 text-sm">
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

            {/* Desktop Template Pending Approval Banner (mobile uses concise inline notice above) */}
            {selectedGroup && !selectedGroup.isTemplateApproved && (
              <div className="hidden md:flex rounded-2xl border border-amber-200 bg-amber-50/80 p-4 flex-row items-center justify-between gap-3 text-xs text-amber-900 shadow-2xs">
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
                  actionLabel=""
                  emptyTitle="No subject records available"
                  emptyDescription="The school has not published any subject spreadsheets for this student yet."
                />
              </div>
            )}

            {selectedNotifications.length > 0 && (
              <section className="hidden md:block rounded-3xl border border-red-200/80 bg-white p-6 shadow-xs">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600">
                      <AlertTriangle className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                        Alerts
                      </p>
                      <h2 className="mt-0.5 text-base sm:text-xl font-bold text-[#0B1220]">
                        Low score notices
                      </h2>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="self-start sm:self-auto rounded-full border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700"
                  >
                    {selectedNotifications.length} active
                  </Badge>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {selectedNotifications.map((notification) => (
                    <article
                      key={notification.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-[#0B1220]">
                            {notification.assessmentName}
                          </h3>
                          <p className="mt-1 text-sm leading-5 text-slate-600">
                            {notification.message}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="shrink-0 rounded-full border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-700 tabular-nums"
                        >
                          {formatScore(notification.percentage)}%
                        </Badge>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700">
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                          {notification.subject?.name || "Subject"}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 tabular-nums">
                          {formatScore(notification.score)}/
                          {formatScore(notification.expectedTotal)}
                        </span>
                        {notification.updatedAt && (
                          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-500 font-medium">
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
                resultType={exportResultType}
                classStudentCount={Math.max(
                  1,
                  resultGroups.filter(
                    (g) =>
                      g.student.classLevel?.id ===
                      printModalGroup.student.classLevel?.id
                  ).length,
                )}
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
