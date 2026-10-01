"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  ChevronRight,
  ClipboardCheck,
  FileSpreadsheet,
  Network,
  RotateCw,
  Send,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useSchoolNavItems } from "@/hooks/useSchoolNavItems";
import { useIsMobile } from "@/hooks/use-mobile";
import { isForbiddenError } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  departmentQueries,
  sheetStage,
  teacherNeedsAttention,
  type DepartmentOverview,
  type DepartmentSlot,
  type DepartmentTeacher,
} from "@/lib/department";
import { DataStateCard } from "@/components/dashboard/shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useOptionalMobileMenu } from "@/components/dashboard/mobile/MobileMenuProvider";
import { HomeGreeting, PrimaryAction, SectionTitle, ToolGrid, type HomeTool } from "@/components/dashboard/mobile/HomeKit";
import { greetingName } from "@/lib/greeting-name";

/**
 * The Head of Department's workspace: how far every class in the department
 * has got with its score sheet, what is complete and waiting for the HOD to
 * publish, and which teachers still owe a sheet or a scheme of work. Figures
 * come from the department's own records; nothing is estimated.
 */

const DEPARTMENT_TOOLS = ["spreadsheets", "scheme-of-work", "lesson-notes", "hr", "staff-attendance", "timetable"];

const STAGES = [
  { key: "published", label: "Published", bar: "bg-blue-700" },
  { key: "complete", label: "Ready to publish", bar: "bg-blue-500" },
  { key: "started", label: "Being filled", bar: "bg-blue-200" },
  { key: "missing", label: "Not started", bar: "bg-slate-100" },
] as const;

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function DepartmentHome({ switcher }: { switcher?: ReactNode }) {
  const { currentOrg } = useOrganization();
  const { user } = useAuth();
  const { visibleNavItems } = useSchoolNavItems();
  const slug = currentOrg?.slug ?? "";
  const [openTeacher, setOpenTeacher] = useState<string | null>(null);

  const query = useQuery({ ...departmentQueries.overview(slug), enabled: Boolean(slug), staleTime: 30_000 });
  const nav = useMemo(() => new Map(visibleNavItems.map((item) => [item.key, item])), [visibleNavItems]);
  const base = `/dashboard/school/${slug}`;
  const firstName = greetingName(user?.name) || "there";

  if (!currentOrg) return null;

  if (query.isError && !query.data) {
    const forbidden = isForbiddenError(query.error);
    return (
      <div className="space-y-4">
        {switcher}
        <DataStateCard
          variant={forbidden ? "forbidden" : "error"}
          title={forbidden ? "Department oversight is no longer part of your role" : "Couldn't load your department"}
          description={
            forbidden
              ? "A school admin has changed what your role can do. Ask them if you still need it."
              : "Check your connection and try again."
          }
        />
        {!forbidden && (
          <div className="text-center">
            <Button variant="outline" onClick={() => void query.refetch()}>
              <RotateCw className="mr-2 h-4 w-4" /> Try again
            </Button>
          </div>
        )}
      </div>
    );
  }

  const data = query.data;
  const names = data?.departments.map((department) => department.name).join(" · ");
  const props: ViewProps = {
    data,
    loading: query.isPending,
    base,
    nav,
    firstName,
    departmentNames: names || "",
    switcher,
    onOpenTeacher: setOpenTeacher,
  };
  const teacher = data?.teachers?.find((item) => item.memberId === openTeacher) ?? null;

  return (
    <>
      <div className="md:hidden">
        <DepartmentPhone {...props} />
      </div>
      <div className="hidden md:block">
        <DepartmentDesktop {...props} />
      </div>
      <TeacherSheet
        teacher={teacher}
        slots={data?.slots?.filter((slot) => slot.memberId === openTeacher) ?? []}
        base={base}
        onClose={() => setOpenTeacher(null)}
      />
    </>
  );
}

type ViewProps = {
  data: DepartmentOverview | undefined;
  loading: boolean;
  base: string;
  nav: Map<string, { key: string; title: string; url: string; icon: LucideIcon }>;
  firstName: string;
  departmentNames: string;
  switcher?: ReactNode;
  onOpenTeacher: (memberId: string) => void;
};

// ── Phone ────────────────────────────────────────────────────────────────

function DepartmentPhone(props: ViewProps) {
  const { data, loading, base, nav, firstName, departmentNames, switcher, onOpenTeacher } = props;
  const menu = useOptionalMobileMenu();
  const inTabBar = new Set(menu?.config.tabs.map((tab) => tab.key) ?? []);
  const tools: HomeTool[] = DEPARTMENT_TOOLS.filter((key) => nav.has(key) && !inTabBar.has(key))
    .slice(0, 5)
    .map((key) => {
      const item = nav.get(key)!;
      return { key, label: key === "hr" ? "Staff records" : item.title, href: item.url, icon: item.icon };
    });
  const ready = data?.readyToPublish ?? [];

  return (
    <div className="space-y-7">
      <div className="space-y-4">
        {switcher}
        <HomeGreeting name={firstName} detail={departmentNames ? `${departmentNames} · Head of Department` : "Head of Department"} />
        {ready.length > 0 ? (
          <PrimaryAction
            href={ready.length === 1 ? `${base}/spreadsheets/${ready[0].spreadsheetId}` : `${base}/spreadsheets`}
            icon={Send}
            label={`Publish ${ready.length} ${ready.length === 1 ? "result" : "results"}`}
            hint="Score sheets complete and waiting for you"
          />
        ) : (
          nav.has("spreadsheets") && (
            <PrimaryAction href={`${base}/spreadsheets`} icon={FileSpreadsheet} label="Check score sheets" hint="See where each class has got" />
          )
        )}
      </div>

      {loading ? (
        <div className="space-y-6" aria-busy="true" aria-label="Loading your department">
          <Skeleton className="h-[220px] w-full rounded-2xl" />
          <Skeleton className="h-[260px] w-full rounded-2xl" />
        </div>
      ) : data?.needsDepartment ? (
        <NoDepartment />
      ) : data ? (
        <>
          <Progress data={data} variant="phone" />
          {ready.length > 0 && <ReadyList data={data} base={base} />}
          <TeacherList data={data} onOpenTeacher={onOpenTeacher} />
        </>
      ) : null}

      {tools.length > 0 && (
        <section>
          <SectionTitle>Department tools</SectionTitle>
          <ToolGrid tools={tools} />
        </section>
      )}
    </div>
  );
}

// ── Desktop ──────────────────────────────────────────────────────────────

function DepartmentDesktop(props: ViewProps) {
  const { data, loading, base, nav, firstName, departmentNames, onOpenTeacher } = props;
  const today = new Date().toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long" });
  const tools = DEPARTMENT_TOOLS.filter((key) => nav.has(key)).map((key) => nav.get(key)!);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{today}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            {greeting()}, <span className="capitalize">{firstName}</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">{departmentNames ? `Head of Department · ${departmentNames}` : "Head of Department"}</p>
        </div>
        {nav.has("spreadsheets") && (
          <Button asChild className="h-11 rounded-xl px-5 font-semibold">
            <Link href={`${base}/spreadsheets`}>
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Score sheets
            </Link>
          </Button>
        )}
      </header>

      {loading ? (
        <div className="grid gap-6 lg:grid-cols-3" aria-busy="true" aria-label="Loading your department">
          <div className="space-y-6 lg:col-span-2">
            <Skeleton className="h-[200px] w-full rounded-2xl" />
            <Skeleton className="h-[360px] w-full rounded-2xl" />
          </div>
          <Skeleton className="h-[420px] w-full rounded-2xl" />
        </div>
      ) : data?.needsDepartment ? (
        <NoDepartment />
      ) : data ? (
        <div className="grid items-start gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Progress data={data} variant="desktop" />
            <ClassTable data={data} base={base} />
          </div>
          <div className="space-y-6">
            {(data.readyToPublish?.length ?? 0) > 0 && <ReadyList data={data} base={base} />}
            <TeacherList data={data} onOpenTeacher={onOpenTeacher} />
            {tools.length > 0 && (
              <section className="rounded-2xl border border-slate-200/70 bg-white p-2">
                <h2 className="px-3 pb-1 pt-2 text-sm font-semibold text-slate-900">Department tools</h2>
                <ul>
                  {tools.map((tool) => (
                    <li key={tool.key}>
                      <Link
                        href={tool.url}
                        className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        <tool.icon className="h-4 w-4 text-blue-600" />
                        <span className="flex-1">{tool.key === "hr" ? "Staff records" : tool.title}</span>
                        <ArrowRight className="h-4 w-4 text-slate-300 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-slate-500" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ── Pieces ───────────────────────────────────────────────────────────────

function NoDepartment() {
  return (
    <section className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center">
      <Network className="mx-auto h-8 w-8 text-slate-300" />
      <h2 className="mt-3 text-base font-semibold text-slate-900">You aren&apos;t linked to a department yet</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
        Ask a school admin to choose the department you lead, in Settings → Staff access. Its classes and teachers
        will show up here.
      </p>
    </section>
  );
}

function Progress({ data, variant }: { data: DepartmentOverview; variant: "phone" | "desktop" }) {
  const totals = data.totals;
  if (!totals || totals.classes === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center">
        <FileSpreadsheet className="mx-auto h-8 w-8 text-slate-300" />
        <h2 className="mt-3 text-base font-semibold text-slate-900">
          {totals?.subjects ? "No teachers on these subjects yet" : "No subjects in this department yet"}
        </h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
          {totals?.subjects
            ? "Once teachers are assigned to the department's subjects, each class's progress shows up here."
            : "A school admin adds subjects to the department in Settings → Staff access → Departments."}
        </p>
      </section>
    );
  }

  const counts = {
    published: totals.sheetsPublished,
    complete: totals.sheetsComplete - totals.sheetsPublished,
    started: totals.sheetsStarted - totals.sheetsComplete,
    missing: totals.classes - totals.sheetsStarted,
  };
  const notesWindow = data.notesWindowDays ?? 14;

  return (
    <section
      aria-label="Score sheet progress"
      className={cn("rounded-2xl border bg-white", variant === "phone" ? "border-slate-100 p-4" : "border-slate-200/70 p-6")}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className={cn("font-bold text-slate-900", variant === "phone" ? "text-base" : "text-base font-semibold")}>Score sheets</h2>
        <span className="text-sm text-slate-500">
          {totals.classes} {totals.classes === 1 ? "class" : "classes"} · {totals.teachers} {totals.teachers === 1 ? "teacher" : "teachers"}
        </span>
      </div>

      {/* One bar, four honest stages: every class sits in exactly one. */}
      <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={STAGES.map((stage) => `${counts[stage.key]} ${stage.label.toLowerCase()}`).join(", ")}>
        {STAGES.map((stage) =>
          counts[stage.key] > 0 ? (
            <div
              key={stage.key}
              className={cn("h-full first:rounded-l-full last:rounded-r-full", stage.bar)}
              style={{ width: `${(counts[stage.key] / totals.classes) * 100}%` }}
            />
          ) : null,
        )}
      </div>
      <ul className={cn("mt-3 text-sm", variant === "phone" ? "grid grid-cols-2 gap-x-4 gap-y-2" : "flex flex-wrap gap-x-6 gap-y-2")}>
        {STAGES.map((stage) => (
          <li key={stage.key} className="flex items-center gap-2 whitespace-nowrap">
            <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", stage.bar, stage.key === "missing" && "ring-1 ring-inset ring-slate-300")} aria-hidden="true" />
            <span className="text-slate-600">{stage.label}</span>
            <span className="ml-auto font-semibold tabular-nums text-slate-900 md:ml-0">{counts[stage.key]}</span>
          </li>
        ))}
      </ul>

      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm">
        <div>
          <dt className="text-slate-500">Schemes of work</dt>
          <dd className="mt-0.5 font-semibold text-slate-900">
            {totals.schemes} of {totals.classes} classes
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Lesson notes</dt>
          <dd className="mt-0.5 font-semibold text-slate-900">
            {totals.recentNotes} in the last {notesWindow} days
          </dd>
        </div>
      </dl>
    </section>
  );
}

function ReadyList({ data, base }: { data: DepartmentOverview; base: string }) {
  const ready = data.readyToPublish ?? [];
  return (
    <section>
      <SectionTitle aside={`${ready.length} waiting`}>Ready to publish</SectionTitle>
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white md:border-slate-200/70">
        {ready.slice(0, 6).map((item) => (
          <li key={item.spreadsheetId}>
            <Link
              href={`${base}/spreadsheets/${item.spreadsheetId}`}
              className="flex min-h-[64px] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-slate-50 active:bg-slate-50"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <ClipboardCheck className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-900">
                  {item.subject} · {item.className}
                </span>
                <span className="block truncate text-xs text-slate-500">
                  {item.teacher ? `${item.teacher} · ` : ""}every score entered
                </span>
              </span>
              <span className="text-sm font-semibold text-blue-700">Review</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function teacherSummary(teacher: DepartmentTeacher) {
  const parts: string[] = [];
  if (teacher.sheetsMissing) parts.push(`${teacher.sheetsMissing} ${teacher.sheetsMissing === 1 ? "sheet" : "sheets"} not started`);
  if (teacher.schemesMissing) parts.push(`${teacher.schemesMissing} ${teacher.schemesMissing === 1 ? "scheme" : "schemes"} missing`);
  if (!parts.length) parts.push(`${teacher.sheetsComplete} of ${teacher.classes} sheets complete`);
  return parts.join(" · ");
}

function TeacherList({ data, onOpenTeacher }: { data: DepartmentOverview; onOpenTeacher: (memberId: string) => void }) {
  const teachers = data.teachers ?? [];
  if (teachers.length === 0) return null;
  // Teachers with something outstanding first, so the list reads as a to-do.
  const ordered = [...teachers].sort((a, b) => Number(teacherNeedsAttention(b)) - Number(teacherNeedsAttention(a)));
  return (
    <section>
      <SectionTitle aside={`${teachers.length} in the department`}>Teachers</SectionTitle>
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white md:border-slate-200/70">
        {ordered.map((teacher) => {
          const behind = teacherNeedsAttention(teacher);
          return (
            <li key={teacher.memberId}>
              <button
                type="button"
                onClick={() => onOpenTeacher(teacher.memberId)}
                className="flex min-h-[64px] w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50 active:bg-slate-50"
              >
                <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                  {initials(teacher.name)}
                  <span
                    className={cn("absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full ring-2 ring-white", behind ? "bg-amber-500" : "bg-emerald-500")}
                    aria-hidden="true"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold capitalize text-slate-900">{teacher.name}</span>
                  <span className="block truncate text-xs text-slate-500">
                    <span className="sr-only">{behind ? "Needs attention: " : "Up to date: "}</span>
                    {teacherSummary(teacher)}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function StageBadge({ slot }: { slot: DepartmentSlot }) {
  const stage = sheetStage(slot.sheet);
  if (stage === "missing") return <span className="text-xs font-medium text-slate-500">Not started</span>;
  if (stage === "published") {
    return <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Published</span>;
  }
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
        <span className="block h-full rounded-full bg-blue-600" style={{ width: `${slot.sheet!.completion}%` }} />
      </span>
      <span className="text-xs font-semibold tabular-nums text-slate-700">{slot.sheet!.completion}%</span>
    </span>
  );
}

function YesNo({ ok, label }: { ok: boolean; label: string }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-emerald-700">
      <Check className="h-3.5 w-3.5" /> {label}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-amber-700">
      <X className="h-3.5 w-3.5" /> No {label.toLowerCase()}
    </span>
  );
}

function ClassTable({ data, base }: { data: DepartmentOverview; base: string }) {
  const slots = data.slots ?? [];
  if (slots.length === 0) return null;
  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white">
      <div className="px-6 pb-2 pt-5">
        <h2 className="text-base font-semibold text-slate-900">Class by class</h2>
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs text-slate-500">
            <th scope="col" className="px-6 py-2 font-medium">Subject and class</th>
            <th scope="col" className="px-3 py-2 font-medium">Teacher</th>
            <th scope="col" className="px-3 py-2 font-medium">Score sheet</th>
            <th scope="col" className="px-3 py-2 font-medium">Scheme</th>
            <th scope="col" className="px-6 py-2 text-right font-medium">Notes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {slots.map((slot) => (
            <tr key={`${slot.subjectId}:${slot.classLevelId}:${slot.memberId}`} className="hover:bg-slate-50/60">
              <td className="px-6 py-3">
                {slot.sheet ? (
                  <Link href={`${base}/spreadsheets/${slot.sheet.id}`} className="font-medium text-slate-900 hover:text-blue-700 hover:underline">
                    {slot.subject} · {slot.className}
                  </Link>
                ) : (
                  <span className="font-medium text-slate-900">
                    {slot.subject} · {slot.className}
                  </span>
                )}
              </td>
              <td className="px-3 py-3 capitalize text-slate-600">{slot.teacher}</td>
              <td className="px-3 py-3">
                <StageBadge slot={slot} />
              </td>
              <td className="px-3 py-3">
                <YesNo ok={slot.hasScheme} label={slot.hasScheme ? "Yes" : "Scheme"} />
              </td>
              <td className="px-6 py-3 text-right tabular-nums text-slate-600">{slot.recentNotes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function TeacherSheet({
  teacher,
  slots,
  base,
  onClose,
}: {
  teacher: DepartmentTeacher | null;
  slots: DepartmentSlot[];
  base: string;
  onClose: () => void;
}) {
  const isMobile = useIsMobile();
  return (
    <Sheet open={Boolean(teacher)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        showCloseButton={false}
        className={cn("gap-0 bg-slate-50 p-0", isMobile ? "max-h-[85dvh] rounded-t-[28px] border-t-0" : "w-full sm:max-w-[420px]")}
      >
        {teacher && (
          <div className="flex max-h-full flex-col overflow-hidden">
            <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-slate-300 md:hidden" aria-hidden="true" />
            <div className="flex items-start gap-3 px-5 pb-4 pt-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">
                {initials(teacher.name)}
              </span>
              <div className="min-w-0 flex-1">
                <SheetTitle className="truncate text-lg font-bold capitalize text-slate-900">{teacher.name}</SheetTitle>
                <SheetDescription className="text-sm text-slate-500">
                  {teacher.classes} {teacher.classes === 1 ? "class" : "classes"} in your department · {teacher.recentNotes} lesson{" "}
                  {teacher.recentNotes === 1 ? "note" : "notes"} lately
                </SheetDescription>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <ul className="flex-1 space-y-2 overflow-y-auto overscroll-contain px-5 pb-safe">
              {slots.map((slot) => {
                const body = (
                  <>
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-slate-900">
                        {slot.subject} · {slot.className}
                      </span>
                      <StageBadge slot={slot} />
                    </span>
                    <span className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <YesNo ok={slot.hasScheme} label="Scheme" />
                      <span className="text-xs text-slate-500">
                        {slot.recentNotes} lesson {slot.recentNotes === 1 ? "note" : "notes"}
                      </span>
                    </span>
                  </>
                );
                return (
                  <li key={`${slot.subjectId}:${slot.classLevelId}`}>
                    {slot.sheet ? (
                      <Link
                        href={`${base}/spreadsheets/${slot.sheet.id}`}
                        className="block rounded-2xl border border-slate-100 bg-white p-4 transition-colors hover:bg-slate-50 active:bg-slate-50"
                      >
                        {body}
                      </Link>
                    ) : (
                      <div className="rounded-2xl border border-slate-100 bg-white p-4">{body}</div>
                    )}
                  </li>
                );
              })}
              <li className="h-4" aria-hidden="true" />
            </ul>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
