"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
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
  Loader2, Plus, Pencil, Trash2, Copy, Lock, ClipboardList, Calculator, Eye, FileDown, FileSpreadsheet, CheckCircle2, AlertCircle, ShieldCheck, Settings2, Upload, Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ASSESSMENT_KINDS,
  metricWarnings,
  validateTemplateForm,
} from "@/lib/result-template-validation";
import {
  ELYON_GRADE_SCALE,
  detectClassSection,
  resultTemplatePreset,
  type ResultStage,
  type SchoolSection,
} from "@/lib/result-presets";

type Metric = {
  id?: string;
  name: string;
  label: string;
  weight: number;
  isSingleInstance?: boolean;
  stage?: "MID_TERM" | "END_OF_TERM";
  /** Optional explicit sheet binding: HCORE assessment kind (+ exact title). */
  kind?: string;
  assessmentTitle?: string;
};
type GradeLevel = { grade: string; min: number; max: number };
type AssessmentCategoryItem = {
  id: string;
  name: string;
  label?: string | null;
  maxMarks: number;
  isSingleInstance?: boolean;
  position?: number;
};
type Template = {
  id: string;
  name: string;
  description: string | null;
  classLevelId: string | null;
  classLevel?: { id: string; name: string; level?: string | null } | null;
  metrics: Metric[];
  assessmentCategories?: AssessmentCategoryItem[];
  _count?: { spreadsheets?: number };
  gradeScale: GradeLevel[];
  isDefault: boolean;
  isApproved: boolean;
  approvedAt?: string | null;
  approvedById?: string | null;
  /** Share (0-100) of the final result the mid-term stage contributes. */
  midTermTotal: number;
  schoolSection: "ALL" | SchoolSection;
  resultType: "BOTH" | ResultStage;
  termType?: "MID_TERM" | "END_TERM" | "CUSTOM";
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
  student: { id: string; firstName: string; lastName: string };
  classLevel: { name: string };
  template: { name: string; isApproved?: boolean };
  metrics: Metric[];
};

/** One row of the bulk-compute response: per-component computed scores. */
type ComputedRow = {
  studentId?: string;
  totalScore?: number;
  metrics?: Metric[];
};

type ClassLevel = { id: string; name: string; level?: string | null };

function findApprovedTemplateForClass(
  templates: Template[],
  classLevel: ClassLevel | undefined,
  resultType: "MID_TERM" | "END_OF_TERM",
): Template | null {
  if (!classLevel) return null;
  const eligible = templates.filter(
    (t) => t.isApproved && ["BOTH", resultType].includes(t.resultType || "BOTH"),
  );
  const exactDefault = eligible.find(
    (t) => t.classLevelId === classLevel.id && t.isDefault,
  );
  if (exactDefault) return exactDefault;
  const exact = eligible.find((t) => t.classLevelId === classLevel.id);
  if (exact) return exact;

  const section = detectClassSection(`${classLevel.name} ${classLevel.level || ""}`);
  const general = eligible.filter((t) => !t.classLevelId);
  if (section !== "ALL") {
    const sectionDefault = general.find((t) => t.isDefault && t.schoolSection === section);
    if (sectionDefault) return sectionDefault;
  }
  const allDefault = general.find(
    (t) => t.isDefault && (!t.schoolSection || t.schoolSection === "ALL"),
  );
  if (allDefault) return allDefault;
  if (section !== "ALL") {
    const sectionAny = general.find((t) => t.schoolSection === section);
    if (sectionAny) return sectionAny;
  }
  return general.find((t) => !t.schoolSection || t.schoolSection === "ALL") || null;
}
type CommentRule = { min: number; max: number; comment: string };
type AffectiveCategory = { id: string; label: string; active: boolean; position: number };
type ResultSettings = {
  ceoSignatureUrl: string | null;
  ceoCommentRules: CommentRule[];
  affectiveCategories: AffectiveCategory[];
  version: number;
};

export default function ResultTemplatesPage() {
  const { currentOrg, currentMember } = useOrganization();
  const isAdmin = currentMember?.role === "admin" || currentMember?.role === "owner";
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadedResults, setLoadedResults] = useState<{ key: string; rows: TermResult[] } | null>(null);
  const [classLevels, setClassLevels] = useState<ClassLevel[]>([]);
  const [loadingT, setLoadingT] = useState(true);
  const [loadingResultsKey, setLoadingResultsKey] = useState<string | null>(null);
  const latestResultsRequest = useRef(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);
  const [cloningId, setCloningId] = useState<string | null>(null);
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
  const resultParams = new URLSearchParams({ term: filterTerm, academicYear: filterYear, resultType });
  if (filterClass) resultParams.set("classLevelId", filterClass);
  const resultsKey = currentOrg ? `/result-templates/results/${currentOrg.slug}?${resultParams}` : null;
  const results = loadedResults?.key === resultsKey ? loadedResults.rows : [];
  const loadingR = resultsKey !== null && loadingResultsKey === resultsKey;
  // Term/year options come from the school's HCORE academic periods.
  const [periodOptions, setPeriodOptions] = useState<{ academicYear: string; term: string }[]>([]);
  const [computing, setComputing] = useState(false);
  const [publishing, setPublishing] = useState(false);
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
  const [formSchoolSection, setFormSchoolSection] = useState<"ALL" | SchoolSection>("ALL");
  const [formResultType, setFormResultType] = useState<"BOTH" | ResultStage>("BOTH");
  const [formTermType, setFormTermType] = useState<"MID_TERM" | "END_TERM" | "CUSTOM">("END_TERM");
  const [resultSettings, setResultSettings] = useState<ResultSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [commentResult, setCommentResult] = useState<TermResult | null>(null);
  const [customComment, setCustomComment] = useState("");
  const [savingComment, setSavingComment] = useState(false);

  useEffect(() => {
    if (!currentOrg) return;
    fetchClassLevels();
    fetchTemplates();
    apiFetch<{ data: ResultSettings }>(`/result-settings/${currentOrg.slug}`)
      .then((response) => setResultSettings(response.data))
      .catch(() => toast.error("Failed to load result settings"));
    // Term options come from HCORE's academic periods — no free-text terms.
    apiFetch<{ success: boolean; data: { academicYear: string; term: string }[] }>(
      `/result-templates/periods/${currentOrg.slug}`,
    )
      .then(({ data: periods }) => {
        if (Array.isArray(periods) && periods.length > 0) {
          setPeriodOptions(periods);
          setFilterYear(periods[0].academicYear);
          setFilterTerm(periods[0].term);
        }
      })
      .catch(() => {
        // Keep the fallback term/year if periods can't be loaded.
      });
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
      const res = await apiFetch<Template[] | { data?: Template[] }>(`/result-templates/templates/${currentOrg.slug}`);
      setTemplates(Array.isArray(res) ? res : res?.data ?? []);
    } catch {
      toast.error("Failed to load templates");
    } finally {
      setLoadingT(false);
    }
  }

  async function fetchResults() {
    if (!resultsKey) return;
    const request = ++latestResultsRequest.current;
    setLoadingResultsKey(resultsKey);
    try {
      const res = await apiFetch<TermResult[] | { data?: TermResult[] }>(resultsKey, { showErrorToast: false });
      if (request === latestResultsRequest.current) {
        setLoadedResults({ key: resultsKey, rows: Array.isArray(res) ? res : res?.data ?? [] });
      }
    } catch {
      if (request === latestResultsRequest.current) toast.error("Failed to load results");
    } finally {
      if (request === latestResultsRequest.current) setLoadingResultsKey(null);
    }
  }

  // Mid-term share of the final result, kept in sync with the form input.
  const formMidTermTotalNum = Math.min(Math.max(Number(formMidTermTotal) || 0, 0), 100);
  // Per-stage weight sums. Metrics without a stage count as end-of-term
  // (legacy templates), matching the backend's normalization.
  const midTermMetrics = formMetrics.filter((m) => (m.stage ?? "END_OF_TERM") === "MID_TERM");
  const endTermMetrics = formMetrics.filter((m) => (m.stage ?? "END_OF_TERM") === "END_OF_TERM");
  const midTermSum = midTermMetrics.reduce((sum, m) => sum + (Number(m.weight) || 0), 0);
  const endTermSum = endTermMetrics.reduce((sum, m) => sum + (Number(m.weight) || 0), 0);
  const hasMidTermMetrics = midTermMetrics.length > 0;
  const hasEndTermMetrics = endTermMetrics.length > 0;
  const isStageTotalsValid =
    formMetrics.length > 0 &&
    (!hasMidTermMetrics || midTermSum === 100) &&
    (!hasEndTermMetrics || endTermSum === 100);

  const isEditTemplateLocked = Boolean(editItem && (editItem._count?.spreadsheets ?? 0) > 0);

  function extractTemplateMetrics(t: Template): Metric[] {
    const rawMetrics = Array.isArray(t.metrics) ? t.metrics : [];
    const categories = Array.isArray(t.assessmentCategories) ? t.assessmentCategories : [];
    if (categories.length === 0) {
      return rawMetrics.map((m) => ({
        ...m,
        stage: m.stage === "MID_TERM" ? "MID_TERM" : "END_OF_TERM",
      }));
    }
    const metricByKey = new Map<string, Metric>();
    for (const metric of rawMetrics) {
      if (metric.id) metricByKey.set(metric.id, metric);
      metricByKey.set(metric.name.trim().toLowerCase(), metric);
    }
    return categories.map((cat) => {
      const matched = metricByKey.get(cat.id) ?? metricByKey.get(cat.name.trim().toLowerCase());
      return {
        id: cat.id,
        name: cat.name,
        label: cat.label || matched?.label || cat.name,
        weight: Number(cat.maxMarks) || 0,
        isSingleInstance: Boolean(cat.isSingleInstance),
        stage: matched?.stage === "MID_TERM" ? "MID_TERM" : "END_OF_TERM",
        ...(matched?.kind ? { kind: matched.kind } : {}),
        ...(matched?.assessmentTitle ? { assessmentTitle: matched.assessmentTitle } : {}),
      };
    });
  }

  function resetForm() {
    setFormName("");
    setFormDesc("");
    setFormClassLevelId("");
    setFormIsDefault(false);
    setFormIsApproved(true);
    setFormMetrics([
      { name: "Classwork", label: "CW", weight: 10, stage: "END_OF_TERM", isSingleInstance: false },
      { name: "Assignments", label: "ASGN", weight: 10, stage: "END_OF_TERM", kind: "ASSIGNMENT", isSingleInstance: false },
      { name: "Projects", label: "PRJ", weight: 10, stage: "END_OF_TERM", kind: "PROJECT", isSingleInstance: false },
      { name: "Examination", label: "Exam", weight: 70, stage: "END_OF_TERM", kind: "EXAM", isSingleInstance: true },
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
    setFormSchoolSection("ALL");
    setFormResultType("BOTH");
    setFormTermType("END_TERM");
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
    setFormMetrics(extractTemplateMetrics(t));
    setFormGrades(t.gradeScale);
    setFormMidTermTotal(String(t.midTermTotal ?? 0));
    setFormSchoolSection(t.schoolSection || "ALL");
    setFormResultType(t.resultType || "BOTH");
    setFormTermType(t.termType || (t.resultType === "MID_TERM" ? "MID_TERM" : "END_TERM"));
    setDialogOpen(true);
  }

  async function cloneTemplate(t: Template) {
    if (!currentOrg) return;
    if (!isAdmin) {
      toast.error("Only administrators can clone result templates.");
      return;
    }
    setCloningId(t.id);
    try {
      const response = await apiFetch<{ data?: Template } & Template>(
        `/result-templates/templates/${currentOrg.slug}/${t.id}/clone`,
        { method: "POST" },
      );
      const cloned = response?.data ?? response;
      toast.success(`Cloned "${t.name}" as draft "${cloned?.name || `${t.name} (Copy)`}"`);
      await fetchTemplates();
      if (cloned?.id) {
        openEdit(cloned);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to clone template");
    } finally {
      setCloningId(null);
    }
  }

  async function saveTemplate() {
    if (!currentOrg || !formName) return;
    if (!isAdmin) {
      toast.error("You are not authorized. Only administrators can save templates.");
      return;
    }

    // Mirror the backend's validation (shared lib, unit-tested): each stage's
    // weights must total 100, the mid-term share needs matching mid-term
    // components (and vice versa), and kinds/names must be well-formed.
    const validationError = validateTemplateForm({
      metrics: formMetrics,
      gradeScale: formGrades,
      midTermTotal: formMidTermTotal,
    });
    if (validationError) {
      toast.error(validationError);
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
        schoolSection: formSchoolSection,
        resultType: formTermType === "MID_TERM" ? "MID_TERM" : formResultType,
        termType: formTermType,
        ...(!isEditTemplateLocked
          ? {
              metrics: formMetrics.map((m) => ({
                id: m.id,
                name: m.name,
                label: m.label,
                maxMarks: Number(m.weight) || 0,
                isSingleInstance: Boolean(m.isSingleInstance),
                stage: m.stage === "MID_TERM" ? "MID_TERM" : "END_OF_TERM",
                ...(m.kind ? { kind: m.kind } : {}),
                ...(m.assessmentTitle ? { assessmentTitle: m.assessmentTitle } : {}),
              })),
            }
          : {}),
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

  async function handlePublish(mode: "publish" | "unpublish") {
    if (!currentOrg || !filterClass) {
      toast.error("Select a class first");
      return;
    }
    if (!isAdmin) {
      toast.error("Only administrators can publish results");
      return;
    }
    setPublishing(true);
    try {
      await apiFetch(`/result-templates/${mode}/${currentOrg.slug}`, {
        method: "POST",
        body: JSON.stringify({
          classLevelId: filterClass,
          term: filterTerm,
          academicYear: filterYear,
          resultType,
        }),
      });
      toast.success(
        mode === "publish"
          ? `${resultType === "MID_TERM" ? "Mid-term" : "End-of-term"} results published to parents and students.`
          : `${resultType === "MID_TERM" ? "Mid-term" : "End-of-term"} results hidden from parents and students.`,
      );
      fetchResults();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update publication");
    } finally {
      setPublishing(false);
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

    // Check if class has an approved template (exact class -> section default -> school default)
    const selectedClass = classLevels.find((cls) => cls.id === filterClass);
    const approvedTpl = findApprovedTemplateForClass(templates, selectedClass, resultType);

    if (!approvedTpl) {
      toast.error(
        "No approved result template found for this class. Please approve a result template first so official results can be calculated."
      );
      return;
    }

    setComputing(true);
    try {
      const res = await apiFetch<{
        data?: { results?: ComputedRow[] };
        results?: ComputedRow[];
      }>(
        `/result-templates/bulk-compute/${currentOrg.slug}`,
        {
          method: "POST",
          body: JSON.stringify({
            classLevelId: filterClass,
            term: filterTerm,
            academicYear: filterYear,
            templateId: approvedTpl.id,
            resultType,
          }),
        },
      );
      toast.success(`Results computed using approved template "${approvedTpl.name}"!`);
      // Surface silent failures loudly: components that matched no sheet
      // (scored 0) and components that averaged multiple same-kind sheets.
      const rows: ComputedRow[] = res?.data?.results ?? res?.results ?? [];
      const warnings = new Set<string>();
      for (const row of rows) {
        for (const warning of metricWarnings(row.metrics)) {
          warnings.add(warning);
        }
      }
      if (warnings.size > 0) {
        toast.warning(`${warnings.size} component warning${warnings.size > 1 ? "s" : ""}`, {
          description: Array.from(warnings).slice(0, 4).join(" · "),
        });
      }
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
      const res = await apiFetch<{ data?: { computed?: number } } & { computed?: number }>(
        `/result-templates/session-cumulative/${currentOrg.slug}`,
        {
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

  function updateMetric(i: number, field: keyof Metric, value: Metric[keyof Metric]) {
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

  function updateGrade(i: number, field: keyof GradeLevel, value: string | number) {
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

  function applyTemplatePreset(section: SchoolSection, stage: ResultStage) {
    const preset = resultTemplatePreset(section, stage);
    setFormName(preset.name);
    setFormSchoolSection(section);
    setFormResultType(stage);
    setFormTermType(stage === "MID_TERM" ? "MID_TERM" : "END_TERM");
    setFormMidTermTotal(String(preset.midTermTotal));
    setFormMetrics(preset.metrics);
    if (currentOrg?.slug === "elyon-college") {
      setFormGrades(ELYON_GRADE_SCALE.map((grade) => ({ ...grade })));
    }
  }

  async function persistResultSettings(next: ResultSettings) {
    if (!currentOrg || !isAdmin) return;
    setSavingSettings(true);
    try {
      const response = await apiFetch<{ data: ResultSettings }>(`/result-settings/${currentOrg.slug}`, {
        method: "PUT",
        body: JSON.stringify({
          ceoSignatureUrl: next.ceoSignatureUrl,
          ceoCommentRules: next.ceoCommentRules,
          affectiveCategories: next.affectiveCategories.map((category, position) => ({ ...category, position })),
        }),
      });
      setResultSettings(response.data);
      toast.success("Result settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save result settings");
    } finally {
      setSavingSettings(false);
    }
  }

  async function uploadSignature(file: File | undefined) {
    if (!file || !resultSettings) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      toast.error("Choose a PNG, JPG, or WebP image below 5 MB");
      return;
    }
    setUploadingSignature(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const uploaded = await apiFetch<{ url: string }>("/upload/image", { method: "POST", body });
      await persistResultSettings({ ...resultSettings, ceoSignatureUrl: uploaded.url });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload signature");
    } finally {
      setUploadingSignature(false);
    }
  }

  async function openCommentEditor(result: TermResult) {
    if (!currentOrg) return;
    setCommentResult(result);
    setCustomComment("");
    try {
      const response = await apiFetch<{ data: { comment?: string } | null }>(`/result-settings/${currentOrg.slug}/comment-override`, {
        params: {
          studentId: result.student.id,
          term: result.term,
          academicYear: result.academicYear,
          resultType: result.resultType,
        },
      });
      setCustomComment(response.data?.comment || "");
    } catch {
      toast.error("Failed to load custom CEO comment");
    }
  }

  async function saveCommentOverride() {
    if (!currentOrg || !commentResult || !customComment.trim()) return;
    setSavingComment(true);
    try {
      await apiFetch(`/result-settings/${currentOrg.slug}/comment-override`, {
        method: "PUT",
        body: JSON.stringify({
          studentId: commentResult.student.id,
          term: commentResult.term,
          academicYear: commentResult.academicYear,
          resultType: commentResult.resultType,
          comment: customComment.trim(),
        }),
      });
      toast.success("Custom CEO comment saved");
      setCommentResult(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save custom comment");
    } finally {
      setSavingComment(false);
    }
  }

  async function clearCommentOverride() {
    if (!currentOrg || !commentResult) return;
    setSavingComment(true);
    try {
      await apiFetch(`/result-settings/${currentOrg.slug}/comment-override`, {
        method: "DELETE",
        params: {
          studentId: commentResult.student.id,
          term: commentResult.term,
          academicYear: commentResult.academicYear,
          resultType: commentResult.resultType,
        },
      });
      toast.success("Automated CEO comment restored");
      setCommentResult(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to clear custom comment");
    } finally {
      setSavingComment(false);
    }
  }

  // Filter templates based on selected class
  const filteredTemplates = useMemo(() => {
    if (templateClassFilter === "all") return templates;
    if (templateClassFilter === "general") return templates.filter((t) => !t.classLevelId);
    return templates.filter((t) => t.classLevelId === templateClassFilter);
  }, [templates, templateClassFilter]);

  // Selected class's approved template for the Results tab (section-aware)
  const activeClassApprovedTemplate = useMemo(() => {
    if (!filterClass) return null;
    const selectedClass = classLevels.find((cls) => cls.id === filterClass);
    return findApprovedTemplateForClass(templates, selectedClass, resultType);
  }, [classLevels, filterClass, resultType, templates]);

  if (!currentOrg) return null;

  return (
    <div className="min-h-full bg-slate-50/60 pb-10 md:bg-transparent">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:gap-6 md:px-6 md:py-8 lg:px-8">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="hidden md:block min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-[#0B1220] sm:text-2xl">
              Class Result Templates &amp; Grading
            </h1>
            <p className="mt-1 text-xs text-slate-600 sm:text-sm">
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
                className="w-full sm:w-auto shrink-0 bg-blue-600 font-semibold hover:bg-blue-700 text-white px-4 text-sm rounded-xl cursor-pointer"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                New Class Template
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-4xl">
              <DialogHeader>
                <DialogTitle>{editItem ? "Edit" : "New"} Class Result Template</DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Configure assessment metrics and grading scales for a specific class or across all classes.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                {!editItem && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
                    <p className="text-xs font-bold text-slate-900">Start from a report preset</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {(["JSS", "SSS"] as const).flatMap((section) =>
                        (["MID_TERM", "END_OF_TERM"] as const).map((stage) => (
                          <Button
                            key={`${section}-${stage}`}
                            type="button"
                            variant="outline"
                            onClick={() => applyTemplatePreset(section, stage)}
                            className="h-8 px-2.5 py-1 text-xs font-semibold rounded-lg truncate"
                          >
                            {section} {stage === "MID_TERM" ? "Mid-term" : "Terminal"}
                          </Button>
                        )),
                      )}
                    </div>
                  </div>
                )}
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

                  <div>
                    <label className="text-xs font-bold text-slate-700">School Section</label>
                    <Select value={formSchoolSection} onValueChange={(value) => setFormSchoolSection(value as "ALL" | SchoolSection)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All sections</SelectItem>
                        <SelectItem value="JSS">Junior Secondary</SelectItem>
                        <SelectItem value="SSS">Senior Secondary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700">Result Type</label>
                    <Select value={formResultType} onValueChange={(value) => {
                      setFormResultType(value as "BOTH" | ResultStage);
                      if (formTermType !== "CUSTOM") setFormTermType(value === "MID_TERM" ? "MID_TERM" : "END_TERM");
                    }}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BOTH">Mid-term and Terminal</SelectItem>
                        <SelectItem value="MID_TERM">Mid-term only</SelectItem>
                        <SelectItem value="END_OF_TERM">Terminal only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700">Term Period</label>
                    <Select
                      value={formTermType}
                      onValueChange={(value) => {
                        const tt = value as "MID_TERM" | "END_TERM" | "CUSTOM";
                        setFormTermType(tt);
                        if (tt === "MID_TERM") {
                          setFormResultType("MID_TERM");
                        } else if (tt === "END_TERM" && formResultType === "MID_TERM") {
                          setFormResultType("END_OF_TERM");
                        }
                      }}
                    >
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MID_TERM">Mid-Term</SelectItem>
                        <SelectItem value="END_TERM">End-of-Term</SelectItem>
                        <SelectItem value="CUSTOM">Custom</SelectItem>
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
                    <p className="text-xs leading-4 text-slate-600 min-w-[160px] flex-1">
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
                <div className="space-y-3">
                  {isEditTemplateLocked && editItem && (
                    <div className="flex flex-col gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-950 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-2">
                        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
                        <div>
                          <p className="font-bold text-amber-950">
                            Category allocations locked ({editItem._count?.spreadsheets} active {editItem._count?.spreadsheets === 1 ? "spreadsheet" : "spreadsheets"})
                          </p>
                          <p className="mt-0.5 text-xs leading-relaxed text-amber-900">
                            You can still update the template name, description, grade scale, or approval status. To change parent category marks without affecting existing score sheets, clone this template into a new draft.
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={cloningId === editItem.id}
                        onClick={() => void cloneTemplate(editItem)}
                        className="shrink-0 border-amber-300 bg-white text-xs font-semibold text-amber-950 hover:bg-amber-100 cursor-pointer"
                      >
                        {cloningId === editItem.id ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                        ) : (
                          <Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        Clone to Revise Marks
                      </Button>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-bold text-slate-900">
                          Assessment categories &amp; maximum marks
                        </label>
                        {isStageTotalsValid ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200 tabular-nums">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" aria-hidden="true" />
                            100 Marks Valid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200 tabular-nums">
                            <AlertCircle className="h-3 w-3 text-amber-600" aria-hidden="true" />
                            {hasMidTermMetrics && midTermSum !== 100
                              ? `${midTermSum}/100 Mid-Term`
                              : hasEndTermMetrics && endTermSum !== 100
                                ? `${endTermSum}/100 End-of-Term`
                                : "Add categories"}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5 tabular-nums">
                        {hasMidTermMetrics && hasEndTermMetrics ? (
                          <>
                            <span className="font-semibold text-slate-700">Mid-term:</span> {midTermSum}/100 marks &middot;{" "}
                            <span className="font-semibold text-slate-700">End-of-term:</span> {endTermSum}/100 marks — each stage totals 100
                          </>
                        ) : hasMidTermMetrics ? (
                          <>Mid-term parent categories must total exactly 100 marks (Current: <span className="font-bold text-slate-800">{midTermSum}</span>)</>
                        ) : (
                          <>Parent category allocations must total exactly 100 marks (Current: <span className="font-bold text-slate-800">{endTermSum}</span>)</>
                        )}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isEditTemplateLocked}
                      onClick={addMetric}
                      className="h-8 text-xs font-semibold self-start sm:self-auto border-slate-300 text-slate-700 hover:bg-slate-50 shrink-0 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Plus className="mr-1 h-3.5 w-3.5 text-blue-600" />
                      Add Component
                    </Button>
                  </div>

                  {/* Desktop Column Headers */}
                  <div className="hidden md:grid md:grid-cols-[1.5fr_100px_130px_140px_110px_100px_36px] gap-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <span>Category Name</span>
                    <span>Code</span>
                    <span>Stage</span>
                    <span>Sheet Kind</span>
                    <span className="text-center">Max Marks</span>
                    <span className="text-center">Exam Lock</span>
                    <span className="sr-only">Actions</span>
                  </div>

                  <fieldset disabled={isEditTemplateLocked} className="space-y-2.5 max-h-72 overflow-y-auto pr-1 disabled:opacity-70">
                    {formMetrics.map((m, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs transition-all hover:border-slate-300 space-y-2.5 md:space-y-0"
                      >
                        {/* Desktop Grid Layout (>= 768px) */}
                        <div className="hidden md:grid md:grid-cols-[1.5fr_100px_130px_140px_110px_100px_36px] items-center gap-2">
                          <Input
                            placeholder="Category (e.g. Classwork)"
                            value={m.name}
                            aria-label={`Category name for component ${i + 1}`}
                            onChange={(e) => updateMetric(i, "name", e.target.value)}
                            className="text-xs h-9 bg-slate-50/50 border-slate-200 focus:bg-white font-medium"
                          />
                          <Input
                            placeholder="Code (CW)"
                            value={m.label}
                            aria-label={`Short code for component ${i + 1}`}
                            onChange={(e) => updateMetric(i, "label", e.target.value)}
                            className="text-xs h-9 bg-slate-50/50 border-slate-200 focus:bg-white text-center font-bold"
                          />
                          <Select
                            disabled={isEditTemplateLocked}
                            value={(m.stage ?? "END_OF_TERM") as string}
                            onValueChange={(v) => updateMetric(i, "stage", v as Metric["stage"])}
                          >
                            <SelectTrigger className="w-full min-w-[125px] h-9 bg-slate-50/50 border-slate-200 focus:bg-white text-xs shrink-0" aria-label={`Stage for component ${i + 1}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="END_OF_TERM">End-of-term</SelectItem>
                              <SelectItem value="MID_TERM">Mid-term</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select
                            disabled={isEditTemplateLocked}
                            value={(m.kind ?? "NONE") as string}
                            onValueChange={(v) => updateMetric(i, "kind", v === "NONE" ? undefined : (v as string))}
                          >
                            <SelectTrigger className="w-full min-w-[130px] h-9 bg-slate-50/50 border-slate-200 focus:bg-white text-xs shrink-0" aria-label={`Sheet kind for component ${i + 1}`}>
                              <SelectValue placeholder="Sheet kind" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="NONE">Any sheet (auto)</SelectItem>
                              {ASSESSMENT_KINDS.map((kind) => (
                                <SelectItem key={kind} value={kind}>
                                  {kind.charAt(0) + kind.slice(1).toLowerCase()}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex items-center justify-center gap-1.5 bg-slate-50/80 border border-slate-200 rounded-lg px-2 h-9">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              placeholder="0"
                              value={m.weight === 0 ? "0" : (m.weight ?? 0)}
                              aria-label={`Maximum marks for ${m.name || `component ${i + 1}`}`}
                              onChange={(e) => {
                                const val = e.target.value.replace(/^0+(?=\d)/, "");
                                updateMetric(i, "weight", val === "" ? 0 : Number(val));
                              }}
                              onFocus={(e) => e.target.select()}
                              className="w-12 text-center text-xs h-7 border-none bg-transparent p-0 font-bold tabular-nums focus-visible:ring-0 text-slate-900"
                            />
                            <span className="text-[11px] font-semibold text-slate-500">marks</span>
                          </div>
                          <label
                            className={cn(
                              "flex items-center justify-center gap-1.5 h-9 px-2 rounded-lg border text-xs font-semibold cursor-pointer transition-colors select-none",
                              m.isSingleInstance
                                ? "bg-blue-50/80 border-blue-200 text-blue-700"
                                : "bg-slate-50/60 border-slate-200 text-slate-500 hover:bg-slate-100"
                            )}
                            title="Fixed category locks teachers from splitting it into sub-assessments"
                          >
                            <input
                              type="checkbox"
                              checked={Boolean(m.isSingleInstance)}
                              onChange={(e) => updateMetric(i, "isSingleInstance", e.target.checked)}
                              className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="truncate">Fixed</span>
                          </label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeMetric(i)}
                            aria-label={`Remove component ${m.name || i + 1}`}
                            className="h-9 w-9 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Mobile View Layout (< 768px) */}
                        <div className="md:hidden space-y-2.5">
                          <div className="flex items-center gap-2">
                            <div className="h-7 px-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">
                              #{i + 1}
                            </div>
                            <Input
                              placeholder="Category (e.g. Classwork)"
                              value={m.name}
                              aria-label={`Category name for component ${i + 1}`}
                              onChange={(e) => updateMetric(i, "name", e.target.value)}
                              className="text-xs h-8.5 bg-slate-50/50 border-slate-200 focus:bg-white font-medium flex-1 rounded-lg"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeMetric(i)}
                              aria-label={`Remove component ${m.name || i + 1}`}
                              className="h-8.5 w-8.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0 cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* Row 1: Short Code & Allocated Marks (Unified Input Group) */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs font-semibold text-slate-600 mb-1 block">Short Code</label>
                              <Input
                                placeholder="Code (CW)"
                                value={m.label}
                                aria-label={`Short code for component ${i + 1}`}
                                onChange={(e) => updateMetric(i, "label", e.target.value)}
                                className="bg-slate-50/50 border-slate-200 focus:bg-white text-center font-bold rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-slate-600 mb-1 block">Allocated Marks</label>
                              <div className="flex items-center justify-between bg-slate-50/50 border border-slate-200 focus-within:border-[#1447E6] focus-within:bg-white rounded-lg px-2.5 min-h-11">
                                <Input
                                  type="number"
                                  min={0}
                                  max={100}
                                  placeholder="0"
                                  value={m.weight === 0 ? "0" : (m.weight ?? 0)}
                                  aria-label={`Maximum marks for ${m.name || `component ${i + 1}`}`}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(/^0+(?=\d)/, "");
                                    updateMetric(i, "weight", val === "" ? 0 : Number(val));
                                  }}
                                  onFocus={(e) => e.target.select()}
                                  className="w-14 text-left h-8 border-none bg-transparent p-0 font-bold tabular-nums focus-visible:ring-0 text-slate-900"
                                />
                                <span className="text-xs font-semibold text-slate-500 shrink-0 select-none">marks</span>
                              </div>
                            </div>
                          </div>

                          {/* Row 2: Stage & Sheet Kind (Unified Select Dropdowns) */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs font-semibold text-slate-600 mb-1 block">Stage</label>
                              <Select
                                disabled={isEditTemplateLocked}
                                value={(m.stage ?? "END_OF_TERM") as string}
                                onValueChange={(v) => updateMetric(i, "stage", v as Metric["stage"])}
                              >
                                <SelectTrigger className="w-full bg-slate-50/50 border-slate-200 focus:bg-white text-xs rounded-lg" aria-label={`Stage for component ${i + 1}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="END_OF_TERM">End-of-term</SelectItem>
                                  <SelectItem value="MID_TERM">Mid-term</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-slate-600 mb-1 block">Sheet Kind</label>
                              <Select
                                disabled={isEditTemplateLocked}
                                value={(m.kind ?? "NONE") as string}
                                onValueChange={(v) => updateMetric(i, "kind", v === "NONE" ? undefined : (v as string))}
                              >
                                <SelectTrigger className="w-full bg-slate-50/50 border-slate-200 focus:bg-white text-xs rounded-lg" aria-label={`Sheet kind for component ${i + 1}`}>
                                  <SelectValue placeholder="Sheet kind" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="NONE">Any sheet (auto)</SelectItem>
                                  {ASSESSMENT_KINDS.map((kind) => (
                                    <SelectItem key={kind} value={kind}>
                                      {kind.charAt(0) + kind.slice(1).toLowerCase()}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <label
                            className={cn(
                              "flex min-h-11 items-center justify-between p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors select-none",
                              m.isSingleInstance
                                ? "bg-[#EEF0FF] border-[#1447E6]/30 text-[#1447E6]"
                                : "bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100"
                            )}
                          >
                            <div className="flex flex-col pr-2">
                              <span className="font-bold">Fixed Single-Instance Exam</span>
                              <span className="text-xs font-normal text-slate-600 leading-tight">Teachers cannot create sub-assessments under this category</span>
                            </div>
                            <input
                              type="checkbox"
                              checked={Boolean(m.isSingleInstance)}
                              onChange={(e) => updateMetric(i, "isSingleInstance", e.target.checked)}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 shrink-0"
                            />
                          </label>
                        </div>

                        {/* Optional Exact Sheet Title Binding */}
                        {m.kind ? (
                          <div className="pt-2 border-t border-slate-100/80">
                            <Input
                              placeholder="Exact sheet title filter (optional, e.g. Mathematics Mid-Term Test)"
                              value={m.assessmentTitle ?? ""}
                              onChange={(e) => updateMetric(i, "assessmentTitle", e.target.value)}
                              className="w-full text-xs h-8 bg-slate-50/50 border-slate-200"
                              aria-label={`Exact sheet title for ${m.name || "component"}`}
                            />
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </fieldset>
                </div>

                {/* Grade Scale */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                    <div>
                      <label className="text-sm font-bold text-slate-900">Grading Scale (Nigerian WAEC / Secondary)</label>
                      <p className="text-xs text-slate-500">Assign grade thresholds from 0 to 100%.</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addGrade}
                      className="h-8 text-xs font-semibold self-start sm:self-auto border-slate-300 text-slate-700 hover:bg-slate-50 shrink-0 cursor-pointer"
                    >
                      <Plus className="mr-1 h-3.5 w-3.5 text-blue-600" />
                      Add Grade
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                    {formGrades.map((g, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Input
                            placeholder="Grade"
                            value={g.grade}
                            aria-label={`Grade letter for tier ${i + 1}`}
                            onChange={(e) => updateGrade(i, "grade", e.target.value)}
                            className="w-14 text-xs h-8 bg-slate-50 border-slate-200 text-center font-bold text-slate-900 shrink-0"
                          />
                          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 h-8 flex-1 min-w-0 justify-between">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              placeholder="0"
                              value={g.min === 0 && g.max === 0 ? "0" : (g.min ?? 0)}
                              aria-label={`Minimum mark for grade ${g.grade || i + 1}`}
                              onChange={(e) => {
                                const val = e.target.value.replace(/^0+(?=\d)/, "");
                                updateGrade(i, "min", val === "" ? 0 : Number(val));
                              }}
                              onFocus={(e) => e.target.select()}
                              className="w-10 text-center text-xs h-7 border-none bg-transparent p-0 font-semibold tabular-nums focus-visible:ring-0 text-slate-900"
                            />
                            <span className="text-xs text-slate-400 font-bold shrink-0">–</span>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              placeholder="0"
                              value={g.min === 0 && g.max === 0 ? "0" : (g.max ?? 0)}
                              aria-label={`Maximum mark for grade ${g.grade || i + 1}`}
                              onChange={(e) => {
                                const val = e.target.value.replace(/^0+(?=\d)/, "");
                                updateGrade(i, "max", val === "" ? 0 : Number(val));
                              }}
                              onFocus={(e) => e.target.select()}
                              className="w-10 text-center text-xs h-7 border-none bg-transparent p-0 font-semibold tabular-nums focus-visible:ring-0 text-slate-900"
                            />
                            <span className="text-[10px] font-bold text-slate-400 shrink-0">%</span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeGrade(i)}
                          aria-label={`Delete grade ${g.grade || i + 1}`}
                          className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 shrink-0 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <Button
                    onClick={saveTemplate}
                    disabled={saving}
                    className="w-full bg-[#1447E6] hover:bg-[#1447E6]/90 text-white font-bold h-10 rounded-xl shadow-sm transition-all text-xs sm:text-sm cursor-pointer"
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
          <TabsList className="grid h-10 w-full grid-cols-3 bg-slate-200/70 p-1 rounded-xl md:inline-flex md:w-auto">
            <TabsTrigger value="templates" className="font-semibold text-xs sm:text-sm px-2 sm:px-3">
              <ClipboardList className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span className="sm:hidden">Templates</span>
              <span className="hidden sm:inline">Class Result Templates ({templates.length})</span>
            </TabsTrigger>
            <TabsTrigger value="results" className="font-semibold text-xs sm:text-sm px-2 sm:px-3">
              <Calculator className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span className="sm:hidden">Results</span>
              <span className="hidden sm:inline">Results Overview &amp; Computation</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="font-semibold text-xs sm:text-sm px-2 sm:px-3">
              <Settings2 className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span className="sm:hidden">Settings</span>
              <span className="hidden sm:inline">Result Settings</span>
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
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <CardTitle className="text-base font-bold text-[#0B1220]">{t.name}</CardTitle>
                            {t.isApproved ? (
                              <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-xs font-semibold">
                                <CheckCircle2 className="mr-1 h-3 w-3 text-emerald-600" />
                                Approved
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-xs font-semibold">
                                <AlertCircle className="mr-1 h-3 w-3 text-amber-600" />
                                Pending Approval
                              </Badge>
                            )}
                          </div>

                          <p className="mt-1.5 text-xs font-medium text-slate-600">
                            {t.classLevel?.name ? t.classLevel.name : "All Classes"}
                            <span className="mx-1.5 text-slate-300">·</span>
                            {t.schoolSection === "JSS" ? "Junior Secondary" : t.schoolSection === "SSS" ? "Senior Secondary" : "All sections"}
                            <span className="mx-1.5 text-slate-300">·</span>
                            {t.resultType === "MID_TERM" ? "Mid-term" : t.resultType === "END_OF_TERM" ? "Terminal" : "Mid & Terminal"}
                            {(t.midTermTotal ?? 0) > 0 && (
                              <>
                                <span className="mx-1.5 text-slate-300">·</span>
                                <span className="text-[#1447E6] tabular-nums">Mid-term {t.midTermTotal}%</span>
                              </>
                            )}
                            {t.isDefault && (
                              <>
                                <span className="mx-1.5 text-slate-300">·</span>
                                Default
                              </>
                            )}
                            {(t._count?.spreadsheets ?? 0) > 0 && (
                              <>
                                <span className="mx-1.5 text-slate-300">·</span>
                                <span className="inline-flex items-center gap-1 tabular-nums">
                                  <Lock className="inline h-3 w-3 text-slate-500" aria-hidden="true" />
                                  {t._count?.spreadsheets} {t._count?.spreadsheets === 1 ? "sheet" : "sheets"}
                                </span>
                              </>
                            )}
                          </p>
                        </div>

                        {isAdmin && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => void cloneTemplate(t)}
                              disabled={cloningId === t.id}
                              aria-label={`Clone template ${t.name}`}
                              className="flex h-11 w-11 items-center justify-center text-slate-600 hover:text-[#1447E6] rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50 md:pointer-fine:h-8 md:pointer-fine:w-8"
                              title="Clone Template"
                            >
                              {cloningId === t.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => openEdit(t)}
                              aria-label={`Edit template ${t.name}`}
                              className="flex h-11 w-11 items-center justify-center text-slate-600 hover:text-[#1447E6] rounded-xl hover:bg-slate-100 transition-colors md:pointer-fine:h-8 md:pointer-fine:w-8"
                              title="Edit Template"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteTemplate(t.id)}
                              disabled={(t._count?.spreadsheets ?? 0) > 0}
                              aria-label={`Delete template ${t.name}`}
                              className="flex h-11 w-11 items-center justify-center text-slate-600 hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors disabled:cursor-not-allowed disabled:opacity-40 md:pointer-fine:h-8 md:pointer-fine:w-8"
                              title={(t._count?.spreadsheets ?? 0) > 0 ? "Cannot delete a template linked to spreadsheets" : "Delete Template"}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      {t.description && (
                        <CardDescription className="text-xs text-slate-600 mt-1">
                          {t.description}
                        </CardDescription>
                      )}
                    </CardHeader>

                    <CardContent className="space-y-3 pt-0">
                      <div className="pt-2 border-t border-slate-100 text-xs text-slate-700 space-y-1">
                        <p className="font-semibold text-slate-800">Categories &amp; maximum marks:</p>
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {(Array.isArray(t.assessmentCategories) && t.assessmentCategories.length > 0
                            ? t.assessmentCategories.map((cat) => ({
                                key: cat.id,
                                label: cat.name,
                                marks: cat.maxMarks,
                                isFixed: Boolean(cat.isSingleInstance),
                              }))
                            : t.metrics.map((m, idx) => ({
                                key: m.id || String(idx),
                                label: m.label || m.name,
                                marks: m.weight,
                                isFixed: Boolean(m.isSingleInstance),
                              }))
                          ).map((item) => (
                            <span
                              key={item.key}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-xs font-medium"
                            >
                              {item.isFixed && <Lock className="h-3 w-3 text-slate-400" aria-hidden="true" />}
                              <span>{item.label}:</span>
                              <strong className="text-slate-900 tabular-nums">{item.marks} marks</strong>
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs font-medium text-slate-500">
                          {t.gradeScale.length} Grade Tiers ({t.gradeScale[0]?.grade || "A"} to{" "}
                          {t.gradeScale[t.gradeScale.length - 1]?.grade || "F"})
                        </span>

                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleApproval(t)}
                            className={cn(
                              "h-8 px-3 text-xs font-semibold rounded-lg cursor-pointer",
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
                        ? `Weighted: ${(Array.isArray(activeClassApprovedTemplate.assessmentCategories) && activeClassApprovedTemplate.assessmentCategories.length > 0
                            ? activeClassApprovedTemplate.assessmentCategories.map((c) => `${c.name} (${c.maxMarks} marks)`)
                            : activeClassApprovedTemplate.metrics.map((m) => `${m.label || m.name} (${m.weight}%)`)
                          ).join(" + ")}${(activeClassApprovedTemplate.midTermTotal ?? 0) > 0 && activeClassApprovedTemplate.resultType === "BOTH" ? ` — mid-term share ${activeClassApprovedTemplate.midTermTotal}%` : ""}`
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:flex-wrap gap-3 p-3.5 rounded-2xl bg-white border border-slate-200 text-xs font-semibold shadow-2xs">
              <span className="text-slate-900 font-bold shrink-0">Class Session Formula:</span>
              <div className="grid grid-cols-3 gap-2 w-full sm:w-auto sm:flex sm:items-center sm:gap-3">
                <div className="flex items-center justify-between bg-slate-50/70 border border-slate-200/90 focus-within:border-[#1447E6] focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100/60 rounded-xl px-2.5 h-9 transition-all">
                  <span className="text-slate-600 font-bold text-xs select-none">T1:</span>
                  <input
                    type="number"
                    value={weightTerm1}
                    onChange={(e) => setWeightTerm1(e.target.value)}
                    aria-label="Term 1 weighting percentage"
                    className="w-10 text-center font-bold text-slate-900 bg-transparent border-none p-0 text-xs sm:text-sm focus:outline-none tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-slate-400 font-semibold text-xs select-none">%</span>
                </div>
                <div className="flex items-center justify-between bg-slate-50/70 border border-slate-200/90 focus-within:border-[#1447E6] focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100/60 rounded-xl px-2.5 h-9 transition-all">
                  <span className="text-slate-600 font-bold text-xs select-none">T2:</span>
                  <input
                    type="number"
                    value={weightTerm2}
                    onChange={(e) => setWeightTerm2(e.target.value)}
                    aria-label="Term 2 weighting percentage"
                    className="w-10 text-center font-bold text-slate-900 bg-transparent border-none p-0 text-xs sm:text-sm focus:outline-none tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-slate-400 font-semibold text-xs select-none">%</span>
                </div>
                <div className="flex items-center justify-between bg-slate-50/70 border border-slate-200/90 focus-within:border-[#1447E6] focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100/60 rounded-xl px-2.5 h-9 transition-all">
                  <span className="text-slate-600 font-bold text-xs select-none">T3:</span>
                  <input
                    type="number"
                    value={weightTerm3}
                    onChange={(e) => setWeightTerm3(e.target.value)}
                    aria-label="Term 3 weighting percentage"
                    className="w-10 text-center font-bold text-slate-900 bg-transparent border-none p-0 text-xs sm:text-sm focus:outline-none tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-slate-400 font-semibold text-xs select-none">%</span>
                </div>
              </div>
              <Button
                size="sm"
                onClick={computeSessionCumulative}
                disabled={computing || !filterClass}
                className="w-full sm:w-auto bg-[#1447E6] hover:bg-[#1447E6]/90 text-white h-9 px-3.5 text-xs sm:ml-auto rounded-xl font-bold shadow-xs cursor-pointer"
              >
                {computing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Calculator className="mr-1.5 h-3.5 w-3.5" />}
                Compute Session Cumulative
              </Button>
            </div>

            {/* Results Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5">
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
                <Select value={filterClass} onValueChange={(v: unknown) => setFilterClass(v as string)}>
                  <SelectTrigger className="w-full sm:w-[180px] text-sm font-semibold rounded-xl">
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

                <Select
                  value={`${filterYear}|${filterTerm}`}
                  onValueChange={(v: unknown) => {
                    const [year, termValue] = String(v).split("|");
                    if (year && termValue) {
                      setFilterYear(year);
                      setFilterTerm(termValue);
                    }
                  }}
                >
                  <SelectTrigger
                    className="w-full sm:w-[190px] text-sm font-semibold rounded-xl"
                    aria-label="Academic period"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {periodOptions.length > 0 ? (
                      periodOptions.map((p) => (
                        <SelectItem key={`${p.academicYear}|${p.term}`} value={`${p.academicYear}|${p.term}`}>
                          {p.term} — {p.academicYear}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value={`${filterYear}|${filterTerm}`}>
                        {filterTerm} — {filterYear}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Select value={resultType} onValueChange={(v: unknown) => setResultType(v as "MID_TERM" | "END_OF_TERM")}>
                  <SelectTrigger
                    className="flex-1 sm:w-[140px] text-sm font-semibold rounded-xl"
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
                  className="px-3.5 text-xs sm:text-sm font-semibold rounded-xl cursor-pointer shrink-0"
                >
                  <Eye className="mr-1.5 h-3.5 w-3.5" />
                  View
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:ml-auto w-full sm:w-auto">
                <Button
                  size="sm"
                  onClick={bulkCompute}
                  disabled={computing || !filterClass}
                  className="w-full sm:w-auto bg-[#1447E6] hover:bg-[#0F36B8] text-white px-4 text-xs sm:text-sm font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {computing ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Calculator className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Compute Class Results
                </Button>

                {filterClass && (
                  <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
                    {isAdmin && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={publishing}
                          onClick={() => void handlePublish("publish")}
                          className="px-3 text-xs sm:text-sm font-semibold rounded-xl cursor-pointer"
                          title={`Publish ${resultType === "MID_TERM" ? "mid-term" : "end-of-term"} results to parents and students`}
                        >
                          {publishing ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Publish
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={publishing}
                          onClick={() => void handlePublish("unpublish")}
                          className="px-3 text-xs sm:text-sm font-semibold rounded-xl cursor-pointer"
                          title={`Hide ${resultType === "MID_TERM" ? "mid-term" : "end-of-term"} results from parents and students`}
                        >
                          <AlertCircle className="mr-1.5 h-3.5 w-3.5" />
                          Unpublish
                        </Button>
                      </>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="px-3 text-xs sm:text-sm font-semibold rounded-xl"
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
                      className="px-3 text-xs sm:text-sm font-semibold rounded-xl"
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
                  </div>
                )}
              </div>
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
                  <p className="text-sm font-semibold text-slate-700">
                    {loadedResults?.key === resultsKey ? "No computed results found for this selection." : "Results for this selection have not been loaded."}
                  </p>
                  <p className="text-xs text-slate-600">
                    Select a class to view existing results or compute new results using the approved template.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                {results.map((r) => (
                  <div
                    key={r.id}
                    className="p-3 sm:px-4 sm:py-3.5 hover:bg-slate-50/70 transition-colors border-b border-slate-100 last:border-b-0"
                  >
                    {/* Mobile View Card Layout (<sm) */}
                    <div className="flex sm:hidden flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="h-8 w-8 rounded-lg bg-[#EEF0FF] text-[#1447E6] font-bold text-xs flex items-center justify-center shrink-0">
                            {r.student.firstName?.[0] || ""}{r.student.lastName?.[0] || ""}
                          </div>
                          <span className="font-bold text-[#0B1220] text-sm truncate">
                            {r.student.firstName} {r.student.lastName}
                          </span>
                          {r.resultType === "MID_TERM" && (
                            <Badge variant="outline" className="text-xs px-1.5 py-0 font-semibold text-[#1447E6] border-[#1447E6]/20 bg-[#EEF0FF] shrink-0">
                              Mid-term
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="font-extrabold text-base tabular-nums text-[#0B1220]">
                            {r.totalScore}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded-md px-1.5 py-0.5 text-xs font-extrabold shrink-0",
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
                        </div>
                      </div>

                      {/* Metadata Row */}
                      <div className="text-xs text-slate-600 font-medium pl-10 flex flex-wrap items-center gap-1.5">
                        <span>{r.classLevel.name}</span>
                        <span className="text-slate-300">&bull;</span>
                        <span>{r.term}</span>
                        <span className="text-slate-300">&bull;</span>
                        <span className="truncate">Template: {r.template.name}</span>
                      </div>

                      {/* Bottom Actions Row */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100/80 mt-0.5 pl-10">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold tabular-nums text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                            #{r.position || "—"}
                          </span>
                          {r.publishedAt ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 rounded-md px-2 py-0.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Published
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 rounded-md px-2 py-0.5">
                              Unpublished
                            </span>
                          )}
                        </div>

                        {isAdmin && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void openCommentEditor(r)}
                            className="px-3 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer text-slate-700"
                          >
                            CEO comment
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Desktop View Layout (sm+) */}
                    <div className="hidden sm:flex sm:items-center sm:gap-4 sm:text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-[#0B1220] flex flex-wrap items-center gap-2">
                          <span>{r.student.firstName} {r.student.lastName}</span>
                          {r.resultType === "MID_TERM" && (
                            <Badge variant="outline" className="text-xs px-1.5 py-0 shrink-0 font-semibold text-[#1447E6] border-[#1447E6]/20 bg-[#EEF0FF]">
                              Mid-term
                            </Badge>
                          )}
                        </p>
                        <p className="text-xs text-slate-500">
                          {r.classLevel.name} &middot; {r.term} &middot; Template: {r.template.name}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="font-extrabold text-base sm:text-lg tabular-nums text-[#0B1220]">
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

                      <div className="text-xs text-slate-500 shrink-0 w-8 text-center font-bold tabular-nums">
                        #{r.position || "—"}
                      </div>

                      {r.publishedAt ? (
                        <Badge variant="secondary" className="text-xs px-2 py-0.5 shrink-0 font-semibold text-slate-800">
                          Published
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs px-2 py-0.5 shrink-0 font-semibold text-slate-600 border-slate-200">
                          Unpublished
                        </Badge>
                      )}
                      {isAdmin && (
                        <Button type="button" variant="outline" size="sm" onClick={() => void openCommentEditor(r)} className="h-8 text-xs font-semibold">
                          CEO comment
                        </Button>
                      )}
                    </div>

                    {(() => {
                      const rowWarnings = metricWarnings(r.metrics);
                      return rowWarnings.length > 0 ? (
                        <p className="w-full text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5 mt-2">
                          ⚠ {rowWarnings.join(" · ")}
                        </p>
                      ) : null;
                    })()}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings" className="mt-4 space-y-4">
            {!resultSettings ? (
              <div className="space-y-3"><Skeleton className="h-40 rounded-2xl" /><Skeleton className="h-56 rounded-2xl" /></div>
            ) : (
              <>
                <Card className="rounded-2xl border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-base">CEO signature</CardTitle>
                    <CardDescription>Saved signature appears on previews, individual PDFs, and class bundles.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex h-20 w-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 sm:w-56">
                      {resultSettings.ceoSignatureUrl ? (
                        <Image src={resultSettings.ceoSignatureUrl} alt="Saved CEO signature" width={180} height={64} unoptimized className="max-h-16 w-auto object-contain" />
                      ) : <span className="text-xs text-slate-500">No signature uploaded</span>}
                    </div>
                    {isAdmin && (
                      <div className="flex flex-wrap gap-2">
                        <label className="inline-flex min-h-11 cursor-pointer items-center rounded-md bg-[#1447E6] px-4 text-sm font-semibold text-white">
                          {uploadingSignature ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                          Upload signature
                          <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={uploadingSignature} onChange={(event) => void uploadSignature(event.target.files?.[0])} />
                        </label>
                        {resultSettings.ceoSignatureUrl && (
                          <Button type="button" variant="outline" onClick={() => void persistResultSettings({ ...resultSettings, ceoSignatureUrl: null })}>Remove</Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-base">Automated CEO comments</CardTitle>
                    <CardDescription>Overall result score selects one matching comment. Per-student overrides take priority.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {resultSettings.ceoCommentRules.map((rule, index) => (
                      <div key={index} className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[5rem_5rem_1fr_2.75rem] sm:items-start">
                        <Input aria-label={`Minimum score for comment ${index + 1}`} type="number" min={0} max={100} value={rule.min} disabled={!isAdmin} onChange={(event) => setResultSettings({ ...resultSettings, ceoCommentRules: resultSettings.ceoCommentRules.map((item, itemIndex) => itemIndex === index ? { ...item, min: Number(event.target.value) } : item) })} />
                        <Input aria-label={`Maximum score for comment ${index + 1}`} type="number" min={0} max={100} value={rule.max} disabled={!isAdmin} onChange={(event) => setResultSettings({ ...resultSettings, ceoCommentRules: resultSettings.ceoCommentRules.map((item, itemIndex) => itemIndex === index ? { ...item, max: Number(event.target.value) } : item) })} />
                        <Textarea aria-label={`CEO comment ${index + 1}`} value={rule.comment} disabled={!isAdmin} className="min-h-11" onChange={(event) => setResultSettings({ ...resultSettings, ceoCommentRules: resultSettings.ceoCommentRules.map((item, itemIndex) => itemIndex === index ? { ...item, comment: event.target.value } : item) })} />
                        {isAdmin && <Button type="button" variant="ghost" size="icon" aria-label={`Remove CEO comment range ${index + 1}`} onClick={() => setResultSettings({ ...resultSettings, ceoCommentRules: resultSettings.ceoCommentRules.filter((_, itemIndex) => itemIndex !== index) })}><Trash2 className="h-4 w-4" /></Button>}
                      </div>
                    ))}
                    {isAdmin && (
                      <Button type="button" variant="outline" onClick={() => setResultSettings({ ...resultSettings, ceoCommentRules: [...resultSettings.ceoCommentRules, { min: 0, max: 0, comment: "" }] })}><Plus className="mr-2 h-4 w-4" />Add score range</Button>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-base">Leadership, affective, and psychomotor categories</CardTitle>
                    <CardDescription>Inactive categories disappear from new result sheets. Assigned class teachers enter student ratings.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {resultSettings.affectiveCategories.map((category, index) => (
                      <div key={category.id} className="flex items-center gap-2 rounded-xl border border-slate-200 p-2">
                        <Input value={category.label} disabled={!isAdmin} aria-label={`Affective category ${index + 1}`} onChange={(event) => setResultSettings({ ...resultSettings, affectiveCategories: resultSettings.affectiveCategories.map((item) => item.id === category.id ? { ...item, label: event.target.value } : item) })} />
                        <label className="flex min-h-11 items-center gap-2 px-2 text-xs font-semibold text-slate-700">
                          <input type="checkbox" checked={category.active} disabled={!isAdmin} onChange={(event) => setResultSettings({ ...resultSettings, affectiveCategories: resultSettings.affectiveCategories.map((item) => item.id === category.id ? { ...item, active: event.target.checked } : item) })} />
                          Active
                        </label>
                        {isAdmin && <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${category.label}`} onClick={() => setResultSettings({ ...resultSettings, affectiveCategories: resultSettings.affectiveCategories.filter((item) => item.id !== category.id) })}><Trash2 className="h-4 w-4" /></Button>}
                      </div>
                    ))}
                    {isAdmin && (
                      <div className="flex flex-wrap justify-between gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setResultSettings({ ...resultSettings, affectiveCategories: [...resultSettings.affectiveCategories, { id: crypto.randomUUID(), label: "New category", active: true, position: resultSettings.affectiveCategories.length }] })}><Plus className="mr-2 h-4 w-4" />Add category</Button>
                        <Button type="button" disabled={savingSettings} onClick={() => void persistResultSettings(resultSettings)} className="bg-[#1447E6] text-white hover:bg-[#1447E6]/90">
                          {savingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save result settings
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={Boolean(commentResult)} onOpenChange={(open) => { if (!open) setCommentResult(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Custom CEO comment</DialogTitle>
              <DialogDescription>
                Override the automated comment for {commentResult ? `${commentResult.student.firstName} ${commentResult.student.lastName}` : "this student"}. Clearing it restores the score-range comment.
              </DialogDescription>
            </DialogHeader>
            <Textarea value={customComment} onChange={(event) => setCustomComment(event.target.value)} maxLength={1000} className="min-h-28" placeholder="Enter CEO comment" />
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" disabled={savingComment} onClick={() => void clearCommentOverride()}>Use automated comment</Button>
              <Button type="button" disabled={savingComment || !customComment.trim()} onClick={() => void saveCommentOverride()} className="bg-[#1447E6] text-white hover:bg-[#1447E6]/90">
                {savingComment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save custom comment
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
