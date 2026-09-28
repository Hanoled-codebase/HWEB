"use client";

import { useState, useEffect } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { usePermissions } from "@/hooks/usePermissions";
import { DataStateCard } from "@/components/dashboard/shared";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  DollarSign, AlertTriangle, CheckCircle2, Users, Eye, Download,
} from "lucide-react";

type Debtor = {
  studentId: string; firstName: string; lastName: string;
  className: string; totalDebt: number; invoiceCount: number;
};

type InvoiceRow = {
  id: string; student: { firstName: string; lastName: string; classLevel: { name: string } | null };
  term: string; status: string; total: number; paid: number; dueDate: string;
};

export default function DebtPage() {
  const { currentOrg } = useOrganization();
  const { can } = usePermissions();
  // Follows what this school lets the viewer's role do (Settings → Staff access).
  const canSeeDebts = can("debt.view");
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"debtors" | "invoices">("debtors");
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [invLoading, setInvLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Debtor | null>(null);
  const [studentInvoices, setStudentInvoices] = useState<any>(null);
  const [studentLoading, setStudentLoading] = useState(false);

  useEffect(() => { if (!currentOrg) return; fetchOverview(); }, [currentOrg]);

  async function fetchOverview() {
    if (!currentOrg) return;
    try {
      const res = await apiFetch(`/debt/overview/${currentOrg.slug}`);
      const d = (res as any).data ?? res;
      setDebtors(d.debtors || []);
      setSummary(d.summary);
    } catch { /* */ } finally { setLoading(false); }
  }

  async function fetchInvoices() {
    if (!currentOrg) return;
    setInvLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      const res = await apiFetch(`/debt/invoices/${currentOrg.slug}?${params}`);
      const d = (res as any).data ?? res;
      setInvoices(Array.isArray(res) ? res : d);
    } catch { /* */ } finally { setInvLoading(false); }
  }

  async function viewStudentDetail(s: Debtor) {
    if (!currentOrg) return;
    setSelectedStudent(s);
    setStudentLoading(true);
    try {
      const res = await apiFetch(`/debt/student/${currentOrg.slug}/${s.studentId}`);
      setStudentInvoices((res as any).data ?? res);
    } catch { /* */ } finally { setStudentLoading(false); }
  }

  if (!currentOrg) return null;

  if (!canSeeDebts) {
    return (
      <div className="min-h-full bg-slate-50/60 pb-10">
        <div className="mx-auto max-w-5xl p-6">
          <DataStateCard
            variant="forbidden"
            title="Debt & compliance isn&apos;t available to your role"
            description="This is managed by the school&apos;s admin team."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50/60 pb-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:gap-6 md:px-6 md:py-8 lg:px-8">
        <div className="hidden md:block">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Debt Profile & Compliance</h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">Monitor outstanding fees and payment compliance.</p>
        </div>

        {!loading && summary && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-3 flex items-center gap-2 sm:p-4 sm:gap-3">
                <div className="rounded-full bg-rose-100 p-1.5 sm:p-2.5"><DollarSign className="h-4 w-4 text-rose-600 sm:h-5 sm:w-5" /></div>
                <div><p className="text-xs text-slate-500">Unpaid</p><p className="text-base font-bold text-slate-900 sm:text-lg">{summary.unpaidCount}</p></div>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-3 flex items-center gap-2 sm:p-4 sm:gap-3">
                <div className="rounded-full bg-amber-100 p-1.5 sm:p-2.5"><AlertTriangle className="h-4 w-4 text-amber-600 sm:h-5 sm:w-5" /></div>
                <div><p className="text-xs text-slate-500">Partial</p><p className="text-base font-bold text-slate-900 sm:text-lg">{summary.partialCount}</p></div>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-3 flex items-center gap-2 sm:p-4 sm:gap-3">
                <div className="rounded-full bg-emerald-100 p-1.5 sm:p-2.5"><CheckCircle2 className="h-4 w-4 text-emerald-600 sm:h-5 sm:w-5" /></div>
                <div><p className="text-xs text-slate-500">Paid</p><p className="text-base font-bold text-slate-900 sm:text-lg">{summary.paidCount}</p></div>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-3 flex items-center gap-2 sm:p-4 sm:gap-3">
                <div className="rounded-full bg-blue-100 p-1.5 sm:p-2.5"><Users className="h-4 w-4 text-blue-600 sm:h-5 sm:w-5" /></div>
                <div><p className="text-xs text-slate-500">Debtors</p><p className="text-base font-bold text-slate-900 sm:text-lg">{summary.totalStudents}</p></div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex items-center gap-4 border-b border-slate-200 pb-2">
          <button type="button" onClick={() => setTab("debtors")} aria-pressed={tab === "debtors"} className={cn("-mb-2 flex min-h-11 items-center border-b-2 px-1 text-sm font-medium transition-colors md:min-h-0 md:pb-2", tab === "debtors" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700")}>Top Debtors</button>
          <button type="button" onClick={() => { setTab("invoices"); fetchInvoices(); }} aria-pressed={tab === "invoices"} className={cn("-mb-2 flex min-h-11 items-center border-b-2 px-1 text-sm font-medium transition-colors md:min-h-0 md:pb-2", tab === "invoices" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700")}>All Invoices</button>
        </div>

        {tab === "debtors" && (
          loading ? <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          : debtors.length === 0
          ? <Card className="border-dashed border-slate-300"><CardContent className="flex flex-col items-center gap-3 py-12 text-center"><CheckCircle2 className="h-10 w-10 text-slate-300" /><p className="text-sm text-slate-600">No outstanding fees. Every invoice is paid.</p></CardContent></Card>
          : <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white md:rounded-lg">
              {debtors.map((d) => (
                <div key={d.studentId} className="flex min-h-16 items-center gap-3 px-4 py-3 sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-900 sm:text-sm">{d.firstName} {d.lastName}</p>
                    <p className="text-xs text-slate-500">{d.className} · {d.invoiceCount} invoice{d.invoiceCount > 1 ? "s" : ""}</p>
                  </div>
                  <div className="text-xs font-bold text-rose-600 shrink-0 sm:text-sm">₦{d.totalDebt.toLocaleString()}</div>
                  <button type="button" onClick={() => viewStudentDetail(d)} className="shrink-0 text-slate-300 hover:text-blue-600"><Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></button>
                </div>
              ))}
            </div>
        )}

        {tab === "invoices" && (
          <>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Select value={filterStatus} onValueChange={(v: unknown) => { setFilterStatus(v as string); setTimeout(fetchInvoices, 0); }}>
                <SelectTrigger aria-label="Filter by status" className="h-11 w-full sm:h-9 sm:w-[180px] sm:text-sm"><SelectValue placeholder="All status" /></SelectTrigger>
                <SelectContent><SelectItem value="">All</SelectItem><SelectItem value="UNPAID">Unpaid</SelectItem><SelectItem value="PARTIALLY_PAID">Partial</SelectItem><SelectItem value="PAID">Paid</SelectItem></SelectContent>
              </Select>
            </div>
            {invLoading ? <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
            : invoices.length === 0
            ? <Card className="border-dashed border-slate-300"><CardContent className="flex flex-col items-center gap-3 py-12 text-center"><DollarSign className="h-10 w-10 text-slate-300" /><p className="text-sm text-slate-500">No invoices found.</p></CardContent></Card>
            : <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white md:rounded-lg">
                {invoices.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-2.5 px-3 py-2.5 text-xs sm:gap-4 sm:px-4 sm:py-3 sm:text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900">{inv.student.firstName} {inv.student.lastName}</p>
                      <p className="text-xs text-slate-500">{inv.term} · {inv.student.classLevel?.name || "—"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold">₦{inv.total.toLocaleString()}</p>
                      <p className="text-xs text-emerald-700">₦{inv.paid.toLocaleString()} paid</p>
                    </div>
                    <Badge variant="outline" className={cn("rounded-full px-2 py-0 text-xs shrink-0",
                      inv.status === "PAID" ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : inv.status === "PARTIALLY_PAID" ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-rose-200 bg-rose-50 text-rose-700"
                    )}>{inv.status}</Badge>
                  </div>
                ))}
              </div>
            }
          </>
        )}

        <Dialog open={!!selectedStudent} onOpenChange={() => { setSelectedStudent(null); setStudentInvoices(null); }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedStudent?.firstName} {selectedStudent?.lastName} — Debt Detail</DialogTitle>
              <DialogDescription className="sr-only">Shows billing, payments, and balance details for the selected student.</DialogDescription>
            </DialogHeader>
            {studentLoading ? <Skeleton className="h-40 w-full" /> : studentInvoices && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Total Billed</p><p className="font-bold text-lg">₦{studentInvoices.totalBilled?.toLocaleString()}</p></div>
                  <div className="rounded-lg bg-emerald-50 p-3"><p className="text-xs text-emerald-600">Total Paid</p><p className="font-bold text-lg text-emerald-700">₦{studentInvoices.totalPaid?.toLocaleString()}</p></div>
                  <div className="rounded-lg bg-rose-50 p-3"><p className="text-xs text-rose-600">Balance</p><p className="font-bold text-lg text-rose-700">₦{studentInvoices.balance?.toLocaleString()}</p></div>
                </div>
                <div className="divide-y divide-slate-100">
                  {studentInvoices.invoices?.map((inv: any) => (
                    <div key={inv.id} className="py-2 flex items-center justify-between text-sm">
                      <span className="text-slate-600">{inv.academicTerm}</span>
                      <span className="font-medium">₦{inv.items?.reduce((s: number, i: any) => s + Number(i.amount), 0).toLocaleString()}</span>
                      <Badge variant="outline" className={cn("rounded-full text-xs",
                        inv.status === "PAID" ? "text-emerald-700 border-emerald-200"
                        : inv.status === "PARTIALLY_PAID" ? "text-amber-700 border-amber-200"
                        : "text-rose-700 border-rose-200"
                      )}>{inv.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
