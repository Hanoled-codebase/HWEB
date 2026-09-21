"use client"

import Link from "next/link"
import { ChevronRight, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Phone building blocks for the platform admin (hanoled.com/admin).
 * Lists, not tables: one row per record, whole row is the tap target (>= 64px),
 * money right-aligned in tabular figures. Colour is brand-only: Hanoled Blue for
 * interaction, and Success / Warning / Alert strictly for payment and ticket status.
 */

export const naira = (n: number) => "₦" + Math.round(n).toLocaleString()

const chipBase = "inline-flex h-[26px] shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold whitespace-nowrap"

/** Payment status. Pending and partial are Warning (Growth Gold); paid is Success; overdue is Alert. */
export function PaymentChip({ status }: { status: string }) {
  const [tone, dot] =
    status === "paid"
      ? ["bg-success/10 text-emerald-700", "bg-success"]
      : status === "partial" || status === "pending"
        ? ["bg-warning/15 text-amber-700", "bg-warning"]
        : status === "overdue"
          ? ["bg-destructive/10 text-red-700", "bg-destructive"]
          : ["bg-muted text-muted-foreground", "bg-muted-foreground/60"]
  return (
    <span className={cn(chipBase, "capitalize", tone)}>
      <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", dot)} />
      {status}
    </span>
  )
}

export function Chip({
  tone = "muted",
  className,
  children,
}: {
  tone?: "muted" | "primary" | "gold" | "outline"
  className?: string
  children: React.ReactNode
}) {
  const tones = {
    muted: "bg-muted text-muted-foreground",
    primary: "bg-primary/10 text-primary",
    gold: "bg-[#F5A623]/15 text-[#0B1220]",
    outline: "border border-border text-foreground",
  }
  return <span className={cn(chipBase, tones[tone], className)}>{children}</span>
}

export function MList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card", className)}>
      {children}
    </div>
  )
}

/** Each record is its own card, 12px apart. */
export function CardList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("space-y-3", className)}>{children}</div>
}

export const rowCard = "rounded-[20px] border border-border bg-card shadow-sm"

export function SectionHead({
  title,
  count,
  action,
}: {
  title: string
  count?: number
  action?: React.ReactNode
}) {
  return (
    <div className="mb-3 flex min-h-8 items-center justify-between gap-3 px-0.5">
      <h2 className="flex items-baseline gap-2 text-base font-bold text-foreground">
        {title}
        {count !== undefined && <span className="text-base font-normal tabular-nums text-muted-foreground">{count}</span>}
      </h2>
      {action}
    </div>
  )
}

export function EmptyPanel({ icon: Icon, title, hint }: { icon?: LucideIcon; title: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-9 text-center">
      {Icon && <Icon className="mx-auto mb-2.5 h-7 w-7 text-muted-foreground/60" />}
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

/** Horizontal filter chips. Scrolls sideways without a visible scrollbar; each chip is 44px tall. */
export function ChipTabs<K extends string>({
  items,
  value,
  onChange,
  label,
}: {
  items: { key: K; label: string; count?: number }[]
  value: K
  onChange: (key: K) => void
  label: string
}) {
  return (
    <div role="tablist" aria-label={label} className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5">
      {items.map((item) => {
        const active = item.key === value
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.key)}
            className={cn(
              "flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold transition-colors",
              active ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground active:bg-muted",
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span className={cn("text-xs font-medium tabular-nums", active ? "text-primary-foreground/80" : "text-muted-foreground")}>
                {item.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/** One school as a card: name and headcount, status chips, and term revenue on the right. */
export function SchoolRow({
  id,
  name,
  city,
  state,
  students,
  revenue,
  paymentStatus,
  owed,
  note,
  extraChips,
}: {
  id: string
  name: string
  city?: string | null
  state?: string | null
  students: number
  revenue: number
  paymentStatus: string
  owed?: number
  note?: string
  extraChips?: React.ReactNode
}) {
  const place = [city, state].filter(Boolean).join(", ")
  const awaiting = students === 0 && revenue === 0
  return (
    <Link href={`/admin/schools/${id}`} className={cn(rowCard, "block min-h-[72px] px-4 py-4 active:bg-muted/60")}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[15px] font-bold leading-snug text-foreground">{name}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {place ? `${place} · ` : ""}
            {students.toLocaleString()} students{note ? ` · ${note}` : ""}
          </p>
        </div>
        <div className="shrink-0 pt-0.5 text-right">
          {awaiting ? (
            <p className="text-xs italic text-muted-foreground">Awaiting onboarding</p>
          ) : (
            <>
              <p className="text-[17px] font-bold leading-tight tabular-nums text-foreground">{naira(revenue)}</p>
              {owed && owed > 0 ? (
                <p className="mt-0.5 text-[13px] font-medium tabular-nums text-destructive">Owes {naira(owed)}</p>
              ) : (
                <p className="mt-0.5 text-xs text-muted-foreground">per term</p>
              )}
            </>
          )}
        </div>
        <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground/50" />
      </div>
      {/* Full-width row: chips never get squeezed by the amount column on narrow phones. */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <PaymentChip status={paymentStatus} />
        {extraChips}
      </div>
    </Link>
  )
}
