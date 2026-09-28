"use client";

import { useState, useEffect } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { apiFetch } from "@/lib/api";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  CreditCard, 
  Calendar, 
  Info, 
  History, 
  Users,
  FileText,
  Loader2,
  CheckCircle2,
  Clock4
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

type TransactionRecord = {
  id: string;
  reference: string;
  amount: number | string;
  channel: string;
  status: string;
  createdAt: string;
  invoice?: {
    id: string;
    academicTerm: string;
    status: string;
    student?: {
      firstName: string;
      lastName: string;
      admissionNumber: string | null;
    };
  };
};

export default function BillingPage() {
  const { currentOrg, currentMember } = useOrganization();
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    if (!currentOrg?.slug) return;
    const orgSlug = currentOrg.slug;
    async function fetchHistory() {
      try {
        setLoadingHistory(true);
        const res = await apiFetch<{ success: boolean; data: TransactionRecord[] }>(
          `/billing/${orgSlug}/payment-history`
        );
        if (res?.data) {
          setTransactions(res.data);
        }
      } catch (err) {
        // Handled silently
      } finally {
        setLoadingHistory(false);
      }
    }
    fetchHistory();
  }, [currentOrg]);

  if (!currentOrg || !currentMember) return null;

  const isOwner = currentMember.role === "owner";
  const studentCount = currentOrg.counts.students || 0;
  
  // Logic from PRD: > 50 students means Growth plan required
  const currentPlan = studentCount > 50 ? "Growth" : "Startup";
  const status = currentOrg.paymentStatus || "pending";
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "border-0 bg-emerald-50/80 text-emerald-700 tracking-wider";
      case "pending": return "border-0 bg-amber-50/80 text-amber-700 tracking-wider";
      default: return "border-0 bg-slate-50/80 text-slate-700 tracking-wider";
    }
  };

  return (
    <div className="max-w-5xl space-y-4 md:space-y-8">
      <div className="hidden md:block">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Billing & Subscription</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
          Manage your school's plan, view student capacity, and payment history.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Plan Overview Card */}
        <Card className="overflow-hidden border-slate-200 shadow-sm lg:col-span-2">
          <CardHeader className="bg-slate-50/50 pb-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-xl font-bold leading-7">Current Plan: {currentPlan}</CardTitle>
                <CardDescription>
                  Your school is currently on the <span className="font-bold text-slate-900">{currentPlan}</span> plan.
                </CardDescription>
              </div>
              <Badge className={getStatusColor(status)}>
                {status.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-8">
            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50/50 rounded-lg">
                    <Users className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Student Capacity</p>
                    <p className="text-xl font-bold text-slate-900 sm:text-2xl">{studentCount} Students</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Plan usage</span>
                    <span className="font-medium text-slate-900">{Math.min(100, (studentCount / 50) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${studentCount > 50 ? 'bg-amber-500' : 'bg-blue-600'}`} 
                      style={{ width: `${Math.min(100, (studentCount / 50) * 100)}%` }} 
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    {studentCount <= 50 
                      ? "Free up to 50 students. Upgrade to Growth for unlimited." 
                      : "You have exceeded the Startup plan limit. Upgrade recommended."}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50/50 rounded-lg">
                    <Calendar className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Next Renewal</p>
                    <p className="text-xl font-bold text-slate-900 sm:text-2xl">Termly</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <CreditCard className="h-5 w-5 text-slate-400" />
                  <span className="text-sm text-slate-500">No payment method added</span>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-3 border-t border-slate-100 bg-slate-50/30 p-4 md:flex-row md:items-center md:justify-between md:px-6">
             <p className="text-sm text-slate-500 font-medium">
               Estimated: <span className="text-slate-900">₦{currentPlan === "Growth" ? (studentCount * 3000).toLocaleString() : "0"}</span> / term
             </p>
             <div className="flex flex-col gap-3 min-[420px]:flex-row sm:justify-end">
               <Button variant="outline" size="sm" className="w-full min-[420px]:w-auto">Modify Plan</Button>
                <Button size="sm" className="w-full bg-blue-600 shadow-sm hover:bg-blue-700 min-[420px]:w-auto">
                  {studentCount > 50 ? "Upgrade Now" : "Manage Billing"}
                </Button>
             </div>
          </CardFooter>
        </Card>

        {/* Pricing Notice Card */}
        <Card className="border-blue-100/50 bg-blue-50/20 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-400" />
              Pricing Notice
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-6 text-slate-600">
            <p>
              Hanoled uses a per-student, per-term pricing model to keep institutional costs fair and transparent.
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-1.5">
                <span className="font-medium text-slate-700">Startup</span>
                <span className="text-slate-900 font-semibold">₦0 (Max 50)</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="font-medium text-slate-700">Growth</span>
                <span className="text-slate-900 font-semibold">₦3,000 / student</span>
              </div>
            </div>
            <Separator className="bg-blue-100/50" />
            <p className="text-xs text-slate-500">
              Fees are billed at the start of every academic term.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payment History Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <History className="h-5 w-5 text-slate-400" />
          <h2 className="text-lg font-bold text-slate-900">Payment History</h2>
        </div>
        
        {/* Phones: one row per payment, amount right-aligned */}
        <div className="md:hidden">
          {loadingHistory ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-8 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" /> Loading payments…
            </div>
          ) : transactions.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">
              No subscription payments yet.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {transactions.map((tx) => (
                <li key={tx.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold capitalize text-slate-900">
                      {tx.invoice?.student
                        ? `${tx.invoice.student.firstName} ${tx.invoice.student.lastName}`
                        : tx.channel}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {new Date(tx.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                      <span className="mx-1 text-slate-300">·</span>
                      <span className="font-mono">{tx.reference}</span>
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums text-slate-900">
                      ₦{Number(tx.amount).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                    </p>
                    <p className={`text-xs font-medium ${tx.status === "SUCCESS" ? "text-emerald-700" : "text-amber-700"}`}>
                      {tx.status === "SUCCESS" ? "Paid" : tx.status.toLowerCase()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Card className="hidden shadow-sm border-slate-200 md:block">
          <div className="overflow-x-auto">
            <table className="min-w-[640px] w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-4 font-semibold text-slate-600">Reference</th>
                  <th className="px-6 py-4 font-semibold text-slate-600">Date</th>
                  <th className="px-6 py-4 font-semibold text-slate-600">Amount</th>
                  <th className="px-6 py-4 font-semibold text-slate-600">Channel / Details</th>
                  <th className="px-6 py-4 font-semibold text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingHistory ? (
                  <tr>
                    <td className="px-6 py-8 text-center" colSpan={5}>
                      <div className="flex items-center justify-center gap-2 text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        <span>Loading transactions...</span>
                      </div>
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td className="px-6 py-14 text-center" colSpan={5}>
                      <div className="flex flex-col items-center gap-3">
                        <FileText className="h-8 w-8 text-slate-300" />
                        <p className="text-sm text-slate-500 font-normal">
                          No transactions recorded yet for this organization.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-3.5 font-mono text-xs text-slate-800 font-medium">
                        {tx.reference}
                      </td>
                      <td className="px-6 py-3.5 text-slate-600 text-xs">
                        {new Date(tx.createdAt).toLocaleDateString("en-NG", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-3.5 font-semibold text-slate-900">
                        ₦{Number(tx.amount).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-600">
                        <span className="capitalize font-medium">{tx.channel}</span>
                        {tx.invoice?.student && (
                          <span className="text-slate-400 block">
                            {tx.invoice.student.firstName} {tx.invoice.student.lastName} ({tx.invoice.academicTerm})
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        {tx.status === "SUCCESS" ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Success
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">
                            <Clock4 className="h-3 w-3 mr-1" />
                            {tx.status}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  );
}
