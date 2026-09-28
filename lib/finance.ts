import { apiFetch } from "@/lib/api";

/** Shapes returned by the HSMS bursary endpoints (Hanoled backend, routes/finance.js). */

export type FinanceOverview = {
  term: string | null;
  terms: string[];
  can: { totals: boolean; payments: boolean; debtors: boolean; payroll: boolean; record: boolean };
  totals?: {
    billed: number;
    collected: number;
    outstanding: number;
    invoiceCount: number;
    paidCount: number;
    partialCount: number;
    unpaidCount: number;
    debtorCount: number;
  };
  today?: { amount: number; count: number };
  debtorCount?: number;
  topDebtors?: Array<{
    studentId: string;
    name: string;
    admissionNumber: string | null;
    className: string | null;
    balance: number;
    invoiceCount: number;
  }>;
  recentPayments?: Array<{
    id: string;
    amount: number;
    channel: string;
    reference: string;
    createdAt: string;
    term: string | null;
    studentId: string | null;
    studentName: string;
    className: string | null;
  }>;
  payroll?: { month: string; pendingCount: number; pendingAmount: number; paidCount: number };
};

export type OpenInvoice = {
  id: string;
  term: string;
  status: "UNPAID" | "PARTIALLY_PAID";
  dueDate: string | null;
  total: number;
  paid: number;
  balance: number;
  items: Array<{ description: string; amount: number }>;
};

export type StudentWithBalance = {
  id: string;
  name: string;
  admissionNumber: string | null;
  className: string | null;
  balance: number;
  invoices: OpenInvoice[];
};

export type OfflineChannel = "CASH" | "BANK_TRANSFER" | "POS";

export type RecordedPayment = {
  payment: { id: string; reference: string; amount: number; channel: OfflineChannel; createdAt: string };
  invoice: { id: string; term: string; status: "PAID" | "PARTIALLY_PAID"; total: number; paid: number; balance: number };
  student: { id: string; name: string; admissionNumber: string | null };
};

export const financeQueries = {
  overview: (slug: string, term: string | null) => ({
    queryKey: ["finance", "overview", slug, term ?? "current"] as const,
    queryFn: () =>
      apiFetch<FinanceOverview>(`/finance/${slug}/overview`, {
        params: term ? { term } : undefined,
        showErrorToast: false,
      }),
  }),
};

export function searchOpenInvoices(slug: string, q: string) {
  return apiFetch<{ students: StudentWithBalance[] }>(`/finance/${slug}/open-invoices`, {
    params: { q },
    showErrorToast: false,
  });
}

export function recordPayment(
  slug: string,
  invoiceId: string,
  body: { amount: number; channel: OfflineChannel; reference?: string; note?: string },
) {
  return apiFetch<RecordedPayment>(`/finance/${slug}/invoices/${invoiceId}/payments`, {
    method: "POST",
    body: JSON.stringify(body),
    showErrorToast: false,
  });
}

// ── Formatting ───────────────────────────────────────────────────────────

const naira = new Intl.NumberFormat("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** ₦155,000 · ₦1,250.50 */
export function formatNaira(amount: number) {
  return `₦${naira.format(amount || 0)}`;
}

const ORDINAL = ["1st", "2nd", "3rd"];

/** "2026/2027-TERM1" → "1st Term 2026/2027". Anything else is shown as stored. */
export function termLabel(term: string | null | undefined) {
  if (!term) return "";
  const match = /^(\d{4}\/\d{4})-TERM(\d)$/i.exec(term);
  if (!match) return term;
  const index = Number(match[2]) - 1;
  return `${ORDINAL[index] ?? `${match[2]}th`} Term ${match[1]}`;
}

const CHANNEL_LABELS: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Transfer",
  POS: "POS",
  PAYSTACK: "Paystack",
  MONNIFY: "Monnify",
};

export function channelLabel(channel: string) {
  return CHANNEL_LABELS[channel] ?? channel.charAt(0) + channel.slice(1).toLowerCase();
}

/** "9:41 AM" today, "Yesterday", then "12 Sep". */
export function paymentTime(value: string) {
  const date = new Date(value);
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (date.getTime() >= startOfToday) {
    return date.toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" });
  }
  if (date.getTime() >= startOfToday - dayMs) return "Yesterday";
  return date.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

/** "2026-09" → "September 2026" */
export function monthLabel(month: string) {
  const [year, m] = month.split("-").map(Number);
  if (!year || !m) return month;
  return new Date(year, m - 1, 1).toLocaleDateString("en-NG", { month: "long", year: "numeric" });
}

/** Share of the term's bills already paid, 0–100. */
export function collectionRate(totals: { billed: number; outstanding: number }) {
  if (!totals.billed) return 0;
  return Math.min(100, Math.max(0, Math.round(((totals.billed - totals.outstanding) / totals.billed) * 100)));
}
