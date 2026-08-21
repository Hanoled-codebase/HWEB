"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Menu,
  BookOpen,
  ChevronRight,
  X,
  Layers,
  School,
  Home,
  MessageSquare,
  MoreHorizontal,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSchoolNavItems } from "@/hooks/useSchoolNavItems";
import { cn } from "@/lib/utils";
import { NotificationSheet } from "@/components/dashboard/NotificationSheet";
import { HanoledLogo } from "@/components/ui/HanoledLogo";

type AssignmentOption = {
  id: string;
  name?: string | null;
};

type SubjectGroup = {
  subject: AssignmentOption;
  classes: AssignmentOption[];
};

const PURPLE = "#1447E6";

export function MemberMobileDashboard({
  slug,
  userName,
  subjectGroups,
  assignedClasses,
  readySheetsCount,
  sheetsByAssignment,
  isMemberSheetsLoading,
}: {
  slug: string;
  userName: string;
  subjectGroups: SubjectGroup[];
  assignedClasses: AssignmentOption[];
  readySheetsCount: number;
  sheetsByAssignment: Map<string, { id: string; status?: string } | undefined>;
  isMemberSheetsLoading: boolean;
  orgName?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { visibleNavItems } = useSchoolNavItems();
  const [menuOpen, setMenuOpen] = useState(false);

  const base = `/dashboard/school/${slug}`;

  const buildAssignmentKey = (subjectId: string, classLevelId: string) =>
    `${subjectId}:${classLevelId}`;

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "T";

  const primaryClassName = assignedClasses[0]?.name || null;

  const bottomTabs = useMemo(() => {
    const tabs = [
      { key: "home", label: "Home", icon: Home, href: base, show: true },
      {
        key: "sheets",
        label: "Sheets",
        icon: Layers,
        href: `${base}/spreadsheets`,
        show: visibleNavItems.some((i) => i.key === "spreadsheets"),
      },
      {
        key: "classes",
        label: "Classes",
        icon: School,
        href: `${base}/classes`,
        show: visibleNavItems.some((i) => i.key === "classes"),
      },
      {
        key: "messages",
        label: "Messages",
        icon: MessageSquare,
        href: `${base}/messaging`,
        show: visibleNavItems.some((i) => i.key === "messaging"),
      },
      { key: "more", label: "More", icon: MoreHorizontal, href: null, show: true },
    ];
    return tabs.filter((t) => t.show);
  }, [base, visibleNavItems]);

  const activeTab = pathname === base
    ? "home"
    : pathname.startsWith(`${base}/spreadsheets`)
      ? "sheets"
      : pathname.startsWith(`${base}/classes`)
        ? "classes"
        : pathname.startsWith(`${base}/messaging`)
          ? "messages"
          : "";

  const drawerItems = visibleNavItems.filter((item) => item.key !== "overview");

  return (
    <div className="relative flex min-h-screen flex-col bg-[#f5f5f7] pb-24">
      {/* App Bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-[#f5f5f7] px-4">
        <button
          onClick={() => setMenuOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <HanoledLogo size="sm" href="/" />

        <div className="flex items-center gap-2">
          <NotificationSheet />
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-800 border border-slate-200">
            {initials}
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-5 px-4">
        {/* Hero */}
        <section>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Teaching Dashboard
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 capitalize">
            Welcome back, {userName}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Open a class sheet directly from the subject cards below.
          </p>

          {visibleNavItems.some((i) => i.key === "spreadsheets") && (
            <Link
              href={`${base}/spreadsheets`}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-95"
              style={{ backgroundColor: PURPLE }}
            >
              <Layers className="h-4 w-4" />
              View All Sheets
            </Link>
          )}
        </section>

        {/* Stats row */}
        <section className="grid grid-cols-3 gap-2.5">
          {[
            { value: subjectGroups.length, label: "Subjects" },
            { value: assignedClasses.length, label: "Classes" },
            { value: readySheetsCount, label: "Sheets" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center rounded-2xl border border-slate-100 bg-white px-3 py-4 shadow-sm"
            >
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">{stat.label}</p>
            </div>
          ))}
        </section>

        {/* Your subjects */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Your subjects</h2>
            {primaryClassName && (
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                {primaryClassName}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Each spreadsheet is tied to one of your class and subject combinations.
          </p>

          {subjectGroups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center">
              <BookOpen className="mx-auto mb-3 h-8 w-8 text-slate-300" />
              <p className="text-sm font-medium text-slate-700">No subjects assigned</p>
              <p className="mt-1 text-xs text-slate-500">
                An admin needs to assign subjects to you.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {subjectGroups.map((group) => (
                <div
                  key={group.subject.id}
                  className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"
                >
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF]">
                        <BookOpen className="h-5 w-5" style={{ color: PURPLE }} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">
                          {group.subject.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {group.classes.length}{" "}
                          {group.classes.length === 1 ? "class" : "classes"} assigned
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`${base}/spreadsheets?subjectId=${group.subject.id}`}
                      className="flex shrink-0 items-center gap-0.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Open
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  <div className="space-y-2 border-t border-slate-100 bg-slate-50/80 px-4 py-3">
                    {isMemberSheetsLoading ? (
                      <p className="py-2 text-center text-xs text-slate-500">Loading classes...</p>
                    ) : (
                      group.classes.map((classOption) => {
                        const spreadsheet = sheetsByAssignment.get(
                          buildAssignmentKey(group.subject.id, classOption.id),
                        );

                        return (
                          <div
                            key={classOption.id}
                            className="rounded-xl bg-white p-3 border border-slate-100"
                          >
                            <p className="text-sm font-semibold text-slate-800">
                              {classOption.name}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {spreadsheet
                                ? "Spreadsheet ready for score entry"
                                : "No spreadsheet created yet for this class."}
                            </p>
                            <Link
                              href={
                                spreadsheet
                                  ? `${base}/spreadsheets/${spreadsheet.id}`
                                  : `${base}/spreadsheets?subjectId=${group.subject.id}&classLevelId=${classOption.id}`
                              }
                              className="mt-3 inline-flex items-center gap-1 rounded-xl px-4 py-2 text-xs font-semibold text-white"
                              style={{ backgroundColor: PURPLE }}
                            >
                              {spreadsheet ? "Open Sheet" : "Create Sheet"}
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Bottom Tab Bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-white/95 backdrop-blur-md pb-safe">
        <div className="flex items-end justify-around px-2 pt-2 pb-3">
          {bottomTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;

            const content = (
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "flex items-center justify-center rounded-xl px-3 py-1.5 transition-colors",
                    isActive && "bg-[#EEF0FF]",
                  )}
                >
                  <Icon
                    className={cn("h-5 w-5", isActive ? "text-[#1447E6]" : "text-slate-400")}
                  />
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium",
                    isActive ? "text-[#1447E6]" : "text-slate-400",
                  )}
                >
                  {tab.label}
                </span>
              </div>
            );

            if (tab.key === "more") {
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setMenuOpen(true)}
                  className="flex flex-col items-center"
                >
                  {content}
                </button>
              );
            }

            return (
              <Link key={tab.key} href={tab.href!} className="flex flex-col items-center">
                {content}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Side Menu Drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <div className="relative flex h-full w-[84vw] max-w-[320px] flex-col bg-white shadow-2xl">
            <div className="flex h-14 items-center justify-between border-b border-slate-100 px-4">
              <span className="text-base font-bold text-slate-900">Menu</span>
              <button
                onClick={() => setMenuOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              <Link
                href={base}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold bg-[#EEF0FF] text-[#1447E6]"
              >
                <Home className="h-5 w-5" />
                Dashboard
              </Link>
              {drawerItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.url || pathname.startsWith(`${item.url}/`);
                return (
                  <Link
                    key={item.key}
                    href={item.url}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-[#EEF0FF] text-[#1447E6]"
                        : "text-slate-700 hover:bg-slate-50",
                    )}
                  >
                    <Icon className={cn("h-5 w-5", isActive ? "text-[#1447E6]" : "text-slate-400")} />
                    {item.title}
                  </Link>
                );
              })}
            </div>

            <div className="border-t border-slate-100 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900 capitalize">{userName}</p>
                  <p className="text-xs text-slate-500">Teacher Account</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
