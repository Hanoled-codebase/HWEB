"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  BookOpen,
  Delete,
  FileSpreadsheet,
  Filter,
  GraduationCap,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  X,
  LayoutGrid,
  List,
  Lock,
  MoreHorizontal,
  CheckCircle2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter, useSearchParams } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { BackButton, DataStateCard } from "@/components/dashboard/shared";
import { usePermissions } from "@/hooks/usePermissions";
import { apiFetch } from "@/lib/api";
import {
  computeCategoryAllocationSummary,
  getSpreadsheetLabel,
  type AssessmentCategorySummary,
} from "@/lib/spreadsheets";
import { toTitleCase, cn } from "@/lib/utils";
import { greetingName } from "@/lib/greeting-name";
import { detectClassSection, type ResultStage } from "@/lib/result-presets";
import { buildSpreadsheetTitle, type TermType } from "@/lib/universal-grading";

type SpreadsheetSummary = {
  id: string;
  title?: string | null;
  status: "pending" | "active" | "inactive";
  createdAt: string;
  resultType: ResultStage;
  termType?: TermType;
  hcoreAssessmentId?: string | null;
  classLevel?: { id?: string; name?: string | null } | null;
  subject?: { id?: string; name?: string | null } | null;
};

type ClassOption = {
  id: string;
  name: string;
};

type SubjectOption = {
  id: string;
  name: string;
};

type TemplateSummaryItem = {
  id: string;
  name: string;
  isApproved?: boolean;
  isDefault?: boolean;
  classLevelId?: string | null;
  schoolSection?: string;
  termType?: string;
  resultType?: string;
  metrics?: Array<{ id?: string; name: string; weight: number; isSingleInstance?: boolean }>;
  assessmentCategories?: AssessmentCategorySummary[];
};

type CreatedSpreadsheet = {
  id: string;
  created?: boolean;
  title?: string | null;
  version?: number;
};

type EditableAssessmentRow = {
  id?: string;
  categoryId?: string;
  categoryName?: string;
  maxObtainableScore?: number;
  categoryMaxMarks?: number;
  isSystemGenerated?: boolean;
  recordedScoreCount?: number;
  name: string;
  total: number | "";
};

function resolveTemplateCategories(template?: TemplateSummaryItem | null): AssessmentCategorySummary[] {
  if (!template) return [];
  if (Array.isArray(template.assessmentCategories) && template.assessmentCategories.length > 0) {
    return template.assessmentCategories;
  }
  return (template.metrics || []).map((metric, index) => ({
    id: metric.id || metric.name,
    name: metric.name,
    maxMarks: Number(metric.weight) || 0,
    isSingleInstance: Boolean(metric.isSingleInstance),
    position: index,
  }));
}

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

function getDisplayName(name: string | undefined) {
  if (!name) {
    return "Teacher";
  }
  return toTitleCase(greetingName(name) || name);
}

function getStatusClassName(status: SpreadsheetSummary["status"]) {
  switch (status) {
    case "active":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "inactive":
      return "border-slate-200 bg-slate-100 text-slate-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

const createSpreadsheetSchema = z.object({
  classId: z.string().min(1, "Class is required"),
  subjectId: z.string().min(1, "Subject is required"),
  termType: z.enum(["MID_TERM", "END_TERM", "CUSTOM"]),
  templateId: z.string().min(1, "An approved result template is required"),
  resultType: z.enum(["MID_TERM", "END_OF_TERM"]),
  assessments: z.array(
    z.object({
      id: z.string().optional(),
      categoryId: z.string().min(1, "Choose a parent category"),
      name: z.string().trim().min(1, "Assessment name is required"),
      maxObtainableScore: z
        .number({ message: "Enter a whole number greater than 0" })
        .int("Max marks must be a whole number")
        .positive("Max marks must be greater than 0"),
      total: z.number().int().positive().optional(),
      categoryMaxMarks: z.number().int().nonnegative().optional(),
    }),
  ),
});

type CreateSpreadsheetFormValues = z.infer<typeof createSpreadsheetSchema>;

function getSpreadsheetVisual(sheet: SpreadsheetSummary) {
  if (sheet.resultType === "MID_TERM" || sheet.termType === "MID_TERM") {
    return {
      bg: "bg-slate-100 text-slate-700 border-slate-200/80",
      typeBadge: "bg-slate-100 text-slate-700 border-slate-200/80",
      typeLabel: "Mid-Term",
    };
  }
  return {
    bg: "bg-blue-50 text-blue-600 border-blue-200/70",
    typeBadge: "bg-blue-50 text-blue-700 border-blue-200/80",
    typeLabel: "End-of-Term",
  };
}

export default function SpreadsheetsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentOrg, currentMember } = useOrganization();
  const isStaff = !!currentMember && currentMember.role !== "parent";
  const [spreadsheets, setSpreadsheets] = useState<SpreadsheetSummary[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"class" | "subject">(
    "class",
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isBulkActivating, setIsBulkActivating] = useState(false);
  const [additionalClassIds, setAdditionalClassIds] = useState<string[]>([]);
  const [conflictSheet, setConflictSheet] = useState<{
    id: string;
    title?: string | null;
    version?: number;
  } | null>(null);
  const [editTargetId, setEditTargetId] = useState<string | null>(null);
  const [isEditAssessmentsOpen, setIsEditAssessmentsOpen] = useState(false);
  const [isSavingAssessments, setIsSavingAssessments] = useState(false);
  const [editAssessmentForm, setEditAssessmentForm] = useState<{
    assessments: EditableAssessmentRow[];
  }>({ assessments: [] });
  const [editVersion, setEditVersion] = useState<number | undefined>(undefined);
  const [editStorageMode, setEditStorageMode] = useState<"LEGACY_JSON" | "RELATIONAL">("LEGACY_JSON");
  const [editTemplateId, setEditTemplateId] = useState<string | null>(null);
  const [editTemplateMetrics, setEditTemplateMetrics] = useState<AssessmentCategorySummary[]>([]);
  const [pendingPayload, setPendingPayload] = useState<Record<string, unknown> | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  const editAssessmentTotal = (editAssessmentForm.assessments || []).reduce(
    (sum, a) => sum + (Number(a.maxObtainableScore ?? a.total) || 0),
    0,
  );
  const editAssessmentFields = editAssessmentForm.assessments;
  const isEditRelational = editStorageMode === "RELATIONAL" || Boolean(editTemplateId);
  const editCategoryAllocations = useMemo(
    () =>
      computeCategoryAllocationSummary(
        editTemplateMetrics,
        editAssessmentForm.assessments.map((item) => ({
          categoryId: item.categoryId,
          maxMarks: Number(item.maxObtainableScore ?? item.total) || 0,
        })),
      ),
    [editAssessmentForm.assessments, editTemplateMetrics],
  );

  useEffect(() => {
    if (!editTargetId || !currentOrg) return;
    apiFetch<{
      version?: number;
      assessmentStorageMode?: "LEGACY_JSON" | "RELATIONAL";
      templateId?: string | null;
      assessmentCategories?: AssessmentCategorySummary[];
      assessments?: Array<{
        id?: string;
        categoryId?: string;
        categoryName?: string;
        maxObtainableScore?: number;
        categoryMaxMarks?: number;
        isSystemGenerated?: boolean;
        recordedScoreCount?: number;
        name?: string;
        total?: number;
      }>;
      template?: { assessmentCategories?: AssessmentCategorySummary[] } | null;
    }>(`/spreadsheets/${currentOrg.slug}/${editTargetId}`)
      .then((data) => {
        setEditVersion(data.version);
        setEditTemplateId(data.templateId || null);
        setEditStorageMode(
          data.assessmentStorageMode ?? (data.templateId ? "RELATIONAL" : "LEGACY_JSON"),
        );
        const assessments = Array.isArray(data?.assessments)
          ? data.assessments
          : [];
        const categories =
          Array.isArray(data.assessmentCategories) && data.assessmentCategories.length > 0
            ? data.assessmentCategories
            : data.template?.assessmentCategories || [];
        setEditTemplateMetrics(categories);

        setEditAssessmentForm({
          assessments:
            assessments.length > 0
              ? assessments.map((a) => ({
                  ...a,
                  name: a.name || "",
                  total: a.maxObtainableScore ?? a.total ?? 0,
                  maxObtainableScore: a.maxObtainableScore ?? a.total ?? 0,
                  categoryMaxMarks: a.categoryMaxMarks,
                  recordedScoreCount: a.recordedScoreCount ?? 0,
                }))
              : [],
        });
      })
      .catch(() => {
        toast.error("Failed to load spreadsheet structure");
        setEditAssessmentForm({ assessments: [] });
      });
  }, [editTargetId, currentOrg]);

  const prefilledSubjectId = searchParams.get("subjectId") || "";
  const prefilledClassId = searchParams.get("classLevelId") || "";

  const { isPrivileged, isSubjectTeacher, isAccountant } = usePermissions();
  const canCreate = isPrivileged || isSubjectTeacher;

  const [termTab, setTermTab] = useState<"ALL" | "MID_TERM" | "END_TERM">("ALL");
  const [availableTemplates, setAvailableTemplates] = useState<TemplateSummaryItem[]>([]);
  const [isTemplatesLoading, setIsTemplatesLoading] = useState(false);

  const form = useForm<CreateSpreadsheetFormValues>({
    resolver: zodResolver(createSpreadsheetSchema),
    defaultValues: {
      classId: "",
      subjectId: "",
      termType: "END_TERM",
      templateId: "",
      resultType: "END_OF_TERM",
      assessments: [],
    },
  });
  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "assessments",
  });
  const watchedAssessments = form.watch("assessments");
  const selectedClassId = form.watch("classId");
  const selectedSubjectId = form.watch("subjectId");
  const selectedTermType = form.watch("termType") || "END_TERM";
  const selectedResultType = form.watch("resultType");
  const selectedTemplateId = form.watch("templateId");
  const selectedTemplate = availableTemplates.find((template) => template.id === selectedTemplateId);
  const selectedTemplateCategories = useMemo(
    () => resolveTemplateCategories(selectedTemplate),
    [selectedTemplate],
  );
  const selectedCategoryById = useMemo(
    () => new Map(selectedTemplateCategories.map((category) => [category.id, category])),
    [selectedTemplateCategories],
  );
  const createCategoryAllocations = useMemo(() => {
    const fixedDefaults = selectedTemplateCategories
      .filter((category) => category.isSingleInstance)
      .map((category) => ({ categoryId: category.id, maxMarks: category.maxMarks }));
    const dynamicItems = (watchedAssessments || [])
      .filter((item) => !selectedCategoryById.get(item.categoryId)?.isSingleInstance)
      .map((item) => ({
        categoryId: item.categoryId,
        maxMarks: Number(item.maxObtainableScore ?? item.total) || 0,
      }));
    return computeCategoryAllocationSummary(selectedTemplateCategories, [
      ...fixedDefaults,
      ...dynamicItems,
    ]);
  }, [selectedCategoryById, selectedTemplateCategories, watchedAssessments]);
  const createAllocationById = useMemo(
    () => new Map(createCategoryAllocations.map((item) => [item.categoryId, item])),
    [createCategoryAllocations],
  );
  const totalTemplateMarks = selectedTemplateCategories.reduce(
    (sum, category) => sum + (Number(category.maxMarks) || 0),
    0,
  );
  const selectedClass = classes.find(
    (classOption) => classOption.id === selectedClassId,
  );
  const selectedSubject = subjects.find(
    (subjectOption) => subjectOption.id === selectedSubjectId,
  );

  const selectedClassSection = detectClassSection(selectedClass?.name);

  const applicableTemplates = useMemo(() => {
    if (!selectedClassId) return availableTemplates;
    const exact = availableTemplates.filter((template) => template.classLevelId === selectedClassId);
    if (exact.length > 0) return exact;
    const sectionMatches =
      selectedClassSection !== "ALL"
        ? availableTemplates.filter(
            (template) =>
              !template.classLevelId &&
              template.schoolSection === selectedClassSection,
          )
        : [];
    if (sectionMatches.length > 0) return sectionMatches;
    return availableTemplates.filter(
      (template) =>
        !template.classLevelId &&
        (!template.schoolSection || template.schoolSection === "ALL"),
    );
  }, [availableTemplates, selectedClassId, selectedClassSection]);

  useEffect(() => {
    if (!isDialogOpen || !currentOrg) return;
    let cancelled = false;
    const termTypeParam = selectedTermType || "END_TERM";
    setIsTemplatesLoading(true);
    apiFetch<{ success: boolean; data: TemplateSummaryItem[] } | TemplateSummaryItem[]>(
      `/result-templates/templates/${currentOrg.slug}`,
      {
        params: { termType: termTypeParam },
        showErrorToast: false,
      },
    )
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        setAvailableTemplates(list.filter((template) => template.isApproved));
      })
      .catch(() => {
        if (!cancelled) setAvailableTemplates([]);
      })
      .finally(() => {
        if (!cancelled) setIsTemplatesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isDialogOpen, currentOrg, selectedTermType]);

  function applyTemplateSelection(templateId: string) {
    form.setValue("templateId", templateId, { shouldValidate: true });
    replace([]);
  }

  useEffect(() => {
    if (!isDialogOpen) return;
    if (applicableTemplates.length === 0) {
      if (selectedTemplateId) {
        form.setValue("templateId", "");
        replace([]);
      }
      return;
    }
    const stillValid = applicableTemplates.some((template) => template.id === selectedTemplateId);
    if (stillValid) return;
    const preferred =
      applicableTemplates.find((template) => template.classLevelId === selectedClassId && template.isDefault) ||
      applicableTemplates.find((template) => template.classLevelId === selectedClassId) ||
      applicableTemplates.find((template) => template.isDefault) ||
      applicableTemplates[0];
    if (preferred) {
      applyTemplateSelection(preferred.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicableTemplates, isDialogOpen, selectedClassId, selectedTemplateId]);
  const teacherAssignments = useMemo(
    () =>
      Array.isArray(currentMember?.teachingAssignments)
        ? currentMember.teachingAssignments.filter(
          (assignment) =>
            assignment?.classLevel?.id && assignment?.subject?.id,
        )
        : [],
    [currentMember?.teachingAssignments],
  );

  const availableClasses = useMemo(() => {
    if (isPrivileged) {
      return classes;
    }
    if (isAccountant) {
      return [];
    }
    return classes.filter((classOption) =>
      teacherAssignments.some(
        (assignment) =>
          assignment.classLevel?.id === classOption.id &&
          (!selectedSubjectId || assignment.subject?.id === selectedSubjectId),
      ),
    );
  }, [classes, isPrivileged, isAccountant, selectedSubjectId, teacherAssignments]);

  const availableSubjects = useMemo(() => {
    if (isPrivileged) {
      return subjects;
    }
    if (isAccountant) {
      return [];
    }
    return subjects.filter((subjectOption) =>
      teacherAssignments.some(
        (assignment) =>
          assignment.subject?.id === subjectOption.id &&
          (!selectedClassId || assignment.classLevel?.id === selectedClassId),
      ),
    );
  }, [isPrivileged, isAccountant, selectedClassId, subjects, teacherAssignments]);

  useEffect(() => {
    async function fetchData() {
      if (!currentOrg) return;

      try {
        setIsLoading(true);
        const [sheetData, classData, subjectData] = await Promise.all([
          apiFetch<SpreadsheetSummary[]>(`/spreadsheets/${currentOrg.slug}`, {
            params: {
              ...(prefilledSubjectId ? { subjectId: prefilledSubjectId } : {}),
              ...(prefilledClassId ? { classLevelId: prefilledClassId } : {}),
            },
          }),
          apiFetch<ClassOption[]>(`/classes/${currentOrg.slug}`),
          apiFetch<SubjectOption[]>(`/subjects/${currentOrg.slug}`),
        ]);

        setSpreadsheets(sheetData);
        setClasses(classData);
        setSubjects(subjectData);
      } catch {
        toast.error("Failed to load spreadsheet data");
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [currentOrg, prefilledClassId, prefilledSubjectId]);

  useEffect(() => {
    if (
      prefilledClassId &&
      availableClasses.some(
        (classOption) => classOption.id === prefilledClassId,
      )
    ) {
      form.setValue("classId", prefilledClassId);
    }
  }, [availableClasses, form, prefilledClassId]);

  useEffect(() => {
    if (
      prefilledSubjectId &&
      availableSubjects.some(
        (subjectOption) => subjectOption.id === prefilledSubjectId,
      )
    ) {
      form.setValue("subjectId", prefilledSubjectId);
    }
  }, [availableSubjects, form, prefilledSubjectId]);

  useEffect(() => {
    if (
      selectedClassId &&
      !availableClasses.some(
        (classOption) => classOption.id === selectedClassId,
      )
    ) {
      form.setValue("classId", "");
    }
  }, [availableClasses, form, selectedClassId]);

  useEffect(() => {
    if (
      selectedSubjectId &&
      !availableSubjects.some(
        (subjectOption) => subjectOption.id === selectedSubjectId,
      )
    ) {
      form.setValue("subjectId", "");
    }
  }, [availableSubjects, form, selectedSubjectId]);

  const filteredSheets = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return spreadsheets
      .filter((sheet) => {
        if (termTab === "MID_TERM") {
          return sheet.termType === "MID_TERM" || sheet.resultType === "MID_TERM";
        }
        if (termTab === "END_TERM") {
          return sheet.termType === "END_TERM" || sheet.resultType === "END_OF_TERM";
        }
        return true;
      })
      .filter((sheet) => {
        const spreadsheetLabel = getSpreadsheetLabel(sheet);
        if (!normalizedQuery) {
          return true;
        }

        return [
          spreadsheetLabel,
          sheet.classLevel?.name,
          sheet.subject?.name,
          sheet.status,
          sheet.termType === "MID_TERM" || sheet.resultType === "MID_TERM" ? "mid-term" : "end-of-term",
        ]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalizedQuery));
      })
      .sort((left, right) => {
        const leftKey =
          activeFilter === "class"
            ? left.classLevel?.name || ""
            : left.subject?.name || "";
        const rightKey =
          activeFilter === "class"
            ? right.classLevel?.name || ""
            : right.subject?.name || "";

        return (
          leftKey.localeCompare(rightKey) ||
          getSpreadsheetLabel(left).localeCompare(getSpreadsheetLabel(right))
        );
      });
  }, [activeFilter, searchQuery, spreadsheets, termTab]);

  async function onCreate(values: CreateSpreadsheetFormValues) {
    if (!currentOrg) return;

    const template = availableTemplates.find((t) => t.id === values.templateId);
    const categories = resolveTemplateCategories(template);
    const categoryMap = new Map(categories.map((cat) => [cat.id, cat]));

    const dynamicEntries = values.assessments.filter(
      (item) => !categoryMap.get(item.categoryId)?.isSingleInstance,
    );

    // Reject duplicate sub-assessment names inside the same category
    const seenByCategory = new Map<string, Set<string>>();
    for (const item of dynamicEntries) {
      const cat = categoryMap.get(item.categoryId);
      if (!cat) {
        toast.error("Every sub-assessment must belong to a category from the selected template.");
        return;
      }
      const key = item.name.trim().toLowerCase();
      const seen = seenByCategory.get(item.categoryId) ?? new Set<string>();
      if (seen.has(key)) {
        toast.error(`Duplicate sub-assessment name "${item.name.trim()}" inside ${cat.name}.`);
        return;
      }
      seen.add(key);
      seenByCategory.set(item.categoryId, seen);
    }

    setIsCreating(true);
    try {
      const submittedAssessments = dynamicEntries.map((assessment) => ({
        name: assessment.name.trim(),
        maxObtainableScore: Number(assessment.maxObtainableScore),
        categoryId: assessment.categoryId,
      }));

      const combinedClassIds = Array.from(
        new Set([values.classId, ...additionalClassIds].filter(Boolean)),
      );
      const payload: Record<string, unknown> = {
        classLevel: values.classId,
        ...(combinedClassIds.length > 1 ? { classLevels: combinedClassIds } : {}),
        subject: values.subjectId,
        termType: values.termType,
        templateId: values.templateId,
        resultType: values.termType === "MID_TERM" ? "MID_TERM" : "END_OF_TERM",
        ...(submittedAssessments.length > 0 ? { assessments: submittedAssessments } : {}),
      };

      const created = await apiFetch<CreatedSpreadsheet>(
        `/spreadsheets/${currentOrg.slug}`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );

      if (created.created === false) {
        setIsCreating(false);
        setPendingPayload(payload);
        setConflictSheet({ id: created.id, title: created.title ?? null, version: created.version });
        return;
      }

      toast.success("Spreadsheet created successfully");
      setIsDialogOpen(false);
      setAdditionalClassIds([]);
      form.reset({
        classId: prefilledClassId,
        subjectId: prefilledSubjectId,
        termType: values.termType,
        templateId: "",
        resultType: values.resultType,
        assessments: [],
      });
      const targetId = created.id;
      router.push(
        `/dashboard/school/${currentOrg.slug}/spreadsheets/${targetId}`,
      );
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to create spreadsheet"));
    } finally {
      setIsCreating(false);
    }
  }

  const nonActiveSheetsInTab = useMemo(() => {
    return spreadsheets.filter((sheet) => {
      if (sheet.status === "active") return false;
      if (termTab === "ALL") return true;
      const sheetTerm =
        sheet.termType || (sheet.resultType === "MID_TERM" ? "MID_TERM" : "END_TERM");
      return sheetTerm === termTab;
    });
  }, [spreadsheets, termTab]);

  async function handleBulkActivateAll() {
    if (!currentOrg || !isPrivileged || isBulkActivating) return;
    setIsBulkActivating(true);
    try {
      const res = await apiFetch<{
        ok: boolean;
        updatedCount: number;
        skippedCount: number;
        updatedIds?: string[];
      }>(`/spreadsheets/${currentOrg.slug}/bulk-status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "active",
          ...(termTab !== "ALL" ? { termType: termTab } : {}),
        }),
      });
      const updatedSet = new Set(res.updatedIds || []);
      if (updatedSet.size > 0) {
        setSpreadsheets((prev) =>
          prev.map((s) => (updatedSet.has(s.id) ? { ...s, status: "active" } : s)),
        );
      }
      if (res.updatedCount > 0 && res.skippedCount > 0) {
        toast.success(
          `Activated ${res.updatedCount} spreadsheet${res.updatedCount === 1 ? "" : "s"} (${res.skippedCount} skipped due to mark allocation issues).`,
        );
      } else if (res.updatedCount > 0) {
        toast.success(
          `Set ${res.updatedCount} spreadsheet${res.updatedCount === 1 ? "" : "s"} to active.`,
        );
      } else if (res.skippedCount > 0) {
        toast.error(
          `${res.skippedCount} spreadsheet${res.skippedCount === 1 ? "" : "s"} could not be activated due to mark allocation issues.`,
        );
      } else {
        toast.info("All spreadsheets are already active.");
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to activate spreadsheets"));
    } finally {
      setIsBulkActivating(false);
    }
  }

  const displayName = getDisplayName(currentMember?.user?.name);
  const orgSlug = currentOrg?.slug;
  const backHref = prefilledSubjectId
    ? `/dashboard/school/${orgSlug}/subjects/${prefilledSubjectId}`
    : prefilledClassId
      ? `/dashboard/school/${orgSlug}/classes/${prefilledClassId}`
      : `/dashboard/school/${orgSlug}`;
  const backLabel = prefilledSubjectId
    ? "Back to Subject"
    : prefilledClassId
      ? "Back to Class"
      : "Back to Overview";

  if (!isStaff) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-4 p-6">
        {orgSlug && <BackButton href={`/dashboard/school/${orgSlug}`} label="Back to Overview" />}
        <DataStateCard
          variant="forbidden"
          title="Grade spreadsheets aren't available to your role"
          description="This is a staff tool for teachers and admins."
        />
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:gap-6 md:px-4 md:py-4 lg:px-6 lg:py-6">
        {/* Phones: Hairline Directory List */}
        <div className="flex flex-col gap-3 md:hidden">
          {canCreate && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={() => setIsDialogOpen(true)}
                className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs active:scale-[0.98] transition"
              >
                <Plus className="h-4 w-4" />
                <span>Create Spreadsheet</span>
              </Button>
              {isPrivileged && nonActiveSheetsInTab.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isBulkActivating}
                  onClick={() => void handleBulkActivateAll()}
                  className="shrink-0 rounded-xl border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold"
                >
                  {isBulkActivating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  <span className="ml-1.5">Set All Active ({nonActiveSheetsInTab.length})</span>
                </Button>
              )}
            </div>
          )}

          {/* Mobile Search Input */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="search"
              placeholder="Search spreadsheets..."
              aria-label="Search spreadsheets"
              className="rounded-xl bg-white pl-9 border-slate-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Segmented Control / Tabs */}
          <div
            role="tablist"
            aria-label="Filter spreadsheets by term stage"
            className="grid grid-cols-3 rounded-xl bg-slate-100 p-1 border border-slate-200/80"
          >
            <button
              type="button"
              role="tab"
              aria-selected={termTab === "ALL"}
              onClick={() => setTermTab("ALL")}
              className={cn(
                "min-h-11 px-2 text-xs font-semibold rounded-lg transition-all text-center",
                termTab === "ALL"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              All Sheets
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={termTab === "MID_TERM"}
              onClick={() => setTermTab("MID_TERM")}
              className={cn(
                "min-h-11 px-2 text-xs font-semibold rounded-lg transition-all text-center",
                termTab === "MID_TERM"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              Mid-Term
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={termTab === "END_TERM"}
              onClick={() => setTermTab("END_TERM")}
              className={cn(
                "min-h-11 px-2 text-xs font-semibold rounded-lg transition-all text-center",
                termTab === "END_TERM"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              End-of-Term
            </button>
          </div>

          {/* Quiet Meta Count */}
          <p className="px-1 text-xs font-medium text-slate-600 tabular-nums">
            {filteredSheets.length} {filteredSheets.length === 1 ? "spreadsheet" : "spreadsheets"}
          </p>

          {/* Mobile Single-Container Hairline List */}
          <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white divide-y divide-slate-100">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                  <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))
            ) : filteredSheets.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm font-semibold text-slate-800">
                  {searchQuery ? "No spreadsheets match your search." : "No spreadsheets yet."}
                </p>
              </div>
            ) : (
              filteredSheets.map((sheet) => {
                const sheetLabel = getSpreadsheetLabel(sheet);
                const visual = getSpreadsheetVisual(sheet);
                const isPublished = sheet.status === "active";
                const href = `/dashboard/school/${orgSlug}/spreadsheets/${sheet.id}`;

                return (
                  <div
                    key={sheet.id}
                    className="group flex items-center gap-2 pr-2 transition-colors"
                  >
                    <Link
                      href={href}
                      className="flex min-h-[72px] min-w-0 flex-1 items-center gap-3 py-3 pl-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 active:bg-slate-50"
                    >
                      <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl border", visual.bg)}>
                        <FileSpreadsheet className="size-5" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-[15px] font-semibold text-[#0B1220] group-hover:text-blue-600">
                          {sheetLabel}
                        </h2>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span className={cn("rounded-md px-1.5 py-0.5 text-xs font-medium border", visual.typeBadge)}>
                            {visual.typeLabel}
                          </span>
                          {isPublished ? (
                            <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200/70 bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-800">
                              <CheckCircle2 className="size-3 text-emerald-600" aria-hidden="true" />
                              Published
                            </span>
                          ) : (
                            <span className="rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700">
                              Draft
                            </span>
                          )}
                        </div>
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {sheet.classLevel?.name ? `${sheet.classLevel.name} · ` : ""}
                          {format(new Date(sheet.createdAt), "MMM d, yyyy")}
                        </p>
                      </div>
                    </Link>

                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 shrink-0 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                            aria-label={`Options for ${sheetLabel}`}
                          >
                            <MoreHorizontal className="size-5" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(href)}>
                          Open Spreadsheet
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setEditTargetId(sheet.id);
                            setIsEditAssessmentsOpen(true);
                          }}
                          disabled={Boolean(sheet.hcoreAssessmentId)}
                        >
                          Edit Structure
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })
            )}
          </section>
        </div>

        {/* Desktop Sections */}
        <div className="hidden md:block">
          {orgSlug && <BackButton href={backHref} label={backLabel} />}
          {/* Header Section (phones: the top bar names the page; the list starts right away) */}
          <section className="px-3 sm:px-4 md:px-0">
          <div className="flex flex-col gap-3 md:gap-5">
            {/* Welcome & Action Row */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between md:gap-4">
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-4xl">
                  Welcome,{" "}
                  <span className="text-blue-600">
                    {displayName}
                  </span>
                </h1>
                <p className="mt-2 hidden text-base leading-relaxed text-slate-600 md:block">
                  Open a class sheet, jump into the right assessment, and enter
                  scores with fewer taps.
                </p>
              </div>

              {canCreate && (
                <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                  {isPrivileged && nonActiveSheetsInTab.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isBulkActivating}
                      onClick={() => void handleBulkActivateAll()}
                      className="h-12 w-full shrink-0 rounded-xl border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 transition-all hover:bg-emerald-100 sm:w-auto"
                    >
                      {isBulkActivating ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                      )}
                      Set All Active ({nonActiveSheetsInTab.length})
                    </Button>
                  )}
                  <Button
                    type="button"
                    onClick={() => setIsDialogOpen(true)}
                    className="h-12 w-full shrink-0 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700 hover:shadow-blue-600/30 active:scale-[0.98] sm:w-auto sm:px-5"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    New Sheet
                  </Button>
                </div>
              )}
            </div>

            {/* Search & Filter Row */}
            <div className="flex flex-col gap-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-400 sm:left-5 sm:h-5 sm:w-5" />
                <Input
                  type="search"
                  placeholder="Search class, subject or status"
                  aria-label="Search spreadsheets"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="h-12 rounded-xl border border-slate-200 bg-white pl-10 pr-12 shadow-none placeholder:text-slate-600 focus-visible:border-blue-500 focus-visible:ring-blue-200 sm:h-14 sm:border-2 sm:border-blue-200 sm:pl-12 sm:text-base lg:h-16"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                    className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-600 sm:right-2"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex flex-row items-center justify-between gap-3 sm:mt-2">
                <div className="hidden items-center gap-2 text-blue-950 sm:flex">
                  <span className="text-2xl font-bold tracking-tight lg:text-3xl">
                    Filter
                  </span>
                  <Filter className="h-5 w-5" />
                </div>

                <div className="flex w-full flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:w-auto">
                  {/* Term Type Tabs: All | Mid-Term | End-Term */}
                  <div
                    role="group"
                    aria-label="Filter spreadsheets by term period"
                    className="grid grid-cols-3 rounded-xl bg-slate-100 p-1 sm:inline-flex sm:flex-none sm:bg-blue-100/80 sm:shadow-inner"
                  >
                    <button
                      type="button"
                      onClick={() => setTermTab("ALL")}
                      aria-pressed={termTab === "ALL"}
                      className={`min-h-11 rounded-lg px-3 text-xs sm:text-sm font-semibold transition sm:min-w-24 ${
                        termTab === "ALL"
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-blue-700 hover:bg-blue-200/50"
                      }`}
                    >
                      All Sheets
                    </button>
                    <button
                      type="button"
                      onClick={() => setTermTab("MID_TERM")}
                      aria-pressed={termTab === "MID_TERM"}
                      className={`min-h-11 rounded-lg px-3 text-xs sm:text-sm font-semibold transition sm:min-w-28 ${
                        termTab === "MID_TERM"
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-blue-700 hover:bg-blue-200/50"
                      }`}
                    >
                      Mid-Term
                    </button>
                    <button
                      type="button"
                      onClick={() => setTermTab("END_TERM")}
                      aria-pressed={termTab === "END_TERM"}
                      className={`min-h-11 rounded-lg px-3 text-xs sm:text-sm font-semibold transition sm:min-w-28 ${
                        termTab === "END_TERM"
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-blue-700 hover:bg-blue-200/50"
                      }`}
                    >
                      End-Term
                    </button>
                  </div>

                  <div role="group" aria-label="Group sheets by" className="grid flex-1 grid-cols-2 rounded-xl bg-slate-100 p-1 sm:inline-flex sm:flex-none sm:bg-blue-100/80 sm:shadow-inner">
                    <button
                      type="button"
                      onClick={() => setActiveFilter("class")}
                      aria-pressed={activeFilter === "class"}
                      className={`min-h-11 rounded-lg px-3 text-sm font-semibold transition sm:pointer-fine:min-h-0 sm:min-w-28 sm:px-4 sm:py-2 ${activeFilter === "class"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-blue-600 hover:bg-blue-200/50"
                        }`}
                    >
                      <span className="sm:hidden">By class</span>
                      <span className="hidden sm:inline">Class</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveFilter("subject")}
                      aria-pressed={activeFilter === "subject"}
                      className={`min-h-11 rounded-lg px-3 text-sm font-semibold transition sm:pointer-fine:min-h-0 sm:min-w-28 sm:px-4 sm:py-2 ${activeFilter === "subject"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-blue-600 hover:bg-blue-200/50"
                        }`}
                    >
                      <span className="sm:hidden">By subject</span>
                      <span className="hidden sm:inline">Subject</span>
                    </button>
                  </div>

                  {/* View Toggle - Mobile Friendly */}
                  <div className="hidden sm:flex items-center rounded-xl border border-blue-200 bg-white p-0.5 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setViewMode("list")}
                      className={`rounded-lg p-1.5 transition ${viewMode === "list"
                        ? "bg-blue-600 text-white"
                        : "text-slate-600 hover:text-slate-600 hover:bg-slate-50"
                        }`}
                      title="List view"
                    >
                      <List className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("grid")}
                      className={`rounded-lg p-1.5 transition ${viewMode === "grid"
                        ? "bg-blue-600 text-white"
                        : "text-slate-600 hover:text-slate-600 hover:bg-slate-50"
                        }`}
                      title="Grid view"
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Sheets Grid/List */}
        <section>
          {isLoading ? (
            <div className="grid gap-3 sm:gap-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <Skeleton className="h-12 w-12 rounded-lg sm:h-14 sm:w-14" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-32 sm:w-40" />
                      <Skeleton className="h-4 w-24 sm:w-28" />
                    </div>
                    <Skeleton className="h-8 w-8 rounded-full sm:h-10 sm:w-10" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredSheets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center sm:p-8 md:border-blue-200 md:p-12 md:shadow-[0_12px_35px_rgba(37,99,235,0.05)]">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-blue-50 sm:h-16 sm:w-16">
                <FileSpreadsheet className="h-7 w-7 text-blue-600 sm:h-8 sm:w-8" />
              </div>
              <h2 className="mt-3 text-lg font-semibold text-slate-900 sm:mt-4 sm:text-xl">
                {searchQuery
                  ? "No sheets match your search"
                  : "No spreadsheets yet"}
              </h2>
              <p className="mt-1.5 text-sm text-slate-600 sm:mt-2">
                {searchQuery
                  ? "Try another class, subject, or status keyword."
                  : canCreate
                    ? "Create a spreadsheet to start entering scores for your assigned classes."
                    : "No subject spreadsheets have been created for your classes yet."}
              </p>
              {canCreate && !searchQuery && (
                <Button
                  onClick={() => setIsDialogOpen(true)}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 sm:mt-6"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create your first sheet
                </Button>
              )}
            </div>
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4"
                  : "overflow-hidden rounded-2xl border border-slate-200 bg-white max-sm:divide-y max-sm:divide-slate-100 sm:space-y-4 sm:overflow-visible sm:rounded-none sm:border-0 sm:bg-transparent"
              }
            >
              {filteredSheets.map((sheet) => {
                const sheetLabel = getSpreadsheetLabel(sheet);
                const isGridView = viewMode === "grid";

                return (
                  <div
                    key={sheet.id}
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      router.push(
                        `/dashboard/school/${currentOrg?.slug}/spreadsheets/${sheet.id}`,
                      )
                    }
                    onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
                      if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        router.push(
                          `/dashboard/school/${currentOrg?.slug}/spreadsheets/${sheet.id}`,
                        );
                      }
                    }}
                    className={`group w-full bg-white text-left transition-all active:bg-slate-50 ${isGridView
                      ? "flex flex-col rounded-xl border border-slate-200 p-4 shadow-sm sm:p-5"
                      : "px-4 py-3 sm:rounded-xl sm:border sm:border-slate-200 sm:p-5 sm:shadow-sm"
                      } motion-safe:sm:hover:-translate-y-0.5 motion-reduce:transition-none sm:hover:border-blue-200 sm:hover:shadow-md`}
                  >
                    <div
                      className={
                        isGridView
                          ? "flex flex-col gap-3"
                          : "flex items-center gap-3 sm:gap-4"
                      }
                    >
                      <div
                        className={`flex items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100/60 ${isGridView
                          ? "h-12 w-12 sm:h-14 sm:w-14"
                          : "h-10 w-10 shrink-0 sm:h-14 sm:w-14"
                          }`}
                        aria-hidden
                      >
                        {activeFilter === "class" ? (
                          <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6" />
                        ) : (
                          <BookOpen className="h-5 w-5 sm:h-6 sm:w-6" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h2
                          className={`line-clamp-2 break-words font-bold tracking-tight text-slate-950 group-hover:text-blue-700 sm:line-clamp-none sm:truncate ${isGridView
                            ? "text-sm sm:text-base"
                            : "text-[15px] font-semibold sm:text-lg sm:font-bold lg:text-xl"
                            }`}
                        >
                          {sheetLabel}
                        </h2>

                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <Badge
                            variant="outline"
                            className={`shrink-0 px-2 py-0 text-xs capitalize sm:px-2.5 sm:py-0.5 ${getStatusClassName(
                              sheet.status,
                            )}`}
                          >
                            {sheet.status}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="shrink-0 border-blue-200 bg-blue-50 px-2 py-0 text-xs text-blue-700 sm:px-2.5 sm:py-0.5"
                          >
                            {sheet.resultType === "MID_TERM" ? "Mid-term" : "End-of-term"}
                          </Badge>
                          {sheet.hcoreAssessmentId ? (
                            <Badge
                              variant="outline"
                              className="shrink-0 gap-1 border-slate-200 bg-slate-50 px-2 py-0 text-xs text-slate-600 sm:px-2.5 sm:py-0.5"
                            >
                              <Lock className="h-3 w-3" aria-hidden="true" />
                              Structure locked
                            </Badge>
                          ) : null}
                          <span className="text-slate-300">&bull;</span>
                          <p
                            className="truncate text-xs text-slate-600"
                          >
                            {format(new Date(sheet.createdAt), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditTargetId(sheet.id);
                            setIsEditAssessmentsOpen(true);
                          }}
                          disabled={Boolean(sheet.hcoreAssessmentId)}
                          className="flex h-11 w-11 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:opacity-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 sm:h-9 sm:w-9 sm:border sm:border-blue-100 sm:hover:border-slate-300 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 disabled:[@media(hover:hover)]:opacity-100"
                          title={sheet.hcoreAssessmentId ? "Assessment structure is locked after publication" : "Edit assessments"}
                          aria-label={sheet.hcoreAssessmentId ? "Assessment structure locked after publication" : "Edit assessments"}
                        >
                          {sheet.hcoreAssessmentId ? (
                            <Lock className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(
                              `/dashboard/school/${currentOrg?.slug}/spreadsheets/${sheet.id}`,
                            );
                          }}
                          className={`hidden items-center justify-center rounded-full border border-blue-100 bg-white text-blue-700 shadow-sm transition hover:bg-blue-600 hover:text-white sm:flex ${isGridView ? "sm:h-9 sm:w-9" : "sm:h-10 sm:w-10"}`}
                          aria-label="Open sheet"
                        >
                          <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Sheet Count */}
          {!isLoading && filteredSheets.length > 0 && (
            <p className="mt-4 text-center text-xs text-slate-600 sm:mt-6 sm:text-sm">
              Showing {filteredSheets.length} of {spreadsheets.length}{" "}
              spreadsheets
            </p>
          )}
        </section>
        </div>
      </div>

      {/* Create Spreadsheet Dialog (mounted at root for both mobile & desktop triggers) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[580px]">
          <DialogHeader>
            <DialogTitle>Create Assessment Spreadsheet</DialogTitle>
            <DialogDescription>
              Parent assessment categories and maximum marks come from your school&apos;s approved result template. Add as many sub-assessments as needed—scores automatically scale to each category cap.
              {!isPrivileged &&
                " Teachers can only create spreadsheets for their assigned class and subject."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onCreate)}
              className="space-y-4 py-2"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="classId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class *</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={(value) => {
                            const classId = String(value ?? "");
                            field.onChange(classId);
                          }}
                          value={field.value ?? ""}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select class" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableClasses.map((classOption) => (
                              <SelectItem
                                key={classOption.id}
                                value={String(classOption.id)}
                              >
                                {classOption.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subjectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject *</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={(value) =>
                            field.onChange(String(value ?? ""))
                          }
                          value={field.value ?? ""}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select subject" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableSubjects.map((subjectOption) => (
                              <SelectItem
                                key={subjectOption.id}
                                value={String(subjectOption.id)}
                              >
                                {subjectOption.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {selectedClassId && availableClasses.length > 1 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-700">
                      Combine additional class arms (optional)
                    </span>
                    {additionalClassIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setAdditionalClassIds([])}
                        className="text-xs font-medium text-blue-600 hover:underline"
                      >
                        Clear ({additionalClassIds.length})
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Select other arms taking this subject to enter scores for all their students in one sheet.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {availableClasses
                      .filter((c) => String(c.id) !== String(selectedClassId))
                      .map((clsOpt) => {
                        const cid = String(clsOpt.id);
                        const checked = additionalClassIds.includes(cid);
                        return (
                          <button
                            key={cid}
                            type="button"
                            aria-pressed={checked}
                            onClick={() =>
                              setAdditionalClassIds((prev) =>
                                prev.includes(cid)
                                  ? prev.filter((id) => id !== cid)
                                  : [...prev, cid],
                              )
                            }
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors",
                              checked
                                ? "border-blue-600 bg-blue-600 text-white shadow-2xs"
                                : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/60",
                            )}
                          >
                            <span>{clsOpt.name}</span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="termType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Term Period *</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          const nextTerm = value as "MID_TERM" | "END_TERM" | "CUSTOM";
                          field.onChange(nextTerm);
                          form.setValue(
                            "resultType",
                            nextTerm === "MID_TERM" ? "MID_TERM" : "END_OF_TERM",
                          );
                          form.setValue("templateId", "");
                          replace([]);
                        }}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Choose term period" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="MID_TERM">Mid-Term</SelectItem>
                          <SelectItem value="END_TERM">End-Term</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="templateId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Approved Result Template *</FormLabel>
                      <Select
                        value={field.value || undefined}
                        onValueChange={(value) => {
                          applyTemplateSelection(String(value ?? ""));
                        }}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue
                              placeholder={
                                isTemplatesLoading
                                  ? "Loading approved templates..."
                                  : applicableTemplates.length === 0
                                    ? "No approved template found"
                                    : "Select template"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {applicableTemplates.map((tmpl) => (
                            <SelectItem key={tmpl.id} value={tmpl.id}>
                              {tmpl.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Auto-Naming Preview */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                <span className="font-semibold text-slate-700">Spreadsheet Name:</span>
                <p className="mt-1 font-mono text-[#1447E6]">
                  {buildSpreadsheetTitle(
                    selectedSubject?.name || "Subject",
                    selectedClass?.name || "Class",
                    selectedTermType as TermType,
                  )}
                </p>
              </div>

              {/* Inherited Admin Categories (Locked) */}
              {selectedTemplate && selectedTemplateCategories.length > 0 ? (
                <div className="space-y-3 border-t border-slate-200 pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Inherited Parent Categories
                      </p>
                      <p className="text-xs text-slate-600">
                        Admin category maximums are locked. Add sub-assessments now or inside the spreadsheet—scores average automatically to each cap.
                      </p>
                    </div>
                    <span
                      role="status"
                      className="text-xs font-semibold tabular-nums text-[#1447E6]"
                    >
                      {selectedTemplateCategories.length} categories · {totalTemplateMarks} max marks
                    </span>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {createCategoryAllocations.map((cat) => (
                      <div
                        key={cat.categoryId}
                        className={cn(
                          "rounded-xl border p-2.5 text-xs transition-colors",
                          cat.isComplete
                            ? "border-emerald-200 bg-emerald-50/40"
                            : "border-slate-200 bg-slate-50/70",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900">
                            <Lock className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                            {cat.name}
                          </span>
                          <span className="font-bold tabular-nums text-slate-900">
                            {cat.maxMarks} max
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between gap-2">
                          {cat.isSingleInstance ? (
                            <span className="text-[11px] font-medium text-slate-600">
                              Fixed by admin · auto-created
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-600 tabular-nums">
                              {cat.subAssessmentCount === 0
                                ? `Auto-scales to ${cat.maxMarks} marks`
                                : `${cat.subAssessmentCount} ${cat.subAssessmentCount === 1 ? "sub" : "subs"} · ${cat.allocatedMarks} raw → ${cat.maxMarks}`}
                            </span>
                          )}
                          {!cat.isSingleInstance && (
                            <button
                              type="button"
                              onClick={() => {
                                const existingInCat = (watchedAssessments || []).filter(
                                  (item) => item.categoryId === cat.categoryId,
                                ).length;
                                const defaultMarks = cat.maxMarks > 0 ? cat.maxMarks : 10;
                                append({
                                  id: crypto.randomUUID(),
                                  categoryId: cat.categoryId,
                                  name: `${cat.name} ${existingInCat + 1}`,
                                  maxObtainableScore: defaultMarks,
                                  total: defaultMarks,
                                  categoryMaxMarks: cat.maxMarks,
                                });
                              }}
                              className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-[#1447E6] ring-1 ring-blue-200 hover:bg-[#EEF0FF] pointer-coarse:min-h-11"
                            >
                              <Plus className="h-3 w-3" aria-hidden="true" />
                              Add
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Dynamic sub-assessments staged at creation */}
                  {fields.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <p className="text-xs font-semibold text-slate-700">
                        Sub-assessments to create ({fields.length})
                      </p>
                      {fields.map((assessmentField, index) => {
                        const assessment = watchedAssessments[index];
                        const category = selectedCategoryById.get(assessment?.categoryId || "");
                        const allocation = createAllocationById.get(assessment?.categoryId || "");
                        return (
                          <div
                            key={assessmentField.id}
                            className="grid grid-cols-[minmax(0,1fr)_88px_36px] items-start gap-2 rounded-xl border border-slate-200 bg-white p-2.5"
                          >
                            <div className="space-y-1.5">
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                                {category?.name || "Category"}
                                {allocation && (
                                  <span className="tabular-nums text-slate-500">
                                    · scales to {allocation.maxMarks}
                                  </span>
                                )}
                              </span>
                              <FormField
                                control={form.control}
                                name={`assessments.${index}.name`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input
                                        placeholder="e.g. Classwork 1"
                                        {...field}
                                        className="h-9 text-sm"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            <FormField
                              control={form.control}
                              name={`assessments.${index}.maxObtainableScore`}
                              render={({ field }) => (
                                <FormItem className="pt-5">
                                  <FormControl>
                                    <Input
                                      type="number"
                                      inputMode="numeric"
                                      min={1}
                                      step={1}
                                      aria-label={`Maximum marks for ${assessment?.name || `sub-assessment ${index + 1}`}`}
                                      placeholder="Marks"
                                      value={Number.isFinite(field.value) ? field.value : ""}
                                      onChange={(event) => {
                                        const parsed = Number.parseInt(event.target.value, 10);
                                        field.onChange(Number.isFinite(parsed) ? parsed : 0);
                                      }}
                                      className="h-9 text-center text-sm font-semibold tabular-nums"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="mt-5 h-9 w-9"
                              onClick={() => remove(index)}
                              aria-label={`Remove ${assessment?.name || `sub-assessment ${index + 1}`}`}
                              title="Remove sub-assessment"
                            >
                              <Delete className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900">
                  {isTemplatesLoading
                    ? "Loading approved result templates for this term period..."
                    : availableTemplates.length === 0
                      ? "No approved result template exists for this term period yet. Ask a school administrator to approve one in Result Templates."
                      : "Select a class and approved result template to load locked parent category maximums."}
                </div>
              )}

              <DialogFooter className="flex-col-reverse gap-2 pt-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="w-full bg-[#1447E6] hover:bg-[#123ecc] sm:w-auto"
                  disabled={
                    isCreating ||
                    availableClasses.length === 0 ||
                    availableSubjects.length === 0 ||
                    !selectedTemplateId
                  }
                >
                  {isCreating && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Spreadsheet
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Conflict Dialog */}
      <Dialog
        open={!!conflictSheet}
        onOpenChange={(open) => {
          if (!open) setConflictSheet(null);
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-800">
              <BookOpen className="h-5 w-5" />
              Spreadsheet Already Exists
            </DialogTitle>
            <DialogDescription className="pt-2 leading-relaxed">
              A spreadsheet already exists for this class, subject, and term period. If the existing sheet has no recorded scores, you can reset its assessment structure, or you can edit its assessments directly.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            <Button
              variant="outline"
              className="justify-start gap-3 border-amber-200 bg-amber-50/50 py-6 text-amber-800 hover:bg-amber-100 hover:text-amber-900"
              onClick={async () => {
                if (!conflictSheet || !currentOrg || !pendingPayload) return;
                setIsDialogOpen(false);
                setConflictSheet(null);
                setPendingPayload(null);
                setIsCreating(true);
                try {
                  const replaced = await apiFetch<CreatedSpreadsheet>(
                    `/spreadsheets/${currentOrg.slug}`,
                    {
                      method: "POST",
                      body: JSON.stringify({
                        ...pendingPayload,
                        forceReplace: true,
                        expectedVersion: conflictSheet.version,
                      }),
                    },
                  );
                  toast.success("Empty spreadsheet reset successfully");
                  setIsCreating(false);
                  form.reset({
                    classId: prefilledClassId,
                    subjectId: prefilledSubjectId,
                    resultType: selectedResultType,
                    termType: selectedTermType,
                    templateId: "",
                    assessments: [],
                  });
                  const targetId = replaced.id;
                  router.push(
                    `/dashboard/school/${currentOrg.slug}/spreadsheets/${targetId}`,
                  );
                } catch (err: unknown) {
                  setIsCreating(false);
                  toast.error(
                    err instanceof Error
                      ? err.message
                      : "Failed to reset spreadsheet",
                  );
                }
              }}
            >
              <RefreshCw className="h-5 w-5 shrink-0" />
              <div className="text-left">
                <p className="text-sm font-semibold">Reset Empty Spreadsheet</p>
                <p className="text-xs text-amber-800">
                  Reset structure if no scores are recorded
                </p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="justify-start gap-3 border-blue-200 bg-blue-50/50 py-6 text-blue-800 hover:bg-blue-100 hover:text-blue-900"
              onClick={() => {
                if (!conflictSheet) return;
                setEditTargetId(conflictSheet.id);
                setConflictSheet(null);
                setIsEditAssessmentsOpen(true);
              }}
            >
              <Pencil className="h-5 w-5 shrink-0" />
              <div className="text-left">
                <p className="text-sm font-semibold">Edit Assessments</p>
                <p className="text-xs text-blue-600">
                  Configure sub-assessments within admin limits
                </p>
              </div>
            </Button>
            <Button
              variant="ghost"
              className="text-slate-600"
              onClick={() => setConflictSheet(null)}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Assessments Dialog */}
      <Dialog
        open={isEditAssessmentsOpen}
        onOpenChange={(open) => {
          setIsEditAssessmentsOpen(open);
          if (!open) setEditTargetId(null);
        }}
      >
        <DialogContent className="sm:max-w-[580px]">
          <DialogHeader>
            <DialogTitle>Edit Assessment Structure</DialogTitle>
            <DialogDescription>
              {isEditRelational
                ? "Parent category maximums are locked by your school administrator. Add or edit sub-assessments freely—scores automatically scale to each category cap."
                : "Edit the assessment names and maximum marks on this historical spreadsheet."}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!editTargetId || !currentOrg) return;

              for (const item of editAssessmentForm.assessments) {
                if (!item.name.trim()) {
                  toast.error("Every assessment needs a name.");
                  return;
                }
                const marks = Number(item.maxObtainableScore ?? item.total);
                if (!Number.isInteger(marks) || marks <= 0) {
                  toast.error(`"${item.name.trim()}" maximum marks must be a positive whole number.`);
                  return;
                }
              }

              setIsSavingAssessments(true);
              try {
                if (isEditRelational) {
                  await apiFetch(
                    `/spreadsheets/${currentOrg.slug}/${editTargetId}/sub-assessments`,
                    {
                      method: "PUT",
                      body: JSON.stringify({
                        ...(editVersion !== undefined ? { expectedVersion: editVersion } : {}),
                        subAssessments: editAssessmentForm.assessments
                          .filter((item) => !item.isSystemGenerated)
                          .map((item, position) => ({
                            ...(item.id ? { id: item.id } : {}),
                            categoryId: item.categoryId,
                            name: item.name.trim(),
                            maxMarks: Number(item.maxObtainableScore ?? item.total),
                            position,
                          })),
                      }),
                    },
                  );
                } else {
                  await apiFetch(
                    `/spreadsheets/${currentOrg.slug}/${editTargetId}`,
                    {
                      method: "PATCH",
                      body: JSON.stringify({
                        ...(editVersion !== undefined ? { expectedVersion: editVersion } : {}),
                        assessments: editAssessmentForm.assessments.map((item) => ({
                          name: item.name.trim(),
                          total: Number(item.total || item.maxObtainableScore),
                        })),
                      }),
                    },
                  );
                }
                toast.success("Assessments updated");
                setIsEditAssessmentsOpen(false);
                setEditTargetId(null);
                router.push(
                  `/dashboard/school/${currentOrg.slug}/spreadsheets/${editTargetId}`,
                );
              } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : "Failed to update assessments");
              } finally {
                setIsSavingAssessments(false);
              }
            }}
            className="space-y-4 py-2"
          >
            <div className="space-y-3 border-t border-slate-200 pt-4">
              {isEditRelational && editCategoryAllocations.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {editCategoryAllocations.map((cat) => (
                    <div
                      key={cat.categoryId}
                      className={cn(
                        "rounded-xl border p-2.5 text-xs",
                        cat.isComplete
                          ? "border-emerald-200 bg-emerald-50/40"
                          : "border-amber-200 bg-amber-50/40",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-900">
                          <Lock className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                          {cat.name}
                        </span>
                        <span className="font-bold tabular-nums text-slate-900">
                          {cat.maxMarks} max
                        </span>
                      </div>
                      <p
                        className={cn(
                          "mt-1 text-[11px] font-medium tabular-nums",
                          cat.isComplete ? "text-emerald-700" : "text-amber-800",
                        )}
                      >
                        {cat.isSingleInstance
                          ? "Fixed by administrator"
                          : cat.isComplete
                            ? `${cat.subAssessmentCount} ${cat.subAssessmentCount === 1 ? "sub" : "subs"} · ${cat.allocatedMarks} raw → ${cat.maxMarks} max`
                            : `No subs yet · scales to ${cat.maxMarks}`}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <label className="text-sm font-medium leading-none">
                  {isEditRelational ? "Sub-Assessments" : "Assessments *"}
                </label>
                <Badge
                  variant="outline"
                  role="status"
                  className={
                    editAssessmentTotal > 0 && (isEditRelational || editAssessmentTotal <= 100)
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800 tabular-nums"
                      : "border-amber-200 bg-amber-50 text-amber-800 tabular-nums"
                  }
                >
                  {isEditRelational
                    ? `${editAssessmentFields.length} sub-assessments · ${editAssessmentTotal} raw marks`
                    : `Total: ${editAssessmentTotal} marks`}
                </Badge>
              </div>

              <div className="space-y-2.5">
                {editAssessmentFields.map((field, index) => {
                  const hasScores = (field.recordedScoreCount ?? 0) > 0;
                  return (
                    <div
                      key={field.id || `new-${index}`}
                      className="grid grid-cols-[minmax(0,1fr)_124px_76px_38px] gap-1.5 sm:grid-cols-[minmax(0,1fr)_150px_88px_40px] sm:gap-2"
                    >
                      <Input
                        placeholder="Sub-assessment name"
                        value={field.name}
                        disabled={field.isSystemGenerated}
                        onChange={(e) => {
                          const next = [...editAssessmentForm.assessments];
                          next[index] = { ...next[index], name: e.target.value };
                          setEditAssessmentForm({ assessments: next });
                        }}
                        className="text-sm"
                      />
                      {isEditRelational && editTemplateMetrics.length > 0 ? (
                        <Select
                          value={field.categoryId || ""}
                          disabled={Boolean(field.id) || Boolean(field.isSystemGenerated)}
                          onValueChange={(value) => {
                            const next = [...editAssessmentForm.assessments];
                            next[index] = { ...next[index], categoryId: String(value ?? "") };
                            setEditAssessmentForm({ assessments: next });
                          }}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Category" />
                          </SelectTrigger>
                          <SelectContent>
                            {editTemplateMetrics.map((metric) => (
                              <SelectItem
                                key={metric.id}
                                value={metric.id}
                                disabled={Boolean(metric.isSingleInstance)}
                              >
                                {metric.name} ({metric.maxMarks})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          step={1}
                          placeholder="Marks"
                          value={field.total}
                          onChange={(e) => {
                            const next = [...editAssessmentForm.assessments];
                            const val = e.target.value === "" ? "" : Number(e.target.value);
                            next[index] = {
                              ...next[index],
                              total: val,
                              maxObtainableScore: typeof val === "number" ? val : undefined,
                            };
                            setEditAssessmentForm({ assessments: next });
                          }}
                          className="text-sm tabular-nums"
                        />
                      )}
                      {isEditRelational ? (
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          step={1}
                          placeholder="Max"
                          aria-label={`Maximum marks for ${field.name || `sub-assessment ${index + 1}`}`}
                          value={field.maxObtainableScore ?? ""}
                          disabled={field.isSystemGenerated}
                          onChange={(e) => {
                            const next = [...editAssessmentForm.assessments];
                            next[index] = {
                              ...next[index],
                              maxObtainableScore:
                                e.target.value === "" ? undefined : Number(e.target.value),
                              total: e.target.value === "" ? "" : Number(e.target.value),
                            };
                            setEditAssessmentForm({ assessments: next });
                          }}
                          className="text-center text-sm font-semibold tabular-nums"
                        />
                      ) : (
                        <span className="flex items-center justify-center text-xs text-slate-500">
                          marks
                        </span>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => {
                          const next = editAssessmentForm.assessments.filter((_, i) => i !== index);
                          setEditAssessmentForm({ assessments: next });
                        }}
                        disabled={
                          Boolean(field.isSystemGenerated) ||
                          hasScores ||
                          (!isEditRelational && editAssessmentForm.assessments.length === 1)
                        }
                        title={
                          field.isSystemGenerated
                            ? "Fixed by administrator"
                            : hasScores
                              ? "Cannot delete: scores have already been recorded"
                              : "Remove sub-assessment"
                        }
                        aria-label={`Remove ${field.name || `assessment ${index + 1}`}`}
                      >
                        <Delete className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  const preferredCat =
                    editCategoryAllocations.find(
                      (cat) => !cat.isSingleInstance && !cat.isComplete,
                    ) ||
                    editCategoryAllocations.find((cat) => !cat.isSingleInstance);
                  const fallbackMax = preferredCat && preferredCat.maxMarks > 0 ? preferredCat.maxMarks : 10;
                  setEditAssessmentForm({
                    assessments: [
                      ...editAssessmentForm.assessments,
                      {
                        name: "",
                        total: fallbackMax,
                        maxObtainableScore: fallbackMax,
                        categoryId: preferredCat?.categoryId,
                      },
                    ],
                  });
                }}
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Add Sub-Assessment
              </Button>
            </div>

            <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditAssessmentsOpen(false);
                  setEditTargetId(null);
                }}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="w-full bg-[#1447E6] hover:bg-[#123ecc] sm:w-auto"
                disabled={
                  (!isEditRelational && (editAssessmentTotal <= 0 || editAssessmentTotal > 100)) ||
                  isSavingAssessments
                }
              >
                {isSavingAssessments && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
