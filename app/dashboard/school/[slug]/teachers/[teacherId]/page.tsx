"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Loader2,
  Plus,
  Save,
  School,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganization } from "@/hooks/useOrganization";
import { apiFetch } from "@/lib/api";

type Option = {
  id: string;
  name: string;
  level?: string;
  code?: string;
};

type TeachingAssignment = {
  classLevel?: Option | null;
  subject?: Option | null;
};

type TeacherMember = {
  id: string;
  role: "member" | "admin" | "owner" | "parent";
  user?: {
    name?: string;
    email?: string;
  } | null;
  teachingAssignments?: TeachingAssignment[];
  memberAssignments?: any[];
};

function getInitials(name: string | undefined) {
  if (!name) return "T";

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

export default function TeacherDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentOrg, currentMember } = useOrganization();
  const teacherId = String(params.teacherId || "");

  const [teacher, setTeacher] = useState<TeacherMember | null>(null);
  const [classes, setClasses] = useState<Option[]>([]);
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const isPrivileged =
    currentMember?.role === "owner" || currentMember?.role === "admin";

  const fetchData = useCallback(async () => {
    if (!currentOrg || !teacherId || !isPrivileged) return;

    try {
      setIsLoading(true);
      const [teacherData, classData, subjectData] = await Promise.all([
        apiFetch<TeacherMember>(
          `/organizations/${currentOrg.slug}/members/${teacherId}`,
        ),
        apiFetch<Option[]>(`/classes/${currentOrg.slug}`),
        apiFetch<Option[]>(`/subjects/${currentOrg.slug}`),
      ]);

      const rawAssignments = teacherData.teachingAssignments || teacherData.memberAssignments || [];
      const normalizedAssignments: TeachingAssignment[] = rawAssignments.map((a: any) => ({
        classLevel: a.classLevel || (a.classLevelId ? { id: a.classLevelId } : null),
        subject: a.subject || (a.subjectId ? { id: a.subjectId } : null),
      }));

      setTeacher({
        ...teacherData,
        teachingAssignments: normalizedAssignments,
      });
      setClasses(classData);
      setSubjects(subjectData);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load teacher",
      );
    } finally {
      setIsLoading(false);
    }
  }, [currentOrg, isPrivileged, teacherId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const subjectGroups = useMemo(() => {
    const map = new Map<
      string,
      { subject: Option; classes: Option[] }
    >();

    (teacher?.teachingAssignments || []).forEach((assignment) => {
      if (!assignment.subject?.id || !assignment.classLevel?.id) {
        return;
      }

      const existing = map.get(assignment.subject.id);
      if (existing) {
        if (
          !existing.classes.some(
            (classOption) => classOption.id === assignment.classLevel?.id,
          )
        ) {
          existing.classes.push(assignment.classLevel);
        }
        return;
      }

      map.set(assignment.subject.id, {
        subject: assignment.subject,
        classes: [assignment.classLevel],
      });
    });

    return Array.from(map.values()).sort((left, right) =>
      left.subject.name.localeCompare(right.subject.name),
    );
  }, [teacher?.teachingAssignments]);

  const addAssignment = () => {
    if (!teacher || !selectedClassId || !selectedSubjectId) {
      return;
    }

    const classOption = classes.find((option) => option.id === selectedClassId);
    const subjectOption = subjects.find(
      (option) => option.id === selectedSubjectId,
    );

    if (!classOption || !subjectOption) {
      return;
    }

    const exists = (teacher.teachingAssignments || []).some(
      (assignment) =>
        assignment.classLevel?.id === classOption.id &&
        assignment.subject?.id === subjectOption.id,
    );

    if (exists) {
      toast.error("That subject and class assignment already exists");
      return;
    }

    setTeacher({
      ...teacher,
      teachingAssignments: [
        ...(teacher.teachingAssignments || []),
        { classLevel: classOption, subject: subjectOption },
      ],
    });
    setSelectedClassId("");
    setSelectedSubjectId("");
  };

  const removeAssignment = (classId: string, subjectId: string) => {
    if (!teacher) return;

    setTeacher({
      ...teacher,
      teachingAssignments: (teacher.teachingAssignments || []).filter(
        (assignment) =>
          !(
            assignment.classLevel?.id === classId &&
            assignment.subject?.id === subjectId
          ),
      ),
    });
  };

  const saveAssignments = async () => {
    if (!teacher || !currentOrg) return;

    setIsSaving(true);
    try {
      const updated = await apiFetch<TeacherMember>(
        `/organizations/${currentOrg.slug}/members/${teacher.id}/assignments`,
        {
          method: "PATCH",
          body: JSON.stringify({
            teachingAssignments: (teacher.teachingAssignments || []).map(
              (assignment) => ({
                classLevel: assignment.classLevel?.id,
                subject: assignment.subject?.id,
              }),
            ),
          }),
        },
      );
      const rawAssignments = updated.teachingAssignments || updated.memberAssignments || [];
      const normalizedAssignments: TeachingAssignment[] = rawAssignments.map((a: any) => ({
        classLevel: a.classLevel || (a.classLevelId ? { id: a.classLevelId } : null),
        subject: a.subject || (a.subjectId ? { id: a.subjectId } : null),
      }));

      setTeacher({
        ...updated,
        teachingAssignments: normalizedAssignments,
      });
      toast.success("Teacher assignments updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save assignments",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!isPrivileged) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-11 w-11 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Skeleton className="h-[420px] rounded-xl" />
          <Skeleton className="h-[420px] rounded-xl" />
        </div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
        Teacher not found.
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
              router.push(`/dashboard/school/${currentOrg?.slug}/teachers`)
            }
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border border-blue-200">
              <AvatarFallback className="bg-blue-50 font-semibold text-blue-700">
                {getInitials(teacher.user?.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 capitalize">
                {teacher.user?.name || "Teacher"}
              </h1>
              <p className="text-slate-500">{teacher.user?.email}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isPrivileged && teacher.id !== currentMember.id && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest hidden sm:inline">Role:</span>
              <Select 
                value={teacher.role} 
                onValueChange={async (newRole) => {
                  try {
                    await apiFetch(`/organizations/${currentOrg?.slug}/members/${teacher.id}/role`, {
                      method: "PATCH",
                      body: JSON.stringify({ role: newRole }),
                    });
                    setTeacher({ ...teacher, role: newRole as any });
                    toast.success(`Role updated to ${newRole}`);
                  } catch (error) {
                    toast.error("Failed to update role");
                  }
                }}
              >
                <SelectTrigger className="h-9 min-w-[120px] rounded-lg border-blue-100 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Staff/Teacher</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {!isPrivileged || teacher.id === currentMember.id ? (
            <Badge
              variant="outline"
              className="border-blue-200 bg-blue-50 text-blue-700 capitalize"
            >
              {teacher.role}
            </Badge>
          ) : null}
          <Button
            onClick={saveAssignments}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 h-9"
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Assignments
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Assigned Subjects
                </h2>
                <p className="text-sm text-slate-500">
                  Click a subject to view the teacher&apos;s spreadsheets for the
                  classes assigned to that subject.
                </p>
              </div>
              <Badge
                variant="outline"
                className="border-slate-200 bg-slate-50 text-slate-600"
              >
                {subjectGroups.length} subjects
              </Badge>
            </div>

            <div className="mt-4 space-y-3">
              {subjectGroups.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                  No subject assignments yet. Add at least one subject and class
                  combination for this teacher.
                </div>
              ) : (
                subjectGroups.map((group) => (
                  <button
                    key={group.subject.id}
                    type="button"
                    onClick={() =>
                      router.push(
                        `/dashboard/school/${currentOrg?.slug}/teachers/${teacher.id}/subjects/${group.subject.id}`,
                      )
                    }
                    className="group w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                            <BookOpen className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 group-hover:text-blue-700">
                              {group.subject.name}
                            </div>
                            <div className="text-xs text-slate-500">
                              {group.classes.length} assigned{" "}
                              {group.classes.length === 1 ? "class" : "classes"}
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {group.classes.map((classOption) => (
                            <span
                              key={classOption.id}
                              className="inline-flex items-center rounded-md bg-white px-2 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200"
                            >
                              {classOption.name}
                            </span>
                          ))}
                        </div>
                      </div>
                      <ArrowRight className="mt-1 h-4 w-4 text-slate-400 group-hover:text-blue-600" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Manage Assignments
            </h2>
            <p className="text-sm text-slate-500">
              A teacher must have at least one subject and class assignment.
            </p>
          </div>

          <div className="mt-4 space-y-3">
            <Select value={selectedSubjectId} onValueChange={(val: any) => setSelectedSubjectId(val)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedClassId} onValueChange={(val: any) => setSelectedClassId(val)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((classOption) => (
                  <SelectItem key={classOption.id} value={classOption.id}>
                    {classOption.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={addAssignment}
              disabled={!selectedClassId || !selectedSubjectId}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Assignment
            </Button>
          </div>

          <div className="mt-6 space-y-2">
            {(teacher.teachingAssignments || []).length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                No teaching assignments configured.
              </div>
            ) : (
              (teacher.teachingAssignments || []).map((assignment, index) => (
                <div
                  key={`${assignment.subject?.id || "subject"}-${assignment.classLevel?.id || "class"}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900">
                      {assignment.subject?.name || "Subject"}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <School className="h-3.5 w-3.5" />
                      {assignment.classLevel?.name || "Class"}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:bg-red-50 hover:text-red-700"
                    onClick={() =>
                      removeAssignment(
                        assignment.classLevel?.id || "",
                        assignment.subject?.id || "",
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
