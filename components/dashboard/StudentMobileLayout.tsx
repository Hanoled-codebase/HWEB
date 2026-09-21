"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { MobileMenuProvider, isPathActive } from "@/components/dashboard/mobile/MobileMenuProvider";
import { MobileTopBar } from "@/components/dashboard/mobile/MobileTopBar";
import { MobileTabBar } from "@/components/dashboard/mobile/MobileTabBar";
import { useStudentMobileConfig } from "@/components/dashboard/mobile/mobile-config";

/**
 * Student phone chrome. Same top bar / tab bar / menu sheet as every staff and
 * parent role, tuned to what a learner reaches for: results, pending exams,
 * timetable.
 */
export function StudentMobileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const config = useStudentMobileConfig();

  if (!config) return <div className="min-h-screen bg-slate-50" />;

  const isHome = pathname === config.basePath;
  const current = config.sections
    .flatMap((section) => section.items)
    .find((item) => isPathActive(pathname, item, config.basePath));

  return (
    <MobileMenuProvider config={config}>
      <div className="flex min-h-screen flex-col bg-slate-50">
        <MobileTopBar title={current?.label ?? "Hanoled"} isHome={isHome} />
        <main className="flex-1 px-4 pt-4 pb-safe-nav">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
        <MobileTabBar />
      </div>
    </MobileMenuProvider>
  );
}
