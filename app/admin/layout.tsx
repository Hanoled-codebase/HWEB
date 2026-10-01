"use client"

import { useEffect, useState, createContext, useContext, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { LayoutGrid, School, Building2, CreditCard, GitBranch, Server, LifeBuoy, LogOut } from "lucide-react"
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
  const [openTickets, setOpenTickets] = useState(0)
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

  // The phone bell links to Support and shows a dot only while tickets are open.
  // Background fetch, once per signed-in admin; a failure just leaves the dot off.
  const adminId = admin?.id
  useEffect(() => {
    if (!adminId) return
    fetch(`${ADMIN_API}/support-tickets`, { credentials: "include" })
      .then(r => (r.ok ? r.json() : []))
      .then((tickets: { status?: string }[]) =>
        setOpenTickets(Array.isArray(tickets) ? tickets.filter(t => t.status === "open").length : 0),
      )
      .catch(() => {})
  }, [adminId])

  // The platform admin session lives in HSMS alone (no HCORE/HCBT sessions are
  // opened by /admin/login). An unreachable HSMS must not strand the admin here.
  const logout = useCallback(async () => {
    try {
      await fetch(`${ADMIN_API}/auth/logout`, { method: "POST", credentials: "include" })
    } catch (e) {
      console.error("Admin logout failed", e)
    }
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
      { key: "schools", label: "Schools", href: "/admin/schools", icon: Building2, exact: false },
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
      initials: admin.name.split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "A",
      subline: "admin.hanoled.com",
    },
    showCbtConsole: false,
    showNotifications: false,
    hideBack: true,
    homeBar: "account",
    tabStyle: "pill",
    bell: { href: "/admin/support", label: "Support tickets", dot: openTickets > 0 },
    logout,
  }
  const currentTitle =
    navItems.find((item) => item.href === pathname || (item.href !== "/admin" && pathname.startsWith(item.href)))?.label ?? "Admin"

  return (
    <MobileMenuProvider config={mobileConfig}>
    <div className="flex h-screen flex-col bg-muted/30 md:flex-row">
      <MobileTopBar title={currentTitle} isHome={pathname === "/admin"} />
      {/* md to lg: a labelled icon rail (six destinations fit a tablet held upright); lg and up: the full sidebar. */}
      <aside className="hidden w-20 shrink-0 flex-col border-r border-border bg-white md:flex lg:w-60">
        <div className="flex justify-center border-b border-border px-2 py-4 lg:block lg:px-4">
          <div className="lg:hidden"><HanoledLogo size="sm" href="/admin" iconOnly /></div>
          <div className="hidden lg:block">
            <HanoledLogo size="sm" href="/admin" />
            <p className="mt-1 text-xs text-muted-foreground">admin.hanoled.com</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-2 lg:p-3" aria-label="Platform">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-[11px] font-medium transition-colors lg:flex-row lg:gap-2.5 lg:rounded-md lg:px-3 lg:py-2 lg:text-sm lg:font-normal pointer-coarse:min-h-11 ${
                  active
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5 lg:h-4 lg:w-4" strokeWidth={2} />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="border-t border-border p-2 lg:p-4">
          <div className="mb-3 hidden items-center gap-2.5 lg:flex">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
              {admin.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{admin.name}</p>
              <p className="truncate text-xs text-muted-foreground">{admin.role.replace("_", " ")}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full gap-1.5 px-0 text-xs lg:px-4" onClick={logout} aria-label="Log out">
            <LogOut className="h-3.5 w-3.5" /> <span className="hidden lg:inline">Logout</span>
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto px-4 pt-4 pb-safe-nav md:p-6"><div key={pathname} className="m-page">{children}</div></main>
      <MobileTabBar />
    </div>
    </MobileMenuProvider>
  )
}
