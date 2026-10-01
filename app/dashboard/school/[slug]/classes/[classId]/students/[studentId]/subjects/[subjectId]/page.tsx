"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ClipboardList } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataStateCard } from "@/components/dashboard/shared";
import { useOrganization } from "@/hooks/useOrganization";
import { useMobilePageTitle } from "@/components/dashboard/mobile/MobileMenuProvider";
import { apiFetch, isForbiddenError } from "@/lib/api";
import { parseRouteParam } from "@/lib/spreadsheets";
import {
  StudentPerformanceResponse,
  formatAssessmentScore,
  getOrderedStudentAssessments,
  getStudentFullName,
  getSubjectName,
  hasEnteredScore,
} from "@/lib/student-performance";

export default function StudentSubjectAssessmentsPage() {
  const params = useParams();
  const router = useRouter();
  const { currentOrg } = useOrganization();
  const classId = parseRouteParam(params.classId);
  const studentId = parseRouteParam(params.studentId);
  const subjectId = parseRouteParam(params.subjectId);

  const [performance, setPerformance] =
    useState<StudentPerformanceResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  const fetchPerformance = useCallback(async () => {
    if (!currentOrg || !studentId) {
      return;
    }

    try {
      setIsLoading(true);
      setForbidden(false);
      const data = await apiFetch<StudentPerformanceResponse>(
        `/students/${currentOrg.slug}/${studentId}/results`,
      );
      setPerformance(data);
    } catch (error) {
      if (isForbiddenError(error)) {
        setForbidden(true);
      } else {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to load subject assessments",
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentOrg, studentId]);

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  const subject = useMemo(
    () =>
      (performance?.subjects || []).find(
        (entry) => (entry.subject?.id || entry.spreadsheetId) === subjectId,
      ) || null,
    [performance?.subjects, subjectId],
  );

  const orderedAssessments = useMemo(
    () => (subject ? getOrderedStudentAssessments(subject.assessments) : []),
    [subject],
  );

  useMobilePageTitle(subject ? getSubjectName(subject) : null);

  return (
    <div className="min-h-full pb-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 md:gap-5 md:px-6 md:py-4 lg:px-8">
        <section className="rounded-xl border border-blue-100/80 bg-white/90 p-4 shadow-[0_24px_70px_rgba(37,99,235,0.10)] sm:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Back"
                  className="mb-4 hidden h-11 w-11 rounded-lg border border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100 md:inline-flex"
                  onClick={() =>
                    router.push(
                      `/dashboard/school/${currentOrg?.slug}/classes/${classId}/students/${studentId}`,
                    )
                  }
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>

                {isLoading ? (
                  <>
                    <Skeleton className="h-10 w-60" />
                    <Skeleton className="mt-3 h-4 w-72" />
                  </>
                ) : (
                  <>
                    <h1 className="hidden text-2xl font-bold tracking-tight text-blue-950 sm:text-3xl md:block">
                      {subject ? getSubjectName(subject) : "Subject"}
                    </h1>
                    <p className="text-sm text-slate-600 sm:text-base md:mt-3 md:text-slate-500">
                      {performance
                        ? getStudentFullName(performance.student)
                        : "Student"}{" "}
                      • click an assessment to inspect the exact score details.
                    </p>
                  </>
                )}
              </div>

              {!isLoading && subject && (
                <div className="grid gap-3 md:min-w-[220px]">
                  <div className="rounded-lg border border-blue-100 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-400">
                      Total Score
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-950">
                      {subject.totalScore}
                    </p>
                  </div>
                  <div className="rounded-lg border border-blue-100 bg-blue-50/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-400">
                      Status
                    </p>
                    <Badge
                      variant="outline"
                      className="mt-2 border-blue-200 bg-white text-blue-700 capitalize"
                    >
                      {subject.status}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-24 rounded-xl" />
            ))
          ) : forbidden ? (
            <DataStateCard
              variant="forbidden"
              title="You don't have access to this student's record"
              description="This student isn't in a class or subject assigned to you."
            />
          ) : !performance || !subject ? (
            <div className="rounded-xl border border-dashed border-blue-200 bg-white/95 p-8 text-center shadow-[0_12px_35px_rgba(37,99,235,0.05)]">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-blue-50">
                <ClipboardList className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="mt-4 text-xl font-semibold text-slate-900">
                Subject not found
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                The subject you selected is not linked to this student.
              </p>
            </div>
          ) : (
            orderedAssessments.map((assessment) => (
              <button
                key={`${assessment.originalIndex}-${assessment.name}`}
                type="button"
                onClick={() =>
                  router.push(
                    `/dashboard/school/${currentOrg?.slug}/classes/${classId}/students/${studentId}/subjects/${subjectId}/assessments/${assessment.originalIndex}`,
                  )
                }
                className="group flex w-full items-center gap-4 rounded-xl border border-blue-100 bg-white p-4 text-left shadow-[0_16px_40px_rgba(37,99,235,0.08)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_20px_45px_rgba(37,99,235,0.14)] sm:p-5"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                  <ClipboardList className="h-6 w-6" />
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-base font-bold tracking-tight text-slate-950 group-hover:text-blue-700 sm:text-xl">
                    {assessment.name}
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    {formatAssessmentScore(assessment.score, assessment.total)}
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-700">
                    {hasEnteredScore(assessment.score)
                      ? "Score has been entered"
                      : "Waiting for score entry"}
                  </p>
                </div>

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-blue-100 text-blue-700 transition group-hover:bg-blue-600 group-hover:text-white">
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
