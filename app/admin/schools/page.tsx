"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"

import { HSMS_BASE } from "@/lib/api"

const API_BASE = HSMS_BASE
const ADMIN_API = `${API_BASE}/admin`

interface School {
  id: string; name: string; slug: string; city: string; state: string
  status: string; studentCount: number; expectedRevenue: number
  paymentStatus: string; amountOwed: number
  hosted: string; hostedSubdomain: string | null
  lastActivity: string; contactEmail: string; contactPhone: string
}

export default function AdminSchools() {
  const [schools, setSchools] = useState<School[]>([])
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("")

  useEffect(() => {
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (filterStatus) params.set("paymentStatus", filterStatus)
    fetch(`${ADMIN_API}/schools?${params}`, { credentials: "include" })
      .then(r => r.json())
      .then(setSchools)
  }, [search, filterStatus])

  const badgeColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-green-100 text-green-700"
      case "partial": return "bg-yellow-100 text-yellow-700"
      case "overdue": return "bg-red-100 text-red-700"
      case "pending": return "bg-slate-100 text-slate-700"
      default: return "bg-slate-100 text-slate-700"
    }
  }

  const hostedBadge = (tier: string) => {
    switch (tier) {
      case "hosted_dedicated": return <Badge className="bg-purple-100 text-purple-700">Hosted</Badge>
      case "planned": return <Badge className="bg-blue-100 text-blue-700">Planned</Badge>
      default: return <Badge variant="secondary">Shared SaaS</Badge>
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Schools Monitor</h1>

      <div className="flex gap-3 items-center">
        <Input
          placeholder="Search schools..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <select
          className="border rounded-md px-3 py-2 text-sm"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="">All payment status</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="overdue">Overdue</option>
          <option value="pending">Pending</option>
        </select>
        <span className="text-sm text-slate-500">{schools.length} schools</span>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="text-left px-4 py-3 font-medium text-slate-600">School</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Location</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Students</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Revenue</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">Payment</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Owed</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">Hosted</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {schools.map(s => (
                <tr key={s.id} className="border-b hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/schools/${s.id}`} className="font-medium text-blue-600 hover:underline">
                      {s.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{s.city || "—"}{s.state ? `, ${s.state}` : ""}</td>
                  <td className="px-4 py-3 text-right">{s.studentCount}</td>
                  <td className="px-4 py-3 text-right">₦{s.expectedRevenue.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge className={badgeColor(s.paymentStatus)}>{s.paymentStatus}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-red-600">
                    {s.amountOwed > 0 ? `₦${s.amountOwed.toLocaleString()}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">{hostedBadge(s.hosted)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/schools/${s.id}`}>
                      <Button variant="outline" size="sm">View</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
