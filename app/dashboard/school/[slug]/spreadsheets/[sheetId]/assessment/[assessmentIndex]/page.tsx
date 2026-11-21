"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  FileText,
  Keyboard,
  Lock,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  Save,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { BackButton } from "@/components/dashboard/shared";
import { useOrganization } from "@/hooks/useOrganization";
import { useMobilePageTitle } from "@/components/dashboard/mobile/MobileMenuProvider";
import { apiFetch } from "@/lib/api";
import {
  SpreadsheetAssessment,
  SpreadsheetDetail,
  SpreadsheetRow,
  SpreadsheetStatus,
  computeCategoryAllocationSummary,
  computeStudentRelationalTotals,
  formatScore,
  getErrorMessage,
  getInitials,
  getOrderedAssessments,
  getStudentName,
  parseIntegerParam,
  parseRouteParam,
  resolveSpreadsheetCategories,
  sanitizeSpreadsheetRows,
} from "@/lib/spreadsheets";
import { cn } from "@/lib/utils";

function getNumericValue(row: SpreadsheetRow, assessmentIndex: number): number | null {
  const value = row.values[assessmentIndex];
  if (value === null || value === undefined || value === "") return null;
  const n = parseFloat(String(value));
  return isNaN(n) ? null : n;
}

function getStatusDotColor(status: string) {
  if (status === "active") return "bg-emerald-500";
  if (status === "inactive") return "bg-slate-400";
  return "bg-amber-400";
}

function getStatusLabel(status: string) {
  if (status === "active") return "Active";
  if (status === "inactive") return "Inactive";
  return "Pending";
}

export default function AssessmentEntryPage() {
  const params = useParams();
  const router = useRouter();
  const { currentOrg, currentMember } = useOrganization();
  const sheetId = parseRouteParam(params.sheetId);
  const assessmentIndex = parseIntegerParam(params.assessmentIndex, 0);

  const [sheet, setSheet] = useState<SpreadsheetDetail | null>(null);
  const [localData, setLocalData] = useState<SpreadsheetRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [controlsOpen, setControlsOpen] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const assessmentsHref = currentOrg?.slug
    ? `/dashboard/school/${currentOrg.slug}/spreadsheets/${sheetId}`
    : "/dashboard";

  const isPrivileged =
    currentMember?.role === "owner" || currentMember?.role === "admin";
  const canEdit =
    isPrivileged ||
    (currentMember?.role === "member" && sheet?.status !== "inactive");

  const rawAssessments = useMemo<SpreadsheetAssessment[]>(
    () =>
      Array.isArray(sheet?.assessments) && sheet.assessments.length > 0
        ? sheet.assessments
        : Array.isArray(sheet?.columns)
          ? sheet.columns.map((name) => ({ name, total: undefined }))
          : [],
    [sheet],
  );
  const displayAssessments = getOrderedAssessments(rawAssessments);
  const selectedAssessment =
    displayAssessments.find(
      (assessment) => assessment.originalIndex === assessmentIndex,
    ) || null;

  const isRelational = sheet?.assessmentStorageMode === "RELATIONAL";
  const templateCategories = useMemo(
    () => resolveSpreadsheetCategories(sheet),
    [sheet],
  );
  const categoryAllocations = useMemo(
    () =>
      isRelational
        ? computeCategoryAllocationSummary(
            templateCategories,
            rawAssessments.map((item) => ({
              categoryId: item.categoryId,
              maxMarks: Number(item.maxObtainableScore ?? item.total) || 0,
            })),
          )
        : [],
    [isRelational, rawAssessments, templateCategories],
  );
  const incompleteAllocations = useMemo(
    () => categoryAllocations.filter((cat) => !cat.isComplete),
    [categoryAllocations],
  );
  const isAllocationBlocked = isRelational && incompleteAllocations.length > 0;
  const effectiveCanEdit = canEdit && !isAllocationBlocked;

  const hasChanges = useMemo(() => {
    return JSON.stringify(localData) !== JSON.stringify(sheet?.data || []);
  }, [localData, sheet?.data]);

  // Scores this teacher has typed but not saved, for the selected assessment only.
  const unsavedCount = useMemo(() => {
    if (!selectedAssessment) return 0;
    const saved = sheet?.data || [];
    return localData.reduce((count, row, i) => {
      const before = saved[i]?.values?.[selectedAssessment.originalIndex] ?? "";
      const after = row.values[selectedAssessment.originalIndex] ?? "";
      return String(before) === String(after) ? count : count + 1;
    }, 0);
  }, [localData, sheet?.data, selectedAssessment]);

  const enteredCount = useMemo(
    () =>
      selectedAssessment
        ? localData.filter((row) => getNumericValue(row, selectedAssessment.originalIndex) !== null).length
        : 0,
    [localData, selectedAssessment],
  );

  // Same order as the attendance register (surname, then first name), so a teacher
  // copying from the paper register never keys a score against the wrong learner.
  const orderedRows = useMemo(
    () =>
      localData
        .map((row, index) => ({ row, index }))
        .sort(
          (a, b) =>
            (a.row.student.lastName || "").localeCompare(b.row.student.lastName || "") ||
            (a.row.student.firstName || "").localeCompare(b.row.student.firstName || ""),
        ),
    [localData],
  );

  const filteredData = useMemo(() => {
    if (!search.trim()) return orderedRows;
    const q = search.toLowerCase();
    return orderedRows.filter(
      ({ row }) =>
        getStudentName(row.student).toLowerCase().includes(q) ||
        (row.student.admissionNumber || "").toLowerCase().includes(q),
    );
  }, [orderedRows, search]);

  useMobilePageTitle(selectedAssessment?.name);

  // Leaving with typed-but-unsaved scores asks first.
  useEffect(() => {
    if (!hasChanges) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasChanges]);

  const fetchSheet = useCallback(async () => {
    if (!currentOrg || !sheetId) return;
    try {
      setIsLoading(true);
      setLoadError(null);
      const data = await apiFetch<SpreadsheetDetail>(
        `/spreadsheets/${currentOrg.slug}/${sheetId}`,
      );
      const rawA =
        Array.isArray(data.assessments) && data.assessments.length > 0
          ? data.assessments
          : Array.isArray(data.columns)
            ? data.columns.map((name) => ({ name, total: undefined }))
            : [];
      const sanitizedData = sanitizeSpreadsheetRows(data.data, rawA);
      setSheet({ ...data, data: sanitizedData });
      setLocalData(sanitizedData);
    } catch (error) {
      const message = getErrorMessage(error, "Failed to load spreadsheet");
      setSheet(null);
      setLocalData([]);
      setLoadError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [currentOrg, sheetId]);

  useEffect(() => {
    fetchSheet();
  }, [fetchSheet]);

  const handleScoreChange = (rowIndex: number, value: string) => {
    if (!effectiveCanEdit || !selectedAssessment) return;
    const trimmed = value.trim();
    if (trimmed !== "") {
      const numeric = Number(trimmed);
      const maximum = selectedAssessment.maxObtainableScore ?? selectedAssessment.total;
      if (!Number.isFinite(numeric) || numeric < 0 || (maximum !== undefined && numeric > maximum)) {
        toast.error(`Enter a score from 0 to ${maximum ?? "the assessment maximum"}`);
        return;
      }
    }
    const normalizedValue = trimmed;
    setLocalData((currentRows) =>
      currentRows.map((row, i) => {
        if (i !== rowIndex) return row;
        const nextValues = [...row.values];
        nextValues[selectedAssessment.originalIndex] = normalizedValue;
        return { ...row, values: nextValues };
      }),
    );
  };

  const handleStepScore = (rowIndex: number, delta: number) => {
    if (!canEdit || !selectedAssessment) return;
    const row = localData[rowIndex];
    const current = getNumericValue(row, selectedAssessment.originalIndex) ?? 0;
    const next = current + delta;
    handleScoreChange(rowIndex, String(next));
  };

  const saveScores = async (): Promise<boolean> => {
    if (!currentOrg || !sheet || typeof sheet.version !== "number") {
      toast.error("Spreadsheet version missing. Refreshing...");
      fetchSheet();
      return false;
    }
    setIsSaving(true);
    try {
      const sanitizedData = sanitizeSpreadsheetRows(localData, rawAssessments);
      if (sheet.assessmentStorageMode === "RELATIONAL") {
        if (!selectedAssessment?.id) throw new Error("Assessment identifier is missing");
        const response = await apiFetch<{ data: { version: number } }>(
          `/spreadsheets/${currentOrg.slug}/${sheetId}/scores`,
          {
            method: "PUT",
            body: JSON.stringify({
              expectedVersion: sheet.version,
              scores: sanitizedData.map((row) => ({
                studentId: row.student.id,
                subAssessmentId: selectedAssessment.id,
                score: row.values[selectedAssessment.originalIndex] === ""
                  ? null
                  : Number(row.values[selectedAssessment.originalIndex]),
              })),
            }),
          },
        );
        setSheet({ ...sheet, version: response.data.version, data: sanitizedData });
        setLocalData(sanitizedData);
        toast.success(`${selectedAssessment.name} saved successfully`);
        return true;
      }
      const updatedSheet = await apiFetch<SpreadsheetDetail>(
        `/spreadsheets/${currentOrg.slug}/${sheetId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            data: sanitizedData,
            expectedVersion: sheet.version,
          }),
        },
      );
      const normalizedData = sanitizeSpreadsheetRows(
        updatedSheet.data || sanitizedData,
        Array.isArray(updatedSheet.assessments) && updatedSheet.assessments.length > 0
          ? updatedSheet.assessments
          : rawAssessments,
      );
      setSheet({ ...updatedSheet, data: normalizedData });
      setLocalData(normalizedData);
      toast.success(`${selectedAssessment?.name || "Assessment"} saved successfully`);
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to save spreadsheet"));
      fetchSheet();
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    await saveScores();
  };

  const handleBackClick = (event: React.MouseEvent<HTMLElement>) => {
    if (hasChanges) {
      event.preventDefault();
      setShowLeaveDialog(true);
    }
  };

  const handleSaveAndBack = async () => {
    const saved = await saveScores();
    if (saved) {
      setShowLeaveDialog(false);
      router.push(assessmentsHref);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!currentOrg || !sheet) return;
    try {
      await apiFetch(`/spreadsheets/${currentOrg.slug}/${sheetId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setSheet({ ...sheet, status: newStatus as SpreadsheetDetail["status"] });
      toast.success(`Status updated to ${newStatus}`);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update status"));
    }
  };

  const handleSyncStudents = async () => {
    if (!currentOrg || !sheet || typeof sheet.version !== "number") {
      toast.error("Spreadsheet version missing. Refreshing...");
      fetchSheet();
      return;
    }
    setIsSyncing(true);
    try {
      const data = await apiFetch<SpreadsheetDetail>(
        `/spreadsheets/${currentOrg.slug}/${sheetId}/merge`,
        {
          method: "POST",
          body: JSON.stringify({ expectedVersion: sheet.version }),
        },
      );
      const mergedAssessments =
        Array.isArray(data.assessments) && data.assessments.length > 0
          ? data.assessments
          : Array.isArray(data.columns)
            ? data.columns.map((name) => ({ name, total: undefined }))
            : [];
      const sanitizedData = sanitizeSpreadsheetRows(data.data, mergedAssessments);
      setSheet({ ...data, data: sanitizedData });
      setLocalData(sanitizedData);
      toast.success("Synchronized with current class roster");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to synchronize students"));
      fetchSheet();
    } finally {
      setIsSyncing(false);
    }
  };

  /* ── Error state ── */
  if (!isLoading && loadError) {
    return (
      <div className="space-y-4">
        <BackButton label="Back to Assessments" href={assessmentsHref} className="hidden md:inline-flex" />
        <div className="flex flex-col items-center justify-center px-4 py-16">
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-rose-200 bg-white p-10 text-center shadow-sm">
            <FileSpreadsheet className="mb-4 h-10 w-10 text-rose-300" />
            <h2 className="text-lg font-bold text-slate-800">Unable to Load</h2>
            <p className="mt-2 max-w-xs text-sm text-slate-500">{loadError}</p>
            <button
              type="button"
              onClick={() => void fetchSheet()}
              className="mt-5 min-h-11 rounded-xl bg-[#1447E6] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0F36B8]"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Loading skeleton ── */
  if (isLoading) {
    return (
      <div className="space-y-4 py-2">
        <BackButton label="Back to Assessments" href={assessmentsHref} className="hidden md:inline-flex" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-11 w-full rounded-2xl" />
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  /* ── Not found ── */
  if (!sheet || !selectedAssessment) {
    return (
      <div className="space-y-4">
        <BackButton label="Back to Assessments" href={assessmentsHref} className="hidden md:inline-flex" />
        <div className="flex flex-col items-center justify-center px-4 py-16">
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-blue-200 bg-white p-10 text-center shadow-sm">
            <FileText className="mb-4 h-10 w-10 text-blue-300" />
            <h2 className="text-lg font-bold text-slate-800">Assessment Not Found</h2>
            <p className="mt-2 max-w-xs text-sm text-slate-500">
              The selected assessment is unavailable.
            </p>
            <button
              type="button"
              onClick={() => router.push(assessmentsHref)}
              className="mt-5 min-h-11 rounded-xl bg-[#1447E6] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0F36B8]"
            >
              Back to Assessments
            </button>
          </div>
        </div>
      </div>
    );
  }

  const maxScore = selectedAssessment.maxObtainableScore ?? selectedAssessment.total;
  const total = localData.length;
  const progress = total > 0 ? Math.round((enteredCount / total) * 100) : 0;

  return (
    // -mx-4 -mt-4 cancel the layout padding so the sticky header can run edge to edge on phones.
    <div className="-mx-4 -mt-4 flex flex-col bg-slate-50 pb-32 md:mx-0 md:mt-0 md:pb-0">
      <BackButton
        label="Back to Assessments"
        href={assessmentsHref}
        onClick={handleBackClick}
        className="mb-3 hidden md:inline-flex"
      />
      {/* ── Sticky context: what is being scored, out of what, how far along ── */}
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-10 border-b border-slate-200 bg-white/95 px-4 pb-3 pt-3 backdrop-blur-md md:static md:rounded-2xl md:border md:px-5 md:pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="hidden truncate text-lg font-bold text-slate-900 md:block">{selectedAssessment.name}</h1>
            <p className="truncate text-sm font-semibold text-slate-900 md:font-medium md:text-slate-600">
              {sheet.subject?.name || "Subject"} <span className="text-slate-400">·</span> {sheet.classLevel?.name || "Class"}
            </p>
            {isRelational && selectedAssessment.categoryName && (
              <p className="mt-1 inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                <Lock className="h-3 w-3 text-slate-400" aria-hidden="true" />
                {selectedAssessment.categoryName}
                {typeof selectedAssessment.categoryMaxMarks === "number" && (
                  <span className="tabular-nums text-slate-500">
                    (Category max {selectedAssessment.categoryMaxMarks})
                  </span>
                )}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {typeof maxScore === "number" && (
              <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold tabular-nums text-blue-700">
                Out of {maxScore}
              </span>
            )}
            <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
              <span className={cn("h-2 w-2 rounded-full", getStatusDotColor(sheet.status))} />
              {getStatusLabel(sheet.status)}
            </span>
          </div>
        </div>

        {isAllocationBlocked && (
          <div
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
            <span>
              Score entry is locked until every parent category is 100% allocated:{" "}
              {incompleteAllocations
                .map((cat) => `${cat.name} (${cat.allocatedMarks}/${cat.maxMarks})`)
                .join(", ")}
              . Return to the main spreadsheet to finish allocation.
            </span>
          </div>
        )}

        <div className="mt-3 flex items-center gap-3">
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={enteredCount}
            aria-label="Scores entered"
          >
            <div className="h-full rounded-full bg-blue-600 transition-[width] duration-300" style={{ width: `${progress}%` }} />
          </div>
          <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-600">
            {enteredCount}/{total} entered
          </span>
        </div>

        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find a learner"
            aria-label="Find a learner"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-base text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 md:text-sm"
          />
        </div>

        {canEdit && total > 0 && (
          <p className="mt-2 hidden items-center gap-1.5 text-xs font-medium text-slate-500 md:flex">
            <Keyboard className="h-3.5 w-3.5" />
            <kbd className="rounded border border-slate-200 bg-white px-1 font-sans text-xs font-bold">↑</kbd>
            <kbd className="rounded border border-slate-200 bg-white px-1 font-sans text-xs font-bold">↓</kbd> or
            <kbd className="rounded border border-slate-200 bg-white px-1 font-sans text-xs font-bold">Enter</kbd> moves between learners
          </p>
        )}
      </div>

      {/* ── Learners ── */}
      <div className="px-4 pt-3 md:px-0">
        {filteredData.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500">
            {total === 0
              ? "No learners on this sheet yet. Open Roster controls below and sync the class list."
              : "No learner matches that search."}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {filteredData.map(({ row, index: rowIndex }, itemIndex) => {
              const name = getStudentName(row.student);
              const initials = getInitials(name);
              const score = getNumericValue(row, selectedAssessment.originalIndex);
              const scoreDisplay = score !== null ? score : "";
              const atMax = typeof maxScore === "number" && score !== null && score >= maxScore;
              const atMin = score !== null && score <= 0;
              const isLast = itemIndex === filteredData.length - 1;
              const relationalSummary = isRelational
                ? computeStudentRelationalTotals(templateCategories, rawAssessments, row.values)
                : null;
              const currentCatTotal =
                relationalSummary && selectedAssessment.categoryId
                  ? relationalSummary.categoryById.get(selectedAssessment.categoryId)
                  : null;

              return (
                <li key={row.student.id || rowIndex} className="flex min-h-[64px] items-center gap-3 px-4 py-2">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold uppercase",
                      score !== null ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600",
                    )}
                  >
                    {score !== null ? <Check className="h-4 w-4" /> : initials}
                  </span>

                  <label htmlFor={`score-${rowIndex}`} className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-slate-900">{name}</span>
                    {row.student.admissionNumber && (
                      <span className="block truncate text-xs text-slate-500">{row.student.admissionNumber}</span>
                    )}
                    {relationalSummary && (
                      <span className="mt-0.5 block truncate text-xs font-medium tabular-nums text-slate-500">
                        {currentCatTotal
                          ? `${currentCatTotal.categoryName}: ${formatScore(currentCatTotal.earned)}/${currentCatTotal.maxMarks} · `
                          : ""}
                        Overall: {formatScore(relationalSummary.overallEarned)}/{relationalSummary.overallMax}
                      </span>
                    )}
                  </label>

                  {effectiveCanEdit ? (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleStepScore(rowIndex, -1)}
                        disabled={atMin}
                        className="hidden h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-40 md:flex pointer-coarse:h-11 pointer-coarse:w-11"
                        aria-label={`Decrease score for ${name}`}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>

                      <div className="flex items-baseline gap-1">
                        <input
                          id={`score-${rowIndex}`}
                          ref={(el) => {
                            inputRefs.current[itemIndex] = el;
                          }}
                          type="number"
                          inputMode="decimal"
                          enterKeyHint={isLast ? "done" : "next"}
                          value={scoreDisplay}
                          onChange={(e) => handleScoreChange(rowIndex, e.target.value)}
                          onFocus={(e) => e.target.select()}
                          onKeyDown={(e) => {
                            if (e.key === "ArrowDown" || e.key === "Enter") {
                              e.preventDefault();
                              const nextInput = inputRefs.current[itemIndex + 1];
                              if (!isLast && nextInput) {
                                nextInput.focus();
                                nextInput.select();
                              } else {
                                e.currentTarget.blur();
                              }
                            } else if (e.key === "ArrowUp") {
                              e.preventDefault();
                              const prevInput = inputRefs.current[itemIndex - 1];
                              if (itemIndex > 0 && prevInput) {
                                prevInput.focus();
                                prevInput.select();
                              }
                            }
                          }}
                          min={0}
                          max={typeof maxScore === "number" ? maxScore : undefined}
                          step="0.01"
                          className="h-12 w-16 rounded-xl border border-slate-200 bg-slate-50 px-1 text-center text-base font-bold tabular-nums text-slate-900 outline-none transition-colors [appearance:textfield] focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 md:h-10 md:w-14 md:text-sm [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          placeholder="—"
                        />
                        {typeof maxScore === "number" && (
                          <span className="w-7 text-xs font-medium tabular-nums text-slate-500">/{maxScore}</span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleStepScore(rowIndex, 1)}
                        disabled={atMax}
                        className="hidden h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-40 md:flex pointer-coarse:h-11 pointer-coarse:w-11"
                        aria-label={`Increase score for ${name}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="shrink-0 text-base font-bold tabular-nums text-slate-800">
                      {score !== null ? (
                        <>
                          {score}
                          {typeof maxScore === "number" && (
                            <span className="text-xs font-medium text-slate-500">/{maxScore}</span>
                          )}
                        </>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {/* ── Roster & sheet controls: rare, so folded away below the work ── */}
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => setControlsOpen((v) => !v)}
            aria-expanded={controlsOpen}
            className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left"
          >
            <span>
              <span className="block text-sm font-semibold text-slate-900">Roster controls</span>
              <span className="mt-0.5 block text-xs text-slate-500">Sync with the class list{isPrivileged ? " or change the sheet status" : ""}</span>
            </span>
            {controlsOpen ? (
              <ChevronUp className="h-4 w-4 shrink-0 text-slate-500" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
            )}
          </button>

          {controlsOpen && (
            <div className="space-y-3 border-t border-slate-100 px-4 pb-4 pt-3">
              {isPrivileged && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Sheet status</label>
                  <Select value={sheet.status} onValueChange={(val) => handleStatusChange(val as SpreadsheetStatus)}>
                    <SelectTrigger className="h-11 w-full rounded-xl border-slate-200 bg-white text-slate-800">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {canEdit && (
                <button
                  type="button"
                  onClick={handleSyncStudents}
                  disabled={isSyncing}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-blue-200 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50 disabled:opacity-60"
                >
                  {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Sync with class list
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Save: owns the bottom edge on phones (the tab bar steps aside on this route) ── */}
      {effectiveCanEdit && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md md:static md:mt-4 md:border-0 md:bg-transparent md:p-0">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className={cn(
              "flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl text-base font-semibold transition-colors md:h-12 md:w-auto md:px-8",
              isSaving || !hasChanges
                ? "bg-slate-200 text-slate-600"
                : "bg-blue-600 text-white hover:bg-blue-700",
            )}
          >
            {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : hasChanges ? <Save className="h-5 w-5" /> : <Check className="h-5 w-5" />}
            {isSaving
              ? "Saving…"
              : hasChanges
                ? `Save ${unsavedCount || ""} ${unsavedCount === 1 ? "score" : "scores"}`.replace("  ", " ")
                : "All scores saved"}
          </button>
        </div>
      )}

      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Unsaved score changes</DialogTitle>
            <DialogDescription>
              You have {unsavedCount} unsaved {unsavedCount === 1 ? "score" : "scores"} for{" "}
              {selectedAssessment.name}. Save before returning to Assessments?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              disabled={isSaving}
              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              onClick={() => {
                setShowLeaveDialog(false);
                router.push(assessmentsHref);
              }}
            >
              Discard &amp; leave
            </Button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                autoFocus
                disabled={isSaving}
                onClick={() => setShowLeaveDialog(false)}
              >
                Stay on page
              </Button>
              <Button
                type="button"
                disabled={isSaving}
                className="bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => void handleSaveAndBack()}
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                Save &amp; go back
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
