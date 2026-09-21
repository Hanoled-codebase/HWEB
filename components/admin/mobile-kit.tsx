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

const chipBase = "inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-[11px] font-semibold whitespace-nowrap"

export function PaymentChip({ status }: { status: string }) {
  const tone =
    status === "paid"
      ? "bg-success/10 text-success"
      : status === "partial"
        ? "bg-warning/15 text-[#0B1220]"
        : status === "overdue"
          ? "bg-destructive/10 text-destructive"
          : "bg-muted text-muted-foreground"
  return <span className={cn(chipBase, "capitalize", tone)}>{status}</span>
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
    <div className="mb-2.5 flex min-h-8 items-center justify-between gap-3 px-0.5">
      <h2 className="flex items-baseline gap-2 text-[15px] font-bold text-foreground">
        {title}
        {count !== undefined && <span className="text-xs font-medium tabular-nums text-muted-foreground">{count}</span>}
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

/** One school: name and place on the left, term revenue on the right, payment status underneath. */
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
  return (
    <Link href={`/admin/schools/${id}`} className="flex min-h-[72px] items-center gap-3 px-4 py-3 active:bg-muted/60">
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[15px] font-semibold leading-snug text-foreground">{name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {place || "—"} · {students.toLocaleString()} students{note ? ` · ${note}` : ""}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <PaymentChip status={paymentStatus} />
          {extraChips}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold tabular-nums text-foreground">{naira(revenue)}</p>
        {owed && owed > 0 ? (
          <p className="text-[11px] font-medium tabular-nums text-destructive">Owes {naira(owed)}</p>
        ) : (
          <p className="text-[11px] text-muted-foreground">per term</p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
    </Link>
  )
}
