"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Keyboard,
  Lock,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { apiFetch } from "@/lib/api";
import {
  computeCategoryAllocationSummary,
  computeStudentRelationalTotals,
  formatScore,
  getErrorMessage,
  getInitials,
  getStudentName,
  resolveSpreadsheetCategories,
  validateScoreInput,
  type CategoryAllocationSummary,
  type SpreadsheetAssessment,
  type SpreadsheetDetail,
  type SpreadsheetRow,
  type SpreadsheetStatus,
} from "@/lib/spreadsheets";
import {
  buildSpreadsheetDraftKey,
  clearSpreadsheetDraft,
  downloadSpreadsheetBackupCsv,
  extractDirtyRelationalDraft,
  loadSpreadsheetDraft,
  mergeDraftIntoSpreadsheetRows,
  saveSpreadsheetDraft,
} from "@/lib/spreadsheet-drafts";
import { cn } from "@/lib/utils";

type RelationalSpreadsheetWorkspaceProps = {
  orgSlug: string;
  sheet: SpreadsheetDetail;
  canEdit: boolean;
  isPrivileged: boolean;
  onRefresh: () => Promise<void>;
  onSheetChange: (next: SpreadsheetDetail) => void;
};

type SubAssessmentModalState =
  | { mode: "add"; categoryId: string; categoryName: string; categoryMaxMarks: number }
  | {
      mode: "edit";
      id: string;
      categoryId: string;
      categoryName: string;
      categoryMaxMarks: number;
      initialName: string;
      initialMaxMarks: number;
    }
  | null;

type IndexedAssessment = {
  assessment: SpreadsheetAssessment;
  columnIndex: number;
};

function cellKey(studentId: string, subAssessmentId: string): string {
  return `${studentId}:${subAssessmentId}`;
}

export function RelationalSpreadsheetWorkspace({
  orgSlug,
  sheet,
  canEdit,
  isPrivileged,
  onRefresh,
  onSheetChange,
}: RelationalSpreadsheetWorkspaceProps) {
  const router = useRouter();
  const tableHeadingId = useId();
  const subNameInputId = useId();
  const subMarksInputId = useId();
  const subErrorId = useId();

  const sheetSyncKey = useMemo(
    () =>
      `${sheet.id}:${sheet.version ?? 0}:${(sheet.assessments || []).map((a) => `${a.id ?? a.name}:${a.maxObtainableScore ?? a.total ?? 0}`).join("|")}:${(sheet.data || []).length}`,
    [sheet.assessments, sheet.data, sheet.id, sheet.version],
  );

  const baselineRows = useMemo<SpreadsheetRow[]>(
    () =>
      (sheet.data || []).map((row) => ({
        student: { ...row.student },
        values: Array.isArray(row.values) ? [...row.values] : [],
      })),
    [sheet.data],
  );

  const draftKey = useMemo(
    () => buildSpreadsheetDraftKey(orgSlug, sheet.id, "relational"),
    [orgSlug, sheet.id],
  );

  const [draftState, setDraftState] = useState<{
    syncKey: string;
    rows: SpreadsheetRow[];
    errors: Record<string, string>;
    touched: Record<string, boolean>;
  }>(() => ({
    syncKey: sheetSyncKey,
    rows: baselineRows,
    errors: {},
    touched: {},
  }));
  const [mobileCategoriesOpen, setMobileCategoriesOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveErrorIsConflict, setSaveErrorIsConflict] = useState(false);
  const [restoredDraftCount, setRestoredDraftCount] = useState(0);
  const hydratedDraftSyncKeyRef = useRef<string | null>(null);

  const localRows = draftState.syncKey === sheetSyncKey ? draftState.rows : baselineRows;
  const cellErrors = useMemo(
    () => (draftState.syncKey === sheetSyncKey ? draftState.errors : {}),
    [draftState.errors, draftState.syncKey, sheetSyncKey],
  );
  const touchedCells = useMemo(
    () => (draftState.syncKey === sheetSyncKey ? draftState.touched : {}),
    [draftState.syncKey, draftState.touched, sheetSyncKey],
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [savingScores, setSavingScores] = useState(false);
  const [syncingRoster, setSyncingRoster] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Sub-assessment create/edit/delete dialog state
  const [subModal, setSubModal] = useState<SubAssessmentModalState>(null);
  const [subName, setSubName] = useState("");
  const [subMarks, setSubMarks] = useState("");
  const [subFormError, setSubFormError] = useState<string | null>(null);
  const [subErrorField, setSubErrorField] = useState<"name" | "marks" | null>(null);
  const [subSubmitting, setSubSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SpreadsheetAssessment | null>(null);
  const [deletingSub, setDeletingSub] = useState(false);

  // Shared polite live region for delayed error announcements (modern web accessibility)
  const [liveAnnouncement, setLiveAnnouncement] = useState("");
  const announceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRefMap = useRef<Map<string, HTMLInputElement>>(new Map());
  const subNameInputRef = useRef<HTMLInputElement>(null);
  const subMarksInputRef = useRef<HTMLInputElement>(null);

  const clearAnnouncement = useCallback(() => {
    if (announceTimerRef.current) {
      clearTimeout(announceTimerRef.current);
      announceTimerRef.current = null;
    }
    setLiveAnnouncement("");
  }, []);

  const announceError = useCallback((message: string) => {
    if (announceTimerRef.current) {
      clearTimeout(announceTimerRef.current);
    }
    setLiveAnnouncement("");
    announceTimerRef.current = setTimeout(() => {
      setLiveAnnouncement(message);
    }, 450);
  }, []);

  useEffect(() => {
    return () => {
      if (announceTimerRef.current) {
        clearTimeout(announceTimerRef.current);
      }
    };
  }, []);

  const categories = useMemo(() => resolveSpreadsheetCategories(sheet), [sheet]);
  const assessments = useMemo(
    () => (Array.isArray(sheet.assessments) ? sheet.assessments : []),
    [sheet.assessments],
  );

  const allocations = useMemo<CategoryAllocationSummary[]>(() => {
    return computeCategoryAllocationSummary(
      categories,
      assessments.map((item) => ({
        categoryId: item.categoryId,
        maxMarks: Number(item.maxObtainableScore ?? item.total) || 0,
      })),
    );
  }, [assessments, categories]);

  const isPublishedLocked = Boolean(sheet.hcoreAssessmentId);
  const canManageSubAssessments = canEdit && !isPublishedLocked;
  const incompleteCategories = useMemo(
    () => allocations.filter((cat) => !cat.isComplete),
    [allocations],
  );
  const configuredCategoryCount = allocations.length - incompleteCategories.length;
  const allCategoriesConfigured =
    allocations.length > 0 && incompleteCategories.length === 0;

  const totalParentMarks = useMemo(
    () => allocations.reduce((sum, cat) => sum + cat.maxMarks, 0),
    [allocations],
  );

  // Group assessments by parent categoryId in O(C + A)
  const assessmentsByCategory = useMemo(() => {
    const grouped = new Map<string, IndexedAssessment[]>();
    for (const cat of categories) {
      grouped.set(cat.id, []);
    }
    assessments.forEach((assessment, columnIndex) => {
      const catId = assessment.categoryId || "__uncategorized";
      const list = grouped.get(catId) ?? [];
      list.push({ assessment, columnIndex });
      grouped.set(catId, list);
    });
    return grouped;
  }, [assessments, categories]);

  // Flat ordered columns matching the table header order (for keyboard arrow navigation)
  const orderedSubColumns = useMemo(() => {
    const cols: IndexedAssessment[] = [];
    for (const cat of categories) {
      const items = assessmentsByCategory.get(cat.id) ?? [];
      for (const item of items) {
        cols.push(item);
      }
    }
    return cols;
  }, [assessmentsByCategory, categories]);

  const canEnterScores = canEdit && orderedSubColumns.length > 0;

  // Sort learners by surname then first name (matches attendance register)
  const orderedRows = useMemo(() => {
    return localRows
      .map((row, rowIndex) => ({ row, rowIndex }))
      .sort(
        (left, right) =>
          (left.row.student.lastName || "").localeCompare(right.row.student.lastName || "") ||
          (left.row.student.firstName || "").localeCompare(right.row.student.firstName || ""),
      );
  }, [localRows]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return orderedRows;
    return orderedRows.filter(
      ({ row }) =>
        getStudentName(row.student).toLowerCase().includes(q) ||
        (row.student.admissionNumber || "").toLowerCase().includes(q),
    );
  }, [orderedRows, searchQuery]);

  // Index baseline saved values in O(R) for O(1) dirty diffing
  const savedRowsByStudentId = useMemo(() => {
    const map = new Map<string, Array<string | number | null>>();
    for (const row of sheet.data || []) {
      if (row.student.id) {
        map.set(row.student.id, Array.isArray(row.values) ? row.values : []);
      }
    }
    return map;
  }, [sheet.data]);

  const changedScoreEntries = useMemo(() => {
    const changes: Array<{ studentId: string; subAssessmentId: string; score: number | null }> = [];
    for (const row of localRows) {
      const studentId = row.student.id;
      if (!studentId) continue;
      const baseline = savedRowsByStudentId.get(studentId) ?? [];
      for (let colIdx = 0; colIdx < assessments.length; colIdx += 1) {
        const sub = assessments[colIdx];
        if (!sub.id) continue;
        const beforeRaw = baseline[colIdx] ?? "";
        const afterRaw = row.values[colIdx] ?? "";
        if (String(beforeRaw) === String(afterRaw)) continue;
        const maxMarks = sub.maxObtainableScore ?? sub.total;
        const check = validateScoreInput(afterRaw, maxMarks);
        if (check.valid) {
          changes.push({
            studentId,
            subAssessmentId: sub.id,
            score: check.numeric,
          });
        }
      }
    }
    return changes;
  }, [assessments, localRows, savedRowsByStudentId]);

  const errorCount = Object.keys(cellErrors).length;
  const hasUnsavedScores = changedScoreEntries.length > 0;

  useEffect(() => {
    if (!hasUnsavedScores) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsavedScores]);

  // Restore any locally saved unsaved scores once per sheet sync key (SSR-safe).
  useEffect(() => {
    if (hydratedDraftSyncKeyRef.current === sheetSyncKey) return;
    let cancelled = false;
    const savedDraft = loadSpreadsheetDraft(draftKey);
    hydratedDraftSyncKeyRef.current = sheetSyncKey;
    if (!savedDraft) return;
    const merged = mergeDraftIntoSpreadsheetRows(
      baselineRows,
      assessments,
      savedDraft.valuesByStudent,
    );
    if (merged.restoredCount > 0) {
      void Promise.resolve().then(() => {
        if (cancelled) return;
        setDraftState({
          syncKey: sheetSyncKey,
          rows: merged.rows,
          errors: {},
          touched: {},
        });
        setRestoredDraftCount(merged.restoredCount);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [assessments, baselineRows, draftKey, sheetSyncKey]);

  // Auto-persist dirty edits locally so failed saves or reloads never lose typed scores.
  useEffect(() => {
    if (hydratedDraftSyncKeyRef.current !== sheetSyncKey) return;
    const dirty = extractDirtyRelationalDraft(savedRowsByStudentId, localRows, assessments);
    saveSpreadsheetDraft(draftKey, dirty);
  }, [assessments, draftKey, localRows, savedRowsByStudentId, sheetSyncKey]);

  const handleCellChange = (
    rowIndex: number,
    colIndex: number,
    studentId: string,
    assessment: SpreadsheetAssessment,
    rawValue: string,
  ) => {
    if (!canEnterScores || !assessment.id) return;
    const key = cellKey(studentId, assessment.id);
    const maxMarks = assessment.maxObtainableScore ?? assessment.total;
    const check = validateScoreInput(rawValue, maxMarks);

    setDraftState((prev) => {
      const currentRows = prev.syncKey === sheetSyncKey ? prev.rows : baselineRows;
      const currentErrors = prev.syncKey === sheetSyncKey ? prev.errors : {};
      const currentTouched = prev.syncKey === sheetSyncKey ? prev.touched : {};

      const nextRows = currentRows.map((row, idx) => {
        if (idx !== rowIndex) return row;
        const nextValues = [...row.values];
        nextValues[colIndex] = rawValue;
        return { ...row, values: nextValues };
      });

      const nextErrors = { ...currentErrors };
      const nextTouched = { ...currentTouched };
      if (!check.valid && check.error) {
        nextTouched[key] = true;
        nextErrors[key] = check.error;
      } else {
        delete nextErrors[key];
      }

      return {
        syncKey: sheetSyncKey,
        rows: nextRows,
        errors: nextErrors,
        touched: nextTouched,
      };
    });

    if (!check.valid && check.error) {
      announceError(`${assessment.name}: ${check.error}`);
    } else if (cellErrors[key]) {
      clearAnnouncement();
    }
  };

  const handleCellBlur = (
    studentId: string,
    assessment: SpreadsheetAssessment,
    rawValue: string | number | null | undefined,
  ) => {
    if (!assessment.id) return;
    const key = cellKey(studentId, assessment.id);
    const maxMarks = assessment.maxObtainableScore ?? assessment.total;
    const check = validateScoreInput(rawValue, maxMarks);

    setDraftState((prev) => {
      const currentRows = prev.syncKey === sheetSyncKey ? prev.rows : baselineRows;
      const currentErrors = prev.syncKey === sheetSyncKey ? prev.errors : {};
      const currentTouched = prev.syncKey === sheetSyncKey ? prev.touched : {};
      const nextErrors = { ...currentErrors };
      if (!check.valid && check.error) {
        nextErrors[key] = check.error;
      } else {
        delete nextErrors[key];
      }
      return {
        syncKey: sheetSyncKey,
        rows: currentRows,
        errors: nextErrors,
        touched: { ...currentTouched, [key]: true },
      };
    });

    if (!check.valid && check.error) {
      announceError(`${assessment.name}: ${check.error}`);
    } else if (cellErrors[key]) {
      clearAnnouncement();
    }
  };

  const focusCell = (visibleRowIdx: number, visibleColIdx: number) => {
    if (visibleRowIdx < 0 || visibleRowIdx >= filteredRows.length) return;
    if (visibleColIdx < 0 || visibleColIdx >= orderedSubColumns.length) return;
    const targetStudentId = filteredRows[visibleRowIdx]?.row.student.id;
    const targetSubId = orderedSubColumns[visibleColIdx]?.assessment.id;
    if (!targetStudentId || !targetSubId) return;
    const el = inputRefMap.current.get(cellKey(targetStudentId, targetSubId));
    if (el) {
      el.focus();
      el.select();
    }
  };

  const handleSaveScores = async () => {
    if (!canEnterScores) {
      toast.error("Add at least one sub-assessment before saving scores.");
      return;
    }
    if (errorCount > 0) {
      toast.error("Fix invalid score entries before saving.");
      announceError(`Fix ${errorCount} invalid score ${errorCount === 1 ? "entry" : "entries"} before saving.`);
      return;
    }
    if (typeof sheet.version !== "number") {
      toast.error("Spreadsheet version missing. Refreshing...");
      await onRefresh();
      return;
    }
    if (changedScoreEntries.length === 0) return;

    setSavingScores(true);
    try {
      await apiFetch<{ data: { version: number } }>(
        `/spreadsheets/${orgSlug}/${sheet.id}/scores`,
        {
          method: "PUT",
          body: JSON.stringify({
            expectedVersion: sheet.version,
            scores: changedScoreEntries,
          }),
        },
      );
      toast.success(
        `Saved ${changedScoreEntries.length} ${changedScoreEntries.length === 1 ? "score" : "scores"}`,
      );
      setSaveError(null);
      setSaveErrorIsConflict(false);
      setRestoredDraftCount(0);
      clearSpreadsheetDraft(draftKey);
      await onRefresh();
    } catch (error) {
      const message = getErrorMessage(error, "Failed to save scores");
      const status =
        typeof error === "object" && error !== null && "status" in error
          ? Number((error as { status?: number }).status)
          : undefined;
      setSaveError(message);
      setSaveErrorIsConflict(status === 409);
      announceError(`Could not save scores: ${message}. Your entries are kept locally.`);
      toast.error(`${message} — your scores are kept safely on this device.`);
    } finally {
      setSavingScores(false);
    }
  };

  const openAddSubAssessment = (cat: CategoryAllocationSummary) => {
    if (!canManageSubAssessments || cat.isSingleInstance) return;
    const existingCount = (assessmentsByCategory.get(cat.categoryId) ?? []).length;
    setSubModal({
      mode: "add",
      categoryId: cat.categoryId,
      categoryName: cat.name,
      categoryMaxMarks: cat.maxMarks,
    });
    setSubName(`${cat.name} ${existingCount + 1}`);
    setSubMarks(String(cat.maxMarks > 0 ? cat.maxMarks : 10));
    setSubFormError(null);
    setSubErrorField(null);
  };

  const openEditSubAssessment = (
    cat: CategoryAllocationSummary,
    assessment: SpreadsheetAssessment,
  ) => {
    if (!canManageSubAssessments || assessment.isSystemGenerated || !assessment.id) return;
    const currentMarks = Number(assessment.maxObtainableScore ?? assessment.total) || 0;
    setSubModal({
      mode: "edit",
      id: assessment.id,
      categoryId: cat.categoryId,
      categoryName: cat.name,
      categoryMaxMarks: cat.maxMarks,
      initialName: assessment.name,
      initialMaxMarks: currentMarks,
    });
    setSubName(assessment.name);
    setSubMarks(String(currentMarks));
    setSubFormError(null);
    setSubErrorField(null);
  };

  const handleSubmitSubModal = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!subModal) return;

    const trimmedName = subName.trim();
    if (!trimmedName) {
      const msg = "Sub-assessment name is required.";
      setSubFormError(msg);
      setSubErrorField("name");
      announceError(msg);
      subNameInputRef.current?.focus();
      return;
    }

    const parsedMarks = Number(subMarks);
    if (!Number.isFinite(parsedMarks) || !Number.isInteger(parsedMarks) || parsedMarks <= 0) {
      const msg = "Maximum marks must be a positive whole number.";
      setSubFormError(msg);
      setSubErrorField("marks");
      announceError(msg);
      subMarksInputRef.current?.focus();
      return;
    }

    // Check duplicate name inside same parent category
    const siblings = assessmentsByCategory.get(subModal.categoryId) ?? [];
    const duplicate = siblings.some(
      ({ assessment }) =>
        assessment.name.trim().toLowerCase() === trimmedName.toLowerCase() &&
        (subModal.mode === "add" || assessment.id !== subModal.id),
    );
    if (duplicate) {
      const msg = `"${trimmedName}" already exists under ${subModal.categoryName}.`;
      setSubFormError(msg);
      setSubErrorField("name");
      announceError(msg);
      subNameInputRef.current?.focus();
      return;
    }

    setSubSubmitting(true);
    setSubFormError(null);
    setSubErrorField(null);
    try {
      if (subModal.mode === "add") {
        await apiFetch(`/spreadsheets/${orgSlug}/${sheet.id}/sub-assessments`, {
          method: "POST",
          body: JSON.stringify({
            categoryId: subModal.categoryId,
            name: trimmedName,
            maxMarks: parsedMarks,
          }),
        });
        toast.success(`Added "${trimmedName}" (${parsedMarks} marks)`);
      } else {
        await apiFetch(`/spreadsheets/${orgSlug}/${sheet.id}/sub-assessments/${subModal.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: trimmedName,
            maxMarks: parsedMarks,
          }),
        });
        toast.success(`Updated "${trimmedName}"`);
      }
      setSubModal(null);
      await onRefresh();
    } catch (error) {
      const msg = getErrorMessage(error, "Failed to save sub-assessment");
      setSubFormError(msg);
      announceError(msg);
    } finally {
      setSubSubmitting(false);
    }
  };

  const handleConfirmDeleteSub = async () => {
    if (!deleteTarget?.id) return;
    setDeletingSub(true);
    try {
      await apiFetch(`/spreadsheets/${orgSlug}/${sheet.id}/sub-assessments/${deleteTarget.id}`, {
        method: "DELETE",
      });
      toast.success(`Removed "${deleteTarget.name}"`);
      setDeleteTarget(null);
      await onRefresh();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to remove sub-assessment"));
    } finally {
      setDeletingSub(false);
    }
  };

  const handleSyncRoster = async () => {
    if (typeof sheet.version !== "number") {
      await onRefresh();
      return;
    }
    setSyncingRoster(true);
    try {
      const updated = await apiFetch<SpreadsheetDetail>(
        `/spreadsheets/${orgSlug}/${sheet.id}/merge`,
        {
          method: "POST",
          body: JSON.stringify({ expectedVersion: sheet.version }),
        },
      );
      onSheetChange(updated);
      toast.success("Synchronized with current class roster");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to synchronize roster"));
      if (!hasUnsavedScores) await onRefresh();
    } finally {
      setSyncingRoster(false);
    }
  };

  const handleStatusChange = async (nextStatus: SpreadsheetStatus) => {
    if (!isPrivileged) return;
    setUpdatingStatus(true);
    try {
      await apiFetch(`/spreadsheets/${orgSlug}/${sheet.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      onSheetChange({ ...sheet, status: nextStatus });
      toast.success(`Spreadsheet marked ${nextStatus}`);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update spreadsheet status"));
    } finally {
      setUpdatingStatus(false);
    }
  };

  const showMobileCategoriesGrid = !allCategoriesConfigured || mobileCategoriesOpen;
  const pinMobileSaveBar = canEdit && (hasUnsavedScores || errorCount > 0);

  return (
    <div className={cn("space-y-5", pinMobileSaveBar && "pb-28 md:pb-0")}>
      {/* Shared polite live region for screen-reader error announcements */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {liveAnnouncement}
      </div>

      {/* ── Parent Category Caps & Normalization Panel (Admin-Locked) ── */}
      <section
        aria-label="Admin-defined assessment categories"
        className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
      >
        <div
          className={cn(
            "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
            showMobileCategoriesGrid ? "border-b border-slate-100 pb-3.5" : "md:border-b md:border-slate-100 md:pb-3.5",
          )}
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-bold text-[#0B1220] sm:text-base">
                Assessment Categories
              </h2>
              {sheet.template?.name && (
                <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-[#EEF0FF] px-2.5 py-0.5 text-xs font-semibold text-[#1447E6]">
                  <Lock className="h-3 w-3" aria-hidden="true" />
                  {sheet.template.name}
                </span>
              )}
            </div>
            <p className={cn("mt-0.5 text-xs text-slate-600", !showMobileCategoriesGrid && "hidden md:block")}>
              Admin sets each category&apos;s maximum mark. Add as many sub-assessments as needed—scores automatically scale to each category cap.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold tabular-nums",
                allCategoriesConfigured
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-amber-200 bg-amber-50 text-amber-800",
              )}
            >
              {allCategoriesConfigured ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
              )}
              {configuredCategoryCount}/{allocations.length} categories ready · {totalParentMarks} max
            </span>

            {allCategoriesConfigured && (
              <button
                type="button"
                onClick={() => setMobileCategoriesOpen((prev) => !prev)}
                aria-expanded={showMobileCategoriesGrid}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 md:hidden"
              >
                {mobileCategoriesOpen ? "Hide breakdown" : "Show breakdown"}
                {mobileCategoriesOpen ? (
                  <ChevronUp className="h-4 w-4 text-slate-500" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-500" aria-hidden="true" />
                )}
              </button>
            )}

            {isPrivileged && (
              <Select
                value={sheet.status}
                disabled={updatingStatus}
                onValueChange={(value) => handleStatusChange(value as SpreadsheetStatus)}
              >
                <SelectTrigger
                  aria-label="Spreadsheet status"
                  className="w-[128px] rounded-xl border-slate-200 bg-white text-xs font-semibold"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="active" disabled={!allCategoriesConfigured}>
                    Active
                  </SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Category Cards Grid */}
        <div
          className={cn(
            "mt-4 gap-3 sm:grid-cols-2 lg:grid-cols-4",
            showMobileCategoriesGrid ? "grid" : "hidden md:grid",
          )}
        >
          {allocations.map((cat) => {
            const catSubs = assessmentsByCategory.get(cat.categoryId) ?? [];
            return (
              <div
                key={cat.categoryId}
                className={cn(
                  "flex flex-col justify-between rounded-xl border p-3.5 transition-colors motion-reduce:transition-none",
                  cat.isComplete
                    ? "border-slate-200 bg-white"
                    : "border-amber-200 bg-amber-50/25",
                )}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-[#0B1220]">
                        {cat.name}
                      </h3>
                      <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-slate-600">
                        <Lock className="h-3 w-3 text-slate-500" aria-hidden="true" />
                        {cat.isSingleInstance ? "Fixed by admin" : "Auto-normalizes"}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-lg bg-[#EEF0FF] px-2 py-0.5 text-xs font-bold tabular-nums text-[#1447E6]">
                      {cat.maxMarks} max
                    </span>
                  </div>

                  {/* Normalization Summary */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between gap-2 text-xs font-semibold tabular-nums">
                      <span
                        className={cn(
                          cat.isComplete ? "text-emerald-700" : "text-amber-800",
                        )}
                      >
                        {cat.subAssessmentCount === 0
                          ? "No subs yet"
                          : `${cat.subAssessmentCount} ${cat.subAssessmentCount === 1 ? "sub" : "subs"}`}
                      </span>
                      <span className="truncate text-slate-600">
                        {cat.isSingleInstance
                          ? `Locked at ${cat.maxMarks}`
                          : cat.subAssessmentCount === 0
                            ? `Scales to ${cat.maxMarks}`
                            : `${cat.allocatedMarks} raw → ${cat.maxMarks}`}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={cn(
                          "h-full rounded-full transition-colors duration-200 motion-reduce:transition-none",
                          cat.isComplete ? "w-full bg-emerald-500" : "w-0 bg-amber-400",
                        )}
                      />
                    </div>
                  </div>

                  {/* Sub-assessment chips inside this category */}
                  <div className="mt-3 space-y-1.5">
                    {catSubs.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-slate-200 px-2.5 py-2 text-center text-xs text-slate-600">
                        No sub-assessments yet
                      </p>
                    ) : (
                      catSubs.map(({ assessment }) => {
                        const subMax = Number(assessment.maxObtainableScore ?? assessment.total) || 0;
                        const hasRecorded = (assessment.recordedScoreCount ?? 0) > 0;
                        return (
                          <div
                            key={assessment.id || assessment.name}
                            className="flex items-center justify-between gap-1.5 rounded-lg border border-slate-200/80 bg-slate-50/70 px-2.5 py-1.5 text-xs"
                          >
                            <span className="truncate font-medium text-slate-800">
                              {assessment.name}
                            </span>
                            <div className="flex shrink-0 items-center gap-1">
                              <span className="font-bold tabular-nums text-slate-700">
                                /{subMax}
                              </span>
                              {canManageSubAssessments && !assessment.isSystemGenerated && assessment.id && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => openEditSubAssessment(cat, assessment)}
                                    aria-label={`Edit ${assessment.name}`}
                                    title={`Edit ${assessment.name}`}
                                    className="flex h-6 w-6 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-white hover:text-[#1447E6] pointer-coarse:min-h-11 pointer-coarse:min-w-11"
                                  >
                                    <Pencil className="h-3 w-3" aria-hidden="true" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteTarget(assessment)}
                                    disabled={hasRecorded}
                                    aria-label={`Delete ${assessment.name}`}
                                    title={
                                      hasRecorded
                                        ? `Cannot delete: ${assessment.recordedScoreCount} student score(s) recorded`
                                        : `Delete ${assessment.name}`
                                    }
                                    className="flex h-6 w-6 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-35 pointer-coarse:min-h-11 pointer-coarse:min-w-11"
                                  >
                                    <Trash2 className="h-3 w-3" aria-hidden="true" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Per-category Add Sub-Assessment button (unlimited for non-locked categories) */}
                {!cat.isSingleInstance && canManageSubAssessments && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openAddSubAssessment(cat)}
                    className="mt-3 h-8 w-full rounded-lg border-blue-200 bg-white text-xs font-semibold text-[#1447E6] hover:bg-[#EEF0FF] pointer-coarse:min-h-11"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                    Add {cat.name}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Readiness / Lock Banners */}
        {isPublishedLocked && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-700">
            <Lock className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
            <span>
              This spreadsheet has been published to academic records. Sub-assessment structure is locked; existing scores remain auditable.
            </span>
          </div>
        )}

        {!allCategoriesConfigured && allocations.length > 0 && (
          <div
            role="status"
            className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 py-3 text-xs text-amber-950"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
            <div>
              <p className="font-bold">Some categories have no sub-assessments yet</p>
              <p className="mt-0.5 text-amber-900">
                You can enter scores in existing columns now. Still empty:{" "}
                {incompleteCategories
                  .map((cat) => `${cat.name} (${cat.maxMarks} max)`)
                  .join(" · ")}
                . Add at least one sub-assessment to every category before marking the sheet Active.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ── Unsaved Local Backup / Save Error Recovery Banners ── */}
      {saveError && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-xs text-rose-950"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-rose-950">
                Could not save scores to server: {saveError}
              </p>
              <p className="mt-0.5 text-rose-900">
                Your entered scores are preserved locally on this device. Retry saving or download a CSV backup.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={savingScores}
                  onClick={() => void handleSaveScores()}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-[#1447E6] px-3.5 text-xs font-semibold text-white transition-colors hover:bg-[#0F36B8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1447E6] disabled:opacity-60 md:pointer-fine:min-h-8"
                >
                  {savingScores ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Save className="h-3.5 w-3.5" aria-hidden="true" />}
                  Retry save
                </button>
                <button
                  type="button"
                  onClick={() =>
                    downloadSpreadsheetBackupCsv(
                      `${sheet.subject?.name || "spreadsheet"}-${sheet.classLevel?.name || "scores"}`,
                      assessments,
                      localRows,
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
                    onClick={() => void onRefresh()}
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

      {!saveError && restoredDraftCount > 0 && hasUnsavedScores && (
        <div
          role="status"
          className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-950"
        >
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <p className="font-medium tabular-nums">
              Restored {restoredDraftCount} unsaved {restoredDraftCount === 1 ? "score" : "scores"} from this device. Click Save Scores to sync.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  downloadSpreadsheetBackupCsv(
                    `${sheet.subject?.name || "spreadsheet"}-${sheet.classLevel?.name || "scores"}`,
                    assessments,
                    localRows,
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
                  clearSpreadsheetDraft(draftKey);
                  setDraftState({
                    syncKey: sheetSyncKey,
                    rows: baselineRows,
                    errors: {},
                    touched: {},
                  });
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

      {/* ── Spreadsheet Score Grid Toolbar ── */}
      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 id={tableHeadingId} className="text-sm font-bold text-[#0B1220] sm:text-base">
              Student Scores &amp; Totals
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {filteredRows.length} {filteredRows.length === 1 ? "learner" : "learners"} · Category and overall totals calculate automatically.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <search className="relative min-w-0 sm:w-60">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                aria-hidden="true"
              />
              <Input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search learner or admission no."
                aria-label="Search learners in spreadsheet"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                className="h-11 rounded-xl border-slate-200 pl-9 pr-11 text-base sm:h-10 sm:pr-9 sm:text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear learner search"
                  className="absolute right-0.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-slate-600 hover:text-slate-900 sm:h-8 sm:w-8"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </search>

            {canEdit && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleSyncRoster()}
                disabled={syncingRoster}
                className="h-10 rounded-xl border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 pointer-coarse:min-h-11"
              >
                {syncingRoster ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                )}
                Sync Roster
              </Button>
            )}
          </div>
        </div>

        {canEnterScores && filteredRows.length > 0 && (
          <div className="hidden items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-2 text-xs text-slate-600 md:flex">
            <span className="inline-flex items-center gap-1.5">
              <Keyboard className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              Use <kbd className="rounded border border-slate-200 bg-white px-1 font-sans text-[11px] font-bold">↑</kbd>{" "}
              <kbd className="rounded border border-slate-200 bg-white px-1 font-sans text-[11px] font-bold">↓</kbd>{" "}
              or <kbd className="rounded border border-slate-200 bg-white px-1 font-sans text-[11px] font-bold">Enter</kbd> to move across learners.
            </span>
            {errorCount > 0 ? (
              <span className="font-semibold text-rose-700">
                {errorCount} invalid {errorCount === 1 ? "score" : "scores"} — fix highlighted cells before saving
              </span>
            ) : hasUnsavedScores ? (
              <span className="font-semibold text-[#1447E6] tabular-nums">
                {changedScoreEntries.length} unsaved {changedScoreEntries.length === 1 ? "change" : "changes"}
              </span>
            ) : (
              <span className="text-slate-500">All scores up to date</span>
            )}
          </div>
        )}

        {filteredRows.length === 0 ? (
          <div className="px-6 py-14 text-center text-sm text-slate-500">
            {localRows.length === 0
              ? "No learners on this spreadsheet yet. Use Sync Roster to load the class list."
              : "No learner matches your search."}
          </div>
        ) : (
          <>
            {/* ── Desktop / Tablet Semantic Sticky Spreadsheet Grid (@container) ── */}
            <div className="@container hidden md:block">
              <div
                role="region"
                aria-labelledby={tableHeadingId}
                tabIndex={0}
                className="max-h-[68dvh] overflow-auto focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#1447E6]"
              >
                <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm">
                  <thead>
                    {/* Tier 1: Parent Assessment Categories */}
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th
                        scope="col"
                        rowSpan={2}
                        className="sticky left-0 top-0 z-30 min-w-[210px] border-r border-slate-200 bg-slate-50 px-4 py-3 align-bottom text-xs font-bold uppercase tracking-wide text-slate-600"
                      >
                        Learner
                      </th>
                      {allocations.map((cat) => {
                        const catSubs = assessmentsByCategory.get(cat.categoryId) ?? [];
                        const showCategoryTotal = !cat.isSingleInstance && catSubs.length > 0;
                        const colSpan = Math.max(1, catSubs.length) + (showCategoryTotal ? 1 : 0);
                        return (
                          <th
                            key={cat.categoryId}
                            scope="colgroup"
                            colSpan={colSpan}
                            className="sticky top-0 z-20 border-r border-slate-200 bg-slate-50 px-3 py-2.5 text-center"
                          >
                            <div className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-[#0B1220]">
                              <Lock className="h-3 w-3 text-slate-400" aria-hidden="true" />
                              <span>{cat.name}</span>
                              <span className="rounded bg-white px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-[#1447E6] ring-1 ring-slate-200">
                                /{cat.maxMarks}
                              </span>
                            </div>
                          </th>
                        );
                      })}
                      <th
                        scope="col"
                        rowSpan={2}
                        className="sticky right-0 top-0 z-30 min-w-[96px] border-l border-slate-200 bg-[#EEF0FF] px-3 py-3 text-center align-bottom text-xs font-bold uppercase tracking-wide text-[#1447E6]"
                      >
                        Overall
                        <span className="mt-0.5 block text-[11px] font-bold tabular-nums text-[#0B1220]">
                          /{totalParentMarks}
                        </span>
                      </th>
                    </tr>

                    {/* Tier 2: Dynamic Sub-Assessment Columns + Category Totals */}
                    <tr className="border-b border-slate-200 bg-white">
                      {allocations.flatMap((cat) => {
                        const catSubs = assessmentsByCategory.get(cat.categoryId) ?? [];
                        const showCategoryTotal = !cat.isSingleInstance && catSubs.length > 0;
                        if (catSubs.length === 0) {
                          return [
                            <th
                              key={`${cat.categoryId}-empty`}
                              scope="col"
                              className="sticky top-[41px] z-20 min-w-[120px] border-r border-slate-200 bg-amber-50/40 px-2.5 py-2 text-center text-[11px] font-medium text-amber-800"
                            >
                              Not configured
                            </th>,
                          ];
                        }
                        const cells = catSubs.map(({ assessment, columnIndex }) => {
                          const subMax = Number(assessment.maxObtainableScore ?? assessment.total) || 0;
                          return (
                            <th
                              key={assessment.id || `${cat.categoryId}-${columnIndex}`}
                              scope="col"
                              className="sticky top-[41px] z-20 min-w-[104px] border-r border-slate-100 bg-white px-2 py-2 text-center align-bottom"
                            >
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="max-w-[120px] truncate text-xs font-semibold text-slate-800">
                                  {assessment.name}
                                </span>
                                <div className="flex items-center gap-1">
                                  <span className="text-[11px] font-bold tabular-nums text-slate-500">
                                    /{subMax}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      router.push(
                                        `/dashboard/school/${orgSlug}/spreadsheets/${sheet.id}/assessment/${columnIndex}`,
                                      )
                                    }
                                    title={`Open focused score view for ${assessment.name}`}
                                    aria-label={`Open focused score view for ${assessment.name}`}
                                    className="rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#1447E6]"
                                  >
                                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                                  </button>
                                </div>
                              </div>
                            </th>
                          );
                        });
                        if (showCategoryTotal) {
                          cells.push(
                            <th
                              key={`${cat.categoryId}-total`}
                              scope="col"
                              title={`Normalized ${cat.name} score out of ${cat.maxMarks}`}
                              className="sticky top-[41px] z-20 min-w-[78px] border-r border-slate-200 bg-slate-50/90 px-2 py-2 text-center align-bottom text-[11px] font-bold text-slate-700"
                            >
                              Scaled
                              <span className="block tabular-nums text-slate-600">
                                /{cat.maxMarks}
                              </span>
                            </th>,
                          );
                        }
                        return cells;
                      })}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredRows.map(({ row, rowIndex }, visibleRowIdx) => {
                      const studentId = row.student.id || `row-${rowIndex}`;
                      const studentName = getStudentName(row.student);
                      const initials = getInitials(studentName);
                      const summary = computeStudentRelationalTotals(
                        categories,
                        assessments,
                        row.values,
                      );

                      let visibleColCursor = 0;

                      return (
                        <tr
                          key={studentId}
                          className="group transition-colors hover:bg-slate-50/70 motion-reduce:transition-none"
                        >
                          {/* Sticky Row Header: Learner Identity */}
                          <th
                            scope="row"
                            className="sticky left-0 z-10 border-r border-slate-200 bg-white px-4 py-2.5 font-normal group-hover:bg-slate-50/90"
                          >
                            <div className="flex items-center gap-2.5">
                              <span
                                aria-hidden="true"
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EEF0FF] text-xs font-bold text-[#1447E6]"
                              >
                                {initials}
                              </span>
                              <div className="min-w-0">
                                <span className="block truncate text-sm font-semibold text-[#0B1220]">
                                  {studentName}
                                </span>
                                {row.student.admissionNumber && (
                                  <span className="block truncate text-[11px] text-slate-500 tabular-nums">
                                    {row.student.admissionNumber}
                                  </span>
                                )}
                              </div>
                            </div>
                          </th>

                          {allocations.flatMap((cat) => {
                            const catSubs = assessmentsByCategory.get(cat.categoryId) ?? [];
                            const showCategoryTotal = !cat.isSingleInstance && catSubs.length > 0;
                            const catTotals = summary.categoryById.get(cat.categoryId);

                            if (catSubs.length === 0) {
                              return [
                                <td
                                  key={`${studentId}-${cat.categoryId}-empty`}
                                  className="border-r border-slate-200 bg-slate-50/30 px-2 py-2 text-center text-xs text-slate-400"
                                >
                                  —
                                </td>,
                              ];
                            }

                            const cells = catSubs.map(({ assessment, columnIndex }) => {
                              const currentVisibleCol = visibleColCursor;
                              visibleColCursor += 1;
                              const subId = assessment.id || String(columnIndex);
                              const cKey = cellKey(studentId, subId);
                              const subMax = Number(assessment.maxObtainableScore ?? assessment.total) || 0;
                              const rawVal = row.values[columnIndex] ?? "";
                              const errMsg = cellErrors[cKey];
                              const showErr = Boolean(errMsg && touchedCells[cKey]);
                              const errElId = showErr ? `err-${cKey}` : undefined;

                              return (
                                <td
                                  key={cKey}
                                  className="border-r border-slate-100 px-1.5 py-2 text-center align-middle"
                                >
                                  {canEnterScores ? (
                                    <div className="flex flex-col items-center">
                                      <input
                                        ref={(el) => {
                                          if (el) {
                                            inputRefMap.current.set(cKey, el);
                                          } else {
                                            inputRefMap.current.delete(cKey);
                                          }
                                        }}
                                        type="number"
                                        inputMode="decimal"
                                        enterKeyHint="next"
                                        min={0}
                                        max={subMax}
                                        step="0.01"
                                        value={rawVal === null ? "" : String(rawVal)}
                                        aria-label={`${studentName} ${assessment.name} score out of ${subMax}`}
                                        aria-invalid={showErr ? "true" : "false"}
                                        aria-describedby={errElId}
                                        onChange={(e) =>
                                          handleCellChange(
                                            rowIndex,
                                            columnIndex,
                                            studentId,
                                            assessment,
                                            e.target.value,
                                          )
                                        }
                                        onBlur={(e) =>
                                          handleCellBlur(studentId, assessment, e.target.value)
                                        }
                                        onFocus={(e) => e.target.select()}
                                        onKeyDown={(e) => {
                                          if (e.key === "ArrowDown" || e.key === "Enter") {
                                            e.preventDefault();
                                            focusCell(visibleRowIdx + 1, currentVisibleCol);
                                          } else if (e.key === "ArrowUp") {
                                            e.preventDefault();
                                            focusCell(visibleRowIdx - 1, currentVisibleCol);
                                          }
                                        }}
                                        placeholder="—"
                                        className={cn(
                                          "h-9 w-16 rounded-lg border px-1.5 text-center text-sm font-bold tabular-nums outline-none transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                                          showErr
                                            ? "border-rose-500 bg-rose-50 text-rose-800 focus:ring-2 focus:ring-rose-200"
                                            : "border-slate-200 bg-slate-50/70 text-[#0B1220] focus:border-[#1447E6] focus:bg-white focus:ring-2 focus:ring-blue-100 user-invalid:border-rose-500",
                                        )}
                                      />
                                      {showErr && (
                                        <span
                                          id={errElId}
                                          className="mt-0.5 max-w-[96px] text-[10px] font-semibold leading-tight text-rose-700"
                                        >
                                          {errMsg}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-sm font-semibold tabular-nums text-slate-700">
                                      {rawVal === "" || rawVal === null ? "—" : rawVal}
                                    </span>
                                  )}
                                </td>
                              );
                            });

                            if (showCategoryTotal) {
                              cells.push(
                                <td
                                  key={`${studentId}-${cat.categoryId}-total`}
                                  className="border-r border-slate-200 bg-slate-50/60 px-2.5 py-2 text-center font-bold tabular-nums text-[#0B1220]"
                                >
                                  {catTotals && catTotals.enteredCount > 0
                                    ? formatScore(catTotals.earned)
                                    : "—"}
                                </td>,
                              );
                            }

                            return cells;
                          })}

                          {/* Sticky Overall Total */}
                          <td className="sticky right-0 z-10 border-l border-slate-200 bg-[#EEF0FF]/70 px-3 py-2 text-center font-bold tabular-nums text-[#1447E6]">
                            {summary.hasAnyScore ? (
                              <span>
                                {formatScore(summary.overallEarned)}
                                <span className="text-xs font-medium text-slate-500">
                                  /{summary.overallMax}
                                </span>
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Mobile Card View (< 768px): zero horizontal squeeze, 44px touch targets ── */}
            <div className="divide-y divide-slate-100 md:hidden">
              {filteredRows.map(({ row, rowIndex }) => {
                const studentId = row.student.id || `row-${rowIndex}`;
                const studentName = getStudentName(row.student);
                const summary = computeStudentRelationalTotals(
                  categories,
                  assessments,
                  row.values,
                );

                return (
                  <div key={studentId} className="space-y-3 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[#0B1220]">{studentName}</p>
                        {row.student.admissionNumber && (
                          <p className="text-xs text-slate-500 tabular-nums">
                            {row.student.admissionNumber}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 rounded-xl bg-[#EEF0FF] px-3 py-1 text-xs font-bold tabular-nums text-[#1447E6]">
                        Overall:{" "}
                        {summary.hasAnyScore
                          ? `${formatScore(summary.overallEarned)}/${summary.overallMax}`
                          : `—/${summary.overallMax}`}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {allocations.map((cat) => {
                        const catSubs = assessmentsByCategory.get(cat.categoryId) ?? [];
                        const catTotals = summary.categoryById.get(cat.categoryId);
                        return (
                          <div
                            key={`${studentId}-m-${cat.categoryId}`}
                            className="rounded-xl border border-slate-200 bg-slate-50/50 p-3"
                          >
                            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                              <span className="inline-flex items-center gap-1">
                                <Lock className="h-3 w-3 text-slate-400" aria-hidden="true" />
                                {cat.name}
                              </span>
                              <span className="tabular-nums text-[#0B1220]">
                                {catTotals && catTotals.enteredCount > 0
                                  ? formatScore(catTotals.earned)
                                  : "—"}
                                /{cat.maxMarks}
                              </span>
                            </div>
                            {catSubs.length === 0 ? (
                              <p className="mt-1.5 text-xs text-amber-800">
                                Add sub-assessments above to enter scores.
                              </p>
                            ) : (
                              <div className="mt-2 grid grid-cols-2 gap-2">
                                {catSubs.map(({ assessment, columnIndex }) => {
                                  const subId = assessment.id || String(columnIndex);
                                  const cKey = cellKey(studentId, subId);
                                  const subMax =
                                    Number(assessment.maxObtainableScore ?? assessment.total) || 0;
                                  const rawVal = row.values[columnIndex] ?? "";
                                  const errMsg = cellErrors[cKey];
                                  const showErr = Boolean(errMsg && touchedCells[cKey]);
                                  const errElId = showErr ? `m-err-${cKey}` : undefined;
                                  return (
                                    <div key={cKey} className="space-y-1">
                                      <label
                                        htmlFor={`m-score-${cKey}`}
                                        className="flex items-center justify-between text-xs font-medium text-slate-600"
                                      >
                                        <span className="truncate">{assessment.name}</span>
                                        <span className="shrink-0 tabular-nums text-slate-500">
                                          /{subMax}
                                        </span>
                                      </label>
                                      {canEnterScores ? (
                                        <input
                                          id={`m-score-${cKey}`}
                                          type="number"
                                          inputMode="decimal"
                                          enterKeyHint="next"
                                          min={0}
                                          max={subMax}
                                          step="0.01"
                                          value={rawVal === null ? "" : String(rawVal)}
                                          aria-invalid={showErr ? "true" : "false"}
                                          aria-describedby={errElId}
                                          onChange={(e) =>
                                            handleCellChange(
                                              rowIndex,
                                              columnIndex,
                                              studentId,
                                              assessment,
                                              e.target.value,
                                            )
                                          }
                                          onBlur={(e) =>
                                            handleCellBlur(studentId, assessment, e.target.value)
                                          }
                                          placeholder="—"
                                          className={cn(
                                            "min-h-11 w-full rounded-xl border bg-white px-3 text-center text-base font-bold tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                                            showErr
                                              ? "border-rose-500 bg-rose-50 text-rose-800"
                                              : "border-slate-200 text-[#0B1220] focus:border-[#1447E6] focus:ring-2 focus:ring-blue-100",
                                          )}
                                        />
                                      ) : (
                                        <div className="flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold tabular-nums text-slate-600">
                                          {rawVal === "" || rawVal === null ? "—" : rawVal}
                                        </div>
                                      )}
                                      {showErr && (
                                        <p id={errElId} className="text-xs font-semibold text-rose-700">
                                          {errMsg}
                                        </p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── Footer Save Bar (pins above MobileTabBar on phones when edits/errors exist) ── */}
        {canEdit && (
          <div
            className={cn(
              "flex flex-col gap-2.5 border-t border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between",
              pinMobileSaveBar
                ? "fixed inset-x-0 bottom-above-nav z-20 bg-white/95 shadow-lg backdrop-blur-md md:static md:bg-slate-50/70 md:shadow-none"
                : "bg-slate-50/70",
            )}
          >
            <p className="text-xs text-slate-600">
              {!canEnterScores
                ? "Add at least one sub-assessment above before entering student scores."
                : errorCount > 0
                  ? `${errorCount} invalid score ${errorCount === 1 ? "entry" : "entries"} must be corrected before saving.`
                  : hasUnsavedScores
                    ? `${changedScoreEntries.length} unsaved score ${changedScoreEntries.length === 1 ? "change" : "changes"} ready to save.`
                    : "All scores saved."}
            </p>
            <Button
              type="button"
              onClick={() => void handleSaveScores()}
              disabled={!canEnterScores || !hasUnsavedScores || errorCount > 0 || savingScores}
              className="h-11 w-full rounded-xl bg-[#1447E6] px-6 text-sm font-semibold text-white hover:bg-[#0F36B8] disabled:bg-slate-200 disabled:text-slate-600 sm:w-auto"
            >
              {savingScores ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : hasUnsavedScores ? (
                <Save className="mr-2 h-4 w-4" aria-hidden="true" />
              ) : (
                <Check className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              {savingScores
                ? "Saving scores..."
                : hasUnsavedScores
                  ? `Save ${changedScoreEntries.length} ${changedScoreEntries.length === 1 ? "Score" : "Scores"}`
                  : "All Scores Saved"}
            </Button>
          </div>
        )}
      </section>

      {/* ── Add / Edit Sub-Assessment Modal ── */}
      <Dialog
        open={Boolean(subModal)}
        onOpenChange={(open) => {
          if (!open) {
            setSubModal(null);
            setSubFormError(null);
            setSubErrorField(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>
              {subModal?.mode === "edit" ? "Edit Sub-Assessment" : "Add Sub-Assessment"}
            </DialogTitle>
            <DialogDescription>
              {subModal?.mode === "add"
                ? `Set any positive whole-number max mark. Scores across ${subModal.categoryName} automatically average to the admin cap of ${subModal.categoryMaxMarks} marks.`
                : subModal
                  ? `Scores across ${subModal.categoryName} automatically average to the admin cap of ${subModal.categoryMaxMarks} marks.`
                  : ""}
            </DialogDescription>
          </DialogHeader>
          <form noValidate onSubmit={(e) => void handleSubmitSubModal(e)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor={subNameInputId}>Sub-Assessment Name</Label>
              <Input
                ref={subNameInputRef}
                id={subNameInputId}
                name="subAssessmentName"
                value={subName}
                onChange={(e) => {
                  setSubName(e.target.value);
                  if (subFormError) {
                    setSubFormError(null);
                    setSubErrorField(null);
                  }
                }}
                placeholder="e.g. Classwork 1"
                enterKeyHint="next"
                aria-invalid={subErrorField === "name" ? "true" : "false"}
                aria-describedby={subFormError && subErrorField === "name" ? subErrorId : undefined}
                className="h-11 text-base sm:h-10 sm:text-sm"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={subMarksInputId}>Maximum Marks (whole number)</Label>
              <Input
                ref={subMarksInputRef}
                id={subMarksInputId}
                name="subAssessmentMaxMarks"
                type="number"
                inputMode="numeric"
                enterKeyHint="done"
                min={1}
                step={1}
                value={subMarks}
                onChange={(e) => {
                  setSubMarks(e.target.value);
                  if (subFormError) {
                    setSubFormError(null);
                    setSubErrorField(null);
                  }
                }}
                placeholder="e.g. 10"
                aria-invalid={subErrorField === "marks" ? "true" : "false"}
                aria-describedby={subFormError && subErrorField === "marks" ? subErrorId : undefined}
                className="h-11 text-base font-bold tabular-nums sm:h-10 sm:text-sm"
              />
            </div>

            {subFormError && (
              <div
                id={subErrorId}
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
                <span>{subFormError}</span>
              </div>
            )}

            <DialogFooter className="flex-col-reverse gap-2 pt-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSubModal(null);
                  setSubFormError(null);
                  setSubErrorField(null);
                }}
                disabled={subSubmitting}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={subSubmitting}
                className="w-full bg-[#1447E6] hover:bg-[#0F36B8] sm:w-auto"
              >
                {subSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                {subModal?.mode === "edit" ? "Save Changes" : "Add Sub-Assessment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Sub-Assessment Confirmation Dialog ── */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete Sub-Assessment</DialogTitle>
            <DialogDescription>
              Remove &ldquo;{deleteTarget?.name}&rdquo; ({deleteTarget?.maxObtainableScore ?? deleteTarget?.total} marks) from {deleteTarget?.categoryName}? Remaining sub-assessments in this category will automatically rescale to the category maximum.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse gap-2 pt-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deletingSub}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleConfirmDeleteSub()}
              disabled={deletingSub}
              className="w-full sm:w-auto"
            >
              {deletingSub && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              Delete Sub-Assessment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
