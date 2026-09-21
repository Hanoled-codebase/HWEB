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
  sentenceCase,
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

  // Anything already in the tab bar is one tap away from every screen, so the
  // grid skips it and shows what the tab bar cannot.
  const inTabBar = new Set(config.tabs.map((tab) => tab.key));
  const preferred = (HOME_TOOLS[profile] ?? HOME_TOOLS.member).filter(
    (key) => byKey.has(key) && key !== primary?.key && !inTabBar.has(key),
  );
  // Pad from the rest of the role's visible nav so a role with few preferred
  // tools (a librarian, say) still gets a useful grid rather than one tile.
  const padding = visibleNavItems
    .map((item) => item.key)
    .filter((key) => key !== "overview" && key !== primary?.key && !inTabBar.has(key) && !preferred.includes(key));
  const toolKeys = [...preferred, ...padding].slice(0, Math.max(preferred.length, 5)).slice(0, 7);

  const tools: HomeTool[] = toolKeys.map((key) => {
    const item = byKey.get(key)!;
    return { key, label: key === "spreadsheets" ? "Grade sheets" : item.title, href: item.url, icon: HERO_ICONS[key] ?? item.icon };
  });

  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <div className="space-y-7">
      <div className="space-y-4">
        <HomeGreeting
          name={firstName}
          detail={currentOrg?.category ? `${sentenceCase(currentOrg.category)} school` : undefined}
        />

        <div className="space-y-3">
          {primary && primaryItem && (
            <PrimaryAction href={primaryItem.url} icon={primary.icon} label={primary.label} hint={primary.hint} />
          )}
          <StatStrip stats={stats} />
        </div>
      </div>

      {tools.length > 0 && (
        <section>
          <SectionTitle>More tools</SectionTitle>
          <ToolGrid tools={tools} />
        </section>
      )}
    </div>
  );
}
