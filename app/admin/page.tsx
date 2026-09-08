"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import { HSMS_BASE } from "@/lib/api"

const API_BASE = HSMS_BASE
const ADMIN_API = `${API_BASE}/api/admin`

interface DashboardStats {
  totalActiveSchools: number
  totalStudents: number
  totalExpectedRevenue: number
  totalOutstanding: number
  pipelineCount: number
  recentActivity: { id: string; action: string; entityType: string; metadata: any; createdAt: string; actor: { name: string } }[]
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)

  useEffect(() => {
    fetch(`${ADMIN_API}/dashboard/stats`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(setStats)
  }, [])

  function fmt(n: number) {
    return "₦" + n.toLocaleString()
  }

  if (!stats) return <div className="text-slate-500 text-center py-20">Loading dashboard...</div>

  const kpis = [
    { label: "Active Schools", value: stats.totalActiveSchools, format: "number" },
    { label: "Total Students", value: stats.totalStudents, format: "number" },
    { label: "Expected Revenue", value: stats.totalExpectedRevenue, format: "currency" },
    { label: "Outstanding", value: stats.totalOutstanding, format: "currency" },
    { label: "Pipeline", value: stats.pipelineCount, format: "number" },
  ]

  const statusColor = (action: string) => {
    if (action.includes("payment")) return "bg-green-100 text-green-700"
    if (action.includes("pipeline")) return "bg-blue-100 text-blue-700"
    return "bg-slate-100 text-slate-700"
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <div className="flex gap-2">
          <Link href="/admin/pipeline">
            <Button variant="outline" size="sm">Add to Pipeline</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {kpis.map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">{kpi.label}</p>
              <p className="text-2xl font-bold mt-1">
                {kpi.format === "currency" ? fmt(kpi.value) : kpi.value.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Recent Activity</CardTitle></CardHeader>
        <CardContent>
          {stats.recentActivity.length === 0 ? (
            <p className="text-sm text-slate-400">No activity yet</p>
          ) : (
            <div className="space-y-2">
              {stats.recentActivity.map(a => (
                <div key={a.id} className="flex items-center gap-3 text-sm">
                  <Badge variant="secondary" className={statusColor(a.action)}>
                    {a.action.replace(".", " ")}
                  </Badge>
                  <span className="text-slate-600">by {a.actor.name}</span>
                  <span className="text-slate-400 ml-auto text-xs">
                    {new Date(a.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
