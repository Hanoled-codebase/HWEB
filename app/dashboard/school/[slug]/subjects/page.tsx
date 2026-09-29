"use client";

import { useState, useEffect } from "react";
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
import { Search, Loader2, Plus, Trash2 } from "lucide-react";
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

export default function SubjectsPage() {
  const router = useRouter();
  const { currentOrg, currentMember } = useOrganization();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
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

  const categoryFiltered = activeCategory
    ? subjects.filter((s) => s.category === activeCategory)
    : subjects;

  const filtered = categoryFiltered.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

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
    <div className="space-y-6">
      <EntityHeader
        title="Subjects"
        subtitle={`${subjects.length} subjects (${defaultCount} default, ${customCount} custom)`}
      />

      {/* Category filter chips: one scrolling row on phones, wrapping on desktop */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
        <button
          onClick={() => setActiveCategory(null)}
          aria-pressed={!activeCategory}
          className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-medium transition md:min-h-0 md:px-3 md:py-1 md:text-xs ${
            !activeCategory
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100 md:bg-slate-50/70 md:ring-0"
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
              className={`min-h-11 shrink-0 whitespace-nowrap rounded-full px-4 text-sm font-medium transition md:min-h-0 md:px-3 md:py-1 md:text-xs ${
                activeCategory === key
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100 md:bg-slate-50/70 md:ring-0"
              }`}
            >
              <span>{CATEGORIES[key]}</span>
              <span className={`ml-1 ${activeCategory === key ? "text-blue-100" : "text-slate-500"}`}>({count})</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
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
                            className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 md:mr-0 md:h-auto md:w-auto md:px-2 md:py-1 md:text-xs md:font-medium"
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
