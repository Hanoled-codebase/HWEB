"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  FileSpreadsheet,
  FileText,
  Keyboard,
  Layers,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  Save,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { BackButton } from "@/components/dashboard/shared";
import { useMobilePageTitle } from "@/components/dashboard/mobile/MobileMenuProvider";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  computeStudentRelationalTotals,
  formatScore,
  getErrorMessage,
  getInitials,
  getSpreadsheetRowKey,
  getStudentName,
  parseRouteParam,
  resolveAssessmentEntryTarget,
  resolveSpreadsheetCategories,
  sanitizeSpreadsheetRows,
  sortAssessmentRows,
  type AssessmentSortMode,
  type SpreadsheetAssessment,
  type SpreadsheetDetail,
  type SpreadsheetRow,
  type SpreadsheetStatus,
} from "@/lib/spreadsheets";
import {
  buildSpreadsheetDraftKey,
  clearSpreadsheetDraft,
  downloadSpreadsheetBackupCsv,
  extractDirtyAssessmentDraft,
  loadSpreadsheetDraft,
  mergeDraftIntoSpreadsheetRows,
  saveSpreadsheetDraft,
} from "@/lib/spreadsheet-drafts";
import { cn } from "@/lib/utils";

function getNumericValue(row: SpreadsheetRow, assessmentIndex: number): number | null {
  const value = row.values[assessmentIndex];
  if (value === null || value === undefined || value === "") return null;
  const n = parseFloat(String(value));
  return Number.isNaN(n) ? null : n;
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

function padRowValues(rows: SpreadsheetRow[], minLength: number): SpreadsheetRow[] {
  return rows.map((row) => {
    if (row.values.length >= minLength) return row;
    const nextValues = [...row.values];
    while (nextValues.length < minLength) {
      nextValues.push("");
    }
    return { ...row, values: nextValues };
  });
}

type SortOption = {
  value: AssessmentSortMode;
  label: string;
  shortLabel: string;
  group: "name" | "score";
};

const SORT_OPTIONS: readonly SortOption[] = [
  { value: "name-asc", label: "Name (A–Z)", shortLabel: "A–Z", group: "name" },
  { value: "name-desc", label: "Name (Z–A)", shortLabel: "Z–A", group: "name" },
  {
    value: "unentered-first",
    label: "Unentered scores first",
    shortLabel: "Unentered",
    group: "score",
  },
  {
    value: "entered-first",
    label: "Entered scores first",
    shortLabel: "Entered",
    group: "score",
  },
];

export default function AssessmentEntryPage() {
  const params = useParams();
  const router = useRouter();
  const { currentOrg, currentMember } = useOrganization();
  const orgSlug = currentOrg?.slug;
  const sheetId = parseRouteParam(params.sheetId);
  const rawAssessmentParam = parseRouteParam(params.assessmentIndex);

  const [sheet, setSheet] = useState<SpreadsheetDetail | null>(null);
  const [localData, setLocalData] = useState<SpreadsheetRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<AssessmentSortMode>("name-asc");
  const [scoreSortSnapshot, setScoreSortSnapshot] = useState<ReadonlySet<string> | null>(null);
  const [sortAnnouncement, setSortAnnouncement] = useState("");
  const [controlsOpen, setControlsOpen] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveErrorIsConflict, setSaveErrorIsConflict] = useState(false);
  const [restoredDraftCount, setRestoredDraftCount] = useState(0);
  const [reloadSeq, setReloadSeq] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const draftKey =
    orgSlug && sheetId && rawAssessmentParam
      ? buildSpreadsheetDraftKey(orgSlug, sheetId, `assessment:${rawAssessmentParam}`)
      : null;

  const assessmentsHref = orgSlug
    ? `/dashboard/school/${orgSlug}/spreadsheets/${sheetId}`
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

  const entryTarget = useMemo(
    () => resolveAssessmentEntryTarget(sheet, rawAssessmentParam),
    [rawAssessmentParam, sheet],
  );
  const selectedAssessment = entryTarget?.assessment ?? null;
  const isRelational = sheet?.assessmentStorageMode === "RELATIONAL";
  const templateCategories = useMemo(
    () => (isRelational ? resolveSpreadsheetCategories(sheet) : []),
    [isRelational, sheet],
  );

  const effectiveAssessments = useMemo<SpreadsheetAssessment[]>(() => {
    if (!entryTarget?.isVirtualDefault || !selectedAssessment) return rawAssessments;
    return [
      ...rawAssessments,
      {
        ...selectedAssessment,
        id: `virtual:${selectedAssessment.categoryId ?? "default"}`,
      },
    ];
  }, [entryTarget?.isVirtualDefault, rawAssessments, selectedAssessment]);

  const backHref =
    entryTarget?.returnsToCategoryList && entryTarget.parentCategory && orgSlug
      ? `/dashboard/school/${orgSlug}/spreadsheets/${sheetId}/category/${encodeURIComponent(entryTarget.parentCategory.id)}`
      : assessmentsHref;
  const backLabel =
    entryTarget?.returnsToCategoryList && entryTarget.parentCategory
      ? `Back to ${entryTarget.parentCategory.name}`
      : "Back to Assessments";

  const canSplitIntoSubs = Boolean(
    isRelational &&
      canEdit &&
      !sheet?.hcoreAssessmentId &&
      entryTarget?.parentCategory &&
      !entryTarget.parentCategory.isSingleInstance &&
      !entryTarget.returnsToCategoryList &&
      orgSlug,
  );

  // Scores typed but not saved for the active assessment (O(R) with zero JSON.stringify).
  const unsavedCount = useMemo(() => {
    if (!selectedAssessment) return 0;
    const saved = sheet?.data || [];
    let count = 0;
    for (let i = 0; i < localData.length; i += 1) {
      const before = saved[i]?.values?.[selectedAssessment.originalIndex] ?? "";
      const after = localData[i]?.values?.[selectedAssessment.originalIndex] ?? "";
      if (String(before) !== String(after)) {
        count += 1;
      }
    }
    return count;
  }, [localData, sheet?.data, selectedAssessment]);

  const hasChanges = unsavedCount > 0;

  const enteredCount = useMemo(
    () =>
      selectedAssessment
        ? localData.filter((row) => getNumericValue(row, selectedAssessment.originalIndex) !== null)
            .length
        : 0,
    [localData, selectedAssessment],
  );
  const unenteredCount = Math.max(0, localData.length - enteredCount);

  const activeSortOption =
    SORT_OPTIONS.find((option) => option.value === sortMode) ?? SORT_OPTIONS[0];

  const handleSelectSortMode = (nextMode: AssessmentSortMode) => {
    setSortMode(nextMode);
    if (
      selectedAssessment &&
      (nextMode === "unentered-first" || nextMode === "entered-first")
    ) {
      const enteredKeys = new Set<string>();
      for (let i = 0; i < localData.length; i += 1) {
        if (getNumericValue(localData[i], selectedAssessment.originalIndex) !== null) {
          enteredKeys.add(getSpreadsheetRowKey(localData[i], i));
        }
      }
      setScoreSortSnapshot(enteredKeys);
    } else {
      setScoreSortSnapshot(null);
    }
    const chosen = SORT_OPTIONS.find((option) => option.value === nextMode);
    if (chosen) {
      setSortAnnouncement(`Sorted by ${chosen.label}`);
    }
  };

  // Default order matches the attendance register (surname, then first name).
  const orderedRows = useMemo(
    () =>
      sortAssessmentRows(
        localData,
        selectedAssessment?.originalIndex ?? 0,
        sortMode,
        sortMode === "unentered-first" || sortMode === "entered-first"
          ? scoreSortSnapshot
          : null,
      ),
    [localData, scoreSortSnapshot, selectedAssessment?.originalIndex, sortMode],
  );

  const filteredData = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orderedRows;
    return orderedRows.filter(
      ({ row }) =>
        getStudentName(row.student).toLowerCase().includes(q) ||
        (row.student.admissionNumber || "").toLowerCase().includes(q),
    );
  }, [orderedRows, search]);

  useEffect(() => {
    inputRefs.current.length = filteredData.length;
  }, [filteredData.length]);

  useMobilePageTitle(selectedAssessment?.name);

  useEffect(() => {
    if (!hasChanges) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasChanges]);

  const fetchSheet = () => {
    setReloadSeq((n) => n + 1);
  };

  useEffect(() => {
    if (!orgSlug || !sheetId) return;
    let cancelled = false;
    const load = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        const data = await apiFetch<SpreadsheetDetail>(
          `/spreadsheets/${orgSlug}/${sheetId}`,
        );
        if (cancelled) return;
        const rawA =
          Array.isArray(data.assessments) && data.assessments.length > 0
            ? data.assessments
            : Array.isArray(data.columns)
              ? data.columns.map((name) => ({ name, total: undefined }))
              : [];
        const resolved = resolveAssessmentEntryTarget(data, rawAssessmentParam);
        const assessmentsForSanitize = resolved?.isVirtualDefault
          ? [
              ...rawA,
              {
                ...resolved.assessment,
                id: `virtual:${resolved.assessment.categoryId ?? "default"}`,
              },
            ]
          : rawA;
        const sanitizedBase = sanitizeSpreadsheetRows(data.data, rawA);
        const paddedData = resolved?.isVirtualDefault
          ? padRowValues(sanitizedBase, rawA.length + 1)
          : sanitizedBase;

        const savedDraft = loadSpreadsheetDraft(
          buildSpreadsheetDraftKey(orgSlug, sheetId, `assessment:${rawAssessmentParam}`),
        );
        if (savedDraft) {
          const merged = mergeDraftIntoSpreadsheetRows(
            paddedData,
            assessmentsForSanitize,
            savedDraft.valuesByStudent,
          );
          setSheet({ ...data, data: paddedData });
          setLocalData(merged.rows);
          setRestoredDraftCount(merged.restoredCount);
        } else {
          setSheet({ ...data, data: paddedData });
          setLocalData(paddedData);
          setRestoredDraftCount(0);
        }
        setSaveError(null);
        setSaveErrorIsConflict(false);
      } catch (error) {
        if (cancelled) return;
        const message = getErrorMessage(
          error,
          "Could not load this assessment sheet. Check your connection and try again.",
        );
        setSheet(null);
        setLocalData([]);
        setLoadError(message);
        toast.error(message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [orgSlug, rawAssessmentParam, reloadSeq, sheetId]);

  // Persist unsaved score changes locally so network drops or API errors never erase teacher input.
  useEffect(() => {
    if (!draftKey || !sheet || !selectedAssessment) return;
    const colKey =
      selectedAssessment.id ||
      (entryTarget?.isVirtualDefault
        ? `virtual:${selectedAssessment.categoryId ?? "default"}`
        : String(selectedAssessment.originalIndex));
    const dirty = extractDirtyAssessmentDraft(
      sheet.data || [],
      localData,
      selectedAssessment.originalIndex,
      colKey,
    );
    saveSpreadsheetDraft(draftKey, dirty);
  }, [draftKey, entryTarget?.isVirtualDefault, localData, selectedAssessment, sheet]);

  const handleScoreChange = (rowIndex: number, value: string) => {
    if (!canEdit || !selectedAssessment) return;
    const trimmed = value.trim();
    if (trimmed !== "") {
      const numeric = Number(trimmed);
      const maximum = selectedAssessment.maxObtainableScore ?? selectedAssessment.total;
      if (!Number.isFinite(numeric) || numeric < 0 || (maximum !== undefined && numeric > maximum)) {
        toast.error(
          maximum !== undefined
            ? `Enter a score between 0 and ${maximum}.`
            : "Enter a score of 0 or higher.",
        );
        return;
      }
    }
    setLocalData((currentRows) =>
      currentRows.map((row, i) => {
        if (i !== rowIndex) return row;
        const nextValues = [...row.values];
        nextValues[selectedAssessment.originalIndex] = trimmed;
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
    if (!orgSlug || !sheet || typeof sheet.version !== "number" || !selectedAssessment) {
      toast.error("Sheet data is out of date. Reloading the latest version…");
      fetchSheet();
      return false;
    }
    setIsSaving(true);
    try {
      const sanitizedData = sanitizeSpreadsheetRows(localData, effectiveAssessments);
      if (sheet.assessmentStorageMode === "RELATIONAL") {
        let targetSubAssessmentId = selectedAssessment.id;
        let versionForSave = sheet.version;
        let autoProvisioned = false;

        if (!targetSubAssessmentId && entryTarget?.isVirtualDefault && entryTarget.parentCategory) {
          const created = await apiFetch<{
            data?: { id?: string };
            version?: number;
          }>(`/spreadsheets/${orgSlug}/${sheetId}/sub-assessments`, {
            method: "POST",
            body: JSON.stringify({
              categoryId: entryTarget.parentCategory.id,
              name: entryTarget.parentCategory.name,
              maxMarks: entryTarget.parentCategory.maxMarks,
            }),
          });
          targetSubAssessmentId = created?.data?.id;
          if (typeof created?.version === "number") {
            versionForSave = created.version;
          } else {
            versionForSave = sheet.version + 1;
          }
          autoProvisioned = true;
        }

        if (!targetSubAssessmentId) {
          throw new Error("Assessment identifier is missing");
        }

        const response = await apiFetch<{ data: { version: number } }>(
          `/spreadsheets/${orgSlug}/${sheetId}/scores`,
          {
            method: "PUT",
            body: JSON.stringify({
              expectedVersion: versionForSave,
              scores: sanitizedData.map((row) => ({
                studentId: row.student.id,
                subAssessmentId: targetSubAssessmentId,
                score:
                  row.values[selectedAssessment.originalIndex] === ""
                    ? null
                    : Number(row.values[selectedAssessment.originalIndex]),
              })),
            }),
          },
        );

        setSaveError(null);
        setSaveErrorIsConflict(false);
        setRestoredDraftCount(0);
        if (draftKey) clearSpreadsheetDraft(draftKey);
        toast.success(`${selectedAssessment.name} scores saved`);

        if (autoProvisioned) {
          router.replace(
            `/dashboard/school/${orgSlug}/spreadsheets/${sheetId}/assessment/${encodeURIComponent(targetSubAssessmentId)}`,
          );
          return true;
        }

        setSheet({ ...sheet, version: response.data.version, data: sanitizedData });
        setLocalData(sanitizedData);
        return true;
      }

      const updatedSheet = await apiFetch<SpreadsheetDetail>(
        `/spreadsheets/${orgSlug}/${sheetId}`,
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
      setSaveError(null);
      setSaveErrorIsConflict(false);
      setRestoredDraftCount(0);
      if (draftKey) clearSpreadsheetDraft(draftKey);
      toast.success(`${selectedAssessment.name} scores saved`);
      return true;
    } catch (error) {
      const message = getErrorMessage(error, "Could not save scores");
      const status =
        typeof error === "object" && error !== null && "status" in error
          ? Number((error as { status?: number }).status)
          : undefined;
      setSaveError(message);
      setSaveErrorIsConflict(status === 409);
      toast.error(`${message}. Your scores are kept on this device.`);
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
      router.push(backHref);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!orgSlug || !sheet) return;
    try {
      await apiFetch(`/spreadsheets/${orgSlug}/${sheetId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setSheet({ ...sheet, status: newStatus as SpreadsheetDetail["status"] });
      toast.success(`Sheet status set to ${getStatusLabel(newStatus)}`);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not update sheet status"));
    }
  };

  const handleSyncStudents = async () => {
    if (!orgSlug || !sheet || typeof sheet.version !== "number") {
      toast.error("Sheet data is out of date. Reloading the latest version…");
      fetchSheet();
      return;
    }
    setIsSyncing(true);
    try {
      const data = await apiFetch<SpreadsheetDetail>(
        `/spreadsheets/${orgSlug}/${sheetId}/merge`,
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
      const sanitizedBase = sanitizeSpreadsheetRows(data.data, mergedAssessments);
      const paddedData = entryTarget?.isVirtualDefault
        ? padRowValues(sanitizedBase, mergedAssessments.length + 1)
        : sanitizedBase;
      setSheet({ ...data, data: paddedData });
      setLocalData(paddedData);
      toast.success("Class list synced");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not sync the class list"));
      if (!hasChanges) fetchSheet();
    } finally {
      setIsSyncing(false);
    }
  };

  /* ── Error state ── */
  if (!isLoading && loadError) {
    return (
      <div className="space-y-4">
        <BackButton label={backLabel} href={backHref} className="hidden md:inline-flex" />
        <div className="flex flex-col items-center justify-center px-4 py-16">
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-rose-200 bg-white p-10 text-center shadow-2xs">
            <FileSpreadsheet className="mb-4 h-10 w-10 text-rose-300" aria-hidden="true" />
            <h2 className="text-lg font-bold text-[#0B1220]">Could not load assessment</h2>
            <p className="mt-2 max-w-xs text-sm text-slate-500">{loadError}</p>
            <button
              type="button"
              onClick={fetchSheet}
              className="mt-5 min-h-11 rounded-xl bg-[#1447E6] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0F36B8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1447E6]"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Loading skeleton ── */
  if (isLoading) {
    return (
      <div className="space-y-4 py-2 md:mx-auto md:max-w-3xl">
        <BackButton label={backLabel} href={backHref} className="hidden md:inline-flex" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-11 w-full rounded-2xl" />
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  /* ── Not found ── */
  if (!sheet || !selectedAssessment) {
    return (
      <div className="space-y-4">
        <BackButton label={backLabel} href={backHref} className="hidden md:inline-flex" />
        <div className="flex flex-col items-center justify-center px-4 py-16">
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-blue-200 bg-white p-10 text-center shadow-2xs">
            <FileText className="mb-4 h-10 w-10 text-blue-300" aria-hidden="true" />
            <h2 className="text-lg font-bold text-[#0B1220]">Assessment not found</h2>
            <p className="mt-2 max-w-xs text-sm text-slate-500">
              This assessment may have been removed or moved.
            </p>
            <button
              type="button"
              onClick={() => router.push(backHref)}
              className="mt-5 min-h-11 rounded-xl bg-[#1447E6] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0F36B8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1447E6]"
            >
              {backLabel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const maxScore = selectedAssessment.maxObtainableScore ?? selectedAssessment.total;
  const total = localData.length;
  const progress = total > 0 ? Math.round((enteredCount / total) * 100) : 0;
  const showNormalizedCategorySubline = Boolean(
    isRelational && entryTarget?.returnsToCategoryList && selectedAssessment.categoryId,
  );

  return (
    <div className="-mx-4 -mt-4 flex flex-col bg-slate-50 pb-32 md:mx-auto md:mt-0 md:max-w-3xl md:bg-transparent md:pb-0">
      <BackButton
        label={backLabel}
        href={backHref}
        onClick={handleBackClick}
        className="mb-3 hidden md:inline-flex"
      />

      {/* Sticky context: what is being scored, out of what, how far along */}
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-10 border-b border-slate-200 bg-white/95 px-4 pb-3 pt-3 backdrop-blur-md md:static md:rounded-2xl md:border md:px-5 md:pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="hidden truncate text-lg font-bold text-[#0B1220] md:block">
              {selectedAssessment.name}
            </h1>
            <p className="truncate text-sm font-semibold text-[#0B1220] md:font-medium md:text-slate-600">
              {sheet.subject?.name || "Subject"}{" "}
              <span className="text-slate-400">·</span>{" "}
              {sheet.classLevel?.name || "Class"}
            </p>
            {entryTarget?.returnsToCategoryList && entryTarget.parentCategory && (
              <p className="mt-0.5 truncate text-xs font-medium text-slate-500 tabular-nums">
                {entryTarget.parentCategory.name} · scales to {entryTarget.parentCategory.maxMarks} max
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {typeof maxScore === "number" && (
              <span className="rounded-full bg-[#EEF0FF] px-3 py-1 text-xs font-bold tabular-nums text-[#1447E6] ring-1 ring-[#1447E6]/15">
                Out of {maxScore}
              </span>
            )}
            <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
              <span className={cn("h-2 w-2 rounded-full", getStatusDotColor(sheet.status))} aria-hidden="true" />
              {getStatusLabel(sheet.status)}
            </span>
          </div>
        </div>

        {saveError && (
          <div
            role="alert"
            className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs text-rose-950"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-rose-950">
                  Scores were not saved: {saveError}
                </p>
                <p className="mt-0.5 text-rose-900">
                  Your entries are kept on this device. Try saving again, or download a CSV backup.
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => void handleSave()}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-[#1447E6] px-3.5 text-xs font-semibold text-white transition-colors hover:bg-[#0F36B8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1447E6] disabled:opacity-60 md:pointer-fine:min-h-8"
                  >
                    {isSaving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    ) : (
                      <Save className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    Retry save
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      downloadSpreadsheetBackupCsv(
                        `${sheet.subject?.name || "scores"}-${selectedAssessment.name}`,
                        [selectedAssessment],
                        localData.map((row) => ({
                          student: row.student,
                          values: [row.values[selectedAssessment.originalIndex] ?? ""],
                        })),
                      )
                    }
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3.5 text-xs font-semibold text-rose-900 transition-colors hover:bg-rose-100/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1447E6] md:pointer-fine:min-h-8"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    Download CSV backup
                  </button>
                  {saveErrorIsConflict && (
                    <button
                      type="button"
                      onClick={fetchSheet}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1447E6] md:pointer-fine:min-h-8"
                    >
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      Reload latest
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {!saveError && restoredDraftCount > 0 && hasChanges && (
          <div
            role="status"
            className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-950"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium tabular-nums">
                Restored {restoredDraftCount} unsaved{" "}
                {restoredDraftCount === 1 ? "score" : "scores"} from this device. Save to update the school record.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    downloadSpreadsheetBackupCsv(
                      `${sheet.subject?.name || "scores"}-${selectedAssessment.name}`,
                      [selectedAssessment],
                      localData.map((row) => ({
                        student: row.student,
                        values: [row.values[selectedAssessment.originalIndex] ?? ""],
                      })),
                    )
                  }
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 text-xs font-semibold text-amber-950 transition-colors hover:bg-amber-100/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1447E6] md:pointer-fine:min-h-8"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  Download CSV
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (draftKey) clearSpreadsheetDraft(draftKey);
                    setLocalData(sheet.data || []);
                    setRestoredDraftCount(0);
                  }}
                  className="inline-flex min-h-11 items-center rounded-lg px-3 text-xs font-semibold text-amber-900 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1447E6] md:pointer-fine:min-h-8"
                >
                  Discard draft
                </button>
              </div>
            </div>
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
            <div
              className="h-full rounded-full bg-[#1447E6] transition-[width] duration-300 motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-600">
            {enteredCount}/{total} entered
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find by name or ID"
              aria-label="Find a learner by name or ID"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-base text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#1447E6] focus:ring-2 focus:ring-blue-100 md:text-sm"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              type="button"
              aria-label={`Sort learners: ${activeSortOption.label}`}
              className={cn(
                "group inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1447E6] aria-expanded:border-[#1447E6] aria-expanded:bg-[#EEF0FF] aria-expanded:text-[#1447E6]",
                sortMode !== "name-asc"
                  ? "border-[#1447E6]/35 bg-[#EEF0FF] text-[#1447E6] hover:bg-[#E2E6FF]"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              )}
            >
              <ArrowUpDown className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="sm:hidden">{activeSortOption.shortLabel}</span>
              <span className="hidden sm:inline">{activeSortOption.label}</span>
              <ChevronDown
                className="h-3.5 w-3.5 shrink-0 opacity-70 transition-transform duration-150 group-aria-expanded:rotate-180 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={6}
              className="w-60 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg ring-0"
            >
              <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold text-slate-500">
                Sort learners
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup
                aria-label="Sort learners"
                value={sortMode}
                onValueChange={(value) => handleSelectSortMode(value as AssessmentSortMode)}
              >
                {SORT_OPTIONS.filter((option) => option.group === "name").map((option) => (
                  <DropdownMenuRadioItem
                    key={option.value}
                    value={option.value}
                    className="min-h-11 cursor-pointer rounded-lg px-2.5 py-2 pr-8 text-sm font-medium text-slate-700 focus:bg-[#EEF0FF] focus:text-[#1447E6] data-[checked]:font-semibold data-[checked]:text-[#1447E6] md:pointer-fine:min-h-9"
                  >
                    {option.label}
                  </DropdownMenuRadioItem>
                ))}
                <DropdownMenuSeparator className="my-1 bg-slate-100" />
                {SORT_OPTIONS.filter((option) => option.group === "score").map((option) => {
                  const count =
                    option.value === "unentered-first" ? unenteredCount : enteredCount;
                  return (
                    <DropdownMenuRadioItem
                      key={option.value}
                      value={option.value}
                      onClick={() => {
                        if (option.value === sortMode) {
                          handleSelectSortMode(option.value);
                        }
                      }}
                      className="min-h-11 cursor-pointer justify-between rounded-lg px-2.5 py-2 pr-8 text-sm font-medium text-slate-700 focus:bg-[#EEF0FF] focus:text-[#1447E6] data-[checked]:font-semibold data-[checked]:text-[#1447E6] md:pointer-fine:min-h-9"
                    >
                      <span>{option.label}</span>
                      {total > 0 && (
                        <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">
                          {count}
                        </span>
                      )}
                    </DropdownMenuRadioItem>
                  );
                })}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <p role="status" aria-live="polite" className="sr-only">
          {sortAnnouncement}
        </p>

        {canEdit && total > 0 && (
          <p className="mt-2 hidden items-center gap-1.5 text-xs font-medium text-slate-500 md:flex">
            <Keyboard className="h-3.5 w-3.5" aria-hidden="true" />
            <kbd className="rounded border border-slate-200 bg-white px-1 font-sans text-xs font-bold">↑</kbd>
            <kbd className="rounded border border-slate-200 bg-white px-1 font-sans text-xs font-bold">↓</kbd> or
            <kbd className="rounded border border-slate-200 bg-white px-1 font-sans text-xs font-bold">Enter</kbd> moves between learners
          </p>
        )}
      </div>

      {/* Learners */}
      <div className="px-4 pt-3 md:px-0">
        {filteredData.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500">
            {total === 0 ? (
              <p>
                No learners on this sheet yet. Open Roster controls below and sync with the class list.
              </p>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <p>No learners match &ldquo;{search.trim()}&rdquo;.</p>
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-[#1447E6] transition-colors hover:bg-[#EEF0FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1447E6] md:pointer-fine:min-h-9"
                >
                  Clear search
                </button>
              </div>
            )}
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
              const relationalSummary = showNormalizedCategorySubline
                ? computeStudentRelationalTotals(templateCategories, rawAssessments, row.values)
                : null;
              const currentCatTotal =
                relationalSummary && selectedAssessment.categoryId
                  ? relationalSummary.categoryById.get(selectedAssessment.categoryId)
                  : null;

              return (
                <li
                  key={row.student.id || rowIndex}
                  className="flex min-h-[64px] items-center gap-3 px-4 py-2"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold uppercase",
                      score !== null
                        ? "bg-[#EEF0FF] text-[#1447E6]"
                        : "bg-slate-100 text-slate-600",
                    )}
                  >
                    {score !== null ? <Check className="h-4 w-4" /> : initials}
                  </span>

                  <label htmlFor={`score-${rowIndex}`} className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-[#0B1220]">
                      {name}
                    </span>
                    {row.student.admissionNumber && (
                      <span className="block truncate text-xs text-slate-500">
                        {row.student.admissionNumber}
                      </span>
                    )}
                    {currentCatTotal && (
                      <span className="mt-0.5 block truncate text-xs font-medium tabular-nums text-slate-500">
                        {currentCatTotal.categoryName}: {formatScore(currentCatTotal.earned)}/
                        {currentCatTotal.maxMarks}
                      </span>
                    )}
                  </label>

                  {canEdit ? (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleStepScore(rowIndex, -1)}
                        disabled={atMin}
                        className="hidden h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-40 md:flex pointer-coarse:h-11 pointer-coarse:w-11"
                        aria-label={`Decrease score for ${name}`}
                      >
                        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
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
                          aria-invalid="false"
                          className="h-12 w-16 rounded-xl border border-slate-200 bg-slate-50 px-1 text-center text-base font-bold tabular-nums text-[#0B1220] outline-none transition-colors [appearance:textfield] focus:border-[#1447E6] focus:bg-white focus:ring-2 focus:ring-blue-100 md:h-10 md:w-14 md:text-sm [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          placeholder="—"
                        />
                        {typeof maxScore === "number" && (
                          <span className="w-7 text-xs font-medium tabular-nums text-slate-500">
                            /{maxScore}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleStepScore(rowIndex, 1)}
                        disabled={atMax}
                        className="hidden h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-40 md:flex pointer-coarse:h-11 pointer-coarse:w-11"
                        aria-label={`Increase score for ${name}`}
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
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

        {/* Roster & sheet controls: folded away below the work */}
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => setControlsOpen((v) => !v)}
            aria-expanded={controlsOpen}
            className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left"
          >
            <span>
              <span className="block text-sm font-semibold text-[#0B1220]">Roster controls</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Sync with the class list{isPrivileged ? " or change the sheet status" : ""}
              </span>
            </span>
            {controlsOpen ? (
              <ChevronUp className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
            )}
          </button>

          {controlsOpen && (
            <div className="space-y-3 border-t border-slate-100 px-4 pb-4 pt-3">
              {canSplitIntoSubs && entryTarget?.parentCategory && (
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/dashboard/school/${orgSlug}/spreadsheets/${sheetId}/category/${encodeURIComponent(entryTarget.parentCategory!.id)}`,
                    )
                  }
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <Layers className="h-4 w-4 text-[#1447E6]" aria-hidden="true" />
                  Manage {entryTarget.parentCategory.name} sub-assessments
                </button>
              )}

              {isPrivileged && (
                <div>
                  <label
                    htmlFor="sheet-status-select"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Sheet status
                  </label>
                  <Select
                    value={sheet.status}
                    onValueChange={(val) => void handleStatusChange(val as SpreadsheetStatus)}
                  >
                    <SelectTrigger
                      id="sheet-status-select"
                      className="h-11 w-full rounded-xl border-slate-200 bg-white text-slate-800"
                    >
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
                  onClick={() => void handleSyncStudents()}
                  disabled={isSyncing}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#1447E6]/25 text-sm font-semibold text-[#1447E6] transition-colors hover:bg-[#EEF0FF]/60 disabled:opacity-60"
                >
                  {isSyncing ? (
                    <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  ) : (
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  )}
                  Sync with class list
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Save: owns the bottom edge on phones (the tab bar steps aside on this route) */}
      {canEdit && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md md:static md:mt-4 md:border-0 md:bg-transparent md:p-0">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving || !hasChanges}
            className={cn(
              "flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl text-base font-semibold transition-colors motion-reduce:transition-none md:h-12 md:w-auto md:px-8",
              isSaving || !hasChanges
                ? "bg-slate-200 text-slate-600"
                : "bg-[#1447E6] text-white hover:bg-[#0F36B8]",
            )}
          >
            {isSaving ? (
              <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : hasChanges ? (
              <Save className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Check className="h-5 w-5" aria-hidden="true" />
            )}
            {isSaving
              ? "Saving…"
              : hasChanges
                ? `Save ${unsavedCount || ""} ${unsavedCount === 1 ? "score" : "scores"}`.replace(
                    "  ",
                    " ",
                  )
                : "All scores saved"}
          </button>
        </div>
      )}

      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save changes before leaving?</DialogTitle>
            <DialogDescription>
              You have {unsavedCount} unsaved {unsavedCount === 1 ? "score" : "scores"} for{" "}
              {selectedAssessment.name}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              disabled={isSaving}
              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              onClick={() => {
                if (draftKey) clearSpreadsheetDraft(draftKey);
                setShowLeaveDialog(false);
                router.push(backHref);
              }}
            >
              Discard changes
            </Button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                autoFocus
                disabled={isSaving}
                onClick={() => setShowLeaveDialog(false)}
              >
                Stay here
              </Button>
              <Button
                type="button"
                disabled={isSaving}
                className="bg-[#1447E6] text-white hover:bg-[#0F36B8]"
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
