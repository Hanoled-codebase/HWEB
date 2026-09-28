"use client";

import { useState, useEffect } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  DollarSign, Loader2, ExternalLink, CheckCircle2, AlertCircle,
} from "lucide-react";

type InvoiceItem = {
  id: string;
  description: string;
  amount: number;
  discountRate: number;
};

type Payment = {
  id: string;
  amount: number;
  status: string;
};

type Invoice = {
  id: string;
  academicTerm: string;
  status: string;
  dueDate: string | null;
  items: InvoiceItem[];
  payments: Payment[];
  balance: number;
};

export default function StudentInvoicesPage() {
  const { currentOrg } = useOrganization();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentOrg) return;
    fetchInvoices();
  }, [currentOrg]);

  async function fetchInvoices() {
    if (!currentOrg) return;
    try {
      const data = await apiFetch<Invoice[]>(
        `/billing/${currentOrg.slug}/my-invoices`,
      );
      setInvoices(data);
    } catch {
      /* apiFetch handles toast */
    } finally {
      setLoading(false);
    }
  }

  async function handlePay(invoiceId: string) {
    if (!currentOrg) return;
    setPayingId(invoiceId);
    try {
      const res = await apiFetch<{ authorizationUrl: string; reference: string }>(
        `/payments/init/${currentOrg.slug}`,
        { method: "POST", body: JSON.stringify({ invoiceId }) },
      );
      window.location.href = res.authorizationUrl;
    } catch {
      /* apiFetch handles toast */
    } finally {
      setPayingId(null);
    }
  }

  if (!currentOrg) return null;

  return (
    <div className="min-h-full bg-slate-50/60 pb-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-4 md:gap-6 md:px-6 md:py-8 lg:px-8">
        <div className="hidden md:block">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            My Invoices
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            View and pay your school fees.
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <Card className="border-dashed border-slate-300">
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-300" />
              <p className="text-sm text-slate-500">No invoices found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {invoices.map((inv) => {
              const total = inv.items.reduce(
                (s, i) => s + Number(i.amount) * (1 - Number(i.discountRate || 0) / 100),
                0,
              );
              const paid = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
              const balance = Math.max(0, total - paid);
              const isPaid = inv.status === "PAID" || balance <= 0;

              return (
                <Card key={inv.id} className="border-slate-200 shadow-sm overflow-hidden">
                  <div className={cn(
                    "h-1",
                    isPaid ? "bg-emerald-500" : balance < total ? "bg-amber-500" : "bg-rose-500",
                  )} />
                  <CardContent className="p-5">
                    {/* Header: Term name + badge */}
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900">
                        {inv.academicTerm}
                      </h3>
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
                        {inv.status}
                      </Badge>
                    </div>

                    {inv.dueDate && (
                      <p className="mt-1 text-xs text-slate-500">
                        Due: {new Date(inv.dueDate).toLocaleDateString()}
                      </p>
                    )}

                    {/* Fee items table */}
                    <div className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
                      {inv.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between py-2.5 text-sm">
                          <span className="text-slate-600">{item.description}</span>
                          <span className="font-medium text-slate-900 tabular-nums">
                            ₦{Number(item.amount).toLocaleString()}
                            {Number(item.discountRate) > 0 && (
                              <span className="ml-1 text-xs text-emerald-600">
                                (-{item.discountRate}%)
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Summary row */}
                    <div className="mt-3 flex items-end justify-between gap-4 border-t border-slate-200 pt-3">
                      {/* Paid & Balance (left side) */}
                      {!isPaid ? (
                        <div className="flex items-center gap-6">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">Paid</p>
                            <p className="text-sm font-semibold text-emerald-600 tabular-nums">
                              ₦{paid.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">Balance</p>
                            <p className={cn(
                              "text-sm font-bold tabular-nums",
                              balance > 0 ? "text-rose-600" : "text-slate-900",
                            )}>
                              ₦{balance.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div />
                      )}

                      {/* Total (right side) */}
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Total</p>
                        <p className="text-xl font-bold text-slate-900 tabular-nums">
                          ₦{total.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Pay button */}
                    {!isPaid && (
                      <div className="mt-4 flex justify-end">
                        <Button
                          onClick={() => handlePay(inv.id)}
                          disabled={payingId === inv.id}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {payingId === inv.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <ExternalLink className="mr-2 h-4 w-4" />
                          )}
                          Pay Now
                        </Button>
                      </div>
                    )}

                    {isPaid && (
                      <div className="mt-4 flex items-center gap-2 text-sm text-emerald-600">
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

        {!loading && invoices.length > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="flex items-start gap-3 p-4">
              <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Payment Information</p>
                <p className="mt-1 text-amber-700">
                  Payments are processed securely via Paystack. You will be
                  redirected to the Paystack checkout page to complete your
                  payment. After successful payment, your invoice status will
                  update automatically.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
