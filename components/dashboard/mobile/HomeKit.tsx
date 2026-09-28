"use client";

import Link from "next/link";
import { ChevronRight, LayoutGrid, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMobileMenu } from "./MobileMenuProvider";

/**
 * Building blocks for every phone home screen. Reading order is fixed:
 * greeting (quiet text) -> the one job this role opens the app for (the only
 * solid-blue element on the screen) -> a glance at real counts -> the rest of
 * the tools. All touch targets are >= 44px.
 */

function timeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** "secondary" -> "Secondary": categories arrive lower-case from the API. */
export function sentenceCase(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

/**
 * Plain text on the page ground, not a filled slab: the school and role are
 * already in the top bar, so repeating them in a hero would only push the
 * real work down the screen.
 */
// Shared/role accounts ("School Admin", "Bursar Office") aren't a person to greet by name.
const NOT_A_FIRST_NAME = new Set(["school", "admin", "administrator", "owner", "bursar", "office", "staff", "user", "there", "principal"]);

export function HomeGreeting({ name, detail }: { name: string; detail?: string }) {
  const today = new Date().toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long" });
  const greetName = name && !NOT_A_FIRST_NAME.has(name.trim().toLowerCase()) ? name : null;
  return (
    <section className="px-0.5 pt-1">
      <p className="text-xs font-medium text-slate-500">{today}</p>
      <h2 className="mt-1 text-balance text-[26px] font-bold leading-[1.15] tracking-tight text-slate-900">
        {timeOfDay()}
        {greetName && (
          <>
            , <span className="capitalize">{greetName}</span>
          </>
        )}
      </h2>
      {detail && <p className="mt-1 text-sm text-slate-500">{detail}</p>}
    </section>
  );
}

export function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3 px-0.5">
      <h3 className="text-base font-bold text-slate-900">{children}</h3>
      {aside && <span className="truncate text-xs font-medium text-slate-500">{aside}</span>}
    </div>
  );
}

/** The lead element of a home screen: the single solid-blue block. */
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
      className="flex min-h-[72px] items-center gap-3.5 rounded-2xl bg-blue-600 p-3.5 pr-4 text-white shadow-[0_10px_24px_-12px_rgba(20,71,230,0.6)] transition-[background-color,scale] duration-100 active:scale-[0.98] active:bg-blue-700"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-bold leading-tight">{label}</span>
        {hint && <span className="mt-0.5 block text-[13px] leading-snug text-white/80">{hint}</span>}
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-white/80" />
    </Link>
  );
}

export type HomeTool = { key: string; label: string; href: string; icon: LucideIcon; hint?: string };

export function ToolGrid({ tools, showAll = true }: { tools: HomeTool[]; showAll?: boolean }) {
  const { setMenuOpen } = useMobileMenu();
  // Flat cells: the tools are a lookup, so they sit quieter than the lead
  // action. No shadow, one hairline.
  const cell =
    "flex min-h-[60px] items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 text-left transition-[background-color,scale] duration-100 active:scale-[0.97] active:bg-slate-50";
  // With an even number of tools the "All tools" cell would sit alone on the
  // last row, so it takes the full width instead.
  const allSpansRow = tools.length % 2 === 0;
  return (
    <div className="m-stagger grid grid-cols-2 gap-2.5">
      {tools.map((tool) => {
        const Icon = tool.icon;
        return (
          <Link key={tool.key} href={tool.href} className={cell}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Icon className="h-[18px] w-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 block text-sm font-semibold leading-tight text-slate-900">{tool.label}</span>
              {tool.hint && <span className="block truncate text-xs text-slate-500">{tool.hint}</span>}
            </span>
          </Link>
        );
      })}
      {showAll && (
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className={cn(cell, "border-dashed border-slate-200 bg-transparent", allSpansRow && "col-span-2")}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <LayoutGrid className="h-[18px] w-[18px]" />
          </span>
          <span className="text-sm font-semibold text-slate-700">All tools</span>
        </button>
      )}
    </div>
  );
}

export type HomeStat = { key: string; label: string; value: string | number; href?: string };

/**
 * Real counts, grouped in one container with hairline dividers instead of one
 * box per number: three boxes would out-shout the tools below them.
 */
export function StatStrip({ stats }: { stats: HomeStat[] }) {
  if (stats.length === 0) return null;
  const cols = stats.length >= 3 ? "grid-cols-3" : stats.length === 2 ? "grid-cols-2" : "grid-cols-1";
  const cellClass = "block min-h-[60px] px-3.5 py-2.5";
  return (
    <div className={cn("grid divide-x divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white", cols)}>
      {stats.map((stat) => {
        const body = (
          <>
            <p className="text-xl font-bold leading-none tabular-nums text-slate-900">{stat.value}</p>
            <p className="mt-1.5 truncate text-xs font-medium text-slate-500">{stat.label}</p>
          </>
        );
        return stat.href ? (
          <Link key={stat.key} href={stat.href} className={cn(cellClass, "transition-colors active:bg-slate-50")}>
            {body}
          </Link>
        ) : (
          <div key={stat.key} className={cellClass}>
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
