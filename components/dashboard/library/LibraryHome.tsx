"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, BookOpenCheck, Loader2, RotateCw, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useSchoolNavItems } from "@/hooks/useSchoolNavItems";
import { isForbiddenError, type ApiFetchError } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  daysUntil,
  dueLabel,
  libraryQueries,
  setLoanStatus,
  studentName,
  type DeskLoan,
  type LibraryDesk,
} from "@/lib/library-desk";
import { DataStateCard } from "@/components/dashboard/shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useOptionalMobileMenu } from "@/components/dashboard/mobile/MobileMenuProvider";
import {
  HomeGreeting,
  PrimaryAction,
  SectionTitle,
  StatStrip,
  ToolGrid,
  type HomeTool,
} from "@/components/dashboard/mobile/HomeKit";
import { greetingName } from "@/lib/greeting-name";

/**
 * The librarian's workspace: requests waiting at the desk, books that are
 * late, and what is due back soon — each with its one action right there,
 * so the common jobs never need a second screen.
 */

const LIBRARY_TOOLS = ["library-desk", "library", "students", "timetable"];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

type Action = "borrowed" | "returned" | "cancelled";

export function LibraryHome({ switcher }: { switcher?: ReactNode }) {
  const { currentOrg } = useOrganization();
  const { user } = useAuth();
  const { visibleNavItems } = useSchoolNavItems();
  const queryClient = useQueryClient();
  const slug = currentOrg?.slug ?? "";
  const [busy, setBusy] = useState<string | null>(null);

  const query = useQuery({ ...libraryQueries.desk(slug), enabled: Boolean(slug), staleTime: 15_000 });
  const nav = useMemo(() => new Map(visibleNavItems.map((item) => [item.key, item])), [visibleNavItems]);
  const base = `/dashboard/school/${slug}`;
  const firstName = greetingName(user?.name) || "there";

  async function act(loan: DeskLoan, action: Action) {
    setBusy(`${loan.id}:${action}`);
    try {
      await setLoanStatus(slug, loan.id, action);
      const title = loan.book.title;
      toast.success(
        action === "borrowed"
          ? `${title} handed to ${loan.student.firstName}`
          : action === "returned"
            ? `${title} is back on the shelf`
            : `Request for ${title} declined`,
      );
      void queryClient.invalidateQueries({ queryKey: ["library"] });
    } catch (error) {
      toast.error((error as ApiFetchError).message || "Couldn't update the loan. Nothing was changed.");
      void queryClient.invalidateQueries({ queryKey: ["library"] });
    } finally {
      setBusy(null);
    }
  }

  if (!currentOrg) return null;

  if (query.isError && !query.data) {
    const forbidden = isForbiddenError(query.error);
    return (
      <div className="space-y-4">
        {switcher}
        <DataStateCard
          variant={forbidden ? "forbidden" : "error"}
          title={forbidden ? "The library is no longer part of your role" : "Couldn't load the library"}
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

  const props: ViewProps = {
    data: query.data,
    loading: query.isPending,
    base,
    nav,
    firstName,
    switcher,
    busy,
    onAct: act,
  };

  return (
    <>
      <div className="md:hidden">
        <LibraryPhone {...props} />
      </div>
      <div className="hidden md:block">
        <LibraryDesktop {...props} />
      </div>
    </>
  );
}

type ViewProps = {
  data: LibraryDesk | undefined;
  loading: boolean;
  base: string;
  nav: Map<string, { key: string; title: string; url: string; icon: LucideIcon }>;
  firstName: string;
  switcher?: ReactNode;
  busy: string | null;
  onAct: (loan: DeskLoan, action: Action) => void;
};

function shelfLine(data: LibraryDesk) {
  const { titles, copies, available } = data.shelf;
  if (titles === 0) return "No books catalogued yet";
  return `${titles.toLocaleString("en-NG")} titles · ${available.toLocaleString("en-NG")} of ${copies.toLocaleString("en-NG")} copies on the shelf`;
}

// ── Phone ────────────────────────────────────────────────────────────────

function LibraryPhone(props: ViewProps) {
  const { data, loading, base, nav, firstName, switcher } = props;
  const menu = useOptionalMobileMenu();
  const inTabBar = new Set(menu?.config.tabs.map((tab) => tab.key) ?? []);
  const tools: HomeTool[] = LIBRARY_TOOLS.filter((key) => nav.has(key) && !inTabBar.has(key))
    .slice(0, 5)
    .map((key) => {
      const item = nav.get(key)!;
      return { key, label: item.title, href: item.url, icon: item.icon };
    });

  return (
    <div className="space-y-7">
      <div className="space-y-4">
        {switcher}
        <HomeGreeting name={firstName} detail={data ? shelfLine(data) : "Library"} />
        {nav.has("library-desk") && (
          <PrimaryAction
            href={`${base}/library/desk`}
            icon={ArrowLeftRight}
            label="Lend or take back a book"
            hint="Find the student, then the book"
          />
        )}
        {data && (
          <StatStrip
            stats={[
              { key: "out", label: "Books out", value: data.counts.borrowed },
              { key: "late", label: "Overdue", value: data.counts.overdue },
              { key: "requests", label: "Requests", value: data.counts.requests },
            ]}
          />
        )}
      </div>

      {loading ? (
        <div className="space-y-6" aria-busy="true" aria-label="Loading the library">
          <Skeleton className="h-[200px] w-full rounded-2xl" />
          <Skeleton className="h-[200px] w-full rounded-2xl" />
        </div>
      ) : data ? (
        <LoanSections {...props} data={data} />
      ) : null}

      {tools.length > 0 && (
        <section>
          <SectionTitle>Library tools</SectionTitle>
          <ToolGrid tools={tools} />
        </section>
      )}
    </div>
  );
}

// ── Desktop ──────────────────────────────────────────────────────────────

function LibraryDesktop(props: ViewProps) {
  const { data, loading, base, nav, firstName } = props;
  const today = new Date().toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{today}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            {greeting()}, <span className="capitalize">{firstName}</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">{data ? `Library · ${shelfLine(data)}` : "Library"}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {nav.has("library") && (
            <Button asChild variant="outline" className="h-11 rounded-xl px-5">
              <Link href={`${base}/library`}>Catalogue</Link>
            </Button>
          )}
          {nav.has("library-desk") && (
            <Button asChild className="h-11 rounded-xl px-5 font-semibold">
              <Link href={`${base}/library/desk`}>
                <ArrowLeftRight className="mr-2 h-4 w-4" /> Lend or take back
              </Link>
            </Button>
          )}
        </div>
      </header>

      {data && (
        <div className="max-w-xl">
          <StatStrip
            stats={[
              { key: "out", label: "Books out", value: data.counts.borrowed },
              { key: "late", label: "Overdue", value: data.counts.overdue },
              { key: "today", label: "Due today", value: data.counts.dueToday },
            ]}
          />
        </div>
      )}

      {loading ? (
        <div className="grid gap-6 lg:grid-cols-3" aria-busy="true" aria-label="Loading the library">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-[300px] w-full rounded-2xl" />
          ))}
        </div>
      ) : data ? (
        <div className="grid items-start gap-6 lg:grid-cols-3">
          <LoanSections {...props} data={data} />
        </div>
      ) : null}
    </div>
  );
}

// ── Lists ────────────────────────────────────────────────────────────────

function LoanSections(props: ViewProps & { data: LibraryDesk }) {
  const { data } = props;
  const nothingOpen = data.requests.length === 0 && data.overdue.length === 0 && data.dueSoon.length === 0;

  if (nothingOpen) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center lg:col-span-3">
        <BookOpenCheck className="mx-auto h-8 w-8 text-slate-300" />
        <h2 className="mt-3 text-base font-semibold text-slate-900">Nothing waiting at the desk</h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
          No requests, nothing late and nothing due in the next three days.
        </p>
      </section>
    );
  }

  return (
    <>
      <LoanList
        {...props}
        title="Requests"
        aside={data.counts.requests > data.requests.length ? `${data.counts.requests} in all` : undefined}
        loans={data.requests}
        empty="No requests from students or parents."
        actions={[
          { action: "borrowed", label: "Hand over", primary: true },
          { action: "cancelled", label: "Decline" },
        ]}
      />
      <LoanList
        {...props}
        title="Overdue"
        aside={data.counts.overdue > data.overdue.length ? `${data.counts.overdue} in all` : undefined}
        loans={data.overdue}
        empty="Nothing is late."
        actions={[{ action: "returned", label: "Returned", primary: true }]}
      />
      <LoanList
        {...props}
        title="Due back soon"
        loans={data.dueSoon}
        empty="Nothing due in the next three days."
        actions={[{ action: "returned", label: "Returned" }]}
      />
    </>
  );
}

function LoanList({
  title,
  aside,
  loans,
  empty,
  actions,
  busy,
  onAct,
}: ViewProps & {
  title: string;
  aside?: string;
  loans: DeskLoan[];
  empty: string;
  actions: Array<{ action: Action; label: string; primary?: boolean }>;
}) {
  return (
    <section className="min-w-0">
      <SectionTitle aside={aside}>{title}</SectionTitle>
      {loans.length === 0 ? (
        <p className="rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-500 md:border-slate-200/70">{empty}</p>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white md:border-slate-200/70">
          {loans.map((loan) => {
            const days = daysUntil(loan.dueDate);
            const late = days !== null && days < 0;
            const who = [loan.student.classLevel?.name, loan.student.admissionNumber].filter(Boolean).join(" · ");
            return (
              <li key={loan.id} className="px-4 py-3">
                <p className="truncate text-sm font-semibold text-slate-900">{loan.book.title}</p>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  <span className="font-medium capitalize text-slate-700">{studentName(loan.student)}</span>
                  {who ? ` · ${who}` : ""}
                </p>
                <div className="mt-2.5 flex items-center justify-between gap-3">
                  <span className={cn("text-xs font-semibold", late ? "text-red-600" : "text-slate-500")}>
                    {loan.status === "borrowed"
                      ? dueLabel(loan.dueDate)
                      : `Asked ${new Date(loan.requestDate).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}`}
                  </span>
                  <span className="flex gap-2">
                    {actions.map((item) => {
                      const key = `${loan.id}:${item.action}`;
                      return (
                        <Button
                          key={item.action}
                          type="button"
                          variant={item.primary ? "default" : "outline"}
                          disabled={busy !== null}
                          onClick={() => onAct(loan, item.action)}
                          className="h-10 rounded-lg px-3.5 text-sm font-semibold"
                        >
                          {busy === key && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                          {item.label}
                        </Button>
                      );
                    })}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
