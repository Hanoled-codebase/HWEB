"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  CreditCard,
  Landmark,
  Loader2,
  Search,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useOrganization } from "@/hooks/useOrganization";
import { ComingSoonCard } from "@/components/dashboard/ComingSoon";
import { usePermissions } from "@/hooks/usePermissions";
import { isForbiddenError, type ApiFetchError } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  formatNaira,
  recordPayment,
  searchOpenInvoices,
  termLabel,
  type OfflineChannel,
  type OpenInvoice,
  type RecordedPayment,
  type StudentWithBalance,
} from "@/lib/finance";
import { DataStateCard } from "@/components/dashboard/shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Taking money at the bursary: find the student, pick the bill, enter what
 * was paid and how, confirm, and hand over a receipt number. Built for a
 * phone held in one hand at a busy desk — every step is one screen, the
 * primary action sits at the thumb, and nothing is saved until the second
 * tap confirms the amount.
 */

const CHANNELS: Array<{ key: OfflineChannel; label: string; icon: LucideIcon; reference: string; placeholder: string }> = [
  { key: "CASH", label: "Cash", icon: Banknote, reference: "Receipt number", placeholder: "Leave blank to number it for you" },
  { key: "BANK_TRANSFER", label: "Transfer", icon: Landmark, reference: "Bank reference", placeholder: "From the teller or credit alert" },
  { key: "POS", label: "POS", icon: CreditCard, reference: "POS receipt number", placeholder: "Printed on the POS slip" },
];

export default function RecordPaymentPage() {
  const { currentOrg } = useOrganization();
// ─────────────────────────────────────────────────────────────────────────────
// MVP LAUNCH (PARKED — read me, agent!)
// The full implementation below is deliberately gated behind PARKED_FOR_MVP
// while Hanoled goes live with version one. It is NOT dead code: flip the
// flag to false to restore this surface. Search "MVP_LAUNCH" repo-wide to
// find every parked feature.
// ─────────────────────────────────────────────────────────────────────────────
const PARKED_FOR_MVP = true;
  if (PARKED_FOR_MVP) {
    return (
      <ComingSoonCard
        title="Recording payments is coming soon"
        blurb="Cash and transfer payments recorded against student bills arrive in the next release. Keep the bursary book until then."
        backHref={currentOrg?.slug ? `/dashboard/school/${encodeURIComponent(currentOrg.slug)}` : "/dashboard"}
      />
    );
  }

  return (
    <Suspense fallback={<RecordSkeleton />}>
      <RecordPayment />
    </Suspense>
  );
}

function RecordSkeleton() {
  return (
    <div className="mx-auto max-w-xl space-y-4" aria-busy="true">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-12 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  );
}

function RecordPayment() {
  const { currentOrg } = useOrganization();
  const { can } = usePermissions();
  const params = useSearchParams();
  const initialQuery = params.get("q") ?? "";

  const [student, setStudent] = useState<StudentWithBalance | null>(null);
  const [receipt, setReceipt] = useState<RecordedPayment | null>(null);

  if (!currentOrg) return null;
  const slug = currentOrg.slug;
  const home = `/dashboard/school/${slug}`;

  if (!can("payments.record")) {
    return (
      <div className="mx-auto max-w-xl">
        <DataStateCard
          variant="forbidden"
          title="Recording payments isn't part of your role"
          description="A school admin decides which roles can take payments. Ask them if you need it."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <header className="mb-5 hidden md:block">
        <Link href={home} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-4 w-4" /> Bursary
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Record a payment</h1>
        <p className="mt-1 text-sm text-slate-500">For money received at the school: cash, bank transfer or POS.</p>
      </header>

      {receipt ? (
        <Receipt
          receipt={receipt}
          home={home}
          onAnother={() => {
            setReceipt(null);
            setStudent(null);
          }}
        />
      ) : student ? (
        <PaymentForm
          slug={slug}
          student={student}
          onChangeStudent={() => setStudent(null)}
          onRecorded={setReceipt}
        />
      ) : (
        <FindStudent slug={slug} initialQuery={initialQuery} onPick={setStudent} />
      )}
    </div>
  );
}

// ── Step 1: find the student ─────────────────────────────────────────────

function FindStudent({
  slug,
  initialQuery,
  onPick,
}: {
  slug: string;
  initialQuery: string;
  onPick: (student: StudentWithBalance) => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  // The last answer and which query it answered; while a newer query is in
  // flight the previous list stays up rather than flashing empty.
  const [found, setFound] = useState<{ q: string; students: StudentWithBalance[] } | null>(null);
  const [failedFor, setFailedFor] = useState<string | null>(null);
  // Coming from a debtor's row: open that student straight away if they are
  // the only match, instead of making the accountant tap them again.
  const autoPick = useRef(Boolean(initialQuery));

  const trimmed = query.trim();
  const active = trimmed.length >= 2;
  const failed = active && failedFor === trimmed;
  const searching = active && !failed && found?.q !== trimmed;
  const results = active ? found?.students ?? null : null;

  useEffect(() => {
    if (trimmed.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const { students } = await searchOpenInvoices(slug, trimmed);
        if (cancelled) return;
        setFailedFor(null);
        setFound({ q: trimmed, students });
        if (autoPick.current && students.length === 1) onPick(students[0]);
      } catch {
        if (!cancelled) setFailedFor(trimmed);
      } finally {
        autoPick.current = false;
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [slug, trimmed, onPick]);

  return (
    <div className="space-y-4">
      <label className="flex h-12 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 shadow-[0_1px_2px_rgba(11,18,32,0.04)] focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/20">
        <Search className="h-5 w-5 shrink-0 text-slate-400" />
        <span className="sr-only">Search students</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Student name or admission number"
          autoComplete="off"
          enterKeyHint="search"
          // 16px keeps iOS from zooming the page when the field is focused.
          className="min-w-0 flex-1 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400 [&::-webkit-search-cancel-button]:appearance-none"
        />
        {searching ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400" aria-label="Searching" />
        ) : query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="-mr-2 flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </label>

      {failed ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          Couldn&apos;t search right now. Check your connection and try again.
        </p>
      ) : results === null ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
          <UserRound className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm font-semibold text-slate-700">Who is paying?</p>
          <p className="mt-1 text-xs text-slate-500">Type at least two letters of a name or admission number.</p>
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
          <p className="text-sm font-semibold text-slate-700">No one owing matches &ldquo;{trimmed}&rdquo;</p>
          <p className="mt-1 text-xs text-slate-500">
            Only students with an unpaid bill show here. Check the spelling, or bill the student first.
          </p>
        </div>
      ) : (
        <ul
          aria-busy={searching}
          className={cn(
            "divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white transition-opacity",
            searching && "opacity-60",
          )}
        >
          {results.map((student) => (
            <li key={student.id}>
              <button
                type="button"
                onClick={() => onPick(student)}
                className="flex min-h-[68px] w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50 active:bg-slate-50"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold capitalize text-slate-900">{student.name}</span>
                  <span className="block truncate text-xs text-slate-500">
                    {[student.className, student.admissionNumber].filter(Boolean).join(" · ") || "No class on record"}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block text-sm font-bold tabular-nums text-red-600">{formatNaira(student.balance)}</span>
                  <span className="block text-xs text-slate-500">
                    {student.invoices.length} {student.invoices.length === 1 ? "bill" : "bills"}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Step 2: what was paid ────────────────────────────────────────────────

function parseAmount(value: string) {
  const cleaned = value.replace(/[₦,\s]/g, "");
  if (!cleaned) return null;
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? amount : NaN;
}

function PaymentForm({
  slug,
  student,
  onChangeStudent,
  onRecorded,
}: {
  slug: string;
  student: StudentWithBalance;
  onChangeStudent: () => void;
  onRecorded: (receipt: RecordedPayment) => void;
}) {
  const queryClient = useQueryClient();
  // Oldest bill first: money received settles the earliest debt by default.
  const ordered = useMemo(() => [...student.invoices].reverse(), [student.invoices]);
  const [invoices, setInvoices] = useState<OpenInvoice[]>(ordered);
  const [invoiceId, setInvoiceId] = useState(ordered[0]?.id ?? "");
  const invoice = invoices.find((candidate) => candidate.id === invoiceId) ?? invoices[0];

  const [amountText, setAmountText] = useState(() => (invoice ? String(invoice.balance) : ""));
  const [channel, setChannel] = useState<OfflineChannel>("CASH");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ amount?: string; reference?: string; form?: string }>({});

  const amount = parseAmount(amountText);
  const channelMeta = CHANNELS.find((option) => option.key === channel)!;

  function pickInvoice(next: OpenInvoice) {
    setInvoiceId(next.id);
    setAmountText(String(next.balance));
    setConfirming(false);
    setErrors({});
  }

  function validate() {
    if (!invoice) return "Choose a bill";
    if (amount === null) return "Enter the amount received";
    if (Number.isNaN(amount) || amount <= 0) return "Enter an amount above ₦0";
    if (Math.round(amount * 100) / 100 !== amount) return "Use at most two decimal places";
    if (amount > invoice.balance) return `That is more than the ${formatNaira(invoice.balance)} owed on this bill`;
    return null;
  }

  function review() {
    const problem = validate();
    if (problem) {
      setErrors({ amount: problem });
      return;
    }
    setErrors({});
    setConfirming(true);
  }

  async function submit() {
    if (!invoice || amount === null || Number.isNaN(amount)) return;
    setSaving(true);
    try {
      const result = await recordPayment(slug, invoice.id, {
        amount,
        channel,
        reference: reference.trim() || undefined,
        note: note.trim() || undefined,
      });
      void queryClient.invalidateQueries({ queryKey: ["finance"] });
      onRecorded(result);
    } catch (error) {
      setConfirming(false);
      const apiError = error as ApiFetchError;
      const message = apiError.message || "Couldn't record the payment. Nothing was saved; try again.";
      if (isForbiddenError(error)) {
        setErrors({ form: "Recording payments is no longer part of your role. Nothing was saved." });
      } else if (apiError.status === 409 && /reference/i.test(message)) {
        setErrors({ reference: message });
      } else if (apiError.status === 400 || apiError.status === 409) {
        const details = apiError.details as { balance?: number } | undefined;
        if (typeof details?.balance === "number") {
          // Someone else took a payment on this bill meanwhile: show the real balance.
          const balance = details.balance;
          setInvoices((current) => current.map((item) => (item.id === invoice.id ? { ...item, balance } : item)));
        }
        setErrors({ amount: message });
      } else {
        toast.error(message);
        setErrors({ form: "Nothing was saved. Check your connection and try again." });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 pb-28 md:pb-0">
      {/* Who */}
      <section className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">
          {student.name
            .split(" ")
            .slice(0, 2)
            .map((part) => part[0])
            .join("")
            .toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold capitalize text-slate-900">{student.name}</span>
          <span className="block truncate text-xs text-slate-500">
            {[student.className, student.admissionNumber].filter(Boolean).join(" · ")}
            {student.invoices.length > 1 && ` · owes ${formatNaira(student.balance)} in total`}
          </span>
        </span>
        <button
          type="button"
          onClick={onChangeStudent}
          className="min-h-[44px] shrink-0 rounded-lg px-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
        >
          Change
        </button>
      </section>

      {/* Which bill */}
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-slate-900">
          {invoices.length > 1 ? "Which bill is this for?" : "Bill"}
        </legend>
        <div className="space-y-2">
          {invoices.map((option) => {
            const selected = option.id === invoice?.id;
            return (
              <label
                key={option.id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-2xl border bg-white p-4 transition-colors",
                  selected ? "border-blue-600 ring-1 ring-blue-600" : "border-slate-200 hover:border-slate-300",
                )}
              >
                <input
                  type="radio"
                  name="invoice"
                  value={option.id}
                  checked={selected}
                  onChange={() => pickInvoice(option)}
                  className="mt-1 h-4 w-4 accent-blue-600"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-900">{termLabel(option.term)}</span>
                    <span className="text-sm font-bold tabular-nums text-slate-900">{formatNaira(option.balance)}</span>
                  </span>
                  <span className="mt-0.5 flex items-center justify-between gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <span
                        className={cn("h-1.5 w-1.5 rounded-full", option.status === "UNPAID" ? "bg-red-500" : "bg-amber-500")}
                        aria-hidden="true"
                      />
                      {option.status === "UNPAID" ? "Unpaid" : `Part-paid · ${formatNaira(option.paid)} in`}
                    </span>
                    <span>of {formatNaira(option.total)}</span>
                  </span>
                  {selected && option.items.length > 0 && (
                    <span className="mt-2 block border-t border-slate-100 pt-2 text-xs text-slate-500">
                      {option.items.map((item) => item.description).join(" · ")}
                    </span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* How much */}
      <div>
        <label htmlFor="amount" className="mb-2 block text-sm font-semibold text-slate-900">
          Amount received
        </label>
        <div
          className={cn(
            "flex h-14 items-center gap-1 rounded-xl border bg-white px-4 focus-within:ring-2",
            errors.amount
              ? "border-red-500 focus-within:ring-red-500/20"
              : "border-slate-200 focus-within:border-blue-600 focus-within:ring-blue-600/20",
          )}
        >
          <span className="text-2xl font-semibold text-slate-400">₦</span>
          <input
            id="amount"
            inputMode="decimal"
            autoComplete="off"
            value={amountText}
            onChange={(event) => {
              setAmountText(event.target.value);
              setConfirming(false);
              if (errors.amount) setErrors((current) => ({ ...current, amount: undefined }));
            }}
            aria-invalid={Boolean(errors.amount)}
            aria-describedby="amount-help"
            className="min-w-0 flex-1 bg-transparent text-2xl font-bold tabular-nums tracking-tight text-slate-900 outline-none"
          />
        </div>
        <div id="amount-help" className="mt-2 flex flex-wrap items-center gap-2">
          {errors.amount ? (
            <p className="text-sm text-red-600" role="alert">
              {errors.amount}
            </p>
          ) : (
            invoice &&
            amount !== invoice.balance && (
              <button
                type="button"
                onClick={() => {
                  setAmountText(String(invoice.balance));
                  setConfirming(false);
                }}
                className="min-h-[36px] rounded-full bg-blue-50 px-3 text-xs font-semibold text-blue-700 hover:bg-blue-100"
              >
                Full balance {formatNaira(invoice.balance)}
              </button>
            )
          )}
        </div>
      </div>

      {/* How it was paid */}
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-slate-900">Paid by</legend>
        <div className="grid grid-cols-3 gap-2">
          {CHANNELS.map((option) => {
            const selected = option.key === channel;
            return (
              <label
                key={option.key}
                className={cn(
                  "flex min-h-[64px] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border bg-white text-sm font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-600/30",
                  selected ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-700 hover:border-slate-300",
                )}
              >
                <input
                  type="radio"
                  name="channel"
                  value={option.key}
                  checked={selected}
                  onChange={() => {
                    setChannel(option.key);
                    setConfirming(false);
                  }}
                  className="sr-only"
                />
                <option.icon className="h-5 w-5" />
                {option.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Reference and note */}
      <div>
        <label htmlFor="reference" className="mb-2 block text-sm font-semibold text-slate-900">
          {channelMeta.reference} <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <input
          id="reference"
          value={reference}
          maxLength={64}
          onChange={(event) => {
            setReference(event.target.value);
            setConfirming(false);
            if (errors.reference) setErrors((current) => ({ ...current, reference: undefined }));
          }}
          placeholder={channelMeta.placeholder}
          autoComplete="off"
          aria-invalid={Boolean(errors.reference)}
          className={cn(
            "h-12 w-full rounded-xl border bg-white px-3.5 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2",
            errors.reference ? "border-red-500 focus:ring-red-500/20" : "border-slate-200 focus:border-blue-600 focus:ring-blue-600/20",
          )}
        />
        {errors.reference && (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {errors.reference}
          </p>
        )}
        {showNote ? (
          <div className="mt-4">
            <label htmlFor="note" className="mb-2 block text-sm font-semibold text-slate-900">
              Note <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="note"
              value={note}
              maxLength={200}
              onChange={(event) => setNote(event.target.value)}
              placeholder="e.g. Paid by the student's aunt"
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowNote(true)}
            className="mt-2 min-h-[44px] text-sm font-semibold text-blue-700"
          >
            + Add a note
          </button>
        )}
      </div>

      {errors.form && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {errors.form}
        </p>
      )}

      {/* The action: at the thumb on phones, inline on desktop. A second tap confirms. */}
      <div className="bottom-above-nav fixed inset-x-0 z-30 border-t border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur md:static md:mt-2 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <div className="mx-auto max-w-xl">
          {confirming && invoice && amount !== null && !Number.isNaN(amount) ? (
            <div className="space-y-2.5">
              <p className="text-center text-sm text-slate-600">
                <span className="font-bold text-slate-900">{formatNaira(amount)}</span> by {channelMeta.label.toLowerCase()} for{" "}
                <span className="font-semibold capitalize text-slate-900">{student.name}</span>
                {amount < invoice.balance && <> · {formatNaira(invoice.balance - amount)} will still be owed</>}
              </p>
              <div className="grid grid-cols-[auto_1fr] gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirming(false)}
                  disabled={saving}
                  className="h-12 rounded-xl px-5"
                >
                  Edit
                </Button>
                <Button type="button" onClick={submit} disabled={saving} className="h-12 rounded-xl text-base font-semibold">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  {saving ? "Recording…" : "Confirm payment"}
                </Button>
              </div>
            </div>
          ) : (
            <Button type="button" onClick={review} className="h-12 w-full rounded-xl text-base font-semibold">
              {amount && !Number.isNaN(amount) && amount > 0 ? `Record ${formatNaira(amount)}` : "Record payment"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Step 3: receipt ──────────────────────────────────────────────────────

function Receipt({ receipt, home, onAnother }: { receipt: RecordedPayment; home: string; onAnother: () => void }) {
  const cleared = receipt.invoice.balance <= 0;
  const channel = CHANNELS.find((option) => option.key === receipt.payment.channel)?.label ?? receipt.payment.channel;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-100 bg-white p-6 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
        </span>
        <h2 className="mt-4 text-xl font-bold text-slate-900">{formatNaira(receipt.payment.amount)} recorded</h2>
        <p className="mt-1 text-sm text-slate-500">
          {channel} from <span className="font-semibold capitalize text-slate-700">{receipt.student.name}</span> for{" "}
          {termLabel(receipt.invoice.term)}
        </p>

        <dl className="mx-auto mt-5 max-w-xs space-y-2 rounded-xl bg-slate-50 p-4 text-left text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">Receipt no.</dt>
            <dd className="font-mono font-semibold text-slate-900">{receipt.payment.reference}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">This bill</dt>
            <dd>
              {cleared ? (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Paid in full</span>
              ) : (
                <span className="font-semibold tabular-nums text-slate-900">{formatNaira(receipt.invoice.balance)} left</span>
              )}
            </dd>
          </div>
        </dl>
      </section>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button type="button" onClick={onAnother} className="h-12 rounded-xl text-base font-semibold">
          Record another
        </Button>
        <Button asChild variant="outline" className="h-12 rounded-xl text-base">
          <Link href={home}>Back to the bursary</Link>
        </Button>
      </div>
    </div>
  );
}
