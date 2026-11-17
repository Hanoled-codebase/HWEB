"use client";

import { useState, useEffect, useMemo } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { apiFetch, HSMS_BASE } from "@/lib/api";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2, Plus, Pencil, Trash2, ClipboardList, Calculator, Eye, FileDown, FileSpreadsheet, CheckCircle2, AlertCircle, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Metric = { name: string; label: string; weight: number; stage?: "MID_TERM" | "END_OF_TERM" };
type GradeLevel = { grade: string; min: number; max: number };
type Template = {
  id: string;
  name: string;
  description: string | null;
  classLevelId: string | null;
  classLevel?: { id: string; name: string; level?: string | null } | null;
  metrics: Metric[];
  gradeScale: GradeLevel[];
  isDefault: boolean;
  isApproved: boolean;
  approvedAt?: string | null;
  approvedById?: string | null;
  /** Share (0-100) of the final result the mid-term stage contributes. */
  midTermTotal: number;
};

type TermResult = {
  id: string;
  term: string;
  academicYear: string;
  resultType: string;
  totalScore: number;
  grade: string;
  position: number | null;
  publishedAt: string | null;
  student: { firstName: string; lastName: string };
  classLevel: { name: string };
  template: { name: string; isApproved?: boolean };
  metrics: Metric[];
};

type ClassLevel = { id: string; name: string; level?: string | null };

export default function ResultTemplatesPage() {
  const { currentOrg, currentMember } = useOrganization();
  const isAdmin = currentMember?.role === "admin" || currentMember?.role === "owner";
  const [templates, setTemplates] = useState<Template[]>([]);
  const [results, setResults] = useState<TermResult[]>([]);
  const [classLevels, setClassLevels] = useState<ClassLevel[]>([]);
  const [loadingT, setLoadingT] = useState(true);
  const [loadingR, setLoadingR] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("templates");
  
  // Template filters
  const [templateClassFilter, setTemplateClassFilter] = useState("all");
  
  // Results tab filters
  const [filterClass, setFilterClass] = useState("");
  // Free-form to match how terms are stored (e.g. "First Term"), since HCORE
  // period names — not "Term 1"-style labels — resolve the compute window.
  const [filterTerm, setFilterTerm] = useState("First Term");
  const [filterYear, setFilterYear] = useState("2026/2027");
  // Which stored results the tab shows and computes: mid-term rows are the raw
  // mid-term percentage; end-of-term rows blend the mid-term share in.
  const [resultType, setResultType] = useState<"MID_TERM" | "END_OF_TERM">("END_OF_TERM");
  const [computing, setComputing] = useState(false);
  const [weightTerm1, setWeightTerm1] = useState("20");
  const [weightTerm2, setWeightTerm2] = useState("30");
  const [weightTerm3, setWeightTerm3] = useState("50");

  // Form state
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formClassLevelId, setFormClassLevelId] = useState("");
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formIsApproved, setFormIsApproved] = useState(true);
  const [formMetrics, setFormMetrics] = useState<Metric[]>([]);
  const [formGrades, setFormGrades] = useState<GradeLevel[]>([]);
  // The share of the final result the mid-term stage contributes (0 = none).
  const [formMidTermTotal, setFormMidTermTotal] = useState("0");

  useEffect(() => {
    if (!currentOrg) return;
    fetchClassLevels();
    fetchTemplates();
  }, [currentOrg]);

  async function fetchClassLevels() {
    if (!currentOrg) return;
    try {
      const d = await apiFetch<ClassLevel[]>(`/classes/${currentOrg.slug}`);
      setClassLevels(Array.isArray(d) ? d : []);
    } catch {
      toast.error("Failed to load classes");
    }
  }

  async function fetchTemplates() {
    if (!currentOrg) return;
    try {
      const res = await apiFetch(`/result-templates/templates/${currentOrg.slug}`);
      const d = (res as any).data ?? res;
      setTemplates(Array.isArray(res) ? res : d ?? []);
    } catch {
      toast.error("Failed to load templates");
    } finally {
      setLoadingT(false);
    }
  }

  async function fetchResults() {
    if (!currentOrg) return;
    setLoadingR(true);
    try {
      const params = new URLSearchParams({
        term: filterTerm,
        academicYear: filterYear,
        resultType,
      });
      if (filterClass) params.set("classLevelId", filterClass);
      const res = await apiFetch(`/result-templates/results/${currentOrg.slug}?${params}`);
      const d = (res as any).data ?? res;
      setResults(Array.isArray(res) ? res : d ?? []);
    } catch {
      toast.error("Failed to load results");
    } finally {
      setLoadingR(false);
    }
  }

  // Mid-term share of the final result, kept in sync with the form input.
  const formMidTermTotalNum = Math.min(Math.max(Number(formMidTermTotal) || 0, 0), 100);
  // Per-stage weight sums. Metrics without a stage count as end-of-term
  // (legacy templates), matching the backend's normalization.
  const midTermSum = formMetrics
    .filter((m) => (m.stage ?? "END_OF_TERM") === "MID_TERM")
    .reduce((sum, m) => sum + (Number(m.weight) || 0), 0);
  const endTermSum = formMetrics
    .filter((m) => (m.stage ?? "END_OF_TERM") === "END_OF_TERM")
    .reduce((sum, m) => sum + (Number(m.weight) || 0), 0);

  function resetForm() {
    setFormName("");
    setFormDesc("");
    setFormClassLevelId("");
    setFormIsDefault(false);
    setFormIsApproved(true);
    setFormMetrics([
      { name: "Continuous Assessment 1", label: "CA 1", weight: 10 },
      { name: "Continuous Assessment 2", label: "CA 2", weight: 10 },
      { name: "Continuous Assessment 3", label: "CA 3", weight: 20 },
      { name: "Terminal Examination", label: "Exam", weight: 60 },
    ]);
    setFormGrades([
      { grade: "A1", min: 75, max: 100 },
      { grade: "B2", min: 70, max: 74 },
      { grade: "B3", min: 65, max: 69 },
      { grade: "C4", min: 60, max: 64 },
      { grade: "C5", min: 55, max: 59 },
      { grade: "C6", min: 50, max: 54 },
      { grade: "D7", min: 45, max: 49 },
      { grade: "E8", min: 40, max: 44 },
      { grade: "F9", min: 0, max: 39 },
    ]);
    setFormMidTermTotal("0");
  }

  function openEdit(t: Template) {
    if (!isAdmin) {
      toast.error("You are not authorized. Only administrators can edit templates.");
      return;
    }
    setEditItem(t);
    setFormName(t.name);
    setFormDesc(t.description || "");
    setFormClassLevelId(t.classLevelId || "");
    setFormIsDefault(t.isDefault);
    setFormIsApproved(t.isApproved);
    // Legacy rows have no stage field; they all read as end-of-term.
    setFormMetrics(t.metrics.map((m) => ({ ...m, stage: m.stage === "MID_TERM" ? "MID_TERM" : "END_OF_TERM" })));
    setFormGrades(t.gradeScale);
    setFormMidTermTotal(String(t.midTermTotal ?? 0));
    setDialogOpen(true);
  }

  async function saveTemplate() {
    if (!currentOrg || !formName) return;
    if (!isAdmin) {
      toast.error("You are not authorized. Only administrators can save templates.");
      return;
    }

    // Mirror the backend's validation: each stage's weights must total 100,
    // and the mid-term share needs matching mid-term components (and vice
    // versa). Metrics without a stage count as end-of-term.
    const midTermTotal = Math.min(Math.max(Number(formMidTermTotal) || 0, 0), 100);
    const hasMidTermMetric = formMetrics.some((m) => m.stage === "MID_TERM");

    if (midTermSum > 0 && Math.abs(midTermSum - 100) > 0.01) {
      toast.error(`Mid-term component weights must total 100% (currently ${midTermSum}%)`);
      return;
    }
    if (endTermSum > 0 && Math.abs(endTermSum - 100) > 0.01) {
      toast.error(`End-of-term component weights must total 100% (currently ${endTermSum}%)`);
      return;
    }
    if (midTermTotal > 0 && !hasMidTermMetric) {
      toast.error("A mid-term share above 0% needs at least one mid-term component");
      return;
    }
    if (midTermTotal === 0 && hasMidTermMetric) {
      toast.error("Mid-term components need a mid-term share above 0% of the final result");
      return;
    }

    setSaving(true);
    try {
      const body = {
        name: formName,
        description: formDesc,
        classLevelId: formClassLevelId ? formClassLevelId : null,
        isDefault: formIsDefault,
        isApproved: formIsApproved,
        midTermTotal: formMidTermTotalNum,
        metrics: formMetrics.map((m) => ({
          name: m.name,
          label: m.label,
          weight: Number(m.weight) || 0,
          stage: m.stage === "MID_TERM" ? "MID_TERM" : "END_OF_TERM",
        })),
        gradeScale: formGrades,
      };

      if (editItem) {
        await apiFetch(`/result-templates/templates/${currentOrg.slug}/${editItem.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        toast.success("Result template updated successfully");
      } else {
        await apiFetch(`/result-templates/templates/${currentOrg.slug}`, {
          method: "POST",
          body: JSON.stringify(body),
        });
        toast.success("Result template created successfully");
      }
      setDialogOpen(false);
      setEditItem(null);
      fetchTemplates();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save template");
    } finally {
      setSaving(false);
    }
  }

  async function toggleApproval(t: Template) {
    if (!currentOrg) return;
    if (!isAdmin) {
      toast.error("Only administrators can approve or revoke result templates.");
      return;
    }
    try {
      const action = t.isApproved ? "disapprove" : "approve";
      await apiFetch(`/result-templates/templates/${currentOrg.slug}/${t.id}/${action}`, {
        method: "PATCH",
      });
      toast.success(
        t.isApproved
          ? `Approval revoked for "${t.name}"`
          : `"${t.name}" is now the approved result template for ${t.classLevel?.name || "all classes"}!`
      );
      fetchTemplates();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update approval status");
    }
  }

  async function deleteTemplate(id: string) {
    if (!currentOrg) return;
    if (!isAdmin) {
      toast.error("You are not authorized. Only administrators can delete templates.");
      return;
    }
    try {
      await apiFetch(`/result-templates/templates/${currentOrg.slug}/${id}`, { method: "DELETE" });
      toast.success("Template deleted");
      fetchTemplates();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete template");
    }
  }

  async function bulkCompute() {
    if (!currentOrg || !filterClass) {
      toast.error("Please select a class first");
      return;
    }
    if (!isAdmin) {
      toast.error("You are not authorized. Only administrators can compute results.");
      return;
    }

    // Check if class has an approved template
    const approvedTpl =
      templates.find((t) => t.classLevelId === filterClass && t.isApproved) ||
      templates.find((t) => !t.classLevelId && t.isDefault && t.isApproved) ||
      templates.find((t) => t.isApproved);

    if (!approvedTpl) {
      toast.error(
        "No approved result template found for this class. Please approve a result template first so official results can be calculated."
      );
      return;
    }

    setComputing(true);
    try {
      await apiFetch(`/result-templates/bulk-compute/${currentOrg.slug}`, {
        method: "POST",
        body: JSON.stringify({
          classLevelId: filterClass,
          term: filterTerm,
          academicYear: filterYear,
          templateId: approvedTpl.id,
          resultType,
        }),
      });
      toast.success(`Results computed using approved template "${approvedTpl.name}"!`);
      fetchResults();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to compute results");
    } finally {
      setComputing(false);
    }
  }

  async function computeSessionCumulative() {
    if (!currentOrg || !filterClass) {
      toast.error("Select a class to calculate session cumulative scores");
      return;
    }
    setComputing(true);
    try {
      const res = await apiFetch<any>(`/result-templates/session-cumulative/${currentOrg.slug}`, {
        method: "POST",
        body: JSON.stringify({
          classLevelId: filterClass,
          academicYear: filterYear,
          weights: {
            term1: Number(weightTerm1),
            term2: Number(weightTerm2),
            term3: Number(weightTerm3),
          },
        }),
      });
      const data = res?.data || res;
      toast.success(
        `Session Cumulative computed for ${data?.computed || 0} students! (${weightTerm1}% T1 + ${weightTerm2}% T2 + ${weightTerm3}% T3)`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to compute session cumulative");
    } finally {
      setComputing(false);
    }
  }

  function addMetric() {
    setFormMetrics([...formMetrics, { name: "", label: "", weight: 0, stage: "END_OF_TERM" as const }]);
  }

  function updateMetric(i: number, field: string, value: any) {
    setFormMetrics((prev) =>
      prev.map((m, idx) => (idx === i ? { ...m, [field]: value } : m))
    );
  }

  function removeMetric(i: number) {
    setFormMetrics((prev) => prev.filter((_, idx) => idx !== i));
  }

  function addGrade() {
    setFormGrades([...formGrades, { grade: "", min: 0, max: 0 }]);
  }

  function updateGrade(i: number, field: string, value: any) {
    setFormGrades((prev) =>
      prev.map((g, idx) =>
        idx === i
          ? { ...g, [field]: field === "min" || field === "max" ? Number(value) : value }
          : g
      )
    );
  }

  function removeGrade(i: number) {
    setFormGrades((prev) => prev.filter((_, idx) => idx !== i));
  }

  // Filter templates based on selected class
  const filteredTemplates = useMemo(() => {
    if (templateClassFilter === "all") return templates;
    if (templateClassFilter === "general") return templates.filter((t) => !t.classLevelId);
    return templates.filter((t) => t.classLevelId === templateClassFilter);
  }, [templates, templateClassFilter]);

  // Selected class's approved template for the Results tab
  const activeClassApprovedTemplate = useMemo(() => {
    if (!filterClass) return null;
    return (
      templates.find((t) => t.classLevelId === filterClass && t.isApproved) ||
      templates.find((t) => !t.classLevelId && t.isDefault && t.isApproved) ||
      null
    );
  }, [filterClass, templates]);

  if (!currentOrg) return null;

  return (
    <div className="min-h-full bg-slate-50/60 pb-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:gap-6 md:px-6 md:py-8 lg:px-8">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Class Result Templates & Grading
            </h1>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Manage class-specific grading templates, set weighted components, and approve official templates for report card generation.
            </p>
          </div>

          <Dialog
            open={dialogOpen}
            onOpenChange={(o) => {
              if (o && !isAdmin) {
                toast.error("You are not authorized. Only administrators can create templates.");
                return;
              }
              setDialogOpen(o);
              if (!o) {
                setEditItem(null);
                resetForm();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button
                onClick={resetForm}
                className="h-11 w-full shrink-0 bg-[#1447E6] font-semibold hover:bg-[#1447E6]/90 text-white md:h-9 md:w-auto md:px-4 cursor-pointer"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Class Template
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editItem ? "Edit" : "New"} Class Result Template</DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Configure assessment metrics and grading scales for a specific class or across all classes.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Template Name</label>
                    <Input
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Senior Secondary WAEC Scale"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700">Applicable Class</label>
                    <Select
                      value={formClassLevelId || "all"}
                      onValueChange={(val) => setFormClassLevelId(val === "all" ? "" : (val as string))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="All Classes (Default)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Classes (General Fallback)</SelectItem>
                        {classLevels.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            Class: {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Description</label>
                  <Textarea
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="e.g. Approved weighting for SSS 1 Science terminal examinations."
                    className="min-h-[50px] mt-1 text-xs"
                  />
                </div>

                {/* Mid-term share + status toggles */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <label className="text-xs font-bold text-slate-700">
                    Mid-term share of final result{" "}
                    <span className="font-normal text-slate-500">(0% = single end-of-term result)</span>
                  </label>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={formMidTermTotal}
                      onChange={(e) => setFormMidTermTotal(e.target.value)}
                      className="w-24 h-8 bg-white text-center font-bold text-sm tabular-nums"
                    />
                    <span className="text-xs font-semibold text-slate-500">%</span>
                    <p className="text-[11px] leading-4 text-slate-500 min-w-[160px] flex-1">
                      The mid-term result itself is the raw mid-term percentage; the end-of-term result blends it
                      in at this share, with end-of-term components filling the rest.
                    </p>
                  </div>
                </div>

                {/* Status Toggles */}
                <div className="flex flex-wrap items-center gap-6 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                    <input
                      type="checkbox"
                      checked={formIsApproved}
                      onChange={(e) => setFormIsApproved(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Approve this template for official class results</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                    <input
                      type="checkbox"
                      checked={formIsDefault}
                      onChange={(e) => setFormIsDefault(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Set as school default template</span>
                  </label>
                </div>

                {/* Metrics Breakdown */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold text-slate-800">Assessment Components &amp; Weights</label>
                      <p className="text-[11px] text-slate-500">
                        {midTermSum > 0 ? (
                          <>
                            Mid-term: {midTermSum}% &middot; End-of-term: {endTermSum}% — each stage must total 100%
                          </>
                        ) : (
                          <>Weights must total 100% (Current: {endTermSum}%)</>
                        )}
                      </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addMetric} className="h-7 text-xs">
                      + Add Component
                    </Button>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {formMetrics.map((m, i) => (
                      <div key={i} className="flex flex-wrap items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                        <Input
                          placeholder="Internal Name (e.g. CA 1)"
                          value={m.name}
                          onChange={(e) => updateMetric(i, "name", e.target.value)}
                          className="flex-1 min-w-[140px] text-xs h-8 bg-white"
                        />
                        <Input
                          placeholder="Display Label"
                          value={m.label}
                          onChange={(e) => updateMetric(i, "label", e.target.value)}
                          className="w-full sm:w-[110px] text-xs h-8 bg-white"
                        />
                        <Select
                          value={(m.stage ?? "END_OF_TERM") as string}
                          onValueChange={(v) => updateMetric(i, "stage", v)}
                        >
                          <SelectTrigger className="w-[110px] h-8 bg-white text-xs shrink-0" aria-label="Stage">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="END_OF_TERM">End-of-term</SelectItem>
                            <SelectItem value="MID_TERM">Mid-term</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-1 shrink-0">
                          <Input
                            type="number"
                            placeholder="Weight"
                            value={m.weight}
                            onChange={(e) => updateMetric(i, "weight", Number(e.target.value))}
                            className="w-16 text-xs h-8 bg-white text-center font-bold tabular-nums"
                          />
                          <span className="text-xs font-semibold text-slate-500">%</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeMetric(i)}
                          className="text-slate-400 hover:text-red-600 px-1.5 text-xs font-bold shrink-0"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Grade Scale */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold text-slate-800">Grading Scale (Nigerian WAEC / Secondary)</label>
                      <p className="text-[11px] text-slate-500">Assign grade thresholds from 0 to 100%.</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addGrade} className="h-7 text-xs">
                      + Add Grade
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-44 overflow-y-auto pr-1">
                    {formGrades.map((g, i) => (
                      <div key={i} className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                        <Input
                          placeholder="Grade"
                          value={g.grade}
                          onChange={(e) => updateGrade(i, "grade", e.target.value)}
                          className="w-12 text-xs h-7 bg-white text-center font-bold"
                        />
                        <Input
                          type="number"
                          placeholder="Min"
                          value={g.min}
                          onChange={(e) => updateGrade(i, "min", e.target.value)}
                          className="w-12 text-xs h-7 bg-white text-center"
                        />
                        <span className="text-[10px] text-slate-400">-</span>
                        <Input
                          type="number"
                          placeholder="Max"
                          value={g.max}
                          onChange={(e) => updateGrade(i, "max", e.target.value)}
                          className="w-12 text-xs h-7 bg-white text-center"
                        />
                        <button
                          type="button"
                          onClick={() => removeGrade(i)}
                          className="text-slate-400 hover:text-red-600 px-1 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    onClick={saveTemplate}
                    disabled={saving}
                    className="w-full bg-[#1447E6] hover:bg-[#1447E6]/90 text-white font-bold h-10"
                  >
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {editItem ? "Update Class Template" : "Save & Activate Class Template"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tabs: Class Templates & Computed Results */}
        <Tabs value={tab} onValueChange={(v) => setTab(v)}>
          <TabsList className="bg-slate-200/60 p-1">
            <TabsTrigger value="templates" className="font-semibold text-xs sm:text-sm">
              <ClipboardList className="mr-2 h-4 w-4" />
              Class Result Templates ({templates.length})
            </TabsTrigger>
            <TabsTrigger value="results" className="font-semibold text-xs sm:text-sm">
              <Calculator className="mr-2 h-4 w-4" />
              Results Overview & Computation
            </TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Class Result Templates ── */}
          <TabsContent value="templates" className="mt-4 space-y-4">
            
            {/* Class Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Filter by Class:</span>
                <Select
                  value={templateClassFilter}
                  onValueChange={(v) => setTemplateClassFilter(v as string)}
                >
                  <SelectTrigger className="w-[180px] h-8 text-xs font-semibold">
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Templates ({templates.length})</SelectItem>
                    <SelectItem value="general">School General Default</SelectItem>
                    {classLevels.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="text-xs text-slate-500 font-medium">
                {filteredTemplates.filter((t) => t.isApproved).length} approved templates active
              </div>
            </div>

            {loadingT ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-44 w-full rounded-2xl" />
                ))}
              </div>
            ) : filteredTemplates.length === 0 ? (
              <Card className="border-dashed border-slate-300">
                <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                  <ClipboardList className="h-10 w-10 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-700">No result templates found for this selection.</p>
                  <p className="text-xs text-slate-400">
                    Create a new template to configure the grading rules and weighted scores for your classes.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {filteredTemplates.map((t) => (
                  <Card
                    key={t.id}
                    className={cn(
                      "rounded-2xl border transition-all shadow-xs",
                      t.isApproved ? "border-emerald-200 bg-white" : "border-slate-200 bg-slate-50/50"
                    )}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <CardTitle className="text-base font-bold text-slate-900">{t.name}</CardTitle>
                            {t.isApproved ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                                <CheckCircle2 className="mr-1 h-3 w-3 text-emerald-600" />
                                Approved
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">
                                <AlertCircle className="mr-1 h-3 w-3 text-amber-600" />
                                Pending Approval
                              </Badge>
                            )}
                          </div>

                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                            <Badge variant="secondary" className="font-semibold text-slate-700 text-[11px]">
                              {t.classLevel?.name ? `Class: ${t.classLevel.name}` : "School Default (All Classes)"}
                            </Badge>
                            {t.isDefault && (
                              <Badge variant="outline" className="text-[10px] text-slate-500">
                                Default Fallback
                              </Badge>
                            )}
                            {(t.midTermTotal ?? 0) > 0 && (
                              <Badge variant="outline" className="text-[10px] text-sky-700 border-sky-200 bg-sky-50">
                                Mid-term {t.midTermTotal}%
                              </Badge>
                            )}
                          </div>
                        </div>

                        {isAdmin && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEdit(t)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors"
                              title="Edit Template"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteTemplate(t.id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 transition-colors"
                              title="Delete Template"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      {t.description && (
                        <CardDescription className="text-xs text-slate-500 mt-1">
                          {t.description}
                        </CardDescription>
                      )}
                    </CardHeader>

                    <CardContent className="space-y-3 pt-0">
                      <div className="rounded-xl bg-slate-50 border border-slate-100 p-2.5 text-xs text-slate-600 space-y-1">
                        <p className="font-semibold text-slate-800">Components & Weights:</p>
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {t.metrics.map((m, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] font-medium"
                            >
                              {m.label}: <strong className="ml-1 text-slate-900">{m.weight}%</strong>
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-slate-400">
                          {t.gradeScale.length} Grade Tiers ({t.gradeScale[0]?.grade || "A"} to{" "}
                          {t.gradeScale[t.gradeScale.length - 1]?.grade || "F"})
                        </span>

                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleApproval(t)}
                            className={cn(
                              "h-7 text-xs font-semibold cursor-pointer",
                              t.isApproved
                                ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                                : "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                            )}
                          >
                            <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                            {t.isApproved ? "Revoke Approval" : "Approve for Class"}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Tab 2: Results Overview & Computation ── */}
          <TabsContent value="results" className="mt-4 space-y-4">
            
            {/* Active Template Status Bar for Selected Class */}
            {filterClass && (
              <div
                className={cn(
                  "p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 shadow-2xs",
                  activeClassApprovedTemplate
                    ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                    : "bg-amber-50/70 border-amber-200 text-amber-950"
                )}
              >
                <div className="flex items-center gap-2.5">
                  {activeClassApprovedTemplate ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold">
                      {activeClassApprovedTemplate
                        ? `Approved Template: "${activeClassApprovedTemplate.name}"`
                        : "No Approved Template Found for this Class"}
                    </span>
                    <p className="text-[11px] opacity-80 font-normal">
                      {activeClassApprovedTemplate
                        ? `Weighted: ${activeClassApprovedTemplate.metrics.map((m) => `${m.label} (${m.weight}%)`).join(" + ")}${(activeClassApprovedTemplate.midTermTotal ?? 0) > 0 ? ` — mid-term share ${activeClassApprovedTemplate.midTermTotal}%` : ""}`
                        : "Results can only reflect what has been approved from the result template for this class."}
                    </p>
                  </div>
                </div>

                {!activeClassApprovedTemplate && isAdmin && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setTab("templates");
                      setTemplateClassFilter(filterClass);
                    }}
                    className="h-7 text-xs border-amber-300 bg-amber-100 text-amber-900 font-bold hover:bg-amber-200 cursor-pointer"
                  >
                    Configure Template &rarr;
                  </Button>
                )}
              </div>
            )}

            {/* Dynamic Term Weighting Configuration Bar */}
            <div className="flex flex-wrap items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-200 text-xs font-semibold shadow-2xs">
              <span className="text-slate-900 font-bold">Class Session Formula:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-600">T1:</span>
                <Input
                  type="number"
                  value={weightTerm1}
                  onChange={(e) => setWeightTerm1(e.target.value)}
                  className="w-16 h-8 text-sm bg-white text-center font-bold px-2 rounded-lg border-slate-300 shadow-2xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-slate-500">%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-600">T2:</span>
                <Input
                  type="number"
                  value={weightTerm2}
                  onChange={(e) => setWeightTerm2(e.target.value)}
                  className="w-16 h-8 text-sm bg-white text-center font-bold px-2 rounded-lg border-slate-300 shadow-2xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-slate-500">%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-600">T3:</span>
                <Input
                  type="number"
                  value={weightTerm3}
                  onChange={(e) => setWeightTerm3(e.target.value)}
                  className="w-16 h-8 text-sm bg-white text-center font-bold px-2 rounded-lg border-slate-300 shadow-2xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-slate-500">%</span>
              </div>
              <Button
                size="sm"
                onClick={computeSessionCumulative}
                disabled={computing || !filterClass}
                className="bg-[#1447E6] hover:bg-[#1447E6]/90 text-white h-8 px-3.5 text-xs ml-auto rounded-lg font-bold shadow-sm cursor-pointer"
              >
                {computing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Calculator className="mr-1.5 h-3.5 w-3.5" />}
                Compute Session Cumulative
              </Button>
            </div>

            {/* Results Filter Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <Select value={filterClass} onValueChange={(v: unknown) => setFilterClass(v as string)}>
                <SelectTrigger className="w-[150px] h-9 text-xs sm:w-[180px] sm:text-sm font-semibold">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Select class</SelectItem>
                  {classLevels.map((cl) => (
                    <SelectItem key={cl.id} value={cl.id}>
                      {cl.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                value={filterTerm}
                onChange={(e) => setFilterTerm(e.target.value)}
                className="w-[110px] h-9 text-xs sm:w-[130px] font-semibold"
                placeholder="Term"
                aria-label="Term"
              />

              <Input
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="w-[100px] h-9 text-xs sm:w-[120px] font-semibold"
                placeholder="Year"
              />

              <Select value={resultType} onValueChange={(v: unknown) => setResultType(v as "MID_TERM" | "END_OF_TERM")}>
                <SelectTrigger
                  className="w-[120px] h-9 text-xs sm:w-[140px] sm:text-sm font-semibold"
                  aria-label="Result type"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="END_OF_TERM">End-of-term</SelectItem>
                  <SelectItem value="MID_TERM">Mid-term</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchResults}
                className="h-9 px-3 text-xs sm:text-sm font-semibold cursor-pointer"
              >
                <Eye className="mr-1.5 h-3.5 w-3.5" />
                View
              </Button>

              <Button
                size="sm"
                onClick={bulkCompute}
                disabled={computing || !filterClass}
                className="bg-[#1447E6] hover:bg-[#1447E6]/90 text-white h-9 px-3 text-xs sm:text-sm font-bold cursor-pointer"
              >
                {computing ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Calculator className="mr-1.5 h-3.5 w-3.5" />
                )}
                Compute Class Results
              </Button>

              {filterClass && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 text-xs sm:text-sm font-semibold"
                    onClick={() => {
                      const url = `${HSMS_BASE}/export/${currentOrg.slug}/broadsheet/${filterClass}?term=${encodeURIComponent(
                        filterTerm
                      )}&academicYear=${encodeURIComponent(filterYear)}`;
                      window.open(url, "_blank");
                    }}
                  >
                    <FileDown className="mr-1.5 h-3.5 w-3.5" />
                    PDF Broadsheet
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 text-xs sm:text-sm font-semibold"
                    onClick={() => {
                      const url = `${HSMS_BASE}/export/${currentOrg.slug}/broadsheet/${filterClass}?term=${encodeURIComponent(
                        filterTerm
                      )}&academicYear=${encodeURIComponent(filterYear)}&format=xlsx`;
                      window.open(url, "_blank");
                    }}
                  >
                    <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                    Excel
                  </Button>
                </>
              )}
            </div>

            {/* Results Table */}
            {loadingR ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            ) : results.length === 0 ? (
              <Card className="border-dashed border-slate-300">
                <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                  <Calculator className="h-10 w-10 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-700">No computed results found for this class.</p>
                  <p className="text-xs text-slate-400">
                    Select a class and click &ldquo;Compute Class Results&rdquo; to evaluate scores using the approved template.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                {results.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-2 px-4 py-3 text-xs sm:gap-4 sm:text-sm hover:bg-slate-50/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 flex flex-wrap items-center gap-2">
                        <span>{r.student.firstName} {r.student.lastName}</span>
                        {r.resultType === "MID_TERM" && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 font-semibold text-sky-700 border-sky-200 bg-sky-50">
                            Mid-term
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-slate-500">
                        {r.classLevel.name} &middot; {r.term} &middot; Template: {r.template.name}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-extrabold text-base sm:text-lg tabular-nums text-slate-900">
                        {r.totalScore}
                      </p>
                    </div>

                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-bold shrink-0",
                        r.grade.startsWith("A")
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : r.grade.startsWith("B")
                          ? "border-blue-200 bg-blue-50 text-blue-700"
                          : r.grade.startsWith("C")
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : r.grade.startsWith("D")
                          ? "border-orange-200 bg-orange-50 text-orange-700"
                          : "border-rose-200 bg-rose-50 text-rose-700"
                      )}
                    >
                      {r.grade}
                    </Badge>

                    <div className="text-xs text-slate-500 shrink-0 w-8 text-center font-bold">
                      #{r.position || "—"}
                    </div>

                    {r.publishedAt && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0 font-semibold">
                        Published
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
