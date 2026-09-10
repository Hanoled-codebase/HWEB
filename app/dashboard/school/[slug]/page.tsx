"use client";

import { useEffect, useMemo, useState } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  ChevronRight,
  GraduationCap,
  Layers,
  School,
  UserPlus,
  Users,
  Receipt,
  Bell,
  Menu,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NotificationSheet } from "@/components/dashboard/NotificationSheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSidebar } from "@/components/ui/sidebar";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { ParentMobileNav } from "@/components/dashboard/ParentMobileNav";
import { StudentDashboardView } from "@/components/dashboard/StudentDashboardView";
import { AdminMobileDashboard } from "@/components/dashboard/AdminMobileDashboard";
import { MemberMobileDashboard } from "@/components/dashboard/MemberMobileDashboard";

function MobileSidebarMenuButton() {
  const { setOpenMobile } = useSidebar();
  return (
    <button
      onClick={() => setOpenMobile(true)}
      className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100/80 text-slate-700 hover:bg-slate-200/80 transition-colors"
      aria-label="Open menu"
    >
      <Menu className="h-4.5 w-4.5" />
    </button>
  );
}

type AssignmentOption = {
  id?: string;
  name?: string;
  level?: string;
  code?: string;
};

type SpreadsheetSummary = {
  id: string;
  status: "pending" | "active" | "inactive";
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
  const { currentOrg, currentMember, currentStudent, isStudent } = useOrganization();
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
  const { isPrivileged: permPrivileged, isAccountant, isHOD, isLibrarian, isTeacher, can } = usePermissions();
  const isPrivileged = permPrivileged || role === "owner" || role === "admin";

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

  const assignedClasses = useMemo(() => {
    const map = new Map<string, AssignmentOption>();

    teachingAssignments.forEach((assignment) => {
      const classLevel = assignment.classLevel as AssignmentOption | null;
      if (!classLevel?.id || map.has(classLevel.id)) {
        return;
      }

      map.set(classLevel.id, classLevel);
    });

    return Array.from(map.values()).sort((left, right) =>
      (left.name || "").localeCompare(right.name || ""),
    );
  }, [teachingAssignments]);

  const sheetsByAssignment = useMemo(() => {
    const map = new Map<string, SpreadsheetSummary>();

    memberSheets.forEach((sheet) => {
      const subjectId = sheet.subject?.id || "";
      const classId = sheet.classLevel?.id || "";

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
    const firstName = user.name.split(" ")[0] || user.name;
    const initial = firstName[0]?.toUpperCase() || "P";

    return (
      <div className="space-y-6 pb-28 md:pb-0 px-4 sm:px-6 md:px-0 pt-2 md:pt-0">
        {/* Mobile View matching screenshots */}
        <div className="md:hidden space-y-6">
          {/* Top Brand Header */}
          <div className="flex items-center justify-between pt-1 pb-1">
            <MobileSidebarMenuButton />

            <span className="text-sm font-bold tracking-[0.14em] text-slate-900 uppercase">
              HANOLED
            </span>

            <div className="flex items-center gap-2">
              <NotificationSheet />
              <Avatar className="h-9 w-9 rounded-full bg-slate-100 text-slate-700 font-bold text-xs">
                <AvatarFallback className="bg-slate-100 text-slate-700 font-bold text-xs">
                  {initial}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* Welcome Header */}
          <div>
            <span className="text-[11px] font-extrabold tracking-wider text-slate-400 uppercase block mb-1">
              PARENT PORTAL
            </span>
            <div className="flex items-start justify-between">
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 capitalize">
                Welcome back,<br />
                {firstName}
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600 border border-emerald-100/80">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Active
              </span>
            </div>
          </div>

          {/* Linked Students Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900">Linked students</h2>
              <span className="text-xs text-slate-400 font-medium">
                {assignedStudents.length} linked
              </span>
            </div>

            {assignedStudents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center shadow-sm">
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

                  const studentInitials = `${student.firstName?.[0] || ""}${student.lastName?.[0] || ""}` || "ST";

                  return (
                    <Link
                      key={student.id || `${student.firstName}-${student.lastName}`}
                      href={`/dashboard/school/${currentOrg.slug}/results`}
                      className="block rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:border-slate-200"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-bold text-sm">
                            {studentInitials}
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-slate-900 capitalize">
                              {student.firstName} {student.lastName}
                            </h3>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                      </div>

                      {latestResults && latestResults.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 pl-14">
                          {latestResults.map((r) => (
                            <span
                              key={r.id}
                              className="inline-flex items-center rounded-xl bg-slate-50 border border-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                            >
                              {r.subject.name}: {r.values[0] || "—"}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="pl-14">
                          <span className="inline-flex items-center rounded-xl bg-slate-50 border border-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                            Tap to view results
                          </span>
                        </div>
                      )}

                      <div className="mt-3.5 pt-3 border-t border-slate-50 flex items-center justify-between text-xs text-slate-400">
                        <span>
                          Last updated{" "}
                          <span className="font-semibold text-slate-600">
                            {new Date().toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Links Section */}
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-3">Quick links</h2>

            <div className="space-y-3">
              <Link
                href={`/dashboard/school/${currentOrg.slug}/students`}
                className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:bg-slate-50/80"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100/80 text-slate-600">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">My Children</p>
                    <p className="text-xs text-slate-400 mt-0.5">View linked student profiles</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </Link>

              <Link
                href={`/dashboard/school/${currentOrg.slug}/results`}
                className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:bg-slate-50/80"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100/80 text-slate-600">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">View Results</p>
                    <p className="text-xs text-slate-400 mt-0.5">Check the latest assessment scores</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </Link>

              <Link
                href={`/dashboard/school/${currentOrg.slug}/invoices`}
                className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:bg-slate-50/80"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100/80 text-slate-600">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Invoices</p>
                    <p className="text-xs text-slate-400 mt-0.5">View and pay outstanding fees</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </Link>

              <Link
                href={`/dashboard/school/${currentOrg.slug}/support`}
                className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:bg-slate-50/80"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100/80 text-slate-600">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Support</p>
                    <p className="text-xs text-slate-400 mt-0.5">Get help or contact the school</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </Link>
            </div>
          </div>

          <ParentMobileNav slug={currentOrg.slug} active="overview" />
        </div>

        {/* Desktop */}
        <div className="hidden md:block">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 capitalize">
            Welcome back, {firstName}
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
                <span className="text-xs font-medium text-slate-400">
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
                                    className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 shadow-sm"
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
              <p className="mt-4 text-xs text-slate-400">
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

  if (isAccountant) {
    return (
      <div className="space-y-6 pb-28 md:pb-0 px-4 sm:px-6 md:px-0 pt-2 md:pt-0">
        {/* This role has no dedicated mobile dashboard component (unlike
            admin/member/parent), so the hamburger + bell that open the
            shared, permission-filtered sidebar must be provided here —
            otherwise there is no way to navigate off this screen on mobile. */}
        <div className="flex items-center justify-between pt-1 pb-1 md:hidden">
          <MobileSidebarMenuButton />
          <span className="text-sm font-bold tracking-[0.14em] text-slate-900 uppercase">
            HANOLED
          </span>
          <NotificationSheet />
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-600">Finance Dashboard — HCORE Accountant</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950 capitalize">Welcome back, {user.name.split(" ")[0]}</h1>
          <p className="mt-2 text-sm text-slate-600">Your HCORE ACCOUNTANT assignment is synced locally — manage fee structure, payments, debt and payroll independently, with HCORE as source when reachable.</p>
          <div className="mt-4 flex gap-2">
            <Button asChild className="bg-emerald-600 hover:bg-emerald-700"><Link href={`/dashboard/school/${currentOrg.slug}/payments`}>Payments</Link></Button>
            <Button asChild variant="outline"><Link href={`/dashboard/school/${currentOrg.slug}/billing`}>Billing</Link></Button>
            <Button asChild variant="outline"><Link href={`/dashboard/school/${currentOrg.slug}/payroll`}>Payroll</Link></Button>
          </div>
        </div>
      </div>
    );
  }

  if (isHOD) {
    return (
      <div className="space-y-6 pb-28 md:pb-0 px-4 sm:px-6 md:px-0 pt-2 md:pt-0">
        <div className="flex items-center justify-between pt-1 pb-1 md:hidden">
          <MobileSidebarMenuButton />
          <span className="text-sm font-bold tracking-[0.14em] text-slate-900 uppercase">
            HANOLED
          </span>
          <NotificationSheet />
        </div>
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-600">HOD Dashboard — HCORE HOD</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950 capitalize">Welcome back, {user.name.split(" ")[0]}</h1>
          <p className="mt-2 text-sm text-slate-600">Department overview from HCORE teaching assignments — scoped locally for independent operation.</p>
          <div className="mt-4 flex gap-2">
            <Button asChild><Link href={`/dashboard/school/${currentOrg.slug}/teachers`}>Department Teachers</Link></Button>
            <Button asChild variant="outline"><Link href={`/dashboard/school/${currentOrg.slug}/students`}>Department Students</Link></Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLibrarian) {
    return (
      <div className="space-y-6 pb-28 md:pb-0 px-4 sm:px-6 md:px-0 pt-2 md:pt-0">
        <div className="flex items-center justify-between pt-1 pb-1 md:hidden">
          <MobileSidebarMenuButton />
          <span className="text-sm font-bold tracking-[0.14em] text-slate-900 uppercase">
            HANOLED
          </span>
          <NotificationSheet />
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-600">Library Dashboard — HCORE Librarian</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950 capitalize">Welcome back, {user.name.split(" ")[0]}</h1>
          <p className="mt-2 text-sm text-slate-600">Library management from HCORE assignment — works offline from local projection.</p>
          <Button asChild className="mt-4"><Link href={`/dashboard/school/${currentOrg.slug}/library`}>Library</Link></Button>
        </div>
      </div>
    );
  }

  if (role === "member" && isTeacher) {
    const readySheetsCount = memberSheets.length;

    return (
      <>
        {/* Mobile Member Dashboard */}
        <div className="md:hidden">
          <MemberMobileDashboard
            slug={currentOrg.slug}
            userName={user.name.split(" ")[0]}
            subjectGroups={subjectGroups as any}
            assignedClasses={assignedClasses as any}
            readySheetsCount={readySheetsCount}
            sheetsByAssignment={sheetsByAssignment}
            isMemberSheetsLoading={isMemberSheetsLoading}
            orgName={currentOrg.name}
          />
        </div>

        {/* Desktop Member Dashboard */}
        <div className="hidden md:block space-y-6">
        <div className="rounded-xl border border-blue-100 bg-[radial-gradient(circle_at_top,#eef4ff_0%,#f8fbff_48%,#eef2ff_100%)] p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-400">
                Teaching Dashboard
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl capitalize">
                Welcome back, {user.name.split(" ")[0]}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Your workspace is now tied to the subjects and classes assigned
                to you. Open a class sheet directly from the relevant subject
                card below.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button asChild className="bg-blue-600 hover:bg-blue-700">
                <Link
                  href={`/dashboard/school/${currentOrg.slug}/spreadsheets`}
                >
                  <Layers className="mr-2 h-4 w-4" />
                  View All Sheets
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-white/80 bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-400">
                Subjects
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-950">
                {subjectGroups.length}
              </p>
            </div>
            <div className="rounded-lg border border-white/80 bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-400">
                Classes
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-950">
                {assignedClasses.length}
              </p>
            </div>
            <div className="rounded-lg border border-white/80 bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-400">
                Available Sheets
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-950">
                {readySheetsCount}
              </p>
            </div>
          </div>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Assigned Classes</CardTitle>
            <CardDescription>
              Every spreadsheet you can access is tied to one of these class and
              subject combinations.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {assignedClasses.length === 0 ? (
              <p className="text-sm text-slate-500">
                No class assignments yet. Ask an admin to assign your teaching
                load.
              </p>
            ) : (
              assignedClasses.map((classOption) => (
                <Badge
                  key={classOption.id}
                  variant="outline"
                  className="border-blue-200 bg-blue-50 text-blue-700"
                >
                  {classOption.name || "Class"}
                </Badge>
              ))
            )}
          </CardContent>
        </Card>

        {subjectGroups.length === 0 ? (
          <Card className="w-full border-dashed border-slate-300 shadow-sm">
            <CardContent className="py-12 px-6 text-center w-full">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-4">
                <BookOpen className="h-7 w-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                No subjects assigned yet.
              </h3>
              <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                An admin needs to assign at least one subject and class to your
                profile before you can manage spreadsheets.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {subjectGroups.map((group) => (
              <Card
                key={group.subject.id}
                className="border-slate-200 shadow-sm"
              >
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-slate-900">
                      <BookOpen className="h-5 w-5 text-blue-600" />
                      {group.subject.name || "Subject"}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {group.classes.length}{" "}
                      {group.classes.length === 1 ? "class" : "classes"}{" "}
                      assigned
                    </CardDescription>
                  </div>
                  <Button asChild variant="outline">
                    <Link
                      href={`/dashboard/school/${currentOrg.slug}/spreadsheets?subjectId=${group.subject.id}`}
                    >
                      Open
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isMemberSheetsLoading
                    ? Array.from({ length: group.classes.length || 1 }).map(
                        (_, index) => (
                          <Skeleton key={index} className="h-20 rounded-lg" />
                        ),
                      )
                    : group.classes.map((classOption) => {
                        const spreadsheet = sheetsByAssignment.get(
                          buildAssignmentKey(
                            group.subject.id || "",
                            classOption.id || "",
                          ),
                        );

                        return (
                          <div
                            key={classOption.id}
                            className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="space-y-1">
                              <p className="font-medium text-slate-900">
                                {classOption.name || "Class"}
                              </p>
                              <p className="text-sm text-slate-500">
                                {spreadsheet
                                  ? "Spreadsheet ready for score entry"
                                  : "No spreadsheet created yet for this class."}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              {spreadsheet ? (
                                <Badge
                                  variant="outline"
                                  className={getStatusClassName(
                                    spreadsheet.status,
                                  )}
                                >
                                  {spreadsheet.status}
                                </Badge>
                              ) : null}
                              <Button
                                asChild
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                <Link
                                  href={
                                    spreadsheet
                                      ? `/dashboard/school/${currentOrg.slug}/spreadsheets/${spreadsheet.id}`
                                      : `/dashboard/school/${currentOrg.slug}/spreadsheets?subjectId=${group.subject.id}&classLevelId=${classOption.id}`
                                  }
                                >
                                  {spreadsheet ? "Open Sheet" : "Create Sheet"}
                                  <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      </>
    );
  }

  // This is the fallback view for admin/owner AND any "member" who isn't a
  // recognized teacher/accountant/HOD/librarian in this org's own records —
  // so these tiles must respect that viewer's real permissions, not assume
  // admin. Reuses the exact same page-level gates as the sidebar/nav.
  const desktopStatsAll = [
    {
      key: "students",
      title: "Students",
      value: liveCounts?.students ?? currentOrg.counts.students ?? 0,
      icon: GraduationCap,
      color: "text-blue-600",
      bg: "bg-blue-100",
      show: isPrivileged || can("students.view"),
    },
    {
      key: "teachers",
      title: "Teachers",
      value: liveCounts?.teachers ?? currentOrg.counts.teachers ?? 0,
      icon: Users,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
      show: isPrivileged,
    },
    {
      key: "parents",
      title: "Parents",
      value: liveCounts?.parents ?? currentOrg.counts.parents ?? 0,
      icon: Users,
      color: "text-amber-600",
      bg: "bg-amber-100",
      show: isPrivileged || isHOD || can("parents.manage"),
    },
    {
      key: "classes",
      title: "Classes",
      value: "Manage",
      icon: School,
      color: "text-blue-600",
      bg: "bg-blue-100",
      show: isPrivileged || isTeacher,
    },
  ];
  const desktopStats = desktopStatsAll.filter((s) => s.show);

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
      <div className="hidden md:block space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl capitalize">
              Welcome back, {user.name.split(" ")[0]}
            </h1>
            <p className="text-slate-500">
              Here&apos;s an overview of <span className="capitalize">{currentOrg.name}</span> today.
            </p>
          </div>

          {isPrivileged && (
            <div className="flex gap-2">
              <Link href={`/dashboard/school/${currentOrg.slug}/students`}>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Student
                </Button>
              </Link>
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {desktopStats.map((stat, i) => (
            <Card key={i} className="shadow-sm border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  {stat.title}
                </CardTitle>
                <div className={`h-8 w-8 rounded-md flex items-center justify-center ${stat.bg}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-8">
          <Card className="col-span-4 shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle>School Information</CardTitle>
              <CardDescription>Your organization profile details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500 font-medium block">Category</span>
                  <span className="text-slate-900 capitalize">{currentOrg.category}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Type</span>
                  <span className="text-slate-900 capitalize">{currentOrg.type}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Status</span>
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-600 ring-1 ring-inset ring-emerald-600/20">
                    {currentOrg.subscription?.status || "Active"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Plan</span>
                  <span className="text-slate-900 capitalize">{currentOrg.subscription?.plan || "Free"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-3 shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
              <CardDescription>Common actions for your role</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Link href={`/dashboard/school/${currentOrg.slug}/spreadsheets`}>
                <div className="group flex items-center justify-between rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Layers className="h-5 w-5 text-blue-500 group-hover:text-blue-600" />
                    <div className="font-medium text-sm text-slate-900">Manage Grades</div>
                  </div>
                  <Layers className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
              <Link href={`/dashboard/school/${currentOrg.slug}/classes`}>
                <div className="group flex items-center justify-between rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <School className="h-5 w-5 text-blue-500 group-hover:text-blue-600" />
                    <div className="font-medium text-sm text-slate-900">View Classes</div>
                  </div>
                  <Layers className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
