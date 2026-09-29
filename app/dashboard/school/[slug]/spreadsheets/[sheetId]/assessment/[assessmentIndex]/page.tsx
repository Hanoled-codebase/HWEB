"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  FileText,
  Keyboard,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  Save,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganization } from "@/hooks/useOrganization";
import { useMobilePageTitle } from "@/components/dashboard/mobile/MobileMenuProvider";
import { apiFetch } from "@/lib/api";
import {
  SpreadsheetDetail,
  SpreadsheetRow,
  SpreadsheetStatus,
  clampAssessmentScore,
  getErrorMessage,
  getInitials,
  getOrderedAssessments,
  getStudentName,
  parseIntegerParam,
  parseRouteParam,
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
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const isPrivileged =
    currentMember?.role === "owner" || currentMember?.role === "admin";
  const canEdit =
    isPrivileged ||
    (currentMember?.role === "member" && sheet?.status !== "inactive");

  const rawAssessments =
    Array.isArray(sheet?.assessments) && sheet.assessments.length > 0
      ? sheet.assessments
      : Array.isArray(sheet?.columns)
        ? sheet.columns.map((name) => ({ name, total: undefined }))
        : [];
  const displayAssessments = getOrderedAssessments(rawAssessments);
  const selectedAssessment =
    displayAssessments.find(
      (assessment) => assessment.originalIndex === assessmentIndex,
    ) || null;

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
    if (!canEdit || !selectedAssessment) return;
    const clampedValue = clampAssessmentScore(value, selectedAssessment.total);
    const normalizedValue = clampedValue === "" ? "" : String(clampedValue);
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

  const handleSave = async () => {
    if (!currentOrg || !sheet) return;
    setIsSaving(true);
    try {
      const sanitizedData = sanitizeSpreadsheetRows(localData, rawAssessments);
      const updatedSheet = await apiFetch<SpreadsheetDetail>(
        `/spreadsheets/${currentOrg.slug}/${sheetId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ data: sanitizedData }),
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
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to save spreadsheet"));
    } finally {
      setIsSaving(false);
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
    if (!currentOrg) return;
    setIsSyncing(true);
    try {
      const data = await apiFetch<SpreadsheetDetail>(
        `/spreadsheets/${currentOrg.slug}/${sheetId}/merge`,
        { method: "POST" },
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
    } finally {
      setIsSyncing(false);
    }
  };

  /* ── Error state ── */
  if (!isLoading && loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-rose-200 bg-white p-10 text-center shadow-sm">
          <FileSpreadsheet className="mb-4 h-10 w-10 text-rose-300" />
          <h2 className="text-lg font-bold text-slate-800">Unable to Load</h2>
          <p className="mt-2 max-w-xs text-sm text-slate-500">{loadError}</p>
          <button
            onClick={() => void fetchSheet()}
            className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  /* ── Loading skeleton ── */
  if (isLoading) {
    return (
      <div className="space-y-4 py-2">
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
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-blue-200 bg-white p-10 text-center shadow-sm">
          <FileText className="mb-4 h-10 w-10 text-blue-300" />
          <h2 className="text-lg font-bold text-slate-800">Assessment Not Found</h2>
          <p className="mt-2 max-w-xs text-sm text-slate-500">
            The selected assessment is unavailable.
          </p>
          <button
            onClick={() =>
              router.push(
                `/dashboard/school/${currentOrg?.slug}/spreadsheets/${sheetId}`,
              )
            }
            className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Back to Assessments
          </button>
        </div>
      </div>
    );
  }

  const maxScore = selectedAssessment.total;
  const total = localData.length;
  const progress = total > 0 ? Math.round((enteredCount / total) * 100) : 0;

  return (
    // -mx-4 -mt-4 cancel the layout padding so the sticky header can run edge to edge on phones.
    <div className="-mx-4 -mt-4 flex flex-col bg-slate-50 pb-32 md:mx-0 md:mt-0 md:pb-0">
      {/* ── Sticky context: what is being scored, out of what, how far along ── */}
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-10 border-b border-slate-200 bg-white/95 px-4 pb-3 pt-3 backdrop-blur-md md:static md:rounded-2xl md:border md:px-5 md:pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="hidden truncate text-lg font-bold text-slate-900 md:block">{selectedAssessment.name}</h1>
            <p className="truncate text-sm font-semibold text-slate-900 md:font-medium md:text-slate-600">
              {sheet.subject?.name || "Subject"} <span className="text-slate-400">·</span> {sheet.classLevel?.name || "Class"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {typeof maxScore === "number" && (
              <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
                Out of {maxScore}
              </span>
            )}
            <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
              <span className={cn("h-2 w-2 rounded-full", getStatusDotColor(sheet.status))} />
              {getStatusLabel(sheet.status)}
            </span>
          </div>
        </div>

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
                  </label>

                  {canEdit ? (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleStepScore(rowIndex, -1)}
                        disabled={atMin}
                        className="hidden h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-40 md:flex"
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
                        className="hidden h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-40 md:flex"
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
      {canEdit && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md md:static md:mt-4 md:border-0 md:bg-transparent md:p-0">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-blue-600 text-base font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-500 md:h-12 md:w-auto md:px-8"
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
    </div>
  );
}
