"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type SegmentItem<K extends string> = { key: K; label: string; icon: LucideIcon };

/**
 * Bottom tab bar for pages that switch views with local state instead of
 * routes (the CBT console). Same look and touch targets as the route-based
 * MobileTabBar, so phones get one navigation language everywhere.
 */
export function MobileSegmentBar<K extends string>({
  items,
  value,
  onChange,
  className,
}: {
  items: SegmentItem<K>[];
  value: K;
  onChange: (key: K) => void;
  className?: string;
}) {
  return (
    <nav
      aria-label="Sections"
      className={cn(
        "m-glass fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 pb-safe",
        className,
      )}
    >
      <ul className="mx-auto flex max-w-[520px] items-stretch gap-0.5 px-2 pt-1.5 pb-1.5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.key === value;
          return (
            <li key={item.key} className="flex min-w-0 flex-1">
              <button
                type="button"
                onClick={() => onChange(item.key)}
                aria-current={active ? "page" : undefined}
                className="flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 transition-[background-color,opacity] duration-100 active:bg-slate-100 active:opacity-80"
              >
                <span
                  className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                    active ? "bg-blue-50 text-blue-600" : "text-slate-500",
                  )}
                >
                  <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 2} />
                </span>
                <span
                  className={cn(
                    "max-w-full truncate text-xs leading-tight",
                    active ? "font-semibold text-blue-600" : "font-medium text-slate-500",
                  )}
                >
                  {item.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
