"use client";

import { useState, useEffect } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ComingSoonCard } from "@/components/dashboard/ComingSoon";
import { cn } from "@/lib/utils";
import { invoiceStatusLabel, termLabel } from "@/lib/finance";
import {
  DollarSign, Loader2, ExternalLink, CheckCircle2, GraduationCap,
  History, Bus, AlertCircle, CreditCard, Wallet,
} from "lucide-react";

type FeeItem = {
  id: string; name: string; category: string; amount: number;
};

type InvoiceItem = {
  id: string; description: string; amount: number; discountRate: number;
};

type Invoice = {
  id: string; academicTerm: string; status: string; dueDate: string | null;
  total: number; paid: number; balance: number;
  items: InvoiceItem[];
};

type Payment = {
  id: string; reference: string; amount: number; channel: string;
  term: string; createdAt: string;
};

type SuggestedFee = {
  id: string; name: string; category: string; amount: number;
};

type StudentFeeData = {
  student: {
    id: string; firstName: string; lastName: string;
    admissionNumber: string | null; studentType: string | null;
    usesBus: boolean; classLevel: { id: string; name: string } | null;
  };
  feeSummary: {
    totalFee: number; totalBilled: number; totalPaid: number; balance: number;
    assignedFees: FeeItem[];
  };
  invoices: Invoice[];
  payments: Payment[];
  suggestedFees: SuggestedFee[];
};

type FeeSummaryResponse = {
  students: StudentFeeData[];
};

// ─────────────────────────────────────────────────────────────────────────────
// MVP LAUNCH (PARKED — read me, agent!)
// The whole fee/payment experience below — the parent's fee summary, invoices
// and the Paystack payment handoff — is deliberately gated behind
// `PARKED_FOR_MVP` while we go live with version one. It is NOT dead code:
// switch `PARKED_FOR_MVP` from true to false screen by screen to restore it.
// Search this repo for "MVP_LAUNCH" to find every parked surface.
// ─────────────────────────────────────────────────────────────────────────────
const PARKED_FOR_MVP = true;

export default function ParentInvoicesPage() {
  if (PARKED_FOR_MVP) {
    return (
      <ComingSoonCard
        title="Fees & invoices are coming soon"
        blurb="You will settle school fees online and follow every invoice and receipt from this page. For now, pay at the school bursary and your records sync once payments go live."
        backHref="/welcome"
      />
    );
  }
  return <ParentInvoicesLive />;
}

function ParentInvoicesLive() {
  const { currentOrg } = useOrganization();
  const [data, setData] = useState<FeeSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!currentOrg) return;
    fetchSummary();
  }, [currentOrg]);

  async function fetchSummary() {
    if (!currentOrg) return;
    try {
      const res = await apiFetch<FeeSummaryResponse>(
        `/billing/${currentOrg.slug}/parent-fee-summary`,
      );
      setData(res);
      if (res.students.length > 0 && !selectedStudentId) {
        setSelectedStudentId(res.students[0].student.id);
      }
    } catch {
      /* apiFetch handles toast */
    } finally {
      setLoading(false);
    }
  }

  async function handlePay(invoiceId: string, amount?: number) {
    if (!currentOrg) return;
    setPayingId(invoiceId);
    try {
      const body: Record<string, unknown> = { invoiceId };
      if (amount && amount > 0) body.amount = amount;
      const res = await apiFetch<{ authorizationUrl: string; reference: string }>(
        `/payments/init/${currentOrg.slug}`,
        { method: "POST", body: JSON.stringify(body) },
      );
      window.location.href = res.authorizationUrl;
    } catch {
      /* apiFetch handles toast */
    } finally {
      setPayingId(null);
    }
  }

  const selected = data?.students.find((s) => s.student.id === selectedStudentId);

  if (!currentOrg) return null;

  return (
    <div className="min-h-full bg-slate-50/60 pb-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-4 md:gap-6 md:px-6 md:py-8 lg:px-8">
        <div className="hidden md:block">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Fee Overview
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            School fees, payments, and invoicing for your children.
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        ) : !data || data.students.length === 0 ? (
          <Card className="border-dashed border-slate-300">
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-300" />
              <p className="text-sm text-slate-500">No fee information available.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Student selector */}
            {data.students.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {data.students.map((s) => {
                  const active = s.student.id === selectedStudentId;
                  return (
                    <button
                      key={s.student.id}
                      type="button"
                      onClick={() => setSelectedStudentId(s.student.id)}
                      className={cn(
                        "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold",
                        active
                          ? "border-blue-700 bg-blue-700 text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                      )}
                    >
                      {s.student.firstName} {s.student.lastName}
                    </button>
                  );
                })}
              </div>
            )}

            {selected && (
              <>
                {/* Student info header */}
                <div className="flex items-center gap-3">
                  <GraduationCap className="h-6 w-6 text-blue-600" />
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {selected.student.firstName} {selected.student.lastName}
                      {selected.student.admissionNumber && (
                        <span className="ml-2 text-sm font-normal text-slate-500">
                          {selected.student.admissionNumber}
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {selected.student.classLevel?.name || "Unassigned"}
                      {selected.student.studentType === "boarding" && (
                        <span className="ml-2 text-purple-600 font-medium">· Boarding</span>
                      )}
                      {selected.student.usesBus && (
                        <span className="ml-2 text-amber-600 font-medium">· Uses Bus</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Fee Summary Card */}
                <Card className="border-slate-200 shadow-sm overflow-hidden">
                  <div className="h-1.5 bg-blue-600" />
                  <CardContent className="p-5">
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="text-center">
                        <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">
                          Total Fee
                        </p>
                        <p className="mt-1 text-2xl font-bold text-slate-900">
                          ₦{selected.feeSummary.totalFee.toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {selected.feeSummary.assignedFees.length} fee items
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">
                          Paid
                        </p>
                        <p className="mt-1 text-2xl font-bold text-emerald-600">
                          ₦{selected.feeSummary.totalPaid.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">
                          Balance
                        </p>
                        <p className={cn(
                          "mt-1 text-2xl font-bold",
                          selected.feeSummary.balance <= 0
                            ? "text-emerald-600"
                            : "text-rose-600",
                        )}>
                          ₦{selected.feeSummary.balance.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    {selected.feeSummary.totalFee > 0 && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                          <span>Payment Progress</span>
                          <span>
                            {selected.feeSummary.totalFee > 0
                              ? Math.round(
                                  (selected.feeSummary.totalPaid / selected.feeSummary.totalFee) * 100,
                                )
                              : 0}%
                          </span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              selected.feeSummary.balance <= 0
                                ? "bg-emerald-500"
                                : "bg-blue-600",
                            )}
                            style={{
                              width: `${Math.min(
                                100,
                                Math.round(
                                  (selected.feeSummary.totalPaid / selected.feeSummary.totalFee) * 100,
                                ),
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Assigned Fee Items */}
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-slate-400" />
                      Fee Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 pt-0">
                    {selected.feeSummary.assignedFees.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-4">
                        No fees have been assigned yet. Contact the school.
                      </p>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {selected.feeSummary.assignedFees.map((fee) => (
                          <div key={fee.id} className="flex items-center justify-between py-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "rounded-full text-xs px-2 py-0 font-medium",
                                  fee.category === "tuition" && "border-blue-200 bg-blue-50 text-blue-700",
                                  fee.category === "boarding" && "border-purple-200 bg-purple-50 text-purple-700",
                                  fee.category === "transport" && "border-amber-200 bg-amber-50 text-amber-700",
                                )}
                              >
                                {fee.category}
                              </Badge>
                              <span className="text-slate-700">{fee.name}</span>
                            </div>
                            <span className="font-medium text-slate-900">
                              ₦{fee.amount.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Wallet — Coming Soon */}
                <Card className="border-dashed border-slate-300 bg-slate-50/50">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200">
                          <Wallet className="h-5 w-5 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-700">Wallet</p>
                          <p className="text-xs text-slate-500">Fund your wallet and pay fees easily</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="rounded-full border-amber-200 bg-amber-50 text-xs font-medium text-amber-700 px-3 py-1">
                        Coming Soon
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Suggested Fees (Bus / Boarding) */}
                {selected.suggestedFees.length > 0 && (
                  <Card className="border-amber-200 shadow-sm bg-amber-50/40">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-800">
                        <Bus className="h-4 w-4" />
                        Additional Fees Available
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 pt-0 space-y-2">
                      {selected.suggestedFees.map((fee) => (
                        <div
                          key={fee.id}
                          className="flex items-center justify-between rounded-lg border border-amber-200 bg-white px-4 py-3"
                        >
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                            <span className="text-sm text-slate-700">{fee.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-slate-900">
                              ₦{fee.amount.toLocaleString()}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-amber-300 text-amber-700 hover:bg-amber-50"
                              onClick={async () => {
                                if (!currentOrg) return;
                                try {
                                  await apiFetch(
                                    `/fee-structure/student-assignments/${currentOrg.slug}`,
                                    {
                                      method: "POST",
                                      body: JSON.stringify({
                                        studentId: selected.student.id,
                                        feeItemId: fee.id,
                                      }),
                                    },
                                  );
                                  toast.success(`${fee.name} added`);
                                  fetchSummary();
                                } catch {
                                  toast.error("Failed to add fee");
                                }
                              }}
                            >
                              <CreditCard className="mr-1.5 h-3.5 w-3.5" />
                              Add & Pay
                            </Button>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Invoices */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-slate-400" />
                    Invoices
                  </h3>
                  {selected.invoices.length === 0 ? (
                    <Card className="border-dashed border-slate-300">
                      <CardContent className="py-8 text-center">
                        <p className="text-sm text-slate-500">No invoices yet.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {selected.invoices.map((inv) => {
                        const isPaid = inv.status === "PAID" || inv.balance <= 0;
                        return (
                          <Card key={inv.id} className="border-slate-200 shadow-sm overflow-hidden">
                            <div className={cn(
                              "h-1",
                              isPaid ? "bg-emerald-500" : inv.balance < inv.total ? "bg-amber-500" : "bg-rose-500",
                            )} />
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0 flex-1 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-slate-900 text-sm">
                                      {termLabel(inv.academicTerm)}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "rounded-full text-xs px-2 py-0",
                                        isPaid
                                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                          : inv.status === "PARTIALLY_PAID"
                                            ? "border-amber-200 bg-amber-50 text-amber-700"
                                            : "border-rose-200 bg-rose-50 text-rose-700",
                                      )}
                                    >
                                      {invoiceStatusLabel(isPaid ? "PAID" : inv.status)}
                                    </Badge>
                                  </div>
                                  <div className="divide-y divide-slate-100">
                                    {inv.items.map((item) => (
                                      <div key={item.id} className="flex justify-between py-1 text-sm">
                                        <span className="text-slate-600">{item.description}</span>
                                        <span className="font-medium text-slate-900">
                                          ₦{Number(item.amount).toLocaleString()}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div className="shrink-0 text-right space-y-1">
                                  <p className="text-xs text-slate-500">Total</p>
                                  <p className="text-lg font-bold text-slate-900">
                                    ₦{inv.total.toLocaleString()}
                                  </p>
                                  {inv.paid > 0 && (
                                    <p className="text-xs text-emerald-600 font-medium">
                                      ₦{inv.paid.toLocaleString()} paid
                                    </p>
                                  )}
                                  {!isPaid && (
                                    <p className="text-sm font-semibold text-rose-600">
                                      ₦{inv.balance.toLocaleString()} due
                                    </p>
                                  )}
                                </div>
                              </div>

                              {!isPaid && (
                                <div className="mt-3 flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500">Amount</span>
                                    <div className="relative">
                                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-500">₦</span>
                                      <input
                                        type="number"
                                        min={1}
                                        max={inv.balance}
                                        value={customAmounts[inv.id] ?? inv.balance}
                                        onChange={(e) =>
                                          setCustomAmounts((prev) => ({ ...prev, [inv.id]: e.target.value }))
                                        }
                                        className="w-24 rounded-md border border-slate-300 py-1.5 pl-5 pr-2 text-xs focus:border-blue-500 focus:outline-none"
                                      />
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      handlePay(inv.id, customAmounts[inv.id] ? Number(customAmounts[inv.id]) : undefined)
                                    }
                                    disabled={payingId === inv.id}
                                    className="bg-blue-600 hover:bg-blue-700"
                                  >
                                    {payingId === inv.id ? (
                                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                                    )}
                                    Pay Now
                                  </Button>
                                </div>
                              )}

                              {isPaid && (
                                <div className="mt-3 flex items-center gap-2 text-sm text-emerald-600 pt-3 border-t border-slate-100">
                                  <CheckCircle2 className="h-4 w-4" />
                                  <span className="font-medium">Fully paid</span>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Payment History */}
                {selected.payments.length > 0 && (
                  <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <History className="h-4 w-4 text-slate-400" />
                        Payment History
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 pt-0">
                      <div className="divide-y divide-slate-100">
                        {selected.payments.map((tx) => (
                          <div key={tx.id} className="flex items-center justify-between py-2.5 text-sm">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-7 w-7 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-slate-900 truncate">
                                  {tx.reference.slice(0, 16)}...
                                </p>
                                <p className="text-xs text-slate-500">
                                  {tx.term} · {new Date(tx.createdAt).toLocaleDateString("en-GB", {
                                    day: "numeric", month: "short", year: "numeric",
                                  })} · {tx.channel}
                                </p>
                              </div>
                            </div>
                            <span className="font-semibold text-emerald-600 shrink-0">
                              ₦{Number(tx.amount).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
