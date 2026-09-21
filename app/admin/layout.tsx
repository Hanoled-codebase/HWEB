"use client"

import { useEffect, useState, createContext, useContext, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { LayoutGrid, School, CreditCard, GitBranch, Server, LifeBuoy, LogOut } from "lucide-react"
import { MobileMenuProvider } from "@/components/dashboard/mobile/MobileMenuProvider"
import { MobileTopBar } from "@/components/dashboard/mobile/MobileTopBar"
import { MobileTabBar } from "@/components/dashboard/mobile/MobileTabBar"
import type { MobileShellConfig } from "@/components/dashboard/mobile/mobile-config"
import { Button } from "@/components/ui/button"
import { HanoledLogo } from "@/components/ui/HanoledLogo"

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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-muted/30 text-sm text-muted-foreground">
        Loading...
      </div>
    )
  }
  if (!admin) return null

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutGrid },
    { href: "/admin/schools", label: "Schools", icon: School },
    { href: "/admin/payments", label: "Payments", icon: CreditCard },
    { href: "/admin/pipeline", label: "Pipeline", icon: GitBranch },
    { href: "/admin/hosted", label: "Hosted", icon: Server },
    { href: "/admin/support", label: "Support", icon: LifeBuoy },
  ]

  // Phone chrome: same top bar / tab bar / menu sheet as the school app, with
  // the platform destinations. The 240px sidebar below is md and up only.
  const mobileConfig: MobileShellConfig = {
    profile: "admin",
    roleLabel: admin.role.replace("_", " "),
    basePath: "/admin",
    tabs: [
      { key: "dashboard", label: "Home", href: "/admin", icon: LayoutGrid, exact: true },
      { key: "schools", label: "Schools", href: "/admin/schools", icon: School, exact: false },
      { key: "payments", label: "Payments", href: "/admin/payments", icon: CreditCard, exact: false },
      { key: "pipeline", label: "Pipeline", href: "/admin/pipeline", icon: GitBranch, exact: false },
    ],
    sections: [
      {
        title: "Platform",
        items: navItems.map((item) => ({ key: item.href, label: item.label, href: item.href, icon: item.icon })),
      },
    ],
    identity: {
      orgName: "Hanoled Admin",
      userName: admin.name,
      userEmail: admin.email,
      initials: admin.name.charAt(0).toUpperCase(),
      subline: "admin.hanoled.com",
    },
    showCbtConsole: false,
    showNotifications: false,
    logout,
  }
  const currentTitle =
    navItems.find((item) => item.href === pathname || (item.href !== "/admin" && pathname.startsWith(item.href)))?.label ?? "Admin"

  return (
    <MobileMenuProvider config={mobileConfig}>
    <div className="flex h-screen flex-col bg-muted/30 md:flex-row">
      <MobileTopBar title={currentTitle} isHome={pathname === "/admin"} />
      <aside className="hidden w-60 flex-col border-r border-border bg-white md:flex">
        <div className="border-b border-border px-4 py-4">
          <HanoledLogo size="sm" href="/admin" />
          <p className="mt-1 text-xs text-muted-foreground">admin.hanoled.com</p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="border-t border-border p-4">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
              {admin.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{admin.name}</p>
              <p className="truncate text-xs text-muted-foreground">{admin.role.replace("_", " ")}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs" onClick={logout}>
            <LogOut className="h-3.5 w-3.5" /> Logout
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto px-4 pt-4 pb-safe-nav md:p-6">{children}</main>
      <MobileTabBar />
    </div>
    </MobileMenuProvider>
  )
}
