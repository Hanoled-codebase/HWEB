"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Loader2, RotateCcw, RotateCw, Search, ShieldCheck, UsersRound, X } from "lucide-react";
import { toast } from "sonner";
import { useOrganization } from "@/hooks/useOrganization";
import { usePermissions } from "@/hooks/usePermissions";
import { useIsMobile } from "@/hooks/use-mobile";
import { isForbiddenError, type ApiFetchError } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  ADMIN_ROLE_CODES,
  DUTY_ROLES,
  staffAccessApi,
  type DutyRole,
  type Department,
  type DepartmentsView,
  type RolePolicy,
  type SchoolSubject,
  type StaffMember,
} from "@/lib/staff-access";
import { DataStateCard } from "@/components/dashboard/shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { greetingName } from "@/lib/greeting-name";

type View = "people" | "permissions" | "departments";

export default function StaffAccessPage() {
  const { currentOrg } = useOrganization();
  const { isPrivileged } = usePermissions();
  const [view, setView] = useState<View>("people");

  if (!currentOrg) return null;
  if (!isPrivileged) {
    return (
      <div className="mx-auto max-w-3xl">
        <DataStateCard variant="forbidden" description="Only the school's owners and admins manage staff access." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header>
        <h1 className="hidden text-2xl font-bold tracking-tight text-slate-900 md:block">Staff access</h1>
        <p className="max-w-2xl text-sm text-slate-600 md:mt-1 md:text-slate-500">
          Give staff extra roles on top of their teaching — a class teacher can also keep the bursary — decide
          what each role can do, and set up the departments your HODs lead.
        </p>
      </header>

      <div role="group" aria-label="Staff access views" className="flex gap-1 rounded-xl bg-slate-100 p-1 md:max-w-md">
        {(
          [
            { key: "people", label: "People" },
            { key: "permissions", label: "Permissions" },
            { key: "departments", label: "Departments" },
          ] as const
        ).map((option) => (
          <button
            key={option.key}
            type="button"
            aria-pressed={view === option.key}
            onClick={() => setView(option.key)}
            className={cn(
              "min-h-[44px] flex-1 rounded-lg px-3 text-sm font-semibold transition-[background-color,color,box-shadow] duration-150",
              view === option.key
                ? "bg-white text-blue-700 shadow-[0_1px_2px_rgba(11,18,32,0.08),0_2px_6px_-2px_rgba(11,18,32,0.12)]"
                : "text-slate-600 hover:text-slate-900",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {view === "people" ? (
        <PeopleView orgId={currentOrg.id} slug={currentOrg.slug} />
      ) : view === "permissions" ? (
        <PermissionsView slug={currentOrg.slug} />
      ) : (
        <DepartmentsManager slug={currentOrg.slug} />
      )}
    </div>
  );
}

// ── Who does what ────────────────────────────────────────────────────────

const ROLE_FILTERS: Array<{ key: "all" | DutyRole; label: string }> = [
  { key: "all", label: "All staff" },
  { key: "ACCOUNTANT", label: "Accountants" },
  { key: "LIBRARIAN", label: "Librarians" },
  { key: "HOD", label: "HODs" },
];

function isAdmin(member: StaffMember) {
  return member.roles.some((role) => ADMIN_ROLE_CODES.has(role));
}

function teachingSummary(member: StaffMember) {
  const classTeacher = member.teaching.filter((item) => item.type === "CLASS_TEACHER").map((item) => item.className);
  const subjects = new Set(member.teaching.filter((item) => item.type !== "CLASS_TEACHER").map((item) => item.subjectName).filter(Boolean));
  const parts: string[] = [];
  if (classTeacher.length) parts.push(`Class teacher, ${classTeacher.join(", ")}`);
  if (subjects.size) parts.push(`Teaches ${[...subjects].join(", ")}`);
  if (!parts.length && member.roles.includes("TEACHER")) parts.push("Teacher");
  return parts.join(" · ");
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

function PeopleView({ orgId, slug }: { orgId: string; slug: string }) {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | DutyRole>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const queryKey = ["staff-access", "staff", orgId];
  const query = useQuery({ queryKey, queryFn: () => staffAccessApi.listStaff(orgId), staleTime: 30_000 });
  const staff = useMemo(() => query.data?.staff ?? [], [query.data]);
  const selected = staff.find((member) => member.affiliationId === selectedId) ?? null;

  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return staff.filter((member) => {
      if (filter !== "all" && !member.roles.includes(filter)) return false;
      if (!needle) return true;
      return member.name.toLowerCase().includes(needle) || (member.email ?? "").toLowerCase().includes(needle);
    });
  }, [staff, search, filter]);

  function updateMember(affiliationId: string, roles: string[]) {
    queryClient.setQueryData<{ staff: StaffMember[] }>(queryKey, (current) =>
      current
        ? { staff: current.staff.map((member) => (member.affiliationId === affiliationId ? { ...member, roles } : member)) }
        : current,
    );
  }

  if (query.isPending) {
    return (
      <div className="space-y-2" aria-busy="true">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-[68px] w-full rounded-xl" />
        ))}
      </div>
    );
  }
  if (query.isError) {
    return (
      <div className="space-y-4 text-center">
        <DataStateCard variant={isForbiddenError(query.error) ? "forbidden" : "error"} />
        {!isForbiddenError(query.error) && (
          <Button variant="outline" onClick={() => void query.refetch()}>
            <RotateCw className="mr-2 h-4 w-4" /> Try again
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <label className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/20">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="sr-only">Search staff</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Find a staff member"
            className="min-w-0 flex-1 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400 md:text-sm"
          />
        </label>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0" role="group" aria-label="Filter by role">
          {ROLE_FILTERS.map((option) => {
            const count =
              option.key === "all" ? staff.length : staff.filter((member) => member.roles.includes(option.key)).length;
            return (
              <button
                key={option.key}
                type="button"
                aria-pressed={filter === option.key}
                onClick={() => setFilter(option.key)}
                className={cn(
                  "min-h-[40px] shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors",
                  filter === option.key
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                )}
              >
                {option.label} <span className={filter === option.key ? "text-white/80" : "text-slate-400"}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
          <UsersRound className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm font-semibold text-slate-700">
            {staff.length === 0 ? "No staff yet" : filter !== "all" && !search ? `No ${ROLE_FILTERS.find((f) => f.key === filter)?.label.toLowerCase()} yet` : "Nobody matches"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {staff.length === 0
              ? "Add teachers first; then you can give any of them an extra role here."
              : filter !== "all" && !search
                ? "Open a staff member and switch the role on."
                : "Try another name."}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white md:border-slate-200/70">
          {shown.map((member) => {
            const duties = DUTY_ROLES.filter((role) => member.roles.includes(role.code));
            const admin = isAdmin(member);
            const summary = teachingSummary(member);
            return (
              <li key={member.affiliationId}>
                <button
                  type="button"
                  onClick={() => setSelectedId(member.affiliationId)}
                  className="flex min-h-[72px] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 active:bg-slate-50"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                    {initials(member.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold capitalize text-slate-900">{member.name}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5">
                      {admin && (
                        <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">Admin</span>
                      )}
                      {duties.map((role) => (
                        <span key={role.code} className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                          {role.code === "HOD" ? "HOD" : role.label}
                        </span>
                      ))}
                      {summary && <span className="truncate text-xs text-slate-500">{summary}</span>}
                      {!admin && duties.length === 0 && !summary && <span className="text-xs text-slate-500">Staff</span>}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          showCloseButton={false}
          className={cn(
            "gap-0 bg-slate-50 p-0",
            isMobile ? "max-h-[88dvh] rounded-t-[28px] border-t-0" : "w-full sm:max-w-[420px]",
          )}
        >
          {selected && (
            <RoleEditor
              key={selected.affiliationId}
              member={selected}
              orgId={orgId}
              slug={slug}
              onChange={updateMember}
              onClose={() => setSelectedId(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function RoleEditor({
  member,
  orgId,
  slug,
  onChange,
  onClose,
}: {
  member: StaffMember;
  orgId: string;
  slug: string;
  onChange: (affiliationId: string, roles: string[]) => void;
  onClose: () => void;
}) {
  const [pending, setPending] = useState<DutyRole | null>(null);
  const [confirmLast, setConfirmLast] = useState<DutyRole | null>(null);
  const admin = isAdmin(member);
  const firstName = greetingName(member.name) || member.name;
  const summary = teachingSummary(member);

  async function toggle(role: DutyRole, grant: boolean, confirmed = false) {
    // Removing someone's only role here would also end their access to the school.
    const remaining = member.roles.filter((code) => code !== role);
    if (!grant && !confirmed && remaining.length === 0) {
      setConfirmLast(role);
      return;
    }
    setConfirmLast(null);
    setPending(role);
    const label = DUTY_ROLES.find((item) => item.code === role)!.label;
    try {
      const result = await staffAccessApi.setRole(orgId, member.affiliationId, role, grant);
      // Wait for HSMS to take the new role on board, so a new HOD can be
      // given a department straight away.
      await staffAccessApi.refreshProjection(slug, member.affiliationId);
      onChange(
        member.affiliationId,
        result.roles.filter((item) => item.productCode === "CORE" || item.productCode === "HSMS").map((item) => item.roleCode),
      );
      toast.success(grant ? `${firstName} is now ${role === "ACCOUNTANT" ? "an" : "a"} ${label}` : `${label} role removed from ${firstName}`, {
        description: "It takes effect the next time they open Hanoled.",
      });
    } catch (error) {
      toast.error((error as ApiFetchError).message || "Couldn't change the role. Nothing was changed.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex max-h-full flex-col overflow-hidden">
      <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-slate-300 md:hidden" aria-hidden="true" />
      <div className="flex items-start gap-3 px-5 pb-4 pt-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">
          {initials(member.name)}
        </span>
        <div className="min-w-0 flex-1">
          <SheetTitle className="truncate text-lg font-bold capitalize text-slate-900">{member.name}</SheetTitle>
          <SheetDescription className="truncate text-sm text-slate-500">{member.email || "No email on record"}</SheetDescription>
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

      <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 pb-safe">
        {summary && (
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Teaching</h3>
            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <p className="text-sm text-slate-700">{summary}</p>
              <Link
                href={`/dashboard/school/${slug}/teachers`}
                className="mt-2 inline-flex min-h-[36px] items-center text-sm font-semibold text-blue-700"
              >
                Change classes and subjects in Teachers
              </Link>
            </div>
          </section>
        )}

        <section className="pb-6">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Extra roles</h3>
          {admin ? (
            <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-600">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
              {firstName} is a school admin and can already do everything, including the bursary and the library.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white">
              {DUTY_ROLES.map((role) => {
                const held = member.roles.includes(role.code);
                const busy = pending === role.code;
                return (
                  <li key={role.code} className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p id={`role-${role.code}`} className="text-sm font-semibold text-slate-900">
                          {role.label}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">{role.description}</p>
                      </div>
                      {busy ? (
                        <Loader2 className="h-5 w-5 animate-spin text-blue-600" aria-label="Saving" />
                      ) : (
                        <Switch
                          checked={held}
                          disabled={pending !== null}
                          aria-labelledby={`role-${role.code}`}
                          onCheckedChange={(checked) => void toggle(role.code, checked)}
                        />
                      )}
                    </div>
                    {role.code === "HOD" && held && !busy && <LeadsPicker member={member} slug={slug} />}
                    {confirmLast === role.code && (
                      <div className="mt-3 rounded-xl bg-red-50 p-3" role="alert">
                        <p className="text-sm text-red-700">
                          This is {firstName}&apos;s only role here. Removing it ends their access to the school.
                        </p>
                        <div className="mt-2 flex gap-2">
                          <Button variant="outline" onClick={() => setConfirmLast(null)} className="h-10 rounded-lg bg-white">
                            Keep it
                          </Button>
                          <Button variant="destructive" onClick={() => void toggle(role.code, false, true)} className="h-10 rounded-lg">
                            Remove access
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-3 text-xs text-slate-500">
            What each role can do is set under <span className="font-semibold">Permissions</span>.
          </p>
        </section>
      </div>
    </div>
  );
}

/** The departments an HOD leads: chips to pick, saved together. */
function LeadsPicker({ member, slug }: { member: StaffMember; slug: string }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["staff-access", "departments", slug],
    queryFn: () => staffAccessApi.departments(slug),
    staleTime: 30_000,
  });
  const current = useMemo(
    () =>
      (query.data?.departments ?? [])
        .filter((department) => department.heads.some((head) => head.affiliationId === member.affiliationId))
        .map((department) => department.id),
    [query.data, member.affiliationId],
  );
  const [draft, setDraft] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const chosen = draft ?? current;
  const dirty = draft !== null && !sameSet(draft, current);
  const firstName = greetingName(member.name) || member.name;

  async function save() {
    setSaving(true);
    try {
      await staffAccessApi.setHodDepartments(slug, member.affiliationId, chosen);
      await queryClient.invalidateQueries({ queryKey: ["staff-access", "departments", slug] });
      setDraft(null);
      toast.success(chosen.length ? `${firstName} now leads ${chosen.length} ${chosen.length === 1 ? "department" : "departments"}` : `${firstName} leads no department`);
    } catch (error) {
      toast.error((error as ApiFetchError).message || "Couldn't save. Nothing was changed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 rounded-xl bg-slate-50 p-3">
      <p className="text-xs font-semibold text-slate-700">Leads</p>
      {query.isPending ? (
        <Skeleton className="mt-2 h-9 w-full rounded-lg" />
      ) : (query.data?.departments.length ?? 0) === 0 ? (
        <p className="mt-1 text-xs text-slate-500">
          No departments yet. Create them under <span className="font-semibold">Departments</span>, then come back here.
        </p>
      ) : (
        <>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={`Departments ${firstName} leads`}>
            {query.data!.departments.map((department) => {
              const on = chosen.includes(department.id);
              return (
                <button
                  key={department.id}
                  type="button"
                  aria-pressed={on}
                  disabled={saving}
                  onClick={() => setDraft(on ? chosen.filter((id) => id !== department.id) : [...chosen, department.id])}
                  className={cn(
                    "min-h-[40px] rounded-full border px-3.5 text-sm font-semibold transition-colors",
                    on ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                  )}
                >
                  {department.name}
                </button>
              );
            })}
          </div>
          {chosen.length === 0 && !dirty && (
            <p className="mt-2 text-xs text-amber-700">Pick a department, or {firstName} will have nothing to oversee.</p>
          )}
          {dirty && (
            <div className="mt-3 flex gap-2">
              <Button variant="outline" onClick={() => setDraft(null)} disabled={saving} className="h-10 rounded-lg bg-white">
                Undo
              </Button>
              <Button onClick={() => void save()} disabled={saving} className="h-10 flex-1 rounded-lg font-semibold">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save departments
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Departments ──────────────────────────────────────────────────────────

function DepartmentsManager({ slug }: { slug: string }) {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const queryKey = ["staff-access", "departments", slug];
  const query = useQuery({ queryKey, queryFn: () => staffAccessApi.departments(slug), staleTime: 30_000 });
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const data = query.data;
  const open = data?.departments.find((department) => department.id === openId) ?? null;
  const unassigned = data?.subjects.filter((subject) => !subject.departmentId).length ?? 0;

  async function create(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) return;
    setCreating(true);
    try {
      const created = await staffAccessApi.createDepartment(slug, trimmed);
      await queryClient.invalidateQueries({ queryKey });
      setName("");
      setOpenId(created.id);
    } catch (error) {
      toast.error((error as ApiFetchError).message || "Couldn't create the department.");
    } finally {
      setCreating(false);
    }
  }

  if (query.isPending) {
    return (
      <div className="space-y-2" aria-busy="true">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[84px] w-full rounded-xl" />
        ))}
      </div>
    );
  }
  if (query.isError || !data) {
    return (
      <div className="space-y-4 text-center">
        <DataStateCard variant={isForbiddenError(query.error) ? "forbidden" : "error"} />
        <Button variant="outline" onClick={() => void query.refetch()}>
          <RotateCw className="mr-2 h-4 w-4" /> Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <form onSubmit={create} className="flex gap-2">
        <label className="flex h-12 min-w-0 flex-1 items-center rounded-xl border border-slate-200 bg-white px-3.5 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/20 md:h-11">
          <span className="sr-only">New department name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={60}
            placeholder="New department, e.g. Sciences"
            className="min-w-0 flex-1 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400 md:text-sm"
          />
        </label>
        <Button type="submit" disabled={creating || name.trim().length < 2} className="h-12 rounded-xl px-5 font-semibold md:h-11">
          {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add
        </Button>
      </form>

      {unassigned > 0 && data.departments.length > 0 && (
        <p className="text-sm text-slate-500">
          {unassigned} {unassigned === 1 ? "subject is" : "subjects are"} not in any department yet.
        </p>
      )}

      {data.departments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
          <UsersRound className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm font-semibold text-slate-700">No departments yet</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
            Group subjects into departments (Sciences, Languages…). Each HOD then sees their department&apos;s classes,
            score sheets and teachers.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white md:border-slate-200/70">
          {data.departments.map((department) => (
            <li key={department.id}>
              <button
                type="button"
                onClick={() => setOpenId(department.id)}
                className="flex min-h-[76px] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 active:bg-slate-50"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-900">{department.name}</span>
                  <span className="mt-0.5 block truncate text-xs text-slate-500">
                    {department.heads.length ? `Led by ${department.heads.map((head) => head.name).join(", ")}` : "No HOD yet"}
                    {" · "}
                    {department.subjects.length
                      ? department.subjects.map((subject) => subject.name).join(", ")
                      : "no subjects yet"}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={Boolean(open)} onOpenChange={(value) => !value && setOpenId(null)}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          showCloseButton={false}
          className={cn("gap-0 bg-slate-50 p-0", isMobile ? "max-h-[88dvh] rounded-t-[28px] border-t-0" : "w-full sm:max-w-[420px]")}
        >
          {open && (
            <DepartmentEditor
              key={open.id}
              department={open}
              subjects={data.subjects}
              departments={data.departments}
              slug={slug}
              onSaved={(view) => queryClient.setQueryData(queryKey, view)}
              onDeleted={async () => {
                setOpenId(null);
                await queryClient.invalidateQueries({ queryKey });
              }}
              onClose={() => setOpenId(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function DepartmentEditor({
  department,
  subjects,
  departments,
  slug,
  onSaved,
  onDeleted,
  onClose,
}: {
  department: Department;
  subjects: SchoolSubject[];
  departments: Department[];
  slug: string;
  onSaved: (view: DepartmentsView) => void;
  onDeleted: () => void | Promise<void>;
  onClose: () => void;
}) {
  const current = department.subjects.map((subject) => subject.id);
  const [chosen, setChosen] = useState<string[]>(current);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dirty = !sameSet(chosen, current);
  const nameOf = new Map(departments.map((item) => [item.id, item.name]));

  async function save() {
    setSaving(true);
    try {
      const view = await staffAccessApi.setDepartmentSubjects(slug, department.id, chosen);
      onSaved(view);
      toast.success(`${department.name} now has ${chosen.length} ${chosen.length === 1 ? "subject" : "subjects"}`);
    } catch (error) {
      toast.error((error as ApiFetchError).message || "Couldn't save. Nothing was changed.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setSaving(true);
    try {
      await staffAccessApi.deleteDepartment(slug, department.id);
      toast.success(`${department.name} removed`);
      await onDeleted();
    } catch (error) {
      toast.error((error as ApiFetchError).message || "Couldn't remove the department.");
      setSaving(false);
    }
  }

  return (
    <div className="flex max-h-full flex-col overflow-hidden">
      <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-slate-300 md:hidden" aria-hidden="true" />
      <div className="flex items-start gap-3 px-5 pb-3 pt-4">
        <div className="min-w-0 flex-1">
          <SheetTitle className="truncate text-lg font-bold text-slate-900">{department.name}</SheetTitle>
          <SheetDescription className="text-sm text-slate-500">
            {department.heads.length ? `Led by ${department.heads.map((head) => head.name).join(", ")}` : "No HOD yet — pick one under People"}
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

      <div className="flex-1 overflow-y-auto overscroll-contain px-5">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Subjects in this department</h3>
        {subjects.length === 0 ? (
          <p className="rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-500">This school has no subjects yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white">
            {subjects.map((subject) => {
              const on = chosen.includes(subject.id);
              const elsewhere = subject.departmentId && subject.departmentId !== department.id ? nameOf.get(subject.departmentId) : null;
              return (
                <li key={subject.id}>
                  <label className="flex min-h-[56px] cursor-pointer items-center gap-3 px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={saving}
                      onChange={() => setChosen(on ? chosen.filter((id) => id !== subject.id) : [...chosen, subject.id])}
                      className="h-5 w-5 shrink-0 accent-blue-600"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900">{subject.name}</span>
                      {elsewhere && (
                        <span className="block text-xs text-slate-500">
                          {on ? `Moves here from ${elsewhere}` : `In ${elsewhere}`}
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}

        <div className="py-6">
          {confirmDelete ? (
            <div className="rounded-xl bg-red-50 p-3" role="alert">
              <p className="text-sm text-red-700">
                Remove {department.name}? Its subjects stay; they just leave the department, and its HODs stop leading it.
              </p>
              <div className="mt-2 flex gap-2">
                <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={saving} className="h-10 rounded-lg bg-white">
                  Keep it
                </Button>
                <Button variant="destructive" onClick={() => void remove()} disabled={saving} className="h-10 rounded-lg">
                  Remove department
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="min-h-[44px] text-sm font-semibold text-red-600"
            >
              Remove this department
            </button>
          )}
        </div>
      </div>

      {dirty && (
        <div className="shrink-0 border-t border-slate-200/80 bg-white px-5 pb-safe pt-3">
          <div className="flex gap-2 pb-3">
            <Button variant="outline" onClick={() => setChosen(current)} disabled={saving} className="h-12 rounded-xl px-5">
              Undo
            </Button>
            <Button onClick={() => void save()} disabled={saving} className="h-12 flex-1 rounded-xl font-semibold">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save subjects
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── What roles can do ────────────────────────────────────────────────────

function sameSet(a: string[], b: string[]) {
  return a.length === b.length && a.every((item) => b.includes(item));
}

function PermissionsView({ slug }: { slug: string }) {
  const queryClient = useQueryClient();
  const queryKey = ["staff-access", "policies", slug];
  const query = useQuery({ queryKey, queryFn: () => staffAccessApi.policies(slug), staleTime: 30_000 });
  const [roleCode, setRoleCode] = useState("ACCOUNTANT");
  const [drafts, setDrafts] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  if (query.isPending) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-[360px] w-full rounded-2xl" />
      </div>
    );
  }
  if (query.isError || !query.data) {
    return (
      <div className="space-y-4 text-center">
        <DataStateCard variant={isForbiddenError(query.error) ? "forbidden" : "error"} />
        <Button variant="outline" onClick={() => void query.refetch()}>
          <RotateCw className="mr-2 h-4 w-4" /> Try again
        </Button>
      </div>
    );
  }

  const { groups, roles } = query.data;
  const role = roles.find((item) => item.code === roleCode) ?? roles[0];
  const draft = drafts[role.code] ?? role.capabilities;
  const dirty = !sameSet(draft, role.capabilities);
  const matchesDefaults = sameSet(draft, role.defaults);

  function setDraft(next: string[]) {
    setDrafts((current) => ({ ...current, [role.code]: next }));
  }

  async function save(capabilities: string[]) {
    setSaving(true);
    try {
      const saved = await staffAccessApi.savePolicy(slug, role.code, capabilities);
      queryClient.setQueryData<{ groups: typeof groups; roles: RolePolicy[] }>(queryKey, (current) =>
        current ? { ...current, roles: current.roles.map((item) => (item.code === saved.code ? saved : item)) } : current,
      );
      setDrafts((current) => {
        const next = { ...current };
        delete next[role.code];
        return next;
      });
      toast.success(`${role.label} permissions saved`, {
        description: "Staff with this role see the change the next time they open Hanoled.",
      });
    } catch (error) {
      toast.error((error as ApiFetchError).message || "Couldn't save. Nothing was changed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-5 pb-28 md:grid-cols-[220px_1fr] md:pb-0">
      {/* Roles: a scrolling chip row on phones, a list beside the panel on desktop */}
      <nav aria-label="Roles" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-col md:gap-1 md:overflow-visible md:px-0">
        {roles.map((item) => {
          const selected = item.code === role.code;
          const changed = drafts[item.code] && !sameSet(drafts[item.code], item.capabilities);
          return (
            <button
              key={item.code}
              type="button"
              aria-current={selected ? "true" : undefined}
              onClick={() => setRoleCode(item.code)}
              className={cn(
                "flex min-h-[44px] shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors md:rounded-xl md:border-0 md:px-3 md:text-left",
                selected
                  ? "border-blue-600 bg-blue-600 text-white md:bg-blue-50 md:text-blue-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 md:bg-transparent md:hover:bg-slate-100",
              )}
            >
              <span className="md:flex-1">{item.label}</span>
              {(item.customized || changed) && (
                <span
                  className={cn("h-1.5 w-1.5 rounded-full", selected ? "bg-white md:bg-blue-600" : "bg-blue-600")}
                  aria-label={changed ? "Unsaved changes" : "Changed from the default"}
                />
              )}
            </button>
          );
        })}
      </nav>

      <section className="min-w-0 rounded-2xl border border-slate-100 bg-white md:border-slate-200/70">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-5">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900">{role.label}</h2>
            <p className="mt-0.5 text-sm text-slate-500">{role.description}</p>
          </div>
          {!matchesDefaults && (
            <button
              type="button"
              onClick={() => setDraft(role.defaults)}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
            >
              <RotateCcw className="h-4 w-4" /> Back to default
            </button>
          )}
        </header>

        {groups.map((group) => (
          <fieldset key={group.key} className="border-b border-slate-100 px-5 py-4 last:border-b-0">
            <legend className="sr-only">{group.label}</legend>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500" aria-hidden="true">
              {group.label}
            </p>
            <ul>
              {group.capabilities.map((capability) => {
                const on = draft.includes(capability.key);
                const isDefault = role.defaults.includes(capability.key);
                const differs = on !== isDefault;
                return (
                  <li key={capability.key} className="flex items-center gap-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p id={`cap-${capability.key}`} className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
                        {capability.label}
                        {differs && (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                            {on ? "Added" : "Removed"}
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">{capability.description}</p>
                    </div>
                    <Switch
                      checked={on}
                      disabled={saving}
                      aria-labelledby={`cap-${capability.key}`}
                      onCheckedChange={(checked) =>
                        setDraft(checked ? [...draft, capability.key] : draft.filter((key) => key !== capability.key))
                      }
                    />
                  </li>
                );
              })}
            </ul>
          </fieldset>
        ))}

        <p className="border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
          Teaching work (registers, scores, homework) follows each teacher&apos;s classes and subjects. Owners and admins
          can always do everything.
        </p>
      </section>

      {/* Save bar: at the thumb on phones, under the panel on desktop. Only while there is something to save. */}
      {dirty && (
        <div className="bottom-above-nav fixed inset-x-0 z-30 border-t border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur md:static md:col-start-2 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
          <div className="mx-auto flex max-w-4xl items-center gap-2 md:justify-end">
            <Button
              variant="outline"
              onClick={() => setDraft(role.capabilities)}
              disabled={saving}
              className="h-12 rounded-xl px-5 md:h-11"
            >
              Discard
            </Button>
            <Button onClick={() => void save(draft)} disabled={saving} className="h-12 flex-1 rounded-xl font-semibold md:h-11 md:flex-none md:px-6">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save {role.label} permissions
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
