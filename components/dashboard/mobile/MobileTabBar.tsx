"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { isPathActive, useMobileMenu, useOptionalMobileMenu } from "./MobileMenuProvider";

// Focused data-entry screens own the bottom edge (a sticky save bar); global
// navigation steps aside so it never covers the primary action.
const FOCUSED_ROUTES = [/\/spreadsheets\/[^/]+\/assessment\//];

const slot =
  "relative flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 transition-colors active:bg-slate-100";

export function MobileTabBar() {
  // No provider yet (member/org config not resolved): render nothing, not a crash.
  if (!useOptionalMobileMenu()) return null;
  return <MobileTabBarInner />;
}

function MobileTabBarInner() {
  const { config, menuOpen, setMenuOpen } = useMobileMenu();
  const pathname = usePathname();

  // The "Menu" slot lights up when the current page is not one of the tabs,
  // so a deep page under a menu-only destination still shows where you are.
  if (FOCUSED_ROUTES.some((route) => route.test(pathname))) return null;

  const activeTab = config.tabs.find((tab) => isPathActive(pathname, tab, config.basePath));

  if (config.tabStyle === "pill") {
    const menuActive = menuOpen || !activeTab;
    const pill = (active: boolean) =>
      cn(
        "flex flex-col items-center gap-1 rounded-2xl px-3.5 py-1.5 transition-colors",
        active ? "bg-blue-50 text-blue-600" : "text-slate-500",
      );
    const label = (active: boolean) => cn("text-[13px] leading-tight", active ? "font-semibold" : "font-medium");
    return (
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 pb-safe backdrop-blur-md md:hidden"
      >
        <ul className="mx-auto flex max-w-[520px] items-stretch px-2 pt-1.5 pb-1.5">
          {config.tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab?.key === tab.key;
            return (
              <li key={tab.key} className="flex min-w-0 flex-1 justify-center">
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className="flex min-h-[56px] items-center justify-center active:opacity-70"
                >
                  <span className={pill(active)}>
                    <Icon className="h-5 w-5" strokeWidth={active ? 2.3 : 2} />
                    <span className={label(active)}>{tab.label}</span>
                  </span>
                </Link>
              </li>
            );
          })}
          <li className="flex min-w-0 flex-1 justify-center">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              className="flex min-h-[56px] items-center justify-center active:opacity-70"
            >
              <span className={pill(menuActive)}>
                <Menu className="h-5 w-5" strokeWidth={menuActive ? 2.3 : 2} />
                <span className={label(menuActive)}>Menu</span>
              </span>
            </button>
          </li>
        </ul>
      </nav>
    );
  }

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 pb-safe backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto flex max-w-[520px] items-stretch gap-0.5 px-2 pt-1.5 pb-1.5">
        {config.tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab?.key === tab.key;
          return (
            <li key={tab.key} className="flex min-w-0 flex-1">
              <Link href={tab.href} aria-current={active ? "page" : undefined} className={slot}>
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
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
        <li className="flex min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            className={slot}
          >
            <span
              className={cn(
                "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                menuOpen || !activeTab ? "bg-blue-50 text-blue-600" : "text-slate-500",
              )}
            >
              <Menu className="h-[22px] w-[22px]" strokeWidth={menuOpen || !activeTab ? 2.4 : 2} />
            </span>
            <span
              className={cn(
                "text-xs leading-tight",
                menuOpen || !activeTab ? "font-semibold text-blue-600" : "font-medium text-slate-500",
              )}
            >
              Menu
            </span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
