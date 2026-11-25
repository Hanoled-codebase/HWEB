"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationSheet } from "@/components/dashboard/NotificationSheet";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useSchoolNavItems } from "@/hooks/useSchoolNavItems";
import { useOptionalMobileMenu } from "./MobileMenuProvider";
import { greetingName } from "@/lib/greeting-name";
import type { HomeTool } from "./HomeKit";

export type ParentResultGroup = {
  student: { id: string; firstName: string; lastName: string };
  results: Array<{
    id: string;
    title: string;
    subject: { name: string };
    assessments?: Array<{ total?: number; maxObtainableScore?: number }>;
    values: number[];
    updatedAt: string;
  }>;
};

type LinkedStudent = { id?: string; firstName?: string; lastName?: string };

// MESSAGING_PARKED — "messaging" parked for the MVP launch; restore post-launch.
const PARENT_TOOLS = ["results", "invoices", "homework", "timetable", "library", "bus-tracking", "support"];

const NOT_A_FIRST_NAME = new Set([
  "school",
  "admin",
  "administrator",
  "owner",
  "bursar",
  "office",
  "staff",
  "user",
  "there",
  "principal",
]);

function timeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * Parent phone home: full-bleed school-brand header + greeting, overlapping
 * child summary card with live term scores, and a 2-column school services grid.
 * All brand accents inherit CSS variables from SchoolThemeProvider.
 */
export function ParentHome({
  slug,
  students,
  results,
}: {
  slug: string;
  students: LinkedStudent[];
  results: ParentResultGroup[];
}) {
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const { visibleNavItems } = useSchoolNavItems();
  const menu = useOptionalMobileMenu();

  const tools: HomeTool[] = useMemo(() => {
    const inTabBar = new Set((menu?.config.tabs ?? []).map((tab) => tab.key));
    const byKey = new Map(visibleNavItems.map((item) => [item.key, item]));
    return PARENT_TOOLS.filter((key) => byKey.has(key) && !inTabBar.has(key)).map((key) => {
      const item = byKey.get(key)!;
      return { key, label: key === "invoices" ? "Fees & invoices" : item.title, href: item.url, icon: item.icon };
    });
  }, [menu?.config.tabs, visibleNavItems]);

  const resultsByStudentId = useMemo(() => {
    const map = new Map<string, ParentResultGroup>();
    for (const group of results) {
      if (group.student?.id) map.set(group.student.id, group);
    }
    return map;
  }, [results]);

  const orgName = currentOrg?.name || menu?.config.identity.orgName || "School";
  const orgLogo = currentOrg?.logo || menu?.config.identity.orgLogo;
  const schoolInitial = (orgName.trim()[0] || "H").toUpperCase();
  const roleLabel = menu?.config.roleLabel || "Parent portal";

  const rawName = greetingName(user?.name);
  const greetName = rawName && !NOT_A_FIRST_NAME.has(rawName.trim().toLowerCase()) ? rawName : null;
  const today = new Date().toLocaleDateString("en-NG", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="pb-4">
      {/* Full-bleed school-brand hero header + greeting */}
      <header className="bg-[var(--primary)] px-5 pb-16 pt-safe text-[var(--primary-foreground)]">
        <div className="flex items-center gap-3.5 pb-3 pt-4">
          <Avatar className="h-11 w-11 shrink-0 rounded-full bg-white shadow-xs ring-1 ring-black/5">
            <AvatarImage src={orgLogo} alt={orgName} className="object-cover" />
            <AvatarFallback className="rounded-full bg-white text-[17px] font-extrabold text-[var(--primary-text)]">
              {schoolInitial}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[16px] font-bold capitalize leading-tight tracking-tight text-[var(--primary-foreground)]">
              {orgName}
            </p>
            <p className="truncate text-[13px] leading-snug text-[var(--primary-foreground)]/90">
              {roleLabel}
            </p>
          </div>
          <NotificationSheet variant="on-brand" triggerClassName="-mr-1" />
        </div>

        <div className="pt-3">
          <p className="text-[13px] font-medium text-[var(--primary-foreground)]/90">{today}</p>
          <h1 className="mt-1 text-balance text-[28px] font-bold leading-[1.14] tracking-[-0.02em] text-[var(--primary-foreground)]">
            {timeOfDay()}
            {greetName && (
              <>
                , <span className="capitalize">{greetName}</span>
              </>
            )}
          </h1>
        </div>
      </header>

      {/* Overlapping floating child card */}
      <section aria-labelledby="parent-child-heading" className="-mt-11 px-4">
        <div className="rounded-[24px] border border-slate-100/90 bg-white p-5 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.10)]">
          <div className="flex items-center justify-between gap-3">
            <h2
              id="parent-child-heading"
              className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500"
            >
              {students.length <= 1 ? "MY CHILD" : "MY CHILDREN"}
            </h2>
            <Link
              href={`/dashboard/school/${slug}/students`}
              className="-my-2.5 -mr-1.5 inline-flex min-h-11 items-center rounded-lg px-1.5 text-[13px] font-bold text-[var(--primary-text)] transition-opacity active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              View all
            </Link>
          </div>

          {students.length === 0 ? (
            <div className="mt-4 flex items-center gap-3.5 rounded-2xl bg-slate-50 p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--primary-light)] text-[var(--primary-text)]">
                <Users className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900">No children linked yet</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                  Ask the school office to link your child to your account.
                </p>
              </div>
            </div>
          ) : (
            <div className="m-stagger mt-3.5 divide-y divide-slate-100">
              {students.map((student) => {
                const group = student.id ? resultsByStudentId.get(student.id) : undefined;
                const latest = group?.results.filter((r) => r.values.length > 0).slice(0, 3);
                const initials =
                  `${student.firstName?.[0] ?? ""}${student.lastName?.[0] ?? ""}`.toUpperCase() || "ST";
                return (
                  <Link
                    key={student.id || `${student.firstName}-${student.lastName}`}
                    href={`/dashboard/school/${slug}/results${student.id ? `?student=${encodeURIComponent(student.id)}` : ""}`}
                    className="block rounded-xl py-3.5 transition-opacity first:pt-0 last:pb-0 active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
                  >
                    <div className="flex items-center gap-3.5">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--primary-light)] text-[15px] font-bold text-[var(--primary-text)]">
                        {initials}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[17px] font-bold capitalize leading-snug text-slate-900">
                          {student.firstName} {student.lastName}
                        </span>
                        <span className="block truncate text-[13px] text-slate-500">
                          {latest && latest.length > 0
                            ? "Scores so far this term"
                            : "No scores yet · tap for results"}
                        </span>
                      </span>
                      <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
                    </div>

                    {latest && latest.length > 0 && (
                      <div className="mt-3.5 space-y-2">
                        {latest.map((r) => {
                          const earned = r.values.reduce((sum, value) => sum + (Number(value) || 0), 0);
                          const possible = Array.isArray(r.assessments)
                            ? r.assessments.reduce(
                                (sum, a) => sum + (Number(a.maxObtainableScore ?? a.total) || 0),
                                0,
                              )
                            : 0;
                          return (
                            <div
                              key={r.id}
                              className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3"
                            >
                              <span className="truncate text-[14px] font-medium text-slate-700">
                                {r.subject.name}
                              </span>
                              <span className="shrink-0 text-[14px] tabular-nums">
                                <span className="font-bold text-[var(--primary-text)]">{earned}</span>
                                {possible > 0 && (
                                  <span className="font-medium text-slate-500">/{possible}</span>
                                )}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* School services 2-column grid */}
      {tools.length > 0 && (
        <section aria-labelledby="parent-services-heading" className="mt-7 px-4">
          <h2
            id="parent-services-heading"
            className="mb-3.5 px-0.5 text-[17px] font-bold tracking-tight text-slate-900"
          >
            School services
          </h2>
          <div className="m-stagger grid grid-cols-2 gap-3">
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.key}
                  href={tool.href}
                  className="flex min-h-[68px] items-center gap-2.5 rounded-[20px] border border-slate-100/90 bg-white px-3 py-3 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.06)] transition-[transform,background-color] duration-100 active:scale-[0.98] active:bg-slate-50 motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-light)] text-slate-600">
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[14px] font-bold leading-tight text-slate-900">
                    {tool.label}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
