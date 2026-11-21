"use client";

import { useState, useEffect, useMemo } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { apiFetch, isForbiddenError } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AFFECTIVE_SCORE_LABELS,
  LEADERSHIP_SKILLS,
} from "@/lib/leadership-skills";
import { usePermissions } from "@/hooks/usePermissions";
import type { ResultStage } from "@/lib/result-presets";

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
  classLevelId?: string | null;
  classLevel?: { id: string; name: string } | null;
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

type AffectiveCategory = { id: string; label: string; active: boolean };
type ResultSettings = { affectiveCategories?: AffectiveCategory[] };
type PeriodOption = { academicYear: string; term: string };

const DEFAULT_CATEGORIES: AffectiveCategory[] = LEADERSHIP_SKILLS.map(
  (label) => ({ id: label, label, active: true }),
);

// Term options come from the school's HCORE academic periods — scores must be
// stored under the exact term string the report card queries (e.g. "First
// Term"), never the legacy "2025/2026-TERM1" format.
const SCORE_LABELS = AFFECTIVE_SCORE_LABELS;

export default function AffectivePage() {
  const { currentOrg, currentMember } = useOrganization();
  const { isClassTeacher, assignments } = usePermissions();
  const orgSlug = currentOrg?.slug;

  const isAdmin =
    currentMember?.role === "owner" || currentMember?.role === "admin";

  const [students, setStudents] = useState<Student[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);

  // Scores
  const [scoreTerm, setScoreTerm] = useState("First Term");
  const [scoreAcademicYear, setScoreAcademicYear] = useState("2026/2027");
  const [scoreResultType, setScoreResultType] =
    useState<ResultStage>("END_OF_TERM");
  const [scoreSearch, setScoreSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [scores, setScores] = useState<Score[]>([]);
  const [editingScores, setEditingScores] = useState<Record<string, number>>({});
  const [isLoadingScores, setIsLoadingScores] = useState(false);
  const [isSavingScores, setIsSavingScores] = useState(false);

  // Remarks
  const [remarkTerm, setRemarkTerm] = useState("First Term");
  const [remarkSearch, setRemarkSearch] = useState("");
  const [remarkStudentId, setRemarkStudentId] = useState("");
  const [teacherRemark, setTeacherRemark] = useState("");
  const [principalRemark, setPrincipalRemark] = useState("");
  const [remarkId, setRemarkId] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [isLoadingRemark, setIsLoadingRemark] = useState(false);
  const [isSavingRemark, setIsSavingRemark] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Class grid (award a whole class in one screen)
  const [gridClassId, setGridClassId] = useState("");
  const [classLevels, setClassLevels] = useState<{ id: string; name: string }[]>([]);
  const [gridScores, setGridScores] = useState<Record<string, Record<string, number>>>({});
  const [loadedGridKey, setLoadedGridKey] = useState<string | null>(null);
  const [isLoadingGrid, setIsLoadingGrid] = useState(false);
  const [isSavingGrid, setIsSavingGrid] = useState(false);
  const gridKey = JSON.stringify([
    orgSlug,
    gridClassId,
    scoreAcademicYear,
    scoreTerm,
    scoreResultType,
  ]);
  const gridReady = !isLoadingGrid && loadedGridKey === gridKey;

  // Term options come from the school's HCORE academic periods.
  const [termOptions, setTermOptions] = useState<string[]>([]);
  const [periods, setPeriods] = useState<PeriodOption[]>([]);
  const [categories, setCategories] =
    useState<AffectiveCategory[]>(DEFAULT_CATEGORIES);
  const metrics = useMemo(
    () => categories.filter((category) => category.active),
    [categories],
  );
  const classTeacherClassIds = useMemo(() => {
    const ids = new Set(
      (assignments || [])
        .filter((assignment) => assignment.type === "CLASS_TEACHER")
        .map((assignment) => assignment.classLevel?.id || assignment.classLevelId)
        .filter((id): id is string => Boolean(id)),
    );
    for (const classLevel of currentMember?.assignedClasses || []) {
      if (classLevel.id) ids.add(classLevel.id);
    }
    return ids;
  }, [assignments, currentMember?.assignedClasses]);

  useEffect(() => {
    if (!orgSlug) return;
    apiFetch<{ success: boolean; data: PeriodOption[] }>(`/result-templates/periods/${orgSlug}`)
      .then(({ data: availablePeriods }) => {
        if (!Array.isArray(availablePeriods)) return;
        setPeriods(availablePeriods);
        setTermOptions([...new Set(availablePeriods.map(({ term }) => term))]);
        if (availablePeriods[0]) {
          setScoreAcademicYear(availablePeriods[0].academicYear);
          setScoreTerm(availablePeriods[0].term);
        }
      })
      .catch(() => {
        // Keep the fallback term if periods can't be loaded.
      });
    apiFetch<{ id: string; name: string }[]>(`/classes/${orgSlug}`)
      .then((cls) => {
        if (Array.isArray(cls)) setClassLevels(cls);
      })
      .catch(() => {
        // Class filter stays empty; the grid lists all students.
      });
    apiFetch<{ data: ResultSettings }>(`/result-settings/${orgSlug}`)
      .then(({ data: settings }) => {
        if (Array.isArray(settings.affectiveCategories)) {
          setCategories(settings.affectiveCategories);
        }
      })
      .catch(() => {
        // Existing schools retain established categories until configured.
      });
  }, [orgSlug]);

  function renderPeriodSelect(value: string, onChange: (v: string) => void) {
    return (
      <Select value={value} onValueChange={(v) => onChange(String(v))}>
        <SelectTrigger className="h-10 rounded-xl bg-white shadow-sm" aria-label="Academic period">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {termOptions.length > 0 ? (
            termOptions.map((term) => (
              <SelectItem key={term} value={term}>
                {term}
              </SelectItem>
            ))
          ) : (
            <SelectItem value={value}>{value}</SelectItem>
          )}
        </SelectContent>
      </Select>
    );
  }

  function renderAcademicYearSelect() {
    const years = [...new Set(periods.map((period) => period.academicYear))];
    return (
      <Select
        value={scoreAcademicYear}
        onValueChange={(value) => setScoreAcademicYear(String(value))}
      >
        <SelectTrigger className="h-10 rounded-xl bg-white shadow-sm" aria-label="Academic year">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(years.length > 0 ? years : [scoreAcademicYear]).map((year) => (
            <SelectItem key={year} value={year}>{year}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  function renderResultTypeSelect() {
    return (
      <Select
        value={scoreResultType}
        onValueChange={(value) => setScoreResultType(value as ResultStage)}
      >
        <SelectTrigger className="h-10 rounded-xl bg-white shadow-sm" aria-label="Result type">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="MID_TERM">Mid-term</SelectItem>
          <SelectItem value="END_OF_TERM">End-of-term</SelectItem>
        </SelectContent>
      </Select>
    );
  }

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

  // ── Scores ─────────────────────────────────────────────────

  useEffect(() => {
    if (!orgSlug || !selectedStudentId || !scoreTerm) return;
    async function fetchScores() {
      try {
        setIsLoadingScores(true);
        const data = await apiFetch<Score[]>(
          `/affective/${orgSlug}/affective`,
          {
            params: {
              studentId: selectedStudentId,
              term: scoreTerm,
              academicYear: scoreAcademicYear,
              resultType: scoreResultType,
            },
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
  }, [orgSlug, selectedStudentId, scoreAcademicYear, scoreResultType, scoreTerm]);

  async function handleSaveScores() {
    if (!orgSlug || !selectedStudentId || !scoreTerm) return;
    setIsSavingScores(true);
    try {
      const promises = metrics.map((metric) => {
        const score = editingScores[metric.id];
        if (score == null || score === 0) return Promise.resolve();
        return apiFetch(`/affective/${orgSlug}/affective`, {
          method: "POST",
          body: JSON.stringify({
            studentId: selectedStudentId,
            term: scoreTerm,
            academicYear: scoreAcademicYear,
            resultType: scoreResultType,
            metric: metric.id,
            score,
          }),
        });
      });
      await Promise.all(promises);
      const data = await apiFetch<Score[]>(
        `/affective/${orgSlug}/affective`,
        {
          params: {
            studentId: selectedStudentId,
            term: scoreTerm,
            academicYear: scoreAcademicYear,
            resultType: scoreResultType,
          },
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

  // ── Class grid (award a whole class in one screen) ─────────

  const gridStudents = useMemo(
    () =>
      students.filter(
        (s) => !gridClassId || s.classLevel?.id === gridClassId || s.classLevelId === gridClassId,
      ),
    [students, gridClassId],
  );

  useEffect(() => {
    if (!orgSlug || !scoreTerm) return;
    let cancelled = false;
    async function fetchGridScores() {
      try {
        setIsLoadingGrid(true);
        const data = await apiFetch<Score[]>(
          `/affective/${orgSlug}/affective`,
          {
            params: {
              term: scoreTerm,
              academicYear: scoreAcademicYear,
              resultType: scoreResultType,
              ...(gridClassId ? { classLevelId: gridClassId } : {}),
            },
          },
        );
        if (cancelled) return;
        const map: Record<string, Record<string, number>> = {};
        for (const s of data) {
          (map[s.studentId] ||= {})[s.metric] = s.score;
        }
        setGridScores(map);
        setLoadedGridKey(gridKey);
      } catch {
        if (!cancelled) {
          setGridScores({});
          setLoadedGridKey(null);
        }
      } finally {
        if (!cancelled) setIsLoadingGrid(false);
      }
    }
    fetchGridScores();
    return () => {
      cancelled = true;
    };
  }, [orgSlug, scoreTerm, scoreAcademicYear, scoreResultType, gridClassId, gridKey]);

  async function handleSaveGrid() {
    if (!orgSlug || !scoreTerm || !gridReady) return;
    const posts: { studentId: string; metric: string; score: number }[] = [];
    for (const student of gridStudents) {
      const byMetric = gridScores[student.id] || {};
      for (const metric of metrics) {
        const score = byMetric[metric.id];
        if (score != null && score > 0) {
          posts.push({ studentId: student.id, metric: metric.id, score });
        }
      }
    }
    if (posts.length === 0) {
      toast.info("Nothing to save — set a rating first");
      return;
    }
    setIsSavingGrid(true);
    try {
      // The POST upserts on student+term+metric, so re-sending unchanged cells
      // is safe. Small batches keep request storms off the API.
      for (let i = 0; i < posts.length; i += 20) {
        await Promise.all(
          posts.slice(i, i + 20).map((p) =>
            apiFetch(`/affective/${orgSlug}/affective`, {
              method: "POST",
              body: JSON.stringify({
                ...p,
                term: scoreTerm,
                academicYear: scoreAcademicYear,
                resultType: scoreResultType,
              }),
            }),
          ),
        );
      }
      toast.success(`Saved ${posts.length} rating${posts.length > 1 ? "s" : ""}`);
    } catch {
      // already toasted
    } finally {
      setIsSavingGrid(false);
    }
  }

  function renderGridCell(studentId: string, metric: AffectiveCategory) {
    const value = gridReady ? gridScores[studentId]?.[metric.id] ?? 0 : 0;
    return (
      <select
        value={value}
        disabled={!gridReady || isSavingGrid || !isClassTeacher}
        onChange={(e) => {
          const num = Number(e.target.value);
          setGridScores((prev) => ({
            ...prev,
            [studentId]: { ...(prev[studentId] || {}), [metric.id]: num },
          }));
        }}
        className={cn(
          "h-7 w-14 rounded-md border text-center text-xs font-bold",
          value > 0
            ? "border-blue-200 bg-blue-50 text-blue-700"
            : "border-slate-200 bg-white text-slate-400",
        )}
        aria-label={`${metric.label} rating`}
      >
        <option value={0}>—</option>
        {[1, 2, 3, 4, 5].map((v) => (
          <option key={v} value={v}>
            {v} · {AFFECTIVE_SCORE_LABELS[v]}
          </option>
        ))}
      </select>
    );
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

  function renderMetricRating(metric: AffectiveCategory) {
    const currentScore = editingScores[metric.id];

    if (isLoadingScores) {
      return <Skeleton className="h-8 w-full rounded-lg" />;
    }

    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((val) => (
          <button
            key={val}
            type="button"
            disabled={!isClassTeacher}
            aria-label={`${metric.label}: ${val} (${SCORE_LABELS[val]})`}
            aria-pressed={currentScore === val}
            onClick={() =>
              setEditingScores((prev) => ({
                ...prev,
                [metric.id]: prev[metric.id] === val ? 0 : val,
              }))
            }
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 md:pointer-fine:h-8 md:pointer-fine:w-8 md:pointer-fine:rounded-lg md:pointer-fine:text-xs",
              currentScore === val
                ? "bg-[#1447E6] text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900",
            )}
          >
            {val}
          </button>
        ))}
        {currentScore != null && currentScore > 0 && (
          <span className="ml-1 text-xs font-medium text-slate-600">
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
        subtitle="Class teachers score active school-defined categories; admins manage the category list"
      />

      {!isClassTeacher && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Ratings are read-only here. Only the teacher assigned to a student’s
          class can enter or change affective values.
        </div>
      )}

      <Tabs defaultValue="scores" className="w-full">
        <TabsList className="mb-4 md:mb-6">
          <TabsTrigger value="scores">Scores</TabsTrigger>
          <TabsTrigger value="grid">Class Grid</TabsTrigger>
          <TabsTrigger value="remarks">Remarks</TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════════════════
            Class Grid Tab — award a whole class in one screen
           ══════════════════════════════════════════════════════ */}
        <TabsContent value="grid" className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Class Grid — Leadership / Affective Skills</CardTitle>
              <CardDescription>
                Assigned class teachers rate each learner for a specific year,
                term, and result stage. Admins configure categories in Result Settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Class</label>
                  <Select value={gridClassId || "all"} onValueChange={(v) => setGridClassId(v === "all" ? "" : String(v))}>
                    <SelectTrigger className="h-10 w-44 rounded-xl bg-white shadow-sm" aria-label="Class">
                      <SelectValue placeholder="All students" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All students</SelectItem>
                      {classLevels
                        .filter((cl) => isAdmin || classTeacherClassIds.has(cl.id))
                        .map((cl) => (
                        <SelectItem key={cl.id} value={cl.id}>
                          {cl.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Academic year</label>
                  {renderAcademicYearSelect()}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Term</label>
                  {renderPeriodSelect(scoreTerm, setScoreTerm)}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Result</label>
                  {renderResultTypeSelect()}
                </div>
                <Button
                  onClick={handleSaveGrid}
                  disabled={isSavingGrid || !gridReady || !isClassTeacher}
                  className="hidden bg-[#1447E6] hover:bg-[#0F36B8] text-white md:inline-flex"
                >
                  {isSavingGrid ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Class Ratings
                </Button>
              </div>

              {isLoadingGrid ? (
                <Skeleton className="h-64 w-full rounded-xl" />
              ) : gridStudents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                  No students found for this selection.
                </div>
              ) : (
                <>
                  {/* Phones: Stacked Learner Rating Cards (44px touch pills, zero horizontal squeeze) */}
                  <div className="space-y-3 pb-24 md:hidden">
                    {gridStudents.map((student) => (
                      <div
                        key={student.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3"
                      >
                        <p className="text-sm font-bold text-[#0B1220]">
                          {student.firstName} {student.lastName}
                        </p>
                        <div className="space-y-3 divide-y divide-slate-100">
                          {metrics.map((metric) => {
                            const val = gridReady ? gridScores[student.id]?.[metric.id] ?? 0 : 0;
                            return (
                              <div key={metric.id} className="pt-2.5 first:pt-0 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-semibold text-slate-700">
                                    {metric.label}
                                  </span>
                                  {val > 0 && (
                                    <span className="text-xs font-medium text-[#1447E6]">
                                      {AFFECTIVE_SCORE_LABELS[val]}
                                    </span>
                                  )}
                                </div>
                                <div className="grid grid-cols-5 gap-1.5">
                                  {[1, 2, 3, 4, 5].map((rating) => (
                                    <button
                                      key={rating}
                                      type="button"
                                      disabled={!gridReady || isSavingGrid || !isClassTeacher}
                                      aria-label={`${student.firstName} ${metric.label}: ${rating} (${AFFECTIVE_SCORE_LABELS[rating]})`}
                                      aria-pressed={val === rating}
                                      onClick={() =>
                                        setGridScores((prev) => ({
                                          ...prev,
                                          [student.id]: {
                                            ...(prev[student.id] || {}),
                                            [metric.id]: val === rating ? 0 : rating,
                                          },
                                        }))
                                      }
                                      className={cn(
                                        "flex h-11 items-center justify-center rounded-xl text-sm font-bold transition-colors disabled:opacity-50",
                                        val === rating
                                          ? "bg-[#1447E6] text-white shadow-xs"
                                          : "bg-slate-100 text-slate-700 hover:bg-slate-200",
                                      )}
                                    >
                                      {rating}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {isClassTeacher && (
                      <div className="fixed inset-x-0 bottom-above-nav z-20 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-md md:hidden">
                        <Button
                          onClick={handleSaveGrid}
                          disabled={isSavingGrid || !gridReady}
                          className="w-full h-11 rounded-xl bg-[#1447E6] hover:bg-[#0F36B8] text-white font-semibold"
                        >
                          {isSavingGrid ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="mr-2 h-4 w-4" />
                          )}
                          Save Class Ratings
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Tablet & Desktop Table */}
                  <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="sticky left-0 z-10 w-44 min-w-44 bg-white">Student</TableHead>
                          {metrics.map((metric) => (
                            <TableHead key={metric.id} className="min-w-[92px] text-center text-xs leading-tight">
                              {metric.label.length > 14 ? `${metric.label.slice(0, 13)}…` : metric.label}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {gridStudents.map((student) => (
                          <TableRow key={student.id}>
                            <TableCell className="sticky left-0 z-10 bg-white font-medium text-slate-800">
                              {student.firstName} {student.lastName}
                            </TableCell>
                            {metrics.map((metric) => (
                              <TableCell key={metric.id} className="text-center">
                                {renderGridCell(student.id, metric)}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

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
                  Assigned class teachers rate students across the school’s active categories (1–5)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Academic year
                    </label>
                    {renderAcademicYearSelect()}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Term
                    </label>
                    {renderPeriodSelect(scoreTerm, setScoreTerm)}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Result
                    </label>
                    {renderResultTypeSelect()}
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
                    {/* Phones: Stacked Metric Cards */}
                    <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white md:hidden">
                      {metrics.map((metric) => (
                        <div key={metric.id} className="space-y-2.5 p-4">
                          <p className="text-sm font-semibold capitalize text-[#0B1220]">
                            {metric.label}
                          </p>
                          {renderMetricRating(metric)}
                        </div>
                      ))}
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden rounded-xl border border-slate-200 bg-white md:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-48">Metric</TableHead>
                            <TableHead>Rating</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {metrics.map((metric) => (
                            <TableRow key={metric.id}>
                              <TableCell className="font-medium capitalize text-slate-800">
                                {metric.label}
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
                      disabled={isSavingScores || isLoadingScores || !isClassTeacher}
                      className="w-full sm:w-auto bg-[#1447E6] hover:bg-[#0F36B8] text-white"
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
                    {renderPeriodSelect(remarkTerm, setRemarkTerm)}
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
