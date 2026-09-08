"use client"

import { useEffect, useState, createContext, useContext, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Avatar } from "@/components/ui/avatar"

import { HSMS_BASE } from "@/lib/api"

const API_BASE = HSMS_BASE
const ADMIN_API = `${API_BASE}/api/admin`

interface AdminUser {
  id: string; email: string; name: string; role: string
}

interface AdminCtx {
  admin: AdminUser | null; loading: boolean; logout: () => Promise<void>
}

const AdminContext = createContext<AdminCtx>({ admin: null, loading: true, logout: async () => {} })

export const useAdmin = () => useContext(AdminContext)

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    fetch(`${ADMIN_API}/auth/me`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.admin) setAdmin(data.admin)
        else if (!pathname.includes("/login")) router.push("/admin/login")
      })
      .catch(() => { if (!pathname.includes("/login")) router.push("/admin/login") })
      .finally(() => setLoading(false))
  }, [pathname, router])

  const logout = useCallback(async () => {
    await fetch(`${ADMIN_API}/auth/logout`, { method: "POST", credentials: "include" })
    setAdmin(null)
    router.push("/admin/login")
  }, [router])

  if (pathname.includes("/login")) return <>{children}</>

  if (loading) return <div className="flex h-screen items-center justify-center text-slate-500">Loading...</div>
  if (!admin) return null

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: "◇" },
    { href: "/admin/schools", label: "Schools", icon: "◇" },
    { href: "/admin/payments", label: "Payments", icon: "◇" },
    { href: "/admin/pipeline", label: "Pipeline", icon: "◇" },
    { href: "/admin/hosted", label: "Hosted", icon: "◇" },
    { href: "/admin/support", label: "Support", icon: "◇" },
  ]

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-56 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <h1 className="font-bold text-lg text-slate-900">Hanoled Admin</h1>
          <p className="text-xs text-slate-500">admin.hanoled.com</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>{item.icon}</span> {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
              {admin.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-slate-900">{admin.name}</p>
              <p className="text-xs text-slate-500 truncate">{admin.role}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full text-xs" onClick={logout}>Logout</Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  )
}
