"use client";

import { useState, useEffect } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { apiFetch, isForbiddenError } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Loader2,
  Save,
  Search,
  UserRound,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { EntityHeader } from "@/components/dashboard/shared";

type Student = {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber?: string;
};

type Score = {
  id: string;
  studentId: string;
  term: string;
  metric: string;
  score: number;
  evaluator?: { user?: { name?: string } } | null;
};

type Remark = {
  id: string;
  studentId: string;
  term: string;
  teacherRemark?: string;
  principalRemark?: string;
  isPublished: boolean;
  classTeacher?: { user?: { name?: string } } | null;
};

const METRICS = [
  "Punctuality",
  "Neatness",
  "Leadership",
  "EmotionalMaturity",
  "Attentiveness",
  "Creativity",
  "Teamwork",
  "Communication",
];

const TERMS = [
  { value: "2025/2026-TERM1", label: "2025/2026 — Term 1" },
  { value: "2025/2026-TERM2", label: "2025/2026 — Term 2" },
  { value: "2025/2026-TERM3", label: "2025/2026 — Term 3" },
];

const SCORE_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very Good",
  5: "Excellent",
};

export default function AffectivePage() {
  const { currentOrg, currentMember } = useOrganization();
  const orgSlug = currentOrg?.slug;

  const isAdmin =
    currentMember?.role === "owner" || currentMember?.role === "admin";

  const [students, setStudents] = useState<Student[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);

  // Scores
  const [scoreTerm, setScoreTerm] = useState(TERMS[0].value);
  const [scoreSearch, setScoreSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [scores, setScores] = useState<Score[]>([]);
  const [editingScores, setEditingScores] = useState<Record<string, number>>({});
  const [isLoadingScores, setIsLoadingScores] = useState(false);
  const [isSavingScores, setIsSavingScores] = useState(false);

  // Remarks
  const [remarkTerm, setRemarkTerm] = useState(TERMS[0].value);
  const [remarkSearch, setRemarkSearch] = useState("");
  const [remarkStudentId, setRemarkStudentId] = useState("");
  const [teacherRemark, setTeacherRemark] = useState("");
  const [principalRemark, setPrincipalRemark] = useState("");
  const [remarkId, setRemarkId] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [isLoadingRemark, setIsLoadingRemark] = useState(false);
  const [isSavingRemark, setIsSavingRemark] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    async function fetchStudents() {
      if (!orgSlug) return;
      try {
        setIsLoadingStudents(true);
        const data = await apiFetch<Student[]>(`/students/${orgSlug}`);
        setStudents(data);
      } catch (error) {
        toast.error(isForbiddenError(error) ? "You don't have access to student records here" : "Failed to load students");
      } finally {
        setIsLoadingStudents(false);
      }
    }
    fetchStudents();
  }, [orgSlug]);

  const filteredStudents = (query: string) =>
    students.filter(
      (s) =>
        `${s.firstName} ${s.lastName}`
          .toLowerCase()
          .includes(query.toLowerCase()) ||
        s.admissionNumber?.toLowerCase().includes(query.toLowerCase()),
    );

  function getStudentName(id: string) {
    const s = students.find((st) => st.id === id);
    return s ? `${s.firstName} ${s.lastName}` : "Unknown";
  }

  // ── Scores ─────────────────────────────────────────────────

  useEffect(() => {
    if (!orgSlug || !selectedStudentId || !scoreTerm) return;
    async function fetchScores() {
      try {
        setIsLoadingScores(true);
        const data = await apiFetch<Score[]>(
          `/affective/${orgSlug}/affective`,
          {
            params: { studentId: selectedStudentId, term: scoreTerm },
          },
        );
        setScores(data);
        const map: Record<string, number> = {};
        data.forEach((s) => {
          map[s.metric] = s.score;
        });
        setEditingScores(map);
      } catch {
        // already toasted
      } finally {
        setIsLoadingScores(false);
      }
    }
    fetchScores();
  }, [orgSlug, selectedStudentId, scoreTerm]);

  async function handleSaveScores() {
    if (!orgSlug || !selectedStudentId || !scoreTerm) return;
    setIsSavingScores(true);
    try {
      const promises = METRICS.map((metric) => {
        const score = editingScores[metric];
        if (score == null || score === 0) return Promise.resolve();
        return apiFetch(`/affective/${orgSlug}/affective`, {
          method: "POST",
          body: JSON.stringify({
            studentId: selectedStudentId,
            term: scoreTerm,
            metric,
            score,
          }),
        });
      });
      await Promise.all(promises);
      const data = await apiFetch<Score[]>(
        `/affective/${orgSlug}/affective`,
        {
          params: { studentId: selectedStudentId, term: scoreTerm },
        },
      );
      setScores(data);
      toast.success("Scores saved");
    } catch {
      // already toasted
    } finally {
      setIsSavingScores(false);
    }
  }

  // ── Remarks ────────────────────────────────────────────────

  useEffect(() => {
    if (!orgSlug || !remarkStudentId || !remarkTerm) return;
    async function fetchRemark() {
      try {
        setIsLoadingRemark(true);
        const data = await apiFetch<Remark[]>(
          `/affective/${orgSlug}/remarks`,
          {
            params: { studentId: remarkStudentId, term: remarkTerm },
          },
        );
        if (data.length > 0) {
          const r = data[0];
          setRemarkId(r.id);
          setTeacherRemark(r.teacherRemark || "");
          setPrincipalRemark(r.principalRemark || "");
          setIsPublished(r.isPublished);
        } else {
          setRemarkId(null);
          setTeacherRemark("");
          setPrincipalRemark("");
          setIsPublished(false);
        }
      } catch {
        // already toasted
      } finally {
        setIsLoadingRemark(false);
      }
    }
    fetchRemark();
  }, [orgSlug, remarkStudentId, remarkTerm]);

  async function handleSaveRemark() {
    if (!orgSlug || !remarkStudentId || !remarkTerm) return;
    setIsSavingRemark(true);
    try {
      const body: Record<string, string> = { term: remarkTerm, teacherRemark };
      if (isAdmin) body.principalRemark = principalRemark;
      const result = await apiFetch<Remark>(
        `/affective/${orgSlug}/remarks/${remarkStudentId}`,
        { method: "PATCH", body: JSON.stringify(body) },
      );
      setRemarkId(result.id);
      setIsPublished(result.isPublished);
      toast.success("Remark saved");
    } catch {
      // already toasted
    } finally {
      setIsSavingRemark(false);
    }
  }

  async function handleTogglePublish() {
    if (!orgSlug || !remarkId) return;
    setIsPublishing(true);
    try {
      const result = await apiFetch<Remark>(
        `/affective/${orgSlug}/remarks/${remarkId}/publish`,
        {
          method: "PATCH",
          body: JSON.stringify({ isPublished: !isPublished }),
        },
      );
      setIsPublished(result.isPublished);
      toast.success(result.isPublished ? "Published" : "Unpublished");
    } catch {
      // already toasted
    } finally {
      setIsPublishing(false);
    }
  }

  // ── Shared student selector ────────────────────────────────

  function renderStudentSelector(
    value: string,
    onChange: (v: string) => void,
    query: string,
    onQueryChange: (v: string) => void,
  ) {
    const selected = students.find((s) => s.id === value);
    const filtered = filteredStudents(query);

    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Student</label>
        {selected ? (
          <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/50 px-3 py-2.5">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <UserRound className="h-4 w-4" />
              <span className="font-medium">
                {selected.firstName} {selected.lastName}
              </span>
              {selected.admissionNumber && (
                <span className="text-blue-400">
                  ({selected.admissionNumber})
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                onChange("");
                onQueryChange("");
              }}
              className="text-xs text-blue-400 hover:text-blue-600"
            >
              Change
            </button>
          </div>
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search students..."
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              aria-label="Search students"
              className="h-11 rounded-xl bg-white pl-10 shadow-sm md:h-10"
            />
          </div>
        )}
        {!selected && query && (
          <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            {filtered.length === 0 ? (
              <p className="p-3 text-sm text-slate-500">No students found</p>
            ) : (
              filtered.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-blue-50"
                  onClick={() => {
                    onChange(s.id);
                    onQueryChange("");
                  }}
                >
                  <UserRound className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="font-medium text-slate-800">
                    {s.firstName} {s.lastName}
                  </span>
                  {s.admissionNumber && (
                    <span className="text-xs text-slate-500">
                      {s.admissionNumber}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Metrics rating UI ─────────────────────────────────────

  function renderMetricRating(metric: string) {
    const currentScore = editingScores[metric];

    if (isLoadingScores) {
      return <Skeleton className="h-8 w-full rounded-lg" />;
    }

    return (
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((val) => (
          <button
            key={val}
            type="button"
            onClick={() =>
              setEditingScores((prev) => ({
                ...prev,
                [metric]: prev[metric] === val ? 0 : val,
              }))
            }
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition-all",
              currentScore === val
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600",
            )}
          >
            {val}
          </button>
        ))}
        {currentScore != null && currentScore > 0 && (
          <span className="ml-1.5 text-xs text-slate-500">
            {SCORE_LABELS[currentScore]}
          </span>
        )}
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <EntityHeader
        title="Affective Domain"
        subtitle="Manage affective domain scores and assessment remarks"
      />

      <Tabs defaultValue="scores" className="w-full">
        <TabsList className="mb-4 md:mb-6">
          <TabsTrigger value="scores">Scores</TabsTrigger>
          <TabsTrigger value="remarks">Remarks</TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════════════════
            Scores Tab
           ══════════════════════════════════════════════════════ */}
        <TabsContent value="scores" className="space-y-6">
          {isLoadingStudents ? (
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="space-y-4 p-6">
                <Skeleton className="h-10 w-60 rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Scores</CardTitle>
                <CardDescription>
                  Rate students across affective domain metrics (1–5)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Term
                    </label>
                    <Select value={scoreTerm} onValueChange={(v) => setScoreTerm(String(v))}>
                      <SelectTrigger className="h-10 rounded-xl bg-white shadow-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TERMS.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {renderStudentSelector(
                  selectedStudentId,
                  setSelectedStudentId,
                  scoreSearch,
                  setScoreSearch,
                )}

                {selectedStudentId && (
                  <>
                    <div className="rounded-xl border border-slate-200 bg-white">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-48">Metric</TableHead>
                            <TableHead>Rating</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {METRICS.map((metric) => (
                            <TableRow key={metric}>
                              <TableCell className="font-medium capitalize text-slate-800">
                                {metric.replace(/([A-Z])/g, " $1").trim()}
                              </TableCell>
                              <TableCell>
                                {renderMetricRating(metric)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <Button
                      onClick={handleSaveScores}
                      disabled={isSavingScores || isLoadingScores}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isSavingScores ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Save Scores
                    </Button>

                    {scores.length > 0 && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <h3 className="mb-3 text-sm font-semibold text-slate-700">
                          Saved Scores
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {scores.map((s) => (
                            <Badge
                              key={s.id}
                              variant="outline"
                              className="border-blue-100 bg-blue-50 text-blue-700"
                            >
                              {s.metric.replace(/([A-Z])/g, " $1").trim()}:{" "}
                              {s.score}/5
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ══════════════════════════════════════════════════════
            Remarks Tab
           ══════════════════════════════════════════════════════ */}
        <TabsContent value="remarks" className="space-y-6">
          {isLoadingStudents ? (
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="space-y-4 p-6">
                <Skeleton className="h-10 w-60 rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
              </CardContent>
            </Card>
          ) : (
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Assessment Remarks</CardTitle>
                <CardDescription>
                  Write teacher and principal remarks for each student
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Term
                    </label>
                    <Select value={remarkTerm} onValueChange={(v) => setRemarkTerm(String(v))}>
                      <SelectTrigger className="h-10 rounded-xl bg-white shadow-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TERMS.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {renderStudentSelector(
                  remarkStudentId,
                  setRemarkStudentId,
                  remarkSearch,
                  setRemarkSearch,
                )}

                {remarkStudentId && (
                  <>
                    {isLoadingRemark ? (
                      <div className="space-y-3">
                        <Skeleton className="h-24 w-full rounded-xl" />
                        {isAdmin && (
                          <Skeleton className="h-24 w-full rounded-xl" />
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">
                            Teacher Remark
                          </label>
                          <Textarea
                            placeholder="Enter teacher remark..."
                            value={teacherRemark}
                            onChange={(e) => setTeacherRemark(e.target.value)}
                            className="min-h-[100px] rounded-xl bg-white shadow-sm"
                          />
                        </div>

                        {isAdmin && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">
                              Principal Remark
                            </label>
                            <Textarea
                              placeholder="Enter principal remark..."
                              value={principalRemark}
                              onChange={(e) => setPrincipalRemark(e.target.value)}
                              className="min-h-[100px] rounded-xl bg-white shadow-sm"
                            />
                          </div>
                        )}

                        <div className="flex items-center gap-3">
                          <Button
                            onClick={handleSaveRemark}
                            disabled={isSavingRemark}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            {isSavingRemark ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="mr-2 h-4 w-4" />
                            )}
                            Save Remark
                          </Button>

                          {remarkId && isAdmin && (
                            <Button
                              variant="outline"
                              onClick={handleTogglePublish}
                              disabled={isPublishing}
                              className={cn(
                                "border",
                                isPublished
                                  ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                  : "border-slate-200 text-slate-600",
                              )}
                            >
                              {isPublishing ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : isPublished ? (
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                              ) : (
                                <XCircle className="mr-2 h-4 w-4" />
                              )}
                              {isPublished ? "Published" : "Unpublished"}
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
