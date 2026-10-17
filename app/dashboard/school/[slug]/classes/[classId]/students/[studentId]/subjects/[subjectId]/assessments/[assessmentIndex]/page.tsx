"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BarChart3, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataStateCard } from "@/components/dashboard/shared";
import { useOrganization } from "@/hooks/useOrganization";
import { useMobilePageTitle } from "@/components/dashboard/mobile/MobileMenuProvider";
import { apiFetch, isForbiddenError } from "@/lib/api";
import { parseIntegerParam, parseRouteParam } from "@/lib/spreadsheets";
import {
  StudentPerformanceResponse,
  formatAssessmentScore,
  getAssessmentPercentage,
  getPerformanceTone,
  getStudentFullName,
  getSubjectName,
  hasEnteredScore,
} from "@/lib/student-performance";

export default function StudentAssessmentScorePage() {
  const params = useParams();
  const router = useRouter();
  const { currentOrg } = useOrganization();
  const classId = parseRouteParam(params.classId);
  const studentId = parseRouteParam(params.studentId);
  const subjectId = parseRouteParam(params.subjectId);
  const assessmentIndex = parseIntegerParam(params.assessmentIndex, 0);

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
            : "Failed to load assessment score",
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

  const assessment = useMemo(
    () =>
      subject?.assessments.find(
        (entry) => entry.originalIndex === assessmentIndex,
      ) || null,
    [assessmentIndex, subject?.assessments],
  );

  const percentage = assessment ? getAssessmentPercentage(assessment) : null;
  const progressWidth =
    percentage === null ? 0 : Math.max(0, Math.min(percentage, 100));

  useMobilePageTitle(assessment?.name);

  return (
    <div className="min-h-full pb-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-4 md:gap-5 md:px-6 md:py-4 lg:px-8">
        <section className="rounded-xl border border-blue-100/80 bg-white/90 p-4 shadow-[0_24px_70px_rgba(37,99,235,0.10)] sm:p-6">
          <div className="flex flex-col gap-4">
            <div className="min-w-0">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Back"
                  className="mb-4 hidden h-11 w-11 rounded-lg border border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100 md:inline-flex"
                onClick={() =>
                  router.push(
                    `/dashboard/school/${currentOrg?.slug}/classes/${classId}/students/${studentId}/subjects/${subjectId}`,
                  )
                }
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>

              {isLoading ? (
                <>
                  <Skeleton className="h-10 w-52" />
                  <Skeleton className="mt-3 h-4 w-72" />
                </>
              ) : (
                <>
                  <h1 className="hidden text-2xl font-bold tracking-tight text-blue-950 sm:text-3xl md:block">
                    {assessment?.name || "Assessment"}
                  </h1>
                  <p className="text-sm text-slate-600 sm:text-base md:mt-3 md:text-slate-500">
                    {performance
                      ? getStudentFullName(performance.student)
                      : "Student"}{" "}
                    • {subject ? getSubjectName(subject) : "Subject"}
                  </p>
                </>
              )}
            </div>
          </div>
        </section>

        {isLoading ? (
          <Skeleton className="h-[420px] rounded-xl" />
        ) : forbidden ? (
          <DataStateCard
            variant="forbidden"
            title="You don't have access to this student's record"
            description="This student isn't in a class or subject assigned to you."
          />
        ) : !performance || !subject || !assessment ? (
          <div className="rounded-xl border border-dashed border-blue-200 bg-white/95 p-8 text-center shadow-[0_12px_35px_rgba(37,99,235,0.05)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-blue-50">
              <ClipboardCheck className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-slate-900">
              Assessment not found
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              The selected assessment does not exist for this student and
              subject.
            </p>
          </div>
        ) : (
          <section className="rounded-xl border border-blue-100 bg-white p-6 shadow-[0_18px_50px_rgba(37,99,235,0.08)]">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-blue-100 bg-blue-50/70 p-5 md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-400">
                  Score
                </p>
                <p
                  className={`mt-3 text-3xl font-bold tracking-tight sm:text-4xl ${getPerformanceTone(percentage)}`}
                >
                  {formatAssessmentScore(assessment.score, assessment.total)}
                </p>
                <p className="mt-3 text-sm text-slate-500">
                  {hasEnteredScore(assessment.score)
                    ? "Recorded score for this assessment."
                    : "No score has been entered for this assessment yet."}
                </p>
              </div>

              <div className="rounded-lg border border-blue-100 bg-white p-5">
                <div className="flex items-center gap-2 text-blue-500">
                  <BarChart3 className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                    Percentage
                  </span>
                </div>
                <p
                  className={`mt-3 text-2xl font-bold tracking-tight sm:text-3xl ${getPerformanceTone(percentage)}`}
                >
                  {percentage === null ? "--" : `${percentage}%`}
                </p>
                <Badge
                  variant="outline"
                  className="mt-3 border-blue-200 bg-blue-50 text-blue-700 capitalize"
                >
                  {subject.status}
                </Badge>
              </div>
            </div>

            <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Performance Meter
              </p>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full ${
                    percentage === null
                      ? "bg-slate-300"
                      : percentage >= 70
                        ? "bg-emerald-500"
                        : percentage >= 50
                          ? "bg-amber-500"
                          : "bg-red-500"
                  }`}
                  style={{ width: `${progressWidth}%` }}
                />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-white bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Student
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {getStudentFullName(performance.student)}
                  </p>
                </div>
                <div className="rounded-lg border border-white bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Subject
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {getSubjectName(subject)}
                  </p>
                </div>
                <div className="rounded-lg border border-white bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Class
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {performance.student.classLevel?.name || "Unassigned"}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
