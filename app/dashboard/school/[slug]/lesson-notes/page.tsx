"use client";

import { useState, useEffect } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from "@/components/ui/form";
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
  Loader2, Plus, FileText, Pencil, Trash2, BookOpen, Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

const noteSchema = z.object({
  classLevelId: z.string().min(1, "Required"),
  subjectId: z.string().min(1, "Required"),
  topic: z.string().min(1, "Required"),
  objectives: z.string().optional(),
  materials: z.string().optional(),
  content: z.string().min(1, "Required"),
  evaluation: z.string().optional(),
  tags: z.string().optional(),
});

type ClassLevel = { id: string; name: string };
type Subject = { id: string; name: string; code: string | null };
type LessonNote = {
  id: string; topic: string; objectives: string; materials: string | null;
  content: string; evaluation: string | null; status: string; tags: string[];
  classLevel: ClassLevel; subject: Subject;
  createdBy: { user: { firstName: string; lastName: string } };
  createdAt: string; updatedAt: string;
};

export default function LessonNotesPage() {
  const { currentOrg } = useOrganization();
  const [notes, setNotes] = useState<LessonNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [classLevels, setClassLevels] = useState<ClassLevel[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<LessonNote | null>(null);
  const [filterClass, setFilterClass] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const form = useForm<z.infer<typeof noteSchema>>({
    resolver: zodResolver(noteSchema),
    defaultValues: { classLevelId: "", subjectId: "", topic: "", objectives: "", materials: "", content: "", evaluation: "", tags: "" },
  });

  useEffect(() => { if (!currentOrg) return; fetchClassLevels(); fetchSubjects(); fetchNotes(); }, [currentOrg, filterClass, filterStatus]);

  async function fetchClassLevels() {
    if (!currentOrg) return;
    try { const d = await apiFetch<ClassLevel[]>(`/classes/${currentOrg.slug}`); setClassLevels(d); } catch { /* */ }
  }
  async function fetchSubjects() {
    if (!currentOrg) return;
    try { const d = await apiFetch<Subject[]>(`/subjects/${currentOrg.slug}`); setSubjects(d); } catch { /* */ }
  }
  async function fetchNotes() {
    if (!currentOrg) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterClass) params.set("classLevelId", filterClass);
      if (filterStatus) params.set("status", filterStatus);
      const res = await apiFetch<LessonNote[]>(`/lesson-planner/notes/${currentOrg.slug}?${params}`);
      setNotes(Array.isArray(res) ? res : (res as any).data ?? []);
    } catch { /* */ } finally { setLoading(false); }
  }

  async function onSubmit(values: z.infer<typeof noteSchema>) {
    if (!currentOrg) return;
    setSaving(true);
    try {
      const body = { ...values, tags: values.tags ? values.tags.split(",").map((t) => t.trim()) : [] };
      if (editItem) {
        await apiFetch(`/lesson-planner/notes/${currentOrg.slug}/${editItem.id}`, { method: "PUT", body: JSON.stringify(body) });
        toast.success("Updated");
      } else {
        await apiFetch(`/lesson-planner/notes/${currentOrg.slug}`, { method: "POST", body: JSON.stringify(body) });
        toast.success("Created");
      }
      setDialogOpen(false); setEditItem(null); form.reset(); fetchNotes();
    } catch { /* */ } finally { setSaving(false); }
  }

  async function deleteNote(id: string) {
    if (!currentOrg) return;
    try { await apiFetch(`/lesson-planner/notes/${currentOrg.slug}/${id}`, { method: "DELETE" }); toast.success("Deleted"); fetchNotes(); } catch { /* */ }
  }

  function openEdit(n: LessonNote) {
    setEditItem(n);
    form.reset({
      classLevelId: n.classLevel.id, subjectId: n.subject.id, topic: n.topic,
      objectives: n.objectives || "", materials: n.materials || "", content: n.content,
      evaluation: n.evaluation || "", tags: n.tags?.join(", ") || "",
    });
    setDialogOpen(true);
  }

  if (!currentOrg) return null;

  return (
    <div className="min-h-full bg-slate-50/60 pb-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-3 py-5 sm:gap-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Lesson Notes</h1>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">Standardized lesson plans for every topic.</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditItem(null); form.reset(); } }}>
            <DialogTrigger asChild>
              <Button className="shrink-0 bg-blue-600 hover:bg-blue-700 h-8 px-3 text-xs sm:h-9 sm:px-4 sm:text-sm"><Plus className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />New Note</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editItem ? "Edit" : "New"} Lesson Note</DialogTitle>
                <DialogDescription className="sr-only">Form to add or edit notes for lesson planning.</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField control={form.control} name="classLevelId" render={({ field }) => (
                      <FormItem><FormLabel>Class</FormLabel><Select value={field.value} onValueChange={(v: unknown) => field.onChange(v as string)}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                        <SelectContent>{classLevels.map((cl) => <SelectItem key={cl.id} value={cl.id}>{cl.name}</SelectItem>)}</SelectContent>
                      </Select><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="subjectId" render={({ field }) => (
                      <FormItem><FormLabel>Subject</FormLabel><Select value={field.value} onValueChange={(v: unknown) => field.onChange(v as string)}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                        <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                      </Select><FormMessage /></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="topic" render={({ field }) => (
                    <FormItem><FormLabel>Topic</FormLabel><FormControl><Input placeholder="e.g. Introduction to Fractions" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="objectives" render={({ field }) => (
                    <FormItem><FormLabel>Objectives</FormLabel><FormControl><Textarea placeholder="What students will learn..." className="min-h-[60px]" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="materials" render={({ field }) => (
                    <FormItem><FormLabel>Materials / Resources</FormLabel><FormControl><Input placeholder="Textbook, worksheets, etc." {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="content" render={({ field }) => (
                    <FormItem><FormLabel>Lesson Content</FormLabel><FormControl><Textarea placeholder="Main lesson body (markdown supported)" className="min-h-[200px] font-mono text-sm" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="evaluation" render={({ field }) => (
                    <FormItem><FormLabel>Evaluation / Wrap-up</FormLabel><FormControl><Textarea placeholder="Exit ticket, quiz questions, homework..." className="min-h-[60px]" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="tags" render={({ field }) => (
                    <FormItem><FormLabel>Tags <span className="text-slate-400">(comma-separated)</span></FormLabel>
                      <FormControl><Input placeholder="fractions, math, grade-4" {...field} /></FormControl>
                      <FormDescription>e.g. algebra, fractions, grade-4</FormDescription><FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{editItem ? "Update" : "Create"} Note</Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Select value={filterClass} onValueChange={(v: unknown) => { setFilterClass(v as string); }}>
            <SelectTrigger className="w-[140px] h-8 text-xs sm:w-[180px] sm:h-9 sm:text-sm"><SelectValue placeholder="All classes" /></SelectTrigger>
            <SelectContent><SelectItem value="">All classes</SelectItem>{classLevels.map((cl) => <SelectItem key={cl.id} value={cl.id}>{cl.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={(v: unknown) => { setFilterStatus(v as string); }}>
            <SelectTrigger className="w-[110px] h-8 text-xs sm:w-[140px] sm:h-9 sm:text-sm"><SelectValue placeholder="All status" /></SelectTrigger>
            <SelectContent><SelectItem value="">All</SelectItem><SelectItem value="draft">Draft</SelectItem><SelectItem value="published">Published</SelectItem></SelectContent>
          </Select>
        </div>

        {loading ? <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
        : notes.length === 0 ? <Card className="border-dashed border-slate-300"><CardContent className="flex flex-col items-center gap-3 py-8 text-center sm:py-12"><BookOpen className="h-8 w-8 text-slate-300 sm:h-10 sm:w-10" /><p className="text-xs text-slate-400 sm:text-sm">No lesson notes yet.</p></CardContent></Card>
        : <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {notes.map((n) => (
              <Card key={n.id} className="border-slate-200 shadow-sm flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <Badge variant="outline" className={cn("rounded-full text-[11px] px-2 py-0", n.status === "published" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700")}>{n.status}</Badge>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => openEdit(n)} className="text-slate-300 hover:text-blue-600"><Pencil className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => deleteNote(n.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                  <CardTitle className="text-sm font-semibold mt-1 line-clamp-2">{n.topic}</CardTitle>
                  <CardDescription className="text-xs">{n.classLevel.name} · {n.subject.name}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between">
                  <p className="text-xs text-slate-500 line-clamp-3 mb-2">{n.objectives || "No objectives"}</p>
                  {n.tags?.length > 0 && <div className="flex flex-wrap gap-1">{n.tags.map((t) => <Badge key={t} variant="secondary" className="text-[11px] px-1.5 py-0">{t}</Badge>)}</div>}
                </CardContent>
              </Card>
            ))}
          </div>
        }
      </div>
    </div>
  );
}
