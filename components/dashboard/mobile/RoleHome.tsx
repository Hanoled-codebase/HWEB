"use client";

import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useSchoolNavItems } from "@/hooks/useSchoolNavItems";
import {
  Banknote,
  BookOpen,
  ClipboardCheck,
  CreditCard,
  Library,
  MessageSquare,
  Wallet,
  FileText,
  CalendarDays,
  type LucideIcon,
} from "lucide-react";
import { useMobileMenu } from "./MobileMenuProvider";
import type { MobileProfile } from "./mobile-config";
import {
  HomeGreeting,
  PrimaryAction,
  SectionTitle,
  StatStrip,
  ToolGrid,
  type HomeStat,
  type HomeTool,
} from "./HomeKit";

type Primary = { key: string; label: string; hint: string; icon: LucideIcon };

/** The one thing each role most often opens the app to do. First visible wins. */
const PRIMARY_ACTION: Record<string, Primary[]> = {
  owner: [{ key: "attendance", label: "Today's attendance", hint: "See who is in school", icon: ClipboardCheck }],
  admin: [{ key: "attendance", label: "Today's attendance", hint: "See who is in school", icon: ClipboardCheck }],
  accountant: [{ key: "payments", label: "Record a payment", hint: "Log fees as they are received", icon: Wallet }],
  hod: [{ key: "results", label: "Review results", hint: "Approve or check your department", icon: FileText }],
  librarian: [{ key: "library", label: "Open the library", hint: "Issue and return books", icon: Library }],
  "class-teacher": [{ key: "attendance", label: "Take attendance", hint: "Mark today's register", icon: ClipboardCheck }],
  "subject-teacher": [{ key: "spreadsheets", label: "Enter scores", hint: "Open a class grade sheet", icon: BookOpen }],
  member: [{ key: "timetable", label: "Today's timetable", hint: "See your periods", icon: CalendarDays }],
};

/** Tools worth a first-screen slot for each role, in order. */
const HOME_TOOLS: Record<string, string[]> = {
  owner: ["students", "payments", "results", "messaging", "admissions", "classes", "timetable", "billing"],
  admin: ["students", "payments", "results", "messaging", "admissions", "classes", "timetable", "billing"],
  accountant: ["payments", "fee-structure", "debt", "billing", "payroll", "scratch-cards", "students", "staff-attendance"],
  hod: ["students", "classes", "subjects", "spreadsheets", "timetable", "attendance", "hr", "staff-attendance"],
  librarian: ["library", "students", "timetable", "support"],
  "class-teacher": ["students", "spreadsheets", "homework", "timetable", "messaging", "lesson-notes"],
  "subject-teacher": ["homework", "timetable", "classes", "lesson-notes", "scheme-of-work", "question-bank"],
  member: ["timetable", "students", "messaging", "support"],
};

const HERO_ICONS: Partial<Record<string, LucideIcon>> = {
  payments: CreditCard,
  payroll: Banknote,
  messaging: MessageSquare,
};

/**
 * Phone home for every staff role that does not need bespoke data cards
 * (owner/admin, accountant, HOD, librarian, and plain staff). Everything shown
 * is derived from the role's visible navigation, so nothing here can point at a
 * page the role cannot open.
 */
export function RoleHome({ stats = [] }: { stats?: HomeStat[] }) {
  const { config } = useMobileMenu();
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const { visibleNavItems } = useSchoolNavItems();

  const byKey = useMemo(() => new Map(visibleNavItems.map((item) => [item.key, item])), [visibleNavItems]);
  const profile: MobileProfile = config.profile;

  const primary = (PRIMARY_ACTION[profile] ?? []).find((candidate) => byKey.has(candidate.key));
  const primaryItem = primary ? byKey.get(primary.key) : undefined;

  const tools: HomeTool[] = (HOME_TOOLS[profile] ?? HOME_TOOLS.member)
    .filter((key) => byKey.has(key) && key !== primary?.key)
    .slice(0, 7)
    .map((key) => {
      const item = byKey.get(key)!;
      return { key, label: key === "spreadsheets" ? "Grade sheets" : item.title, href: item.url, icon: HERO_ICONS[key] ?? item.icon };
    });

  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <div className="space-y-5">
      <HomeGreeting
        name={firstName}
        roleLabel={config.roleLabel}
        detail={currentOrg?.category ? `${currentOrg.category} school` : undefined}
      />

      {primary && primaryItem && (
        <PrimaryAction href={primaryItem.url} icon={primary.icon} label={primary.label} hint={primary.hint} />
      )}

      <StatStrip stats={stats} />

      <section>
        <SectionTitle>Your tools</SectionTitle>
        <ToolGrid tools={tools} />
      </section>
    </div>
  );
}
