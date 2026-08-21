"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"
const ADMIN_API = `${API_BASE}/admin`

interface SchoolDetail {
  id: string; name: string; slug: string; city: string; state: string
  email: string; phone: string; website: string; address: string
  category: string; schoolType: string
  paymentStatus: string; counts: any
  hostedConfig: any; members: any[]
  studentCount: number; expectedRevenue: number
  paymentRecords: any[]
  createdAt: string; updatedAt: string
}

export default function SchoolDetail() {
  const { id } = useParams<{ id: string }>()
  const [school, setSchool] = useState<SchoolDetail | null>(null)

  useEffect(() => {
    fetch(`${ADMIN_API}/schools/${id}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(setSchool)
  }, [id])

  if (!school) return <div className="text-slate-500 py-20 text-center">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{school.name}</h1>
          <p className="text-slate-500">{school.city}{school.state ? `, ${school.state}` : ""}</p>
        </div>
        <Badge className="text-base px-4 py-1">{school.paymentStatus}</Badge>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm text-slate-500">Students</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{school.studentCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-slate-500">Expected Revenue</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">₦{school.expectedRevenue.toLocaleString()}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-slate-500">Members</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{school.members.length}</p></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">School Info</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Slug</span><span>{school.slug}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Email</span><span>{school.email || "—"}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Phone</span><span>{school.phone || "—"}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Website</span><span>{school.website || "—"}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Category</span><span>{school.category || "—"}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Type</span><span>{school.schoolType || "—"}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Created</span><span>{new Date(school.createdAt).toLocaleDateString()}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Payment History</CardTitle></CardHeader>
          <CardContent>
            {school.paymentRecords.length === 0 ? (
              <p className="text-sm text-slate-400">No payment records</p>
            ) : (
              <div className="space-y-2">
                {school.paymentRecords.map((r: any) => (
                  <div key={r.id} className="flex justify-between items-center text-sm border-b pb-2">
                    <div>
                      <p className="font-medium">{r.term}</p>
                      <p className="text-slate-500 text-xs">{new Date(r.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p>₦{Number(r.amountPaid).toLocaleString()} / ₦{Number(r.amountBilled).toLocaleString()}</p>
                      <Badge className="text-xs">{r.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Contacts</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 font-medium text-slate-600">Name</th>
                <th className="py-2 font-medium text-slate-600">Role</th>
                <th className="py-2 font-medium text-slate-600">Email</th>
              </tr>
            </thead>
            <tbody>
              {school.members.map((m: any) => (
                <tr key={m.id} className="border-b">
                  <td className="py-2">{m.user.name}</td>
                  <td className="py-2"><Badge variant="secondary">{m.role}</Badge></td>
                  <td className="py-2 text-slate-600">{m.user.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
