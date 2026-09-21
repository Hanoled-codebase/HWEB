"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
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
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganization } from "@/hooks/useOrganization";
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

  const filteredData = useMemo(() => {
    if (!search.trim()) return localData.map((row, i) => ({ row, index: i }));
    const q = search.toLowerCase();
    return localData
      .map((row, i) => ({ row, index: i }))
      .filter(({ row }) =>
        getStudentName(row.student).toLowerCase().includes(q) ||
        (row.student.admissionNumber || "").toLowerCase().includes(q),
      );
  }, [localData, search]);

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

  return (
    // -m-4 offsets the layout's p-4 so the content can bleed edge-to-edge on mobile
    <div className="-mx-4 -mt-4 flex flex-col bg-[#F5F5FA] pb-28">
      {/* ── Scrollable content ── */}
      <div className="px-4 pt-5">
        {/* Subject / class info */}
        <div className="mb-1">
          <p className="text-[15px] font-semibold text-slate-900">
            {sheet.subject?.name || "Subject"}{" "}
            <span className="text-slate-400">·</span>{" "}
            {sheet.classLevel?.name || "Class"}
          </p>
        </div>

        {/* Assessment name subtitle */}
        <p className="mb-3 text-xs font-medium text-slate-500">
          {selectedAssessment.name}
        </p>

        {/* Status + max score badges */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
            <span className={cn("h-2 w-2 rounded-full", getStatusDotColor(sheet.status))} />
            {getStatusLabel(sheet.status)}
          </span>
          {typeof maxScore === "number" && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
              Max score: {maxScore}
            </span>
          )}
        </div>

        {/* Student count */}
        <div className="mb-3 flex items-center justify-between gap-2 flex-wrap text-sm text-slate-500">
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            <span>{localData.length} {localData.length === 1 ? "student" : "students"}</span>
          </div>
          {canEdit && localData.length > 0 && (
            <div className="hidden md:flex items-center gap-1.5 text-xs text-indigo-600 bg-indigo-50/80 px-2.5 py-1 rounded-full border border-indigo-100 font-medium">
              <Keyboard className="h-3.5 w-3.5" />
              <span>Use <kbd className="px-1 py-0.5 bg-white rounded border border-indigo-200 shadow-2xs font-sans text-[11px] font-bold">↑</kbd> <kbd className="px-1 py-0.5 bg-white rounded border border-indigo-200 shadow-2xs font-sans text-[11px] font-bold">↓</kbd> or <kbd className="px-1 py-0.5 bg-white rounded border border-indigo-200 shadow-2xs font-sans text-[11px] font-bold">Enter</kbd> to jump between students</span>
            </div>
          )}
        </div>

        {/* Search bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students"
            className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 shadow-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition"
          />
        </div>

        {/* Student list */}
        {filteredData.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center text-sm text-slate-400 shadow-sm">
            {localData.length === 0
              ? "No students yet. Sync the roster to load students."
              : "No students match your search."}
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredData.map(({ row, index: rowIndex }, itemIndex) => {
              const name = getStudentName(row.student);
              const initials = getInitials(name);
              const score = selectedAssessment
                ? getNumericValue(row, selectedAssessment.originalIndex)
                : null;
              const scoreDisplay = score !== null ? score : "";
              const atMax = typeof maxScore === "number" && score !== null && score >= maxScore;
              const atMin = score !== null && score <= 0;

              return (
                <div
                  key={row.student.id || rowIndex}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm transition-shadow hover:shadow-md"
                >
                  {/* Avatar */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold uppercase text-slate-600">
                    {initials}
                  </div>

                  {/* Name + admission */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {name}
                    </p>
                    {row.student.admissionNumber && (
                      <p className="mt-0.5 text-xs font-medium text-indigo-500 truncate">
                        {row.student.admissionNumber}
                      </p>
                    )}
                  </div>

                  {/* Score stepper */}
                  {canEdit ? (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        onClick={() => handleStepScore(rowIndex, -1)}
                        disabled={!canEdit || atMin}
                        className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer"
                        aria-label="Decrease score"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>

                      <div className="flex items-baseline sm:gap-0.5 justify-center">
                        <input
                          ref={(el) => {
                            inputRefs.current[itemIndex] = el;
                          }}
                          type="number"
                          value={scoreDisplay}
                          onChange={(e) => handleScoreChange(rowIndex, e.target.value)}
                          onFocus={(e) => e.target.select()}
                          onKeyDown={(e) => {
                            if (e.key === "ArrowDown" || e.key === "Enter") {
                              e.preventDefault();
                              if (itemIndex < filteredData.length - 1) {
                                const nextInput = inputRefs.current[itemIndex + 1];
                                if (nextInput) {
                                  nextInput.focus();
                                  nextInput.select();
                                }
                              }
                            } else if (e.key === "ArrowUp") {
                              e.preventDefault();
                              if (itemIndex > 0) {
                                const prevInput = inputRefs.current[itemIndex - 1];
                                if (prevInput) {
                                  prevInput.focus();
                                  prevInput.select();
                                }
                              }
                            }
                          }}
                          min={0}
                          max={typeof maxScore === "number" ? maxScore : undefined}
                          step="0.01"
                          className="w-14 sm:w-12 h-9 sm:h-8 bg-slate-50/80 focus:bg-white border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl sm:rounded-lg text-center text-sm font-bold text-slate-800 outline-none transition-all py-1 px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-2xs"
                          placeholder="—"
                        />
                        {typeof maxScore === "number" && (
                          <span className="hidden sm:inline text-xs font-medium text-slate-400">
                            /{maxScore}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleStepScore(rowIndex, 1)}
                        disabled={!canEdit || atMax}
                        className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer"
                        aria-label="Increase score"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="shrink-0 text-sm font-bold text-slate-700">
                      {score !== null ? (
                        <>
                          {score}
                          {typeof maxScore === "number" && (
                            <span className="hidden sm:inline text-xs font-medium text-slate-400">/{maxScore}</span>
                          )}
                        </>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Roster & spreadsheet controls (collapsible) ── */}
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <button
            onClick={() => setControlsOpen((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-4"
          >
            <div className="text-left">
              <p className="text-sm font-bold text-slate-800">
                Roster &amp; spreadsheet controls
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Keep this in sync with the class list
              </p>
            </div>
            {controlsOpen ? (
              <ChevronUp className="h-4 w-4 text-slate-500 shrink-0" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />
            )}
          </button>

          {controlsOpen && (
            <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-3">
              {isPrivileged && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Assessment status
                  </label>
                  <Select
                    value={sheet.status}
                    onValueChange={(val) =>
                      handleStatusChange(val as SpreadsheetStatus)
                    }
                  >
                    <SelectTrigger className="h-11 w-full rounded-xl border-slate-200 bg-white text-sm text-slate-700">
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
                  onClick={handleSyncStudents}
                  disabled={isSyncing}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 disabled:opacity-60 transition-colors"
                >
                  {isSyncing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Sync Roster
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Fixed bottom save button ── */}
      {canEdit && (
        <div className="fixed bottom-0 inset-x-0 bg-slate-50 px-4 pb-6 pt-3 z-20 md:absolute md:bottom-auto md:top-auto md:relative md:px-0 md:pb-0 md:pt-4">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-indigo-600 text-base font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-70 transition-colors"
          >
            {isSaving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            Save Scores
          </button>
        </div>
      )}
    </div>
  );
}
