"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganization } from "@/hooks/useOrganization";
import { apiFetch } from "@/lib/api";

type Option = {
  id: string;
  name: string;
  level?: string;
};

type TeachingAssignment = {
  classLevel?: Option | null;
  subject?: Option | null;
};

type TeacherMember = {
  id: string;
  user?: {
    name?: string;
    email?: string;
  } | null;
  teachingAssignments?: TeachingAssignment[];
};

type SpreadsheetSummary = {
  id: string;
  status: "pending" | "active" | "inactive";
  createdAt: string;
  classLevel?: { id?: string; name?: string | null } | null;
  subject?: { id?: string; name?: string | null } | null;
};

function getStatusClassName(status: SpreadsheetSummary["status"]) {
  switch (status) {
    case "active":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "inactive":
      return "border-slate-200 bg-slate-100 text-slate-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

export default function TeacherSubjectPage() {
  const params = useParams();
  const router = useRouter();
  const { currentOrg, currentMember } = useOrganization();
  const teacherId = String(params.teacherId || "");
  const subjectId = String(params.subjectId || "");

  const [teacher, setTeacher] = useState<TeacherMember | null>(null);
  const [spreadsheets, setSpreadsheets] = useState<SpreadsheetSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isPrivileged =
    currentMember?.role === "owner" || currentMember?.role === "admin";

  const fetchData = useCallback(async () => {
    if (!currentOrg || !teacherId || !subjectId || !isPrivileged) return;

    try {
      setIsLoading(true);
      const [teacherData, spreadsheetData] = await Promise.all([
        apiFetch<TeacherMember>(
          `/organizations/${currentOrg.slug}/members/${teacherId}`,
        ),
        apiFetch<SpreadsheetSummary[]>(`/spreadsheets/${currentOrg.slug}`, {
          params: {
            teacherId,
            subjectId,
          },
        }),
      ]);

      setTeacher(teacherData);
      setSpreadsheets(spreadsheetData);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load teacher subject data",
      );
    } finally {
      setIsLoading(false);
    }
  }, [currentOrg, isPrivileged, subjectId, teacherId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const subjectAssignments = useMemo(() => {
    return (teacher?.teachingAssignments || []).filter(
      (assignment) => assignment.subject?.id === subjectId,
    );
  }, [subjectId, teacher?.teachingAssignments]);

  const subjectName =
    subjectAssignments[0]?.subject?.name ||
    spreadsheets[0]?.subject?.name ||
    "Subject";

  const assignedClasses = subjectAssignments
    .map((assignment) => assignment.classLevel)
    .filter((classLevel): classLevel is Option => Boolean(classLevel?.id));

  const sheetsByClassId = useMemo(() => {
    const map = new Map<string, SpreadsheetSummary>();

    spreadsheets.forEach((sheet) => {
      if (!sheet.classLevel?.id || map.has(sheet.classLevel.id)) {
        return;
      }

      map.set(sheet.classLevel.id, sheet);
    });

    return map;
  }, [spreadsheets]);

  if (!isPrivileged) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-11 w-11 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            className="rounded-lg"
            onClick={() =>
              router.push(
                `/dashboard/school/${currentOrg?.slug}/teachers/${teacherId}`,
              )
            }
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {subjectName}
            </h1>
            <p className="text-slate-500 capitalize">
              {teacher?.user?.name || "Teacher"} is assigned to{" "}
              {assignedClasses.length}{" "}
              {assignedClasses.length === 1 ? "class" : "classes"} for this
              subject.
            </p>
          </div>
        </div>

        <Badge
          variant="outline"
          className="w-fit border-blue-200 bg-blue-50 text-blue-700"
        >
          {spreadsheets.length} spreadsheets
        </Badge>
      </div>

      <div className="space-y-4">
        {assignedClasses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
            No class assignments found for this subject.
          </div>
        ) : (
          assignedClasses.map((classOption) => {
            const spreadsheet = sheetsByClassId.get(classOption.id);

            return (
              <div
                key={classOption.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                      {spreadsheet ? (
                        <FileSpreadsheet className="h-5 w-5" />
                      ) : (
                        <BookOpen className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">
                        {classOption.name}
                      </h2>
                      <p className="text-sm text-slate-500">
                        {subjectName}
                      </p>
                      {spreadsheet ? (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className={getStatusClassName(spreadsheet.status)}
                          >
                            {spreadsheet.status}
                          </Badge>
                          <span className="text-sm text-slate-500">
                            Spreadsheet ready for score entry
                          </span>
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-slate-500">
                          No spreadsheet has been created yet for this class and
                          subject.
                        </p>
                      )}
                    </div>
                  </div>

                  {spreadsheet ? (
                    <Button
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() =>
                        router.push(
                          `/dashboard/school/${currentOrg?.slug}/spreadsheets/${spreadsheet.id}`,
                        )
                      }
                    >
                      Open Spreadsheet
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() =>
                        router.push(
                          `/dashboard/school/${currentOrg?.slug}/spreadsheets?subjectId=${subjectId}&classLevelId=${classOption.id}`,
                        )
                      }
                    >
                      Create Spreadsheet
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
