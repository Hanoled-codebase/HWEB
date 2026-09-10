"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  GraduationCap,
  UserRound,
  X,
  Loader2,
  BadgeCheck,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrganization } from "@/hooks/useOrganization";
import { DataStateCard } from "@/components/dashboard/shared";
import { apiFetch, isForbiddenError } from "@/lib/api";
import { parseRouteParam } from "@/lib/spreadsheets";

type Member = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type ClassItem = {
  id: string;
  name: string;
  studentCount: number;
};

type Assignment = {
  id: string;
  teacherId: string;
  classLevelId: string;
  className: string;
  teacherName: string;
};

type SubjectDetailResponse = {
  subject: {
    id: string;
    name: string;
    code?: string | null;
    category?: string | null;
    isDefault?: boolean;
    description?: string | null;
    createdAt: string;
    updatedAt: string;
  };
  assignments: Assignment[];
  teachers: Member[];
  classes: ClassItem[];
};

export default function SubjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentOrg, currentMember } = useOrganization();
  const subjectId = parseRouteParam(params.subjectId);
  const [data, setData] = useState<SubjectDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  const isPrivileged =
    currentMember?.role === "owner" || currentMember?.role === "admin";

  const fetchData = useCallback(async () => {
    if (!currentOrg || !subjectId) return;
    try {
      setIsLoading(true);
      setForbidden(false);
      const response = await apiFetch<SubjectDetailResponse>(
        `/subjects/${currentOrg.slug}/${subjectId}`,
      );
      setData(response);
    } catch (error) {
      if (isForbiddenError(error)) {
        setForbidden(true);
      } else {
        toast.error(
          error instanceof Error ? error.message : "Failed to load subject",
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentOrg, subjectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleAssign() {
    if (!currentOrg || !selectedTeacher || !selectedClass) {
      toast.error("Select both a teacher and a class");
      return;
    }
    setIsAssigning(true);
    try {
      await apiFetch(`/subjects/${currentOrg.slug}/assignments`, {
        method: "POST",
        body: JSON.stringify({
          memberId: selectedTeacher,
          subjectId,
          classLevelId: selectedClass,
        }),
      });
      toast.success("Assignment created");
      setSelectedTeacher("");
      setSelectedClass("");
      fetchData();
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create assignment",
      );
    } finally {
      setIsAssigning(false);
    }
  }

  async function handleRemoveAssignment(assignmentId: string) {
    if (!currentOrg) return;
    if (!confirm("Remove this assignment?")) return;
    try {
      await apiFetch(
        `/subjects/${currentOrg.slug}/assignments/${assignmentId}`,
        { method: "DELETE" },
      );
      toast.success("Assignment removed");
      fetchData();
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove assignment",
      );
    }
  }

  const unassignedClasses = data
    ? data.classes.filter(
        (c) => !data.assignments.some((a) => a.classLevelId === c.id),
      )
    : [];

  return (
    <div className="min-h-full bg-slate-50/60 pb-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8">
        {/* Back button */}
        <div>
          <Button
            variant="ghost"
            className="h-10 rounded-xl border border-slate-200 bg-white/80 px-3 text-xs font-semibold text-slate-600 shadow-sm hover:bg-white"
            onClick={() =>
              router.push(`/dashboard/school/${currentOrg?.slug}/subjects`)
            }
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to Subjects
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 rounded-3xl" />
            <Skeleton className="h-64 rounded-3xl" />
          </div>
        ) : data ? (
          <>
            {/* Subject header */}
            <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <BookOpen className="h-7 w-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        {data.subject.name}
                      </h1>
                      {data.subject.isDefault && (
                        <BadgeCheck className="h-4 w-4 text-amber-400" />
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                      {data.subject.code && (
                        <span className="font-mono font-semibold text-slate-700">
                          {data.subject.code}
                        </span>
                      )}
                      {data.subject.category && (
                        <Badge
                          variant="outline"
                          className="rounded-full border-0 bg-slate-50/70 px-2.5 py-0.5 text-[11px] font-medium capitalize text-slate-500"
                        >
                          {data.subject.category}
                        </Badge>
                      )}
                      {data.subject.isDefault && (
                        <Badge
                          variant="outline"
                          className="rounded-full border-0 bg-amber-50/70 px-2.5 py-0.5 text-[11px] font-medium text-amber-600"
                        >
                          Default
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div className="mt-6 grid grid-cols-3 gap-4 border-t border-slate-100/70 pt-6">
                <div className="rounded-xl bg-slate-50/50 p-3 text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                    Teachers
                  </p>
                  <p className="mt-0.5 text-2xl font-bold text-slate-900">
                    {new Set(data.assignments.map((a) => a.teacherId)).size}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50/50 p-3 text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                    Classes
                  </p>
                  <p className="mt-0.5 text-2xl font-bold text-slate-900">
                    {data.assignments.length}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50/50 p-3 text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                    Available
                  </p>
                  <p className="mt-0.5 text-2xl font-bold text-slate-900">
                    {unassignedClasses.length}
                  </p>
                </div>
              </div>
            </section>

            {/* Assign Teacher section */}
            {isPrivileged && (
              <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
                <h2 className="text-sm font-bold text-slate-900">
                  Assign to Teacher & Class
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Link this subject to a teacher and a class.
                </p>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                      Teacher
                    </label>
                    <Select
                      value={selectedTeacher}
                      onValueChange={(v) => setSelectedTeacher(v as string)}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select teacher" />
                      </SelectTrigger>
                      <SelectContent>
                        {data.teachers.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                        {data.teachers.length === 0 && (
                          <SelectItem value="__none__" disabled>
                            No teachers available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                    <div className="flex-1">
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                        Class
                      </label>
                      <Select
                        value={selectedClass}
                        onValueChange={(v) => setSelectedClass(v as string)}
                      >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {unassignedClasses.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} ({c.studentCount} students)
                          </SelectItem>
                        ))}
                        {unassignedClasses.length === 0 && (
                          <SelectItem value="__none__" disabled>
                            All classes assigned
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleAssign}
                    disabled={!selectedTeacher || !selectedClass || isAssigning}
                    className="h-11 shrink-0 rounded-xl bg-blue-600 px-6 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isAssigning && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Assign
                  </Button>
                </div>
              </section>
            )}

            {/* Current assignments */}
            <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-sm font-bold text-slate-900">
                Current Assignments
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Teachers assigned to teach this subject by class.
              </p>

              <div className="mt-4 space-y-2">
                {data.assignments.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50/50 p-8 text-center">
                    <GraduationCap className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-sm font-medium text-slate-500">
                      No assignments yet
                    </p>
                    <p className="text-xs text-slate-400">
                      {isPrivileged
                        ? "Use the form above to assign this subject."
                        : "An admin will assign teachers and classes."}
                    </p>
                  </div>
                ) : (
                  data.assignments.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between gap-3 rounded-xl bg-slate-50/50 px-4 py-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                          <UserRound className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {a.teacherName}
                          </p>
                          <p className="text-xs text-slate-400">
                            {a.className}
                          </p>
                        </div>
                      </div>
                      {isPrivileged && (
                        <button
                          onClick={() => handleRemoveAssignment(a.id)}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          title="Remove assignment"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* View class results section */}
            <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-sm font-bold text-slate-900">
                Class Results
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                View results for classes studying this subject.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.classes.map((c) => {
                  const assignment = data.assignments.find(
                    (a) => a.classLevelId === c.id,
                  );
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() =>
                        router.push(
                          `/dashboard/school/${currentOrg?.slug}/subjects/${subjectId}/classes/${c.id}`,
                        )
                      }
                      className="flex items-center gap-3 rounded-2xl bg-slate-50/50 p-4 text-left transition hover:bg-blue-50/50"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm">
                        <GraduationCap className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">
                          {c.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {c.studentCount} student{c.studentCount !== 1 ? "s" : ""}
                          {assignment && (
                            <>
                              {" · "}
                              {assignment.teacherName}
                            </>
                          )}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        ) : forbidden ? (
          <DataStateCard variant="forbidden" title="You don't have access to this subject" />
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-14 text-center shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">
              Subject not found
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              This subject may have been deleted.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
