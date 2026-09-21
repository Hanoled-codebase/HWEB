"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  ChevronDown,
  Download,
  FileText,
  Filter,
  Loader2,
  Printer,
  RefreshCw,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { downloadReportCardPdf } from "@/lib/report-card-download";

import ReportCardPrintModal from "@/components/results/ReportCardPrintModal";
import { StudentAcademicRecord } from "@/components/dashboard/student-academic-record";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
): StudentPerformanceSubject[] {
  return results.map((result) => {
    const assessments = (
      result.assessments?.length
        ? result.assessments
        : result.columns.map((column) => ({ name: column, total: undefined }))
    ).map((assessment, originalIndex) => ({
      name: assessment.name,
      total: assessment.total,
      score: result.values[originalIndex] ?? "",
      originalIndex,
    }));

    return {
      spreadsheetId: result.id,
      status: "active",
      updatedAt: result.updatedAt,
      subject: result.subject
        ? {
            id: result.subject.id,
            name: result.subject.name,
          }
        : null,
      classLevel: result.classLevel
        ? {
            id: result.classLevel.id,
            name: result.classLevel.name,
            level: result.classLevel.level,
          }
        : null,
      totalScore: result.values.reduce<number>(
        (sum, value) => sum + (toNumericValue(value) ?? 0),
        0,
      ),
      assessments,
    };
  });
}

function getMobileBadgeClass(label: string) {
  const normalized = label.toLowerCase();

  if (normalized === "distinction") {
    return "bg-emerald-700 text-white";
  }

  if (normalized === "merit") {
    return "bg-emerald-300 text-emerald-900";
  }

  if (normalized === "pass") {
    return "bg-slate-200 text-slate-700";
  }

  if (normalized === "grading in progress") {
    return "bg-blue-100 text-blue-700";
  }

  if (normalized === "waiting for score") {
    return "bg-slate-100 text-slate-600";
  }

  return "bg-rose-100 text-rose-700";
}

function getScoreTone(percentage: number | null) {
  if (percentage === null) {
    return { stroke: "#cbd5e1", text: "text-slate-400" };
  }

  if (percentage >= 75) {
    return { stroke: "#12B76A", text: "text-emerald-700" };
  }

  if (percentage >= 60) {
    return { stroke: "#12B76A", text: "text-emerald-600" };
  }

  if (percentage >= 50) {
    return { stroke: "#1447E6", text: "text-blue-700" };
  }

  return { stroke: "#F04438", text: "text-red-600" };
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
          stroke="#e5e7eb"
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
      <span className={`text-sm font-bold ${tone.text}`}>
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
  const [selectedStudentId, setSelectedStudentId] = useState("");
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

  const selectedNotifications = useMemo(() => {
    if (!selectedGroup) {
      return notifications;
    }

    return notifications.filter(
      (notification) => notification.student?.id === selectedGroup.student.id,
    );
  }, [notifications, selectedGroup]);

  const performanceSubjects = useMemo(
    () => (selectedGroup ? toPerformanceSubjects(selectedGroup.results) : []),
    [selectedGroup],
  );

  const visibleMobileSubjects = showAllMobileSubjects
    ? performanceSubjects
    : performanceSubjects.slice(0, 4);

  return (
    <div className="min-h-full bg-slate-50/60 pb-16">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="hidden flex-col items-start justify-between gap-5 md:flex md:flex-row md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">
              {currentMember?.role === "parent" ? "Parent Portal" : "Results Portal"}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
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
                  className="bg-[#1447E6] hover:bg-[#1447E6]/90 text-white text-xs font-semibold h-8 gap-1.5 px-3 rounded-lg shadow-sm"
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
            className="h-11 shrink-0 rounded-2xl border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
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
            description="Ask the school to check that your account is linked to the right student."
          />
        ) : resultGroups.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-14 text-center shadow-sm">
            <h2 className="text-base sm:text-xl font-bold text-slate-800">
              No published results yet
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">
              Results will appear here once the school publishes active
              spreadsheets for the children linked to your account.
            </p>
          </div>
        ) : (
          <>
            {/* Search and Class Level Filter Bar */}
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search student by name or admission number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 text-sm"
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
                <div className="rounded-[2rem] bg-gradient-to-b from-white to-blue-50/80 px-2 pb-7 pt-4">
                  <div className="flex items-center gap-4">
                    <div className="relative flex h-24 w-28 shrink-0 items-center justify-center rounded-3xl border-[3px] border-blue-700 bg-white shadow-sm">
                      <BarChart3 className="h-10 w-10 text-blue-100" />
                      <span className="absolute -bottom-3 right-1 rounded-full bg-emerald-700 px-3 py-1.5 text-xs font-bold uppercase text-white">
                        Active
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h1 className="text-headline-small font-normal text-slate-950 capitalize">
                        {selectedGroup.student.firstName}
                        <br />
                        {selectedGroup.student.lastName}
                      </h1>
                      <p className="mt-2 text-label-large font-medium text-slate-700">
                        ID:{" "}
                        <span className="font-bold text-blue-700">
                          {getStudentRecordId(
                            selectedGroup.student as StudentPerformanceResponse["student"],
                          )}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-7 flex flex-wrap gap-3 pl-32">
                    <span className="rounded-full bg-emerald-300 px-4 py-1.5 text-xs font-bold uppercase text-emerald-900">
                      {selectedGroup.student.classLevel?.name ||
                        "Unassigned"}
                    </span>
                  </div>
                </div>

                {resultGroups.length > 1 && (
                  <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
                    {resultGroups.map((group) => {
                      const isActive =
                        group.student.id === selectedGroup.student.id;

                      return (
                        <button
                          key={group.student.id}
                          type="button"
                          onClick={() => {
                            setSelectedStudentId(group.student.id);
                            setShowAllMobileSubjects(false);
                            setSelectedSubject(null);
                          }}
                          className={cn(
                            "shrink-0 rounded-full border px-4 py-2 text-sm font-bold capitalize",
                            isActive
                              ? "border-blue-700 bg-blue-700 text-white"
                              : "border-slate-200 bg-white text-slate-600",
                          )}
                        >
                          {group.student.firstName}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="mt-8 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-title-large font-medium text-slate-950">
                      Academic Results
                    </h2>
                    <p className="text-body-small font-normal text-slate-500">
                      {performanceSubjects.length} Subjects registered
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-11 rounded-2xl bg-blue-50 px-4 text-label-large font-medium text-blue-700 hover:bg-blue-100"
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    Filter
                  </Button>
                </div>

                <div className="mt-4 space-y-4">
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
                          "flex w-full flex-col gap-3 rounded-3xl border bg-white p-4 text-left shadow-sm",
                          inProgress
                            ? "border-dashed border-slate-400 bg-blue-50/40"
                            : "border-slate-200",
                        )}
                      >
                        <div className="flex w-full items-center gap-3">
                          {inProgress ? (
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-blue-700">
                              <BookOpen className="h-6 w-6" />
                            </div>
                          ) : (
                            <MobileScoreRing percentage={summary.percentage} />
                          )}

                          <p className="min-w-0 flex-1 truncate text-base font-bold text-slate-950">
                            {getSubjectName(subject)}
                          </p>

                          <ChevronDown className="h-5 w-5 shrink-0 text-slate-500" />
                        </div>

                        <div className="flex items-center justify-between gap-3 pl-[68px]">
                          <p className="min-w-0 truncate text-sm font-medium text-slate-500">
                            {inProgress
                              ? "Grading in progress..."
                              : `${summary.enteredCount} of ${summary.totalCount} assessments`}
                          </p>

                          {inProgress ? (
                            <div className="h-2 w-16 shrink-0 overflow-hidden rounded-full bg-white">
                              <div className="h-full w-1/3 rounded-full bg-blue-200" />
                            </div>
                          ) : (
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
                      className="flex h-14 w-full items-center justify-center gap-3 rounded-3xl border border-blue-200 bg-blue-50 text-base font-bold text-blue-700"
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

            {resultGroups.length > 1 && (
              <section className="hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 md:block">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                      Children
                    </p>
                    <h2 className="mt-1.5 text-base sm:text-xl font-bold text-slate-900">
                      Choose a student record
                    </h2>
                  </div>
                  <Badge
                    variant="outline"
                    className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-600"
                  >
                    {filteredResultGroups.length} students
                  </Badge>
                </div>

                <div className="mt-5 grid gap-3 lg:grid-cols-3">
                  {filteredResultGroups.map((group) => {
                    const isActive =
                      group.student.id === selectedGroup?.student.id;

                    return (
                      <div key={group.student.id} className="relative">
                        <button
                          type="button"
                          onClick={() => setSelectedStudentId(group.student.id)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-2xl border px-4 py-4 text-left transition-colors duration-150",
                            isActive
                              ? "border-slate-300 bg-slate-100"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                          )}
                        >
                          <div
                            className={cn(
                              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                              isActive
                                ? "bg-slate-800 text-white"
                                : "bg-slate-100 text-slate-700",
                            )}
                          >
                            {getInitials(
                              `${group.student.firstName} ${group.student.lastName}`,
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900 capitalize">
                              {group.student.firstName} {group.student.lastName}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-slate-500">
                              {group.student.classLevel?.name ||
                                "Unassigned class"}{" "}
                              &middot; {group.results.length} subjects
                            </p>
                          </div>
                        </button>
                        {currentOrg?.slug && (
                          <div className="absolute right-2 top-2 flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setPrintModalGroup(group)}
                              className="rounded-md p-1.5 text-slate-400 hover:text-[#1447E6] hover:bg-blue-50 transition-colors"
                              title="Print & Preview Report Card"
                            >
                              <Printer className="h-4 w-4" />
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
                              className="rounded-md p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                              title="Download Report Card PDF"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {selectedNotifications.length > 0 && (
              <section className="hidden rounded-3xl border border-rose-100 bg-white p-6 shadow-sm sm:p-8 md:block">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
                      <AlertTriangle className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                        Alerts
                      </p>
                      <h2 className="mt-0.5 text-base sm:text-xl font-bold text-slate-900">
                        Low score notices
                      </h2>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="rounded-full border-rose-200 bg-rose-50 px-3 py-1 text-sm text-rose-600"
                  >
                    {selectedNotifications.length} active
                  </Badge>
                </div>

                <div className="mt-5 grid gap-3 lg:grid-cols-2">
                  {selectedNotifications.map((notification) => (
                    <article
                      key={notification.id}
                      className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-slate-900">
                            {notification.assessmentName}
                          </h3>
                          <p className="mt-1 text-sm leading-5 text-slate-500">
                            {notification.message}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="shrink-0 rounded-full border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-600"
                        >
                          {formatScore(notification.percentage)}%
                        </Badge>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                          {notification.subject?.name || "Subject"}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                          {formatScore(notification.score)}/
                          {formatScore(notification.expectedTotal)}
                        </span>
                        {notification.updatedAt && (
                          <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
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

            {selectedGroup && (
              <div className="hidden md:block">
                <StudentAcademicRecord
                  student={
                    selectedGroup.student as StudentPerformanceResponse["student"]
                  }
                  subjects={performanceSubjects}
                  eyebrow="Academic Record"
                  description="A visual summary of the published subject performance for this student, including assessment progress and recorded scores."
                  actionLabel="View Academic Record"
                  emptyTitle="No subject records available"
                  emptyDescription="The school has not published any subject spreadsheets for this student yet."
                />
              </div>
            )}

            {printModalGroup && currentOrg?.slug && (
              <ReportCardPrintModal
                orgSlug={currentOrg.slug}
                orgName={currentOrg.name}
                orgLogo={currentOrg.logo || undefined}
                orgAddress={currentOrg.address || undefined}
                student={printModalGroup.student}
                term={exportTerm}
                academicYear={exportYear}
                results={printModalGroup.results.map((r) => {
                  const total = r.values.reduce<number>(
                    (sum, val) => sum + (toNumericValue(val) ?? 0),
                    0
                  );
                  const rounded = Math.round(total);
                  const grade =
                    rounded >= 70
                      ? "A"
                      : rounded >= 60
                      ? "B"
                      : rounded >= 50
                      ? "C"
                      : rounded >= 40
                      ? "D"
                      : "F";
                  const remark =
                    rounded >= 70
                      ? "Excellent"
                      : rounded >= 60
                      ? "Very Good"
                      : rounded >= 50
                      ? "Good"
                      : rounded >= 40
                      ? "Fair"
                      : "Needs Improvement";
                  return {
                    subject: r.subject?.name || r.title || "Subject",
                    score: rounded,
                    maxScore: 100,
                    grade,
                    remark,
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
