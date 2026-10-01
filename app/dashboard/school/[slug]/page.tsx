"use client";

import { useEffect, useMemo, useState } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart3,
  ChevronRight,
  GraduationCap,
  School,
  Users,
} from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { ParentHome } from "@/components/dashboard/mobile/ParentHome";
import { StudentDashboardView } from "@/components/dashboard/StudentDashboardView";
import { AdminMobileDashboard } from "@/components/dashboard/AdminMobileDashboard";
import { TeachingHome } from "@/components/dashboard/teaching/TeachingHome";
import { AdminDesktopOverview } from "@/components/dashboard/AdminDesktopOverview";
import { FinanceHome } from "@/components/dashboard/finance/FinanceHome";
import { DepartmentHome } from "@/components/dashboard/department/DepartmentHome";
import { LibraryHome } from "@/components/dashboard/library/LibraryHome";
import { WorkspaceSwitch } from "@/components/dashboard/WorkspaceSwitch";
import { useWorkspace } from "@/hooks/useWorkspace";
import { greetingName } from "@/lib/greeting-name";

// Only built from assignments whose subject/class id is present (see the
// `!subject?.id || !classLevel?.id` guards below), so id is always set.
type AssignmentOption = {
  id: string;
  name?: string;
  level?: string;
  code?: string;
};

type SpreadsheetSummary = {
  id: string;
  status: "pending" | "active" | "inactive";
  subjectId?: string;
  classLevelId?: string;
  classLevel?: { id?: string; name?: string | null } | null;
  subject?: { id?: string; name?: string | null } | null;
};

function buildAssignmentKey(subjectId: string, classId: string) {
  return `${subjectId}:${classId}`;
}

type ParentResultGroup = {
  student: { id: string; firstName: string; lastName: string };
  results: Array<{
    id: string;
    title: string;
    subject: { name: string };
    values: number[];
    updatedAt: string;
  }>;
};

export default function DashboardOverviewPage() {
  const { currentOrg, currentMember, isStudent } = useOrganization();
  const { user } = useAuth();
  const [memberSheets, setMemberSheets] = useState<SpreadsheetSummary[]>([]);
  const [isMemberSheetsLoading, setIsMemberSheetsLoading] = useState(false);
  const [liveCounts, setLiveCounts] = useState<{ students: number; teachers: number; parents: number } | null>(null);
  const [parentResults, setParentResults] = useState<ParentResultGroup[]>([]);

  useEffect(() => {
    if (!currentOrg?.slug) return;
    apiFetch<{ students: number; teachers: number; parents: number }>(
      `/organizations/${currentOrg.slug}/live-counts`,
      { showErrorToast: false }
    )
      .then(setLiveCounts)
      .catch(() => {});
  }, [currentOrg?.slug]);

  const role = currentMember?.role;
  const { isPrivileged: permPrivileged, isHOD, isTeacher, can } = usePermissions();
  const isPrivileged = permPrivileged || role === "owner" || role === "admin";
  // Staff with more than one hat (a teacher who also keeps the bursary) get
  // one home per workspace and a switch between them.
  const { available: workspaces, active: workspace, setActive: setWorkspace } = useWorkspace();

  const teachingAssignments = useMemo(
    () =>
      Array.isArray(currentMember?.teachingAssignments)
        ? currentMember.teachingAssignments.filter(
            (assignment) =>
              assignment?.subject?.id && assignment?.classLevel?.id,
          )
        : [],
    [currentMember?.teachingAssignments],
  );

  const subjectGroups = useMemo(() => {
    const map = new Map<
      string,
      { subject: AssignmentOption; classes: AssignmentOption[] }
    >();

    teachingAssignments.forEach((assignment) => {
      const subject = assignment.subject as AssignmentOption | null;
      const classLevel = assignment.classLevel as AssignmentOption | null;

      if (!subject?.id || !classLevel?.id) {
        return;
      }

      const existing = map.get(subject.id);
      if (!existing) {
        map.set(subject.id, {
          subject,
          classes: [classLevel],
        });
        return;
      }

      if (
        !existing.classes.some(
          (classOption) => classOption.id === classLevel.id,
        )
      ) {
        existing.classes.push(classLevel);
      }
    });

    return Array.from(map.values())
      .map((group) => ({
        ...group,
        classes: [...group.classes].sort((left, right) =>
          (left.name || "").localeCompare(right.name || ""),
        ),
      }))
      .sort((left, right) =>
        (left.subject.name || "").localeCompare(right.subject.name || ""),
      );
  }, [teachingAssignments]);

  const sheetsByAssignment = useMemo(() => {
    const map = new Map<string, SpreadsheetSummary>();

    memberSheets.forEach((sheet) => {
      // The list returns the ids as plain fields; the nested objects only carry names.
      const subjectId = sheet.subjectId || sheet.subject?.id || "";
      const classId = sheet.classLevelId || sheet.classLevel?.id || "";

      if (!subjectId || !classId) {
        return;
      }

      map.set(buildAssignmentKey(subjectId, classId), sheet);
    });

    return map;
  }, [memberSheets]);

  useEffect(() => {
    async function fetchMemberSheets() {
      if (!currentOrg || role !== "member") {
        setMemberSheets([]);
        setIsMemberSheetsLoading(false);
        return;
      }

      try {
        setIsMemberSheetsLoading(true);
        const sheets = await apiFetch<SpreadsheetSummary[]>(
          `/spreadsheets/${currentOrg.slug}`,
          { showErrorToast: false }
        );
        setMemberSheets(sheets);
      } catch (error) {
        // Silently fail if endpoint is missing during migration
        console.warn("Failed to load assigned spreadsheets:", error);
      } finally {
        setIsMemberSheetsLoading(false);
      }
    }

    fetchMemberSheets();
  }, [currentOrg, role]);

  useEffect(() => {
    if (!currentOrg || role !== "parent") { setParentResults([]); return; }
    apiFetch<ParentResultGroup[]>(`/spreadsheets/${currentOrg.slug}/results`, { showErrorToast: false })
      .then(setParentResults)
      .catch(() => {});
  }, [currentOrg, role]);

  if (!currentOrg || !user) return null;

  if (isStudent) {
    return <StudentDashboardView orgSlug={currentOrg.slug} />;
  }

  if (!currentMember) return null;

  if (role === "parent") {
    const assignedStudents = currentMember.assignedStudents || [];
    const firstName = greetingName(user.name) || user.name;

    return (
      <div className="space-y-6">
        <div className="md:hidden">
          <ParentHome slug={currentOrg.slug} students={assignedStudents} results={parentResults} />
        </div>

        {/* Desktop */}
        <div className="hidden md:block">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome back, <span className="capitalize">{firstName}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1 leading-relaxed">
            {assignedStudents.length > 0
              ? `You have ${assignedStudents.length} linked ${assignedStudents.length === 1 ? "child" : "children"}`
              : "Manage your children and their academic records"}
          </p>
        </div>

        <div className="hidden gap-6 md:grid md:grid-cols-2">
          {/* Linked Children — enriched card */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 pt-5 px-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-700">
                  Linked Children
                </CardTitle>
                <span className="text-xs font-medium text-slate-500">
                  {assignedStudents.length} linked
                </span>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              {assignedStudents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
                  <GraduationCap className="h-8 w-8 mx-auto text-slate-300 mb-3" />
                  <p className="text-sm font-medium text-slate-500">No children linked yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {assignedStudents.map((student) => {
                    const childResults = parentResults.find(
                      (g) => g.student.id === student.id,
                    );
                    const latestResults = childResults?.results
                      .filter((r) => r.values.length > 0)
                      .slice(0, 3);

                    return (
                      <Link
                        key={student.id || `${student.firstName}-${student.lastName}`}
                        href={`/dashboard/school/${currentOrg.slug}/results`}
                        className="block rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3.5 transition-colors hover:border-slate-200 hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                            {`${student.firstName?.[0] || ""}${student.lastName?.[0] || ""}` || "ST"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-900 truncate capitalize">
                              {student.firstName} {student.lastName}
                            </p>
                            {latestResults && latestResults.length > 0 ? (
                              <div className="mt-1 flex flex-wrap gap-1.5">
                                {latestResults.map((r) => (
                                  <span
                                    key={r.id}
                                    className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-xs font-medium text-slate-600 shadow-sm"
                                  >
                                    {r.subject.name}: {r.values[0] || "—"}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-500 mt-0.5">
                                View results
                              </p>
                            )}
                          </div>
                          <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
              <p className="mt-4 text-xs text-slate-500">
                Last updated{" "}
                <span className="font-semibold text-slate-500">
                  {new Date().toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </p>
            </CardContent>
          </Card>

          {/* Quick Links — no subtitle */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-2 pt-5 px-6">
              <CardTitle className="text-sm font-semibold text-slate-700">
                Quick Links
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6 grid gap-3">
              <Link
                href={`/dashboard/school/${currentOrg.slug}/students`}
                className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3.5 transition-colors hover:border-slate-200 hover:bg-slate-50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <span className="flex-1 text-sm font-semibold text-slate-900">My Children</span>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </Link>
              <Link
                href={`/dashboard/school/${currentOrg.slug}/results`}
                className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3.5 transition-colors hover:border-slate-200 hover:bg-slate-50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <span className="flex-1 text-sm font-semibold text-slate-900">View Results</span>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const switcher =
    workspace && workspaces.length > 1 ? (
      <WorkspaceSwitch items={workspaces} active={workspace} onChange={setWorkspace} />
    ) : null;
  const withSwitch = (home: React.ReactNode) =>
    switcher ? (
      <div className="space-y-5">
        {/* Phones switch here; desktop has the switch in the sidebar. */}
        <div className="md:hidden">{switcher}</div>
        {home}
      </div>
    ) : (
      home
    );

  if (role === "member" && workspace === "finance") {
    return <FinanceHome switcher={switcher} />;
  }

  if (role === "member" && workspace === "department") {
    return <DepartmentHome switcher={switcher} />;
  }

  if (role === "member" && workspace === "library") {
    return <LibraryHome switcher={switcher} />;
  }

  if (role === "member" && isTeacher) {
    return withSwitch(
      <TeachingHome
        slug={currentOrg.slug}
        firstName={greetingName(user.name)}
        subjectGroups={subjectGroups}
        sheetsByAssignment={sheetsByAssignment}
        isSheetsLoading={isMemberSheetsLoading}
      />,
    );
  }

  // This is the fallback view for admin/owner AND any "member" who isn't a
  // recognized teacher/accountant/HOD/librarian in this org's own records —
  // so these tiles must respect that viewer's real permissions, not assume
  // admin. Reuses the exact same page-level gates as the sidebar/nav.

  const mobileStatsAll = [
    { key: "students", label: "Students", value: liveCounts?.students ?? currentOrg.counts.students ?? 0, icon: GraduationCap },
    { key: "teachers", label: "Teachers", value: liveCounts?.teachers ?? currentOrg.counts.teachers ?? 0, icon: Users },
    { key: "parents", label: "Parents", value: liveCounts?.parents ?? currentOrg.counts.parents ?? 0, icon: Users },
    { key: "classes", label: "Classes", value: "Manage", icon: School, dark: true, href: `/dashboard/school/${currentOrg.slug}/classes` },
  ];
  const mobileStatsShow: Record<string, boolean> = {
    students: Boolean(isPrivileged || can("students.view")),
    teachers: Boolean(isPrivileged),
    parents: Boolean(isPrivileged || isHOD || can("parents.manage")),
    classes: Boolean(isPrivileged || isTeacher),
  };
  const mobileStats = mobileStatsAll.filter((s) => mobileStatsShow[s.key]);

  return (
    <>
      {/* ── Mobile admin view ─────────────────── */}
      <div className="md:hidden">
        <AdminMobileDashboard
          slug={currentOrg.slug}
          stats={mobileStats}
          org={{
            name: currentOrg.name,
            category: currentOrg.category,
            type: currentOrg.type,
            subscription: currentOrg.subscription,
          }}
        />
      </div>

      {/* ── Desktop admin view ────────────────── */}
      <div className="hidden md:block">
        <AdminDesktopOverview
          slug={currentOrg.slug}
          firstName={greetingName(user.name)}
          orgName={currentOrg.name}
          category={currentOrg.category}
          type={currentOrg.type}
          plan={currentOrg.subscription?.plan}
          status={currentOrg.subscription?.status}
          isPrivileged={Boolean(isPrivileged)}
          canAddStudent={Boolean(isPrivileged)}
          counts={{
            students: liveCounts?.students ?? currentOrg.counts.students ?? 0,
            teachers: liveCounts?.teachers ?? currentOrg.counts.teachers ?? 0,
            parents: liveCounts?.parents ?? currentOrg.counts.parents ?? 0,
          }}
          showStudents={mobileStatsShow.students}
          showTeachers={mobileStatsShow.teachers}
          showParents={mobileStatsShow.parents}
          showClasses={mobileStatsShow.classes}
        />
      </div>
    </>
  );
}
