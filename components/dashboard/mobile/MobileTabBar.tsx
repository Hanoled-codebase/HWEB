"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { isPathActive, useMobileMenu, useOptionalMobileMenu } from "./MobileMenuProvider";

// Focused data-entry screens own the bottom edge (a sticky save bar); global
// navigation steps aside so it never covers the primary action.
const FOCUSED_ROUTES = [/\/spreadsheets\/[^/]+\/assessment\//];

const MENU_KEY = "__menu";

type Box = { left: number; top: number; width: number; height: number };

export function MobileTabBar() {
  // No provider yet (member/org config not resolved): render nothing, not a crash.
  if (!useOptionalMobileMenu()) return null;
  return <MobileTabBarInner />;
}

function MobileTabBarInner() {
  const { config, menuOpen, setMenuOpen } = useMobileMenu();
  const pathname = usePathname();
  const listRef = useRef<HTMLUListElement>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [animate, setAnimate] = useState(false);

  const hidden = FOCUSED_ROUTES.some((route) => route.test(pathname));
  const activeTab = config.tabs.find((tab) => isPathActive(pathname, tab, config.basePath));
  // The "Menu" slot lights up when the current page is not one of the tabs,
  // so a deep page under a menu-only destination still shows where you are.
  const menuActive = menuOpen || !activeTab;
  const activeKey = menuActive ? MENU_KEY : activeTab!.key;
  const pillStyle = config.tabStyle === "pill";

  const measure = useCallback(() => {
    const list = listRef.current;
    const el = list?.querySelector<HTMLElement>(`[data-pill="${CSS.escape(activeKey)}"]`);
    if (!list || !el) return;
    const l = list.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const next = { left: r.left - l.left, top: r.top - l.top, width: r.width, height: r.height };
    setBox((prev) =>
      prev && prev.left === next.left && prev.top === next.top && prev.width === next.width && prev.height === next.height ? prev : next,
    );
  }, [activeKey]);

  // Measure before paint so the indicator never flashes at the wrong place.
  useLayoutEffect(() => {
    measure();
  }, [measure, hidden, config.tabs.length]);

  // Glide only after the first placement, and stay glued to the pill on resize, font load, or rotation.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      measure();
      setAnimate(true);
    });
    const list = listRef.current;
    window.addEventListener("resize", measure);
    let cancelled = false;
    if (typeof document !== "undefined" && document.fonts?.ready) {
      void document.fonts.ready.then(() => {
        if (!cancelled) measure();
      });
    }
    if (!list || typeof ResizeObserver === "undefined") {
      return () => {
        cancelled = true;
        cancelAnimationFrame(id);
        window.removeEventListener("resize", measure);
      };
    }
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
      window.removeEventListener("resize", measure);
      ro.disconnect();
    };
  }, [measure]);

  if (hidden) return null;

  const slot = "flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 transition-opacity duration-100 active:opacity-70 max-[389px]:px-0";
  const pillWrap = (active: boolean) =>
    pillStyle
      ? cn("relative z-10 flex flex-col items-center gap-1 rounded-2xl px-3.5 py-1.5 transition-colors duration-200", active ? "text-blue-600" : "text-slate-500")
      : cn("relative z-10 flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-200", active ? "text-blue-600" : "text-slate-500");
  const labelCls = (active: boolean) =>
    pillStyle
      ? cn("text-[13px] leading-tight", active ? "font-semibold" : "font-medium")
      : cn("max-w-full truncate text-xs leading-tight transition-colors duration-200 max-[389px]:text-[11px] max-[389px]:tracking-tight", active ? "font-semibold text-blue-600" : "font-medium text-slate-500");
  const iconCls = pillStyle ? "h-5 w-5" : "h-[22px] w-[22px]";

  return (
    <nav aria-label="Primary" className="m-glass fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 pb-safe md:hidden">
      <ul ref={listRef} className="relative mx-auto flex max-w-[520px] items-stretch gap-0.5 px-1 pb-1.5 pt-1.5">
        {/* One shared highlight that glides between tabs with a small spring. */}
        {box && (
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute z-0 bg-blue-50",
              pillStyle ? "rounded-2xl" : "rounded-full",
              animate && "transition-[left,top,width,height] duration-[420ms] ease-[var(--ease-spring)] motion-reduce:duration-150 motion-reduce:ease-out",
            )}
            style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
          />
        )}
        {config.tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeKey === tab.key;
          return (
            <li key={tab.key} className="flex min-w-0 flex-1">
              <Link href={tab.href} aria-current={active ? "page" : undefined} className={slot}>
                <span data-pill={tab.key} className={pillWrap(active)}>
                  <Icon className={iconCls} strokeWidth={active ? 2.4 : 2} />
                  {pillStyle && <span className={labelCls(active)}>{tab.label}</span>}
                </span>
                {!pillStyle && <span className={labelCls(active)}>{tab.label}</span>}
              </Link>
            </li>
          );
        })}
        <li className="flex min-w-0 flex-1">
          <button type="button" onClick={() => setMenuOpen(true)} aria-haspopup="dialog" aria-expanded={menuOpen} className={slot}>
            <span data-pill={MENU_KEY} className={pillWrap(menuActive)}>
              <Menu className={iconCls} strokeWidth={menuActive ? 2.4 : 2} />
              {pillStyle && <span className={labelCls(menuActive)}>Menu</span>}
            </span>
            {!pillStyle && <span className={labelCls(menuActive)}>Menu</span>}
          </button>
        </li>
      </ul>
    </nav>
  );
}
