"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Search,
  School,
  UserRound,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganization } from "@/hooks/useOrganization";
import { apiFetch } from "@/lib/api";
import { parseRouteParam } from "@/lib/spreadsheets";

type ClassDetail = {
  id: string;
  name: string;
  level?: string;
  limit?: number;
  totalStudents?: number;
  assignedTeacher?: {
    id?: string;
    user?: {
      name?: string;
      email?: string;
    } | null;
  } | null;
};

type StudentRecord = {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  admissionNumber?: string;
  gender?: string;
  profileImage?: string;
  profilePic?: string;
};

function getStudentFullName(student: StudentRecord) {
  return [student.firstName, student.middleName, student.lastName]
    .filter((n): n is string => !!n)
    .map((n) => n.charAt(0).toUpperCase() + n.slice(1).toLowerCase())
    .join(" ");
}

function getInitials(student: StudentRecord) {
  return `${student.firstName?.[0] || ""}${student.lastName?.[0] || ""}`.toUpperCase();
}

export default function ClassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentOrg } = useOrganization();
  const classId = parseRouteParam(params.classId);

  const [classDetail, setClassDetail] = useState<ClassDetail | null>(null);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchClassData = useCallback(async () => {
    if (!currentOrg || !classId) {
      return;
    }

    try {
      setIsLoading(true);
      const [classData, studentData] = await Promise.all([
        apiFetch<ClassDetail>(`/classes/${currentOrg.slug}/${classId}`),
        apiFetch<StudentRecord[]>(`/students/${currentOrg.slug}`, {
          params: { classLevelId: classId },
        }),
      ]);

      setClassDetail(classData);
      setStudents(studentData);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load class details",
      );
    } finally {
      setIsLoading(false);
    }
  }, [classId, currentOrg]);

  useEffect(() => {
    fetchClassData();
  }, [fetchClassData]);

  const filteredStudents = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return students.filter((student) => {
      if (!normalizedQuery) {
        return true;
      }

      return [
        getStudentFullName(student),
        student.admissionNumber || "",
        student.gender || "",
      ].some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [searchQuery, students]);

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,#eef4ff_0%,#f8fbff_48%,#eef2ff_100%)] pb-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 sm:gap-5 sm:px-6 lg:px-8">
        <section className="rounded-xl border border-blue-100/80 bg-white/90 p-4 shadow-[0_24px_70px_rgba(37,99,235,0.10)] backdrop-blur sm:p-6">
          <div className="flex flex-col gap-4 sm:gap-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden md:flex mb-4 h-12 w-12 shrink-0 rounded-lg border border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100"
                  onClick={() =>
                    router.push(`/dashboard/school/${currentOrg?.slug}/classes`)
                  }
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>

                {isLoading ? (
                  <>
                    <Skeleton className="h-8 w-40 sm:h-10 sm:w-48" />
                    <Skeleton className="mt-3 h-4 w-56 sm:w-64" />
                  </>
                ) : (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-400 sm:text-sm">
                      Class View
                    </p>
                    <h1 className="mt-2 text-xl font-bold tracking-tight text-blue-950 sm:text-3xl">
                      {classDetail?.name || "Class"}
                    </h1>
                    <p className="mt-2 text-sm text-slate-500 sm:mt-3 sm:text-base">
                      Open any student in this class to inspect subjects,
                      assessments, and recorded scores.
                    </p>
                  </>
                )}
              </div>

              {!isLoading && classDetail && (
                <div className="grid gap-3 sm:min-w-[220px]">
                  <div className="rounded-lg border border-blue-100 bg-blue-50/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-400">
                      Level
                    </p>
                    <p className="mt-2 text-lg font-semibold text-blue-950">
                      {classDetail.level || "Not specified"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-blue-100 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-400">
                      Form Teacher
                    </p>
                    <p className="mt-2 truncate text-sm font-semibold text-slate-900 capitalize">
                      {classDetail.assignedTeacher?.user?.name || "Unassigned"}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {classDetail.assignedTeacher?.user?.email ||
                        "No teacher linked"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Stat chips — icon/number/label stacked vertically so labels can
                wrap instead of truncating in a cramped 1/3-width column */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-lg border border-blue-100 bg-white p-3 sm:p-4">
                <Users className="h-4 w-4 shrink-0 text-blue-500" />
                <p className="mt-2 text-xl font-bold text-slate-950 sm:text-2xl">
                  {isLoading ? "-" : students.length}
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase leading-tight text-blue-400 sm:text-xs sm:tracking-[0.18em]">
                  Students
                </p>
              </div>
              <div className="rounded-lg border border-blue-100 bg-white p-3 sm:p-4">
                <School className="h-4 w-4 shrink-0 text-blue-500" />
                <p className="mt-2 text-xl font-bold text-slate-950 sm:text-2xl">
                  {isLoading ? "-" : classDetail?.limit || 0}
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase leading-tight text-blue-400 sm:text-xs sm:tracking-[0.18em]">
                  Capacity
                </p>
              </div>
              <div className="rounded-lg border border-blue-100 bg-white p-3 sm:p-4">
                <UserRound className="h-4 w-4 shrink-0 text-blue-500" />
                <p className="mt-2 text-xl font-bold text-slate-950 sm:text-2xl">
                  {isLoading
                    ? "-"
                    : classDetail?.totalStudents || students.length}
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase leading-tight text-blue-400 sm:text-xs sm:tracking-[0.18em]">
                  Filled
                </p>
              </div>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-blue-400 sm:left-5" />
              {/* Placeholder text can't be made responsive on a single input,
                  so two inputs share state: a short prompt on mobile, the
                  full sentence from sm: up. */}
              <Input
                type="search"
                placeholder="Search students"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-12 rounded-xl border-2 border-blue-200 bg-white pl-12 pr-4 text-base shadow-none focus-visible:border-blue-500 focus-visible:ring-blue-200 sm:hidden"
              />
              <Input
                type="search"
                placeholder="Search student by name, admission number, or gender"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="hidden h-14 rounded-xl border-2 border-blue-200 bg-white pl-14 pr-6 text-base shadow-none focus-visible:border-blue-500 focus-visible:ring-blue-200 sm:block"
              />
            </div>
          </div>
        </section>

        <section className="space-y-3 sm:space-y-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="rounded-xl border border-blue-100 bg-white p-4 shadow-[0_16px_40px_rgba(37,99,235,0.08)]"
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <Skeleton className="h-12 w-12 shrink-0 rounded-full sm:h-14 sm:w-14" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-5 w-32 sm:w-40" />
                    <Skeleton className="h-4 w-24 sm:w-28" />
                  </div>
                  <Skeleton className="h-11 w-11 shrink-0 rounded-lg sm:h-10 sm:w-10" />
                </div>
              </div>
            ))
          ) : filteredStudents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-blue-200 bg-white/95 p-6 text-center shadow-[0_12px_35px_rgba(37,99,235,0.05)] sm:p-8">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-blue-50 sm:h-16 sm:w-16">
                <Users className="h-7 w-7 text-blue-600 sm:h-8 sm:w-8" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900 sm:text-xl">
                {searchQuery
                  ? "No students match your search"
                  : "No students in this class"}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {searchQuery
                  ? "Try another keyword."
                  : "Add students to this class to begin drilling into subject performance."}
              </p>
            </div>
          ) : (
            filteredStudents.map((student) => (
              <button
                key={student.id}
                type="button"
                onClick={() =>
                  router.push(
                    `/dashboard/school/${currentOrg?.slug}/classes/${classId}/students/${student.id}`,
                  )
                }
                className="group flex w-full items-center gap-3 rounded-xl border border-blue-100 bg-white px-4 py-3.5 text-left shadow-[0_16px_40px_rgba(37,99,235,0.08)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_20px_45px_rgba(37,99,235,0.14)] sm:gap-4 sm:p-5"
              >
                <Avatar className="h-11 w-11 shrink-0 border border-blue-200 sm:h-14 sm:w-14">
                  <AvatarImage
                    src={student.profileImage || student.profilePic}
                    alt={getStudentFullName(student)}
                  />
                  <AvatarFallback className="bg-blue-50 text-sm font-semibold text-blue-700 sm:text-base">
                    {getInitials(student)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  {/* Name: single-line truncate on mobile so the card stays a
                      fixed compact height; wraps up to 2 lines from sm: up
                      where there's more room to breathe. */}
                  <h2 className="truncate text-base font-bold tracking-tight text-slate-950 group-hover:text-blue-700 sm:line-clamp-2 sm:text-xl">
                    {getStudentFullName(student)}
                  </h2>

                  {/* Mobile: compact inline subtitle, no badges */}
                  <p className="mt-1 truncate text-xs text-slate-500 sm:hidden">
                    {[student.admissionNumber, student.gender]
                      .filter(Boolean)
                      .join(" · ") || "No admission number"}
                  </p>

                  {/* sm and up: original badge treatment, unchanged */}
                  <div className="mt-2 hidden flex-wrap items-center gap-2 sm:flex">
                    <Badge
                      variant="outline"
                      className="border-blue-100 bg-blue-50 text-blue-700"
                    >
                      {student.admissionNumber || "No admission number"}
                    </Badge>
                    {student.gender ? (
                      <Badge variant="outline" className="capitalize">
                        {student.gender}
                      </Badge>
                    ) : null}
                  </div>
                </div>

                {/* Mobile: light chevron, no boxed button */}
                <ArrowRight className="h-4 w-4 shrink-0 text-blue-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600 sm:hidden" />

                {/* sm and up: original boxed arrow button, unchanged */}
                <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-blue-100 text-blue-700 transition group-hover:bg-blue-600 group-hover:text-white sm:flex sm:h-12 sm:w-12">
                  <ArrowRight className="h-5 w-5" />
                </div>
              </button>
            ))
          )}
        </section>
      </div>
    </div>
  );
}