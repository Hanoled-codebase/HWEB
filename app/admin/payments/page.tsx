"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

import { HSMS_BASE } from "@/lib/api"

const API_BASE = HSMS_BASE
const ADMIN_API = `${API_BASE}/admin`

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Payment Tracker</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>Record Payment</Button>
          </DialogTrigger>
          <DialogContent>
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

      <div className="grid grid-cols-3 gap-4">
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
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          ⚠ {records.filter(r => r.daysOverdue > 7).length} schools overdue by more than 7 days
        </div>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="text-left px-4 py-3 font-medium text-slate-600">School</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Term</th>
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
                  <td className="px-4 py-3 font-medium">{r.schoolName}</td>
                  <td className="px-4 py-3 text-slate-600">{r.term}</td>
                  <td className="px-4 py-3 text-right">₦{r.amountBilled.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">₦{r.amountPaid.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-medium text-red-600">₦{r.balanceOwed.toLocaleString()}</td>
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
