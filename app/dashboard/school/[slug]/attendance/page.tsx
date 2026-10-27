"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  Fingerprint,
  Loader2,
  RotateCw,
  ShoppingBag,
  Users,
  Search,
} from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { usePermissions } from "@/hooks/usePermissions";
import { apiFetch, isForbiddenError, type ApiFetchError } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  STATUS_META,
  STATUS_ORDER,
  attendanceQueries,
  dayLabel,
  localDay,
  saveRegister,
  type AttendanceStatus,
  type MyClasses,
} from "@/lib/attendance";
import { DataStateCard } from "@/components/dashboard/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The student register, with the two teaching roles kept apart:
 *  - Register: a Class Teacher takes (and corrects) the register for their
 *    own class; owners and admins can do it for any class.
 *  - My subjects: a Subject Teacher sees how the students taking their
 *    subject were marked, read only. They never take the register.
 * Someone who is both gets both, for the right classes.
 */

export default function AttendancePage() {
  const { isParent } = usePermissions();
  if (isParent) return <ParentAttendance />;
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-[320px] max-w-4xl rounded-2xl" />}>
      <StaffAttendance />
    </Suspense>
  );
}

// ── Staff ────────────────────────────────────────────────────────────────

type Mode = "register" | "subjects";

function StaffAttendance() {
  const { currentOrg } = useOrganization();
  const { isPrivileged } = usePermissions();
  const slug = currentOrg?.slug ?? "";
  // Teacher home links straight to one subject class: ?view=subjects&slot=classId:subjectId
  const params = useSearchParams();
  const [date, setDate] = useState(localDay());
  const [chosenMode, setMode] = useState<Mode | null>(params.get("view") === "subjects" ? "subjects" : null);
  const initialSlot = params.get("slot");

  const mine = useQuery({
    ...attendanceQueries.myClasses(slug, date),
    enabled: Boolean(slug),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });

  if (!currentOrg) return null;

  if (mine.isPending) {
    return (
      <div className="mx-auto max-w-4xl space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-[320px] w-full rounded-2xl" />
      </div>
    );
  }
  if (mine.isError || !mine.data) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 text-center">
        <DataStateCard variant={isForbiddenError(mine.error) ? "forbidden" : "error"} />
        <Button variant="outline" onClick={() => void mine.refetch()}>
          <RotateCw className="mr-2 h-4 w-4" /> Try again
        </Button>
      </div>
    );
  }

  const data = mine.data;
  const hasRegister = data.register.length > 0;
  const hasSubjects = data.subjects.length > 0;
  const mode: Mode = chosenMode ?? (hasRegister ? "register" : "subjects");

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-28 md:pb-10">
      <header className="hidden md:block">
        <h1 className="hidden text-2xl font-bold tracking-tight text-slate-900 md:block">Attendance</h1>
        <p className="max-w-2xl text-sm text-slate-600 md:mt-1 md:text-slate-500">{roleLine(data)}</p>
      </header>

      {hasRegister && hasSubjects && (
        <div role="group" aria-label="Attendance views" className="flex gap-1 rounded-xl bg-slate-100 p-1 md:max-w-sm">
          {(
            [
              { key: "register", label: "Register", icon: ClipboardCheck },
              { key: "subjects", label: "My subjects", icon: Eye },
            ] as const
          ).map((option) => (
            <button
              key={option.key}
              type="button"
              aria-pressed={mode === option.key}
              onClick={() => setMode(option.key)}
              className={cn(
                "flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-[background-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2",
                mode === option.key
                  ? "bg-white text-blue-700 shadow-[0_1px_2px_rgba(11,18,32,0.08),0_2px_6px_-2px_rgba(11,18,32,0.12)]"
                  : "text-slate-600 hover:text-slate-900",
              )}
            >
              <option.icon className="h-4 w-4" />
              {option.label}
            </button>
          ))}
        </div>
      )}

      {!hasRegister && !hasSubjects ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
          <CalendarDays className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm font-semibold text-slate-700">No classes to show</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
            {isPrivileged
              ? "Create classes first, then their registers appear here."
              : "You see attendance once you are a class teacher or teach a subject to a class."}
          </p>
        </div>
      ) : mode === "register" && hasRegister ? (
        <RegisterView slug={slug} data={data} date={date} onDate={setDate} />
      ) : (
        <SubjectsView slug={slug} data={data} date={date} onDate={setDate} initialSlot={initialSlot} />
      )}

      {/* A product note, not part of taking the register: kept off the phone task screen */}
      {isPrivileged && (
        <div className="hidden md:block">
          <BiometricCard />
        </div>
      )}
    </div>
  );
}

function roleLine(data: MyClasses) {
  if (data.canTakeAnyRegister) return "Take or correct the register for any class.";
  const classes = data.register.map((item) => item.className).join(", ");
  if (data.register.length && data.subjects.length) {
    return `You take the register for ${classes}. For the other classes you teach, you can see how your subject's students were marked.`;
  }
  if (data.register.length) return `You're the class teacher, so you take the register for ${classes}.`;
  return "You can see how the students you teach were marked. Only each class's class teacher takes the register.";
}

function DateField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/20">
      <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
      <span className="sr-only">Date</span>
      <input
        type="date"
        value={value}
        max={localDay()}
        onChange={(event) => event.target.value && onChange(event.target.value)}
        className="min-w-0 flex-1 bg-transparent text-base text-slate-900 outline-none md:text-sm"
      />
    </label>
  );
}

// ── Register (Class Teacher, admins) ─────────────────────────────────────

function RegisterView({
  slug,
  data,
  date,
  onDate,
}: {
  slug: string;
  data: MyClasses;
  date: string;
  onDate: (date: string) => void;
}) {
  const queryClient = useQueryClient();
  // Admins open on a class that actually has learners; landing on an empty
  // first class made the page look broken while 60 students sat in another.
  const [classId, setClassId] = useState(
    data.register.find((item) => item.students > 0)?.classLevelId ?? data.register[0]?.classLevelId ?? "",
  );
  const current = data.register.find((item) => item.classLevelId === classId) ?? data.register[0];
  const register = useQuery({
    ...attendanceQueries.register(slug, current.classLevelId, date),
    staleTime: 10_000,
  });
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({});
  const [saving, setSaving] = useState(false);

  // A new class or day starts from what was saved (everyone present if nothing was).
  const savedKey = `${current.classLevelId}:${date}:${register.dataUpdatedAt}`;
  const [loadedKey, setLoadedKey] = useState("");
  if (register.data && loadedKey !== savedKey) {
    setLoadedKey(savedKey);
    const saved = new Map(register.data.records.map((record) => [record.studentId, record.status]));
    setMarks(Object.fromEntries(register.data.students.map((student) => [student.id, saved.get(student.id) ?? "present"])));
  }

  const students = useMemo(
    () =>
      [...(register.data?.students ?? [])].sort(
        (a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName),
      ),
    [register.data],
  );
  // Big classes get a finder so a late arrival is two taps away, not a long scroll.
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const visibleStudents = needle
    ? students.filter((student) =>
        `${student.firstName} ${student.lastName} ${student.admissionNumber ?? ""}`.toLowerCase().includes(needle),
      )
    : students;
  const records = register.data?.records ?? [];
  const taken = records.length > 0;
  const takenBy = records.find((record) => record.markedBy?.user?.name)?.markedBy?.user?.name;
  const counts = STATUS_ORDER.map((status) => ({
    status,
    count: students.filter((student) => marks[student.id] === status).length,
  }));
  const savedStatuses = new Map(records.map((record) => [record.studentId, record.status]));
  const changed = students.some((student) => marks[student.id] !== (savedStatuses.get(student.id) ?? (taken ? undefined : "present")));
  const dirty = !taken || changed;

  async function save() {
    setSaving(true);
    try {
      const result = await saveRegister(slug, {
        date,
        classLevelId: current.classLevelId,
        records: students.map((student) => ({ studentId: student.id, status: marks[student.id] ?? "present" })),
      });
      toast.success(`${current.className} register saved`, {
        description: `${result.count} ${result.count === 1 ? "student" : "students"} · ${dayLabel(date)}`,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["attendance", "register", slug, current.classLevelId, date] }),
        queryClient.invalidateQueries({ queryKey: ["attendance", "mine", slug] }),
      ]);
    } catch (error) {
      toast.error((error as ApiFetchError).message || "Couldn't save the register. Nothing was changed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {data.register.length > 1 ? (
          <label className="flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/20">
            <Users className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="sr-only">Class</span>
            <select
              value={current.classLevelId}
              onChange={(event) => setClassId(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-base text-slate-900 outline-none md:text-sm"
            >
              {data.register.map((item) => (
                <option key={item.classLevelId} value={item.classLevelId}>
                  {item.className} · {item.taken.total > 0 ? "taken" : "not taken"}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-50 px-3 text-sm font-semibold text-blue-800">
            <ClipboardCheck className="h-4 w-4 shrink-0" />
            <span className="min-w-0 truncate">
              {data.canTakeAnyRegister ? "Class" : "Your class"}: {current.className}
            </span>
            <span className="ml-auto shrink-0 text-xs font-medium text-blue-700/80">
              {current.students} {current.students === 1 ? "student" : "students"}
            </span>
          </div>
        )}
        <DateField value={date} onChange={onDate} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          {taken ? (
            <>
              <CheckCircle2 className="mr-1 inline h-4 w-4 text-emerald-500" />
              Taken for {dayLabel(date).toLowerCase()}
              {takenBy ? ` by ${takenBy}` : ""}
              {changed ? " — you have unsaved changes" : ""}
            </>
          ) : (
            <>Not taken for {dayLabel(date).toLowerCase()} yet. Everyone starts as present; tap anyone who isn&apos;t.</>
          )}
        </p>
        {students.length > 0 && (
          <button
            type="button"
            onClick={() => setMarks(Object.fromEntries(students.map((student) => [student.id, "present" as const])))}
            className="-mx-2 min-h-11 rounded-lg px-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1"
          >
            Mark everyone present
          </button>
        )}
      </div>

      {register.isPending ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-[72px] w-full rounded-xl" />
          ))}
        </div>
      ) : register.isError ? (
        <DataStateCard
          variant={isForbiddenError(register.error) ? "forbidden" : "error"}
          title={isForbiddenError(register.error) ? "You don't take this class's register" : undefined}
        />
      ) : students.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
          <Users className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm font-semibold text-slate-700">No students in {current.className} yet</p>
        </div>
      ) : (
        <>
        {students.length > 12 && (
          <label className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/20">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Find a learner in ${current.className}`}
              aria-label="Find a learner"
              className="min-w-0 flex-1 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400 md:text-sm"
            />
          </label>
        )}
        {visibleStudents.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-8 text-center text-sm text-slate-600">
            No learner in {current.className} matches &ldquo;{query}&rdquo;.
          </p>
        ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white md:border-slate-200/70">
          {visibleStudents.map((student) => {
            const status = marks[student.id] ?? "present";
            return (
              <li key={student.id} className="flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold capitalize text-slate-900">
                    {student.firstName} {student.lastName}
                  </p>
                  {student.admissionNumber && <p className="truncate text-xs text-slate-500">{student.admissionNumber}</p>}
                </div>
                <div role="radiogroup" aria-label={`${student.firstName} ${student.lastName}`} className="grid grid-cols-4 gap-1.5 sm:w-[296px]">
                  {STATUS_ORDER.map((option) => {
                    const on = status === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setMarks((prev) => ({ ...prev, [student.id]: option }))}
                        className={cn(
                          "min-h-[44px] rounded-lg border text-xs font-semibold transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1 sm:pointer-fine:min-h-[36px]",
                          on ? STATUS_META[option].on : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                        )}
                      >
                        {STATUS_META[option].label}
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
        )}
        </>
      )}

      {students.length > 0 && (
        <div className="bottom-above-nav fixed inset-x-0 z-30 border-t border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
          <div className="mx-auto flex max-w-4xl items-center gap-3">
            <p className="min-w-0 flex-1 truncate text-sm text-slate-600">
              {counts
                .filter((item) => item.count > 0)
                .map((item) => `${item.count} ${STATUS_META[item.status].label.toLowerCase()}`)
                .join(" · ")}
            </p>
            <Button type="button" onClick={() => void save()} disabled={saving || !dirty} className="h-12 shrink-0 rounded-xl px-5 font-semibold md:h-11">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardCheck className="mr-2 h-4 w-4" />}
              {taken ? (changed ? "Save changes" : "Saved") : "Save register"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── My subjects (Subject Teacher, read only) ─────────────────────────────

function SubjectsView({
  slug,
  data,
  date,
  onDate,
  initialSlot,
}: {
  slug: string;
  data: MyClasses;
  date: string;
  onDate: (date: string) => void;
  initialSlot: string | null;
}) {
  const slots = data.subjects;
  const [slotKey, setSlotKey] = useState(
    initialSlot ?? (slots[0] ? `${slots[0].classLevelId}:${slots[0].subjectId}` : ""),
  );
  const slot = slots.find((item) => `${item.classLevelId}:${item.subjectId}` === slotKey) ?? slots[0];

  const view = useQuery({
    ...attendanceQueries.subject(slug, slot?.classLevelId ?? "", slot?.subjectId ?? "", date),
    enabled: Boolean(slot),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });

  if (!slot) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
        <BookOpen className="mx-auto h-8 w-8 text-slate-300" />
        <p className="mt-2 text-sm font-semibold text-slate-700">No subject classes outside your own</p>
        <p className="mt-1 text-xs text-slate-500">Your own class is under Register.</p>
      </div>
    );
  }

  const result = view.data;
  const teachers = result?.classTeachers ?? slot.classTeachers;

  return (
    <div className="space-y-4">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0" role="group" aria-label="Subject and class">
        {slots.map((item) => {
          const key = `${item.classLevelId}:${item.subjectId}`;
          const on = key === `${slot.classLevelId}:${slot.subjectId}`;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={on}
              onClick={() => setSlotKey(key)}
              className={cn(
                "min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2",
                on ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
              )}
            >
              {item.subjectName} · {item.className}
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
        {/* Says plainly why there is nothing to tap here. */}
        <div className="flex items-start gap-2.5 rounded-xl bg-slate-100 px-3.5 py-3 text-sm text-slate-700">
          <Eye className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
          <span>
            View only.{" "}
            {teachers.length
              ? `${teachers.join(" and ")} ${teachers.length === 1 ? "takes" : "take"} ${slot.className}'s register.`
              : `${slot.className} has no class teacher yet, so an admin takes its register.`}
          </span>
        </div>
        <div className="sm:w-56">
          <DateField value={date} onChange={onDate} />
        </div>
      </div>

      {view.isPending ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-[64px] w-full rounded-xl" />
          ))}
        </div>
      ) : view.isError || !result ? (
        <DataStateCard variant={isForbiddenError(view.error) ? "forbidden" : "error"} />
      ) : (
        <>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
            <p className="text-sm font-semibold text-slate-900">
              {result.students.length} {result.students.length === 1 ? "student" : "students"}
            </p>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-semibold",
                result.registerTaken
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-600",
              )}
            >
              {result.registerTaken ? "Register taken" : "Register not taken"}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {result.offeringFrom === "sheet"
              ? `From your ${result.subject.name} grade sheet for ${result.classLevel.name}.`
              : `${result.classLevel.name} is showing in full because ${result.subject.name} has no grade sheet yet.`}
          </p>
          {result.students.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
              <Users className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm font-semibold text-slate-700">No students yet</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white md:border-slate-200/70">
              {result.students.map((student) => {
                const missed = student.last30.absent;
                return (
                  <li key={student.id} className="flex min-h-[64px] items-center gap-3 px-4 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold capitalize text-slate-900">
                        {student.firstName} {student.lastName}
                      </span>
                      <span className={cn("block truncate text-xs", missed >= 3 ? "font-medium text-red-600" : "text-slate-500")}>
                        {student.last30.total === 0
                          ? "No register in the last 30 days"
                          : [
                              `${missed} ${missed === 1 ? "absence" : "absences"}`,
                              student.last30.late ? `${student.last30.late} late` : null,
                            ]
                              .filter(Boolean)
                              .join(" · ") + " in 30 days"}
                      </span>
                    </span>
                    {student.status ? (
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", STATUS_META[student.status].on)}>
                        {STATUS_META[student.status].label}
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        Not marked
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function BiometricCard() {
  return (
    <Card className="border-slate-200/70 bg-white shadow-none">
      <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50">
          <Fingerprint className="h-7 w-7 text-blue-600" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="text-base font-bold text-slate-900">Biometric clock-in for staff and students</h3>
          <p className="text-sm leading-6 text-slate-500">
            Tamper-proof arrival times that sync to Hanoled, and parents get an alert when their child arrives.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-11 shrink-0 rounded-xl"
          onClick={() => window.open("mailto:sales@hanoled.com?subject=Biometric Attendance Inquiry", "_blank")}
        >
          <ShoppingBag className="mr-2 h-4 w-4" />
          Ask about biometrics
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Parents ──────────────────────────────────────────────────────────────

type StudentAttendanceSummary = {
  student: { id: string; firstName: string; lastName: string; admissionNumber?: string; classLevel?: { id: string; name?: string | null } | null };
  stats: { total: number; present: number; absent: number; excused: number; late: number; attendanceRate: number };
  records: Array<{ id: string; date: string; status: AttendanceStatus; notes?: string | null }>;
};

function ParentAttendance() {
  const { currentOrg, currentMember } = useOrganization();
  const [childAttendance, setChildAttendance] = useState<StudentAttendanceSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Parents only see their own linked children's history, via the per-student endpoint.
  useEffect(() => {
    if (!currentOrg) return;
    const orgSlug = currentOrg.slug;
    let cancelled = false;
    async function fetchChildAttendance() {
      try {
        const studentIds = (currentMember?.assignedStudents || [])
          .map((s) => s.id)
          .filter((id): id is string => Boolean(id));
        const results = await Promise.all(
          studentIds.map((id) =>
            apiFetch<StudentAttendanceSummary>(`/attendance/${orgSlug}/student/${id}`).catch(() => null),
          ),
        );
        if (!cancelled) setChildAttendance(results.filter((r): r is StudentAttendanceSummary => r !== null));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void fetchChildAttendance();
    return () => {
      cancelled = true;
    };
  }, [currentOrg, currentMember]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="hidden text-xl font-bold tracking-tight text-slate-900 sm:text-2xl md:block">Attendance</h1>
        <p className="text-sm text-slate-600 md:text-base md:text-slate-500">Your children&apos;s attendance, day by day.</p>
      </div>

      {loading ? (
        <Skeleton className="h-32 w-full rounded-lg" />
      ) : childAttendance.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-white p-10 text-center">
          <CalendarDays className="h-10 w-10 text-slate-400" />
          <span className="text-base font-semibold text-slate-700">No attendance records yet</span>
          <span className="text-sm text-slate-500">Attendance for your child will appear here once the school records it.</span>
        </div>
      ) : (
        childAttendance.map((entry) => (
          <Card key={entry.student.id} className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">
                {entry.student.firstName} {entry.student.lastName}
              </CardTitle>
              <CardDescription>
                {entry.student.classLevel?.name || "—"} · {entry.student.admissionNumber}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline" className="gap-1 border-slate-200 px-2.5 py-1">
                  Attendance rate: {entry.stats.attendanceRate.toFixed(0)}%
                </Badge>
                {STATUS_ORDER.map((status) => {
                  const count = entry.stats[status];
                  if (!count) return null;
                  return (
                    <Badge key={status} variant="outline" className="gap-1.5 border-slate-200 px-2.5 py-1">
                      <span className={cn("h-2 w-2 rounded-full", STATUS_META[status].dot)} aria-hidden="true" />
                      {STATUS_META[status].label}: {count}
                    </Badge>
                  );
                })}
              </div>
              <div className="mt-4 space-y-1.5">
                {entry.records.slice(0, 10).map((r) => (
                  <div key={r.id} className="flex items-center justify-between border-b border-slate-100 py-1.5 text-sm text-slate-600 last:border-0">
                    <span>{new Date(r.date).toLocaleDateString()}</span>
                    <span className="font-medium capitalize">{r.status}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
