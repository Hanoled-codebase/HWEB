"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOrganization } from "@/hooks/useOrganization";
import { apiFetch } from "@/lib/api";
import { useCachedList } from "@/hooks/useCachedList";
import { orgQueries } from "@/lib/queries";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Search,
  Loader2,
  Plus,
  Trash2,
  ChevronRight,
  MoreHorizontal,
  BookOpen,
  FlaskConical,
  Calculator,
  Palette,
  CheckCircle2,
  Layers,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { EntityHeader } from "@/components/dashboard/shared";

type Subject = {
  id: string;
  name: string;
  code?: string | null;
  category?: string | null;
  isDefault?: boolean;
  assignedTeachers?: Array<{ id?: string; name: string; email?: string; className?: string }>;
  assignedClasses?: Array<{ id: string; name: string }>;
};

const CATEGORIES: Record<string, string> = {
  compulsory: "Compulsory",
  science: "Sciences",
  humanities: "Humanities",
  business: "Business",
  trade: "Trade / Vocational",
  language: "Languages",
};

const CATEGORY_ORDER = ["compulsory", "science", "humanities", "business", "trade", "language"];

const subjectFormSchema = z.object({
  name: z.string().min(2, "Subject name must be at least 2 characters"),
  code: z.string().optional(),
  category: z.string().optional(),
});

function getSubjectIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("math") || lower.includes("calc") || lower.includes("arith")) {
    return Calculator;
  }
  if (lower.includes("sci") || lower.includes("chem") || lower.includes("phys") || lower.includes("bio")) {
    return FlaskConical;
  }
  if (lower.includes("art") || lower.includes("music") || lower.includes("craft") || lower.includes("drama")) {
    return Palette;
  }
  return BookOpen;
}

export default function SubjectsPage() {
  const router = useRouter();
  const { currentOrg, currentMember } = useOrganization();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedClassFilter, setSelectedClassFilter] = useState("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("ALL");
  // Phones fold the add form away until asked for; desktop keeps it in the sidebar.
  const [addOpen, setAddOpen] = useState(false);

  const isPrivileged =
    currentMember?.role === "owner" || currentMember?.role === "admin";

  const form = useForm<z.infer<typeof subjectFormSchema>>({
    resolver: zodResolver(subjectFormSchema),
    defaultValues: { name: "", code: "", category: "" },
  });

  const orgSlug = currentOrg?.slug ?? "";
  const subjectsQuery = orgQueries.subjects<Subject[]>(orgSlug);
  const [subjects, setSubjects, isLoading] = useCachedList<Subject[]>(
    subjectsQuery.queryKey,
    subjectsQuery.queryFn,
    { enabled: !!orgSlug, initial: [], onError: () => toast.error("Failed to load subjects") },
  );

  const allClasses = useMemo(() => {
    const set = new Set<string>();
    subjects.forEach((s) => {
      s.assignedClasses?.forEach((c) => {
        if (c.name) set.add(c.name);
      });
    });
    return Array.from(set).sort();
  }, [subjects]);

  const activeCount = useMemo(
    () =>
      subjects.filter(
        (s) =>
          (s.assignedClasses && s.assignedClasses.length > 0) ||
          (s.assignedTeachers && s.assignedTeachers.length > 0) ||
          s.isDefault,
      ).length,
    [subjects],
  );

  const draftCount = Math.max(0, subjects.length - activeCount);

  const filtered = useMemo(() => {
    return subjects.filter((s) => {
      // Search
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code?.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      // Category filter
      if (activeCategory && s.category !== activeCategory) return false;

      // Class filter
      if (selectedClassFilter !== "ALL") {
        const hasClass = s.assignedClasses?.some((c) => c.name === selectedClassFilter);
        if (!hasClass) return false;
      }

      // Status filter
      if (selectedStatusFilter === "ACTIVE") {
        const isActive =
          (s.assignedClasses?.length || 0) > 0 ||
          (s.assignedTeachers?.length || 0) > 0 ||
          s.isDefault;
        if (!isActive) return false;
      } else if (selectedStatusFilter === "DRAFT") {
        const isActive =
          (s.assignedClasses?.length || 0) > 0 ||
          (s.assignedTeachers?.length || 0) > 0 ||
          s.isDefault;
        if (isActive) return false;
      }

      return true;
    });
  }, [subjects, searchQuery, activeCategory, selectedClassFilter, selectedStatusFilter]);

  const grouped = filtered.reduce(
    (acc, s) => {
      const cat = s.category && CATEGORIES[s.category] ? s.category : "other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(s);
      return acc;
    },
    {} as Record<string, Subject[]>,
  );

  // Sort categories by defined order, "other" last
  const sortedCategories = Object.keys(grouped).sort(
    (a, b) => {
      const ia = CATEGORY_ORDER.indexOf(a as any);
      const ib = CATEGORY_ORDER.indexOf(b as any);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    },
  );

  async function onSubmit(values: z.infer<typeof subjectFormSchema>) {
    if (!currentOrg) return;
    setIsSubmitting(true);
    try {
      const created = await apiFetch<Subject>(`/subjects/${currentOrg.slug}`, {
        method: "POST",
        body: JSON.stringify({
          name: values.name,
          code: values.code || undefined,
          category: values.category || undefined,
          organizationId: currentOrg.id,
        }),
      });
      setSubjects([...subjects, created]);
      toast.success("Subject added");
      form.reset();
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add subject",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(subjectId: string, name: string, isDefault?: boolean) {
    if (isDefault) {
      toast.error("Default subjects cannot be deleted");
      return;
    }
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await apiFetch(`/subjects/${currentOrg?.slug}/${subjectId}`, {
        method: "DELETE",
      });
      setSubjects(subjects.filter((s) => s.id !== subjectId));
      toast.success("Subject deleted");
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete subject",
      );
    }
  }

  const defaultCount = subjects.filter((s) => s.isDefault).length;
  const customCount = subjects.filter((s) => !s.isDefault).length;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Phones: Hairline Directory List */}
      <div className="flex flex-col gap-3 md:hidden">
        {isPrivileged && (
          <Button
            type="button"
            onClick={() => setAddOpen(true)}
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs active:scale-[0.98] transition"
          >
            <Plus className="h-4 w-4" />
            <span>Add Subject</span>
          </Button>
        )}

        {/* Mobile Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            placeholder="Search by subject name or code..."
            aria-label="Search subjects"
            className="rounded-xl bg-white pl-9 border-slate-200"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Mobile 2-Column Filters */}
        <div className="grid grid-cols-2 gap-2">
          <Select value={selectedClassFilter} onValueChange={(v) => setSelectedClassFilter(v ? String(v) : "ALL")}>
            <SelectTrigger aria-label="Filter by class" className="bg-white border-slate-200 text-sm text-slate-700 rounded-xl">
              <div className="flex items-center gap-1.5 truncate">
                <Layers className="size-3.5 text-slate-500 shrink-0" aria-hidden="true" />
                <SelectValue placeholder="All Classes" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Classes</SelectItem>
              {allClasses.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatusFilter} onValueChange={(v) => setSelectedStatusFilter(v ? String(v) : "ALL")}>
            <SelectTrigger aria-label="Filter by status" className="bg-white border-slate-200 text-sm text-slate-700 rounded-xl">
              <div className="flex items-center gap-1.5 truncate">
                <CheckCircle2 className="size-3.5 text-slate-500 shrink-0" aria-hidden="true" />
                <SelectValue placeholder="All Status" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Quiet 1-line summary */}
        <p className="px-1 text-xs font-medium text-slate-600 tabular-nums">
          {filtered.length} {filtered.length === 1 ? "subject" : "subjects"}
          <span className="mx-1.5 text-slate-300">·</span>
          {activeCount} active
          {draftCount > 0 && (
            <>
              <span className="mx-1.5 text-slate-300">·</span>
              {draftCount} draft
            </>
          )}
        </p>

        {/* Mobile Single-Container Hairline List */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white divide-y divide-slate-100">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-semibold text-slate-800">
                {searchQuery ? "No matches found" : "No subjects yet"}
              </p>
            </div>
          ) : (
            filtered.map((subject) => {
              const Icon = getSubjectIcon(subject.name);
              const isSubjectActive = Boolean(
                (subject.assignedClasses?.length || 0) > 0 ||
                (subject.assignedTeachers?.length || 0) > 0 ||
                subject.isDefault,
              );
              const teacherName = subject.assignedTeachers?.[0]?.name || null;
              const classesLabel =
                subject.assignedClasses && subject.assignedClasses.length > 0
                  ? subject.assignedClasses.map((c) => c.name).join(", ")
                  : null;
              const href = `/dashboard/school/${orgSlug}/subjects/${subject.id}`;
              const metaParts = [
                subject.code || null,
                teacherName || "No teacher assigned",
                classesLabel || (subject.isDefault ? "School-wide" : "No classes assigned"),
              ].filter(Boolean);

              return (
                <div
                  key={subject.id}
                  className="group flex items-center gap-2 pr-2 transition-colors"
                >
                  <Link
                    href={href}
                    className="flex min-h-[68px] min-w-0 flex-1 items-center gap-3 py-3 pl-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 active:bg-slate-50"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-blue-200/70 bg-blue-50 text-blue-600">
                      <Icon className="size-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="truncate text-[15px] font-semibold text-[#0B1220] group-hover:text-blue-600">
                          {subject.name}
                        </h2>
                        {!isSubjectActive && (
                          <span className="shrink-0 rounded-full border border-amber-200/70 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                            Draft
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-slate-600">
                        {metaParts.join(" · ")}
                      </p>
                    </div>
                    {!isPrivileged && (
                      <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
                    )}
                  </Link>

                  {isPrivileged && (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 shrink-0 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                            aria-label={`Options for ${subject.name}`}
                          >
                            <MoreHorizontal className="size-5" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(href)}>
                          View Details
                        </DropdownMenuItem>
                        {!subject.isDefault && (
                          <DropdownMenuItem
                            onClick={() => handleDelete(subject.id, subject.name, subject.isDefault)}
                            className="text-red-600 focus:text-red-700 focus:bg-red-50"
                          >
                            <Trash2 className="mr-2 size-4" />
                            Delete Subject
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              );
            })
          )}
        </section>
      </div>

      {/* Desktop Header & Category Chips */}
      <div className="hidden md:block space-y-6">
        <EntityHeader
          title="Subjects"
          subtitle={`${subjects.length} subjects (${defaultCount} default, ${customCount} custom)`}
        />

        {/* Category filter chips */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveCategory(null)}
            aria-pressed={!activeCategory}
            className={`min-h-0 rounded-full px-3 py-1 text-xs font-medium transition ${
              !activeCategory
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-50/70 text-slate-700 hover:bg-slate-100"
            }`}
          >
            All ({subjects.length})
          </button>
          {CATEGORY_ORDER.map((key) => {
            const count = subjects.filter((s) => s.category === key).length;
            if (!count) return null;
            return (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                aria-pressed={activeCategory === key}
                className={`min-h-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${
                  activeCategory === key
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-50/70 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span>{CATEGORIES[key]}</span>
                <span className={`ml-1 ${activeCategory === key ? "text-blue-100" : "text-slate-500"}`}>({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Add Dialog */}
      {isPrivileged && (
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Subject</DialogTitle>
              <DialogDescription>
                Create a subject unique to your school.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(async (v) => {
                  await onSubmit(v);
                  setAddOpen(false);
                })}
                className="space-y-4 py-2"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Robotics"
                          className="bg-white"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course Code</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. ROB101"
                          className="bg-white"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CATEGORY_ORDER.map((key) => (
                            <SelectItem key={key} value={key}>
                              {CATEGORIES[key]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full bg-[#1447E6] hover:bg-[#0F36B8] text-white rounded-xl font-semibold"
                  disabled={isSubmitting}
                >
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Add Subject
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}

      {/* Desktop Add Form Sidebar */}
      <div className="hidden md:grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by name or code"
              aria-label="Search subjects"
              className="h-11 rounded-2xl bg-white pl-10 shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-2xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-3xl bg-white p-14 text-center shadow-sm">
              <h2 className="text-lg font-bold text-slate-800">
                {searchQuery ? "No matches" : "No subjects yet"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {searchQuery
                  ? "Try a different search term."
                  : "Default subjects were added automatically. You can also add custom ones."}
              </p>
            </div>
          ) : (
            sortedCategories.map((catKey) => {
              const catInfo = CATEGORIES[catKey];
              const catSubjects = grouped[catKey];
              return (
                <div key={catKey}>
                  <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-widest text-slate-500 md:mb-3 md:px-0">
                    {catInfo || "Other"}
                    <span className="ml-2 font-normal text-slate-400">
                      ({catSubjects.length})
                    </span>
                  </h2>
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white max-md:divide-y max-md:divide-slate-100 md:space-y-1.5 md:overflow-visible md:border-0 md:bg-transparent">
                    {catSubjects.map((subject) => (
                      <div
                        key={subject.id}
                        role="button"
                        tabIndex={0}
                        className="flex min-h-16 cursor-pointer items-center gap-3 bg-white px-4 py-3 transition active:bg-slate-50 md:rounded-2xl md:shadow-sm md:hover:shadow-md"
                        onClick={() =>
                          router.push(
                            `/dashboard/school/${currentOrg?.slug}/subjects/${subject.id}`,
                          )
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            router.push(
                              `/dashboard/school/${currentOrg?.slug}/subjects/${subject.id}`,
                            );
                          }
                        }}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-sm font-semibold text-slate-900">
                              {subject.name}
                            </span>
                            {subject.isDefault && (
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">Default</span>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="font-mono text-slate-500">{subject.code || "—"}</span>
                            {subject.assignedClasses && subject.assignedClasses.length > 0 && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                                {subject.assignedClasses.length} {subject.assignedClasses.length === 1 ? "Class" : "Classes"}
                              </span>
                            )}
                            {subject.assignedTeachers && subject.assignedTeachers.length > 0 && (
                              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                                {subject.assignedTeachers.length} {subject.assignedTeachers.length === 1 ? "Teacher" : "Teachers"}
                              </span>
                            )}
                          </div>
                        </div>
                        {isPrivileged && !subject.isDefault && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(subject.id, subject.name, subject.isDefault);
                            }}
                            aria-label={`Remove ${subject.name}`}
                            className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 md:mr-0 md:w-auto md:px-2 md:text-xs md:font-medium md:pointer-fine:h-auto md:pointer-fine:py-1"
                          >
                            <Trash2 className="h-4 w-4 md:hidden" />
                            <span className="hidden md:inline">Remove</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Add form sidebar */}
        {isPrivileged && (
          <div className="max-lg:order-first lg:col-span-1">
            {!addOpen && (
              <Button
                type="button"
                variant="outline"
                className="w-full border-slate-200 bg-white font-semibold text-slate-800 lg:hidden"
                onClick={() => setAddOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add a custom subject
              </Button>
            )}
            <div className={cn("space-y-4 lg:sticky lg:top-[80px]", !addOpen && "max-lg:hidden")}>
              <Card className="shadow-sm border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Plus className="h-4 w-4" />
                    Add Custom Subject
                  </CardTitle>
                  <CardDescription>
                    Create a subject unique to your school.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      className="space-y-4"
                    >
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subject Name *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. Robotics"
                                className="bg-white"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Course Code</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. ROB101"
                                className="bg-white"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="bg-white">
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {CATEGORY_ORDER.map((key) => (
                                  <SelectItem key={key} value={key}>
                                    {CATEGORIES[key]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        disabled={isSubmitting}
                      >
                        {isSubmitting && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Add Subject
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              <div className="rounded-2xl bg-slate-100 p-4 text-sm leading-5 text-slate-600 md:text-xs">
                <strong>Note:</strong> Default subjects cannot be deleted or
                renamed. You can add custom subjects for unique curriculum needs.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
