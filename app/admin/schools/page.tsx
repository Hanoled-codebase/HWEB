"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Search } from "lucide-react"
import { CardList, Chip, ChipTabs, EmptyPanel, SchoolRow } from "@/components/admin/mobile-kit"

import { ADMIN_API, adminFetch } from "@/lib/admin-api"

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
    adminFetch(`${ADMIN_API}/schools?${params}`)
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
      <h1 className="hidden text-2xl font-bold text-slate-900 md:block">Schools Monitor</h1>

      {/* Phone: search, status chips, one row per school. Desktop keeps the table below. */}
      <div className="space-y-3 md:hidden">
        <label className="flex h-12 items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search schools"
            aria-label="Search schools"
            className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
        <ChipTabs
          label="Payment status"
          value={filterStatus}
          onChange={setFilterStatus}
          items={[
            { key: "", label: "All" },
            { key: "paid", label: "Paid" },
            { key: "partial", label: "Partial" },
            { key: "overdue", label: "Overdue" },
            { key: "pending", label: "Pending" },
          ]}
        />
        <p className="px-0.5 text-xs font-medium text-muted-foreground">
          {schools.length} school{schools.length === 1 ? "" : "s"}
          {filterStatus ? ` · ${filterStatus}` : ""}
          {search ? ` · matching “${search}”` : ""}
        </p>
        {schools.length === 0 ? (
          <EmptyPanel title="No schools match" hint="Try a different search or status." />
        ) : (
          <CardList>
            {schools.map((s) => (
              <SchoolRow
                key={s.id}
                id={s.id}
                name={s.name}
                city={s.city}
                state={s.state}
                students={s.studentCount}
                revenue={s.expectedRevenue}
                paymentStatus={s.paymentStatus}
                owed={s.amountOwed}
                extraChips={
                  s.hosted === "hosted_dedicated" ? (
                    <Chip tone="primary">Hosted</Chip>
                  ) : s.hosted === "planned" ? (
                    <Chip tone="outline">Planned</Chip>
                  ) : (
                    <Chip>Shared SaaS</Chip>
                  )
                }
              />
            ))}
          </CardList>
        )}
      </div>

      <div className="hidden gap-3 items-center md:flex">
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

      <Card className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="text-left px-4 py-3 font-medium text-slate-600">School</th>
                <th className="hidden text-left px-4 py-3 font-medium text-slate-600 xl:table-cell">Location</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Students</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Revenue</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">Payment</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Owed</th>
                <th className="hidden text-center px-4 py-3 font-medium text-slate-600 xl:table-cell">Hosted</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {schools.map(s => (
                <tr key={s.id} className="border-b hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/schools/${s.id}`} className="font-medium text-blue-600 hover:underline pointer-coarse:inline-flex pointer-coarse:min-h-11 pointer-coarse:items-center">
                      {s.name}
                    </Link>
                    {/* Below xl the location rides under the name so the row keeps its actions on screen. */}
                    <span className="mt-0.5 block text-xs text-slate-500 xl:hidden">{s.city || "—"}{s.state ? `, ${s.state}` : ""}</span>
                  </td>
                  <td className="hidden px-4 py-3 text-slate-600 xl:table-cell">{s.city || "—"}{s.state ? `, ${s.state}` : ""}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{s.studentCount}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">₦{s.expectedRevenue.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge className={badgeColor(s.paymentStatus)}>{s.paymentStatus}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums text-red-600">
                    {s.amountOwed > 0 ? `₦${s.amountOwed.toLocaleString()}` : "—"}
                  </td>
                  <td className="hidden px-4 py-3 text-center xl:table-cell">{hostedBadge(s.hosted)}</td>
                  <td className="px-4 py-3">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/schools/${s.id}`}>View</Link>
                    </Button>
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
