"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
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
  Lock,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
  LayoutGrid,
  List,
} from "lucide-react";
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
  DialogTrigger,
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
import { DataStateCard } from "@/components/dashboard/shared";
import { usePermissions } from "@/hooks/usePermissions";
import { apiFetch } from "@/lib/api";
import { getSpreadsheetLabel } from "@/lib/spreadsheets";
import { toTitleCase } from "@/lib/utils";
import { greetingName } from "@/lib/greeting-name";

type SpreadsheetSummary = {
  id: string;
  title?: string | null;
  status: "pending" | "active" | "inactive";
  createdAt: string;
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

type CreatedSpreadsheet = {
  id: string;
  created?: boolean;
  title?: string | null;
};

const defaultAssessments = [
  { name: "Classwork", total: 10 },
  { name: "Assignment", total: 20 },
  { name: "Exam", total: 70 },
];

function createDefaultAssessments() {
  return defaultAssessments.map((assessment) => ({ ...assessment }));
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
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "inactive":
      return "border-slate-200 bg-slate-100 text-slate-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

const createSpreadsheetSchema = z
  .object({
    classId: z.string().min(1, "Class is required"),
    subjectId: z.string().min(1, "Subject is required"),
    assessments: z
      .array(
        z.object({
          name: z.string().trim().min(1, "Assessment name is required"),
          total: z.coerce
            .number()
            .int("Assessment total must be a whole number")
            .positive("Assessment total must be greater than 0"),
        }),
      )
      .min(1, "At least one assessment is required"),
  })
  .superRefine((data, ctx) => {
    const total = data.assessments.reduce(
      (sum, assessment) => sum + assessment.total,
      0,
    );

    if (total !== 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Assessment totals must add up to exactly 100 marks",
        path: ["assessments"],
      });
    }
  });

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
  const [conflictSheet, setConflictSheet] = useState<{
    id: string;
    title?: string | null;
  } | null>(null);
  const [editTargetId, setEditTargetId] = useState<string | null>(null);
  const [isEditAssessmentsOpen, setIsEditAssessmentsOpen] = useState(false);
  const [isSavingAssessments, setIsSavingAssessments] = useState(false);
  const [editAssessmentForm, setEditAssessmentForm] = useState<{
    assessments: Array<{ name: string; total: number | "" }>;
  }>({ assessments: [] });
  const [pendingPayload, setPendingPayload] = useState<Record<string, unknown> | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  const editAssessmentTotal = (editAssessmentForm.assessments || []).reduce(
    (sum, a) => sum + (Number(a.total) || 0),
    0,
  );
  const editAssessmentFields = editAssessmentForm.assessments;

  useEffect(() => {
    if (!editTargetId || !currentOrg) return;
    apiFetch<{ assessments?: Array<{ name?: string; total?: number }> }>(`/spreadsheets/${currentOrg.slug}/${editTargetId}`)
      .then((data) => {
        const assessments = Array.isArray(data?.assessments)
          ? data.assessments
          : [];
        setEditAssessmentForm({
          assessments:
            assessments.length > 0
              ? assessments.map((a: { name?: string; total?: number }) => ({
                name: a.name || "",
                total: a.total || 0,
              }))
              : [{ name: "", total: 100 }],
        });
      })
      .catch(() => {
        setEditAssessmentForm({
          assessments: [
            { name: "Classwork", total: 10 },
            { name: "Assignment", total: 20 },
            { name: "Exam", total: 70 },
          ],
        });
      });
  }, [editTargetId, currentOrg]);

  const prefilledSubjectId = searchParams.get("subjectId") || "";
  const prefilledClassId = searchParams.get("classLevelId") || "";

  const { isPrivileged, isSubjectTeacher, isHOD, isAccountant } = usePermissions();
  const canCreate = isPrivileged || isSubjectTeacher || isHOD;

  const form = useForm<z.infer<typeof createSpreadsheetSchema>>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createSpreadsheetSchema) as any,
    defaultValues: {
      classId: "",
      subjectId: "",
      assessments: createDefaultAssessments(),
    },
  });
  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "assessments",
  });
  const watchedAssessments = form.watch("assessments");
  const selectedClassId = form.watch("classId");
  const selectedSubjectId = form.watch("subjectId");
  const assessmentTotal = (watchedAssessments || []).reduce(
    (sum, assessment) => sum + (Number(assessment?.total) || 0),
    0,
  );
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
        const spreadsheetLabel = getSpreadsheetLabel(sheet);
        if (!normalizedQuery) {
          return true;
        }

        return [
          spreadsheetLabel,
          sheet.classLevel?.name,
          sheet.subject?.name,
          sheet.status,
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
  }, [activeFilter, searchQuery, spreadsheets]);

  async function onCreate(values: z.infer<typeof createSpreadsheetSchema>) {
    if (!currentOrg) return;

    setIsCreating(true);
    try {
      const payload = {
        classLevel: values.classId,
        subject: values.subjectId,
        assessments: values.assessments.map((assessment) => ({
          name: assessment.name.trim(),
          total: Number(assessment.total),
        })),
        organizationId: currentOrg.id,
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
        setConflictSheet({ id: created.id, title: created.title ?? null });
        return;
      }

      toast.success("Spreadsheet created successfully");
      setIsDialogOpen(false);
      form.reset({
        classId: prefilledClassId,
        subjectId: prefilledSubjectId,
        assessments: createDefaultAssessments(),
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

  const displayName = getDisplayName(currentMember?.user?.name);

  if (!isStaff) {
    return (
      <div className="mx-auto max-w-5xl p-6">
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
        {/* Header Section (phones: the top bar names the page; the list starts right away) */}
        <section className="md:rounded-xl md:border md:border-blue-100/80 md:bg-white/90 md:p-5 md:shadow-[0_24px_70px_rgba(37,99,235,0.10)] lg:p-6">
          <div className="flex flex-col gap-3 md:gap-5">
            {/* Welcome & Action Row */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between md:gap-4">
              <div className="hidden min-w-0 flex-1 md:block">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
                  Welcome,{" "}
                  <span className="text-blue-600">
                    {displayName}
                  </span>
                </h1>
                <p className="mt-2 text-base leading-relaxed text-slate-500">
                  Open a class sheet, jump into the right assessment, and enter
                  scores with fewer taps.
                </p>
              </div>

              {canCreate && (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="h-12 w-full shrink-0 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700 hover:shadow-blue-600/30 active:scale-[0.98] sm:w-auto sm:px-5">
                      <Plus className="mr-2 h-4 w-4" />
                      New Sheet
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px]">
                    <DialogHeader>
                      <DialogTitle>Create Spreadsheet</DialogTitle>
                      <DialogDescription>
                        Define the subject, class, and assessment totals for
                        this sheet. The assessment totals must add up to 100
                        marks.
                        {!isPrivileged &&
                          " Teachers can only create sheets for their assigned subject and class combinations."}
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                      <form
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        onSubmit={form.handleSubmit(onCreate as any)}
                        className="space-y-4 py-2"
                      >
                        <div className="grid gap-4 sm:grid-cols-2">
                          <FormField
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            control={form.control as any}
                            name="classId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Class *</FormLabel>
                                <FormControl>
                                  <Select
                                    onValueChange={(value) =>
                                      field.onChange(String(value ?? ""))
                                    }
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
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            control={form.control as any}
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
                                      {availableSubjects.map(
                                        (subjectOption) => (
                                          <SelectItem
                                            key={subjectOption.id}
                                            value={String(subjectOption.id)}
                                          >
                                            {subjectOption.name}
                                          </SelectItem>
                                        ),
                                      )}
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="space-y-3 rounded-lg border border-blue-100 bg-blue-50/60 p-4">
                          <div className="flex items-center justify-between">
                            <FormLabel className="text-sm font-semibold">
                              Assessment Breakdown (Total: {assessmentTotal}%)
                            </FormLabel>
                            <span
                              className={`text-xs font-semibold ${
                                assessmentTotal === 100
                                  ? "text-emerald-600"
                                  : "text-amber-600"
                              }`}
                            >
                              {assessmentTotal === 100
                                ? "✓ Valid (100%)"
                                : `${100 - assessmentTotal > 0 ? `Need ${100 - assessmentTotal}% more` : `Exceeds by ${assessmentTotal - 100}%`}`}
                            </span>
                          </div>

                          {/* Exam Mode Presets */}
                          <div className="space-y-1.5">
                            <span className="text-xs font-medium text-slate-500">Quick Exam Preset:</span>
                            <div className="flex flex-wrap gap-1.5">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 px-2.5 text-xs font-medium border-slate-200 hover:bg-blue-50 hover:text-blue-700"
                                onClick={() => replace([
                                  { name: "Classwork", total: 10 },
                                  { name: "Assignment", total: 20 },
                                  { name: "Written Exam", total: 70 },
                                ])}
                              >
                                Written Exam (70%)
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 px-2.5 text-xs font-medium border-slate-200 hover:bg-purple-50 hover:text-purple-700"
                                onClick={() => replace([
                                  { name: "Continuous Assessment", total: 30 },
                                  { name: "CBT Exam", total: 70 },
                                ])}
                              >
                                CBT Exam (70%)
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 px-2.5 text-xs font-medium border-slate-200 hover:bg-emerald-50 hover:text-emerald-700"
                                onClick={() => replace([
                                  { name: "Continuous Assessment", total: 20 },
                                  { name: "Written Exam", total: 30 },
                                  { name: "CBT Exam", total: 50 },
                                ])}
                              >
                                Hybrid (Written + CBT)
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {fields.map((assessmentField, index) => (
                              <div
                                key={assessmentField.id}
                                className="grid grid-cols-[1fr_90px_36px] gap-1.5 sm:grid-cols-[minmax(0,1fr)_110px_44px] sm:gap-2"
                              >
                                <FormField
                                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                  control={form.control as any}
                                  name={`assessments.${index}.name`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input
                                          placeholder="Assessment name"
                                          {...field}
                                          className="text-sm"
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                  control={form.control as any}
                                  name={`assessments.${index}.total`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          min={1}
                                          max={100}
                                          step={1}
                                          placeholder="Marks"
                                          value={field.value ?? ""}
                                          onChange={(event) =>
                                            field.onChange(
                                              event.target.value === ""
                                                ? ""
                                                : Number(event.target.value),
                                            )
                                          }
                                          className="text-sm"
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
                                  className="mt-0 h-9 w-9 sm:h-10 sm:w-10"
                                  onClick={() => remove(index)}
                                  disabled={fields.length === 1}
                                  title="Remove assessment"
                                >
                                  <Delete className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>

                          {form.formState.errors.assessments?.message && (
                            <p className="text-sm font-medium text-destructive">
                              {form.formState.errors.assessments.message}
                            </p>
                          )}

                          <Button
                            type="button"
                            variant="outline"
                            className="w-full rounded-lg border-blue-200 text-blue-700 hover:bg-blue-50"
                            onClick={() => append({ name: "", total: 0 })}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Assessment
                          </Button>
                        </div>

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
                            className="w-full bg-blue-600 hover:bg-blue-700 sm:w-auto"
                            disabled={
                              isCreating ||
                              availableClasses.length === 0 ||
                              availableSubjects.length === 0 ||
                              assessmentTotal !== 100
                            }
                          >
                            {isCreating && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Create & Setup
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
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
                  className="h-12 rounded-xl border border-slate-200 bg-white pl-10 pr-12 shadow-none focus-visible:border-blue-500 focus-visible:ring-blue-200 sm:h-14 sm:border-2 sm:border-blue-200 sm:pl-12 sm:text-base lg:h-16"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                    className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 sm:right-2"
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

                <div className="flex w-full items-center gap-2 sm:w-auto">
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
                        : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
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
                        : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
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
                  className="rounded-xl border border-blue-100 bg-white p-4 shadow-[0_16px_40px_rgba(37,99,235,0.08)]"
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
              <p className="mt-1.5 text-sm text-slate-500 sm:mt-2">
                {searchQuery
                  ? "Try another class, subject, or status keyword."
                  : "Create a spreadsheet to start entering scores for your assigned classes."}
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
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(
                          `/dashboard/school/${currentOrg?.slug}/spreadsheets/${sheet.id}`,
                        );
                      }
                    }}
                    className={`group w-full bg-white text-left transition-all active:bg-slate-50 ${isGridView
                      ? "flex flex-col rounded-xl border border-blue-100 p-4 shadow-[0_16px_40px_rgba(37,99,235,0.08)] sm:p-5"
                      : "px-4 py-3 sm:rounded-xl sm:border sm:border-blue-100 sm:p-5 sm:shadow-[0_16px_40px_rgba(37,99,235,0.08)]"
                      } sm:hover:-translate-y-1 sm:hover:border-blue-200 sm:hover:shadow-[0_20px_50px_rgba(37,99,235,0.14)]`}
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

                        <div className="mt-1 flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`shrink-0 px-2 py-0 text-xs capitalize sm:px-2.5 sm:py-0.5 ${getStatusClassName(
                              sheet.status,
                            )}`}
                          >
                            {sheet.status}
                          </Badge>
                          <span className="text-slate-300">&bull;</span>
                          <p
                            className="truncate text-xs text-slate-500"
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
                          className="flex h-11 w-11 items-center justify-center rounded-md text-slate-500 transition hover:bg-blue-50 hover:text-blue-600 focus-visible:opacity-100 sm:h-9 sm:w-9 sm:border sm:border-blue-100 sm:hover:border-blue-300 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
                          title="Edit assessments"
                          aria-label="Edit assessments"
                        >
                          <Pencil className="h-4 w-4" />
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
            <p className="mt-4 text-center text-xs text-slate-500 sm:mt-6 sm:text-sm">
              Showing {filteredSheets.length} of {spreadsheets.length}{" "}
              spreadsheets
            </p>
          )}
        </section>
      </div>

      {/* Conflict Dialog */}
      <Dialog
        open={!!conflictSheet}
        onOpenChange={(open) => {
          if (!open) setConflictSheet(null);
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <BookOpen className="h-5 w-5" />
              Spreadsheet Already Exists
            </DialogTitle>
            <DialogDescription className="pt-2 leading-relaxed">
              A spreadsheet already exists for this class and subject. You can
              either replace it (deletes all existing scores) or edit its
              assessment structure while keeping the scores.
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
                const replaced = await apiFetch<CreatedSpreadsheet>(
                  `/spreadsheets/${currentOrg.slug}`,
                  {
                    method: "POST",
                    body: JSON.stringify({
                      ...pendingPayload,
                      forceReplace: true,
                    }),
                  },
                );
                toast.success("Spreadsheet replaced successfully");
                setIsCreating(false);
                form.reset({
                  classId: prefilledClassId,
                  subjectId: prefilledSubjectId,
                  assessments: createDefaultAssessments(),
                });
                const targetId = replaced.id;
                router.push(
                  `/dashboard/school/${currentOrg.slug}/spreadsheets/${targetId}`,
                );
              }}
            >
              <Trash2 className="h-5 w-5 shrink-0" />
              <div className="text-left">
                <p className="text-sm font-semibold">Replace Spreadsheet</p>
                <p className="text-xs text-amber-600">
                  Delete existing scores and start fresh
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
                  Change assessment names or marks (total must be 100)
                </p>
              </div>
            </Button>
            <Button
              variant="ghost"
              className="text-slate-500"
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
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Edit Assessments</DialogTitle>
            <DialogDescription>
              Modify the assessments for this spreadsheet. The total must be
              exactly 100 marks.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!editTargetId || !currentOrg) return;
              setIsSavingAssessments(true);
              try {
                await apiFetch(
                  `/spreadsheets/${currentOrg.slug}/${editTargetId}`,
                  {
                    method: "PATCH",
                    body: JSON.stringify({
                      assessments: editAssessmentForm.assessments,
                    }),
                  },
                );
                toast.success("Assessments updated");
                setIsEditAssessmentsOpen(false);
                setEditTargetId(null);
                form.reset({
                  classId: prefilledClassId,
                  subjectId: prefilledSubjectId,
                  assessments: createDefaultAssessments(),
                });
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
            <div className="space-y-3 rounded-lg border border-blue-100 bg-blue-50/60 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Assessments *
                </label>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  <Badge
                    variant="outline"
                    className="border-slate-200 bg-white text-slate-600 text-xs sm:text-xs"
                  >
                    Exam: 70 fixed
                  </Badge>
                  <Badge
                    variant="outline"
                    className={
                      editAssessmentTotal === 100
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-amber-200 bg-amber-50 text-amber-700"
                    }
                  >
                    Total: {editAssessmentTotal}/100
                  </Badge>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                The \u201cExam\u201d assessment is fixed at 70 marks. The remaining 30
                marks are shared among the other assessments.
              </p>
              <div className="space-y-3">
                {editAssessmentFields.map((field, index) => {
                  const isExam = field.name.toLowerCase().includes("exam");
                  return (
                    <div
                      key={index}
                      className="grid grid-cols-[1fr_80px_36px] gap-1.5 sm:grid-cols-[minmax(0,1fr)_100px_44px] sm:gap-2"
                    >
                      <Input
                        placeholder="Assessment name"
                        value={field.name}
                        onChange={(e) => {
                          const next = [...editAssessmentForm.assessments];
                          next[index] = { ...next[index], name: e.target.value };
                          setEditAssessmentForm({ assessments: next });
                        }}
                        disabled={isExam}
                        className="text-sm"
                      />
                      <Input
                        type="number"
                        min={1}
                        max={isExam ? 70 : 30}
                        step={1}
                        placeholder="Marks"
                        value={field.total}
                        disabled={isExam}
                        onChange={(e) => {
                          const next = [...editAssessmentForm.assessments];
                          next[index] = {
                            ...next[index],
                            total: e.target.value === "" ? "" : Number(e.target.value),
                          };
                          setEditAssessmentForm({ assessments: next });
                        }}
                        className="text-sm"
                      />
                      {isExam ? (
                        <div className="flex h-9 w-9 items-center justify-center text-slate-300 sm:h-10 sm:w-10">
                          <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 sm:h-10 sm:w-10"
                          onClick={() => {
                            const next = editAssessmentForm.assessments.filter(
                              (_, i) => i !== index,
                            );
                            setEditAssessmentForm({ assessments: next });
                          }}
                          disabled={editAssessmentForm.assessments.length === 1}
                        >
                          <Delete className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                      )}
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
                  const nonExamTotal = editAssessmentForm.assessments
                    .filter((a) => !a.name.toLowerCase().includes("exam"))
                    .reduce((s, a) => s + (Number(a.total) || 0), 0);
                  const remaining = Math.max(0, 30 - nonExamTotal);
                  setEditAssessmentForm({
                    assessments: [
                      ...editAssessmentForm.assessments,
                      { name: "", total: remaining },
                    ],
                  });
                }}
              >
                <Plus className="mr-1 h-3 w-3" /> Add Assessment
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
                className="w-full bg-blue-600 hover:bg-blue-700 sm:w-auto"
                disabled={
                  editAssessmentTotal !== 100 ||
                  isSavingAssessments ||
                  (editAssessmentForm.assessments.some((a) =>
                    a.name.toLowerCase().includes("exam"),
                  ) &&
                    editAssessmentForm.assessments
                      .filter((a) => !a.name.toLowerCase().includes("exam"))
                      .reduce((s, a) => s + (Number(a.total) || 0), 0) !== 30)
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