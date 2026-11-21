"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { useOrganization } from "@/hooks/useOrganization";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { DiscussionBoard } from "@/components/dashboard/DiscussionBoard";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Library,
  Loader2,
  MessageSquare,
  Search,
  Upload,
} from "lucide-react";

type HomeworkSubmission = {
  id: string;
  fileUrl: string;
  score: number | null;
  feedback: string | null;
  submittedAt: string;
  gradedAt: string | null;
};

type StudentHomework = {
  id: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  totalMarks?: number | null;
  fileUrl?: string | null;
  createdAt: string;
  classLevelId: string;
  subjectId: string;
  classLevel?: { id: string; name: string };
  subject?: { id: string; name: string; code?: string | null };
  createdBy?: { id: string; user?: { name: string } };
  submissions?: HomeworkSubmission[];
};

type StudyMaterial = {
  id: string;
  title: string;
  description?: string | null;
  fileUrl: string;
  fileType?: string | null;
  tags?: string[];
  createdAt: string;
  subject?: { id: string; name: string } | null;
  uploadedBy?: { id: string; user?: { name: string } } | null;
};

function formatDueDate(dueDate?: string | null) {
  if (!dueDate) return { label: "No due date", overdue: false, urgent: false };
  const due = new Date(dueDate);
  const now = new Date();
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const formatted = due.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (diffDays < 0) return { label: `Overdue (${formatted})`, overdue: true, urgent: false };
  if (diffDays === 0) return { label: "Due today", overdue: false, urgent: true };
  if (diffDays <= 2) return { label: `Due in ${diffDays}d (${formatted})`, overdue: false, urgent: true };
  return { label: `Due ${formatted}`, overdue: false, urgent: false };
}

export default function StudentHomeworkPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { currentStudent } = useOrganization();
  const classLevelId = currentStudent?.classLevel?.id;

  const [activeTab, setActiveTab] = useState<"assignments" | "materials">("assignments");
  const [homeworkList, setHomeworkList] = useState<StudentHomework[]>([]);
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [loadingHw, setLoadingHw] = useState(true);
  const [loadingMat, setLoadingMat] = useState(true);

  // Filters & search
  const [hwSearch, setHwSearch] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("ALL");
  const [matSearch, setMatSearch] = useState("");

  // Submit dialog state
  const [submittingHw, setSubmittingHw] = useState<StudentHomework | null>(null);
  const [fileUrlInput, setFileUrlInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Discussion sheet
  const [activeMaterial, setActiveMaterial] = useState<{ id: string; title: string } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [hwRes, classMat, genMat] = await Promise.all([
        apiFetch<StudentHomework[]>(`/${slug}/my-homework`).catch(() => []),
        classLevelId
          ? apiFetch<StudyMaterial[]>(`/${slug}/study-materials`, {
              params: { classLevelId },
            }).catch(() => [])
          : Promise.resolve([]),
        apiFetch<StudyMaterial[]>(`/${slug}/study-materials`, {
          params: { general: "true" },
        }).catch(() => []),
      ]);
      setHomeworkList(Array.isArray(hwRes) ? hwRes : []);
      const combined = [...classMat, ...genMat];
      const unique = Array.from(new Map(combined.map((m) => [m.id, m])).values());
      setMaterials(unique);
    } finally {
      setLoadingHw(false);
      setLoadingMat(false);
    }
  }, [slug, classLevelId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Derived subjects from homework list
  const subjects = Array.from(
    new Map(
      homeworkList
        .map((hw) => hw.subject)
        .filter(Boolean)
        .map((s) => [s!.id, s!.name]),
    ).entries(),
  );

  const filteredHomework = homeworkList.filter((hw) => {
    if (selectedSubject !== "ALL" && hw.subjectId !== selectedSubject) return false;
    if (!hwSearch.trim()) return true;
    const q = hwSearch.toLowerCase();
    return (
      hw.title.toLowerCase().includes(q) ||
      hw.subject?.name?.toLowerCase().includes(q) ||
      hw.description?.toLowerCase().includes(q)
    );
  });

  const filteredMaterials = materials.filter((m) => {
    if (!matSearch.trim()) return true;
    const q = matSearch.toLowerCase();
    return (
      m.title.toLowerCase().includes(q) ||
      m.subject?.name?.toLowerCase().includes(q) ||
      m.description?.toLowerCase().includes(q)
    );
  });

  async function handleConfirmSubmit() {
    if (!submittingHw) return;
    const trimmed = fileUrlInput.trim();
    if (!trimmed) {
      toast.error("Please enter a link to your completed assignment");
      return;
    }
    if (!/^https?:\/\//i.test(trimmed)) {
      toast.error("Link must start with http:// or https://");
      return;
    }

    try {
      setIsSubmitting(true);
      await apiFetch(`/${slug}/homework/${submittingHw.id}/submit`, {
        method: "POST",
        body: JSON.stringify({ fileUrl: trimmed }),
      });
      toast.success("Assignment submitted successfully");
      setSubmittingHw(null);
      setFileUrlInput("");
      await loadData();
    } catch {
      // apiFetch toasts errors
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="hidden md:flex items-center gap-3">
          <Link
            href={`/dashboard/school/${slug}`}
            aria-label="Back to dashboard"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-slate-700" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
              Homework & Study Materials
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Assignments set for your class and study resources uploaded by your teachers.
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "assignments" | "materials")} className="space-y-6">
        <TabsList className="bg-slate-100 p-1">
          <TabsTrigger value="assignments" className="gap-2 text-xs font-semibold sm:text-sm">
            <BookOpen className="h-4 w-4" />
            <span>Assignments</span>
            <span className="rounded-full bg-[#EEF0FF] px-2 py-0.5 text-xs font-bold text-[#1447E6]">
              {homeworkList.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="materials" className="gap-2 text-xs font-semibold sm:text-sm">
            <Library className="h-4 w-4" />
            <span>Study Materials</span>
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-700">
              {materials.length}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: ASSIGNMENTS */}
        <TabsContent value="assignments" className="space-y-4 outline-none">
          {/* Filter Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search assignments by topic or subject..."
                value={hwSearch}
                onChange={(e) => setHwSearch(e.target.value)}
                className="pl-9 bg-white"
              />
            </div>
            {subjects.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <Button
                  size="sm"
                  variant={selectedSubject === "ALL" ? "default" : "outline"}
                  onClick={() => setSelectedSubject("ALL")}
                  className={selectedSubject === "ALL" ? "bg-blue-600 hover:bg-blue-700" : "bg-white"}
                >
                  All subjects
                </Button>
                {subjects.map(([id, name]) => (
                  <Button
                    key={id}
                    size="sm"
                    variant={selectedSubject === id ? "default" : "outline"}
                    onClick={() => setSelectedSubject(id)}
                    className={selectedSubject === id ? "bg-blue-600 hover:bg-blue-700" : "bg-white"}
                  >
                    {name}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {loadingHw ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-2xl" />
              ))}
            </div>
          ) : filteredHomework.length === 0 ? (
            <Card className="rounded-2xl border border-slate-100 p-8 text-center bg-white">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-3">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">All caught up!</h3>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                {hwSearch || selectedSubject !== "ALL"
                  ? "No assignments match your search or filter criteria."
                  : "No homework assignments are currently pending for your class."}
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredHomework.map((hw) => {
                const submission = hw.submissions?.[0];
                const isSubmitted = Boolean(submission);
                const isGraded = typeof submission?.score === "number";
                const due = formatDueDate(hw.dueDate);

                return (
                  <Card key={hw.id} className="rounded-2xl border border-slate-200/80 bg-white shadow-sm flex flex-col justify-between">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                              {hw.subject?.name || "Subject"}
                            </span>
                            {hw.totalMarks ? (
                              <span className="text-xs text-slate-500 font-medium">
                                {hw.totalMarks} marks
                              </span>
                            ) : null}
                          </div>
                          <CardTitle className="text-base font-bold text-slate-900 leading-snug">
                            {hw.title}
                          </CardTitle>
                        </div>
                        {isSubmitted ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0 font-bold">
                            {isGraded ? "Graded" : "Submitted"}
                          </Badge>
                        ) : due.overdue ? (
                          <Badge className="bg-red-50 text-red-700 border-red-200 shrink-0 font-bold">
                            Overdue
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-50 text-amber-700 border-amber-200 shrink-0 font-bold">
                            Pending
                          </Badge>
                        )}
                      </div>
                      {hw.description && (
                        <CardDescription className="text-xs text-slate-600 font-normal line-clamp-3 mt-1.5 whitespace-pre-line">
                          {hw.description}
                        </CardDescription>
                      )}
                    </CardHeader>

                    <CardContent className="space-y-3 pt-0">
                      {/* Teacher Resource File */}
                      {hw.fileUrl && (
                        <a
                          href={hw.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 rounded-xl border border-slate-200/70 bg-slate-50 p-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition-colors"
                        >
                          <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                          <span className="truncate flex-1">Teacher assignment attachment</span>
                          <ExternalLink className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        </a>
                      )}

                      {/* Due date & Teacher */}
                      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className={`h-3.5 w-3.5 ${due.overdue ? "text-red-500" : due.urgent ? "text-amber-500" : "text-slate-400"}`} />
                          <span className={due.overdue ? "text-red-600 font-semibold" : due.urgent ? "text-amber-700 font-semibold" : ""}>
                            {due.label}
                          </span>
                        </span>
                        {hw.createdBy?.user?.name && (
                          <span className="truncate max-w-[140px]">By {hw.createdBy.user.name}</span>
                        )}
                      </div>

                      {/* Submission Status or Action */}
                      <div className="pt-2 border-t border-slate-100">
                        {isSubmitted ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-500 font-medium">Your work:</span>
                              <a
                                href={submission!.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 font-bold text-blue-700 hover:underline"
                              >
                                View submission <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                            {isGraded ? (
                              <div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-900 border border-emerald-100">
                                <div className="flex items-center justify-between font-bold">
                                  <span>Score:</span>
                                  <span>{submission!.score} / {hw.totalMarks || 100}</span>
                                </div>
                                {submission!.feedback && (
                                  <p className="mt-1 text-slate-700 font-normal">
                                    <span className="font-semibold text-emerald-800">Feedback: </span>
                                    {submission!.feedback}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="text-[11px] text-slate-400 font-medium">
                                Submitted on {new Date(submission!.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}. Awaiting teacher grading.
                              </p>
                            )}
                          </div>
                        ) : (
                          <Button
                            onClick={() => {
                              setSubmittingHw(hw);
                              setFileUrlInput("");
                            }}
                            className="w-full min-h-11 bg-blue-600 hover:bg-blue-700 font-bold text-xs sm:text-sm gap-2"
                          >
                            <Upload className="h-4 w-4" />
                            Submit Homework
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: STUDY MATERIALS */}
        <TabsContent value="materials" className="space-y-4 outline-none">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search study materials by title or keyword..."
              value={matSearch}
              onChange={(e) => setMatSearch(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>

          {loadingMat ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-2xl" />
              ))}
            </div>
          ) : filteredMaterials.length === 0 ? (
            <Card className="rounded-2xl border border-slate-100 p-8 text-center bg-white">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-3">
                <Library className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No study materials found</h3>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                {matSearch
                  ? "No materials match your search keyword."
                  : "Your teachers haven't uploaded study materials for this class yet."}
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredMaterials.map((mat) => (
                <Card key={mat.id} className="rounded-2xl border border-slate-200/80 bg-white shadow-sm flex flex-col justify-between">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {mat.subject?.name && (
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 mb-1">
                            {mat.subject.name}
                          </span>
                        )}
                        <CardTitle className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                          {mat.title}
                        </CardTitle>
                      </div>
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <FileText className="h-4 w-4" />
                      </div>
                    </div>
                    {mat.description && (
                      <CardDescription className="text-xs text-slate-600 font-normal line-clamp-2 mt-1">
                        {mat.description}
                      </CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-3 pt-0">
                    <div className="text-[11px] text-slate-400 font-medium">
                      {mat.uploadedBy?.user?.name && `By ${mat.uploadedBy.user.name} · `}
                      {new Date(mat.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                      <a
                        href={mat.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                        Open File
                      </a>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setActiveMaterial({ id: mat.id, title: mat.title })}
                        className="min-h-11 text-xs font-bold text-blue-700 border-blue-200 hover:bg-blue-50 gap-1.5"
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                        Discuss
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* SUBMISSION DIALOG */}
      <Dialog open={Boolean(submittingHw)} onOpenChange={(open) => !open && setSubmittingHw(null)}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Submit Assignment
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {submittingHw?.title} ({submittingHw?.subject?.name})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <div className="space-y-1.5">
              <label htmlFor="submit-file-url" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                File Link *
              </label>
              <Input
                id="submit-file-url"
                placeholder="https://drive.google.com/..."
                value={fileUrlInput}
                onChange={(e) => setFileUrlInput(e.target.value)}
                autoFocus
                className="bg-white"
              />
              <p className="text-[11px] text-slate-500 font-medium">
                Paste a public or shareable link to your document (Google Drive, Dropbox, OneDrive, etc.).
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => {
                setSubmittingHw(null);
                setFileUrlInput("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isSubmitting || !fileUrlInput.trim()}
              onClick={handleConfirmSubmit}
              className="bg-blue-600 hover:bg-blue-700 font-bold gap-2"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm Submission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DISCUSSION BOARD */}
      {activeMaterial && (
        <DiscussionBoard
          studyMaterialId={activeMaterial.id}
          studyMaterialTitle={activeMaterial.title}
          isOpen={Boolean(activeMaterial)}
          onClose={() => setActiveMaterial(null)}
        />
      )}
    </div>
  );
}

