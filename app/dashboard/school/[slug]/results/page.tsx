"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileSpreadsheet,
  LayoutGrid,
  Loader2,
  Printer,
  RefreshCw,
  Search,
  SlidersHorizontal,
  UserCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  downloadBroadsheetExport,
  downloadReportCardBundle,
  downloadReportCardPdf,
  openReportCardBundle,
  openReportCardPdf,
} from "@/lib/report-card-download";

import ReportCardPrintModal, {
  computeNigerianGrade,
} from "@/components/results/ReportCardPrintModal";
import { ResultsBrandHeader } from "@/components/results/ResultsBrandHeader";
import { ResultEditionsCatalog } from "@/components/results/ResultEditionsCatalog";
import { ResultsOverviewKpis } from "@/components/results/ResultsOverviewKpis";
import { AllStudentsResultsTable } from "@/components/results/AllStudentsResultsTable";
import { SubjectPerformanceMatrix } from "@/components/results/SubjectPerformanceMatrix";
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
import {
  buildStudentOverviewRows,
  computeOverviewKpis,
  exportOverviewRowsToCsv,
  filterOverviewRows,
  formatEditionTitle,
  type CompletionFilter,
  type EditionChildSummary,
  type PerformanceBand,
  type ResultEdition,
  type ResultSheet,
  type ResultStage,
  type StudentResultGroup,
} from "@/lib/results-overview";
import { cn } from "@/lib/utils";

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

type EditionsApiResponse = {
  roleScope: "staff" | "parent";
  children?: EditionChildSummary[];
  editions: ResultEdition[];
};

type OverviewTab = "all" | "matrix" | "individual";

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
        : classLevelName
          ? { name: classLevelName }
          : null,
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
  if (normalized === "merit") return "text-[var(--primary-text)]";
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
  const isParent = currentMember?.role === "parent";

  const [resultGroups, setResultGroups] = useState<StudentResultGroup[]>([]);
  const [notifications, setNotifications] = useState<ParentNotification[]>([]);
  // ?student=<id> preselects a learner and opens Level 3 directly when deep-linked.
  const [selectedStudentId, setSelectedStudentId] = useState(() =>
    typeof window === "undefined"
      ? ""
      : new URLSearchParams(window.location.search).get("student") ?? "",
  );
  const [hasSelectedEdition, setHasSelectedEdition] = useState(() => {
    if (typeof window === "undefined") return false;
    const sp = new URLSearchParams(window.location.search);
    return Boolean(sp.get("student") || sp.get("edition") || sp.get("view"));
  });
  const [activeOverviewTab, setActiveOverviewTab] = useState<OverviewTab>(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("student")) return "individual";
    }
    return "all";
  });

  const [editions, setEditions] = useState<ResultEdition[]>([]);
  const [parentChildren, setParentChildren] = useState<EditionChildSummary[]>([]);
  const [selectedParentChildId, setSelectedParentChildId] = useState<string>("");
  const [isLoadingEditions, setIsLoadingEditions] = useState<boolean>(true);

  const [selectedSubject, setSelectedSubject] =
    useState<StudentPerformanceSubject | null>(null);
  const [showAllMobileSubjects, setShowAllMobileSubjects] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  const [exportTerm, setExportTerm] = useState("First Term");
  const [exportYear, setExportYear] = useState("2026/2027");
  const [exportResultType, setExportResultType] =
    useState<ResultStage>("END_OF_TERM");
  const [periodOptions, setPeriodOptions] = useState<
    { academicYear: string; term: string }[]
  >([]);
  const [computedResults, setComputedResults] = useState<
    Record<
      string,
      {
        totalScore: number;
        grade: string;
        position: number | null;
        published: boolean;
      }
    >
  >({});
  const [printModalStudentId, setPrintModalStudentId] = useState<string | null>(
    null,
  );
  const [isSwitchingStage, setIsSwitchingStage] = useState(false);
  const fetchSeqRef = useRef(0);
  const hasLoadedOnceRef = useRef(false);

  // Overview filters & selection state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("all");
  const [statusFilter, setStatusFilter] = useState<CompletionFilter>("all");
  const [performanceFilter, setPerformanceFilter] =
    useState<PerformanceBand>("all");
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(
    () => new Set(),
  );

  const [isDownloadingBatch, setIsDownloadingBatch] = useState(false);
  const [isExportingBroadsheet, setIsExportingBroadsheet] = useState(false);
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
      const fullName =
        `${group.student.firstName} ${group.student.lastName}`.toLowerCase();
      const admNum = (group.student.admissionNumber || "").toLowerCase();
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query || fullName.includes(query) || admNum.includes(query);

      return matchesClass && matchesSearch;
    });
  }, [resultGroups, selectedClassId, searchQuery]);

  // Load Result Editions Catalog for Level 1. The catalog is an enhancement:
  // when the endpoint is missing the page synthesizes editions instead, so the
  // request never toasts. `catalogRefreshKey` re-runs it from the Refresh action.
  const [catalogRefreshKey, setCatalogRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    async function loadCatalog() {
      if (!currentOrg || !currentMember) return;
      try {
        const response = await apiFetch<EditionsApiResponse>(
          `/spreadsheets/${currentOrg.slug}/results/editions`,
          { showErrorToast: false },
        );
        if (!active) return;
        const fetchedEditions = Array.isArray(response?.editions)
          ? response.editions
          : [];
        setEditions(fetchedEditions);

        const children = Array.isArray(response?.children)
          ? response.children
          : [];
        setParentChildren(children);
        if (children.length > 0) {
          setSelectedParentChildId((prev) => prev || children[0].id);
        }
      } catch {
        // Fallback to synthesized editions from resultGroups / periodOptions
      } finally {
        if (active) setIsLoadingEditions(false);
      }
    }
    void loadCatalog();
    return () => {
      active = false;
    };
  }, [currentOrg, currentMember, catalogRefreshKey]);

  const fetchParentData = useCallback(
    async ({ refresh = false, showSuccessToast = false } = {}) => {
      const seq = ++fetchSeqRef.current;
      if (!currentOrg || !currentMember) {
        setResultGroups([]);
        setNotifications([]);
        setSelectedStudentId("");
        setIsLoading(false);
        setIsRefreshing(false);
        setIsSwitchingStage(false);
        return;
      }

      try {
        if (refresh) {
          setIsRefreshing(true);
        } else if (hasLoadedOnceRef.current) {
          setIsSwitchingStage(true);
        } else {
          setIsLoading(true);
        }
        setForbidden(false);

        const [resultsData, notificationsData] = await Promise.all([
          apiFetch<StudentResultGroup[]>(
            `/spreadsheets/${currentOrg.slug}/results`,
            {
              params: {
                resultType: exportResultType,
                term: exportTerm,
                academicYear: exportYear,
              },
            },
          ),
          apiFetch<ParentNotification[]>(
            `/spreadsheets/${currentOrg.slug}/notifications`,
          ).catch(() => []),
        ]);

        if (seq !== fetchSeqRef.current) return;

        hasLoadedOnceRef.current = true;
        setResultGroups(resultsData || []);
        setNotifications(notificationsData || []);

        if (showSuccessToast) {
          toast.success("Results refreshed");
        }
      } catch (error) {
        if (seq !== fetchSeqRef.current) return;
        if (isForbiddenError(error)) {
          setForbidden(true);
        } else {
          toast.error(getErrorMessage(error, "Failed to load results"));
        }
      } finally {
        if (seq === fetchSeqRef.current) {
          setIsRefreshing(false);
          setIsSwitchingStage(false);
          setIsLoading(false);
        }
      }
    },
    [currentOrg, currentMember, exportResultType, exportTerm, exportYear],
  );

  useEffect(() => {
    void fetchParentData();
  }, [fetchParentData]);

  useEffect(() => {
    if (!currentOrg?.slug) return;
    let cancelled = false;
    apiFetch<{
      success: boolean;
      data: { academicYear: string; term: string }[];
    }>(`/result-templates/periods/${currentOrg.slug}`)
      .then(({ data: periods }) => {
        if (!cancelled && Array.isArray(periods)) setPeriodOptions(periods);
      })
      .catch(() => {
        // Keep fallback
      });
    return () => {
      cancelled = true;
    };
  }, [currentOrg?.slug]);

  useEffect(() => {
    if (!currentOrg?.slug || !exportTerm || !exportYear) return;
    let cancelled = false;
    apiFetch<{
      success: boolean;
      data: {
        studentId: string;
        totalScore: number;
        grade: string;
        position: number | null;
        publishedAt: string | null;
      }[];
    }>(
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

  // Normalized overview rows + KPIs for Level 2 General Results Overview
  const allOverviewRows = useMemo(
    () => buildStudentOverviewRows(resultGroups, computedResults),
    [resultGroups, computedResults],
  );

  const classScopedOverviewRows = useMemo(
    () =>
      filterOverviewRows(allOverviewRows, {
        classId: selectedClassId,
        status: "all",
        performance: "all",
        search: "",
      }),
    [allOverviewRows, selectedClassId],
  );

  const filteredOverviewRows = useMemo(
    () =>
      filterOverviewRows(allOverviewRows, {
        classId: selectedClassId,
        status: statusFilter,
        performance: performanceFilter,
        search: searchQuery,
      }),
    [
      allOverviewRows,
      selectedClassId,
      statusFilter,
      performanceFilter,
      searchQuery,
    ],
  );

  // Mid-term average from editions catalog (when viewing End-of-term) for KPI delta
  const midTermComparisonAverage = useMemo(() => {
    if (exportResultType !== "END_OF_TERM") return null;
    const match = editions.find(
      (ed) =>
        ed.academicYear === exportYear &&
        ed.academicTerm === exportTerm &&
        ed.resultType === "MID_TERM",
    );
    return typeof match?.averageScore === "number" ? match.averageScore : null;
  }, [editions, exportResultType, exportTerm, exportYear]);

  const overviewKpis = useMemo(
    () =>
      computeOverviewKpis(classScopedOverviewRows, midTermComparisonAverage),
    [classScopedOverviewRows, midTermComparisonAverage],
  );

  // Effective editions list (uses /results/editions or synthesizes from loaded data)
  const effectiveEditions = useMemo<ResultEdition[]>(() => {
    if (editions.length > 0) {
      if (isParent && selectedParentChildId) {
        const childScoped = editions.filter(
          (ed) =>
            !Array.isArray(ed.studentIds) ||
            ed.studentIds.length === 0 ||
            ed.studentIds.includes(selectedParentChildId),
        );
        if (childScoped.length > 0) return childScoped;
      }
      return editions;
    }

    if (resultGroups.length === 0) return [];

    const kpis = computeOverviewKpis(allOverviewRows);
    const basePeriods =
      periodOptions.length > 0
        ? periodOptions
        : [{ academicYear: exportYear, term: exportTerm }];

    const synthesized: ResultEdition[] = [];
    for (const p of basePeriods) {
      const stages: ResultStage[] = ["END_OF_TERM", "MID_TERM"];
      for (const st of stages) {
        synthesized.push({
          key: `${p.academicYear}|${p.term}|${st}`,
          academicYear: p.academicYear,
          academicTerm: p.term,
          resultType: st,
          title: formatEditionTitle(p.term, st),
          totalStudents: kpis.totalLearners,
          recordedCount: kpis.recordedCount,
          incompleteCount: kpis.incompleteCount,
          pendingCount: kpis.pendingCount,
          averageScore: kpis.classAverage,
          classCount: availableClassOptions.length || 1,
          subjectCount: resultGroups[0]?.results?.length ?? 0,
          isPublished: kpis.recordedCount > 0,
        });
      }
    }
    return synthesized;
  }, [
    editions,
    isParent,
    selectedParentChildId,
    resultGroups,
    allOverviewRows,
    periodOptions,
    exportYear,
    exportTerm,
    availableClassOptions.length,
  ]);

  const effectiveParentChildren = useMemo<EditionChildSummary[]>(() => {
    if (parentChildren.length > 0) return parentChildren;
    if (!isParent || resultGroups.length <= 1) return [];
    return resultGroups.map((g) => ({
      id: g.student.id,
      firstName: g.student.firstName,
      lastName: g.student.lastName,
      admissionNumber: g.student.admissionNumber,
      classLevel: g.student.classLevel ?? null,
    }));
  }, [parentChildren, isParent, resultGroups]);

  const handleSelectEdition = useCallback(
    (edition: ResultEdition) => {
      setExportYear(edition.academicYear);
      setExportTerm(edition.academicTerm);
      setExportResultType(edition.resultType);
      if (isParent && selectedParentChildId) {
        setSelectedStudentId(selectedParentChildId);
      } else if (
        Array.isArray(edition.studentIds) &&
        edition.studentIds.length === 1
      ) {
        setSelectedStudentId(edition.studentIds[0]);
      }
      setActiveOverviewTab(isParent ? "individual" : "all");
      setHasSelectedEdition(true);
    },
    [isParent, selectedParentChildId],
  );

  const hasActiveSearchOrClassFilter =
    Boolean(searchQuery.trim()) || selectedClassId !== "all";

  const selectedGroup = useMemo(() => {
    const pool = hasActiveSearchOrClassFilter
      ? filteredResultGroups
      : resultGroups;
    return (
      pool.find((group) => group.student.id === selectedStudentId) ||
      pool[0] ||
      null
    );
  }, [
    filteredResultGroups,
    hasActiveSearchOrClassFilter,
    resultGroups,
    selectedStudentId,
  ]);

  const computedResult = selectedGroup
    ? computedResults[selectedGroup.student.id]
    : undefined;

  const printModalGroup = useMemo(
    () =>
      printModalStudentId
        ? resultGroups.find(
            (group) => group.student.id === printModalStudentId,
          ) ?? null
        : null,
    [printModalStudentId, resultGroups],
  );
  const activeStageLabel =
    exportResultType === "MID_TERM" ? "mid-term" : "end-of-term";

  const currentIndex = useMemo(() => {
    if (!selectedGroup) return -1;
    return filteredResultGroups.findIndex(
      (g) => g.student.id === selectedGroup.student.id,
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
      toast.error(
        err instanceof Error
          ? err.message
          : "Error opening batch report cards PDF",
      );
    } finally {
      setIsDownloadingBatch(false);
    }
  };

  const handleExportCsvOrExcel = async () => {
    if (!currentOrg?.slug) return;
    const targetClassId = batchClassId();
    const className =
      availableClassOptions.find((c) => c.id === targetClassId)?.name ||
      "all-classes";

    if (targetClassId) {
      try {
        setIsExportingBroadsheet(true);
        const ok = await downloadBroadsheetExport({
          orgSlug: currentOrg.slug,
          format: "xlsx",
          classLevelId: targetClassId,
          className,
          term: exportTerm,
          academicYear: exportYear,
        });
        if (ok) {
          toast.success("Excel broadsheet downloaded");
          return;
        }
      } finally {
        setIsExportingBroadsheet(false);
      }
    }

    // Immediate client-side CSV export fallback for current filtered overview rows
    exportOverviewRowsToCsv(
      filteredOverviewRows,
      `${currentOrg.slug}-${exportTerm}-${exportResultType}-overview.csv`,
    );
    toast.success("Overview CSV exported");
  };

  const handleToggleSelectRow = useCallback((studentId: string) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  }, []);

  const handleToggleSelectAllRows = useCallback((studentIds: string[]) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      const allSelected =
        studentIds.length > 0 && studentIds.every((id) => next.has(id));
      if (allSelected) {
        for (const id of studentIds) next.delete(id);
      } else {
        for (const id of studentIds) next.add(id);
      }
      return next;
    });
  }, []);

  const handleOpenIndividualStudent = useCallback((studentId: string) => {
    setSelectedStudentId(studentId);
    setShowAllMobileSubjects(false);
    setSelectedSubject(null);
    setActiveOverviewTab("individual");
  }, []);

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
    selectedClassId !== "all" ||
    statusFilter !== "all" ||
    performanceFilter !== "all" ||
    exportResultType === "MID_TERM";
  const canExportClassBundle =
    !isParent &&
    Boolean(currentOrg?.slug) &&
    Boolean(
      resultGroups[0]?.student?.classLevel?.id || selectedClassId !== "all",
    );

  const selectedClassLabel =
    selectedClassId !== "all"
      ? availableClassOptions.find((c) => c.id === selectedClassId)?.name ||
        "Selected Class"
      : availableClassOptions.length === 1
        ? availableClassOptions[0].name
        : "All Classes";

  const currentEditionTitle = formatEditionTitle(exportTerm, exportResultType);

  return (
    <div className="min-h-full bg-slate-50/60 pb-16 md:bg-transparent md:pb-0">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 md:gap-6 md:px-6 md:py-8 lg:px-8">
        {/* Mobile Options & Class Export Bottom Sheet */}
        <Sheet open={isMobileOptionsOpen} onOpenChange={setIsMobileOptionsOpen}>
          <SheetContent side="bottom" className="bg-white p-0 md:hidden">
            <SheetHeader className="border-b border-slate-100 px-5 pb-3 pt-5 text-left">
              <SheetTitle className="text-base font-bold text-[#0B1220]">
                {canExportClassBundle
                  ? "Term, filters & export"
                  : "Term & filters"}
              </SheetTitle>
              <SheetDescription className="text-xs text-slate-500">
                {canExportClassBundle
                  ? "Change academic period, filter by class or status, or export class report bundles."
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
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-[#0B1220] outline-none focus:border-[var(--primary)]"
                >
                  {periodOptions.length > 0 ? (
                    periodOptions.map((p) => (
                      <option
                        key={`${p.academicYear}|${p.term}`}
                        value={`${p.academicYear}|${p.term}`}
                      >
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
                <div
                  role="group"
                  aria-label="Report type"
                  className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 p-1"
                >
                  <button
                    type="button"
                    aria-pressed={exportResultType === "END_OF_TERM"}
                    onClick={() => setExportResultType("END_OF_TERM")}
                    className="min-h-11 rounded-lg text-xs font-semibold text-slate-600 transition-colors hover:text-[#0B1220] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] aria-pressed:bg-[var(--primary)] aria-pressed:text-[var(--primary-foreground)] aria-pressed:shadow-2xs motion-reduce:transition-none"
                  >
                    End-of-term
                  </button>
                  <button
                    type="button"
                    aria-pressed={exportResultType === "MID_TERM"}
                    onClick={() => setExportResultType("MID_TERM")}
                    className="min-h-11 rounded-lg text-xs font-semibold text-slate-600 transition-colors hover:text-[#0B1220] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] aria-pressed:bg-[var(--primary)] aria-pressed:text-[var(--primary-foreground)] aria-pressed:shadow-2xs motion-reduce:transition-none"
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
                    onChange={(e) =>
                      setSelectedClassId(e.target.value || "all")
                    }
                    className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-[#0B1220] outline-none focus:border-[var(--primary)]"
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

              {!isParent && (
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label
                      htmlFor="mobile-results-status"
                      className="mb-1.5 block text-xs font-semibold text-slate-700"
                    >
                      Status
                    </label>
                    <select
                      id="mobile-results-status"
                      value={statusFilter}
                      onChange={(e) =>
                        setStatusFilter(e.target.value as CompletionFilter)
                      }
                      className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium text-[#0B1220]"
                    >
                      <option value="all">All Statuses</option>
                      <option value="recorded">Recorded</option>
                      <option value="draft">Incomplete</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="mobile-results-performance"
                      className="mb-1.5 block text-xs font-semibold text-slate-700"
                    >
                      Performance
                    </label>
                    <select
                      id="mobile-results-performance"
                      value={performanceFilter}
                      onChange={(e) =>
                        setPerformanceFilter(e.target.value as PerformanceBand)
                      }
                      className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium text-[#0B1220]"
                    >
                      <option value="all">All Bands</option>
                      <option value="distinction">Distinction (75%+)</option>
                      <option value="credit">Credit (50–74%)</option>
                      <option value="support">Needs Support (&lt;50%)</option>
                    </select>
                  </div>
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
                      <Eye
                        className="h-4 w-4 text-slate-500"
                        aria-hidden="true"
                      />
                      View bundle
                    </button>
                    <button
                      type="button"
                      disabled={isDownloadingBatch}
                      onClick={() => {
                        setIsMobileOptionsOpen(false);
                        void handleBatchExport("download");
                      }}
                      className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[var(--primary)] px-3 text-xs font-semibold text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] disabled:opacity-60"
                    >
                      {isDownloadingBatch ? (
                        <Loader2
                          className="h-4 w-4 animate-spin motion-reduce:animate-none"
                          aria-hidden="true"
                        />
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
                    void fetchParentData({
                      refresh: true,
                      showSuccessToast: true,
                    });
                  }}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  <RefreshCw
                    className={cn(
                      "h-4 w-4",
                      isRefreshing && "animate-spin motion-reduce:animate-none",
                    )}
                    aria-hidden="true"
                  />
                  Refresh results
                </button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {forbidden ? (
          <DataStateCard
            variant="forbidden"
            title="You don't have access to these results"
            description="You must be an administrator, class teacher, or parent of an enrolled learner to view results."
          />
        ) : !hasSelectedEdition ? (
          /* ══════════════════════════════════════════════════════════════════
             LEVEL 1: RESULT EDITIONS CATALOG (All roles select result name first)
             ══════════════════════════════════════════════════════════════════ */
          <div className="space-y-5">
            <ResultsBrandHeader
              title={
                isParent
                  ? "Available Academic Results"
                  : "Academic Results Catalog"
              }
              subtitle={
                isParent
                  ? "Pick a result to view, print or download your child's report card."
                  : "Open a result edition to see its class overview and individual reports."
              }
              actions={
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCatalogRefreshKey((key) => key + 1);
                    void fetchParentData({
                      refresh: true,
                      showSuccessToast: true,
                    });
                  }}
                  disabled={isLoading || isRefreshing}
                  className="min-h-11 md:pointer-fine:min-h-9 rounded-xl border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
                >
                  {isRefreshing ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Refresh
                </Button>
              }
            />

            <ResultEditionsCatalog
              variant={isParent ? "family" : "staff"}
              editions={effectiveEditions}
              isLoading={isLoadingEditions && isLoading}
              onSelectEdition={handleSelectEdition}
              childrenList={isParent ? effectiveParentChildren : undefined}
              selectedChildId={isParent ? selectedParentChildId : undefined}
              onSelectChild={
                isParent
                  ? (childId) => {
                      setSelectedParentChildId(childId);
                      setSelectedStudentId(childId);
                    }
                  : undefined
              }
              emptyTitle={
                isParent
                  ? "No published results available yet"
                  : "No result editions recorded yet"
              }
              emptyMessage={
                isParent
                  ? "Results will appear here once the school publishes term or mid-term results for your child."
                  : "Results will appear here once active score spreadsheets are created for this academic session."
              }
            />
          </div>
        ) : (
          /* ══════════════════════════════════════════════════════════════════
             LEVEL 2 (Staff General Results Overview) & LEVEL 3 (Individual View)
             ══════════════════════════════════════════════════════════════════ */
          <>
            {/* The edition chip already names the term, year and stage; only
                the parent view adds a subtitle the title does not carry. */}
            <ResultsBrandHeader
              title={
                isParent
                  ? currentEditionTitle
                  : `Results Overview - ${selectedClassLabel}`
              }
              subtitle={
                isParent && selectedGroup
                  ? `${selectedGroup.student.firstName} ${selectedGroup.student.lastName}${
                      selectedGroup.student.classLevel?.name
                        ? ` · ${selectedGroup.student.classLevel.name}`
                        : ""
                    }`
                  : undefined
              }
              editionLabel={`${exportTerm} · ${exportYear}`}
              backLabel={isParent ? "Available Results" : "All Results"}
              onBack={() => setHasSelectedEdition(false)}
              stage={exportResultType}
              onStageChange={setExportResultType}
              actions={
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      void fetchParentData({
                        refresh: true,
                        showSuccessToast: true,
                      })
                    }
                    disabled={isLoading || isRefreshing}
                    className="min-h-11 md:pointer-fine:min-h-8 rounded-xl border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
                  >
                    {isRefreshing ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Refresh
                  </Button>
                </div>
              }
            />

            {isLoading ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 rounded-2xl" />
                  ))}
                </div>
                <Skeleton className="h-16 rounded-2xl" />
                <Skeleton className="h-96 rounded-2xl" />
              </div>
            ) : resultGroups.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-14 text-center shadow-2xs">
                <h2 className="text-base font-bold text-slate-800 sm:text-xl">
                  No published results for {currentEditionTitle}
                </h2>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                  Results will appear here once spreadsheets are recorded for{" "}
                  {exportTerm} ({exportYear}).
                </p>
                <div className="mt-5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setHasSelectedEdition(false)}
                    className="rounded-xl"
                  >
                    <ArrowLeft className="mr-1.5 h-4 w-4" />
                    Back to All Results
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* STAFF LEVEL 2: Mobile 2-Tab Segmented Switch + Controls + KPIs + Desktop Filter Bar + Desktop 3-Tab Bar */}
                {!isParent && (
                  <div className="space-y-4">
                    {/* Mobile 2-Tab Segmented Switch (matches mobile mockup #1) */}
                    <div
                      role="tablist"
                      aria-label="Results view mode"
                      className="grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-100 p-1 md:hidden"
                    >
                      <button
                        type="button"
                        role="tab"
                        aria-selected={activeOverviewTab !== "individual"}
                        onClick={() => setActiveOverviewTab("all")}
                        className="min-h-11 rounded-lg px-3 text-xs font-bold text-slate-600 transition-colors aria-selected:bg-[var(--primary)] aria-selected:text-[var(--primary-foreground)] aria-selected:shadow-2xs"
                      >
                        All Students ({filteredOverviewRows.length})
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={activeOverviewTab === "individual"}
                        onClick={() => setActiveOverviewTab("individual")}
                        className="min-h-11 rounded-lg px-3 text-xs font-bold text-slate-600 transition-colors aria-selected:bg-[var(--primary)] aria-selected:text-[var(--primary-foreground)] aria-selected:shadow-2xs"
                      >
                        Individual View
                      </button>
                    </div>

                    {/* Mobile Class Filter & Unified Quick Actions Toolbar */}
                    {activeOverviewTab !== "individual" && (
                      <>
                        <div className="space-y-2.5 md:hidden">
                        <div className="flex items-center gap-2">
                          <select
                            aria-label="Filter by class level"
                            value={selectedClassId}
                            onChange={(e) =>
                              setSelectedClassId(e.target.value || "all")
                            }
                            className="min-h-11 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] truncate"
                          >
                            <option value="all">All Class Levels</option>
                            {availableClassOptions.map((cls) => (
                              <option key={cls.id} value={cls.id}>
                                {cls.name}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => setIsMobileOptionsOpen(true)}
                            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50"
                          >
                            <SlidersHorizontal
                              className="h-3.5 w-3.5 text-slate-500"
                              aria-hidden="true"
                            />
                            <span>Filters</span>
                            {hasActiveMobileFilter && (
                              <span
                                className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]"
                                aria-label="Filters active"
                              />
                            )}
                          </button>

                          <button
                            type="button"
                            disabled={isExportingBroadsheet}
                            onClick={() => void handleExportCsvOrExcel()}
                            className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-50"
                            title="Export CSV/Excel"
                            aria-label="Export CSV or Excel"
                          >
                            <Download
                              className="h-3.5 w-3.5 text-slate-500"
                              aria-hidden="true"
                            />
                            <span>Export</span>
                          </button>

                          {canExportClassBundle && (
                            <button
                              type="button"
                              disabled={isDownloadingBatch}
                              onClick={() => void handleBatchExport("download")}
                              className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-xl border border-[var(--primary-border)] bg-[var(--primary-light)] px-2.5 text-xs font-semibold text-[var(--primary-text)] shadow-2xs disabled:opacity-50"
                              title="Bulk Print Report Cards"
                              aria-label="Bulk Print Report Cards"
                            >
                              <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Print</span>
                            </button>
                          )}
                        </div>

                        {/* Quiet Coverage Line */}
                        <ResultsOverviewKpis kpis={overviewKpis} />
                      </div>

                        {/* Mobile Search Input */}
                        <div className="relative md:hidden">
                          <Search
                            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                            aria-hidden="true"
                          />
                          <Input
                            type="search"
                            placeholder="Search by name or student ID..."
                            aria-label="Search students"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-11 rounded-xl border-slate-200 bg-white pl-10 text-sm placeholder:text-slate-400"
                          />
                        </div>

                        {/* Desktop Filter & Action Toolbar (matches desktop mockup #2) */}
                        <div className="hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs md:block">
                          <div className="grid grid-cols-12 gap-3">
                            <div className="col-span-3">
                              <label
                                htmlFor="desktop-filter-class"
                                className="mb-1 block text-xs font-semibold text-slate-600"
                              >
                                Class
                              </label>
                              <select
                                id="desktop-filter-class"
                                aria-label="Class level"
                                value={selectedClassId}
                                onChange={(e) =>
                                  setSelectedClassId(e.target.value || "all")
                                }
                                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                              >
                                <option value="all">All Class Levels</option>
                                {availableClassOptions.map((cls) => (
                                  <option key={cls.id} value={cls.id}>
                                    {cls.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="col-span-3">
                              <label
                                htmlFor="desktop-filter-period"
                                className="mb-1 block text-xs font-semibold text-slate-600"
                              >
                                Term
                              </label>
                              <select
                                id="desktop-filter-period"
                                aria-label="Academic period"
                                value={`${exportYear}|${exportTerm}`}
                                onChange={(e) => {
                                  const [year, term] = e.target.value.split("|");
                                  if (year && term) {
                                    setExportYear(year);
                                    setExportTerm(term);
                                  }
                                }}
                                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                              >
                                {periodOptions.length > 0 ? (
                                  periodOptions.map((p) => (
                                    <option
                                      key={`${p.academicYear}|${p.term}`}
                                      value={`${p.academicYear}|${p.term}`}
                                    >
                                      {p.term} {p.academicYear}
                                    </option>
                                  ))
                                ) : (
                                  <option value={`${exportYear}|${exportTerm}`}>
                                    {exportTerm} {exportYear}
                                  </option>
                                )}
                              </select>
                            </div>

                            <div className="col-span-3">
                              <label
                                htmlFor="desktop-filter-status"
                                className="mb-1 block text-xs font-semibold text-slate-600"
                              >
                                Status
                              </label>
                              <select
                                id="desktop-filter-status"
                                aria-label="Completion status"
                                value={statusFilter}
                                onChange={(e) =>
                                  setStatusFilter(
                                    e.target.value as CompletionFilter,
                                  )
                                }
                                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                              >
                                <option value="all">
                                  All Students ({classScopedOverviewRows.length})
                                </option>
                                <option value="recorded">Recorded</option>
                                <option value="draft">Incomplete</option>
                                <option value="pending">Pending</option>
                              </select>
                            </div>

                            <div className="col-span-3">
                              <label
                                htmlFor="desktop-filter-performance"
                                className="mb-1 block text-xs font-semibold text-slate-600"
                              >
                                Performance
                              </label>
                              <select
                                id="desktop-filter-performance"
                                aria-label="Performance band"
                                value={performanceFilter}
                                onChange={(e) =>
                                  setPerformanceFilter(
                                    e.target.value as PerformanceBand,
                                  )
                                }
                                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                              >
                                <option value="all">All</option>
                                <option value="distinction">
                                  Distinction (75%+)
                                </option>
                                <option value="credit">Credit (50–74%)</option>
                                <option value="support">
                                  Needs Support (&lt;50%)
                                </option>
                              </select>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                            <div className="relative min-w-[260px] flex-1 max-w-md">
                              <Search
                                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                                aria-hidden="true"
                              />
                              <Input
                                type="search"
                                placeholder="Find a learner by name or ID..."
                                aria-label="Search students"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-9 rounded-xl border-slate-200 bg-slate-50/70 pl-9 text-xs"
                              />
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isExportingBroadsheet}
                                onClick={() => void handleExportCsvOrExcel()}
                                className="h-9 gap-1.5 rounded-xl border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                <FileSpreadsheet
                                  className="h-3.5 w-3.5 text-slate-500"
                                  aria-hidden="true"
                                />
                                <span>Export Excel/CSV</span>
                              </Button>

                              {canExportClassBundle && (
                                <>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={isDownloadingBatch}
                                    onClick={() => void handleBatchExport("view")}
                                    className="h-9 gap-1.5 rounded-xl border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                  >
                                    <Eye
                                      className="h-3.5 w-3.5 text-slate-500"
                                      aria-hidden="true"
                                    />
                                    <span>View Bundle</span>
                                  </Button>

                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={isDownloadingBatch}
                                    onClick={() =>
                                      void handleBatchExport("download")
                                    }
                                    className="h-9 gap-1.5 rounded-xl bg-[var(--primary)] px-3.5 text-xs font-semibold text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)]"
                                  >
                                    {isDownloadingBatch ? (
                                      <Loader2
                                        className="h-3.5 w-3.5 animate-spin"
                                        aria-hidden="true"
                                      />
                                    ) : (
                                      <Printer
                                        className="h-3.5 w-3.5"
                                        aria-hidden="true"
                                      />
                                    )}
                                    <span>Bulk Print Report Cards</span>
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Desktop Single-Row Accessible Tablist (styled from aria-selected with 3px underline shape) */}
                    <div
                      role="tablist"
                      aria-label="Results workspace tabs"
                      className="hidden items-center gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 rounded-t-2xl md:flex"
                    >
                      <button
                        type="button"
                        role="tab"
                        id="tab-all-students"
                        aria-selected={activeOverviewTab === "all"}
                        aria-controls="panel-all-students"
                        onClick={() => setActiveOverviewTab("all")}
                        className="inline-flex min-h-11 shrink-0 items-center gap-2 border-b-[3px] border-transparent px-3 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:text-slate-900 aria-selected:border-[var(--primary)] aria-selected:font-bold aria-selected:text-[var(--primary-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                      >
                        <Users className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>
                          All Students ({filteredOverviewRows.length})
                        </span>
                      </button>

                      <button
                        type="button"
                        role="tab"
                        id="tab-subject-matrix"
                        aria-selected={activeOverviewTab === "matrix"}
                        aria-controls="panel-subject-matrix"
                        onClick={() => setActiveOverviewTab("matrix")}
                        className="inline-flex min-h-11 shrink-0 items-center gap-2 border-b-[3px] border-transparent px-3 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:text-slate-900 aria-selected:border-[var(--primary)] aria-selected:font-bold aria-selected:text-[var(--primary-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                      >
                        <LayoutGrid
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                        <span>Subject Performance Matrix</span>
                      </button>

                      <button
                        type="button"
                        role="tab"
                        id="tab-individual-student"
                        aria-selected={activeOverviewTab === "individual"}
                        aria-controls="panel-individual-student"
                        onClick={() => setActiveOverviewTab("individual")}
                        className="inline-flex min-h-11 shrink-0 items-center gap-2 border-b-[3px] border-transparent px-3 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:text-slate-900 aria-selected:border-[var(--primary)] aria-selected:font-bold aria-selected:text-[var(--primary-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                      >
                        <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Individual Student View</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 1: All Students General Overview Table (Staff only) */}
                {!isParent && activeOverviewTab === "all" && (
                  <section
                    id="panel-all-students"
                    role="tabpanel"
                    aria-labelledby="tab-all-students"
                  >
                    <AllStudentsResultsTable
                      rows={filteredOverviewRows}
                      orgSlug={currentOrg?.slug || ""}
                      selectedIds={selectedRowIds}
                      onToggleSelect={handleToggleSelectRow}
                      onToggleSelectAll={handleToggleSelectAllRows}
                      onViewResult={handleOpenIndividualStudent}
                      onPrintReport={(studentId) =>
                        setPrintModalStudentId(studentId)
                      }
                      onBulkPrint={
                        canExportClassBundle
                          ? () => void handleBatchExport("download")
                          : undefined
                      }
                      isBulkPrinting={isDownloadingBatch}
                    />
                  </section>
                )}

                {/* TAB 2: Subject Performance Matrix (Staff only) */}
                {!isParent && activeOverviewTab === "matrix" && (
                  <section
                    id="panel-subject-matrix"
                    role="tabpanel"
                    aria-labelledby="tab-subject-matrix"
                  >
                    <SubjectPerformanceMatrix
                      rows={filteredOverviewRows}
                      onSelectStudent={handleOpenIndividualStudent}
                    />
                  </section>
                )}

                {/* TAB 3 / LEVEL 3: Individual Student Result View (Parent default after Level 1, or Staff when "Individual Student View" selected) */}
                {(isParent || activeOverviewTab === "individual") && (
                  <section
                    id="panel-individual-student"
                    role={!isParent ? "tabpanel" : undefined}
                    aria-labelledby={
                      !isParent ? "tab-individual-student" : undefined
                    }
                    className="space-y-4"
                  >
                    {!isParent && (
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setActiveOverviewTab("all")}
                          className="inline-flex min-h-11 md:pointer-fine:min-h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:border-[var(--primary-border)] hover:bg-[var(--primary-light)] hover:text-[var(--primary-text)]"
                        >
                          <ArrowLeft
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                          <span>Back to All Students Overview</span>
                        </button>
                      </div>
                    )}

                    {!selectedGroup && hasActiveSearchOrClassFilter && (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500">
                        No learner matches that filter.
                      </div>
                    )}

                    {selectedGroup && (
                      <div className="space-y-4 md:hidden">
                        {filteredResultGroups.length > 1 &&
                        filteredResultGroups.length <= 4 ? (
                          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5">
                            {filteredResultGroups.map((group) => {
                              const isActive =
                                group.student.id === selectedGroup.student.id;
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
                                      ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                                  )}
                                >
                                  {group.student.firstName}{" "}
                                  {group.student.lastName}
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
                              <ChevronLeft
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
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
                                    <SelectItem
                                      key={group.student.id}
                                      value={group.student.id}
                                      className="capitalize"
                                    >
                                      {group.student.firstName}{" "}
                                      {group.student.lastName}
                                      {group.student.classLevel?.name
                                        ? ` · ${group.student.classLevel.name}`
                                        : ""}
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
                              <ChevronRight
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                            </button>
                          </div>
                        ) : null}

                        {/* Distilled Learner Card with single primary CTA */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                          <div className="flex items-center gap-3">
                            <span
                              aria-hidden="true"
                              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--primary-light)] text-sm font-bold uppercase text-[var(--primary-text)]"
                            >
                              {getInitials(
                                `${selectedGroup.student.firstName} ${selectedGroup.student.lastName}`,
                              )}
                            </span>
                            <div className="min-w-0 flex-1">
                              <h2 className="truncate text-base font-bold capitalize text-[#0B1220]">
                                {selectedGroup.student.firstName}{" "}
                                {selectedGroup.student.lastName}
                              </h2>
                              <p className="truncate text-xs text-slate-500">
                                {selectedGroup.student.classLevel?.name ||
                                  "Unassigned"}
                                <span className="mx-1.5 text-slate-300">·</span>
                                {getStudentRecordId(
                                  selectedGroup.student as StudentPerformanceResponse["student"],
                                )}
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
                                <dd className="mt-0.5 text-base font-bold text-[var(--primary-text)]">
                                  {computedResult.grade}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-xs text-slate-500">
                                  Position
                                </dt>
                                <dd className="mt-0.5 text-base font-bold tabular-nums text-[#0B1220]">
                                  {computedResult.position
                                    ? `#${computedResult.position}`
                                    : "—"}
                                </dd>
                              </div>
                            </dl>
                          )}

                          {currentOrg?.slug && (
                            <Button
                              type="button"
                              onClick={() =>
                                setPrintModalStudentId(selectedGroup.student.id)
                              }
                              className="mt-3.5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] text-sm font-semibold text-[var(--primary-foreground)] transition-colors hover:bg-[var(--primary-hover)]"
                            >
                              <Printer className="h-4 w-4" aria-hidden="true" />
                              Print Report
                            </Button>
                          )}
                        </div>

                        {!selectedGroup.isTemplateApproved && (
                          <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 py-2.5 text-xs text-amber-950">
                            <span className="min-w-0 font-medium">
                              Template pending approval for{" "}
                              {selectedGroup.student.classLevel?.name ||
                                "this class"}
                              .
                            </span>
                            {!isParent && currentOrg?.slug && (
                              <Link
                                href={`/dashboard/school/${currentOrg.slug}/result-templates`}
                                className="-my-2 -mr-2 inline-flex min-h-11 shrink-0 items-center px-2.5 font-semibold text-amber-950 underline underline-offset-2"
                              >
                                Approve
                              </Link>
                            )}
                          </div>
                        )}

                        <div>
                          <div className="mb-2.5 flex items-baseline justify-between gap-3 px-0.5">
                            <h2 className="text-sm font-bold text-[#0B1220]">
                              Subjects
                            </h2>
                            <span className="text-xs font-medium tabular-nums text-slate-500">
                              {performanceSubjects.length}
                            </span>
                          </div>

                          {performanceSubjects.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-600">
                              No {activeStageLabel} subject scores recorded yet.
                            </div>
                          ) : (
                            <>
                              <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
                                {visibleMobileSubjects.map((subject) => {
                                  const summary =
                                    getSubjectPerformanceSummary(subject);
                                  const label = getSubjectRecordLabel(summary);
                                  const inProgress =
                                    summary.enteredCount < summary.totalCount;

                                  return (
                                    <li key={subject.spreadsheetId}>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setSelectedSubject(subject)
                                        }
                                        className="flex min-h-[60px] w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50/70 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ring)] motion-reduce:transition-none"
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
                                                  {summary.enteredCount}/
                                                  {summary.totalCount}{" "}
                                                  assessments
                                                </span>
                                                <span className="mx-1.5 text-slate-300">
                                                  ·
                                                </span>
                                                <span
                                                  className={cn(
                                                    "font-semibold",
                                                    getMobileStatusTone(label),
                                                  )}
                                                >
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
                                              inProgress ||
                                                summary.percentage === null
                                                ? "text-xs font-medium text-slate-500"
                                                : "text-[#0B1220]",
                                            )}
                                          >
                                            {inProgress ||
                                            summary.percentage === null
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
                                  onClick={() =>
                                    setShowAllMobileSubjects((value) => !value)
                                  }
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

                        {selectedNotifications.length > 0 && (
                          <details className="group rounded-2xl border border-rose-200 bg-white">
                            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left marker:hidden [&::-webkit-details-marker]:hidden">
                              <span className="flex items-center gap-2 text-sm font-semibold text-rose-700">
                                <AlertTriangle
                                  className="h-4 w-4 shrink-0"
                                  aria-hidden="true"
                                />
                                {selectedNotifications.length}{" "}
                                {selectedNotifications.length === 1
                                  ? "low-score notice"
                                  : "low-score notices"}
                              </span>
                              <ChevronDown
                                className="h-4 w-4 shrink-0 text-rose-500 transition-transform group-open:rotate-180 motion-reduce:transition-none"
                                aria-hidden="true"
                              />
                            </summary>
                            <ul className="divide-y divide-slate-100 border-t border-rose-100">
                              {selectedNotifications.map((notification) => (
                                <li
                                  key={notification.id}
                                  className="px-4 py-3"
                                >
                                  <div className="flex items-baseline justify-between gap-3">
                                    <p className="truncate text-sm font-semibold text-[#0B1220]">
                                      {notification.subject?.name || "Subject"}{" "}
                                      · {notification.assessmentName}
                                    </p>
                                    <span className="shrink-0 text-xs font-bold tabular-nums text-rose-700">
                                      {formatScore(notification.score)}/
                                      {formatScore(notification.expectedTotal)}{" "}
                                      ({formatScore(notification.percentage)}%)
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
                      </div>
                    )}

                    {/* Desktop Individual Student Control Bar */}
                    {selectedGroup && (
                      <div className="hidden flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs md:flex">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div className="flex min-w-0 items-center gap-3.5">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--primary-border)] bg-[var(--primary-light)] text-base font-black text-[var(--primary-text)] shadow-2xs">
                              {getInitials(
                                `${selectedGroup.student.firstName} ${selectedGroup.student.lastName}`,
                              )}
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
                                  <SelectTrigger className="h-9 border-none p-0 text-xl font-bold capitalize text-slate-900 shadow-none hover:text-neutral-700 focus:ring-0">
                                    <span className="max-w-[280px] truncate">
                                      {selectedGroup.student.firstName}{" "}
                                      {selectedGroup.student.lastName}
                                    </span>
                                  </SelectTrigger>
                                  <SelectContent className="max-h-72">
                                    {filteredResultGroups.map((group) => (
                                      <SelectItem
                                        key={group.student.id}
                                        value={group.student.id}
                                        className="capitalize"
                                      >
                                        {group.student.firstName}{" "}
                                        {group.student.lastName}
                                        {group.student.classLevel?.name
                                          ? ` · ${group.student.classLevel.name}`
                                          : ""}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                <span>
                                  {selectedGroup.student.classLevel?.name ||
                                    "Unassigned class"}
                                </span>
                                <span>&middot;</span>
                                <span>
                                  {getStudentRecordId(
                                    selectedGroup.student as StudentPerformanceResponse["student"],
                                  )}
                                </span>
                                <span>&middot;</span>
                                <span className="font-semibold text-slate-900">
                                  {`${performanceSubjects.length} ${
                                    performanceSubjects.length === 1
                                      ? "subject"
                                      : "subjects"
                                  }`}
                                </span>
                                <span>&middot;</span>
                                {selectedGroup.isTemplateApproved ? (
                                  <Badge
                                    variant="outline"
                                    className="border-emerald-200 bg-emerald-50 text-xs font-bold text-emerald-700"
                                  >
                                    ✓ Template Approved
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="border-amber-200 bg-amber-50 text-xs font-bold text-amber-800"
                                  >
                                    Template Pending Approval
                                  </Badge>
                                )}
                                {computedResult && (
                                  <Badge
                                    variant="outline"
                                    className="border-[var(--primary-border)] bg-[var(--primary-light)] text-xs font-bold text-[var(--primary-text)]"
                                  >
                                    {exportResultType === "MID_TERM"
                                      ? "Mid-term"
                                      : "End-of-term"}
                                    : {computedResult.totalScore} ·{" "}
                                    {computedResult.grade}
                                    {computedResult.position
                                      ? ` · #${computedResult.position}`
                                      : ""}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

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
                              <span className="px-2.5 text-xs font-medium tabular-nums text-slate-500">
                                <span className="font-bold text-slate-900">
                                  {currentIndex + 1}
                                </span>{" "}
                                of {filteredResultGroups.length}
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

                          <div className="flex items-center gap-2">
                            {resultGroups.length > 1 && (
                              <>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => setIsRosterOpen(true)}
                                  className="h-9 gap-2 rounded-xl border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50"
                                >
                                  <Users className="h-3.5 w-3.5 text-slate-500" />
                                  <span>Browse Roster</span>
                                  <Badge
                                    variant="secondary"
                                    className="ml-0.5 h-5 rounded-full px-1.5 text-xs font-bold"
                                  >
                                    {filteredResultGroups.length}
                                  </Badge>
                                </Button>
                                <Sheet
                                  open={isRosterOpen}
                                  onOpenChange={setIsRosterOpen}
                                >
                                  <SheetContent
                                    side="right"
                                    className="flex h-full w-full flex-col bg-white p-0 sm:max-w-md"
                                  >
                                    <SheetHeader className="border-b border-slate-100 p-6 pb-4">
                                      <SheetTitle className="text-lg font-bold text-slate-900">
                                        Student Roster (
                                        {filteredResultGroups.length})
                                      </SheetTitle>
                                      <SheetDescription className="text-xs text-slate-500">
                                        Select a student to view their published
                                        academic record.
                                      </SheetDescription>
                                      <div className="relative mt-3">
                                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-600" />
                                        <Input
                                          type="search"
                                          placeholder="Search roster..."
                                          value={searchQuery}
                                          onChange={(e) =>
                                            setSearchQuery(e.target.value)
                                          }
                                          className="h-9 pl-9 text-xs"
                                        />
                                      </div>
                                    </SheetHeader>
                                    <div className="flex-1 space-y-2 overflow-y-auto p-4">
                                      {filteredResultGroups.map((group) => {
                                        const isCurrent =
                                          group.student.id ===
                                          selectedGroup?.student.id;
                                        return (
                                          <div
                                            key={group.student.id}
                                            className={cn(
                                              "group relative flex items-center justify-between gap-3 rounded-2xl border p-3 text-left transition-all",
                                              isCurrent
                                                ? "border-[var(--primary)] bg-[var(--primary-light)]/50 shadow-2xs"
                                                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                                            )}
                                          >
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setSelectedStudentId(
                                                  group.student.id,
                                                );
                                                setIsRosterOpen(false);
                                              }}
                                              className="flex min-w-0 flex-1 items-center gap-3 text-left"
                                            >
                                              <div
                                                className={cn(
                                                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                                                  isCurrent
                                                    ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                                                    : "bg-slate-100 text-slate-700",
                                                )}
                                              >
                                                {getInitials(
                                                  `${group.student.firstName} ${group.student.lastName}`,
                                                )}
                                              </div>
                                              <div className="min-w-0 flex-1 pr-2">
                                                <p className="truncate text-sm font-semibold capitalize text-slate-900">
                                                  {group.student.firstName}{" "}
                                                  {group.student.lastName}
                                                </p>
                                                <p className="truncate text-xs text-slate-500">
                                                  {group.student.classLevel
                                                    ?.name || "Unassigned"}{" "}
                                                  &middot;{" "}
                                                  {group.results.length}{" "}
                                                  subjects
                                                </p>
                                              </div>
                                            </button>
                                            {currentOrg?.slug && (
                                              <div className="flex shrink-0 items-center gap-1">
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    setPrintModalStudentId(
                                                      group.student.id,
                                                    )
                                                  }
                                                  className="rounded-lg p-1.5 text-neutral-600 hover:bg-neutral-100 hover:text-black"
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
                                                      studentId:
                                                        group.student.id,
                                                      studentName: `${group.student.firstName} ${group.student.lastName}`,
                                                      term: exportTerm,
                                                      academicYear: exportYear,
                                                      resultType:
                                                        exportResultType,
                                                    })
                                                  }
                                                  className="rounded-lg p-1.5 text-neutral-600 hover:bg-neutral-100 hover:text-black"
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
                                                      studentId:
                                                        group.student.id,
                                                      studentName: `${group.student.firstName} ${group.student.lastName}`,
                                                      term: exportTerm,
                                                      academicYear: exportYear,
                                                      resultType:
                                                        exportResultType,
                                                    })
                                                  }
                                                  className="rounded-lg p-1.5 text-neutral-600 hover:bg-neutral-100 hover:text-black"
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

                            {currentOrg?.slug && (
                              <>
                                <Button
                                  type="button"
                                  onClick={() =>
                                    setPrintModalStudentId(
                                      selectedGroup.student.id,
                                    )
                                  }
                                  className="h-9 cursor-pointer gap-1.5 rounded-xl bg-[var(--primary)] px-3.5 text-xs font-bold text-[var(--primary-foreground)] shadow-2xs hover:bg-[var(--primary-hover)] sm:text-sm"
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
                                  className="h-9 cursor-pointer gap-1.5 rounded-xl border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 sm:text-sm"
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
                                  className="h-9 cursor-pointer gap-1.5 rounded-xl border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 sm:text-sm"
                                  title="Download PDF"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  <span>PDF</span>
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedGroup && !selectedGroup.isTemplateApproved && (
                      <div className="hidden flex-row items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-900 shadow-2xs md:flex">
                        <div className="flex items-start gap-3 sm:items-center">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-200/80 text-sm font-bold text-amber-900">
                            !
                          </div>
                          <div>
                            <p className="text-sm font-bold text-amber-950">
                              Result Template Pending Approval for{" "}
                              {selectedGroup.student.classLevel?.name ||
                                "this class"}
                            </p>
                            <p className="text-xs text-amber-800">
                              Official scores and positions become finalized
                              once an administrator approves the template for
                              this class.
                            </p>
                          </div>
                        </div>
                        {!isParent && currentOrg?.slug && (
                          <Link
                            href={`/dashboard/school/${currentOrg.slug}/result-templates`}
                            className="shrink-0 self-start text-xs font-bold text-amber-900 underline hover:text-amber-950 sm:self-center"
                          >
                            Go to Result Templates &rarr;
                          </Link>
                        )}
                      </div>
                    )}

                    {selectedGroup && (
                      <div
                        aria-busy={isSwitchingStage}
                        className={cn(
                          "hidden transition-opacity motion-reduce:transition-none md:block",
                          isSwitchingStage && "opacity-60",
                        )}
                      >
                        <StudentAcademicRecord
                          titlesPage={false}
                          student={
                            selectedGroup.student as StudentPerformanceResponse["student"]
                          }
                          subjects={performanceSubjects}
                          description="A visual summary of the published subject performance for this student, including assessment progress and recorded scores."
                          actionLabel=""
                          emptyTitle={`No ${activeStageLabel} subject records available`}
                          emptyDescription={`The school has not published any ${activeStageLabel} subject spreadsheets for this student yet.`}
                        />
                      </div>
                    )}

                    {selectedNotifications.length > 0 && (
                      <section className="hidden rounded-3xl border border-red-200/80 bg-white p-6 shadow-xs md:block">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600">
                              <AlertTriangle className="h-4.5 w-4.5" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                                Alerts
                              </p>
                              <h2 className="mt-0.5 text-base font-bold text-[#0B1220] sm:text-xl">
                                Low score notices
                              </h2>
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className="self-start rounded-full border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700 sm:self-auto"
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
                                  className="shrink-0 rounded-full border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-bold tabular-nums text-red-700"
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
                                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-500">
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
                  </section>
                )}

                {printModalGroup && currentOrg?.slug && (
                  <ReportCardPrintModal
                    orgSlug={currentOrg.slug}
                    orgName={currentOrg.name}
                    orgLogo={currentOrg.logo || undefined}
                    orgAddress={currentOrg.address || undefined}
                    orgEmail={
                      currentOrg.email ? `Email: ${currentOrg.email}` : undefined
                    }
                    orgPrimaryColor={currentOrg.primaryColor}
                    orgSecondaryColor={currentOrg.secondaryColor}
                    student={printModalGroup.student}
                    term={exportTerm}
                    academicYear={exportYear}
                    resultType={exportResultType}
                    onResultTypeChange={setExportResultType}
                    isLoadingResults={isSwitchingStage}
                    classStudentCount={Math.max(
                      1,
                      resultGroups.filter(
                        (g) =>
                          g.student.classLevel?.id ===
                          printModalGroup.student.classLevel?.id,
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
                          0,
                        );
                        const rounded = Math.round(total);
                        const gradeObj = computeNigerianGrade(rounded);

                        const assessmentsList = r.assessments?.length
                          ? r.assessments
                          : r.columns.map((c) => ({
                              name: c,
                              total: undefined,
                            }));

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
                              printModalGroup.student.classLevel?.id,
                          )
                          .map((g) => {
                            const match = g.results.find(
                              (res) =>
                                res.id === r.id ||
                                res.title === r.title ||
                                res.subject?.name === r.subject?.name,
                            );
                            if (!match) return null;
                            return match.values.reduce<number>(
                              (s, v) => s + (toNumericValue(v) ?? 0),
                              0,
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
                    onClose={() => setPrintModalStudentId(null)}
                  />
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
