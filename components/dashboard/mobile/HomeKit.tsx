"use client";

import Link from "next/link";
import { ChevronRight, LayoutGrid, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMobileMenu } from "./MobileMenuProvider";

/**
 * Building blocks for every phone home screen. One greeting, one obvious next
 * step, then the tools that role actually has. All touch targets are >= 44px.
 */

function timeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function HomeGreeting({ name, roleLabel, detail }: { name: string; roleLabel: string; detail?: string }) {
  const today = new Date().toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long" });
  return (
    <section className="rounded-3xl bg-blue-600 px-5 pb-5 pt-4 text-white">
      <p className="text-xs font-medium text-white/75">{today}</p>
      <h2 className="mt-1 text-2xl font-bold leading-tight tracking-tight">
        {timeOfDay()}, <span className="capitalize">{name}</span>
      </h2>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">{roleLabel}</span>
        {detail && <span className="text-xs text-white/75">{detail}</span>}
      </div>
    </section>
  );
}

export function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between px-0.5">
      <h3 className="text-[15px] font-bold text-slate-900">{children}</h3>
      {aside && <span className="text-xs font-medium text-slate-500">{aside}</span>}
    </div>
  );
}

export function PrimaryAction({
  href,
  icon: Icon,
  label,
  hint,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  hint?: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-[68px] items-center gap-3.5 rounded-2xl border border-blue-200 bg-white p-3 pr-4 shadow-sm active:bg-blue-50"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold text-slate-900">{label}</span>
        {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-blue-600" />
    </Link>
  );
}

export type HomeTool = { key: string; label: string; href: string; icon: LucideIcon; hint?: string };

export function ToolGrid({ tools, showAll = true }: { tools: HomeTool[]; showAll?: boolean }) {
  const { setMenuOpen } = useMobileMenu();
  const cell =
    "flex min-h-[64px] items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 text-left shadow-sm transition-colors active:bg-slate-50";
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {tools.map((tool) => {
        const Icon = tool.icon;
        return (
          <Link key={tool.key} href={tool.href} className={cell}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 block text-[13px] font-semibold leading-tight text-slate-900">{tool.label}</span>
              {tool.hint && <span className="block truncate text-[11px] text-slate-500">{tool.hint}</span>}
            </span>
          </Link>
        );
      })}
      {showAll && (
        <button type="button" onClick={() => setMenuOpen(true)} className={cn(cell, "border-dashed")}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <LayoutGrid className="h-5 w-5" />
          </span>
          <span className="text-[13px] font-semibold text-slate-700">All tools</span>
        </button>
      )}
    </div>
  );
}

export type HomeStat = { key: string; label: string; value: string | number; href?: string };

export function StatStrip({ stats }: { stats: HomeStat[] }) {
  if (stats.length === 0) return null;
  const cols = stats.length >= 3 ? "grid-cols-3" : stats.length === 2 ? "grid-cols-2" : "grid-cols-1";
  return (
    <div className={cn("grid gap-2.5", cols)}>
      {stats.map((stat) => {
        const body = (
          <>
            <p className="text-2xl font-bold leading-none tabular-nums text-slate-900">{stat.value}</p>
            <p className="mt-1.5 text-[11px] font-medium text-slate-500">{stat.label}</p>
          </>
        );
        const box = "rounded-2xl border border-slate-100 bg-white px-3 py-3.5 shadow-sm";
        return stat.href ? (
          <Link key={stat.key} href={stat.href} className={cn(box, "active:bg-slate-50")}>
            {body}
          </Link>
        ) : (
          <div key={stat.key} className={box}>
            {body}
          </div>
        );
      })}
    </div>
  );
}

export function EmptyNote({ icon: Icon, title, hint }: { icon: LucideIcon; title: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center">
      <Icon className="mx-auto mb-2.5 h-8 w-8 text-slate-300" />
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
