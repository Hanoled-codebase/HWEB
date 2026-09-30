"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Search, UserRound, Users } from "lucide-react";
import { cbtApi } from "@/lib/api-cbt";
import { toTitleCase } from "@/lib/utils";
import { ResetPasswordButton } from "@/components/dashboard/ResetPasswordButton";

type Staff = { personId: string; name: string; email: string | null; roles: string[] };
type Student = { id: string; firstName: string; lastName: string; admissionNumber: string };
type ClassRow = { id: string; name: string };

const ROLE_LABEL: Record<string, string> = {
  CBT_ADMIN: "CBT admin",
  EXAMINER: "Examiner",
  TEACHER: "Examiner",
  INVIGILATOR: "Invigilator",
  RESULT_VIEWER: "Result viewer",
};

const resetButtonClass =
  "h-9 shrink-0 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-[#0B1220] hover:border-[#1447E6]/40 hover:text-[#1447E6]";

/**
 * Sign-in help for an HCBT-only school, which has no school-management
 * dashboard: an admin gives a student or staff member a temporary password
 * (shown once) that they replace at their next sign-in. The reset happens in
 * HCORE, which also keeps administrators' accounts for the owner alone.
 */
export default function AccountsTab({ orgSlug }: { orgSlug: string }) {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classId, setClassId] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([cbtApi.getAccounts(orgSlug), cbtApi.getClasses(orgSlug)])
      .then(([accounts, classList]) => {
        if (cancelled) return;
        setOrganizationId(accounts.organizationId);
        setStaff(accounts.staff);
        setClasses(Array.isArray(classList) ? classList : []);
      })
      .catch(() => !cancelled && setError("Couldn't load this school's accounts. Check your connection and try again."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [orgSlug]);

  // The class most recently chosen: a slower answer for an earlier choice must not replace its list.
  const latestClass = useRef("");
  const chooseClass = (id: string) => {
    latestClass.current = id;
    setClassId(id);
    setStudents([]);
    setLoadingStudents(Boolean(id));
    if (!id) return;
    cbtApi
      .getTeacherStudents(orgSlug, id)
      .then((list: Student[]) => latestClass.current === id && setStudents(Array.isArray(list) ? list : []))
      .catch(() => undefined)
      .finally(() => latestClass.current === id && setLoadingStudents(false));
  };

  const needle = query.trim().toLowerCase();
  const shownStudents = useMemo(
    () =>
      students.filter((s) =>
        !needle || `${s.firstName} ${s.lastName} ${s.admissionNumber}`.toLowerCase().includes(needle),
      ),
    [students, needle],
  );
  const shownStaff = useMemo(
    () => staff.filter((s) => !needle || `${s.name} ${s.email || ""}`.toLowerCase().includes(needle)),
    [staff, needle],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin text-[#1447E6]" /> Loading accounts…
      </div>
    );
  }
  if (error || !organizationId) {
    return (
      <p role="alert" className="m-page rounded-2xl border border-[#F04438]/30 bg-[#F04438]/10 p-4 text-sm text-[#F04438]">
        {error || "Couldn't load this school's accounts."}
      </p>
    );
  }

  return (
    <div className="m-page space-y-6">
      <div>
        <h3 className="text-base font-bold text-[#0B1220]">Sign-in help</h3>
        <p className="mt-1 text-sm text-slate-500">
          Forgotten password or locked out? Give the person a temporary password. They must choose their own the next
          time they sign in. Only the school owner can reset another admin.
        </p>
      </div>

      <label className="relative block max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, admission number or email"
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-[#0B1220] focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/20"
        />
      </label>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h4 className="flex items-center gap-2 text-sm font-bold text-[#0B1220]">
            <Users className="h-4 w-4 text-[#1447E6]" /> Students
          </h4>
          <select
            value={classId}
            onChange={(e) => chooseClass(e.target.value)}
            aria-label="Class"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-[#0B1220] focus:border-[#1447E6] focus:outline-none"
          >
            <option value="">Choose a class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {!classId ? (
          <p className="mt-4 text-sm text-slate-500">Choose a class to see its students.</p>
        ) : loadingStudents ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading students…
          </p>
        ) : shownStudents.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">{needle ? "No student matches your search." : "No students in this class."}</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {shownStudents.map((s) => {
              const name = `${toTitleCase(s.lastName)} ${toTitleCase(s.firstName)}`.trim();
              return (
                <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#0B1220]">{name}</p>
                    <p className="font-mono text-xs text-slate-500">{s.admissionNumber}</p>
                  </div>
                  <ResetPasswordButton
                    orgId={organizationId}
                    target={{ learnerId: s.id }}
                    personName={name}
                    signInHint={`their admission number (${s.admissionNumber})`}
                    className={resetButtonClass}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <h4 className="flex items-center gap-2 text-sm font-bold text-[#0B1220]">
          <UserRound className="h-4 w-4 text-[#1447E6]" /> Staff
        </h4>
        {shownStaff.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">{needle ? "No staff member matches your search." : "No staff accounts yet."}</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {shownStaff.map((s) => (
              <li key={s.personId} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#0B1220]">{s.name}</p>
                  <p className="truncate text-xs text-slate-500">
                    {[...new Set(s.roles.map((role) => ROLE_LABEL[role] || role))].join(", ")}
                    {s.email ? ` · ${s.email}` : ""}
                  </p>
                </div>
                <ResetPasswordButton
                  orgId={organizationId}
                  target={{ personId: s.personId }}
                  personName={s.name}
                  signInHint={s.email ? `their email (${s.email})` : undefined}
                  className={resetButtonClass}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
