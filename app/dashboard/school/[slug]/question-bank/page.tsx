"use client";

import { useState, useEffect } from "react";
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
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2, Plus, HelpCircle, Pencil, Trash2, Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

const questionSchema = z.object({
  classLevelId: z.string().min(1, "Required"),
  subjectId: z.string().min(1, "Required"),
  topic: z.string().min(1, "Required"),
  questionType: z.enum(["multiple_choice", "theory", "true_false", "fill_blank"]),
  question: z.string().min(1, "Required"),
  options: z.string().optional(),
  correctAnswer: z.string().min(1, "Required"),
  explanation: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  marks: z.number().min(1),
  tags: z.string().optional(),
});

type ClassLevel = { id: string; name: string };
type Subject = { id: string; name: string; code: string | null };
type Question = {
  id: string; topic: string; questionType: string; question: string;
  options: string[] | null; correctAnswer: string; explanation: string | null;
  difficulty: string; marks: number; status: string; tags: string[];
  classLevel: ClassLevel; subject: Subject;
  createdBy: { user: { firstName: string; lastName: string } };
  createdAt: string;
};

export default function QuestionBankPage() {
  const { currentOrg, currentMember } = useOrganization();
  const isStaff = !!currentMember && currentMember.role !== "parent";
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [classLevels, setClassLevels] = useState<ClassLevel[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Question | null>(null);
  const [filterClass, setFilterClass] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("");
  const [searchTopic, setSearchTopic] = useState("");

  const form = useForm({
    resolver: zodResolver(questionSchema) as any,
    defaultValues: {
      classLevelId: "", subjectId: "", topic: "", questionType: "multiple_choice",
      question: "", options: "", correctAnswer: "", explanation: "",
      difficulty: "medium", marks: 1, tags: "",
    },
  });

  useEffect(() => { if (!currentOrg) return; fetchClassLevels(); fetchSubjects(); fetchQuestions(); }, [currentOrg, filterClass, filterDifficulty]);

  async function fetchClassLevels() {
    if (!currentOrg) return;
    try { const d = await apiFetch<ClassLevel[]>(`/classes/${currentOrg.slug}`); setClassLevels(d); } catch { /* */ }
  }
  async function fetchSubjects() {
    if (!currentOrg) return;
    try { const d = await apiFetch<Subject[]>(`/subjects/${currentOrg.slug}`); setSubjects(d); } catch { /* */ }
  }
  async function fetchQuestions() {
    if (!currentOrg) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterClass) params.set("classLevelId", filterClass);
      if (filterDifficulty) params.set("difficulty", filterDifficulty);
      if (searchTopic) params.set("topic", searchTopic);
      const res = await apiFetch<Question[]>(`/lesson-planner/questions/${currentOrg.slug}?${params}`);
      setQuestions(Array.isArray(res) ? res : (res as any).data ?? []);
    } catch { /* */ } finally { setLoading(false); }
  }

  async function onSubmit(values: z.infer<typeof questionSchema>) {
    if (!currentOrg) return;
    setSaving(true);
    try {
      let options: string[] = [];
      if (values.questionType === "multiple_choice" && values.options) {
        options = values.options.split("\n").map((o) => o.trim()).filter(Boolean);
      }
      const body = { ...values, options, tags: values.tags ? values.tags.split(",").map((t) => t.trim()) : [] };
      if (editItem) {
        await apiFetch(`/lesson-planner/questions/${currentOrg.slug}/${editItem.id}`, { method: "PUT", body: JSON.stringify(body) });
        toast.success("Updated");
      } else {
        await apiFetch(`/lesson-planner/questions/${currentOrg.slug}`, { method: "POST", body: JSON.stringify(body) });
        toast.success("Created");
      }
      setDialogOpen(false); setEditItem(null); form.reset(); fetchQuestions();
    } catch { /* */ } finally { setSaving(false); }
  }

  async function deleteQuestion(id: string) {
    if (!currentOrg) return;
    if (!confirm("Delete this question? This can't be undone.")) return;
    try { await apiFetch(`/lesson-planner/questions/${currentOrg.slug}/${id}`, { method: "DELETE" }); toast.success("Deleted"); fetchQuestions(); } catch { /* */ }
  }

  function openEdit(q: Question) {
    setEditItem(q);
    form.reset({
      classLevelId: q.classLevel.id, subjectId: q.subject.id, topic: q.topic,
      questionType: q.questionType, question: q.question,
      options: Array.isArray(q.options) ? q.options.join("\n") : "",
      correctAnswer: q.correctAnswer, explanation: q.explanation || "",
      difficulty: q.difficulty, marks: q.marks, tags: q.tags?.join(", ") || "",
    } as any);
    setDialogOpen(true);
  }

  const difficultyColor = (d: string) => {
    switch (d) {
      case "easy": return "border-emerald-200 bg-emerald-50 text-emerald-700";
      case "medium": return "border-amber-200 bg-amber-50 text-amber-700";
      case "hard": return "border-rose-200 bg-rose-50 text-rose-700";
      default: return "";
    }
  };

  const typeIcon = (t: string) => {
    switch (t) {
      case "multiple_choice": return "MCQ";
      case "theory": return "TH";
      case "true_false": return "TF";
      case "fill_blank": return "FB";
      default: return "?";
    }
  };

  if (!currentOrg) return null;

  if (!isStaff) {
    return (
      <div className="min-h-full bg-slate-50/60 pb-10">
        <div className="mx-auto max-w-5xl p-6">
          <DataStateCard
            variant="forbidden"
            title="Question bank isn&apos;t available to your role"
            description="This is a staff tool for teachers and admins."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50/60 pb-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:gap-6 md:px-6 md:py-8 lg:px-8">
        <div className="flex items-start justify-between gap-3">
          <div className="hidden min-w-0 md:block">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Question Bank</h1>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">Create and manage exam/quiz questions.</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditItem(null); form.reset(); } }}>
            <DialogTrigger asChild>
              <Button className="h-11 w-full shrink-0 bg-blue-600 font-semibold hover:bg-blue-700 md:h-9 md:w-auto md:px-4"><Plus className="mr-2 h-4 w-4" />New question</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editItem ? "Edit" : "New"} Question</DialogTitle>
                <DialogDescription className="sr-only">Form to add or edit questions in the question bank.</DialogDescription>
              </DialogHeader>
              <Form {...form as any}>
                <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
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
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField control={form.control} name="topic" render={({ field }) => (
                      <FormItem><FormLabel>Topic</FormLabel><FormControl><Input placeholder="e.g. Algebra" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="questionType" render={({ field }) => (
                      <FormItem><FormLabel>Type</FormLabel><Select value={field.value} onValueChange={(v: unknown) => field.onChange(v as string)}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent><SelectItem value="multiple_choice">Multiple Choice</SelectItem><SelectItem value="theory">Theory</SelectItem><SelectItem value="true_false">True/False</SelectItem><SelectItem value="fill_blank">Fill in Blank</SelectItem></SelectContent>
                      </Select><FormMessage /></FormItem>
                    )} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField control={form.control} name="difficulty" render={({ field }) => (
                      <FormItem><FormLabel>Difficulty</FormLabel><Select value={field.value} onValueChange={(v: unknown) => field.onChange(v as string)}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent><SelectItem value="easy">Easy</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="hard">Hard</SelectItem></SelectContent>
                      </Select><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="marks" render={({ field }) => (
                      <FormItem><FormLabel>Marks</FormLabel><FormControl><Input type="number" min={1} value={field.value} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="question" render={({ field }) => (
                    <FormItem><FormLabel>Question</FormLabel><FormControl><Textarea placeholder="Write the question..." className="min-h-[80px]" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  {form.watch("questionType") === "multiple_choice" && (
                    <FormField control={form.control} name="options" render={({ field }) => (
                      <FormItem><FormLabel>Options <span className="text-slate-400">(one per line)</span></FormLabel>
                        <FormControl><Textarea placeholder="A. First option\nB. Second option\nC. Third option\nD. Fourth option" className="min-h-[100px] font-mono text-sm" {...field} /></FormControl><FormMessage />
                      </FormItem>
                    )} />
                  )}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField control={form.control} name="correctAnswer" render={({ field }) => (
                      <FormItem><FormLabel>Correct Answer</FormLabel><FormControl><Input placeholder="e.g. A or the answer text" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="tags" render={({ field }) => (
                      <FormItem><FormLabel>Tags <span className="text-slate-400">(comma-sep)</span></FormLabel><FormControl><Input placeholder="algebra, exam" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="explanation" render={({ field }) => (
                    <FormItem><FormLabel>Explanation <span className="text-slate-400">(optional)</span></FormLabel><FormControl><Textarea placeholder="Why is this the correct answer?" className="min-h-[60px]" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <Button type="submit" disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{editItem ? "Update" : "Create"} Question</Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
          <Select value={filterClass} onValueChange={(v: unknown) => { setFilterClass(v as string); }}>
            <SelectTrigger aria-label="Filter by class" className="h-11 w-full sm:h-9 sm:w-[180px] sm:text-sm"><SelectValue placeholder="All classes" /></SelectTrigger>
            <SelectContent><SelectItem value="">All classes</SelectItem>{classLevels.map((cl) => <SelectItem key={cl.id} value={cl.id}>{cl.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filterDifficulty} onValueChange={(v: unknown) => { setFilterDifficulty(v as string); }}>
            <SelectTrigger aria-label="Filter by difficulty" className="h-11 w-full sm:h-9 sm:w-[140px] sm:text-sm"><SelectValue placeholder="Difficulty" /></SelectTrigger>
            <SelectContent><SelectItem value="">All</SelectItem><SelectItem value="easy">Easy</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="hard">Hard</SelectItem></SelectContent>
          </Select>
          <div className="relative col-span-2 sm:min-w-[140px] sm:max-w-xs sm:flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input type="search" enterKeyHint="search" placeholder="Search topic" aria-label="Search topic" className="h-11 pl-9 sm:h-9 sm:text-sm" value={searchTopic} onChange={(e) => setSearchTopic(e.target.value)} onKeyDown={(e) => e.key === "Enter" && fetchQuestions()} />
          </div>
        </div>

        {loading ? <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
        : questions.length === 0 ? <Card className="border-dashed border-slate-300"><CardContent className="flex flex-col items-center gap-3 py-8 text-center sm:py-12"><HelpCircle className="h-8 w-8 text-slate-300 sm:h-10 sm:w-10" /><p className="text-sm text-slate-600">No questions yet. Add your first question, or change the filters above.</p></CardContent></Card>
        : <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white md:rounded-lg">
            {questions.map((q) => (
              <div key={q.id} className="flex items-start gap-3 py-3 pl-4 pr-1 sm:gap-4 sm:px-4">
                <div className="shrink-0 w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 uppercase">{typeIcon(q.questionType)}</div>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-semibold text-slate-900 leading-tight">{q.question}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <span className="text-xs text-slate-500">{q.classLevel.name} · {q.subject.name}</span>
                    <Badge variant="outline" className={cn("rounded-full px-2 py-0 text-xs capitalize", difficultyColor(q.difficulty))}>{q.difficulty}</Badge>
                    <Badge variant="outline" className="rounded-full border-slate-200 px-2 py-0 text-xs">{q.marks} mark{q.marks > 1 ? "s" : ""}</Badge>
                    {q.tags?.map((t) => <Badge key={t} variant="secondary" className="px-1.5 py-0 text-xs">{t}</Badge>)}
                  </div>
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <button type="button" onClick={() => openEdit(q)} aria-label="Edit question" className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-600 md:pointer-fine:h-8 md:pointer-fine:w-8"><Pencil className="h-4 w-4" /></button>
                  <button type="button" onClick={() => deleteQuestion(q.id)} aria-label="Delete question" className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 md:pointer-fine:h-8 md:pointer-fine:w-8"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        }
      </div>
    </div>
  );
}
