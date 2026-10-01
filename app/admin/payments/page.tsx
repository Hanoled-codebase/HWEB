"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { AlertTriangle } from "lucide-react"
import { EmptyPanel, MList, PaymentChip, naira } from "@/components/admin/mobile-kit"

import { HSMS_BASE } from "@/lib/api"

const API_BASE = HSMS_BASE
const ADMIN_API = `${API_BASE}/api/admin`

interface PaymentRecord {
  id: string; schoolId: string; schoolName: string; term: string
  studentCount: number; amountBilled: number; amountPaid: number
  balanceOwed: number; dueDate: string; status: string
  daysOverdue: number; recordedBy: string; createdAt: string
}

export default function PaymentsPage() {
  const [records, setRecords] = useState<PaymentRecord[]>([])
  const [summary, setSummary] = useState({ totalBilled: 0, totalCollected: 0, totalOutstanding: 0 })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ organizationId: "", term: "", studentCount: "", amountBilled: "", amountPaid: "", dueDate: "", notes: "" })

  useEffect(() => {
    fetch(`${ADMIN_API}/payments`, { credentials: "include" })
      .then(r => r.json())
      .then(data => { setRecords(data.records); setSummary(data.summary) })
  }, [])

  const badgeColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-green-100 text-green-700"
      case "partial": return "bg-yellow-100 text-yellow-700"
      case "overdue": return "bg-red-100 text-red-700"
      default: return "bg-slate-100 text-slate-700"
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch(`${ADMIN_API}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        organizationId: form.organizationId,
        term: form.term,
        studentCount: parseInt(form.studentCount) || 0,
        amountBilled: parseFloat(form.amountBilled) || 0,
        amountPaid: parseFloat(form.amountPaid) || 0,
        dueDate: form.dueDate || null,
        notes: form.notes,
      }),
    })
    if (res.ok) {
      setDialogOpen(false)
      setForm({ organizationId: "", term: "", studentCount: "", amountBilled: "", amountPaid: "", dueDate: "", notes: "" })
      const data = await fetch(`${ADMIN_API}/payments`, { credentials: "include" }).then(r => r.json())
      setRecords(data.records)
      setSummary(data.summary)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end md:justify-between">
        <h1 className="hidden text-2xl font-bold text-slate-900 md:block">Payment Tracker</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="max-md:w-full">Record Payment</Button>
          </DialogTrigger>
          <DialogContent className="max-md:bottom-0 max-md:left-0 max-md:top-auto max-md:w-full max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-b-none max-md:rounded-t-3xl max-md:pb-[max(1rem,env(safe-area-inset-bottom))] max-md:max-h-[92dvh]">
            <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <Input placeholder="Organization ID" value={form.organizationId} onChange={e => setForm(p => ({ ...p, organizationId: e.target.value }))} required />
              <Input placeholder="Term (e.g. 2026 Term 3)" value={form.term} onChange={e => setForm(p => ({ ...p, term: e.target.value }))} required />
              <Input placeholder="Student Count" type="number" value={form.studentCount} onChange={e => setForm(p => ({ ...p, studentCount: e.target.value }))} />
              <Input placeholder="Amount Billed (₦)" type="number" value={form.amountBilled} onChange={e => setForm(p => ({ ...p, amountBilled: e.target.value }))} required />
              <Input placeholder="Amount Paid (₦)" type="number" value={form.amountPaid} onChange={e => setForm(p => ({ ...p, amountPaid: e.target.value }))} />
              <Input placeholder="Due Date" type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} />
              <Input placeholder="Notes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              <Button type="submit" className="w-full">Save</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Phone: a statement (billed, collected, outstanding), then one row per record. */}
      <div className="space-y-4 md:hidden">
        <section aria-label="Payment totals" className="divide-y divide-border rounded-2xl border border-border bg-card px-4">
          <div className="flex items-baseline justify-between gap-3 py-3">
            <p className="text-sm font-medium text-muted-foreground">Total billed</p>
            <p className="text-lg font-bold tabular-nums text-foreground">{naira(summary.totalBilled)}</p>
          </div>
          <div className="flex items-baseline justify-between gap-3 py-3">
            <p className="text-sm font-medium text-muted-foreground">Collected</p>
            <p className="text-lg font-bold tabular-nums text-success">{naira(summary.totalCollected)}</p>
          </div>
          <div className="flex items-baseline justify-between gap-3 py-3">
            <p className="text-sm font-medium text-muted-foreground">Outstanding</p>
            <p className={`text-lg font-bold tabular-nums ${summary.totalOutstanding > 0 ? "text-destructive" : "text-foreground"}`}>
              {naira(summary.totalOutstanding)}
            </p>
          </div>
        </section>

        {records.filter((r) => r.daysOverdue > 7).length > 0 && (
          <div role="status" className="flex items-start gap-2.5 rounded-2xl bg-destructive/10 p-3.5 text-sm font-medium text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {records.filter((r) => r.daysOverdue > 7).length} school
            {records.filter((r) => r.daysOverdue > 7).length === 1 ? " is" : "s are"} overdue by more than 7 days
          </div>
        )}

        {records.length === 0 ? (
          <EmptyPanel title="No payments recorded" hint="Tap Record Payment to log the first one." />
        ) : (
          <MList>
            {records.map((r) => (
              <article key={r.id} className="space-y-2.5 px-4 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-[15px] font-semibold leading-snug text-foreground">{r.schoolName}</p>
                    <p className="text-xs text-muted-foreground">{r.term}</p>
                  </div>
                  <PaymentChip status={r.status} />
                </div>
                <dl className="grid grid-cols-3 gap-2 text-xs">
                  <div className="flex flex-col-reverse">
                    <dt className="text-muted-foreground">Billed</dt>
                    <dd className="text-sm font-semibold tabular-nums text-foreground">{naira(r.amountBilled)}</dd>
                  </div>
                  <div className="flex flex-col-reverse">
                    <dt className="text-muted-foreground">Paid</dt>
                    <dd className="text-sm font-semibold tabular-nums text-foreground">{naira(r.amountPaid)}</dd>
                  </div>
                  <div className="flex flex-col-reverse">
                    <dt className="text-muted-foreground">Owed</dt>
                    <dd className={`text-sm font-semibold tabular-nums ${r.balanceOwed > 0 ? "text-destructive" : "text-foreground"}`}>
                      {naira(r.balanceOwed)}
                    </dd>
                  </div>
                </dl>
                {r.daysOverdue > 0 && (
                  <p className="text-xs font-semibold text-destructive">
                    {r.daysOverdue} day{r.daysOverdue === 1 ? "" : "s"} overdue
                  </p>
                )}
              </article>
            ))}
          </MList>
        )}
      </div>

      <div className="hidden grid-cols-3 gap-4 md:grid">
        <Card>
          <CardHeader><CardTitle className="text-sm text-slate-500">Total Billed</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">₦{summary.totalBilled.toLocaleString()}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-slate-500">Total Collected</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-600">₦{summary.totalCollected.toLocaleString()}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-slate-500">Outstanding</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-red-600">₦{summary.totalOutstanding.toLocaleString()}</p></CardContent>
        </Card>
      </div>

      {records.filter(r => r.daysOverdue > 7).length > 0 && (
        <div className="hidden bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm md:block">
          ⚠ {records.filter(r => r.daysOverdue > 7).length} schools overdue by more than 7 days
        </div>
      )}

      <Card className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="text-left px-4 py-3 font-medium text-slate-600">School</th>
                <th className="hidden text-left px-4 py-3 font-medium text-slate-600 xl:table-cell">Term</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Billed</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Paid</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Owed</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Overdue</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id} className={`border-b hover:bg-slate-50 ${r.daysOverdue > 7 ? "bg-red-50/50" : ""}`}>
                  <td className="px-4 py-3 font-medium">
                    {r.schoolName}
                    <span className="mt-0.5 block text-xs font-normal text-slate-500 xl:hidden">{r.term}</span>
                  </td>
                  <td className="hidden px-4 py-3 text-slate-600 xl:table-cell">{r.term}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">₦{r.amountBilled.toLocaleString()}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">₦{r.amountPaid.toLocaleString()}</td>
                  {/* Alert red only when something is owed; a settled bill reads as a dash, not "₦0" in red. */}
                  <td className={`whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums ${r.balanceOwed > 0 ? "text-red-600" : "text-slate-400"}`}>
                    {r.balanceOwed > 0 ? `₦${r.balanceOwed.toLocaleString()}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge className={badgeColor(r.status)}>{r.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right text-red-600">{r.daysOverdue > 0 ? `${r.daysOverdue}d` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
