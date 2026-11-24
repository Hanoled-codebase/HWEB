"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  Edit3,
  FileText,
  HelpCircle,
  Loader2,
  Plus,
  RefreshCw,
  ScrollText,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import {
  downloadSpreadsheetTemplateCsv,
  parseSpreadsheetScoreImport,
} from "@/lib/spreadsheet-import";
import { BackButton } from "@/components/dashboard/shared";
import { useMobilePageTitle } from "@/components/dashboard/mobile/MobileMenuProvider";
import {
  SubAssessmentDialog,
  type SubAssessmentModalMode,
} from "@/components/spreadsheets/SubAssessmentDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useOrganization } from "@/hooks/useOrganization";
import { apiFetch } from "@/lib/api";
import {
  buildCategoryEntryParam,
  countEnteredScoresForColumn,
  getErrorMessage,
  getOrderedAssessments,
  getSpreadsheetLabel,
  groupAssessmentsByCategory,
  hasTeacherSubAssessments,
  parseRouteParam,
  resolveSpreadsheetCategories,
  type SpreadsheetAssessment,
  type SpreadsheetDetail,
  type SpreadsheetQuestion,
  type SpreadsheetStatus,
} from "@/lib/spreadsheets";
import { cn } from "@/lib/utils";

function AssessmentIcon({ name }: { name: string }) {
  const isAssignment = name.trim().toLowerCase().includes("assignment");
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF]">
      {isAssignment ? (
        <ScrollText className="h-5 w-5 text-[#1447E6]" aria-hidden="true" />
      ) : (
        <FileText className="h-5 w-5 text-[#1447E6]" aria-hidden="true" />
      )}
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "active"
      ? "bg-emerald-500"
      : status === "inactive"
        ? "bg-slate-400"
        : "bg-amber-400";
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-sm font-semibold capitalize text-slate-700">
      <span className={cn("h-2 w-2 rounded-full", color)} aria-hidden="true" />
      {status === "active" ? "Active" : status === "inactive" ? "Inactive" : "Pending"}
    </span>
  );
}

export default function SpreadsheetAssessmentsPage() {
  const params = useParams();
  const router = useRouter();
  const { currentOrg, currentMember } = useOrganization();
  const sheetId = parseRouteParam(params.sheetId);
  const orgSlug = currentOrg?.slug;

  const [sheet, setSheet] = useState<SpreadsheetDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadSeq, setReloadSeq] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"assessments" | "questions">("assessments");
  const [selectedAssessmentIdx, setSelectedAssessmentIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [syncingRoster, setSyncingRoster] = useState(false);
  const [importingScores, setImportingScores] = useState(false);
  const scoreImportInputRef = useRef<HTMLInputElement | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showDeleteSheetDialog, setShowDeleteSheetDialog] = useState(false);
  const [deletingSheet, setDeletingSheet] = useState(false);
  const [subModal, setSubModal] = useState<SubAssessmentModalMode | null>(null);
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [editingQuestionIdx, setEditingQuestionIdx] = useState<number | null>(null);
  const [deleteQuestionIdx, setDeleteQuestionIdx] = useState<number | null>(null);
  const [questionForm, setQuestionForm] = useState({
    text: "",
    options: "",
    correctAnswer: "",
    score: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerRefresh = () => {
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
        setSheet(data);
      } catch (error) {
        if (cancelled) return;
        const message = getErrorMessage(error, "Failed to load spreadsheet");
        setSheet(null);
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
  }, [orgSlug, reloadSeq, sheetId]);

  const rawAssessments = useMemo<SpreadsheetAssessment[]>(
    () =>
      Array.isArray(sheet?.assessments) && sheet.assessments.length > 0
        ? sheet.assessments
        : Array.isArray(sheet?.columns)
          ? sheet.columns.map((name) => ({ name, total: undefined }))
          : [],
    [sheet],
  );
  const isRelational = sheet?.assessmentStorageMode === "RELATIONAL";
  const categories = useMemo(
    () => (isRelational ? resolveSpreadsheetCategories(sheet) : []),
    [isRelational, sheet],
  );
  const groupedSubs = useMemo(
    () => groupAssessmentsByCategory(categories, rawAssessments),
    [categories, rawAssessments],
  );
  const subCountByCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const [catId, list] of groupedSubs.entries()) {
      counts.set(catId, list.length);
    }
    return counts;
  }, [groupedSubs]);

  const displayAssessments = useMemo(
    () => getOrderedAssessments(rawAssessments),
    [rawAssessments],
  );

  const className = sheet?.classLevel?.name || "Class";
  const subjectName = sheet?.subject?.name || "Subject";
  const spreadsheetLabel = sheet ? getSpreadsheetLabel(sheet) : "Spreadsheet";
  const totalLearners = Array.isArray(sheet?.data) ? sheet.data.length : 0;

  useMobilePageTitle(sheet ? `${subjectName} · ${className}` : null);

  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((cat) => {
      const subs = groupedSubs.get(cat.id) ?? [];
      return (
        cat.name.toLowerCase().includes(q) ||
        className.toLowerCase().includes(q) ||
        subjectName.toLowerCase().includes(q) ||
        subs.some((item) => item.assessment.name.toLowerCase().includes(q))
      );
    });
  }, [categories, className, groupedSubs, searchQuery, subjectName]);

  const filteredLegacyAssessments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return displayAssessments;
    return displayAssessments.filter((a) =>
      [a.name, className, subjectName].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [className, displayAssessments, searchQuery, subjectName]);

  const isPrivileged =
    currentMember?.role === "owner" || currentMember?.role === "admin";
  const canEdit =
    isPrivileged ||
    (currentMember?.role === "member" && sheet?.status !== "inactive");
  const isPublishedLocked = Boolean(sheet?.hcoreAssessmentId);
  const editableCategories = useMemo(
    () => categories.filter((cat) => !cat.isSingleInstance),
    [categories],
  );
  const canManageSubAssessments =
    isRelational && canEdit && !isPublishedLocked && editableCategories.length > 0;

  const assessmentCount = isRelational ? categories.length : displayAssessments.length;

  const safeSelectedQuestionIdx =
    selectedAssessmentIdx < rawAssessments.length ? selectedAssessmentIdx : 0;
  const selectedAssessment = rawAssessments[safeSelectedQuestionIdx] || null;
  const questions = selectedAssessment?.questions || [];

  async function saveQuestions(newQuestions: SpreadsheetQuestion[]) {
    if (!orgSlug || !sheet || typeof sheet.version !== "number") {
      toast.error("Spreadsheet version missing. Refreshing...");
      triggerRefresh();
      return;
    }
    setSaving(true);
    try {
      const updatedAssessments = rawAssessments.map((a, i) =>
        i === safeSelectedQuestionIdx ? { ...a, questions: newQuestions } : a,
      );
      if (isRelational) {
        if (!selectedAssessment?.id) {
          toast.error("Select a sub-assessment before saving questions.");
          return;
        }
        const response = await apiFetch<{ data?: { version?: number }; version?: number }>(
          `/spreadsheets/${orgSlug}/${sheet.id}/questions`,
          {
            method: "PATCH",
            body: JSON.stringify({
              expectedVersion: sheet.version,
              subAssessmentId: selectedAssessment.id,
              questions: newQuestions,
            }),
          },
        );
        const nextVersion = response?.data?.version ?? response?.version ?? sheet.version + 1;
        setSheet((prev) =>
          prev ? { ...prev, assessments: updatedAssessments, version: nextVersion } : prev,
        );
        toast.success("Questions saved");
        return;
      }
      const updated = await apiFetch<SpreadsheetDetail>(
        `/spreadsheets/${orgSlug}/${sheet.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            assessments: updatedAssessments,
            expectedVersion: sheet.version,
          }),
        },
      );
      setSheet((prev) =>
        prev ? { ...prev, assessments: updatedAssessments, version: updated.version } : prev,
      );
      toast.success("Questions saved");
    } catch {
      triggerRefresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(nextStatus: SpreadsheetStatus) {
    if (!orgSlug || !sheet) return;
    setUpdatingStatus(true);
    try {
      await apiFetch(`/spreadsheets/${orgSlug}/${sheet.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      setSheet((prev) => (prev ? { ...prev, status: nextStatus } : prev));
      toast.success(`Status updated to ${nextStatus}`);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update status"));
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleDeleteSheet() {
    if (!orgSlug || !sheet || deletingSheet) return;
    setDeletingSheet(true);
    try {
      await apiFetch(`/spreadsheets/${orgSlug}/${sheet.id}`, {
        method: "DELETE",
      });
      toast.success(`Deleted "${spreadsheetLabel}".`);
      setShowDeleteSheetDialog(false);
      router.replace(sheetsHref);
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Could not delete spreadsheet. Please try again."),
      );
    } finally {
      setDeletingSheet(false);
    }
  }

  async function handleImportScoresFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !orgSlug || !sheet) return;
    setImportingScores(true);
    try {
      const text = await file.text();
      const parsed = parseSpreadsheetScoreImport(text, rawAssessments, sheet.data ?? []);
      if (parsed.updatedCells === 0) {
        toast.warning(
          parsed.invalidCells.length > 0
            ? parsed.invalidCells[0]
            : "No new valid scores were found in the uploaded file.",
        );
        return;
      }
      const payload: Record<string, unknown> = {
        data: parsed.updatedRows.map((row) => ({
          student: { id: row.student.id },
          values: row.values,
        })),
        ...(!isRelational && typeof sheet.version === "number"
          ? { expectedVersion: sheet.version }
          : {}),
      };
      const updated = await apiFetch<SpreadsheetDetail>(
        `/spreadsheets/${orgSlug}/${sheet.id}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      );
      setSheet(updated);
      const extras: string[] = [];
      if (parsed.unmatchedRows > 0) extras.push(`${parsed.unmatchedRows} unmatched row(s)`);
      if (parsed.invalidCells.length > 0) extras.push(`${parsed.invalidCells.length} invalid cell(s) skipped`);
      toast.success(
        `Imported ${parsed.updatedCells} score(s) across ${parsed.matchedStudents} student(s)${extras.length > 0 ? ` (${extras.join(", ")})` : ""}.`,
      );
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to import scores"));
    } finally {
      setImportingScores(false);
    }
  }

  async function handleSyncRoster() {
    if (!orgSlug || !sheet || typeof sheet.version !== "number") {
      toast.error("Spreadsheet version missing. Refreshing...");
      triggerRefresh();
      return;
    }
    setSyncingRoster(true);
    try {
      const merged = await apiFetch<SpreadsheetDetail>(
        `/spreadsheets/${orgSlug}/${sheet.id}/merge`,
        {
          method: "POST",
          body: JSON.stringify({ expectedVersion: sheet.version }),
        },
      );
      setSheet(merged);
      toast.success("Synchronized with current class roster");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to synchronize students"));
    } finally {
      setSyncingRoster(false);
    }
  }

  function openAddQuestion() {
    setEditingQuestionIdx(null);
    setQuestionForm({ text: "", options: "", correctAnswer: "", score: "" });
    setShowQuestionDialog(true);
  }

  function openEditQuestion(idx: number) {
    const q = questions[idx];
    setEditingQuestionIdx(idx);
    setQuestionForm({
      text: q.text,
      options: Array.isArray(q.options) ? q.options.join("\n") : "",
      correctAnswer: q.correctAnswer || "",
      score: q.score?.toString() || "",
    });
    setShowQuestionDialog(true);
  }

  async function saveQuestionForm() {
    if (!questionForm.text.trim()) {
      toast.error("Question text is required");
      return;
    }
    const newQuestion: SpreadsheetQuestion = {
      text: questionForm.text.trim(),
      options: questionForm.options.trim()
        ? questionForm.options
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
      correctAnswer: questionForm.correctAnswer.trim() || undefined,
      score: questionForm.score ? parseInt(questionForm.score, 10) : undefined,
    };
    const updated = [...questions];
    if (editingQuestionIdx !== null) {
      updated[editingQuestionIdx] = newQuestion;
    } else {
      updated.push(newQuestion);
    }
    await saveQuestions(updated);
    setShowQuestionDialog(false);
  }

  async function deleteQuestion(idx: number) {
    await saveQuestions(questions.filter((_, i) => i !== idx));
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        const imported = Array.isArray(json) ? json : json.questions;
        if (!Array.isArray(imported) || imported.length === 0) {
          toast.error("No questions found in file");
          return;
        }
        const valid = imported.filter((q: SpreadsheetQuestion) => q.text?.trim());
        if (valid.length === 0) {
          toast.error("No valid questions found");
          return;
        }
        await saveQuestions([...questions, ...valid]);
        toast.success(`${valid.length} questions imported`);
      } catch {
        toast.error("Invalid JSON file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function exportQuestions() {
    const json = JSON.stringify(questions, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedAssessment?.name || "questions"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const sheetsHref = orgSlug
    ? `/dashboard/school/${orgSlug}/spreadsheets`
    : "/dashboard";

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="-mx-4 -mt-4 space-y-4 bg-slate-50 px-4 pb-10 pt-5 md:mx-0 md:mt-0 md:bg-transparent md:px-0 md:pt-0">
        <BackButton label="Back to Spreadsheets" href={sheetsHref} className="hidden md:inline-flex" />
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-44" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="h-11 w-full rounded-2xl" />
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  /* ── Error ── */
  if (!sheet && loadError) {
    return (
      <div className="space-y-4">
        <BackButton label="Back to Spreadsheets" href={sheetsHref} className="hidden md:inline-flex" />
        <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
          <FileText className="mb-4 h-10 w-10 text-rose-300" aria-hidden="true" />
          <h2 className="text-lg font-bold text-[#0B1220]">Unable to Load</h2>
          <p className="mt-2 text-sm text-slate-500">{loadError}</p>
          <button
            type="button"
            onClick={triggerRefresh}
            className="mt-5 min-h-11 rounded-xl bg-[#1447E6] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0F36B8]"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!sheet) {
    return (
      <div className="space-y-4">
        <BackButton label="Back to Spreadsheets" href={sheetsHref} className="hidden md:inline-flex" />
        <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
          <FileText className="mb-4 h-10 w-10 text-blue-300" aria-hidden="true" />
          <h2 className="text-lg font-bold text-[#0B1220]">Spreadsheet Not Found</h2>
          <p className="mt-2 text-sm text-slate-500">The requested gradebook does not exist.</p>
          <button
            type="button"
            onClick={() => router.push(sheetsHref)}
            className="mt-5 min-h-11 rounded-xl bg-[#1447E6] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0F36B8]"
          >
            Back to Spreadsheets
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="-mx-4 -mt-4 flex flex-col bg-slate-50 md:mx-0 md:mt-0 md:bg-transparent">
      <div className="px-4 pb-10 pt-5 md:mx-auto md:w-full md:max-w-3xl md:px-0 md:pt-0">
        <BackButton
          label="Back to Spreadsheets"
          href={sheetsHref}
          className="mb-4 hidden md:inline-flex"
        />

        {/* Context row (mobile top bar carries "Subject · Class") */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="hidden truncate text-2xl font-bold tracking-tight text-[#0B1220] md:block">
              {spreadsheetLabel}
            </h1>
            <p className="hidden truncate text-sm text-slate-600 md:mt-1 md:block">
              <span className="font-semibold text-[#0B1220]">{subjectName}</span>
              <span className="mx-1.5 text-slate-300">·</span>
              <span className="font-semibold text-[#0B1220]">{className}</span>
              <span className="mx-1.5 text-slate-300">·</span>
              <span className="tabular-nums">
                {assessmentCount} {assessmentCount === 1 ? "assessment" : "assessments"}
              </span>
            </p>
            <p className="text-sm text-slate-600 md:hidden">
              {assessmentCount} {assessmentCount === 1 ? "assessment" : "assessments"} · tap one to enter scores
            </p>
          </div>
          <StatusDot status={sheet.status} />
        </div>

        {/* Tab switcher */}
        <div role="tablist" aria-label="Sheet sections" className="mb-4 flex rounded-2xl bg-slate-200/60 p-1">
          <button
            role="tab"
            type="button"
            aria-selected={activeTab === "assessments"}
            onClick={() => setActiveTab("assessments")}
            className={cn(
              "flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors motion-reduce:transition-none",
              activeTab === "assessments"
                ? "bg-white text-[#0B1220] shadow-xs"
                : "text-slate-600 hover:text-[#0B1220]",
            )}
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            Assessments
          </button>
          <button
            role="tab"
            type="button"
            aria-selected={activeTab === "questions"}
            onClick={() => setActiveTab("questions")}
            className={cn(
              "flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors motion-reduce:transition-none",
              activeTab === "questions"
                ? "bg-white text-[#0B1220] shadow-xs"
                : "text-slate-600 hover:text-[#0B1220]",
            )}
          >
            <HelpCircle className="h-4 w-4" aria-hidden="true" />
            Questions
          </button>
        </div>

        {/* Assessments tab */}
        {activeTab === "assessments" && (
          <>
            {/* Search & Template Import/Export Row */}
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  placeholder="Search assessment"
                  aria-label="Search assessment"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-800 shadow-2xs outline-none transition placeholder:text-slate-400 focus:border-[#1447E6] focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {rawAssessments.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      downloadSpreadsheetTemplateCsv(
                        sheet.title || `${subjectName}-${className}`,
                        rawAssessments,
                        sheet.data ?? [],
                      )
                    }
                    className="h-10 flex-1 rounded-xl border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:flex-none"
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                    Download Format
                  </Button>
                  {canEdit && !isPublishedLocked && (
                    <>
                      <input
                        ref={scoreImportInputRef}
                        type="file"
                        accept=".csv,.tsv,.txt,text/csv"
                        onChange={(e) => void handleImportScoresFile(e)}
                        className="sr-only"
                        aria-label="Import scores from CSV spreadsheet"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={importingScores}
                        onClick={() => scoreImportInputRef.current?.click()}
                        className="h-10 flex-1 rounded-xl border-blue-200 bg-blue-50/70 px-3 text-xs font-semibold text-blue-700 hover:bg-blue-100/70 sm:flex-none"
                      >
                        {importingScores ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                        ) : (
                          <Upload className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        {importingScores ? "Importing..." : "Import Scores"}
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>

            {isRelational ? (
              filteredCategories.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center text-sm text-slate-500">
                  {categories.length === 0
                    ? "No assessments defined for this spreadsheet."
                    : "No assessments match your search."}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredCategories.map((category) => {
                    const subs = groupedSubs.get(category.id) ?? [];
                    const hasSubs = hasTeacherSubAssessments(category, subs);
                    const singleSub = !hasSubs && subs.length === 1 ? subs[0] : null;
                    const singleEntered = singleSub
                      ? countEnteredScoresForColumn(sheet.data, singleSub.originalIndex)
                      : 0;

                    const targetHref = (() => {
                      if (!orgSlug) return "/dashboard";
                      if (hasSubs) {
                        return `/dashboard/school/${orgSlug}/spreadsheets/${sheetId}/category/${encodeURIComponent(category.id)}`;
                      }
                      if (singleSub?.assessment.id) {
                        return `/dashboard/school/${orgSlug}/spreadsheets/${sheetId}/assessment/${encodeURIComponent(singleSub.assessment.id)}`;
                      }
                      return `/dashboard/school/${orgSlug}/spreadsheets/${sheetId}/assessment/${encodeURIComponent(buildCategoryEntryParam(category.id))}`;
                    })();

                    const subline = hasSubs
                      ? `${subs.length} ${subs.length === 1 ? "sub-assessment" : "sub-assessments"} · ${className} · ${subjectName}`
                      : singleEntered > 0 && totalLearners > 0
                        ? `${singleEntered}/${totalLearners} entered · ${className} · ${subjectName}`
                        : `${className} · ${subjectName}`;

                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => router.push(targetHref)}
                        className="group flex min-h-[72px] w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-left shadow-2xs transition-colors hover:border-[#1447E6]/35 hover:bg-slate-50/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1447E6] motion-reduce:transition-none"
                      >
                        <AssessmentIcon name={category.name} />

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] font-bold text-[#0B1220] group-hover:text-[#1447E6]">
                            {category.name}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-slate-500 tabular-nums">
                            {subline}
                          </p>
                        </div>

                        <span className="shrink-0 rounded-full bg-[#EEF0FF] px-3 py-1 text-xs font-bold tabular-nums text-[#1447E6] ring-1 ring-[#1447E6]/15">
                          Max {category.maxMarks}
                        </span>

                        <ChevronRight
                          className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-[#1447E6] motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                          aria-hidden="true"
                        />
                      </button>
                    );
                  })}
                </div>
              )
            ) : filteredLegacyAssessments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center text-sm text-slate-500">
                {displayAssessments.length === 0
                  ? "No assessments defined for this spreadsheet."
                  : "No assessments match your search."}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLegacyAssessments.map((assessment) => {
                  const entered = countEnteredScoresForColumn(sheet.data, assessment.originalIndex);
                  const subline =
                    entered > 0 && totalLearners > 0
                      ? `${entered}/${totalLearners} entered · ${className} · ${subjectName}`
                      : `${className} · ${subjectName}`;

                  return (
                    <button
                      key={`${assessment.originalIndex}-${assessment.name}`}
                      type="button"
                      onClick={() =>
                        router.push(
                          `/dashboard/school/${orgSlug}/spreadsheets/${sheetId}/assessment/${assessment.originalIndex}`,
                        )
                      }
                      className="group flex min-h-[72px] w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-left shadow-2xs transition-colors hover:border-[#1447E6]/35 hover:bg-slate-50/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1447E6] motion-reduce:transition-none"
                    >
                      <AssessmentIcon name={assessment.name} />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-bold text-[#0B1220] group-hover:text-[#1447E6]">
                          {assessment.name}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500 tabular-nums">
                          {subline}
                        </p>
                      </div>

                      {typeof assessment.total === "number" && (
                        <span className="shrink-0 rounded-full bg-[#EEF0FF] px-3 py-1 text-xs font-bold tabular-nums text-[#1447E6] ring-1 ring-[#1447E6]/15">
                          Max {assessment.total}
                        </span>
                      )}

                      <ChevronRight
                        className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-[#1447E6] motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                        aria-hidden="true"
                      />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Add sub-assessment action for non-locked relational categories */}
            {canManageSubAssessments && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setSubModal({ mode: "add" })}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#1447E6]/35 bg-white px-4 text-sm font-semibold text-[#1447E6] transition-colors hover:border-[#1447E6] hover:bg-[#EEF0FF]/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1447E6] motion-reduce:transition-none"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add sub-assessment
                </button>
              </div>
            )}

            {/* Collapsed sheet & roster controls (progressive disclosure via native details) */}
            {(canEdit || isPrivileged) && (
              <details className="group mt-4 rounded-2xl border border-slate-200 bg-white">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left marker:hidden [&::-webkit-details-marker]:hidden">
                  <span>
                    <span className="block text-sm font-semibold text-[#0B1220]">
                      Sheet &amp; roster controls
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      Sync class list{isPrivileged ? ", change status, or delete spreadsheet" : ""}
                    </span>
                  </span>
                  <ChevronDown
                    className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </summary>
                <div className="space-y-3 border-t border-slate-100 px-4 pb-4 pt-3">
                  {isPrivileged && (
                    <div>
                      <Label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        Sheet status
                      </Label>
                      <Select
                        value={sheet.status}
                        disabled={updatingStatus}
                        onValueChange={(val) => void handleStatusChange(val as SpreadsheetStatus)}
                      >
                        <SelectTrigger className="min-h-11 w-full rounded-xl border-slate-200 bg-white text-sm text-[#0B1220]">
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
                      onClick={() => void handleSyncRoster()}
                      disabled={syncingRoster}
                      className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#1447E6]/25 bg-white px-4 text-sm font-semibold text-[#1447E6] transition-colors hover:bg-[#EEF0FF]/60 disabled:opacity-60"
                    >
                      {syncingRoster ? (
                        <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                      ) : (
                        <RefreshCw className="h-4 w-4" aria-hidden="true" />
                      )}
                      Sync with class list
                    </button>
                  )}
                  {isPrivileged && (
                    <div className="border-t border-slate-100 pt-3">
                      <button
                        type="button"
                        onClick={() => setShowDeleteSheetDialog(true)}
                        disabled={isPublishedLocked || deletingSheet}
                        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50/70 px-4 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        Delete spreadsheet
                      </button>
                      {isPublishedLocked && (
                        <p className="mt-1.5 text-xs text-slate-600">
                          Published spreadsheets linked to HCORE cannot be deleted.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </details>
            )}
          </>
        )}

        {/* Questions tab */}
        {activeTab === "questions" && (
          <>
            {rawAssessments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500">
                <HelpCircle className="mx-auto mb-3 h-8 w-8 text-slate-300" aria-hidden="true" />
                {isRelational
                  ? "Add a sub-assessment or record scores first to attach questions."
                  : "No assessments defined. Create assessments first."}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Assessment
                  </Label>
                  <Select
                    value={String(safeSelectedQuestionIdx)}
                    onValueChange={(v) => setSelectedAssessmentIdx(parseInt(String(v), 10))}
                  >
                    <SelectTrigger className="h-11 w-full rounded-xl border-slate-200 bg-white text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {rawAssessments.map((a, i) => (
                        <SelectItem key={a.id || i} value={String(i)}>
                          {a.name} ({a.maxObtainableScore ?? a.total ?? "?"} marks)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={openAddQuestion}
                    className="flex min-h-11 items-center gap-1.5 rounded-xl bg-[#1447E6] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0F36B8]"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" /> Add Question
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <Upload className="h-4 w-4" aria-hidden="true" /> Import
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  {questions.length > 0 && (
                    <button
                      type="button"
                      onClick={exportQuestions}
                      className="flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <Download className="h-4 w-4" aria-hidden="true" /> Export
                    </button>
                  )}
                  {saving && (
                    <Loader2
                      className="h-5 w-5 animate-spin self-center text-[#1447E6] motion-reduce:animate-none"
                      aria-hidden="true"
                    />
                  )}
                </div>

                {questions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center text-sm text-slate-500">
                    <HelpCircle className="mx-auto mb-3 h-8 w-8 text-slate-300" aria-hidden="true" />
                    No questions yet. Add questions manually or import from JSON.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {questions.map((q, idx) => (
                      <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-[#0B1220]">
                              <span className="mr-2 text-[#1447E6]">Q{idx + 1}.</span>
                              {q.text}
                            </p>
                            {Array.isArray(q.options) && q.options.length > 0 && (
                              <div className="mt-2 grid grid-cols-2 gap-1.5">
                                {q.options.map((opt, oi) => (
                                  <div
                                    key={oi}
                                    className={cn(
                                      "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs",
                                      opt === q.correctAnswer
                                        ? "bg-emerald-50 font-medium text-emerald-700"
                                        : "bg-slate-50 text-slate-600",
                                    )}
                                  >
                                    {opt === q.correctAnswer && (
                                      <Check className="h-3 w-3 text-emerald-600" aria-hidden="true" />
                                    )}
                                    {opt}
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="mt-2 flex gap-3 text-xs text-slate-500">
                              {q.correctAnswer && (
                                <span>
                                  Answer:{" "}
                                  <span className="font-semibold text-emerald-700">
                                    {q.correctAnswer}
                                  </span>
                                </span>
                              )}
                              {q.score && <span className="tabular-nums">Marks: {q.score}</span>}
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <button
                              type="button"
                              onClick={() => openEditQuestion(idx)}
                              aria-label={`Edit question ${idx + 1}`}
                              className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 md:pointer-fine:h-8 md:pointer-fine:w-8"
                            >
                              <Edit3 className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteQuestionIdx(idx)}
                              aria-label={`Delete question ${idx + 1}`}
                              className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-600 md:pointer-fine:h-8 md:pointer-fine:w-8"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Add sub-assessment dialog */}
      {orgSlug && isRelational && (
        <SubAssessmentDialog
          open={Boolean(subModal)}
          modal={subModal}
          orgSlug={orgSlug}
          sheetId={sheetId}
          categories={categories}
          subCountByCategory={subCountByCategory}
          onOpenChange={(open) => {
            if (!open) setSubModal(null);
          }}
          onSaved={({ categoryId }) => {
            router.push(
              `/dashboard/school/${orgSlug}/spreadsheets/${sheetId}/category/${encodeURIComponent(categoryId)}`,
            );
          }}
        />
      )}

      {/* Add / Edit Question dialog */}
      <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
        <DialogContent className="sm:max-w-[512px]">
          <DialogHeader>
            <DialogTitle>{editingQuestionIdx !== null ? "Edit" : "Add"} Question</DialogTitle>
            <DialogDescription>
              {selectedAssessment?.name} &mdash;{" "}
              {selectedAssessment?.maxObtainableScore ?? selectedAssessment?.total ?? "?"} marks max
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>Question Text</Label>
              <Textarea
                placeholder="Enter the question..."
                value={questionForm.text}
                onChange={(e) => setQuestionForm((p) => ({ ...p, text: e.target.value }))}
                className="mt-1"
                rows={3}
              />
            </div>
            <div>
              <Label>Options (one per line)</Label>
              <Textarea
                placeholder={"Option A\nOption B\nOption C\nOption D"}
                value={questionForm.options}
                onChange={(e) => setQuestionForm((p) => ({ ...p, options: e.target.value }))}
                className="mt-1"
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Correct Answer</Label>
                <Input
                  placeholder="e.g. Option A"
                  value={questionForm.correctAnswer}
                  onChange={(e) => setQuestionForm((p) => ({ ...p, correctAnswer: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Marks</Label>
                <Input
                  type="number"
                  placeholder="1"
                  value={questionForm.score}
                  onChange={(e) => setQuestionForm((p) => ({ ...p, score: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuestionDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#1447E6] text-white hover:bg-[#0F36B8]"
              onClick={() => void saveQuestionForm()}
              disabled={saving}
            >
              {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden="true" />}
              {editingQuestionIdx !== null ? "Update" : "Add"} Question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Question confirmation */}
      <AlertDialog
        open={deleteQuestionIdx !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteQuestionIdx(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question</AlertDialogTitle>
            <AlertDialogDescription>
              Remove question {deleteQuestionIdx !== null ? deleteQuestionIdx + 1 : ""} from{" "}
              {selectedAssessment?.name || "this assessment"}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-700"
              onClick={async () => {
                if (deleteQuestionIdx !== null) {
                  await deleteQuestion(deleteQuestionIdx);
                  setDeleteQuestionIdx(null);
                }
              }}
            >
              Delete Question
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Spreadsheet confirmation (Admin only) */}
      <AlertDialog
        open={showDeleteSheetDialog}
        onOpenChange={(open) => {
          if (!deletingSheet) setShowDeleteSheetDialog(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{spreadsheetLabel}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes this spreadsheet, all of its sub-assessments, and every
              recorded student score on it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingSheet}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deletingSheet}
              className="bg-rose-600 text-white hover:bg-rose-700"
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteSheet();
              }}
            >
              {deletingSheet && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              {deletingSheet ? "Deleting..." : "Delete Spreadsheet"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
