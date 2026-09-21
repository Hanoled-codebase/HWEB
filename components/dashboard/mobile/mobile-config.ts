"use client";

import { useMemo } from "react";
import {
  CalendarDays,
  Clock,
  FileText,
  BookMarked,
  DollarSign,
  Home,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { usePermissions } from "@/hooks/usePermissions";
import { useSchoolNavItems } from "@/hooks/useSchoolNavItems";

/**
 * One description of "what does this person's phone UI contain", shared by the
 * top bar, tab bar, menu sheet and role homes. Derived from the same
 * permission-filtered nav the desktop sidebar uses, so a role can never see a
 * destination on mobile that the desktop would hide from them.
 */

export type MobileProfile =
  | "owner"
  | "admin"
  | "hod"
  | "class-teacher"
  | "subject-teacher"
  | "accountant"
  | "librarian"
  | "parent"
  | "member"
  | "student";

export type MobileNavItem = {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
};

export type MobileNavSection = { title: string; items: MobileNavItem[] };

export type MobileTab = MobileNavItem & { exact: boolean };

export type MobileShellConfig = {
  profile: MobileProfile;
  roleLabel: string;
  basePath: string;
  tabs: MobileTab[];
  sections: MobileNavSection[];
  identity: {
    orgName: string;
    orgLogo?: string;
    userName: string;
    userEmail: string;
    initials: string;
    subline: string;
  };
  /** Non-parents can jump to the CBT console from the menu. */
  showCbtConsole: boolean;
  /** Sign-out for shells that do not use the school session (e.g. the platform admin). */
  logout?: () => void | Promise<void>;
  /** The bell reads school notifications; shells outside a school hide it. */
  showNotifications?: boolean;
  /** Every destination is a top-level tab or menu item, so pages never show a back arrow. */
  hideBack?: boolean;
};

const SECTION_TITLES: Record<string, string> = {
  ACADEMICS: "Academics",
  PEOPLE: "People",
  FINANCE: "Finance",
  OPERATIONS: "School life",
  SYSTEM: "Settings",
};
const SECTION_ORDER = ["ACADEMICS", "PEOPLE", "FINANCE", "OPERATIONS", "SYSTEM"];

/** Shorter labels for the 64px-wide tab slots. */
const TAB_LABELS: Record<string, string> = {
  spreadsheets: "Sheets",
  attendance: "Register",
  messaging: "Messages",
  "fee-structure": "Fee plan",
  "staff-attendance": "Staff",
  invoices: "Fees",
  debt: "Debts",
  "scheme-of-work": "Schemes",
  "lesson-notes": "Notes",
};

/** What each role reaches for first, in thumb order. Home is always slot one. */
const TAB_PREFERENCES: Record<Exclude<MobileProfile, "student">, string[]> = {
  owner: ["students", "payments", "messaging"],
  admin: ["students", "payments", "messaging"],
  hod: ["students", "spreadsheets", "timetable"],
  "class-teacher": ["attendance", "students", "spreadsheets"],
  "subject-teacher": ["spreadsheets", "homework", "timetable"],
  accountant: ["payments", "fee-structure", "debt"],
  librarian: ["library", "students", "timetable"],
  parent: ["students", "results", "invoices"],
  member: ["timetable", "students", "messaging"],
};

const ROLE_LABELS: Record<MobileProfile, string> = {
  owner: "Owner",
  admin: "Admin",
  hod: "Head of Department",
  "class-teacher": "Class Teacher",
  "subject-teacher": "Subject Teacher",
  accountant: "Accountant",
  librarian: "Librarian",
  parent: "Parent",
  member: "Staff",
  student: "Student",
};

function getInitials(name?: string, fallback = "H") {
  const value = (name || "")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return value || fallback;
}

/**
 * Same precedence as the dashboard home (`app/dashboard/school/[slug]/page.tsx`):
 * whichever home a person is shown is the profile their tab bar is tuned to.
 */
export function resolveProfile(input: {
  role?: string;
  isAccountant: boolean;
  isHOD: boolean;
  isLibrarian: boolean;
  isClassTeacher: boolean;
  isSubjectTeacher: boolean;
}): Exclude<MobileProfile, "student"> {
  if (input.role === "parent") return "parent";
  if (input.isAccountant) return "accountant";
  if (input.isHOD) return "hod";
  if (input.isLibrarian) return "librarian";
  if (input.role === "member" && input.isClassTeacher) return "class-teacher";
  if (input.role === "member" && input.isSubjectTeacher) return "subject-teacher";
  if (input.role === "owner") return "owner";
  if (input.role === "admin") return "admin";
  return "member";
}

export function useStaffMobileConfig(): MobileShellConfig | null {
  const { currentOrg, currentMember } = useOrganization();
  const { user } = useAuth();
  const { visibleNavItems, role } = useSchoolNavItems();
  const { isAccountant, isHOD, isLibrarian, isClassTeacher, isSubjectTeacher } = usePermissions();

  return useMemo(() => {
    if (!currentOrg || !currentMember || !user) return null;

    const basePath = `/dashboard/school/${currentOrg.slug}`;
    const profile = resolveProfile({
      role,
      isAccountant: Boolean(isAccountant),
      isHOD: Boolean(isHOD),
      isLibrarian: Boolean(isLibrarian),
      isClassTeacher: Boolean(isClassTeacher),
      isSubjectTeacher: Boolean(isSubjectTeacher),
    });

    const byKey = new Map(visibleNavItems.map((item) => [item.key, item]));
    const toItem = (key: string, labelOverride?: string): MobileNavItem | null => {
      const item = byKey.get(key);
      if (!item) return null;
      return { key, label: labelOverride ?? item.title, href: item.url, icon: item.icon };
    };

    const tabKeys: string[] = [];
    for (const key of TAB_PREFERENCES[profile]) {
      if (byKey.has(key)) tabKeys.push(key);
    }
    // Home + three destinations + Menu = five slots: the most that keeps every
    // label readable at 360px wide. A role with fewer preferred destinations
    // still gets a full bar.
    for (const item of visibleNavItems) {
      if (tabKeys.length >= 3) break;
      if (item.key !== "overview" && !tabKeys.includes(item.key)) tabKeys.push(item.key);
    }

    const tabs: MobileTab[] = [
      { key: "overview", label: "Home", href: basePath, icon: Home, exact: true },
      ...tabKeys.slice(0, 3).flatMap((key) => {
        const label = profile === "parent" && key === "students" ? "Children" : TAB_LABELS[key];
        const item = toItem(key, label);
        return item ? [{ ...item, exact: false }] : [];
      }),
    ];

    const sections: MobileNavSection[] = SECTION_ORDER.flatMap((sectionKey) => {
      const items = visibleNavItems
        .filter((item) => item.section === sectionKey && item.key !== "overview")
        .map((item) => ({
          key: item.key,
          label: profile === "parent" && item.key === "students" ? "Children" : item.title,
          href: item.url,
          icon: item.icon,
        }));
      return items.length ? [{ title: SECTION_TITLES[sectionKey] ?? sectionKey, items }] : [];
    });

    return {
      profile,
      roleLabel: ROLE_LABELS[profile],
      basePath,
      tabs,
      sections,
      identity: {
        orgName: currentOrg.name,
        orgLogo: currentOrg.logo,
        userName: user.name,
        userEmail: user.email,
        initials: getInitials(user.name),
        subline: [currentOrg.category, currentOrg.subscription?.plan].filter(Boolean).join(" · "),
      },
      showCbtConsole: profile !== "parent",
    };
  }, [
    currentOrg,
    currentMember,
    user,
    visibleNavItems,
    role,
    isAccountant,
    isHOD,
    isLibrarian,
    isClassTeacher,
    isSubjectTeacher,
  ]);
}

export function useStudentMobileConfig(): MobileShellConfig | null {
  const { currentOrg, currentStudent } = useOrganization();
  const { user } = useAuth();

  return useMemo(() => {
    if (!currentOrg || !user) return null;
    const basePath = `/dashboard/school/${currentOrg.slug}`;

    const results: MobileNavItem = { key: "results", label: "Results", href: `${basePath}/student/results`, icon: FileText };
    const exams: MobileNavItem = { key: "exams", label: "Exams", href: `${basePath}/student/pending`, icon: Clock };
    const timetable: MobileNavItem = { key: "timetable", label: "Timetable", href: `${basePath}/student/timetable`, icon: CalendarDays };
    const library: MobileNavItem = { key: "library", label: "Library", href: `${basePath}/student/library`, icon: BookMarked };
    const invoices: MobileNavItem = { key: "invoices", label: "Fees", href: `${basePath}/student/invoices`, icon: DollarSign };

    const className = currentStudent?.classLevel?.name;
    return {
      profile: "student",
      roleLabel: ROLE_LABELS.student,
      basePath,
      tabs: [
        { key: "overview", label: "Home", href: basePath, icon: Home, exact: true },
        { ...results, exact: false },
        { ...exams, exact: false },
        { ...timetable, exact: false },
      ],
      sections: [{ title: "My school", items: [results, exams, timetable, library, invoices] }],
      identity: {
        orgName: currentOrg.name,
        orgLogo: currentOrg.logo,
        userName: currentStudent ? `${currentStudent.firstName} ${currentStudent.lastName}` : user.name,
        userEmail: user.email,
        initials: getInitials(currentStudent ? `${currentStudent.firstName} ${currentStudent.lastName}` : user.name, "S"),
        subline: [className, currentStudent?.admissionNumber].filter(Boolean).join(" · "),
      },
      showCbtConsole: false,
    };
  }, [currentOrg, currentStudent, user]);
}
