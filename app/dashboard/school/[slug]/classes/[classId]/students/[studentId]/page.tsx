"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { StudentAcademicRecord } from "@/components/dashboard/student-academic-record";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganization } from "@/hooks/useOrganization";
import { apiFetch } from "@/lib/api";
import { parseRouteParam } from "@/lib/spreadsheets";
import { StudentPerformanceResponse } from "@/lib/student-performance";

export default function ClassStudentSubjectsPage() {
  const params = useParams();
  const router = useRouter();
  const { currentOrg } = useOrganization();
  const classId = parseRouteParam(params.classId);
  const studentId = parseRouteParam(params.studentId);

  const [performance, setPerformance] = useState<StudentPerformanceResponse | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  const fetchPerformance = useCallback(async () => {
    if (!currentOrg || !studentId) {
      return;
    }

    try {
      setIsLoading(true);
      const data = await apiFetch<StudentPerformanceResponse>(
        `/students/${currentOrg.slug}/${studentId}/results`,
      );
      setPerformance(data);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load student record",
      );
    } finally {
      setIsLoading(false);
    }
  }, [currentOrg, studentId]);

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,#f8fbff_0%,#eef5ff_45%,#f7fafc_100%)] pb-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            className="h-11 rounded-2xl border border-slate-200 bg-white/80 px-4 text-slate-700 shadow-sm hover:bg-white"
            onClick={() =>
              router.push(
                `/dashboard/school/${currentOrg?.slug}/classes/${classId}`,
              )
            }
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Class
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-5">
            <Skeleton className="h-56 rounded-[30px]" />
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
              <Skeleton className="h-[34rem] rounded-[30px]" />
              <div className="space-y-5">
                <Skeleton className="h-[16rem] rounded-[30px]" />
                <Skeleton className="h-[16rem] rounded-[30px]" />
              </div>
            </div>
          </div>
        ) : performance ? (
          <StudentAcademicRecord
            student={performance.student}
            subjects={performance.subjects}
            eyebrow="Student Record"
            description="A full academic snapshot for this learner. Open any subject card to drill into the assessment-level details."
            actionLabel="View Academic Record"
            emptyTitle="No subject records available"
            emptyDescription="This student does not have any subject spreadsheets linked to the current class yet."
            onOpenSubject={(subject) =>
              router.push(
                `/dashboard/school/${currentOrg?.slug}/classes/${classId}/students/${studentId}/subjects/${subject.subject?.id || subject.spreadsheetId}`,
              )
            }
          />
        ) : (
          <div className="rounded-[30px] border border-dashed border-slate-300 bg-white/80 p-10 text-center shadow-[0_18px_50px_rgba(148,163,184,0.16)]">
            <h2 className="text-2xl font-bold text-slate-900">
              Student record unavailable
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
              We could not load the academic record for this student right now.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
