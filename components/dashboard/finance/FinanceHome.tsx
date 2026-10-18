"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  HandCoins,
  ReceiptText,
  RotateCw,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useSchoolNavItems } from "@/hooks/useSchoolNavItems";
import { isForbiddenError } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  channelLabel,
  collectionRate,
  financeQueries,
  formatNaira,
  monthLabel,
  paymentTime,
  termLabel,
  type FinanceOverview,
} from "@/lib/finance";
import { DataStateCard } from "@/components/dashboard/shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useOptionalMobileMenu } from "@/components/dashboard/mobile/MobileMenuProvider";
import { HomeGreeting, PrimaryAction, SectionTitle, ToolGrid, type HomeTool } from "@/components/dashboard/mobile/HomeKit";
import { greetingName } from "@/lib/greeting-name";

/**
 * The bursary workspace home: what came in, what is still owed and by whom,
 * and one obvious way to log the next payment. Every section follows what
 * this school lets the viewer's role do — the server leaves out anything the
 * role does not cover, and so does this page.
 */

// Finance destinations, in the order the bursary reaches for them.
// SCRATCH_CARD_PARKED — "scratch-cards" removed from the finance hub for the MVP launch; restore post-launch.
const FINANCE_TOOLS = ["payments", "debt", "fee-structure", "billing", "payroll", "staff-attendance", "students"];

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

export function FinanceHome({ switcher }: { switcher?: ReactNode }) {
  const { currentOrg } = useOrganization();
  const { user } = useAuth();
  const { visibleNavItems } = useSchoolNavItems();
  const slug = currentOrg?.slug ?? "";
  const [term, setTerm] = useState<string | null>(null);

  const query = useQuery({
    ...financeQueries.overview(slug, term),
    enabled: Boolean(slug),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const nav = useMemo(() => new Map(visibleNavItems.map((item) => [item.key, item])), [visibleNavItems]);
  const base = `/dashboard/school/${slug}`;
  const recordHref = nav.has("record-payment") ? `${base}/payments/record` : null;
  const firstName = greetingName(user?.name) || "there";

  if (!currentOrg) return null;

  if (query.isError && !query.data) {
    const forbidden = isForbiddenError(query.error);
    return (
      <div className="space-y-4">
        {switcher}
        <DataStateCard
          variant={forbidden ? "forbidden" : "error"}
          title={forbidden ? "The bursary is no longer part of your role" : "Couldn't load the bursary"}
          description={
            forbidden
              ? "A school admin has changed what your role can do. Ask them if you still need access."
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
  const props: FinanceViewProps = {
    data,
    loading: query.isPending,
    refreshing: query.isFetching && !query.isPending,
    term,
    onTerm: setTerm,
    base,
    nav,
    recordHref,
    firstName,
    orgName: currentOrg.name,
    switcher,
  };

  return (
    <>
      <div className="md:hidden">
        <FinancePhone {...props} />
      </div>
      <div className="hidden md:block">
        <FinanceDesktop {...props} />
      </div>
    </>
  );
}

type FinanceViewProps = {
  data: FinanceOverview | undefined;
  loading: boolean;
  refreshing: boolean;
  term: string | null;
  onTerm: (term: string | null) => void;
  base: string;
  nav: Map<string, { key: string; title: string; url: string; icon: LucideIcon }>;
  recordHref: string | null;
  firstName: string;
  orgName: string;
  switcher?: ReactNode;
};

// ── Phone ────────────────────────────────────────────────────────────────

function FinancePhone(props: FinanceViewProps) {
  const { data, loading, base, nav, recordHref, firstName, switcher } = props;
  const menu = useOptionalMobileMenu();
  const inTabBar = new Set(menu?.config.tabs.map((tab) => tab.key) ?? []);
  const tools: HomeTool[] = FINANCE_TOOLS.filter((key) => nav.has(key) && !inTabBar.has(key))
    .slice(0, 5)
    .map((key) => {
      const item = nav.get(key)!;
      return { key, label: item.title, href: item.url, icon: item.icon };
    });

  return (
    <div className="space-y-7">
      <div className="space-y-4">
        {switcher}
        <HomeGreeting name={firstName} detail={data?.term ? `${termLabel(data.term)} · Bursary` : "Bursary"} />
        {recordHref && (
          <PrimaryAction href={recordHref} icon={HandCoins} label="Record a payment" hint="Cash, transfer or POS at the bursary" />
        )}
      </div>

      {loading ? (
        <PhoneSkeleton />
      ) : data ? (
        <>
          {data.can.totals && <TermStatement {...props} variant="phone" />}
          {data.can.debtors && data.terms.length > 0 && <Debtors data={data} base={base} recordHref={recordHref} nav={nav} />}
          {data.can.payments && <LatestPayments data={data} base={base} nav={nav} recordHref={recordHref} variant="list" />}
          {data.can.payroll && data.payroll && <PayrollStrip payroll={data.payroll} href={nav.get("payroll")?.url} />}
        </>
      ) : null}

      {tools.length > 0 && (
        <section>
          <SectionTitle>Bursary tools</SectionTitle>
          <ToolGrid tools={tools} />
        </section>
      )}
    </div>
  );
}

function PhoneSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading the bursary">
      <Skeleton className="h-[248px] w-full rounded-2xl" />
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-[200px] w-full rounded-2xl" />
      </div>
    </div>
  );
}

// ── Desktop ──────────────────────────────────────────────────────────────

function FinanceDesktop(props: FinanceViewProps) {
  const { data, loading, base, nav, recordHref, firstName, orgName } = props;
  const today = new Date().toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long" });
  const tools = FINANCE_TOOLS.filter((key) => nav.has(key)).map((key) => nav.get(key)!);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{today}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            {greeting()}, <span className="capitalize">{firstName}</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Bursary · <span className="capitalize">{orgName}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* The workspace switch lives in the sidebar on desktop. */}
          {recordHref && (
            <Button asChild className="h-11 rounded-xl px-5 font-semibold">
              <Link href={recordHref}>
                <HandCoins className="mr-2 h-4 w-4" /> Record payment
              </Link>
            </Button>
          )}
        </div>
      </header>

      {loading ? (
        <div className="grid gap-6 lg:grid-cols-3" aria-busy="true" aria-label="Loading the bursary">
          <div className="space-y-6 lg:col-span-2">
            <Skeleton className="h-[236px] w-full rounded-2xl" />
            <Skeleton className="h-[320px] w-full rounded-2xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-[330px] w-full rounded-2xl" />
            <Skeleton className="h-[180px] w-full rounded-2xl" />
          </div>
        </div>
      ) : data ? (
        <div className="grid items-start gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {data.can.totals && <TermStatement {...props} variant="desktop" />}
            {data.can.payments && <LatestPayments data={data} base={base} nav={nav} recordHref={recordHref} variant="table" />}
          </div>
          <div className="space-y-6">
            {data.can.debtors && data.terms.length > 0 && <Debtors data={data} base={base} recordHref={recordHref} nav={nav} />}
            {data.can.payroll && data.payroll && <PayrollStrip payroll={data.payroll} href={nav.get("payroll")?.url} />}
            {tools.length > 0 && (
              <section className="rounded-2xl border border-slate-200/70 bg-white p-2">
                <h2 className="px-3 pb-1 pt-2 text-sm font-semibold text-slate-900">Bursary tools</h2>
                <ul>
                  {tools.map((tool) => (
                    <li key={tool.key}>
                      <Link
                        href={tool.url}
                        className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        <tool.icon className="h-4 w-4 text-blue-600" />
                        <span className="flex-1">{tool.title}</span>
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

// ── Term statement ───────────────────────────────────────────────────────

function TermPicker({
  terms,
  value,
  onChange,
  className,
}: {
  terms: string[];
  value: string | null;
  onChange: (term: string | null) => void;
  className?: string;
}) {
  if (terms.length < 2) {
    return value ? <span className={cn("text-sm font-medium text-slate-500", className)}>{termLabel(value)}</span> : null;
  }
  // A native select: phones open their own picker, keyboards work for free.
  return (
    <label className={cn("relative inline-flex items-center", className)}>
      <span className="sr-only">Term</span>
      <select
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
        className="h-11 appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-9 text-sm font-medium text-slate-700 outline-none transition-colors hover:border-slate-300 focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/20 md:h-9"
      >
        {terms.map((term) => (
          <option key={term} value={term}>
            {termLabel(term)}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-slate-400" />
    </label>
  );
}

function TermStatement({ data, onTerm, refreshing, nav, variant }: FinanceViewProps & { variant: "phone" | "desktop" }) {
  if (!data) return null;
  const totals = data.totals;
  const debtHref = nav.get("debt")?.url;

  if (!totals || totals.invoiceCount === 0) {
    const feesHref = nav.get("fee-structure")?.url;
    return (
      <section className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center">
        <ReceiptText className="mx-auto h-8 w-8 text-slate-300" />
        <h2 className="mt-3 text-base font-semibold text-slate-900">No bills raised yet</h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
          Once students are invoiced for a term, what has been collected and what is still owed shows up here.
        </p>
        {feesHref && (
          <Link href={feesHref} className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-blue-700">
            Set up school fees <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </section>
    );
  }

  const rate = collectionRate(totals);
  const picker = <TermPicker terms={data.terms} value={data.term} onChange={onTerm} />;
  const bar = (
    <div>
      <div
        className="h-2 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={rate}
        aria-label="Share of this term's fees collected"
      >
        <div
          className="h-full rounded-full bg-blue-600 motion-safe:transition-[width] motion-safe:duration-500 motion-safe:ease-out"
          style={{ width: `${rate}%` }}
        />
      </div>
      <p className="mt-2 text-sm text-slate-600">
        <span className="font-semibold text-slate-900">{rate}% collected</span>
        <span className="text-slate-400"> · </span>
        {totals.paidCount} of {totals.invoiceCount} bills paid in full
      </p>
    </div>
  );
  const today = data.today && (
    <p className="text-sm text-slate-600">
      Received today{" "}
      <span className="font-semibold tabular-nums text-slate-900">{formatNaira(data.today.amount)}</span>
      {data.today.count > 0 && (
        <span className="text-slate-500">
          {" "}
          from {data.today.count} {data.today.count === 1 ? "payment" : "payments"}
        </span>
      )}
    </p>
  );
  const statuses = (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600" aria-label="Bills by status">
      <li className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" /> {totals.paidCount} paid
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" /> {totals.partialCount} part-paid
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden="true" /> {totals.unpaidCount} unpaid
      </li>
    </ul>
  );
  const owedLink =
    debtHref && totals.debtorCount > 0 ? (
      <Link href={debtHref} className="text-sm font-medium text-blue-700 hover:underline">
        {totals.debtorCount} {totals.debtorCount === 1 ? "student" : "students"}
      </Link>
    ) : null;

  if (variant === "phone") {
    return (
      <section
        aria-label="Term statement"
        className={cn("rounded-2xl border border-slate-100 bg-white p-4 transition-opacity", refreshing && "opacity-60")}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900">Term statement</h2>
          {picker}
        </div>
        {/* A bursary ledger: two lines, a rule, and the balance. */}
        <dl className="mt-3 text-[15px]">
          <div className="flex items-baseline justify-between gap-3 py-1.5">
            <dt className="text-slate-500">Billed</dt>
            <dd className="font-semibold tabular-nums text-slate-900">{formatNaira(totals.billed)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 py-1.5">
            <dt className="text-slate-500">Collected</dt>
            <dd className="font-semibold tabular-nums text-slate-900">{formatNaira(totals.billed - totals.outstanding)}</dd>
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-slate-200 pt-2.5">
            <dt className="font-semibold text-slate-900">
              Still owed {owedLink && <span className="block text-xs font-normal">by {owedLink}</span>}
            </dt>
            <dd className="text-xl font-bold tabular-nums tracking-tight text-slate-900">{formatNaira(totals.outstanding)}</dd>
          </div>
        </dl>
        <div className="mt-4">{bar}</div>
        {today && <div className="mt-3 border-t border-slate-100 pt-3">{today}</div>}
      </section>
    );
  }

  return (
    <section
      aria-label="Term statement"
      className={cn("rounded-2xl border border-slate-200/70 bg-white p-6 transition-opacity", refreshing && "opacity-60")}
    >
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold text-slate-900">Term statement</h2>
        {picker}
      </div>
      {/* Billed − collected = still owed, read left to right like the ledger it is. */}
      <div className="mt-5 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-end gap-x-4">
        <Figure label="Billed" value={formatNaira(totals.billed)} />
        <Operator>−</Operator>
        <Figure label="Collected" value={formatNaira(totals.billed - totals.outstanding)} />
        <Operator>=</Operator>
        <Figure label="Still owed" value={formatNaira(totals.outstanding)} strong aside={owedLink && <>by {owedLink}</>} />
      </div>
      <div className="mt-6">{bar}</div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        {today}
        {statuses}
      </div>
    </section>
  );
}

function Figure({ label, value, strong, aside }: { label: string; value: string; strong?: boolean; aside?: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className={cn("text-sm", strong ? "font-semibold text-slate-900" : "text-slate-500")}>{label}</p>
      <p
        className={cn(
          "mt-1 truncate text-[26px] leading-tight tabular-nums tracking-tight text-slate-900",
          strong ? "font-bold" : "font-semibold",
        )}
      >
        {value}
      </p>
      {aside ? <p className="mt-0.5 text-xs text-slate-500">{aside}</p> : <p className="mt-0.5 text-xs">&nbsp;</p>}
    </div>
  );
}

function Operator({ children }: { children: ReactNode }) {
  return (
    <span className="pb-6 text-xl font-medium text-slate-300" aria-hidden="true">
      {children}
    </span>
  );
}

// ── Who owes ─────────────────────────────────────────────────────────────

function Debtors({
  data,
  recordHref,
  nav,
}: {
  data: FinanceOverview;
  base: string;
  recordHref: string | null;
  nav: FinanceViewProps["nav"];
}) {
  const debtors = data.topDebtors ?? [];
  const debtHref = nav.get("debt")?.url;
  const total = data.debtorCount ?? debtors.length;

  return (
    <section>
      <SectionTitle
        aside={
          debtHref && total > debtors.length ? (
            <Link href={debtHref} className="inline-flex min-h-[44px] items-center font-semibold text-blue-700 md:pointer-fine:min-h-0">
              All {total}
            </Link>
          ) : undefined
        }
      >
        Owes the most
      </SectionTitle>
      {debtors.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-600">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
          Nobody owes anything for this term.
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white">
          {debtors.map((debtor) => {
            // Tapping a debtor starts a payment for them when the role can take
            // money; otherwise it opens their record on the debt list.
            const href = recordHref
              ? `${recordHref}?q=${encodeURIComponent(debtor.admissionNumber || debtor.name)}`
              : debtHref;
            const body = (
              <>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                  {initials(debtor.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold capitalize text-slate-900">{debtor.name}</span>
                  <span className="block truncate text-xs text-slate-500">
                    {[debtor.className, debtor.admissionNumber].filter(Boolean).join(" · ") || "—"}
                  </span>
                </span>
                <span className="text-sm font-bold tabular-nums text-red-600">{formatNaira(debtor.balance)}</span>
                {href && <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />}
              </>
            );
            return (
              <li key={debtor.studentId}>
                {href ? (
                  <Link
                    href={href}
                    aria-label={`${debtor.name} owes ${formatNaira(debtor.balance)}${recordHref ? ". Record a payment" : ""}`}
                    className="flex min-h-[64px] items-center gap-3 px-4 py-2 transition-colors hover:bg-slate-50 active:bg-slate-50"
                  >
                    {body}
                  </Link>
                ) : (
                  <div className="flex min-h-[64px] items-center gap-3 px-4 py-2">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ── What came in ─────────────────────────────────────────────────────────

function LatestPayments({
  data,
  nav,
  recordHref,
  variant,
}: {
  data: FinanceOverview;
  base: string;
  nav: FinanceViewProps["nav"];
  recordHref: string | null;
  variant: "list" | "table";
}) {
  const payments = data.recentPayments ?? [];
  const allHref = nav.get("payments")?.url;
  const title = "Latest payments";
  const aside = allHref && payments.length > 0 && (
    <Link href={allHref} className="inline-flex min-h-[44px] items-center font-semibold text-blue-700 md:pointer-fine:min-h-0">
      See all
    </Link>
  );

  if (payments.length === 0) {
    // On desktop the section is already a panel, so the empty note sits flat inside it.
    return (
      <section className={variant === "table" ? "rounded-2xl border border-slate-200/70 bg-white p-6" : undefined}>
        <SectionTitle>{title}</SectionTitle>
        <div
          className={cn(
            "p-6 text-center",
            variant === "list" && "rounded-2xl border border-dashed border-slate-200 bg-white",
          )}
        >
          <Banknote className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm font-semibold text-slate-700">No payments yet</p>
          <p className="mt-1 text-xs text-slate-500">Online fee payments and money taken at the bursary appear here.</p>
          {recordHref && (
            <Link href={recordHref} className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-blue-700">
              Record the first one <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </section>
    );
  }

  if (variant === "list") {
    return (
      <section>
        <SectionTitle aside={aside || undefined}>{title}</SectionTitle>
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white">
          {payments.map((payment) => (
            <li key={payment.id} className="flex min-h-[64px] items-center gap-3 px-4 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold capitalize text-slate-900">{payment.studentName}</span>
                <span className="block truncate text-xs text-slate-500">
                  {channelLabel(payment.channel)} · {paymentTime(payment.createdAt)}
                  {payment.className ? ` · ${payment.className}` : ""}
                </span>
              </span>
              <span className="text-sm font-semibold tabular-nums text-slate-900">{formatNaira(payment.amount)}</span>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white">
      <div className="flex items-center justify-between px-6 pb-2 pt-5">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {aside && <span className="text-sm">{aside}</span>}
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs text-slate-500">
            <th scope="col" className="px-6 py-2 font-medium">When</th>
            <th scope="col" className="px-3 py-2 font-medium">Student</th>
            <th scope="col" className="px-3 py-2 font-medium">Paid by</th>
            <th scope="col" className="hidden px-3 py-2 font-medium xl:table-cell">Reference</th>
            <th scope="col" className="px-6 py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {payments.map((payment) => (
            <tr key={payment.id}>
              <td className="whitespace-nowrap px-6 py-3 text-slate-500">{paymentTime(payment.createdAt)}</td>
              <td className="px-3 py-3">
                <span className="block font-medium capitalize text-slate-900">{payment.studentName}</span>
                {payment.className && <span className="block text-xs text-slate-500">{payment.className}</span>}
              </td>
              <td className="px-3 py-3 text-slate-600">{channelLabel(payment.channel)}</td>
              <td className="hidden max-w-[180px] truncate px-3 py-3 font-mono text-xs text-slate-500 xl:table-cell">
                {payment.reference}
              </td>
              <td className="whitespace-nowrap px-6 py-3 text-right font-semibold tabular-nums text-slate-900">
                {formatNaira(payment.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

// ── Payroll ──────────────────────────────────────────────────────────────

function PayrollStrip({ payroll, href }: { payroll: NonNullable<FinanceOverview["payroll"]>; href?: string }) {
  const status =
    payroll.pendingCount > 0
      ? `${payroll.pendingCount} ${payroll.pendingCount === 1 ? "salary" : "salaries"} waiting · ${formatNaira(payroll.pendingAmount)}`
      : payroll.paidCount > 0
        ? `All ${payroll.paidCount} staff paid`
        : "Not prepared yet";
  const body = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
        <Banknote className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-900">Payroll · {monthLabel(payroll.month)}</span>
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          {payroll.pendingCount > 0 && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />}
          {status}
        </span>
      </span>
      {href && <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />}
    </>
  );
  const className = "flex min-h-[64px] items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 md:border-slate-200/70";
  return href ? (
    <Link href={href} className={cn(className, "transition-colors hover:bg-slate-50 active:bg-slate-50")}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
