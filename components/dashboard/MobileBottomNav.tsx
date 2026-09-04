"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { useSchoolNavItems } from "@/hooks/useSchoolNavItems";

export function MobileBottomNav({ slug }: { slug: string }) {
  const pathname = usePathname();
  const base = `/dashboard/school/${slug}`;
  const { visibleNavItems } = useSchoolNavItems();

  // Dynamic per HCORE assignments — HCORE is source, local projection allows offline
  const primary = visibleNavItems.slice(0, 4).map((item) => ({
    label: item.title,
    href: item.url,
    exact: item.url === base,
    icon: item.icon,
  }));
  const navItems = [...primary, { label: "More", href: `${base}/teachers`, exact: false, icon: MoreHorizontal }].slice(0, 5);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-100 bg-white/95 backdrop-blur-md md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 transition-colors ${
                isActive ? "text-[#1447E6]" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <Icon className="h-5 w-5 mb-1" />
              <span className={`text-[10px] font-medium ${isActive ? "font-semibold" : ""}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
