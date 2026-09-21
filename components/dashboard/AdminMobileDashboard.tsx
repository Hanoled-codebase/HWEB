"use client";

import { RoleHome } from "@/components/dashboard/mobile/RoleHome";
import type { HomeStat } from "@/components/dashboard/mobile/HomeKit";

type StatItem = {
  label: string;
  value: string | number;
  icon?: React.ElementType;
  dark?: boolean;
  href?: string;
};

/**
 * Owner / admin (and fallback staff) phone home. The shell is shared with every
 * other role; `stats` arrives already permission-filtered from the page, and
 * only real counts are shown (the desktop-only "Manage" tile is dropped —
 * Classes is reachable from the tools grid).
 */
export function AdminMobileDashboard({
  slug,
  stats,
}: {
  slug: string;
  stats: StatItem[];
  org?: { name: string; category?: string; type?: string; subscription?: { status?: string; plan?: string } };
}) {
  const base = `/dashboard/school/${slug}`;
  const counts: HomeStat[] = stats
    .filter((stat) => typeof stat.value === "number")
    .map((stat) => ({
      key: stat.label,
      label: stat.label,
      value: stat.value,
      href: `${base}/${stat.label.toLowerCase()}`,
    }));

  return <RoleHome stats={counts} />;
}
