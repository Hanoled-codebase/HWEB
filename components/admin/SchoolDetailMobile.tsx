"use client"

import {
  Calendar,
  Globe,
  GraduationCap,
  Inbox,
  Link2,
  Mail,
  Phone,
  Shapes,
  Tag,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react"
import { CardList, Chip, PaymentChip, SectionHead, naira, rowCard } from "@/components/admin/mobile-kit"
import { useMobilePageTitle } from "@/components/dashboard/mobile/MobileMenuProvider"
import { cn } from "@/lib/utils"

export interface SchoolDetailData {
  id: string
  name: string
  slug: string
  email: string | null
  phone: string | null
  website: string | null
  category: string | null
  schoolType: string | null
  createdAt: string
  studentCount: number
  expectedRevenue: number
  paymentRecords: {
    id: string
    term: string
    amountBilled: string | number
    amountPaid: string | number
    dueDate: string | null
    status: string
  }[]
  members: { id: string; role: string; user: { id: string; name?: string | null; email?: string | null } | null }[]
}

/** ₦90K, ₦1.2M — short enough for a three-across stat card. */
function compactNaira(n: number) {
  if (!n || n <= 0) return "—"
  if (n >= 1_000_000) return `₦${+(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `₦${+(n / 1_000).toFixed(1)}K`
  return naira(n)
}

function initials(name?: string | null) {
  return (
    (name || "?")
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  )
}

/**
 * Phone layout for one school (hanoled.com/admin/schools/[id]). The page owns the fetch and
 * the desktop layout; this renders the same data as stacked cards below md.
 */
export function SchoolDetailMobile({ school }: { school: SchoolDetailData }) {
  useMobilePageTitle(school.name)
  const status = (school.paymentRecords[0]?.status ?? "pending").replace("_", " ")
  // Contacts are the school's staff (owner, admins, teachers); parents are counted in Members only.
  const contacts = school.members.filter((m) => m.user && m.role !== "parent")

  const info: { icon: LucideIcon; label: string; value: string | null; href?: string }[] = [
    { icon: Link2, label: "Slug", value: school.slug },
    { icon: Mail, label: "Email", value: school.email, href: school.email ? `mailto:${school.email}` : undefined },
    { icon: Phone, label: "Phone", value: school.phone, href: school.phone ? `tel:${school.phone}` : undefined },
    {
      icon: Globe,
      label: "Website",
      value: school.website,
      href: school.website ? (/^https?:\/\//.test(school.website) ? school.website : `https://${school.website}`) : undefined,
    },
    { icon: Tag, label: "Category", value: school.category },
    { icon: Shapes, label: "Type", value: school.schoolType },
    { icon: Calendar, label: "Created", value: new Date(school.createdAt).toLocaleDateString() },
  ]

  const stats: { icon: LucideIcon; value: string; label: string }[] = [
    { icon: GraduationCap, value: school.studentCount.toLocaleString(), label: "Students" },
    { icon: TrendingUp, value: compactNaira(school.expectedRevenue), label: "Exp. revenue" },
    { icon: Users, value: school.members.length.toLocaleString(), label: "Members" },
  ]

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="min-w-0 text-lg font-bold leading-tight text-foreground">{school.name}</h2>
        <div className="shrink-0 pt-0.5">
          <PaymentChip status={status} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {stats.map(({ icon: Icon, value, label }) => (
          <div key={label} className={cn(rowCard, "p-3.5")}>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Icon className="h-4 w-4" />
            </span>
            <p className="mt-3 text-[22px] font-bold leading-tight tabular-nums text-foreground">{value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <section className={cn(rowCard, "px-4 pb-1 pt-4")}>
        <h2 className="mb-1 text-base font-bold text-foreground">School Info</h2>
        <dl>
          {info.map(({ icon: Icon, label, value, href }) => (
            <div key={label} className="border-b border-border/60 py-3 last:border-0">
              <dt className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <Icon className="h-4 w-4" /> {label}
              </dt>
              <dd className="mt-1 break-words text-[15px] font-medium text-foreground">
                {value ? (
                  href ? (
                    <a href={href} className="break-all underline-offset-2 hover:underline" target={label === "Website" ? "_blank" : undefined} rel="noreferrer">
                      {value}
                    </a>
                  ) : (
                    <span className={label === "Category" || label === "Type" ? "capitalize" : undefined}>{value}</span>
                  )
                ) : (
                  <span className="text-muted-foreground/60">—</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={cn(rowCard, "p-4")}>
        <h2 className="text-base font-bold text-foreground">Payment History</h2>
        {school.paymentRecords.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Inbox className="h-6 w-6" />
            </span>
            <p className="text-sm text-muted-foreground">No payment records</p>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-border/60">
            {school.paymentRecords.map((r) => {
              const billed = Number(r.amountBilled)
              const paid = Number(r.amountPaid)
              const owed = Math.max(0, billed - paid)
              return (
                <li key={r.id} className="space-y-2.5 py-3.5 first:pt-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[15px] font-semibold text-foreground">{r.term}</p>
                    <PaymentChip status={r.status.replace("_", " ")} />
                  </div>
                  <dl className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col-reverse">
                      <dt className="text-xs text-muted-foreground">Billed</dt>
                      <dd className="text-sm font-semibold tabular-nums text-foreground">{naira(billed)}</dd>
                    </div>
                    <div className="flex flex-col-reverse">
                      <dt className="text-xs text-muted-foreground">Paid</dt>
                      <dd className="text-sm font-semibold tabular-nums text-foreground">{naira(paid)}</dd>
                    </div>
                    <div className="flex flex-col-reverse">
                      <dt className="text-xs text-muted-foreground">Owed</dt>
                      <dd className={cn("text-sm font-semibold tabular-nums", owed > 0 ? "text-destructive" : "text-muted-foreground")}>
                        {owed > 0 ? naira(owed) : "—"}
                      </dd>
                    </div>
                  </dl>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section>
        <SectionHead title="Contacts" count={contacts.length} />
        {contacts.length === 0 ? (
          <div className={cn(rowCard, "px-6 py-8 text-center text-sm text-muted-foreground")}>No staff contacts yet</div>
        ) : (
          <CardList>
            {contacts.map((m) => (
              <div key={m.id} className={cn(rowCard, "flex items-center gap-3 px-4 py-3.5")}>
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-slate-600"
                >
                  {initials(m.user?.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="text-[15px] font-semibold text-foreground">{m.user?.name || "Unnamed"}</p>
                    <Chip className="h-6 px-2.5 text-xs font-medium">{m.role}</Chip>
                  </div>
                  {m.user?.email && <p className="mt-0.5 break-all text-xs text-muted-foreground">{m.user.email}</p>}
                </div>
              </div>
            ))}
          </CardList>
        )}
      </section>
    </div>
  )
}
