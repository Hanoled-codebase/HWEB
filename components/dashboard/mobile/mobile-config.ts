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
import { WORKSPACE_META, useWorkspace, type WorkspaceKey } from "@/hooks/useWorkspace";

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
  /** Home top bar shows the signed-in person (initials, name, role) instead of a school. */
  homeBar?: "account";
  /** Active tab is a soft pill around the icon and its label, instead of a pill behind the icon only. */
  tabStyle?: "pill";
  /** A bell that links somewhere (e.g. support tickets) and shows a dot only when there is something new. */
  bell?: { href: string; label: string; dot: boolean };
  /** Staff with more than one hat (teaching + bursary) switch workspaces from the menu. */
  workspaces?: {
    items: Array<{ key: WorkspaceKey; label: string; icon: LucideIcon }>;
    active: WorkspaceKey;
    onChange: (key: WorkspaceKey) => void;
  };
};

const SECTION_TITLES: Record<string, string> = {
  ACADEMICS: "Academics",
  PEOPLE: "People",
  FINANCE: "Finance",
  OPERATIONS: "School life",
  SYSTEM: "Settings",
};
const SECTION_ORDER = ["ACADEMICS", "PEOPLE", "FINANCE", "OPERATIONS", "SYSTEM"];

/**
 * The phone menu groups by job, not by the desktop sidebar's sections: the sidebar
 * can afford 14 Academics links, a 3-column sheet can't. Order inside a group is
 * how often a school reaches for it. Anything not listed keeps its sidebar section.
 */
const MENU_GROUPS: Array<{ key: string; title: string; keys: string[] }> = [
  { key: "classroom", title: "Classroom", keys: ["attendance", "spreadsheets", "results", "homework", "timetable", "lesson-notes", "scheme-of-work"] },
  { key: "people", title: "People", keys: ["students", "teachers", "parents", "admissions", "invites", "staff-attendance", "hr"] },
  // SCRATCH_CARD_PARKED — "scratch-cards" out of the Money workspace for the MVP launch; restore post-launch.
  { key: "money", title: "Money", keys: ["record-payment", "payments", "debt", "invoices", "fee-structure", "billing", "payroll"] },
  // MESSAGING_PARKED — "messaging" out of School life for the MVP launch; restore post-launch.
  { key: "school-life", title: "School life", keys: ["library-desk", "library", "hostel", "bus-tracking", "clinic"] },
  { key: "setup", title: "Academic setup", keys: ["classes", "subjects", "result-templates", "affective", "question-bank"] },
  { key: "settings", title: "Settings & help", keys: ["settings", "access", "features", "support"] },
];

/** Shorter labels for the tab slots (about 58px of text at 360px wide, 54px at 320). */
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
  "record-payment": "Record",
  "library-desk": "Desk",
};

/** What each role reaches for first, in thumb order. Home is always slot one. */
const TAB_PREFERENCES: Record<Exclude<MobileProfile, "student">, string[]> = {
  // MESSAGING_PARKED — "messaging" parked for the MVP launch; restore post-launch.
  owner: ["students", "payments"],
  admin: ["students", "payments"],
  hod: ["spreadsheets", "scheme-of-work", "lesson-notes"],
  "class-teacher": ["attendance", "students", "spreadsheets"],
  "subject-teacher": ["spreadsheets", "homework", "timetable"],
  accountant: ["record-payment", "debt", "payments"],
  librarian: ["library-desk", "library", "students"],
  parent: ["students", "results", "invoices"],
  member: ["timetable", "students"], // MESSAGING_PARKED — "messaging" restored post-launch
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
 * For staff that is their active workspace, so a teacher who also keeps the
 * bursary gets bursary tabs while in the bursary and teaching tabs otherwise.
 */
export function resolveProfile(input: {
  role?: string;
  workspace: WorkspaceKey | null;
  isClassTeacher: boolean;
  isSubjectTeacher: boolean;
}): Exclude<MobileProfile, "student"> {
  if (input.role === "parent") return "parent";
  if (input.role === "owner") return "owner";
  if (input.role === "admin") return "admin";
  if (input.workspace === "finance") return "accountant";
  if (input.workspace === "library") return "librarian";
  if (input.workspace === "department") return "hod";
  if (input.isClassTeacher) return "class-teacher";
  if (input.isSubjectTeacher) return "subject-teacher";
  return "member";
}

export function useStaffMobileConfig(): MobileShellConfig | null {
  const { currentOrg, currentMember } = useOrganization();
  const { user } = useAuth();
  const { visibleNavItems, role } = useSchoolNavItems();
  const { isClassTeacher, isSubjectTeacher } = usePermissions();
  const { available: workspaceKeys, active: workspace, setActive: setWorkspace } = useWorkspace();

  return useMemo(() => {
    if (!currentOrg || !currentMember || !user) return null;

    const basePath = `/dashboard/school/${currentOrg.slug}`;
    const profile = resolveProfile({
      role,
      workspace,
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

    const toMenuItem = (item: (typeof visibleNavItems)[number]): MobileNavItem => ({
      key: item.key,
      label: profile === "parent" && item.key === "students" ? "Children" : item.title,
      href: item.url,
      icon: item.icon,
    });
    // The active workspace's tools lead the menu.
    const leadGroup = profile === "accountant" ? "money" : profile === "librarian" ? "school-life" : null;
    const groups = leadGroup
      ? [...MENU_GROUPS.filter((group) => group.key === leadGroup), ...MENU_GROUPS.filter((group) => group.key !== leadGroup)]
      : MENU_GROUPS;
    const grouped = new Set(MENU_GROUPS.flatMap((group) => group.keys));
    const sections: MobileNavSection[] = [
      ...groups.flatMap((group) => {
        const items = group.keys.flatMap((key) => {
          const item = byKey.get(key);
          return item ? [toMenuItem(item)] : [];
        });
        return items.length ? [{ title: group.title, items }] : [];
      }),
      // Destinations added to the sidebar later still reach the phone, under their sidebar section.
      ...SECTION_ORDER.flatMap((sectionKey) => {
        const items = visibleNavItems
          .filter((item) => item.section === sectionKey && item.key !== "overview" && !grouped.has(item.key))
          .map(toMenuItem);
        return items.length ? [{ title: SECTION_TITLES[sectionKey] ?? sectionKey, items }] : [];
      }),
    ];

    return {
      profile,
      // A class teacher who also teaches other classes is told both.
      roleLabel:
        profile === "class-teacher" && isSubjectTeacher ? "Class & Subject Teacher" : ROLE_LABELS[profile],
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
      workspaces:
        workspace && workspaceKeys.length > 1
          ? {
              items: workspaceKeys.map((key) => ({ key, ...WORKSPACE_META[key] })),
              active: workspace,
              onChange: setWorkspace,
            }
          : undefined,
    };
  }, [
    currentOrg,
    currentMember,
    user,
    visibleNavItems,
    role,
    workspace,
    workspaceKeys,
    setWorkspace,
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
