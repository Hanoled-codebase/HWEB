"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, CheckCircle2, ChevronRight, ClipboardCheck, Eye, Layers, Users } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useOrganization } from "@/hooks/useOrganization";
import { useSchoolNavItems } from "@/hooks/useSchoolNavItems";
import { cn } from "@/lib/utils";
import { attendanceQueries, localDay, type Tally } from "@/lib/attendance";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useOptionalMobileMenu } from "@/components/dashboard/mobile/MobileMenuProvider";
import { EmptyNote, HomeGreeting, PrimaryAction, SectionTitle, ToolGrid, type HomeTool } from "@/components/dashboard/mobile/HomeKit";

/**
 * A teacher's home, with their two possible jobs kept visibly apart:
 *  - Your class (Class Teacher): they take this class's register.
 *  - Your subjects (Subject Teacher): they enter scores, and can only look
 *    at attendance for the students they teach.
 * Someone who is both sees both sections, each labelled with what it allows.
 */

type Option = { id: string; name?: string | null };
type SubjectGroup = { subject: Option; classes: Option[] };

// MESSAGING_PARKED — "messaging" parked for the MVP launch; restore post-launch.
const TEACHING_TOOLS = ["students", "homework", "timetable", "lesson-notes", "scheme-of-work", "question-bank"];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function takenLine(taken: Tally | undefined, students: number) {
  if (!taken || taken.total === 0) return `Not taken today · ${students} ${students === 1 ? "student" : "students"}`;
  const parts = [`${taken.present} present`];
  if (taken.absent) parts.push(`${taken.absent} absent`);
  if (taken.late) parts.push(`${taken.late} late`);
  return `Taken today · ${parts.join(", ")}`;
}

export function TeachingHome({
  slug,
  firstName,
  subjectGroups,
  sheetsByAssignment,
  isSheetsLoading,
}: {
  slug: string;
  firstName: string;
  subjectGroups: SubjectGroup[];
  sheetsByAssignment: Map<string, { id: string; status?: string } | undefined>;
  isSheetsLoading: boolean;
}) {
  const { assignments } = usePermissions();
  const { currentMember } = useOrganization();
  const { visibleNavItems } = useSchoolNavItems();
  const base = `/dashboard/school/${slug}`;
  const nav = useMemo(() => new Map(visibleNavItems.map((item) => [item.key, item])), [visibleNavItems]);

  // The classes whose register this teacher takes.
  const myClasses = useMemo(() => {
    const seen = new Map<string, string>();
    for (const assignment of assignments ?? []) {
      if (assignment.type !== "CLASS_TEACHER") continue;
      const id = assignment.classLevel?.id || assignment.classLevelId;
      if (id && !seen.has(id)) seen.set(id, assignment.classLevel?.name || "Your class");
    }
    // A form teacher set from the Classes screen has no CLASS_TEACHER
    // assignment; the class is on the member as assignedClasses.
    for (const cls of currentMember?.assignedClasses ?? []) {
      if (cls.id && !seen.has(cls.id)) seen.set(cls.id, cls.name || "Your class");
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [assignments, currentMember]);
  const isClassTeacher = myClasses.length > 0;
  const isSubjectTeacher = subjectGroups.length > 0;

  const today = useQuery({
    ...attendanceQueries.myClasses(slug, localDay()),
    enabled: isClassTeacher,
    staleTime: 30_000,
  });
  const registerFor = (classId: string) => today.data?.register.find((item) => item.classLevelId === classId);

  const roleLine = [
    isClassTeacher && `Class teacher, ${myClasses.map((c) => c.name).join(", ")}`,
    isSubjectTeacher && `Teaches ${subjectGroups.map((group) => group.subject.name).join(", ")}`,
  ]
    .filter(Boolean)
    .join(" · ");

  const firstClass = myClasses[0];
  const firstRegister = firstClass ? registerFor(firstClass.id) : undefined;

  const yourClass = isClassTeacher && (
    <section>
      <SectionTitle aside="You take the register">Your class</SectionTitle>
      <ul className="space-y-3">
        {myClasses.map((classOption) => {
          const register = registerFor(classOption.id);
          const taken = (register?.taken.total ?? 0) > 0;
          return (
            <li key={classOption.id} className="rounded-2xl border border-slate-100 bg-white p-4 md:border-slate-200/70">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <ClipboardCheck className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold text-slate-900">{classOption.name}</p>
                  {today.isPending ? (
                    <Skeleton className="mt-1 h-4 w-40" />
                  ) : (
                    <p className={cn("mt-0.5 flex items-center gap-1.5 text-sm", taken ? "text-slate-600" : "font-medium text-amber-700")}>
                      {taken && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                      {takenLine(register?.taken, register?.students ?? 0)}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {nav.has("attendance") && (
                  <Button asChild variant="outline" className="h-11 rounded-xl border-blue-200 bg-blue-50 font-semibold text-blue-700 hover:bg-blue-100">
                    <Link href={`${base}/attendance`}>{taken ? "Open register" : "Take register"}</Link>
                  </Button>
                )}
                {nav.has("students") && (
                  <Button asChild variant="outline" className="h-11 rounded-xl">
                    <Link href={`${base}/students`}>
                      <Users className="mr-2 h-4 w-4" /> Students
                    </Link>
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );

  const yourSubjects = (
    <section>
      <SectionTitle aside={isSubjectTeacher ? "Scores · attendance is view only" : undefined}>Your subjects</SectionTitle>
      {!isSubjectTeacher ? (
        <EmptyNote icon={BookOpen} title="No subjects assigned" hint="An admin assigns the subjects you teach." />
      ) : (
        <div className="space-y-3">
          {subjectGroups.map((group) => (
            <div key={group.subject.id} className="overflow-hidden rounded-2xl border border-slate-100 bg-white md:border-slate-200/70">
              <Link
                href={`${base}/spreadsheets?subjectId=${group.subject.id}`}
                className="flex min-h-[60px] items-center gap-3 p-3.5 transition-colors hover:bg-slate-50 active:bg-slate-50"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <BookOpen className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold text-slate-900">{group.subject.name}</span>
                  <span className="block text-xs text-slate-500">
                    {group.classes.length} {group.classes.length === 1 ? "class" : "classes"}
                  </span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
              </Link>
              <ul className="divide-y divide-slate-100 border-t border-slate-100 bg-slate-50/70">
                {isSheetsLoading ? (
                  <li className="px-4 py-3 text-center text-xs text-slate-500">Loading classes…</li>
                ) : (
                  group.classes.map((classOption) => {
                    const sheet = sheetsByAssignment.get(`${group.subject.id}:${classOption.id}`);
                    const ownClass = myClasses.some((mine) => mine.id === classOption.id);
                    return (
                      <li key={classOption.id} className="flex items-center gap-2 px-4 py-2.5">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-800">{classOption.name}</span>
                          <span className="block text-xs text-slate-500">
                            {sheet ? "Grade sheet ready" : "No grade sheet yet"}
                            {ownClass ? " · your class" : ""}
                          </span>
                        </span>
                        {nav.has("attendance") && (
                          <Link
                            href={
                              ownClass
                                ? `${base}/attendance`
                                : `${base}/attendance?view=subjects&slot=${classOption.id}:${group.subject.id}`
                            }
                            aria-label={`${ownClass ? "Register" : "Attendance, view only"}: ${group.subject.name} ${classOption.name}`}
                            className="flex min-h-[44px] shrink-0 items-center gap-1 rounded-xl px-3 text-xs font-semibold text-slate-600 hover:bg-white active:bg-white"
                          >
                            {ownClass ? <ClipboardCheck className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            {ownClass ? "Register" : "Attendance"}
                          </Link>
                        )}
                        <Link
                          href={
                            sheet
                              ? `${base}/spreadsheets/${sheet.id}`
                              : `${base}/spreadsheets?subjectId=${group.subject.id}&classLevelId=${classOption.id}`
                          }
                          className={cn(
                            "flex min-h-[44px] shrink-0 items-center rounded-xl px-4 text-sm font-semibold",
                            sheet ? "bg-blue-50 text-blue-700 active:bg-blue-100" : "border border-slate-200 bg-white text-slate-700 active:bg-slate-100",
                          )}
                        >
                          {sheet ? "Scores" : "Create sheet"}
                        </Link>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <>
      <TeachingPhone
        firstName={firstName}
        roleLine={roleLine}
        primary={
          isClassTeacher && nav.has("attendance") ? (
            <PrimaryAction
              href={`${base}/attendance`}
              icon={ClipboardCheck}
              label={(firstRegister?.taken.total ?? 0) > 0 ? "Today's register" : "Take today's register"}
              hint={`${firstClass!.name} · ${today.isPending ? "checking…" : takenLine(firstRegister?.taken, firstRegister?.students ?? 0)}`}
            />
          ) : nav.has("spreadsheets") ? (
            <PrimaryAction href={`${base}/spreadsheets`} icon={Layers} label="Enter scores" hint="Open your grade sheets" />
          ) : null
        }
        nav={nav}
      >
        {yourClass}
        {yourSubjects}
      </TeachingPhone>

      <div className="mx-auto hidden max-w-6xl space-y-6 md:block">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">
              {new Date().toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              {greeting()}, <span className="capitalize">{firstName}</span>
            </h1>
            {roleLine && <p className="mt-1 text-sm text-slate-500">{roleLine}</p>}
          </div>
          {nav.has("spreadsheets") && (
            <Button asChild variant={isClassTeacher ? "outline" : "default"} className="h-11 rounded-xl px-5 font-semibold">
              <Link href={`${base}/spreadsheets`}>
                <Layers className="mr-2 h-4 w-4" /> Grade sheets
              </Link>
            </Button>
          )}
        </header>
        <div className={cn("grid items-start gap-6", isClassTeacher && "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]")}>
          {yourClass}
          {yourSubjects}
        </div>
      </div>
    </>
  );
}

function TeachingPhone({
  firstName,
  roleLine,
  primary,
  nav,
  children,
}: {
  firstName: string;
  roleLine: string;
  primary: React.ReactNode;
  nav: Map<string, { key: string; title: string; url: string; icon: HomeTool["icon"] }>;
  children: React.ReactNode;
}) {
  const menu = useOptionalMobileMenu();
  const inTabBar = new Set(menu?.config.tabs.map((tab) => tab.key) ?? []);
  const tools: HomeTool[] = TEACHING_TOOLS.filter((key) => nav.has(key) && !inTabBar.has(key))
    .slice(0, 5)
    .map((key) => {
      const item = nav.get(key)!;
      return { key, label: item.title, href: item.url, icon: item.icon };
    });

  return (
    <div className="space-y-7 md:hidden">
      <div className="space-y-4">
        <HomeGreeting name={firstName} detail={roleLine || undefined} />
        {primary}
      </div>
      {children}
      {tools.length > 0 && (
        <section>
          <SectionTitle>More tools</SectionTitle>
          <ToolGrid tools={tools} />
        </section>
      )}
    </div>
  );
}
