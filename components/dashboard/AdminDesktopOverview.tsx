"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  Bus,
  Building,
  Building2,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  GraduationCap,
  Heart,
  HelpCircle,
  Library,
  LifeBuoy,
  Plus,
  Receipt,
  ScrollText,
  Settings,
  Stethoscope,
  Table2,
  Ticket,
  ToggleLeft,
  UserCog,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useSchoolNavItems } from "@/hooks/useSchoolNavItems";
import { cn } from "@/lib/utils";

/**
 * Desktop overview for owners and admins (md and up): welcome banner, pending-invites alert,
 * key numbers, school profile + finance snapshot, and a launcher for everything the sidebar
 * leaves out. Numbers that need a request (invites, attendance, debt) are fetched here and
 * shown as "—" or hidden when there is nothing real to show; nothing is placeholder data.
 */

type OverviewStat = { key: string; title: string; value: string | number; icon: LucideIcon; href?: string };

const TOOL_CATEGORIES: Record<string, { key: string; icon: LucideIcon }[]> = {
  Academics: [
    { key: "scheme-of-work", icon: ScrollText },
    { key: "lesson-notes", icon: FileText },
    { key: "question-bank", icon: HelpCircle },
    { key: "result-templates", icon: ClipboardList },
    { key: "affective", icon: Heart },
    { key: "spreadsheets", icon: Table2 },
  ],
  Finance: [
    { key: "fee-structure", icon: DollarSign },
    { key: "billing", icon: Receipt },
    { key: "payments", icon: CreditCard },
    { key: "debt", icon: AlertTriangle },
    { key: "scratch-cards", icon: Ticket },
    { key: "payroll", icon: Wallet },
  ],
  "People & Staff": [
    { key: "hr", icon: UserCog },
    { key: "invites", icon: UserPlus },
    { key: "staff-attendance", icon: Clock },
  ],
  Facilities: [
    { key: "hostel", icon: Building },
    { key: "bus-tracking", icon: Bus },
    { key: "library", icon: Library },
    { key: "clinic", icon: Stethoscope },
  ],
  Admin: [
    { key: "features", icon: ToggleLeft },
    { key: "settings", icon: Settings },
    { key: "support", icon: LifeBuoy },
  ],
};

const cap = (value?: string | null) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : "");

function localToday() {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function StatCard({ stat }: { stat: OverviewStat }) {
  const Icon = stat.icon;
  return (
    <div className="@container flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 text-sm leading-snug text-slate-500">{stat.title}</span>
        {/* The icon steps aside when the tile is too narrow to hold it beside the label. */}
        <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 @min-[10rem]:flex">
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-x-2">
        <span className="text-3xl font-bold tabular-nums text-slate-900">{stat.value}</span>
        {stat.href && (
          <Link href={stat.href} className="flex items-center gap-0.5 text-xs font-semibold text-blue-600 hover:text-blue-700 pointer-coarse:min-h-11">
            Manage
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}

export function AdminDesktopOverview({
  slug,
  firstName,
  orgName,
  category,
  type,
  plan,
  status,
  isPrivileged,
  canAddStudent,
  counts,
  showStudents = true,
  showTeachers,
  showParents,
  showClasses,
}: {
  slug: string;
  firstName: string;
  orgName: string;
  category?: string;
  type?: string;
  plan?: string;
  status?: string;
  isPrivileged: boolean;
  canAddStudent: boolean;
  counts: { students: number; teachers: number; parents: number; classes?: number };
  showStudents?: boolean;
  showTeachers: boolean;
  showParents: boolean;
  showClasses: boolean;
}) {
  const base = `/dashboard/school/${slug}`;
  const { visibleNavItems } = useSchoolNavItems();
  const [pendingInvites, setPendingInvites] = useState(0);
  const [attendanceToday, setAttendanceToday] = useState<string>("—");
  const [debt, setDebt] = useState<{ unpaid: number; partial: number; paid: number; debtors: number } | null>(null);
  const [classCount, setClassCount] = useState<number | null>(null);

  const dismissKey = `hanoled_invites_alert_dismissed_${slug}`;
  // The alert only renders after the invites request resolves (client side), so reading
  // sessionStorage here cannot cause a server/client mismatch.
  const [inviteLeaving, setInviteLeaving] = useState(false);
  const [inviteDismissed, setInviteDismissed] = useState(() => {
    try {
      return typeof window !== "undefined" && sessionStorage.getItem(dismissKey) === "1";
    } catch {
      return false;
    }
  });

  // Independent requests, fired together so the first paint is not serialised behind three round trips.
  useEffect(() => {
    if (!isPrivileged) return;
    let cancelled = false;
    const quiet = { showErrorToast: false } as const;

    apiFetch<{ status?: string; accepted?: boolean; expiresAt?: string }[]>(`/admin/invite/pending/${slug}`, quiet)
      .then((invites) => {
        if (cancelled || !Array.isArray(invites)) return;
        const pending = invites.filter((i) => {
          if (i.status) return i.status === "pending";
          if (i.accepted) return false;
          return !(i.expiresAt && new Date(i.expiresAt).getTime() < Date.now());
        });
        setPendingInvites(pending.length);
      })
      .catch(() => {});

    const today = localToday();
    apiFetch<{ overallStats?: { totalRecords?: number; attendanceRate?: number } }>(
      `/attendance/${slug}/reports?startDate=${today}&endDate=${today}`,
      quiet,
    )
      .then((res) => {
        if (cancelled) return;
        const stats = res?.overallStats;
        if (stats && (stats.totalRecords ?? 0) > 0 && typeof stats.attendanceRate === "number") {
          setAttendanceToday(`${Math.round(stats.attendanceRate)}%`);
        }
      })
      .catch(() => {});

    apiFetch<{ data?: { summary?: Record<string, number> }; summary?: Record<string, number> }>(`/debt/overview/${slug}`, quiet)
      .then((res) => {
        if (cancelled) return;
        const summary = res?.data?.summary ?? res?.summary;
        if (summary) {
          setDebt({
            unpaid: summary.unpaidCount ?? 0,
            partial: summary.partialCount ?? 0,
            paid: summary.paidCount ?? 0,
            debtors: summary.totalStudents ?? 0,
          });
        }
      })
      .catch(() => {});

    apiFetch<unknown[]>(`/classes/${slug}`, quiet)
      .then((res) => {
        if (!cancelled && Array.isArray(res)) setClassCount(res.length);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [slug, isPrivileged]);

  const stats: OverviewStat[] = [
    ...(showStudents ? [{ key: "students", title: "Students", value: counts.students, icon: GraduationCap }] : []),
    ...(showTeachers ? [{ key: "teachers", title: "Teachers", value: counts.teachers, icon: Users }] : []),
    ...(showParents ? [{ key: "parents", title: "Parents", value: counts.parents, icon: Users }] : []),
    ...(showClasses
      ? [{ key: "classes", title: "Classes", value: classCount ?? counts.classes ?? "—", icon: Building2, href: `${base}/classes` }]
      : []),
    ...(isPrivileged ? [{ key: "attendance", title: "Attendance today", value: attendanceToday, icon: ClipboardCheck }] : []),
  ];

  const byKey = useMemo(() => new Map(visibleNavItems.map((item) => [item.key, item])), [visibleNavItems]);
  const categories = useMemo(
    () =>
      Object.entries(TOOL_CATEGORIES)
        .map(([name, tools]) => [name, tools.filter((tool) => byKey.has(tool.key))] as const)
        .filter(([, tools]) => tools.length > 0),
    [byKey],
  );
  const [activeTool, setActiveTool] = useState<string>("");
  const currentTool = categories.find(([name]) => name === activeTool) ? activeTool : categories[0]?.[0];

  const planLabel = plan ? `${cap(plan)} Plan` : "Free Plan";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {/* Welcome banner */}
      <div className="relative flex items-start justify-between gap-6 overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-7 text-white">
        <div className="relative z-10">
          <h1 className="mb-1 text-2xl font-bold">
            Welcome back, <span className="capitalize">{firstName}</span>
          </h1>
          <p className="mb-4 text-blue-100">
            Here&apos;s what&apos;s happening at <span className="capitalize">{orgName}</span> today.
          </p>
          <div className="flex w-fit items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
            <span className="font-medium capitalize">{status || "Active"}</span>
            {category && (
              <>
                <span className="text-blue-200">·</span>
                <span>{cap(category)}</span>
              </>
            )}
            <span className="text-blue-200">·</span>
            <span>{planLabel}</span>
          </div>
        </div>
        {canAddStudent && (
          <Link
            href={`${base}/students/new`}
            className="relative z-10 flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50"
          >
            <Plus className="h-4 w-4" />
            Add Student
          </Link>
        )}
        <div aria-hidden="true" className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10" />
        <div aria-hidden="true" className="absolute bottom-[-40px] right-16 h-32 w-32 rounded-full bg-white/10" />
      </div>

      {/* Pending invites, surfaced here instead of living in the sidebar */}
      {isPrivileged && pendingInvites > 0 && !inviteDismissed && (
        <div className="m-collapsible" data-open={inviteLeaving ? "false" : "true"}>
          <div className="m-rise">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3.5">
              <div className="flex items-center gap-3">
                <UserPlus className="h-5 w-5 shrink-0 text-amber-600" />
                <p className="text-sm text-amber-900">
                  <span className="font-semibold">
                    {pendingInvites} pending invite{pendingInvites === 1 ? "" : "s"}
                  </span>{" "}
                  {pendingInvites === 1 ? "is" : "are"} waiting to be accepted.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <Link href={`${base}/invites`} className="text-sm font-semibold text-amber-800 hover:text-amber-900">
                  Review
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    // Collapse first, unmount once the collapse has finished.
                    setInviteLeaving(true);
                    window.setTimeout(() => {
                      setInviteDismissed(true);
                      try {
                        sessionStorage.setItem(dismissKey, "1");
                      } catch {
                        /* ignore */
                      }
                    }, 280);
                  }}
                  className="text-sm text-amber-700 hover:text-amber-900"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stat row */}
      {/* Tablets and narrow desktops: three across; wide desktops: every stat on one row. */}
      <div
        className="m-stagger grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-[repeat(var(--stat-count),minmax(0,1fr))]"
        style={{ ["--stat-count" as string]: stats.length }}
      >
        {stats.map((stat) => (
          <StatCard key={stat.key} stat={stat} />
        ))}
      </div>

      {/* School info + finance snapshot */}
      <div className="grid grid-cols-5 gap-6">
        <div className={cn("rounded-2xl border border-slate-200 bg-white p-6", isPrivileged ? "col-span-3" : "col-span-5")}>
          <h3 className="text-base font-bold text-slate-900">School Information</h3>
          <p className="mb-5 text-sm text-slate-500">Your organization profile details</p>
          <div className="grid grid-cols-2 gap-y-5">
            <div>
              <div className="mb-1 text-xs text-slate-500">Category</div>
              <div className="text-sm font-medium text-slate-900">{cap(category) || "—"}</div>
            </div>
            <div>
              <div className="mb-1 text-xs text-slate-500">Type</div>
              <div className="text-sm font-medium text-slate-900">{cap(type) || "—"}</div>
            </div>
            <div>
              <div className="mb-1 text-xs text-slate-500">Status</div>
              <span className="inline-block rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold capitalize text-emerald-700">
                {status || "Active"}
              </span>
            </div>
            <div>
              <div className="mb-1 text-xs text-slate-500">Plan</div>
              <div className="text-sm font-medium text-slate-900">{cap(plan) || "Free"}</div>
            </div>
          </div>
        </div>

        {isPrivileged && (
          <div className="col-span-2 flex flex-col rounded-2xl border border-slate-200 bg-white p-6">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Finance Snapshot</h3>
              <AlertTriangle className="h-4 w-4 text-slate-300" />
            </div>
            <p className="mb-5 text-sm text-slate-500">Fees &amp; compliance, at a glance</p>
            <div className="mb-5 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-red-50 px-3 py-2.5">
                <div className="mb-0.5 text-xs text-red-600">Unpaid</div>
                <div className="text-lg font-bold tabular-nums text-red-700">{debt ? debt.unpaid : "—"}</div>
              </div>
              <div className="rounded-lg bg-amber-50 px-3 py-2.5">
                <div className="mb-0.5 text-xs text-amber-600">Partial</div>
                <div className="text-lg font-bold tabular-nums text-amber-700">{debt ? debt.partial : "—"}</div>
              </div>
              <div className="rounded-lg bg-emerald-50 px-3 py-2.5">
                <div className="mb-0.5 text-xs text-emerald-600">Paid</div>
                <div className="text-lg font-bold tabular-nums text-emerald-700">{debt ? debt.paid : "—"}</div>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2.5">
                <div className="mb-0.5 text-xs text-slate-500">Debtors</div>
                <div className="text-lg font-bold tabular-nums text-slate-700">{debt ? debt.debtors : "—"}</div>
              </div>
            </div>
            <Link
              href={`${base}/debt`}
              className="mt-auto flex items-center justify-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              View full debt profile
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* Tool launcher: everything the sidebar leaves out */}
      {categories.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">More for your school</h3>
          </div>
          <p className="mb-5 text-sm text-slate-500">
            Finance, staff and facilities tools — grouped so the sidebar stays focused on daily work.
          </p>

          <div className="mb-5 flex items-center gap-1.5 overflow-x-auto" role="tablist" aria-label="Tool categories">
            {categories.map(([name]) => (
              <button
                key={name}
                type="button"
                role="tab"
                aria-selected={currentTool === name}
                onClick={() => setActiveTool(name)}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-1.5 text-sm transition-colors pointer-coarse:min-h-11",
                  currentTool === name ? "bg-blue-600 font-semibold text-white" : "bg-slate-50 font-medium text-slate-600 hover:bg-slate-100",
                )}
              >
                {name}
              </button>
            ))}
          </div>

          <div key={currentTool} className="m-stagger grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-3">
            {(categories.find(([name]) => name === currentTool)?.[1] ?? []).map((tool) => {
              const item = byKey.get(tool.key)!;
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.key}
                  href={item.url}
                  className="group flex flex-col items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition-[border-color,box-shadow,translate,scale] duration-200 ease-[var(--ease-out-smooth)] hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-sm active:scale-[0.98]"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 transition-colors group-hover:bg-blue-50">
                    <Icon className="h-5 w-5 text-slate-500 group-hover:text-blue-600" strokeWidth={2} />
                  </div>
                  <span className="text-sm font-medium text-slate-800">{item.title}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
