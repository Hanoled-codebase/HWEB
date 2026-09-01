"use client";

import { useMemo } from "react";
import { useOrganization } from "./useOrganization";
import { usePermissions, type Capability } from "./usePermissions";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  BookText,
  TableProperties,
  CalendarDays,
  FileText,
  Settings,
  UserPlus,
  CreditCard,
  ClipboardCheck,
  Heart,
  Users2,
  Ticket,
  MessageSquare,
  Library,
  Building2,
  Bus,
  HelpCircle,
  DollarSign,
  AlertTriangle,
  ClipboardList,
  Settings2,
  Stethoscope,
  Clock,
  Banknote,
  type LucideIcon,
} from "lucide-react";

export type SchoolNavItem = {
  key: string;
  title: string;
  url: string;
  icon: LucideIcon;
  show: boolean;
  section?: string;
};

const PARENT_ALLOWED_SEGMENTS = new Set([
  "students",
  "results",
  "homework",
  "invoices",
  "library",
  "bus-tracking",
  "payments",
  "timetable",
  "messaging",
  "support",
]);

export function canAccessPath(
  pathname: string,
  slug: string,
  navItems: SchoolNavItem[],
  role?: string,
): boolean {
  const base = `/dashboard/school/${slug}`;
  if (pathname === base) return true;

  const relative = pathname.startsWith(`${base}/`)
    ? pathname.slice(base.length + 1)
    : "";
  const topSegment = relative.split("/")[0];

  if (role === "parent" && PARENT_ALLOWED_SEGMENTS.has(topSegment)) {
    return true;
  }

  return navItems.some(
    (item) => pathname === item.url || pathname.startsWith(`${item.url}/`),
  );
}

export function useSchoolNavItems() {
  const { currentOrg, currentMember } = useOrganization();
  const { can, role, isPrivileged: rawIsPrivileged, assignments } = usePermissions();
  const isPrivileged = Boolean(rawIsPrivileged);

  return useMemo(() => {
    if (!currentOrg || !currentMember) {
      return { navItems: [] as SchoolNavItem[], visibleNavItems: [] as SchoolNavItem[], role: undefined as string | undefined };
    }

    const baseUrl = `/dashboard/school/${currentOrg.slug}`;
    const safeAssignments = (assignments || []).filter(
      (a) => !a.endDate || new Date(a.endDate) > new Date(),
    );
    const isAccountant = safeAssignments.some((a) => a.type === "ACCOUNTANT");
    const isLibrarian = safeAssignments.some((a) => a.type === "LIBRARIAN");
    const isHOD = safeAssignments.some((a) => a.type === "HOD");
    const isSubjectTeacher = safeAssignments.some((a) => a.type === "SUBJECT_TEACHER");
    const isClassTeacher = safeAssignments.some((a) => a.type === "CLASS_TEACHER");
    const isTeacher = isSubjectTeacher || isClassTeacher || isHOD;
    const userRole = role || "member";

    const parentHasBusStudent = (currentMember.assignedStudents || []).some(
      (s: any) => Boolean(s.usesBus),
    );

    const navItems: SchoolNavItem[] = [
      { key: "overview", title: "Overview", url: baseUrl, icon: LayoutDashboard, show: true, section: "OVERVIEW" },
      { key: "students", title: "Students", url: `${baseUrl}/students`, icon: GraduationCap, show: isPrivileged || can("students.view") || userRole === "parent", section: "ACADEMICS" },
      { key: "results", title: "Results", url: `${baseUrl}/results`, icon: FileText, show: isPrivileged || userRole === "parent" || can("results.view_own_child") || can("results.view_self"), section: "ACADEMICS" },
      { key: "classes", title: "Classes", url: `${baseUrl}/classes`, icon: Building2, show: isPrivileged || isTeacher, section: "ACADEMICS" },
      { key: "subjects", title: "Subjects", url: `${baseUrl}/subjects`, icon: BookOpen, show: isPrivileged || isTeacher, section: "ACADEMICS" },
      { key: "spreadsheets", title: "Spreadsheets", url: `${baseUrl}/spreadsheets`, icon: TableProperties, show: isPrivileged || isTeacher, section: "ACADEMICS" },
      { key: "timetable", title: "Timetable", url: `${baseUrl}/timetable`, icon: CalendarDays, show: isPrivileged || can("timetable.view"), section: "ACADEMICS" },
      { key: "attendance", title: "Attendance", url: `${baseUrl}/attendance`, icon: ClipboardCheck, show: isPrivileged || can("attendance.view"), section: "ACADEMICS" },
      { key: "affective", title: "Affective", url: `${baseUrl}/affective`, icon: Heart, show: isPrivileged, section: "ACADEMICS" },
      { key: "scheme-of-work", title: "Scheme of Work", url: `${baseUrl}/scheme-of-work`, icon: BookText, show: isPrivileged || isTeacher, section: "ACADEMICS" },
      { key: "lesson-notes", title: "Lesson Notes", url: `${baseUrl}/lesson-notes`, icon: FileText, show: isPrivileged || isTeacher, section: "ACADEMICS" },
      { key: "question-bank", title: "Question Bank", url: `${baseUrl}/question-bank`, icon: HelpCircle, show: isPrivileged || can("cbt.manage"), section: "ACADEMICS" },
      { key: "result-templates", title: "Result Templates", url: `${baseUrl}/result-templates`, icon: ClipboardList, show: isPrivileged, section: "ACADEMICS" },
      { key: "admissions", title: "Admissions", url: `${baseUrl}/admissions`, icon: UserPlus, show: isPrivileged, section: "ACADEMICS" },
      { key: "homework", title: "Homework", url: `${baseUrl}/homework`, icon: BookOpen, show: isPrivileged || can("homework.manage") || userRole === "parent", section: "ACADEMICS" },
      { key: "teachers", title: "Teachers", url: `${baseUrl}/teachers`, icon: Users, show: isPrivileged, section: "PEOPLE" },
      { key: "parents", title: "Parents", url: `${baseUrl}/parents`, icon: Users2, show: isPrivileged || isHOD || can("parents.manage"), section: "PEOPLE" },
      { key: "hr", title: "HR", url: `${baseUrl}/hr`, icon: Users2, show: isPrivileged || isHOD, section: "PEOPLE" },
      { key: "invites", title: "Pending Invites", url: `${baseUrl}/invites`, icon: UserPlus, show: isPrivileged, section: "PEOPLE" },
      { key: "messaging", title: "Messaging", url: `${baseUrl}/messaging`, icon: MessageSquare, show: isPrivileged || can("messaging.send"), section: "PEOPLE" },
      { key: "payments", title: "Payments", url: `${baseUrl}/payments`, icon: CreditCard, show: (isPrivileged || isAccountant || can("payments.record")) && userRole !== "parent", section: "FINANCE" },
      { key: "billing", title: "Billing", url: `${baseUrl}/billing`, icon: CreditCard, show: isPrivileged || isAccountant, section: "FINANCE" },
      { key: "fee-structure", title: "Fee Structure", url: `${baseUrl}/fee-structure`, icon: DollarSign, show: isPrivileged || isAccountant || can("fee_structure.edit"), section: "FINANCE" },
      { key: "invoices", title: "Invoices", url: `${baseUrl}/invoices`, icon: DollarSign, show: userRole === "parent", section: "FINANCE" },
      { key: "scratch-cards", title: "Scratch Cards", url: `${baseUrl}/scratch-cards`, icon: Ticket, show: isPrivileged || isAccountant, section: "FINANCE" },
      { key: "debt", title: "Debt Profile", url: `${baseUrl}/debt`, icon: AlertTriangle, show: isPrivileged || isAccountant, section: "FINANCE" },
      { key: "hostel", title: "Hostel", url: `${baseUrl}/hostel`, icon: Building2, show: isPrivileged, section: "OPERATIONS" },
      { key: "bus-tracking", title: "Bus Routes", url: `${baseUrl}/bus-tracking`, icon: Bus, show: isPrivileged || (userRole === "parent" && parentHasBusStudent), section: "OPERATIONS" },
      { key: "library", title: "Library", url: `${baseUrl}/library`, icon: Library, show: isPrivileged || can("library.manage") || userRole === "parent", section: "OPERATIONS" },
      { key: "clinic", title: "Clinic Log", url: `${baseUrl}/clinic`, icon: Stethoscope, show: isPrivileged, section: "OPERATIONS" },
      { key: "staff-attendance", title: "Staff Attendance", url: `${baseUrl}/staff-attendance`, icon: Clock, show: isPrivileged || isHOD || isAccountant, section: "OPERATIONS" },
      { key: "payroll", title: "Payroll", url: `${baseUrl}/payroll`, icon: Banknote, show: isPrivileged || isAccountant, section: "FINANCE" },
      { key: "support", title: "Support", url: `${baseUrl}/support`, icon: MessageSquare, show: true, section: "OPERATIONS" },
      { key: "settings", title: "Settings", url: `${baseUrl}/settings`, icon: Settings, show: isPrivileged, section: "SYSTEM" },
      { key: "features", title: "Features", url: `${baseUrl}/settings/features`, icon: Settings2, show: isPrivileged, section: "SYSTEM" },
    ];

    const visibleNavItems = navItems.filter((item) => item.show);

    return { navItems, visibleNavItems, role: userRole, isPrivileged, can };
  }, [currentOrg, currentMember, can, role, isPrivileged, assignments]);
}

export type { Capability };
