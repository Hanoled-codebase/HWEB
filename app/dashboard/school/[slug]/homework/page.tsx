"use client";

import { useState, useEffect } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen,
  Download,
  Upload,
  FileText,
  Plus,
  Calendar,
  Clock,
  Loader2,
  Search,
  ChevronDown,
  ChevronRight,
  Trash2,
  Paperclip,
  Users,
  Filter,
  GraduationCap,
  BookMarked,
} from "lucide-react";

type ClassOption = {
  id: string;
  name: string;
  level?: string;
};

type SubjectOption = {
  id: string;
  name: string;
  code?: string;
};

type Submission = {
  id: string;
  studentId: string;
  fileUrl?: string;
  submittedAt: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber?: string;
  };
};

type Homework = {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  totalMarks?: number;
  fileUrl?: string;
  createdAt: string;
  classLevelId: string;
  subjectId: string;
  classLevel?: { id: string; name: string; level?: string };
  subject?: { id: string; name: string; code?: string };
  submissions?: Submission[];
  _count?: { submissions: number };
};

type StudyMaterial = {
  id: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileType?: string;
  tags?: string;
  createdAt: string;
  classLevelId?: string;
  uploader?: { id: string; user?: { name?: string; email?: string } };
  classLevel?: { id: string; name: string; level?: string };
};

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

function getDaysRemaining(dueDate: string): { text: string; urgent: boolean; overdue: boolean } {
  const now = new Date();
  const due = new Date(dueDate);
  const diff = due.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days < 0) return { text: `Overdue by ${Math.abs(days)}d`, urgent: false, overdue: true };
  if (days === 0) return { text: "Due today", urgent: true, overdue: false };
  if (days === 1) return { text: "Due tomorrow", urgent: true, overdue: false };
  if (days <= 7) return { text: `${days}d remaining`, urgent: true, overdue: false };
  return { text: `${days}d remaining`, urgent: false, overdue: false };
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function HomeworkPage() {
  const { currentOrg, currentMember } = useOrganization();
  const [activeTab, setActiveTab] = useState("assignments");

  // Shared filters
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);

  // Homework state
  const [homeworkList, setHomeworkList] = useState<Homework[]>([]);
  const [isLoadingHomework, setIsLoadingHomework] = useState(true);
  const [hwSearch, setHwSearch] = useState("");
  const [hwClassFilter, setHwClassFilter] = useState("");
  const [hwSubjectFilter, setHwSubjectFilter] = useState("");
  const [expandedHw, setExpandedHw] = useState<string | null>(null);

  // Study materials state
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(true);
  const [matSearch, setMatSearch] = useState("");
  const [matClassFilter, setMatClassFilter] = useState("");

  // Create homework dialog
  const [isCreateHwOpen, setIsCreateHwOpen] = useState(false);
  const [createHwTitle, setCreateHwTitle] = useState("");
  const [createHwDesc, setCreateHwDesc] = useState("");
  const [createHwClass, setCreateHwClass] = useState("");
  const [createHwSubject, setCreateHwSubject] = useState("");
  const [createHwDue, setCreateHwDue] = useState("");
  const [createHwMarks, setCreateHwMarks] = useState("");
  const [createHwFile, setCreateHwFile] = useState("");
  const [isCreatingHw, setIsCreatingHw] = useState(false);

  // Submit homework dialog
  const [submitHwId, setSubmitHwId] = useState<string | null>(null);
  const [submitFileUrl, setSubmitFileUrl] = useState("");
  const [isSubmittingHw, setIsSubmittingHw] = useState(false);

  // Upload material dialog
  const [isUploadMatOpen, setIsUploadMatOpen] = useState(false);
  const [matTitle, setMatTitle] = useState("");
  const [matDesc, setMatDesc] = useState("");
  const [matFileUrl, setMatFileUrl] = useState("");
  const [matFileType, setMatFileType] = useState("");
  const [matTags, setMatTags] = useState("");
  const [matClass, setMatClass] = useState("");
  const [isUploadingMat, setIsUploadingMat] = useState(false);

  const isPrivileged =
    currentMember?.role === "owner" || currentMember?.role === "admin";
  const isTeacher = currentMember?.role === "member";
  const isParent = currentMember?.role === "parent";

  useEffect(() => {
    async function fetchFilters() {
      if (!currentOrg || isParent) return;
      try {
        const [classesData, subjectsData] = await Promise.all([
          apiFetch<ClassOption[]>(`/classes/${currentOrg.slug}`),
          apiFetch<SubjectOption[]>(`/subjects/${currentOrg.slug}`),
        ]);
        setClasses(classesData);
        setSubjects(subjectsData);
      } catch {
        // Silently fail; filters will just be empty
      }
    }
    fetchFilters();
  }, [currentOrg, isParent]);

  // Fetch homework
  useEffect(() => {
    async function fetchHomework() {
      if (!currentOrg) return;
      try {
        setIsLoadingHomework(true);
        const params = new URLSearchParams();
        if (hwClassFilter) params.set("classLevelId", hwClassFilter);
        if (hwSubjectFilter) params.set("subjectId", hwSubjectFilter);
        const qs = params.toString();
        const data = await apiFetch<Homework[]>(
          `/${currentOrg.slug}/homework${qs ? `?${qs}` : ""}`,
        );
        setHomeworkList(data);
      } catch {
        toast.error("Failed to load assignments");
      } finally {
        setIsLoadingHomework(false);
      }
    }
    fetchHomework();
  }, [currentOrg, hwClassFilter, hwSubjectFilter]);

  // Fetch study materials
  useEffect(() => {
    async function fetchMaterials() {
      if (!currentOrg) return;
      try {
        setIsLoadingMaterials(true);
        const params = new URLSearchParams();
        if (matClassFilter) params.set("classLevelId", matClassFilter);
        const qs = params.toString();
        const data = await apiFetch<StudyMaterial[]>(
          `/${currentOrg.slug}/study-materials${qs ? `?${qs}` : ""}`,
        );
        setMaterials(data);
      } catch {
        toast.error("Failed to load study materials");
      } finally {
        setIsLoadingMaterials(false);
      }
    }
    fetchMaterials();
  }, [currentOrg, matClassFilter]);

  const filteredHomework = homeworkList.filter((hw) => {
    if (!hwSearch) return true;
    const q = hwSearch.toLowerCase();
    return (
      hw.title.toLowerCase().includes(q) ||
      hw.description?.toLowerCase().includes(q)
    );
  });

  const filteredMaterials = materials.filter((m) => {
    if (!matSearch) return true;
    const q = matSearch.toLowerCase();
    return (
      m.title.toLowerCase().includes(q) ||
      m.description?.toLowerCase().includes(q) ||
      m.tags?.toLowerCase().includes(q)
    );
  });

  async function handleCreateHomework() {
    if (!currentOrg || !createHwTitle || !createHwClass || !createHwSubject || !createHwDue) {
      toast.error("Please fill in all required fields");
      return;
    }
    setIsCreatingHw(true);
    try {
      const created = await apiFetch<Homework>(
        `/${currentOrg.slug}/homework`,
        {
          method: "POST",
          body: JSON.stringify({
            title: createHwTitle,
            description: createHwDesc || undefined,
            dueDate: createHwDue,
            totalMarks: createHwMarks ? Number(createHwMarks) : undefined,
            fileUrl: createHwFile || undefined,
            classLevelId: createHwClass,
            subjectId: createHwSubject,
          }),
        },
      );
      setHomeworkList([created, ...homeworkList]);
      toast.success("Assignment created");
      setIsCreateHwOpen(false);
      resetCreateHwForm();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to create assignment"));
    } finally {
      setIsCreatingHw(false);
    }
  }

  function resetCreateHwForm() {
    setCreateHwTitle("");
    setCreateHwDesc("");
    setCreateHwClass("");
    setCreateHwSubject("");
    setCreateHwDue("");
    setCreateHwMarks("");
    setCreateHwFile("");
  }

  async function handleDeleteHomework(id: string) {
    if (!currentOrg) return;
    if (!confirm("Delete this assignment? This cannot be undone.")) return;
    try {
      await apiFetch(`/${currentOrg.slug}/homework/${id}`, {
        method: "DELETE",
      });
      setHomeworkList(homeworkList.filter((h) => h.id !== id));
      toast.success("Assignment deleted");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to delete assignment"));
    }
  }

  async function handleSubmitHomework() {
    if (!currentOrg || !submitHwId || !submitFileUrl) {
      toast.error("Please provide a file URL");
      return;
    }
    setIsSubmittingHw(true);
    try {
      const result = await apiFetch<{ message: string }>(
        `/${currentOrg.slug}/homework/${submitHwId}/submit`,
        {
          method: "POST",
          body: JSON.stringify({ fileUrl: submitFileUrl }),
        },
      );
      toast.success(result.message || "Submitted successfully");
      setSubmitHwId(null);
      setSubmitFileUrl("");
      // Refresh homework list to show submission
      const data = await apiFetch<Homework[]>(
        `/${currentOrg.slug}/homework`,
      );
      setHomeworkList(data);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to submit"));
    } finally {
      setIsSubmittingHw(false);
    }
  }

  async function handleUploadMaterial() {
    if (!currentOrg || !matTitle || !matFileUrl) {
      toast.error("Title and file URL are required");
      return;
    }
    setIsUploadingMat(true);
    try {
      const created = await apiFetch<StudyMaterial>(
        `/${currentOrg.slug}/study-materials`,
        {
          method: "POST",
          body: JSON.stringify({
            title: matTitle,
            description: matDesc || undefined,
            fileUrl: matFileUrl,
            fileType: matFileType || undefined,
            tags: matTags || undefined,
            classLevelId: matClass || undefined,
          }),
        },
      );
      setMaterials([created, ...materials]);
      toast.success("Study material uploaded");
      setIsUploadMatOpen(false);
      setMatTitle("");
      setMatDesc("");
      setMatFileUrl("");
      setMatFileType("");
      setMatTags("");
      setMatClass("");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to upload material"));
    } finally {
      setIsUploadingMat(false);
    }
  }

  function toggleExpand(id: string) {
    setExpandedHw(expandedHw === id ? null : id);
  }

  const canManage = isPrivileged || isTeacher;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Homework & Study Materials
        </h1>
        <p className="text-slate-500">
          Manage assignments, submissions, and learning resources.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100">
          <TabsTrigger value="assignments">
            <BookOpen className="mr-1.5 h-4 w-4" />
            Assignments
          </TabsTrigger>
          <TabsTrigger value="materials">
            <BookMarked className="mr-1.5 h-4 w-4" />
            Study Materials
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════
           TAB 1 — ASSIGNMENTS
           ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="assignments" className="space-y-6 pt-6">
          {/* Filters & Create */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1 max-w-[320px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search assignments..."
                  className="pl-8 bg-white"
                  value={hwSearch}
                  onChange={(e) => setHwSearch(e.target.value)}
                />
              </div>
              <Select value={hwClassFilter} onValueChange={(v) => setHwClassFilter(v as string)}>
                <SelectTrigger className="w-full sm:w-44 bg-white">
                  <SelectValue placeholder="All classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All classes</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={hwSubjectFilter} onValueChange={(v) => setHwSubjectFilter(v as string)}>
                <SelectTrigger className="w-full sm:w-44 bg-white">
                  <SelectValue placeholder="All subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All subjects</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {canManage && (
              <Dialog open={isCreateHwOpen} onOpenChange={setIsCreateHwOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700 shrink-0">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Assignment
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-full max-w-[calc(100vw-2rem)] sm:max-w-[500px] p-4 sm:p-6 max-h-[90vh] overflow-y-auto mx-auto">
                  <DialogHeader>
                    <DialogTitle>Create Assignment</DialogTitle>
                    <DialogDescription>
                      Set a new homework assignment for a class.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Title *</label>
                      <Input
                        placeholder="e.g. Algebra Worksheet"
                        value={createHwTitle}
                        onChange={(e) => setCreateHwTitle(e.target.value)}
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Description</label>
                      <Textarea
                        placeholder="Instructions, notes, or reading material..."
                        value={createHwDesc}
                        onChange={(e) => setCreateHwDesc(e.target.value)}
                        className="bg-white min-h-[80px]"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">Class *</label>
                        <Select value={createHwClass} onValueChange={(v) => setCreateHwClass(v as string)}>
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Select class" />
                          </SelectTrigger>
                          <SelectContent>
                            {classes.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">Subject *</label>
                        <Select value={createHwSubject} onValueChange={(v) => setCreateHwSubject(v as string)}>
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Select subject" />
                          </SelectTrigger>
                          <SelectContent>
                            {subjects.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">Due Date *</label>
                        <input
                          type="date"
                          value={createHwDue}
                          onChange={(e) => setCreateHwDue(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">Total Marks</label>
                        <Input
                          type="number"
                          placeholder="e.g. 20"
                          value={createHwMarks}
                          onChange={(e) => setCreateHwMarks(e.target.value)}
                          className="bg-white"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">File URL (optional)</label>
                      <Input
                        placeholder="https://..."
                        value={createHwFile}
                        onChange={(e) => setCreateHwFile(e.target.value)}
                        className="bg-white"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsCreateHwOpen(false);
                        resetCreateHwForm();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateHomework}
                      disabled={isCreatingHw}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isCreatingHw && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Create Assignment
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Homework list */}
          {isLoadingHomework ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="shadow-sm border-slate-200">
                  <CardHeader className="pb-3">
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-9 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredHomework.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-white p-10 text-center">
              <BookOpen className="h-10 w-10 text-slate-400" />
              <span className="text-base font-semibold text-slate-700">
                {hwSearch || hwClassFilter || hwSubjectFilter
                  ? "No assignments match your filters."
                  : "No assignments yet"}
              </span>
              <span className="text-sm text-slate-400">
                {canManage
                  ? "Create an assignment to get started."
                  : "Check back later for new assignments."}
              </span>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredHomework.map((hw) => {
                const dueInfo = getDaysRemaining(hw.dueDate);
                return (
                  <Card
                    key={hw.id}
                    className={cn(
                      "relative border-slate-200 shadow-sm transition-shadow",
                      dueInfo.overdue && "border-red-200 bg-red-50/30",
                    )}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base font-bold text-slate-900 line-clamp-2">
                            {hw.title}
                          </CardTitle>
                          <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                            <span className="inline-flex items-center gap-1 text-xs">
                              <GraduationCap className="h-3 w-3" />
                              {hw.classLevel?.name || "—"}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs">
                              <BookOpen className="h-3 w-3" />
                              {hw.subject?.name || "—"}
                            </span>
                          </CardDescription>
                        </div>
                        {canManage && (
                          <button
                            onClick={() => handleDeleteHomework(hw.id)}
                            className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {hw.description && (
                        <p className="text-sm text-slate-600 line-clamp-2">
                          {hw.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            "gap-1 px-2 py-0.5 text-xs font-medium",
                            dueInfo.overdue
                              ? "border-red-200 bg-red-50 text-red-700"
                              : dueInfo.urgent
                                ? "border-amber-200 bg-amber-50 text-amber-700"
                                : "border-slate-200 text-slate-600",
                          )}
                        >
                          <Clock className="h-3 w-3" />
                          {dueInfo.text}
                        </Badge>
                        {hw.totalMarks && (
                          <Badge variant="outline" className="gap-1 border-blue-200 bg-blue-50 text-blue-700 px-2 py-0.5 text-xs font-medium">
                            <FileText className="h-3 w-3" />
                            {hw.totalMarks} marks
                          </Badge>
                        )}
                        {hw._count?.submissions !== undefined && (
                          <Badge variant="outline" className="gap-1 border-slate-200 text-slate-600 px-2 py-0.5 text-xs font-medium">
                            <Users className="h-3 w-3" />
                            {hw._count.submissions} submitted
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Due {formatDate(hw.dueDate)}
                        </span>
                      </div>

                      {/* Student: submit button */}
                      {!canManage && (
                        <Dialog
                          open={submitHwId === hw.id}
                          onOpenChange={(open) => {
                            if (!open) setSubmitHwId(null);
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              className="w-full bg-blue-600 hover:bg-blue-700 mt-1"
                              onClick={() => setSubmitHwId(hw.id)}
                            >
                              <Upload className="mr-2 h-4 w-4" />
                              Submit
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="w-full max-w-[calc(100vw-2rem)] sm:max-w-[400px] p-4 sm:p-6 mx-auto">
                            <DialogHeader>
                              <DialogTitle>Submit Assignment</DialogTitle>
                              <DialogDescription>
                                {hw.title}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700">
                                  File URL *
                                </label>
                                <Input
                                  placeholder="https://drive.google.com/..."
                                  value={submitFileUrl}
                                  onChange={(e) => setSubmitFileUrl(e.target.value)}
                                  className="bg-white"
                                />
                                <p className="text-xs text-slate-400">
                                  Paste a link to your work (Google Drive, Dropbox, etc.)
                                </p>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setSubmitHwId(null);
                                  setSubmitFileUrl("");
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={handleSubmitHomework}
                                disabled={isSubmittingHw}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                {isSubmittingHw && (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Submit
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}

                      {/* Teacher/admin: expand to see submissions */}
                      {canManage && (
                        <button
                          onClick={() => toggleExpand(hw.id)}
                          className="flex w-full items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                          <span>
                            {hw.submissions?.length || hw._count?.submissions || 0} submission(s)
                          </span>
                          {expandedHw === hw.id ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}

                      {canManage && expandedHw === hw.id && (
                        <div className="space-y-2 pt-1">
                          {hw.submissions && hw.submissions.length > 0 ? (
                            hw.submissions.map((sub) => (
                              <div
                                key={sub.id}
                                className="flex items-center justify-between rounded-md border border-slate-100 bg-white px-3 py-2 text-sm"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-slate-800 truncate">
                                    {sub.student.firstName} {sub.student.lastName}
                                  </p>
                                  <p className="text-xs text-slate-400">
                                    {formatDate(sub.submittedAt)}
                                  </p>
                                </div>
                                {sub.fileUrl && (
                                  <a
                                    href={sub.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="shrink-0 rounded-lg p-1.5 text-blue-600 hover:bg-blue-50"
                                  >
                                    <Download className="h-4 w-4" />
                                  </a>
                                )}
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-slate-400 text-center py-2">
                              No submissions yet.
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════
           TAB 2 — STUDY MATERIALS
           ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="materials" className="space-y-6 pt-6">
          {/* Filters & Upload */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1 max-w-[320px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search materials..."
                  className="pl-8 bg-white"
                  value={matSearch}
                  onChange={(e) => setMatSearch(e.target.value)}
                />
              </div>
              <Select value={matClassFilter} onValueChange={(v) => setMatClassFilter(v as string)}>
                <SelectTrigger className="w-full sm:w-44 bg-white">
                  <SelectValue placeholder="All classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All classes</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {canManage && (
              <Dialog open={isUploadMatOpen} onOpenChange={setIsUploadMatOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700 shrink-0">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Material
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-full max-w-[calc(100vw-2rem)] sm:max-w-[500px] p-4 sm:p-6 max-h-[90vh] overflow-y-auto mx-auto">
                  <DialogHeader>
                    <DialogTitle>Upload Study Material</DialogTitle>
                    <DialogDescription>
                      Share a learning resource with your school.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Title *</label>
                      <Input
                        placeholder="e.g. Photosynthesis Notes"
                        value={matTitle}
                        onChange={(e) => setMatTitle(e.target.value)}
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Description</label>
                      <Textarea
                        placeholder="Brief description of the material..."
                        value={matDesc}
                        onChange={(e) => setMatDesc(e.target.value)}
                        className="bg-white min-h-[80px]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">File URL *</label>
                      <Input
                        placeholder="https://drive.google.com/..."
                        value={matFileUrl}
                        onChange={(e) => setMatFileUrl(e.target.value)}
                        className="bg-white"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">File Type</label>
                        <Select value={matFileType} onValueChange={(v) => setMatFileType(v as string)}>
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pdf">PDF</SelectItem>
                            <SelectItem value="document">Document</SelectItem>
                            <SelectItem value="video">Video</SelectItem>
                            <SelectItem value="audio">Audio</SelectItem>
                            <SelectItem value="link">Link</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">Class (optional)</label>
                        <Select value={matClass} onValueChange={(v) => setMatClass(v as string)}>
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="All classes" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All classes</SelectItem>
                            {classes.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Tags</label>
                      <Input
                        placeholder="e.g. science, biology, notes"
                        value={matTags}
                        onChange={(e) => setMatTags(e.target.value)}
                        className="bg-white"
                      />
                      <p className="text-xs text-slate-400">
                        Comma-separated keywords for easy discovery.
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsUploadMatOpen(false);
                        setMatTitle("");
                        setMatDesc("");
                        setMatFileUrl("");
                        setMatFileType("");
                        setMatTags("");
                        setMatClass("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleUploadMaterial}
                      disabled={isUploadingMat}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isUploadingMat && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Upload
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Materials grid */}
          {isLoadingMaterials ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="shadow-sm border-slate-200">
                  <CardHeader className="pb-3">
                    <Skeleton className="h-5 w-2/3 mb-2" />
                    <Skeleton className="h-4 w-1/3" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-9 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-white p-10 text-center">
              <BookMarked className="h-10 w-10 text-slate-400" />
              <span className="text-base font-semibold text-slate-700">
                {matSearch || matClassFilter
                  ? "No materials match your filters."
                  : "No study materials yet"}
              </span>
              <span className="text-sm text-slate-400">
                {canManage
                  ? "Upload a study material to get started."
                  : "Check back later for learning resources."}
              </span>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredMaterials.map((mat) => (
                <Card
                  key={mat.id}
                  className="border-slate-200 shadow-sm transition-shadow hover:shadow-md"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base font-bold text-slate-900 line-clamp-2">
                          {mat.title}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {mat.classLevel?.name && (
                            <span className="inline-flex items-center gap-1 text-xs">
                              <GraduationCap className="h-3 w-3" />
                              {mat.classLevel.name}
                            </span>
                          )}
                        </CardDescription>
                      </div>
                      {mat.fileType && (
                        <Badge
                          variant="outline"
                          className="shrink-0 ml-2 border-blue-200 bg-blue-50 text-blue-700 text-[11px] uppercase tracking-wider"
                        >
                          {mat.fileType}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {mat.description && (
                      <p className="text-sm text-slate-600 line-clamp-2">
                        {mat.description}
                      </p>
                    )}

                    {mat.tags && (
                      <div className="flex flex-wrap gap-1.5">
                        {mat.tags.split(",").map((tag, i) => (
                          <span
                            key={i}
                            className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500"
                          >
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>
                        {mat.uploader?.user?.name || "Unknown"}
                      </span>
                      <span>{formatDate(mat.createdAt)}</span>
                    </div>

                    <a
                      href={mat.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50/50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      Open Material
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
