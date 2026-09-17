"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Users,
  School,
  AlertCircle,
  TrendingUp,
  MapPin,
  ArrowUpRight,
  Sparkles,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

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

interface PipelineItem {
  id: string
  name: string
  location: string | null
  estimatedStudents: number | null
  stage: string
  nextAction: string | null
  nextActionDate: string | null
  owner: { id: string; name: string } | null
}

interface SchoolRow {
  id: string
  name: string
  city: string | null
  state: string | null
  studentCount: number
  expectedRevenue: number
  paymentStatus: string
  amountOwed: number
  subscriptionType: string
  subscriptionTier: string
}

const PITCHING_STAGES = [
  { key: "demo_scheduled", label: "Demo Scheduled" },
  { key: "proposal_sent", label: "Proposal Sent" },
  { key: "committed", label: "Committed" },
]

function fmtNaira(n: number) {
  return "₦" + Math.round(n).toLocaleString()
}

function paymentBadgeClass(status: string) {
  switch (status) {
    case "paid":
      return "bg-success/10 text-success"
    case "partial":
      return "bg-warning/15 text-[#0B1220]"
    case "overdue":
      return "bg-destructive/10 text-destructive"
    default:
      return "bg-muted text-muted-foreground"
  }
}

function subscriptionBadgeClass(type: string) {
  return type === "HSMS+HCBT" ? "bg-[#F5A623]/15 text-[#0B1220]" : "bg-primary/10 text-primary"
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [pipeline, setPipeline] = useState<PipelineItem[]>([])
  const [schools, setSchools] = useState<SchoolRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`${ADMIN_API}/dashboard/stats`, { credentials: "include" }).then((r) => (r.ok ? r.json() : null)),
      fetch(`${ADMIN_API}/pipeline`, { credentials: "include" }).then((r) => (r.ok ? r.json() : { list: [] })),
      fetch(`${ADMIN_API}/schools`, { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
    ]).then(([statsData, pipelineData, schoolsData]) => {
      setStats(statsData)
      setPipeline(pipelineData.list || [])
      setSchools(schoolsData || [])
      setLoading(false)
    })
  }, [])

  const prospects = useMemo(
    () => pipeline.filter((p) => p.stage === "prospect" || p.stage === "contacted"),
    [pipeline]
  )
  const pitching = useMemo(
    () => pipeline.filter((p) => PITCHING_STAGES.some((s) => s.key === p.stage)),
    [pipeline]
  )
  const onboardingInProgress = useMemo(() => pipeline.filter((p) => p.stage === "onboarding"), [pipeline])

  if (loading) {
    return <div className="py-24 text-center text-sm text-muted-foreground">Loading team dashboard...</div>
  }

  const kpis = [
    { label: "Active Schools", value: stats?.totalActiveSchools ?? 0, icon: School, format: "number" as const },
    { label: "Total Students", value: stats?.totalStudents ?? 0, icon: Users, format: "number" as const },
    { label: "Expected Revenue", value: stats?.totalExpectedRevenue ?? 0, icon: TrendingUp, format: "currency" as const, accent: true },
    { label: "Outstanding", value: stats?.totalOutstanding ?? 0, icon: AlertCircle, format: "currency" as const },
    { label: "In Pipeline", value: stats?.pipelineCount ?? 0, icon: Sparkles, format: "number" as const },
  ]

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Team Dashboard</h1>
          <p className="text-sm text-muted-foreground">Every school we&apos;re courting, pitching, and running — in one place.</p>
        </div>
        <Link href="/admin/pipeline">
          <Button size="sm">Add to Pipeline</Button>
        </Link>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <Card key={kpi.label} className={kpi.accent ? "border-[#F5A623]/40" : undefined}>
              <CardContent className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
                  <Icon className={`h-4 w-4 ${kpi.accent ? "text-[#F5A623]" : "text-primary"}`} />
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {kpi.format === "currency" ? fmtNaira(kpi.value) : kpi.value.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Section: Prospects */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Prospect Clients</h2>
            <p className="text-sm text-muted-foreground">Not yet contacted or newly reached out to — top of funnel.</p>
          </div>
          <Badge variant="secondary" className="bg-muted text-muted-foreground">
            {prospects.length} school{prospects.length === 1 ? "" : "s"}
          </Badge>
        </div>
        {prospects.length === 0 ? (
          <EmptyRow text="No prospects logged yet." />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {prospects.map((p) => (
              <Card key={p.id}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-foreground">{p.name}</p>
                    <Badge variant="outline" className="shrink-0 text-xs capitalize">
                      {p.stage}
                    </Badge>
                  </div>
                  {p.location && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {p.location}
                    </p>
                  )}
                  {p.estimatedStudents ? (
                    <p className="text-xs text-muted-foreground">~{p.estimatedStudents.toLocaleString()} est. students</p>
                  ) : null}
                  {p.owner && <p className="text-xs text-muted-foreground">Owner: {p.owner.name}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Section: Pitching Stage */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Pitching Stage</h2>
            <p className="text-sm text-muted-foreground">Demoed, proposed, or committed — actively being closed.</p>
          </div>
          <Badge variant="secondary" className="bg-muted text-muted-foreground">
            {pitching.length} school{pitching.length === 1 ? "" : "s"}
          </Badge>
        </div>
        {pitching.length === 0 ? (
          <EmptyRow text="Nothing in active pitch right now." />
        ) : (
          <Card>
            <div className="divide-y divide-border">
              {pitching.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{p.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.location || "—"}
                      {p.estimatedStudents ? ` · ~${p.estimatedStudents.toLocaleString()} students` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {p.nextAction && (
                      <span className="hidden text-xs text-primary sm:inline">Next: {p.nextAction}</span>
                    )}
                    <Badge className="bg-primary/10 text-primary">
                      {PITCHING_STAGES.find((s) => s.key === p.stage)?.label ?? p.stage}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </section>

      {/* Section: Onboarded Clients */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Onboarded Clients</h2>
            <p className="text-sm text-muted-foreground">Live schools — students, revenue, and subscription per school.</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-muted text-muted-foreground">
              {schools.length} school{schools.length === 1 ? "" : "s"}
            </Badge>
            <Link href="/admin/schools" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {onboardingInProgress.length > 0 && (
          <Card className="border-warning/40 bg-warning/5">
            <CardContent className="space-y-2 p-4">
              <p className="text-xs font-medium text-[#0B1220]">Currently onboarding ({onboardingInProgress.length})</p>
              <div className="flex flex-wrap gap-2">
                {onboardingInProgress.map((p) => (
                  <Badge key={p.id} variant="outline" className="border-warning/40">
                    {p.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">School</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Students</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Subscription</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Revenue / term</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Payment</th>
                </tr>
              </thead>
              <tbody>
                {schools.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No onboarded schools yet.
                    </td>
                  </tr>
                ) : (
                  schools.map((s) => (
                    <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <Link href={`/admin/schools/${s.id}`} className="font-medium text-primary hover:underline">
                          {s.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {s.city || "—"}
                          {s.state ? `, ${s.state}` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right text-foreground">{s.studentCount.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge className={subscriptionBadgeClass(s.subscriptionType)}>{s.subscriptionType}</Badge>
                          {s.subscriptionTier === "Premium" && (
                            <Badge variant="outline" className="border-[#F5A623]/40 text-[#0B1220]">
                              Premium
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-foreground">{fmtNaira(s.expectedRevenue)}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={paymentBadgeClass(s.paymentStatus)}>{s.paymentStatus}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {schools.length > 0 && (
                <tfoot>
                  <tr className="bg-muted/40">
                    <td className="px-4 py-3 text-xs font-medium text-muted-foreground">Total</td>
                    <td className="px-4 py-3 text-right text-xs font-medium text-foreground">
                      {schools.reduce((sum, s) => sum + s.studentCount, 0).toLocaleString()}
                    </td>
                    <td />
                    <td className="px-4 py-3 text-right text-xs font-medium text-foreground">
                      {fmtNaira(schools.reduce((sum, s) => sum + s.expectedRevenue, 0))}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>
      </section>

      {stats && stats.recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.recentActivity.map((a) => (
              <div key={a.id} className="flex items-center gap-3 text-sm">
                <Badge variant="secondary" className="bg-muted text-muted-foreground">
                  {a.action.replace(".", " ")}
                </Badge>
                <span className="text-muted-foreground">by {a.actor.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date(a.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function EmptyRow({ text }: { text: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-8 text-center text-sm text-muted-foreground">{text}</CardContent>
    </Card>
  )
}
