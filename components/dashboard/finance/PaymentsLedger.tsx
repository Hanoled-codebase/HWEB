"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Banknote, HandCoins, RotateCw, Search } from "lucide-react";
import { apiFetch, isForbiddenError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { channelLabel, formatNaira, paymentTime, termLabel } from "@/lib/finance";
import { usePermissions } from "@/hooks/usePermissions";
import { DataStateCard } from "@/components/dashboard/shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type LedgerEntry = {
  id: string;
  reference: string;
  amount: string | number;
  channel: string;
  status: "SUCCESS" | "PENDING" | "FAILED" | string;
  createdAt: string;
  invoice: {
    academicTerm: string;
    student: { firstName: string; lastName: string; admissionNumber: string | null } | null;
  } | null;
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "CASH", label: "Cash" },
  { key: "BANK_TRANSFER", label: "Transfer" },
  { key: "POS", label: "POS" },
  { key: "online", label: "Online" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];

const STATUS_CHIP: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "bg-amber-50 text-amber-700" },
  FAILED: { label: "Failed", className: "bg-red-50 text-red-700" },
};

function studentName(entry: LedgerEntry) {
  const student = entry.invoice?.student;
  return [student?.firstName, student?.lastName].filter(Boolean).join(" ") || "Unknown student";
}

/**
 * The bursary's day book: every payment, newest first, whether taken at the
 * desk or paid online. Staff whose role covers fee records see this in place
 * of the gateway settings, which stay with the school's admins.
 */
export function PaymentsLedger({ slug }: { slug: string }) {
  const { can } = usePermissions();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const canSee = can("fee_status.view");
  const recordHref = can("payments.record") ? `/dashboard/school/${slug}/payments/record` : null;

  const query = useQuery({
    queryKey: ["finance", "ledger", slug],
    queryFn: () =>
      apiFetch<{ success: boolean; data: LedgerEntry[] }>(`/billing/${slug}/payment-history`, { showErrorToast: false }),
    enabled: canSee,
    staleTime: 30_000,
  });

  const entries = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (query.data?.data ?? []).filter((entry) => {
      if (filter === "online" && !["PAYSTACK", "MONNIFY"].includes(entry.channel)) return false;
      if (filter !== "all" && filter !== "online" && entry.channel !== filter) return false;
      if (!needle) return true;
      return (
        studentName(entry).toLowerCase().includes(needle) ||
        entry.reference.toLowerCase().includes(needle) ||
        (entry.invoice?.student?.admissionNumber ?? "").toLowerCase().includes(needle)
      );
    });
  }, [query.data, filter, search]);

  const header = (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="hidden md:block">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payments</h1>
        <p className="mt-1 text-sm text-slate-500">Every fee payment, newest first — at the bursary and online.</p>
      </div>
      {recordHref && (
        <Button asChild className="h-11 rounded-xl px-5 font-semibold">
          <Link href={recordHref}>
            <HandCoins className="mr-2 h-4 w-4" /> Record payment
          </Link>
        </Button>
      )}
    </header>
  );

  if (!canSee) {
    // A role that can take money but not read the books still gets its one job.
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        {header}
        <DataStateCard
          variant="forbidden"
          title="Payment history isn't part of your role"
          description="You can still record payments. A school admin decides who sees the full history."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {header}

      <div className="space-y-3">
        <label className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/20">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="sr-only">Search payments</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Student, admission no. or reference"
            className="min-w-0 flex-1 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400 md:text-sm"
          />
        </label>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0" role="group" aria-label="Filter by how it was paid">
          {FILTERS.map((option) => (
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
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {query.isPending ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : query.isError ? (
        isForbiddenError(query.error) ? (
          <DataStateCard variant="forbidden" />
        ) : (
          <div className="space-y-4 text-center">
            <DataStateCard variant="error" />
            <Button variant="outline" onClick={() => void query.refetch()}>
              <RotateCw className="mr-2 h-4 w-4" /> Try again
            </Button>
          </div>
        )
      ) : entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
          <Banknote className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm font-semibold text-slate-700">
            {search || filter !== "all" ? "No payments match" : "No payments yet"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {search || filter !== "all"
              ? "Try another name, reference or filter."
              : "Money taken at the bursary and online fee payments appear here."}
          </p>
        </div>
      ) : (
        <>
          {/* Phones: one row per payment */}
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white md:hidden">
            {entries.map((entry) => {
              const chip = STATUS_CHIP[entry.status];
              return (
                <li key={entry.id} className="flex min-h-[68px] items-center gap-3 px-4 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold capitalize text-slate-900">{studentName(entry)}</span>
                    <span className="block truncate text-xs text-slate-500">
                      {channelLabel(entry.channel)} · {paymentTime(entry.createdAt)}
                      {entry.invoice?.academicTerm ? ` · ${termLabel(entry.invoice.academicTerm)}` : ""}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block text-sm font-semibold tabular-nums text-slate-900">{formatNaira(Number(entry.amount))}</span>
                    {chip && (
                      <span className={cn("mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs font-semibold", chip.className)}>
                        {chip.label}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>

          {/* Desktop: the ledger as a table */}
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200/70 bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-500">
                  <th scope="col" className="px-5 py-3 font-medium">When</th>
                  <th scope="col" className="px-3 py-3 font-medium">Student</th>
                  <th scope="col" className="px-3 py-3 font-medium">Term</th>
                  <th scope="col" className="px-3 py-3 font-medium">Paid by</th>
                  <th scope="col" className="px-3 py-3 font-medium">Reference</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((entry) => {
                  const chip = STATUS_CHIP[entry.status];
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/60">
                      <td className="whitespace-nowrap px-5 py-3 text-slate-500">{paymentTime(entry.createdAt)}</td>
                      <td className="px-3 py-3">
                        <span className="block font-medium capitalize text-slate-900">{studentName(entry)}</span>
                        {entry.invoice?.student?.admissionNumber && (
                          <span className="block text-xs text-slate-500">{entry.invoice.student.admissionNumber}</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-slate-600">{termLabel(entry.invoice?.academicTerm)}</td>
                      <td className="px-3 py-3 text-slate-600">
                        {channelLabel(entry.channel)}
                        {chip && (
                          <span className={cn("ml-2 rounded-full px-2 py-0.5 text-xs font-semibold", chip.className)}>
                            {chip.label}
                          </span>
                        )}
                      </td>
                      <td className="max-w-[180px] truncate px-3 py-3 font-mono text-xs text-slate-500">{entry.reference}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-right font-semibold tabular-nums text-slate-900">
                        {formatNaira(Number(entry.amount))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-center text-xs text-slate-500">Showing the latest {entries.length} payments.</p>
        </>
      )}
    </div>
  );
}
