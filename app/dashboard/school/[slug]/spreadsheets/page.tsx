"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Delete,
  FileSpreadsheet,
  GraduationCap,
  Layers,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  getSpreadsheetArmNames,
  getSpreadsheetLabel,
  isSpreadsheetDeleteLocked,
  needsCanonicalCancelOnDelete,
  type AssessmentCategorySummary,
} from "@/lib/spreadsheets";
import { cn } from "@/lib/utils";
import { detectClassSection, type ResultStage } from "@/lib/result-presets";
import { buildSpreadsheetTitle, type TermType } from "@/lib/universal-grading";

const SPREADSHEETS_PAGE_SIZE = 500;
const SPREADSHEETS_MAX_PAGES = 10;

type SpreadsheetSummary = {
  id: string;
  title?: string | null;
  status: "pending" | "active" | "inactive";
  createdAt: string;
  resultType: ResultStage;
  termType?: TermType;
  hcoreAssessmentId?: string | null;
  canonicalStatus?: string | null;
  recordedScoreCount?: number;
  canonicalScoreCount?: number;
  classLevelId?: string;
  classLevelIds?: string[];
  classLevels?: Array<{ id: string; name: string }>;
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
  classLevelId?: string | null;
  classLevelIds?: string[];
  hasScores?: boolean;
  recordedScoreCount?: number;
  hcoreAssessmentId?: string | null;
  canonicalStatus?: string | null;
  canonicalScoreCount?: number;
  assessmentStorageMode?: "LEGACY_JSON" | "RELATIONAL";
};

type ConflictSheetState = {
  id: string;
  title?: string | null;
  version?: number;
  classLevelId?: string | null;
  classLevelIds?: string[];
  hasScores?: boolean;
  recordedScoreCount?: number;
  hcoreAssessmentId?: string | null;
  canonicalStatus?: string | null;
  canonicalScoreCount?: number;
  assessmentStorageMode?: "LEGACY_JSON" | "RELATIONAL";
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

function getStatusLabel(status: SpreadsheetSummary["status"]) {
  switch (status) {
    case "active":
      return "Active";
    case "pending":
      return "Pending";
    case "inactive":
      return "Inactive";
    default:
      return "Pending";
  }
}

function getStatusClassName(status: SpreadsheetSummary["status"]) {
  switch (status) {
    case "active":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
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
  const [isBulkActivateConfirmOpen, setIsBulkActivateConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SpreadsheetSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCombiningArms, setIsCombiningArms] = useState(false);
  const [additionalClassIds, setAdditionalClassIds] = useState<string[]>([]);
  const [conflictSheet, setConflictSheet] = useState<ConflictSheetState | null>(null);
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
        toast.error("Could not load assessment structure. Close and try again.");
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
    let cancelled = false;

    async function fetchAllSpreadsheets(slug: string): Promise<SpreadsheetSummary[]> {
      const collected: SpreadsheetSummary[] = [];
      const seenIds = new Set<string>();
      for (let page = 0; page < SPREADSHEETS_MAX_PAGES; page += 1) {
        const batch = await apiFetch<SpreadsheetSummary[]>(`/spreadsheets/${slug}`, {
          params: {
            limit: SPREADSHEETS_PAGE_SIZE,
            offset: page * SPREADSHEETS_PAGE_SIZE,
            ...(prefilledSubjectId ? { subjectId: prefilledSubjectId } : {}),
            ...(prefilledClassId ? { classLevelId: prefilledClassId } : {}),
          },
        });
        if (cancelled) return collected;
        if (!Array.isArray(batch) || batch.length === 0) break;
        for (const item of batch) {
          if (!seenIds.has(item.id)) {
            seenIds.add(item.id);
            collected.push(item);
          }
        }
        if (batch.length < SPREADSHEETS_PAGE_SIZE) break;
      }
      return collected;
    }

    async function fetchData() {
      if (!currentOrg) return;

      try {
        setIsLoading(true);
        const [sheetData, classData, subjectData] = await Promise.all([
          fetchAllSpreadsheets(currentOrg.slug),
          apiFetch<ClassOption[]>(`/classes/${currentOrg.slug}`),
          apiFetch<SubjectOption[]>(`/subjects/${currentOrg.slug}`),
        ]);
        if (cancelled) return;

        setSpreadsheets(sheetData);
        setClasses(classData);
        setSubjects(subjectData);
      } catch {
        if (!cancelled) {
          toast.error("Could not load spreadsheets. Refresh the page to try again.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void fetchData();
    return () => {
      cancelled = true;
    };
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
          ...getSpreadsheetArmNames(sheet),
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
        setConflictSheet({
          id: created.id,
          title: created.title ?? null,
          version: created.version,
          classLevelId: created.classLevelId ?? null,
          classLevelIds: created.classLevelIds,
          hasScores: created.hasScores,
          recordedScoreCount: created.recordedScoreCount,
          hcoreAssessmentId: created.hcoreAssessmentId ?? null,
          canonicalStatus: created.canonicalStatus ?? null,
          canonicalScoreCount: created.canonicalScoreCount,
          assessmentStorageMode: created.assessmentStorageMode,
        });
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
          `Activated ${res.updatedCount} ${res.updatedCount === 1 ? "spreadsheet" : "spreadsheets"}. ${res.skippedCount} skipped because a category has no sub-assessment yet.`,
        );
      } else if (res.updatedCount > 0) {
        toast.success(
          `Activated ${res.updatedCount} ${res.updatedCount === 1 ? "spreadsheet" : "spreadsheets"}. They are now visible in Results.`,
        );
      } else if (res.skippedCount > 0) {
        toast.error(
          `Could not activate ${res.skippedCount} ${res.skippedCount === 1 ? "spreadsheet" : "spreadsheets"}. Add at least one sub-assessment to every category first.`,
        );
      } else {
        toast.info("All spreadsheets in this view are already active.");
      }
      setIsBulkActivateConfirmOpen(false);
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Could not activate spreadsheets. Please try again."),
      );
    } finally {
      setIsBulkActivating(false);
    }
  }

  async function handleDeleteSpreadsheet() {
    if (!currentOrg || !deleteTarget || isDeleting) return;
    setIsDeleting(true);
    const target = deleteTarget;
    const label = getSpreadsheetLabel(target);
    const cancelCanonical = needsCanonicalCancelOnDelete(target);
    try {
      await apiFetch(
        `/spreadsheets/${currentOrg.slug}/${target.id}${cancelCanonical ? "?cancelCanonical=true" : ""}`,
        {
          method: "DELETE",
        },
      );
      setSpreadsheets((prev) => prev.filter((item) => item.id !== target.id));
      setDeleteTarget(null);
      if (conflictSheet?.id === target.id) {
        setConflictSheet(null);
      }
      toast.success(
        cancelCanonical
          ? `Cancelled HCORE draft and deleted "${label}".`
          : `Deleted "${label}".`,
      );
    } catch (error) {
      toast.error(
        getErrorMessage(error, `Could not delete "${label}". Please try again.`),
      );
    } finally {
      setIsDeleting(false);
    }
  }

  const conflictCombineMeta = useMemo(() => {
    if (!conflictSheet) {
      return {
        mergedClassIds: [] as string[],
        hasExtraArms: false,
        canCombine: false,
        canReset: false,
        canDelete: false,
      };
    }
    const rawRequested = Array.isArray(pendingPayload?.classLevels)
      ? (pendingPayload.classLevels as unknown[]).filter(
          (id): id is string => typeof id === "string" && id.length > 0,
        )
      : typeof pendingPayload?.classLevel === "string" && pendingPayload.classLevel
        ? [pendingPayload.classLevel]
        : [];
    const existingIds = Array.isArray(conflictSheet.classLevelIds) && conflictSheet.classLevelIds.length > 0
      ? conflictSheet.classLevelIds
      : conflictSheet.classLevelId
        ? [conflictSheet.classLevelId]
        : [];
    const existingSet = new Set(existingIds);
    const hasExtraArms = rawRequested.some((id) => !existingSet.has(id));
    const mergedClassIds = Array.from(new Set([...existingIds, ...rawRequested]));
    const deleteLocked = isSpreadsheetDeleteLocked(conflictSheet);
    const hasVersion = typeof conflictSheet.version === "number" && conflictSheet.version > 0;
    const hasScores = Boolean(conflictSheet.hasScores) || (conflictSheet.recordedScoreCount ?? 0) > 0;
    return {
      mergedClassIds,
      hasExtraArms,
      canCombine: isPrivileged && hasExtraArms && hasVersion && !deleteLocked,
      canReset: hasVersion && !hasScores && !conflictSheet.hcoreAssessmentId,
      canDelete: isPrivileged && !deleteLocked,
    };
  }, [conflictSheet, isPrivileged, pendingPayload]);

  async function handleCombineConflictArms() {
    if (!conflictSheet || !currentOrg || isCombiningArms || !conflictCombineMeta.canCombine) return;
    setIsCombiningArms(true);
    try {
      const updated = await apiFetch<SpreadsheetSummary>(
        `/spreadsheets/${currentOrg.slug}/${conflictSheet.id}/classes`,
        {
          method: "PATCH",
          body: JSON.stringify({
            classLevels: conflictCombineMeta.mergedClassIds,
            expectedVersion: conflictSheet.version,
          }),
        },
      );
      setSpreadsheets((prev) =>
        prev.some((item) => item.id === updated.id)
          ? prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
          : [updated, ...prev],
      );
      toast.success("Class arms combined without losing any recorded scores.");
      setIsDialogOpen(false);
      setConflictSheet(null);
      setPendingPayload(null);
      setAdditionalClassIds([]);
      router.push(`/dashboard/school/${currentOrg.slug}/spreadsheets/${conflictSheet.id}`);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to combine class arms"));
    } finally {
      setIsCombiningArms(false);
    }
  }

  const hasActiveFilters = Boolean(searchQuery.trim()) || termTab !== "ALL";
  const termFilterLabel =
    termTab === "MID_TERM" ? "Mid-Term" : termTab === "END_TERM" ? "End-of-Term" : "";
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
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                onClick={() => setIsDialogOpen(true)}
                className="min-h-11 flex-1 whitespace-nowrap rounded-xl bg-blue-600 px-3.5 text-sm font-semibold text-white shadow-xs transition hover:bg-blue-700 active:scale-[0.98]"
              >
                <Plus className="mr-1.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>New Spreadsheet</span>
              </Button>
              {isPrivileged && nonActiveSheetsInTab.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isBulkActivating}
                  onClick={() => setIsBulkActivateConfirmOpen(true)}
                  className="min-h-11 shrink-0 whitespace-nowrap rounded-xl border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                >
                  {isBulkActivating ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  <span className="tabular-nums">Set All Active ({nonActiveSheetsInTab.length})</span>
                </Button>
              )}
            </div>
          )}

          {/* Mobile Search Input */}
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <Input
              type="search"
              placeholder="Search by class, subject, or status"
              aria-label="Search spreadsheets"
              className="h-11 rounded-xl border-slate-200 bg-white pl-9 pr-11 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-0.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Segmented Control / Tabs */}
          <div
            role="tablist"
            aria-label="Filter spreadsheets by term period"
            className="grid grid-cols-3 rounded-xl border border-slate-200/80 bg-slate-100 p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={termTab === "ALL"}
              onClick={() => setTermTab("ALL")}
              className={cn(
                "min-h-11 rounded-lg px-2 text-center text-xs font-semibold transition-all",
                termTab === "ALL"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900",
              )}
            >
              All
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={termTab === "MID_TERM"}
              onClick={() => setTermTab("MID_TERM")}
              className={cn(
                "min-h-11 rounded-lg px-2 text-center text-xs font-semibold transition-all",
                termTab === "MID_TERM"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900",
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
                "min-h-11 rounded-lg px-2 text-center text-xs font-semibold transition-all",
                termTab === "END_TERM"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900",
              )}
            >
              End-of-Term
            </button>
          </div>

          {/* Quiet Meta Count */}
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-medium text-slate-600 tabular-nums">
              {filteredSheets.length} {filteredSheets.length === 1 ? "spreadsheet" : "spreadsheets"}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setTermTab("ALL");
                }}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                Reset filters
              </button>
            )}
          </div>

          {/* Mobile Single-Container Hairline List */}
          <section className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/90 bg-white">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))
            ) : filteredSheets.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm font-semibold text-slate-900">
                  {hasActiveFilters
                    ? termFilterLabel && !searchQuery.trim()
                      ? `No ${termFilterLabel} spreadsheets found`
                      : "No matching spreadsheets"
                    : "No spreadsheets yet"}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  {hasActiveFilters
                    ? "Try a different keyword or reset the term filter."
                    : canCreate
                      ? "Create a spreadsheet to begin recording student scores."
                      : "No subject spreadsheets have been created for your classes yet."}
                </p>
                {hasActiveFilters && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setTermTab("ALL");
                    }}
                    className="mt-3 rounded-xl"
                  >
                    Reset filters
                  </Button>
                )}
              </div>
            ) : (
              filteredSheets.map((sheet) => {
                const sheetLabel = getSpreadsheetLabel(sheet);
                const mobileTitle = sheet.subject?.name?.trim() || sheetLabel;
                const visual = getSpreadsheetVisual(sheet);
                const statusLabel = getStatusLabel(sheet.status);
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
                          {mobileTitle}
                        </h2>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span className={cn("rounded-md border px-1.5 py-0.5 text-xs font-medium", visual.typeBadge)}>
                            {visual.typeLabel}
                          </span>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium",
                              getStatusClassName(sheet.status),
                            )}
                          >
                            {sheet.status === "active" && (
                              <CheckCircle2 className="size-3" aria-hidden="true" />
                            )}
                            {statusLabel}
                          </span>
                          {sheet.hcoreAssessmentId && (
                            <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                              <Lock className="size-3" aria-hidden="true" />
                              Locked
                            </span>
                          )}
                        </div>
                        <p className="mt-1 truncate text-xs text-slate-600">
                          {getSpreadsheetArmNames(sheet).length > 0
                            ? `${getSpreadsheetArmNames(sheet).join(", ")} · `
                            : ""}
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
                            aria-label={`Actions for ${sheetLabel}`}
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
                          {sheet.hcoreAssessmentId ? "Structure Locked" : "Edit Structure"}
                        </DropdownMenuItem>
                        {isPrivileged && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(sheet)}
                              disabled={isSpreadsheetDeleteLocked(sheet)}
                              className="text-rose-600 focus:bg-rose-50 focus:text-rose-700"
                            >
                              <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                              {isSpreadsheetDeleteLocked(sheet)
                                ? "Delete (Grades Locked)"
                                : "Delete Spreadsheet"}
                            </DropdownMenuItem>
                          </>
                        )}
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
          {/* Header Section */}
          <section className="mt-3 px-3 sm:px-4 md:px-0">
            <div className="flex flex-col gap-4 md:gap-5">
              {/* Heading & Action Row */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                    Spreadsheets
                  </h1>
                  <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600 md:text-base">
                    Select a subject spreadsheet to enter student scores or manage assessment columns.
                  </p>
                </div>

                {canCreate && (
                  <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                    {isPrivileged && nonActiveSheetsInTab.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isBulkActivating}
                        onClick={() => setIsBulkActivateConfirmOpen(true)}
                        className="h-11 w-full shrink-0 rounded-xl border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-800 transition-all hover:bg-emerald-100 sm:w-auto"
                      >
                        {isBulkActivating ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />
                        )}
                        <span className="tabular-nums">
                          Set All Active ({nonActiveSheetsInTab.length})
                        </span>
                      </Button>
                    )}
                    <Button
                      type="button"
                      onClick={() => setIsDialogOpen(true)}
                      className="h-11 w-full shrink-0 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-[0.98] sm:w-auto sm:px-5"
                    >
                      <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                      New Spreadsheet
                    </Button>
                  </div>
                )}
              </div>

              {/* Search & Filter / Sort Toolbar */}
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <Input
                    type="search"
                    placeholder="Search by class, subject, or status"
                    aria-label="Search spreadsheets"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="h-12 rounded-xl border border-slate-200 bg-white pl-10 pr-11 text-sm shadow-2xs placeholder:text-slate-500 focus-visible:border-blue-500 focus-visible:ring-blue-200"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      aria-label="Clear search"
                      className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  {/* Term Period Filter */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600">Period</span>
                    <div
                      role="group"
                      aria-label="Filter spreadsheets by term period"
                      className="inline-flex rounded-xl border border-slate-200/80 bg-slate-100/90 p-1"
                    >
                      <button
                        type="button"
                        onClick={() => setTermTab("ALL")}
                        aria-pressed={termTab === "ALL"}
                        className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${
                          termTab === "ALL"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setTermTab("MID_TERM")}
                        aria-pressed={termTab === "MID_TERM"}
                        className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${
                          termTab === "MID_TERM"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Mid-Term
                      </button>
                      <button
                        type="button"
                        onClick={() => setTermTab("END_TERM")}
                        aria-pressed={termTab === "END_TERM"}
                        className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${
                          termTab === "END_TERM"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        End-of-Term
                      </button>
                    </div>
                  </div>

                  {/* Sort & Layout Controls */}
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-semibold text-slate-600">Sort by</span>
                    <div
                      role="group"
                      aria-label="Sort spreadsheets by"
                      className="inline-flex rounded-xl border border-slate-200/80 bg-slate-100/90 p-1"
                    >
                      <button
                        type="button"
                        onClick={() => setActiveFilter("class")}
                        aria-pressed={activeFilter === "class"}
                        className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${
                          activeFilter === "class"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Class
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveFilter("subject")}
                        aria-pressed={activeFilter === "subject"}
                        className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${
                          activeFilter === "subject"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Subject
                      </button>
                    </div>

                    <div
                      role="group"
                      aria-label="Layout view"
                      className="hidden items-center rounded-xl border border-slate-200 bg-white p-0.5 shadow-2xs sm:flex"
                    >
                      <button
                        type="button"
                        onClick={() => setViewMode("list")}
                        aria-label="List view"
                        aria-pressed={viewMode === "list"}
                        className={`rounded-lg p-2 transition ${
                          viewMode === "list"
                            ? "bg-blue-600 text-white"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                        title="List view"
                      >
                        <List className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode("grid")}
                        aria-label="Grid view"
                        aria-pressed={viewMode === "grid"}
                        className={`rounded-lg p-2 transition ${
                          viewMode === "grid"
                            ? "bg-blue-600 text-white"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                        title="Grid view"
                      >
                        <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Sheets Grid/List */}
          <section className="mt-5">
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
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center sm:p-8 md:p-12">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 sm:h-16 sm:w-16">
                  <FileSpreadsheet className="h-7 w-7 text-blue-600 sm:h-8 sm:w-8" aria-hidden="true" />
                </div>
                <h2 className="mt-3 text-lg font-semibold text-slate-900 sm:mt-4 sm:text-xl">
                  {hasActiveFilters
                    ? termFilterLabel && !searchQuery.trim()
                      ? `No ${termFilterLabel} spreadsheets found`
                      : "No spreadsheets match your filters"
                    : "No spreadsheets yet"}
                </h2>
                <p className="mt-1.5 text-sm text-slate-600 sm:mt-2">
                  {hasActiveFilters
                    ? "Try a different class, subject, or status keyword, or reset your filters."
                    : canCreate
                      ? "Create a spreadsheet to start recording student scores for your assigned classes."
                      : "No subject spreadsheets have been created for your classes yet."}
                </p>
                {hasActiveFilters ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSearchQuery("");
                      setTermTab("ALL");
                    }}
                    className="mt-4 sm:mt-6"
                  >
                    Reset filters
                  </Button>
                ) : (
                  canCreate && (
                    <Button
                      onClick={() => setIsDialogOpen(true)}
                      className="mt-4 bg-blue-600 hover:bg-blue-700 sm:mt-6"
                    >
                      <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                      Create your first spreadsheet
                    </Button>
                  )
                )}
              </div>
            ) : (
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4"
                    : "space-y-3"
                }
              >
                {filteredSheets.map((sheet) => {
                  const sheetLabel = getSpreadsheetLabel(sheet);
                  const visual = getSpreadsheetVisual(sheet);
                  const statusLabel = getStatusLabel(sheet.status);
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
                      className={`group w-full rounded-xl border border-slate-200 bg-white text-left shadow-2xs transition-all hover:border-blue-200 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 active:bg-slate-50 motion-safe:hover:-translate-y-0.5 motion-reduce:transition-none ${
                        isGridView ? "flex flex-col p-4 sm:p-5" : "p-4 sm:px-5 sm:py-4"
                      }`}
                    >
                      <div
                        className={
                          isGridView
                            ? "flex flex-col gap-3"
                            : "flex items-center gap-3 sm:gap-4"
                        }
                      >
                        <div
                          className={`flex items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100/60 ${
                            isGridView
                              ? "h-12 w-12"
                              : "h-11 w-11 shrink-0 sm:h-12 sm:w-12"
                          }`}
                          aria-hidden="true"
                        >
                          {activeFilter === "class" ? (
                            <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6" />
                          ) : (
                            <BookOpen className="h-5 w-5 sm:h-6 sm:w-6" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h2
                            className={`line-clamp-2 break-words font-semibold tracking-tight text-slate-950 group-hover:text-blue-700 sm:line-clamp-none sm:truncate ${
                              isGridView
                                ? "text-sm sm:text-base"
                                : "text-base sm:text-lg"
                            }`}
                          >
                            {sheetLabel}
                          </h2>

                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <Badge
                              variant="outline"
                              className={`shrink-0 gap-1 px-2 py-0.5 text-xs ${getStatusClassName(
                                sheet.status,
                              )}`}
                            >
                              {sheet.status === "active" && (
                                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                              )}
                              {statusLabel}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={cn("shrink-0 px-2 py-0.5 text-xs", visual.typeBadge)}
                            >
                              {visual.typeLabel}
                            </Badge>
                            {sheet.hcoreAssessmentId ? (
                              <Badge
                                variant="outline"
                                className="shrink-0 gap-1 border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600"
                              >
                                <Lock className="h-3 w-3" aria-hidden="true" />
                                Structure locked
                              </Badge>
                            ) : null}
                            <span className="text-slate-300" aria-hidden="true">
                              &bull;
                            </span>
                            <p className="truncate text-xs text-slate-600">
                              {format(new Date(sheet.createdAt), "MMM d, yyyy")}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditTargetId(sheet.id);
                              setIsEditAssessmentsOpen(true);
                            }}
                            disabled={Boolean(sheet.hcoreAssessmentId)}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                            title={
                              sheet.hcoreAssessmentId
                                ? "Assessment structure is locked after publication"
                                : "Edit assessment structure"
                            }
                            aria-label={
                              sheet.hcoreAssessmentId
                                ? `Assessment structure locked for ${sheetLabel}`
                                : `Edit assessment structure for ${sheetLabel}`
                            }
                          >
                            {sheet.hcoreAssessmentId ? (
                              <Lock className="h-4 w-4" aria-hidden="true" />
                            ) : (
                              <Pencil className="h-4 w-4" aria-hidden="true" />
                            )}
                          </button>

                          {isPrivileged && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget(sheet);
                              }}
                              disabled={isSpreadsheetDeleteLocked(sheet)}
                              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300"
                              title={
                                isSpreadsheetDeleteLocked(sheet)
                                  ? "Canonical grades have been submitted to HCORE and cannot be deleted"
                                  : "Delete spreadsheet"
                              }
                              aria-label={
                                isSpreadsheetDeleteLocked(sheet)
                                  ? `Cannot delete locked spreadsheet ${sheetLabel}`
                                  : `Delete ${sheetLabel}`
                              }
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(
                                `/dashboard/school/${currentOrg?.slug}/spreadsheets/${sheet.id}`,
                              );
                            }}
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-100 bg-white text-blue-700 shadow-2xs transition hover:bg-blue-600 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                            aria-label={`Open ${sheetLabel}`}
                          >
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
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
              <p className="mt-5 text-center text-xs text-slate-600 tabular-nums sm:text-sm">
                Showing {filteredSheets.length} of {spreadsheets.length}{" "}
                {spreadsheets.length === 1 ? "spreadsheet" : "spreadsheets"}
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
                      Include other class arms (optional)
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
                  <p className="text-[11px] text-slate-600">
                    Select other arms taking this subject to record all their students on one spreadsheet.
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
                          <SelectItem value="END_TERM">End-of-Term</SelectItem>
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
                              Locked by school admin
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-600 tabular-nums">
                              {cat.subAssessmentCount === 0
                                ? `Scores scale to ${cat.maxMarks} marks`
                                : `${cat.subAssessmentCount} ${cat.subAssessmentCount === 1 ? "sub-assessment" : "sub-assessments"} · scaled to ${cat.maxMarks} marks`}
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
          if (!open && !isCombiningArms) setConflictSheet(null);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <BookOpen className="h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
              Spreadsheet Already Exists
            </DialogTitle>
            <DialogDescription className="pt-1.5 leading-relaxed text-slate-600">
              {conflictSheet?.title
                ? `"${conflictSheet.title}" already covers one or more of the classes you selected for this subject and term.`
                : "A spreadsheet already exists for one or more of the classes you selected for this subject and term."}
            </DialogDescription>
          </DialogHeader>

          {conflictSheet && (
            <div
              className={cn(
                "rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed",
                (conflictSheet.recordedScoreCount ?? 0) > 0 || conflictSheet.hasScores
                  ? "border-amber-200 bg-amber-50/80 text-amber-950"
                  : "border-slate-200 bg-slate-50 text-slate-700",
              )}
            >
              {(conflictSheet.recordedScoreCount ?? 0) > 0 || conflictSheet.hasScores ? (
                <p className="font-medium">
                  {(conflictSheet.recordedScoreCount ?? 0) > 0
                    ? `This existing spreadsheet has ${conflictSheet.recordedScoreCount} recorded student ${conflictSheet.recordedScoreCount === 1 ? "score" : "scores"}.`
                    : "This existing spreadsheet already has recorded student scores."}{" "}
                  {conflictCombineMeta.canCombine
                    ? "Combining arms below keeps every existing score intact."
                    : "Open it to review scores before making changes."}
                </p>
              ) : (
                <p>No student scores are recorded on this existing spreadsheet yet.</p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2.5 pt-1">
            {conflictCombineMeta.canCombine && (
              <Button
                type="button"
                disabled={isCombiningArms}
                className="h-auto min-h-12 w-full justify-start gap-3 whitespace-normal bg-[#1447E6] px-4 py-3.5 text-left text-white hover:bg-[#123ecc]"
                onClick={() => void handleCombineConflictArms()}
              >
                {isCombiningArms ? (
                  <Loader2 className="h-5 w-5 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : (
                  <Layers className="h-5 w-5 shrink-0" aria-hidden="true" />
                )}
                <div className="min-w-0 text-left">
                  <p className="text-sm font-semibold">
                    {isCombiningArms
                      ? "Combining class arms..."
                      : "Combine Selected Class Arms into Existing Sheet"}
                  </p>
                  <p className="text-xs text-blue-100">
                    Adds the extra class arms and keeps all recorded scores safe
                  </p>
                </div>
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              className="h-auto min-h-12 w-full justify-start gap-3 whitespace-normal border-slate-200 bg-white px-4 py-3 text-left text-slate-900 hover:bg-slate-50"
              onClick={() => {
                if (!conflictSheet || !currentOrg) return;
                const targetId = conflictSheet.id;
                setConflictSheet(null);
                setIsDialogOpen(false);
                router.push(`/dashboard/school/${currentOrg.slug}/spreadsheets/${targetId}`);
              }}
            >
              <ArrowRight className="h-5 w-5 shrink-0 text-blue-700" aria-hidden="true" />
              <div className="min-w-0 text-left">
                <p className="text-sm font-semibold">Open Existing Spreadsheet</p>
                <p className="text-xs text-slate-600">
                  View its assessments, roster, and recorded scores
                </p>
              </div>
            </Button>

            {conflictCombineMeta.canReset && (
              <Button
                type="button"
                variant="outline"
                className="h-auto min-h-12 w-full justify-start gap-3 whitespace-normal border-amber-200 bg-amber-50/50 px-4 py-3 text-left text-amber-900 hover:bg-amber-100"
                onClick={async () => {
                  if (!conflictSheet || !currentOrg || !pendingPayload) return;
                  if (typeof conflictSheet.version !== "number" || conflictSheet.version <= 0) {
                    toast.error("Spreadsheet version is unavailable. Open Edit Assessments instead.");
                    return;
                  }
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
                    setAdditionalClassIds([]);
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
                <RefreshCw className="h-5 w-5 shrink-0" aria-hidden="true" />
                <div className="min-w-0 text-left">
                  <p className="text-sm font-semibold">Reset Empty Spreadsheet</p>
                  <p className="text-xs text-amber-800">
                    Replace template and selected classes on this empty sheet
                  </p>
                </div>
              </Button>
            )}

            {!conflictSheet?.hcoreAssessmentId && (
              <Button
                type="button"
                variant="outline"
                className="h-auto min-h-12 w-full justify-start gap-3 whitespace-normal border-blue-200 bg-blue-50/50 px-4 py-3 text-left text-blue-900 hover:bg-blue-100"
                onClick={() => {
                  if (!conflictSheet) return;
                  setEditTargetId(conflictSheet.id);
                  setConflictSheet(null);
                  setIsEditAssessmentsOpen(true);
                }}
              >
                <Pencil className="h-5 w-5 shrink-0" aria-hidden="true" />
                <div className="min-w-0 text-left">
                  <p className="text-sm font-semibold">Edit Assessments</p>
                  <p className="text-xs text-blue-700">
                    Configure sub-assessments within admin limits
                  </p>
                </div>
              </Button>
            )}

            {conflictCombineMeta.canDelete && conflictSheet && (
              <Button
                type="button"
                variant="outline"
                className="h-auto min-h-12 w-full justify-start gap-3 whitespace-normal border-rose-200 bg-rose-50/60 px-4 py-3 text-left text-rose-800 hover:bg-rose-100"
                onClick={() => {
                  const matched = spreadsheets.find((s) => s.id === conflictSheet.id);
                  setDeleteTarget(
                    matched ?? {
                      id: conflictSheet.id,
                      title: conflictSheet.title ?? "Existing Spreadsheet",
                      status: "pending",
                      createdAt: new Date().toISOString(),
                      resultType: selectedResultType,
                      termType: selectedTermType,
                      hcoreAssessmentId: conflictSheet.hcoreAssessmentId ?? null,
                      canonicalStatus: conflictSheet.canonicalStatus ?? null,
                      recordedScoreCount: conflictSheet.recordedScoreCount ?? 0,
                      canonicalScoreCount: conflictSheet.canonicalScoreCount ?? 0,
                    },
                  );
                }}
              >
                <Trash2 className="h-5 w-5 shrink-0" aria-hidden="true" />
                <div className="min-w-0 text-left">
                  <p className="text-sm font-semibold">Delete Existing Spreadsheet</p>
                  <p className="text-xs text-rose-700">
                    {(conflictSheet.recordedScoreCount ?? 0) > 0
                      ? `Warning: deletes ${conflictSheet.recordedScoreCount} recorded ${conflictSheet.recordedScoreCount === 1 ? "score" : "scores"}`
                      : "Permanently remove this sheet so you can start fresh"}
                  </p>
                </div>
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              className="min-h-11 text-slate-600"
              disabled={isCombiningArms}
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
                          ? "Locked by school admin"
                          : cat.isComplete
                            ? `${cat.subAssessmentCount} ${cat.subAssessmentCount === 1 ? "sub-assessment" : "sub-assessments"} · scaled to ${cat.maxMarks} marks`
                            : `No sub-assessments yet · scales to ${cat.maxMarks} marks`}
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

      {/* Bulk Activate Confirmation */}
      <AlertDialog
        open={isBulkActivateConfirmOpen}
        onOpenChange={(open) => {
          if (!isBulkActivating) setIsBulkActivateConfirmOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Activate {nonActiveSheetsInTab.length}{" "}
              {nonActiveSheetsInTab.length === 1 ? "Spreadsheet" : "Spreadsheets"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Active spreadsheets are included in student results and report cards. Any spreadsheet
              missing required sub-assessments will be skipped.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkActivating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isBulkActivating}
              className="bg-emerald-700 text-white hover:bg-emerald-800"
              onClick={(event) => {
                event.preventDefault();
                void handleBulkActivateAll();
              }}
            >
              {isBulkActivating && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              {isBulkActivating ? "Activating..." : "Activate All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Spreadsheet Confirmation (Admin only) */}
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteTarget ? `"${getSpreadsheetLabel(deleteTarget)}"` : "Spreadsheet"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes this spreadsheet and its sub-assessments. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteTarget && (deleteTarget.recordedScoreCount ?? 0) > 0 && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
              <span>
                {deleteTarget.recordedScoreCount} recorded student{" "}
                {deleteTarget.recordedScoreCount === 1 ? "score" : "scores"} on this sheet will be
                permanently deleted.
              </span>
            </div>
          )}
          {deleteTarget && needsCanonicalCancelOnDelete(deleteTarget) && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-950">
              This sheet is synced to HCORE as{" "}
              <span className="font-semibold">
                {deleteTarget.canonicalStatus || "Scheduled"}
              </span>{" "}
              with 0 submitted canonical grades. Deleting will cancel the HCORE draft and remove the
              spreadsheet.
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              className="bg-rose-600 text-white hover:bg-rose-700"
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteSpreadsheet();
              }}
            >
              {isDeleting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              )}
              {isDeleting
                ? "Deleting..."
                : needsCanonicalCancelOnDelete(deleteTarget)
                  ? "Cancel Draft & Delete"
                  : "Delete Spreadsheet"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
