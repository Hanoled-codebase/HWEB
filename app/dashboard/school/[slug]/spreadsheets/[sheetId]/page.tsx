"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronRight,
  FileText,
  HelpCircle,
  Loader2,
  Plus,
  Search,
  ScrollText,
  Trash2,
  Edit3,
  Upload,
  Download,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { BackButton } from "@/components/dashboard/shared";
import { useOrganization } from "@/hooks/useOrganization";
import { useMobilePageTitle } from "@/components/dashboard/mobile/MobileMenuProvider";
import { apiFetch } from "@/lib/api";
import {
  SpreadsheetDetail,
  SpreadsheetQuestion,
  getErrorMessage,
  getOrderedAssessments,
  getSpreadsheetLabel,
  getStatusClassName,
  parseRouteParam,
} from "@/lib/spreadsheets";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function AssessmentIcon({ name }: { name: string }) {
  const isAssignment = name.trim().toLowerCase().includes("assignment");
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
      {isAssignment ? (
        <ScrollText className="h-5 w-5 text-indigo-500" />
      ) : (
        <FileText className="h-5 w-5 text-indigo-500" />
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
    <span className="flex items-center gap-1.5 text-sm font-semibold capitalize text-slate-700">
      <span className={cn("h-2 w-2 rounded-full", color)} />
      {status === "active" ? "Active" : status === "inactive" ? "Inactive" : "Pending"}
    </span>
  );
}

export default function SpreadsheetAssessmentsPage() {
  const params = useParams();
  const router = useRouter();
  const { currentOrg } = useOrganization();
  const sheetId = parseRouteParam(params.sheetId);

  const [sheet, setSheet] = useState<SpreadsheetDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"assessments" | "questions">("assessments");
  const [selectedAssessmentIdx, setSelectedAssessmentIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [editingQuestionIdx, setEditingQuestionIdx] = useState<number | null>(null);
  const [questionForm, setQuestionForm] = useState({ text: "", options: "", correctAnswer: "", score: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSheet = useCallback(async () => {
    if (!currentOrg || !sheetId) return;
    try {
      setIsLoading(true);
      setLoadError(null);
      const data = await apiFetch<SpreadsheetDetail>(
        `/spreadsheets/${currentOrg.slug}/${sheetId}`,
      );
      setSheet(data);
    } catch (error) {
      const message = getErrorMessage(error, "Failed to load spreadsheet");
      setSheet(null);
      setLoadError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [currentOrg, sheetId]);

  useEffect(() => { fetchSheet(); }, [fetchSheet]);

  type SA = import("@/lib/spreadsheets").SpreadsheetAssessment;
  const rawAssessments: SA[] =
    Array.isArray(sheet?.assessments) && sheet.assessments.length > 0
      ? (sheet.assessments as SA[])
      : Array.isArray(sheet?.columns)
        ? sheet.columns.map((name) => ({ name, total: undefined }) as SA)
        : [];
  const displayAssessments = getOrderedAssessments(rawAssessments);
  const className = sheet?.classLevel?.name || "Class";
  const subjectName = sheet?.subject?.name || "Subject";
  const spreadsheetLabel = sheet ? getSpreadsheetLabel(sheet) : "Spreadsheet";
  useMobilePageTitle(sheet ? `${subjectName} · ${className}` : null);

  const filteredAssessments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return displayAssessments;
    return displayAssessments.filter((a) =>
      [a.name, className, subjectName].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [className, displayAssessments, searchQuery, subjectName]);

  const selectedAssessment = rawAssessments[selectedAssessmentIdx] || null;
  const questions = selectedAssessment?.questions || [];

  async function saveQuestions(newQuestions: SpreadsheetQuestion[]) {
    if (!currentOrg || !sheet) return;
    setSaving(true);
    try {
      const updatedAssessments = rawAssessments.map((a, i) =>
        i === selectedAssessmentIdx ? { ...a, questions: newQuestions } : a,
      );
      await apiFetch(`/spreadsheets/${currentOrg.slug}/${sheet.id}`, {
        method: "PATCH",
        body: JSON.stringify({ assessments: updatedAssessments }),
      });
      setSheet(prev => prev ? { ...prev, assessments: updatedAssessments } : prev);
      toast.success("Questions saved");
    } catch { /* handled by toast */ } finally {
      setSaving(false);
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
    if (!questionForm.text.trim()) { toast.error("Question text is required"); return; }
    const newQuestion: SpreadsheetQuestion = {
      text: questionForm.text.trim(),
      options: questionForm.options.trim()
        ? questionForm.options.split("\n").map(s => s.trim()).filter(Boolean)
        : undefined,
      correctAnswer: questionForm.correctAnswer.trim() || undefined,
      score: questionForm.score ? parseInt(questionForm.score) : undefined,
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
        if (!Array.isArray(imported) || imported.length === 0) { toast.error("No questions found in file"); return; }
        const valid = imported.filter((q: SpreadsheetQuestion) => q.text?.trim());
        if (valid.length === 0) { toast.error("No valid questions found"); return; }
        await saveQuestions([...questions, ...valid]);
        toast.success(`${valid.length} questions imported`);
      } catch { toast.error("Invalid JSON file"); }
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

  const sheetsHref = currentOrg?.slug
    ? `/dashboard/school/${currentOrg.slug}/spreadsheets`
    : "/dashboard";

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="-mx-4 -mt-4 space-y-4 bg-slate-50 px-4 pt-5 pb-10 md:mx-0 md:mt-0 md:bg-transparent md:px-0 md:pt-0">
        <BackButton label="Back to Spreadsheets" href={sheetsHref} className="hidden md:inline-flex" />
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-44" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-12 w-12 rounded-full" />
        </div>
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-11 w-full rounded-2xl" />
        <Skeleton className="h-11 w-full rounded-2xl" />
        {[...Array(3)].map((_, i) => (
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
          <FileText className="mb-4 h-10 w-10 text-rose-300" />
          <h2 className="text-lg font-bold text-slate-800">Unable to Load</h2>
          <p className="mt-2 text-sm text-slate-500">{loadError}</p>
          <button onClick={() => void fetchSheet()} className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white">Try Again</button>
        </div>
      </div>
    );
  }

  if (!sheet) {
    return (
      <div className="space-y-4">
        <BackButton label="Back to Spreadsheets" href={sheetsHref} className="hidden md:inline-flex" />
        <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
          <FileText className="mb-4 h-10 w-10 text-blue-300" />
          <h2 className="text-lg font-bold text-slate-800">Spreadsheet Not Found</h2>
          <p className="mt-2 text-sm text-slate-500">The requested gradebook does not exist.</p>
          <button onClick={() => router.push(sheetsHref)} className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white">Back to Spreadsheets</button>
        </div>
      </div>
    );
  }

  return (
    /* Bleed edge-to-edge on mobile, matching the layout's p-4 offset */
    <div className="-mx-4 -mt-4 flex flex-col bg-slate-50 md:mx-0 md:mt-0 md:bg-transparent">
      <div className="px-4 pt-5 pb-10 md:px-0 md:pt-0">
        <BackButton
          label="Back to Spreadsheets"
          href={sheetsHref}
          className="mb-4 hidden md:inline-flex"
        />

        {/* ── Context: which sheet this is (the top bar carries "Subject · Class" on phones) ── */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="hidden truncate text-2xl font-bold text-slate-900 md:block">{spreadsheetLabel}</h1>
            <p className="hidden truncate text-sm text-slate-600 md:mt-1 md:block">
              <span className="font-semibold text-slate-900">{subjectName}</span>
              <span className="mx-1.5 text-slate-300">·</span>
              <span className="font-semibold text-slate-900">{className}</span>
            </p>
            <p className="text-sm text-slate-600 md:hidden">
              {displayAssessments.length} {displayAssessments.length === 1 ? "assessment" : "assessments"} · tap one to enter scores
            </p>
          </div>
          <StatusDot status={sheet.status} />
        </div>

        {/* ── Tab switcher ── */}
        <div role="tablist" aria-label="Sheet sections" className="mb-4 flex rounded-2xl bg-slate-200/60 p-1">
          <button
            role="tab"
            aria-selected={activeTab === "assessments"}
            onClick={() => setActiveTab("assessments")}
            className={cn(
              "flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors",
              activeTab === "assessments"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900",
            )}
          >
            <FileText className="h-4 w-4" />
            Assessments
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "questions"}
            onClick={() => setActiveTab("questions")}
            className={cn(
              "flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors",
              activeTab === "questions"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900",
            )}
          >
            <HelpCircle className="h-4 w-4" />
            Questions
          </button>
        </div>

        {/* ── Assessments tab ── */}
        {activeTab === "assessments" && (
          <>
            {/* Search */}
            <div className="relative mb-4">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Search assessment"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 shadow-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition"
              />
            </div>

            {/* Assessment list */}
            {filteredAssessments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center text-sm text-slate-500 shadow-sm">
                {displayAssessments.length === 0
                  ? "No assessments defined for this spreadsheet."
                  : "No assessments match your search."}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAssessments.map((assessment) => (
                  <button
                    key={`${assessment.originalIndex}-${assessment.name}`}
                    type="button"
                    onClick={() =>
                      router.push(
                        `/dashboard/school/${currentOrg?.slug}/spreadsheets/${sheetId}/assessment/${assessment.originalIndex}`,
                      )
                    }
                    className="group flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-left shadow-sm transition hover:border-indigo-200 hover:shadow-md"
                  >
                    <AssessmentIcon name={assessment.name} />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-800 group-hover:text-indigo-700">
                        {assessment.name}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {className} · {subjectName}
                      </p>
                    </div>

                    {typeof assessment.total === "number" && (
                      <span className="shrink-0 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600 ring-1 ring-indigo-100">
                        Max {assessment.total}
                      </span>
                    )}

                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-indigo-600" />
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Questions tab ── */}
        {activeTab === "questions" && (
          <>
            {rawAssessments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center text-sm text-slate-500 shadow-sm">
                <HelpCircle className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                No assessments defined. Create assessments first.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Assessment picker */}
                <div>
                  <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Assessment
                  </Label>
                  <Select
                    value={String(selectedAssessmentIdx)}
                    onValueChange={(v) => setSelectedAssessmentIdx(parseInt(v as string))}
                  >
                    <SelectTrigger className="h-11 w-full rounded-xl border-slate-200 bg-white text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {rawAssessments.map((a, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {a.name} ({a.total ?? "?"} marks)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={openAddQuestion}
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                  >
                    <Plus className="h-4 w-4" /> Add Question
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Upload className="h-4 w-4" /> Import
                  </button>
                  <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileUpload} />
                  {questions.length > 0 && (
                    <button
                      onClick={exportQuestions}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Download className="h-4 w-4" /> Export
                    </button>
                  )}
                  {saving && <Loader2 className="h-5 w-5 animate-spin self-center text-indigo-600" />}
                </div>

                {/* Questions list */}
                {questions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center text-sm text-slate-500 shadow-sm">
                    <HelpCircle className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                    No questions yet. Add questions manually or import from JSON.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {questions.map((q, idx) => (
                      <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-800">
                              <span className="text-indigo-500 mr-2">Q{idx + 1}.</span>
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
                                        ? "bg-emerald-50 text-emerald-700 font-medium"
                                        : "bg-slate-50 text-slate-600",
                                    )}
                                  >
                                    {opt === q.correctAnswer && <Check className="h-3 w-3 text-emerald-600" />}
                                    {opt}
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="mt-2 flex gap-3 text-xs text-slate-500">
                              {q.correctAnswer && (
                                <span>Answer: <span className="font-semibold text-emerald-600">{q.correctAnswer}</span></span>
                              )}
                              {q.score && <span>Marks: {q.score}</span>}
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <button onClick={() => openEditQuestion(idx)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button onClick={() => deleteQuestion(idx)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                              <Trash2 className="h-4 w-4" />
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

      {/* ── Add / Edit Question dialog ── */}
      <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
        <DialogContent className="max-w-[512px]">
          <DialogHeader>
            <DialogTitle>{editingQuestionIdx !== null ? "Edit" : "Add"} Question</DialogTitle>
            <DialogDescription>
              {selectedAssessment?.name} &mdash; {selectedAssessment?.total ?? "?"} marks max
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>Question Text</Label>
              <Textarea
                placeholder="Enter the question..."
                value={questionForm.text}
                onChange={e => setQuestionForm(p => ({ ...p, text: e.target.value }))}
                className="mt-1"
                rows={3}
              />
            </div>
            <div>
              <Label>Options (one per line)</Label>
              <Textarea
                placeholder={"Option A\nOption B\nOption C\nOption D"}
                value={questionForm.options}
                onChange={e => setQuestionForm(p => ({ ...p, options: e.target.value }))}
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
                  onChange={e => setQuestionForm(p => ({ ...p, correctAnswer: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Marks</Label>
                <Input
                  type="number"
                  placeholder="1"
                  value={questionForm.score}
                  onChange={e => setQuestionForm(p => ({ ...p, score: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuestionDialog(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={saveQuestionForm} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingQuestionIdx !== null ? "Update" : "Add"} Question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
