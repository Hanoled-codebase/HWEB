"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  ClipboardList,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganization } from "@/hooks/useOrganization";
import { apiFetch, isForbiddenError } from "@/lib/api";
import { formatScore, getInitials, parseRouteParam } from "@/lib/spreadsheets";
import {
  formatAssessmentScore,
  getAssessmentPercentage,
  getOrderedStudentAssessments,
  getSubjectPerformanceSummary,
  getSubjectRecordLabel,
  StudentPerformanceAssessment,
} from "@/lib/student-performance";
import { cn } from "@/lib/utils";

type SubjectClassResult = {
  subject: { id: string; name: string; code?: string };
  classLevel: { id: string; name: string; level?: string };
  teacher?: { id?: string; name?: string; email?: string } | null;
  spreadsheet: {
    id: string;
    status: "pending" | "active" | "inactive";
    updatedAt?: string;
  };
  students: Array<{
    student: {
      id: string;
      firstName: string;
      middleName?: string;
      lastName: string;
      admissionNumber?: string;
      gender?: string;
      profileImage?: string;
    };
    totalScore: number;
    assessments: StudentPerformanceAssessment[];
  }>;
};

function getBadgeClassName(label: string) {
  const normalized = label.toLowerCase();

  if (normalized === "distinction") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (normalized === "merit") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  if (normalized === "pass") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (normalized === "grading in progress") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  return "border-rose-200 bg-rose-50 text-rose-700";
}

function StudentSubjectCard({
  record,
}: {
  record: SubjectClassResult["students"][number];
}) {
  const subjectLike = {
    spreadsheetId: record.student.id,
    status: "active" as const,
    totalScore: record.totalScore,
    assessments: record.assessments,
  };
  const summary = getSubjectPerformanceSummary(subjectLike);
  const label = getSubjectRecordLabel(summary);
  const orderedAssessments = getOrderedStudentAssessments(record.assessments);
  const fullName = [
    record.student.firstName,
    record.student.middleName,
    record.student.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <Avatar className="h-14 w-14 shrink-0 border border-blue-100">
            <AvatarImage src={record.student.profileImage} alt={fullName} />
            <AvatarFallback className="bg-blue-50 font-bold text-blue-700">
              {getInitials(fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold text-slate-950 capitalize">
              {fullName}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="border-blue-100 bg-blue-50 text-blue-700"
              >
                {record.student.admissionNumber || "No admission number"}
              </Badge>
              {record.student.gender && (
                <Badge variant="outline" className="capitalize">
                  {record.student.gender}
                </Badge>
              )}
              <Badge
                variant="outline"
                className={cn("capitalize", getBadgeClassName(label))}
              >
                {label}
              </Badge>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Total
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-950">
            {summary.possible > 0
              ? `${formatScore(summary.scored)} / ${formatScore(summary.possible)}`
              : formatScore(record.totalScore)}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {orderedAssessments.map((assessment) => {
          const percentage = getAssessmentPercentage(assessment);

          return (
            <div
              key={`${record.student.id}-${assessment.originalIndex}-${assessment.name}`}
              className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {assessment.name}
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      {formatAssessmentScore(
                        assessment.score,
                        assessment.total,
                      )}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 text-sm font-bold text-slate-700">
                  {percentage === null ? "--" : `${Math.round(percentage)}%`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

export default function SubjectClassResultsPage() {
  const params = useParams();
  const router = useRouter();
  const { currentOrg } = useOrganization();
  const subjectId = parseRouteParam(params.subjectId);
  const classId = parseRouteParam(params.classId);
  const [data, setData] = useState<SubjectClassResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  const fetchResults = useCallback(async () => {
    if (!currentOrg || !subjectId || !classId) return;

    try {
      setIsLoading(true);
      setForbidden(false);
      const response = await apiFetch<SubjectClassResult>(
        `/subjects/${currentOrg.slug}/${subjectId}/classes/${classId}/results`,
      );
      setData(response);
    } catch (error) {
      if (isForbiddenError(error)) {
        setForbidden(true);
      } else {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to load subject results",
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [classId, currentOrg, subjectId]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const average = useMemo(() => {
    if (!data?.students.length) return null;

    const percentages = data.students
      .map((record) => {
        const summary = getSubjectPerformanceSummary({
          spreadsheetId: record.student.id,
          status: "active",
          totalScore: record.totalScore,
          assessments: record.assessments,
        });
        return summary.percentage;
      })
      .filter((value): value is number => typeof value === "number");

    if (percentages.length === 0) return null;

    return Math.round(
      percentages.reduce((sum, value) => sum + value, 0) / percentages.length,
    );
  }, [data?.students]);

  return (
    <div className="min-h-full bg-slate-50/60 pb-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            className="h-11 rounded-2xl border border-slate-200 bg-white/80 px-4 text-slate-700 shadow-sm hover:bg-white"
            onClick={() =>
              router.push(
                `/dashboard/school/${currentOrg?.slug}/subjects/${subjectId}`,
              )
            }
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Subject Classes
          </Button>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-10 w-80" />
              <Skeleton className="h-5 w-96 max-w-full" />
            </div>
          ) : data ? (
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="hidden md:block text-3xl font-bold tracking-tight text-[#0B1220]">
                  {data.subject.name} - {data.classLevel.name}
                </h1>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className="rounded-full border-blue-200 bg-blue-50 px-3 py-1 text-blue-700"
                  >
                    <UserRound className="mr-1.5 h-3.5 w-3.5" />
                    {data.teacher?.name || "Teacher not assigned"}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 text-slate-600"
                  >
                    {data.students.length} students
                  </Badge>
                  <Badge
                    variant="outline"
                    className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 capitalize text-slate-600"
                  >
                    {data.spreadsheet.status}
                  </Badge>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[22rem]">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    Class Average
                  </p>
                  <p className="mt-2 text-3xl font-bold text-slate-950">
                    {average === null ? "--" : `${average}%`}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    Subject
                  </p>
                  <p className="mt-2 truncate text-xl font-bold text-slate-950">
                    {data.subject.code || data.subject.name}
                  </p>
                </div>
              </div>
            </div>
          ) : forbidden ? (
            <div className="text-center">
              <BookOpen className="mx-auto h-10 w-10 text-slate-300" />
              <h2 className="mt-4 text-xl font-bold text-slate-900">
                You don&apos;t have access to this class&apos;s results
              </h2>
            </div>
          ) : (
            <div className="text-center">
              <BookOpen className="mx-auto h-10 w-10 text-slate-300" />
              <h2 className="mt-4 text-xl font-bold text-slate-900">
                Subject record unavailable
              </h2>
            </div>
          )}
        </section>

        <section className="space-y-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-52 rounded-3xl" />
            ))
          ) : data && data.students.length > 0 ? (
            data.students.map((record) => (
              <StudentSubjectCard key={record.student.id} record={record} />
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-14 text-center shadow-sm">
              <BookOpen className="mx-auto h-10 w-10 text-slate-300" />
              <h2 className="mt-4 text-xl font-bold text-slate-900">
                No students found
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                This class has no students linked to the subject spreadsheet.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
