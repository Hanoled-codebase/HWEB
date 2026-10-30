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
import { ResetPasswordButton } from "@/components/dashboard/ResetPasswordButton";
import { PersonalDataButton } from "@/components/dashboard/PersonalDataButton";
import { useMobilePageTitle } from "@/components/dashboard/mobile/MobileMenuProvider";
import { apiFetch } from "@/lib/api";
import { editTeachingAssignments, hcoreIds, teachingKey, toHcoreTeaching } from "@/lib/teaching-assignments";

type Option = {
  id: string;
  name: string;
  level?: string;
  code?: string;
  hcoreClassGroupId?: string | null;
  hcoreSubjectId?: string | null;
};

type RawAssignment = {
  id?: string;
  type?: string;
  classLevel?: Option | null;
  subject?: Option | null;
};

type TeachingAssignment = {
  id?: string;
  classLevel?: Option | null;
  subject?: Option | null;
};

type TeacherMember = {
  id: string;
  role: "member" | "admin" | "owner" | "parent";
  hcoreAffiliationId?: string | null;
  user?: {
    name?: string;
    email?: string;
  } | null;
  teachingAssignments?: TeachingAssignment[];
  memberAssignments?: Array<{ id?: string; type?: string; classLevel?: Option | null; subject?: Option | null }>;
};

// This page manages subject-teacher pairs; the teacher's other duties (class
// teacher, HOD, …) are left as they are when it saves.
function subjectTeaching(member: TeacherMember): TeachingAssignment[] {
  const list: RawAssignment[] = (member.memberAssignments?.length
    ? member.memberAssignments
    : member.teachingAssignments) || [];
  return list.flatMap((a) =>
    (!a.type || a.type === "SUBJECT_TEACHER") && a.classLevel && a.subject
      ? [{ id: a.id, classLevel: a.classLevel, subject: a.subject }]
      : [],
  );
}

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
  useMobilePageTitle(teacher?.user?.name);
  // The pairs as last loaded, so saving can tell what this page removed.
  const [loadedAssignments, setLoadedAssignments] = useState<TeachingAssignment[]>([]);
  const [classes, setClasses] = useState<Option[]>([]);
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const isPrivileged =
    currentMember?.role === "owner" || currentMember?.role === "admin";

  const showTeacher = useCallback((data: TeacherMember) => {
    const teaching = subjectTeaching(data);
    setTeacher({ ...data, teachingAssignments: teaching });
    setLoadedAssignments(teaching);
  }, []);

  const fetchData = useCallback(async () => {
    if (!currentOrg || !teacherId || !isPrivileged) return;

    try {
      setIsLoading(true);
      const [teacherData, classData, subjectData, allAssignments] = await Promise.all([
        apiFetch<TeacherMember>(
          `/organizations/${currentOrg.slug}/members/${teacherId}`,
        ),
        apiFetch<Option[]>(`/classes/${currentOrg.slug}`),
        apiFetch<Option[]>(`/subjects/${currentOrg.slug}`),
        apiFetch<Array<{
          id: string;
          memberId?: string;
          member?: { id: string };
          classLevel?: Option | null;
          subject?: Option | null;
        }>>(`/subjects/${currentOrg.slug}/assignments`).catch(() => []),
      ]);

      const teacherAssignmentsFromSubjects: TeachingAssignment[] = (allAssignments || [])
        .filter(
          (a) =>
            (a.memberId === teacherId || a.member?.id === teacherId) &&
            a.classLevel &&
            a.subject,
        )
        .map((a) => ({
          id: a.id,
          classLevel: a.classLevel,
          subject: a.subject,
        }));

      const assignmentMap = new Map<string, TeachingAssignment>();
      teacherAssignmentsFromSubjects.forEach((a) => {
        if (a.subject?.id && a.classLevel?.id) {
          assignmentMap.set(`${a.subject.id}-${a.classLevel.id}`, a);
        }
      });

      const memberTeaching = subjectTeaching(teacherData);
      memberTeaching.forEach((a) => {
        if (a.subject?.id && a.classLevel?.id) {
          const key = `${a.subject.id}-${a.classLevel.id}`;
          if (!assignmentMap.has(key)) {
            assignmentMap.set(key, a);
          }
        }
      });

      const finalTeaching = Array.from(assignmentMap.values());
      setTeacher({ ...teacherData, teachingAssignments: finalTeaching });
      setLoadedAssignments(finalTeaching);
      setClasses(classData || []);
      setSubjects(subjectData || []);
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

  // Only classes and subjects linked to HCORE can go into a teaching assignment.
  const ids = useMemo(() => hcoreIds(classes, subjects), [classes, subjects]);

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
      const currentList = teacher.teachingAssignments || [];
      const currentKeys = new Set(
        currentList.map((a) => `${a.subject?.id}-${a.classLevel?.id}`),
      );
      const removed = loadedAssignments.filter(
        (a) => !currentKeys.has(`${a.subject?.id}-${a.classLevel?.id}`),
      );
      const loadedKeys = new Set(
        loadedAssignments.map((a) => `${a.subject?.id}-${a.classLevel?.id}`),
      );
      const added = currentList.filter(
        (a) => !loadedKeys.has(`${a.subject?.id}-${a.classLevel?.id}`),
      );

      // 1. Delete removed assignments from HSMS
      for (const rem of removed) {
        if (rem.id) {
          await apiFetch(`/subjects/${currentOrg.slug}/assignments/${rem.id}`, {
            method: "DELETE",
          }).catch(() => {});
        } else if (rem.subject?.id && rem.classLevel?.id) {
          const activeAssignments = await apiFetch<
            Array<{
              id: string;
              memberId?: string;
              member?: { id: string };
              subjectId?: string;
              subject?: { id: string };
              classLevelId?: string;
              classLevel?: { id: string };
            }>
          >(
            `/subjects/${currentOrg.slug}/assignments`,
          ).catch(() => []);
          const match = activeAssignments.find(
            (a) =>
              (a.memberId === teacher.id || a.member?.id === teacher.id) &&
              (a.subjectId === rem.subject?.id || a.subject?.id === rem.subject?.id) &&
              (a.classLevelId === rem.classLevel?.id || a.classLevel?.id === rem.classLevel?.id),
          );
          if (match?.id) {
            await apiFetch(
              `/subjects/${currentOrg.slug}/assignments/${match.id}`,
              { method: "DELETE" },
            ).catch(() => {});
          }
        }
      }

      // 2. Add newly assigned subject-class pairs to HSMS
      for (const add of added) {
        if (add.subject?.id && add.classLevel?.id) {
          await apiFetch(`/subjects/${currentOrg.slug}/assignments`, {
            method: "POST",
            body: JSON.stringify({
              memberId: teacher.id,
              subjectId: add.subject.id,
              classLevelId: add.classLevel.id,
            }),
          }).catch(() => {});
        }
      }

      // 3. Best-effort sync to HCORE if teacher is linked
      if (teacher.hcoreAffiliationId) {
        try {
          const asHcore = (list: TeachingAssignment[]) =>
            new Map(
              list.flatMap((a) => {
                const item = toHcoreTeaching({ type: "SUBJECT_TEACHER", ...a }, ids);
                return item ? [[teachingKey(item), item] as const] : [];
              }),
            );
          const kept = asHcore(currentList);
          const dropped = [...asHcore(loadedAssignments).keys()].filter((key) => !kept.has(key));

          await editTeachingAssignments(currentOrg, teacher.hcoreAffiliationId, (current) => {
            for (const [key, item] of kept) current.set(key, item);
            for (const key of dropped) current.delete(key);
          });
        } catch {
          // Best effort sync to HCORE directory
        }
      }

      await fetchData();
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
    <div className="space-y-6 pb-24 md:pb-0">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          {/* Phones already have a back target in the top bar */}
          <Button
            variant="outline"
            size="icon"
            aria-label="Back to teachers"
            className="hidden shrink-0 rounded-lg md:inline-flex"
            onClick={() =>
              router.push(`/dashboard/school/${currentOrg?.slug}/teachers`)
            }
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="h-12 w-12 shrink-0 border border-blue-200">
              <AvatarFallback className="bg-blue-50 font-semibold text-blue-700">
                {getInitials(teacher.user?.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="hidden truncate text-2xl font-bold capitalize tracking-tight text-slate-900 md:block">
                {teacher.user?.name || "Teacher"}
              </h1>
              {teacher.user?.email && (
                <a href={`mailto:${teacher.user.email}`} className="block break-all text-sm text-slate-600 hover:text-blue-700 md:text-base md:text-slate-500">
                  {teacher.user.email}
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isPrivileged && teacher.id !== currentMember.id && (
            <div className="flex w-full items-center gap-2 md:w-auto">
              <span className="text-sm font-medium text-slate-600 md:text-xs md:font-bold md:uppercase md:tracking-widest md:text-slate-400">Role</span>
              <Select 
                value={teacher.role} 
                onValueChange={async (newRole) => {
                  try {
                    await apiFetch(`/organizations/${currentOrg?.slug}/members/${teacher.id}/role`, {
                      method: "PATCH",
                      body: JSON.stringify({ role: newRole }),
                    });
                    setTeacher({ ...teacher, role: newRole as TeacherMember["role"] });
                    toast.success(`Role updated to ${newRole}`);
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Failed to update role");
                  }
                }}
              >
                <SelectTrigger aria-label="Role" className="h-11 flex-1 rounded-lg border-blue-100 bg-white md:h-9 md:min-w-[120px] md:flex-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Staff/Teacher</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {isPrivileged && teacher.id !== currentMember.id && currentOrg && teacher.hcoreAffiliationId && (
            <ResetPasswordButton
              orgId={currentOrg.id}
              target={{ affiliationId: teacher.hcoreAffiliationId }}
              personName={teacher.user?.name || "this teacher"}
              signInHint="their email address"
              className="h-11 w-full rounded-lg border border-slate-200 bg-white text-[#0B1220] hover:bg-slate-50 md:h-9 md:w-auto"
            />
          )}
          {isPrivileged && teacher.id !== currentMember.id && currentOrg && teacher.hcoreAffiliationId && (
            <PersonalDataButton
              orgId={currentOrg.id}
              orgSlug={currentOrg.slug}
              personName={teacher.user?.name || "this teacher"}
              target={{ affiliationId: teacher.hcoreAffiliationId }}
              hsms={{ memberId: teacher.id }}
              hcbt={{ affiliationId: teacher.hcoreAffiliationId }}
              canErase={currentMember.role === "owner" || currentMember.role === "admin"}
              onErased={() => router.push(`/dashboard/school/${currentOrg.slug}/teachers`)}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white text-[#0B1220] hover:bg-slate-50 md:h-9 md:w-auto"
            />
          )}
          {!isPrivileged || teacher.id === currentMember.id ? (
            <Badge
              variant="outline"
              className="border-blue-200 bg-blue-50 text-blue-700 capitalize"
            >
              {teacher.role === "member" ? "Teacher" : teacher.role}
            </Badge>
          ) : null}
          {/* Desktop: inline. Phones: the bar pinned above the tab bar, where the thumb is. */}
          <div className="fixed inset-x-0 bottom-above-nav z-30 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-md md:static md:border-0 md:bg-transparent md:p-0">
            <Button
              onClick={saveAssignments}
              disabled={isSaving}
              className="h-12 w-full bg-blue-600 hover:bg-blue-700 md:h-9 md:w-auto"
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save assignments
            </Button>
          </div>
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
                  Open a subject to see this teacher&apos;s spreadsheets for the
                  classes assigned to that subject.
                </p>
              </div>
              <Badge
                variant="outline"
                className="border-slate-200 bg-slate-50 text-slate-600"
              >
                {subjectGroups.length} {subjectGroups.length === 1 ? "subject" : "subjects"}
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
                              className="inline-flex items-center rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200"
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
            <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
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

            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
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
