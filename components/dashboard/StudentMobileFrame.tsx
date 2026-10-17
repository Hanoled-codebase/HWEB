"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { MobileMenuProvider, isPathActive, useOptionalMobileMenu } from "@/components/dashboard/mobile/MobileMenuProvider";
import { MobileTopBar } from "@/components/dashboard/mobile/MobileTopBar";
import { useStudentMobileConfig } from "@/components/dashboard/mobile/mobile-config";

/**
 * Student phone chrome. Same top bar / tab bar / menu sheet as every staff and
 * parent role, tuned to what a learner reaches for: results, pending exams,
 * timetable. Wraps the one copy of the page the layout renders; the bars
 * themselves are md:hidden, so desktop keeps its sidebar shell.
 */
export function StudentMobileFrame({ children }: { children: React.ReactNode }) {
  const config = useStudentMobileConfig();
  if (!config) return <>{children}</>;
  return <MobileMenuProvider config={config}>{children}</MobileMenuProvider>;
}

/** Phone top bar titled after the student nav item the path is on. */
export function StudentMobileTopBar() {
  const pathname = usePathname();
  const menu = useOptionalMobileMenu();
  if (!menu) return null;

  const { config } = menu;
  const current = config.sections
    .flatMap((section) => section.items)
    .find((item) => isPathActive(pathname, item, config.basePath));

  return <MobileTopBar title={current?.label ?? "Hanoled"} isHome={pathname === config.basePath} />;
}
