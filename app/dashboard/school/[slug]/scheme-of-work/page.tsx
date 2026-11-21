"use client";

import { useState, useEffect, useCallback } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { DataStateCard } from "@/components/dashboard/shared";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  Plus,
  BookText,
  Calendar,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

const weekSchema = z.object({
  week: z.coerce.number().min(1).max(20),
  topic: z.string().min(1, "Topic is required"),
  objectives: z.string().optional(),
  activities: z.string().optional(),
  resources: z.string().optional(),
  evaluation: z.string().optional(),
});

const sowSchema = z.object({
  classLevelId: z.string().min(1, "Class is required"),
  subjectId: z.string().min(1, "Subject is required"),
  title: z.string().min(1, "Title is required"),
  term: z.string().min(1, "Term is required"),
  academicYear: z.string().min(1, "Academic year is required"),
});

type ClassLevel = { id: string; name: string };
type Subject = { id: string; name: string; code: string | null };
type SowWeek = {
  week: number;
  topic: string;
  objectives?: string;
  activities?: string;
  resources?: string;
  evaluation?: string;
};
type SowItem = {
  id: string;
  title: string;
  term: string;
  academicYear: string;
  classLevel: ClassLevel;
  subject: Subject;
  createdBy: { user: { firstName: string; lastName: string } };
  weeks: SowWeek[];
  createdAt: string;
};

export default function SchemeOfWorkPage() {
  const { currentOrg, currentMember } = useOrganization();
  const isStaff = !!currentMember && currentMember.role !== "parent";
  const [items, setItems] = useState<SowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [classLevels, setClassLevels] = useState<ClassLevel[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWeeks, setEditingWeeks] = useState<SowWeek[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editItem, setEditItem] = useState<SowItem | null>(null);
  const [weeksCount, setWeeksCount] = useState(12);
  const [filterClass, setFilterClass] = useState("");

  const form = useForm<z.infer<typeof sowSchema>>({
    resolver: zodResolver(sowSchema),
    defaultValues: {
      classLevelId: "",
      subjectId: "",
      title: "",
      term: "Term 1",
      academicYear: new Date().getFullYear() + "/" + (new Date().getFullYear() + 1),
    },
  });

  useEffect(() => {
    if (!currentOrg) return;
    fetchClassLevels();
    fetchSubjects();
    fetchItems();
  }, [currentOrg]);

  async function fetchClassLevels() {
    if (!currentOrg) return;
    try {
      const data = await apiFetch<ClassLevel[]>(`/classes/${currentOrg.slug}`);
      setClassLevels(data);
    } catch { /* */ }
  }

  async function fetchSubjects() {
    if (!currentOrg) return;
    try {
      const data = await apiFetch<Subject[]>(`/subjects/${currentOrg.slug}`);
      setSubjects(data);
    } catch { /* */ }
  }

  async function fetchItems() {
    if (!currentOrg) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterClass) params.set("classLevelId", filterClass);
      const res = await apiFetch<SowItem[]>(
        `/scheme-of-work/${currentOrg.slug}?${params.toString()}`,
      );
      setItems(Array.isArray(res) ? res : (res as any).data ?? []);
    } catch { /* */ } finally {
      setLoading(false);
    }
  }

  async function onSubmit(values: z.infer<typeof sowSchema>) {
    if (!currentOrg || editingWeeks.length === 0) {
      toast.error("Add at least one week");
      return;
    }
    setSaving(true);
    try {
      const body = {
        ...values,
        weeks: editingWeeks,
      };
      if (editItem) {
        await apiFetch(`/scheme-of-work/${currentOrg.slug}/${editItem.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        toast.success("Scheme of work updated");
      } else {
        await apiFetch(`/scheme-of-work/${currentOrg.slug}`, {
          method: "POST",
          body: JSON.stringify(body),
        });
        toast.success("Scheme of work created");
      }
      setDialogOpen(false);
      setEditItem(null);
      form.reset();
      setEditingWeeks([]);
      fetchItems();
    } catch { /* */ } finally {
      setSaving(false);
    }
  }

  function generateWeeks(count: number) {
    const weeks: SowWeek[] = [];
    for (let i = 1; i <= count; i++) {
      weeks.push({ week: i, topic: "", objectives: "", activities: "", resources: "", evaluation: "" });
    }
    setEditingWeeks(weeks);
  }

  function updateWeek(index: number, field: keyof SowWeek, value: string) {
    setEditingWeeks((prev) =>
      prev.map((w, i) => (i === index ? { ...w, [field]: value } : w)),
    );
  }

  function openCreate() {
    setEditItem(null);
    form.reset();
    setEditingWeeks([]);
    setWeeksCount(12);
    setDialogOpen(true);
  }

  function openEdit(item: SowItem) {
    setEditItem(item);
    form.reset({
      classLevelId: item.classLevel.id,
      subjectId: item.subject.id,
      title: item.title,
      term: item.term,
      academicYear: item.academicYear,
    });
    setEditingWeeks(item.weeks);
    setDialogOpen(true);
  }

  async function deleteItem(id: string) {
    if (!currentOrg) return;
    try {
      await apiFetch(`/scheme-of-work/${currentOrg.slug}/${id}`, {
        method: "DELETE",
      });
      toast.success("Deleted");
      fetchItems();
    } catch { /* */ }
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (!currentOrg) return null;

  if (!isStaff) {
    return (
      <div className="min-h-full bg-slate-50/60 pb-10">
        <div className="mx-auto max-w-5xl p-6">
          <DataStateCard
            variant="forbidden"
            title="Scheme of work isn&apos;t available to your role"
            description="This is a staff tool for teachers and admins."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50/60 pb-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 md:gap-6 md:px-6 md:py-8 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="hidden md:block">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Scheme of Work
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Plan and manage curriculum delivery per term.
            </p>
          </div>
          <Button onClick={openCreate} className="h-11 w-full shrink-0 bg-blue-600 font-semibold hover:bg-blue-700 md:h-9 md:w-auto md:px-4">
            <Plus className="mr-2 h-4 w-4" />
            New scheme
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Select
            value={filterClass}
            onValueChange={(value: unknown) => {
              setFilterClass(value as string);
              setTimeout(fetchItems, 0);
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {classLevels.map((cl) => (
                <SelectItem key={cl.id} value={cl.id}>
                  {cl.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card className="border-dashed border-slate-300">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <BookText className="h-10 w-10 text-slate-300" />
              <p className="text-sm text-slate-500">
                No schemes of work yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <Card key={item.id} className="border-slate-200 shadow-sm">
                <div
                  className="flex cursor-pointer items-center justify-between px-4 py-3"
                  onClick={() => toggleExpand(item.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {expanded.has(item.id) ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {item.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.classLevel.name} · {item.subject.name}{" "}
                        {item.subject.code && `(${item.subject.code})`} ·{" "}
                        {item.term} · {item.academicYear}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <span className="text-xs text-slate-500">
                      {item.weeks.length} weeks
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(item);
                      }}
                      className="text-slate-300 hover:text-blue-600 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteItem(item.id);
                      }}
                      className="text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {expanded.has(item.id) && (
                  <div className="border-t border-slate-100 px-4 py-3 overflow-x-auto">
                    <table className="w-full min-w-[480px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 text-xs font-medium text-slate-500 uppercase tracking-wider">
                          <th className="pb-2 pr-2 w-12">#</th>
                          <th className="pb-2 pr-2">Topic</th>
                          <th className="pb-2 pr-2 hidden md:table-cell">Objectives</th>
                          <th className="pb-2 pr-2 hidden lg:table-cell">Activities</th>
                          <th className="pb-2 pr-2 hidden lg:table-cell">Resources</th>
                          <th className="pb-2 hidden md:table-cell">Evaluation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.weeks.map((w) => (
                          <tr
                            key={w.week}
                            className="border-b border-slate-50 last:border-0"
                          >
                            <td className="py-2 pr-2 text-slate-500 font-mono text-xs align-top">
                              {w.week}
                            </td>
                            <td className="py-2 pr-2 font-medium text-slate-700 align-top">
                              {w.topic || "—"}
                            </td>
                            <td className="py-2 pr-2 text-slate-500 text-xs hidden md:table-cell align-top">
                              {w.objectives || "—"}
                            </td>
                            <td className="py-2 pr-2 text-slate-500 text-xs hidden lg:table-cell align-top">
                              {w.activities || "—"}
                            </td>
                            <td className="py-2 pr-2 text-slate-500 text-xs hidden lg:table-cell align-top">
                              {w.resources || "—"}
                            </td>
                            <td className="py-2 text-slate-500 text-xs hidden md:table-cell align-top">
                              {w.evaluation || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditItem(null);
              form.reset();
              setEditingWeeks([]);
            }
          }}
        >
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                {editItem ? "Edit Scheme of Work" : "New Scheme of Work"}
              </DialogTitle>
              <DialogDescription className="sr-only">Form to add or edit weeks of a scheme of work.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="classLevelId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Class</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select class" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {classLevels.map((cl) => (
                              <SelectItem key={cl.id} value={cl.id}>
                                {cl.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="subjectId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select subject" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {subjects.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name} {s.code && `(${s.code})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="term"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Term</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Term 1">Term 1</SelectItem>
                            <SelectItem value="Term 2">Term 2</SelectItem>
                            <SelectItem value="Term 3">Term 3</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="academicYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Academic Year</FormLabel>
                        <FormControl>
                          <Input placeholder="2026/2027" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Algebra Fundamentals" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-base">Weekly Breakdown</FormLabel>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        value={weeksCount}
                        onChange={(e) => setWeeksCount(Number(e.target.value))}
                        className="w-16 h-8 text-xs"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => generateWeeks(weeksCount)}
                      >
                        Generate {weeksCount} weeks
                      </Button>
                    </div>
                  </div>

                  {editingWeeks.map((w, i) => (
                    <Card key={i} className="border-slate-200">
                      <CardHeader className="py-2 px-3">
                        <CardTitle className="text-xs font-semibold text-slate-500">
                          Week {w.week}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="py-2 px-3 space-y-2">
                        <Input
                          placeholder="Topic"
                          value={w.topic}
                          onChange={(e) => updateWeek(i, "topic", e.target.value)}
                          className="text-sm"
                        />
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Textarea
                            placeholder="Objectives"
                            value={w.objectives || ""}
                            onChange={(e) =>
                              updateWeek(i, "objectives", e.target.value)
                            }
                            className="min-h-[60px] text-xs"
                          />
                          <Textarea
                            placeholder="Activities"
                            value={w.activities || ""}
                            onChange={(e) =>
                              updateWeek(i, "activities", e.target.value)
                            }
                            className="min-h-[60px] text-xs"
                          />
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Input
                            placeholder="Resources"
                            value={w.resources || ""}
                            onChange={(e) =>
                              updateWeek(i, "resources", e.target.value)
                            }
                            className="text-xs"
                          />
                          <Input
                            placeholder="Evaluation"
                            value={w.evaluation || ""}
                            onChange={(e) =>
                              updateWeek(i, "evaluation", e.target.value)
                            }
                            className="text-xs"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {editItem ? "Update" : "Create"} Scheme of Work
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
