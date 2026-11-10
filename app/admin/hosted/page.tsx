"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Chip, EmptyPanel, MList, naira } from "@/components/admin/mobile-kit"

import { ADMIN_API, adminFetch } from "@/lib/admin-api"

interface HostedConfig {
  id: string; organizationId: string; subdomain: string | null
  hostingTier: string; dbInstance: string | null
  infraCostMonthly: number | null; movedAt: string | null
  notes: string | null
  organization: { id: string; name: string; slug: string }
}

export default function HostedPage() {
  // Backend restricts POST /admin/hosted to SUPER_ADMIN — hide the create
  // action for OPS_ADMIN instead of letting them fill the form and hit a 403.
  // Fetched directly (not via the layout's AdminContext) because this page's
  // Turbopack chunk gets its own copy of that context module, so useAdmin()
  // here reads a default { admin: null } instead of the layout's real state.
  const [canManageHosted, setCanManageHosted] = useState(false)
  const [configs, setConfigs] = useState<HostedConfig[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ organizationId: "", subdomain: "", hostingTier: "planned", dbInstance: "", infraCostMonthly: "", notes: "" })

  useEffect(() => {
    adminFetch(`${ADMIN_API}/hosted`).then(r => r.json()).then(setConfigs)
    adminFetch(`${ADMIN_API}/auth/me`)
      .then(r => r.ok ? r.json() : null)
      .then(data => setCanManageHosted(data?.admin?.role === "SUPER_ADMIN"))
      .catch(() => setCanManageHosted(false))
  }, [])

  const tierBadge = (tier: string) => {
    switch (tier) {
      case "hosted_dedicated": return <Badge className="bg-purple-100 text-purple-700">Hosted (Dedicated)</Badge>
      case "planned": return <Badge className="bg-blue-100 text-blue-700">Planned</Badge>
      default: return <Badge variant="secondary">Shared SaaS</Badge>
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const res = await adminFetch(`${ADMIN_API}/hosted`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: form.organizationId,
        subdomain: form.subdomain || null,
        hostingTier: form.hostingTier,
        dbInstance: form.dbInstance || null,
        infraCostMonthly: form.infraCostMonthly ? parseFloat(form.infraCostMonthly) : null,
        notes: form.notes || null,
      }),
    })
    if (res.ok) {
      setDialogOpen(false)
      setForm({ organizationId: "", subdomain: "", hostingTier: "planned", dbInstance: "", infraCostMonthly: "", notes: "" })
      const data = await adminFetch(`${ADMIN_API}/hosted`).then(r => r.json())
      setConfigs(data)
    }
  }

  return (
    <div className="space-y-4">
      <div className={`flex items-center justify-end md:justify-between ${canManageHosted ? "" : "max-md:hidden"}`}>
        <h1 className="hidden text-2xl font-bold text-slate-900 md:block">Hosted Schools Manager</h1>
        {canManageHosted && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button className="max-md:w-full">Add Hosted School</Button></DialogTrigger>
          <DialogContent className="max-md:bottom-0 max-md:left-0 max-md:top-auto max-md:w-full max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-b-none max-md:rounded-t-3xl max-md:pb-[max(1rem,env(safe-area-inset-bottom))] max-md:max-h-[92dvh]">
            <DialogHeader><DialogTitle>Add Hosted Configuration</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <Input placeholder="Organization ID" value={form.organizationId} onChange={e => setForm(p => ({ ...p, organizationId: e.target.value }))} required />
              <Input placeholder="Subdomain (e.g. school.hanoled.com)" value={form.subdomain} onChange={e => setForm(p => ({ ...p, subdomain: e.target.value }))} />
              <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.hostingTier} onChange={e => setForm(p => ({ ...p, hostingTier: e.target.value }))}>
                <option value="shared_saas">Shared SaaS</option>
                <option value="hosted_dedicated">Hosted (Dedicated)</option>
                <option value="planned">Planned</option>
              </select>
              <Input placeholder="DB Instance (shared/dedicated)" value={form.dbInstance} onChange={e => setForm(p => ({ ...p, dbInstance: e.target.value }))} />
              <Input placeholder="Monthly infra cost (₦)" type="number" value={form.infraCostMonthly} onChange={e => setForm(p => ({ ...p, infraCostMonthly: e.target.value }))} />
              <Input placeholder="Notes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              <Button type="submit" className="w-full">Save</Button>
            </form>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {/* Phone: one card-row per hosted school. */}
      <div className="md:hidden">
        {configs.length === 0 ? (
          <EmptyPanel title="No hosted configurations yet" hint="Dedicated and planned deployments are listed here." />
        ) : (
          <MList>
            {configs.map((c) => (
              <article key={c.id} className="space-y-2.5 px-4 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 text-[15px] font-semibold text-foreground">{c.organization.name}</p>
                  {c.hostingTier === "hosted_dedicated" ? (
                    <Chip tone="primary">Hosted (Dedicated)</Chip>
                  ) : c.hostingTier === "planned" ? (
                    <Chip tone="outline">Planned</Chip>
                  ) : (
                    <Chip>Shared SaaS</Chip>
                  )}
                </div>
                <p className="break-all text-xs text-muted-foreground">{c.subdomain || "No subdomain yet"}</p>
                <dl className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col-reverse">
                    <dt className="text-[11px] text-muted-foreground">Database</dt>
                    <dd className="break-words text-sm font-medium text-foreground">{c.dbInstance || "—"}</dd>
                  </div>
                  <div className="flex flex-col-reverse">
                    <dt className="text-[11px] text-muted-foreground">Monthly cost</dt>
                    <dd className="text-sm font-semibold tabular-nums text-foreground">
                      {c.infraCostMonthly ? naira(Number(c.infraCostMonthly)) : "—"}
                    </dd>
                  </div>
                  <div className="flex flex-col-reverse">
                    <dt className="text-[11px] text-muted-foreground">Moved</dt>
                    <dd className="text-sm font-medium tabular-nums text-foreground">
                      {c.movedAt ? new Date(c.movedAt).toLocaleDateString() : "—"}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </MList>
        )}
      </div>

      <Card className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="text-left px-4 py-3 font-medium text-slate-600">School</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Subdomain</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">Tier</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">DB</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Monthly Cost</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Moved At</th>
              </tr>
            </thead>
            <tbody>
              {configs.map(c => (
                <tr key={c.id} className="border-b hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{c.organization.name}</td>
                  <td className="px-4 py-3 text-slate-600">{c.subdomain || "—"}</td>
                  <td className="px-4 py-3 text-center">{tierBadge(c.hostingTier)}</td>
                  <td className="px-4 py-3 text-slate-600">{c.dbInstance || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {c.infraCostMonthly ? `₦${Number(c.infraCostMonthly).toLocaleString()}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {c.movedAt ? new Date(c.movedAt).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
              {configs.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No hosted configurations yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
