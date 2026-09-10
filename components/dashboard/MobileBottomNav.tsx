"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { useSchoolNavItems } from "@/hooks/useSchoolNavItems";
import { useSidebar } from "@/components/ui/sidebar";

export function MobileBottomNav({ slug }: { slug: string }) {
  const pathname = usePathname();
  const base = `/dashboard/school/${slug}`;
  const { visibleNavItems } = useSchoolNavItems();
  const { setOpenMobile } = useSidebar();

  // Dynamic per HCORE assignments — HCORE is source, local projection allows offline
  const primary = visibleNavItems.slice(0, 4).map((item) => ({
    label: item.title,
    href: item.url,
    exact: item.url === base,
    icon: item.icon,
  }));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-100 bg-white/95 backdrop-blur-md md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {primary.map((item) => {
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
        {/* Opens the same role-filtered sidebar sheet as the header menu button,
            instead of hardlinking to a page (e.g. Teachers) this role may not have. */}
        <button
          type="button"
          onClick={() => setOpenMobile(true)}
          className="flex flex-col items-center justify-center flex-1 py-1.5 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <MoreHorizontal className="h-5 w-5 mb-1" />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </div>
    </nav>
  );
}
