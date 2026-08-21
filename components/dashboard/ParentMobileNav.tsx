"use client";

import Link from "next/link";
import { Home, GraduationCap, BarChart3, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";

type ParentMobileNavProps = {
  slug: string;
  active: "overview" | "children" | "results" | "more";
};

const items = [
  {
    key: "overview",
    label: "Overview",
    icon: Home,
    href: (slug: string) => `/dashboard/school/${slug}`,
  },
  {
    key: "children",
    label: "Children",
    icon: GraduationCap,
    href: (slug: string) => `/dashboard/school/${slug}/students`,
  },
  {
    key: "results",
    label: "Results",
    icon: BarChart3,
    href: (slug: string) => `/dashboard/school/${slug}/results`,
  },
  {
    key: "more",
    label: "More",
    icon: MoreHorizontal,
    href: () => "#",
  },
] as const;

export function ParentMobileNav({ slug, active }: ParentMobileNavProps) {
  const { setOpenMobile } = useSidebar();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-slate-100 bg-white/95 backdrop-blur-md px-4 py-2 md:hidden">
      {items.map((item) => {
        const isActive = item.key === active;
        const Icon = item.icon;

        if (item.key === "more") {
          return (
            <button
              key={item.key}
              onClick={() => setOpenMobile(true)}
              className="flex flex-col items-center justify-center gap-1 rounded-2xl px-3 py-1 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <Icon className="h-5 w-5" />
              <span className="text-[11px] font-medium leading-none">
                {item.label}
              </span>
            </button>
          );
        }

        return (
          <Link
            key={item.key}
            href={item.href(slug)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 rounded-2xl px-3.5 py-1.5 text-slate-400 transition-all",
              isActive && "bg-[#EEF0FF] text-[#1447E6] font-bold px-4 py-1.5",
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[11px] leading-none">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
