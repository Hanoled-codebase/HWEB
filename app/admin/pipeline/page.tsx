"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"
const ADMIN_API = `${API_BASE}/admin`

const STAGES = [
  { key: "prospect", label: "Prospect", color: "bg-slate-100 text-slate-700" },
  { key: "contacted", label: "Contacted", color: "bg-blue-100 text-blue-700" },
  { key: "demo_scheduled", label: "Demo Scheduled", color: "bg-indigo-100 text-indigo-700" },
  { key: "proposal_sent", label: "Proposal Sent", color: "bg-purple-100 text-purple-700" },
  { key: "committed", label: "Committed", color: "bg-yellow-100 text-yellow-700" },
  { key: "onboarding", label: "Onboarding", color: "bg-orange-100 text-orange-700" },
  { key: "active", label: "Active", color: "bg-green-100 text-green-700" },
]

interface PipelineItem {
  id: string; name: string; location: string; estimatedStudents: number
  stage: string; nextAction: string; nextActionDate: string
  owner: { id: string; name: string } | null
  notes: string
}

export default function PipelinePage() {
  const [items, setItems] = useState<PipelineItem[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ name: "", location: "", estimatedStudents: "", stage: "prospect", nextAction: "", notes: "" })

  useEffect(() => {
    fetch(`${ADMIN_API}/pipeline`, { credentials: "include" })
      .then(r => r.json())
      .then(data => setItems(data.list))
  }, [])

  const stageItems = (stage: string) => items.filter(i => i.stage === stage)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch(`${ADMIN_API}/pipeline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name: form.name, location: form.location,
        estimatedStudents: parseInt(form.estimatedStudents) || null,
        stage: form.stage, nextAction: form.nextAction, notes: form.notes,
      }),
    })
    if (res.ok) {
      setDialogOpen(false)
      setForm({ name: "", location: "", estimatedStudents: "", stage: "prospect", nextAction: "", notes: "" })
      const data = await fetch(`${ADMIN_API}/pipeline`, { credentials: "include" }).then(r => r.json())
      setItems(data.list)
    }
  }

  async function advanceStage(id: string, currentStage: string) {
    const idx = STAGES.findIndex(s => s.key === currentStage)
    if (idx < STAGES.length - 1) {
      const nextStage = STAGES[idx + 1].key
      await fetch(`${ADMIN_API}/pipeline/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ stage: nextStage }),
      })
      const data = await fetch(`${ADMIN_API}/pipeline`, { credentials: "include" }).then(r => r.json())
      setItems(data.list)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Onboarding Pipeline</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button>Add School</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add to Pipeline</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <Input placeholder="School name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
              <Input placeholder="Location" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} />
              <Input placeholder="Est. students" type="number" value={form.estimatedStudents} onChange={e => setForm(p => ({ ...p, estimatedStudents: e.target.value }))} />
              <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.stage} onChange={e => setForm(p => ({ ...p, stage: e.target.value }))}>
                {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
              <Input placeholder="Next action" value={form.nextAction} onChange={e => setForm(p => ({ ...p, nextAction: e.target.value }))} />
              <Textarea placeholder="Notes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              <Button type="submit" className="w-full">Add</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: "400px" }}>
        {STAGES.map(stage => (
          <div key={stage.key} className="flex-shrink-0 w-64">
            <div className={`rounded-t-lg px-3 py-2 text-sm font-medium ${stage.color}`}>
              {stage.label} <span className="ml-1 opacity-60">({stageItems(stage.key).length})</span>
            </div>
            <div className="bg-slate-50 rounded-b-lg p-2 space-y-2 min-h-[300px] border-x border-b">
              {stageItems(stage.key).map(item => (
                <Card key={item.id} className="p-3 cursor-pointer hover:shadow-md transition-shadow">
                  <p className="font-medium text-sm">{item.name}</p>
                  {item.location && <p className="text-xs text-slate-500">{item.location}</p>}
                  {item.estimatedStudents && (
                    <p className="text-xs text-slate-500 mt-1">~{item.estimatedStudents} students</p>
                  )}
                  {item.nextAction && (
                    <p className="text-xs text-blue-600 mt-1">Next: {item.nextAction}</p>
                  )}
                  {item.owner && <p className="text-xs text-slate-400 mt-1">Owner: {item.owner.name}</p>}
                  {stage.key !== "active" && (
                    <Button variant="outline" size="sm" className="w-full mt-2 text-xs" onClick={() => advanceStage(item.id, item.stage)}>
                      Move to {STAGES[STAGES.findIndex(s => s.key === item.stage) + 1]?.label}
                    </Button>
                  )}
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
