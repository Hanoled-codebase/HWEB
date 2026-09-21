"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, ChevronLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationSheet } from "@/components/dashboard/NotificationSheet";
import { useMobileMenu, useOptionalMobileMenu } from "./MobileMenuProvider";

const bell = "!h-11 !w-11";

/**
 * Home: which school and which hat you are wearing.
 * Anywhere else: a real back target and the page name.
 */
export function MobileTopBar(props: { title: string; isHome: boolean }) {
  // No provider yet (member/org config not resolved): render nothing, not a crash.
  if (!useOptionalMobileMenu()) return null;
  return <MobileTopBarInner {...props} />;
}

function MobileTopBarInner({ title, isHome }: { title: string; isHome: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const { config } = useMobileMenu();
  const { identity } = config;

  // With hideBack, top-level destinations (tabs, menu items) have no back arrow, but a page
  // reached from one of them (e.g. a school opened from the Schools list) still does.
  const topLevel =
    pathname === config.basePath ||
    config.tabs.some((tab) => tab.href === pathname) ||
    config.sections.some((section) => section.items.some((item) => item.href === pathname));
  const showBack = !config.hideBack || !topLevel;
  const accountStyle = config.homeBar === "account";

  const goBack = () => {
    if (window.history.length > 2) {
      router.back();
      return;
    }
    const parts = window.location.pathname.split("/");
    parts.pop();
    router.push(parts.join("/") || config.basePath);
  };

  return (
    <header className="sticky top-0 z-30 flex min-h-14 items-center gap-3 border-b border-slate-100 bg-white/95 px-4 pt-safe backdrop-blur-md md:hidden">
      {isHome && config.homeBar === "account" ? (
        <>
          <span
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-[15px] font-bold text-white"
          >
            {identity.initials}
          </span>
          <div className="min-w-0 flex-1 py-3">
            <p className="truncate text-base font-bold leading-tight text-slate-900">{identity.orgName}</p>
            <p className="truncate text-[13px] capitalize leading-snug text-slate-600">{identity.userName}</p>
            <p className="truncate text-xs font-medium uppercase leading-tight tracking-wide text-slate-400">{config.roleLabel}</p>
          </div>
        </>
      ) : isHome ? (
        <>
          <Avatar className="h-10 w-10 shrink-0 rounded-xl">
            <AvatarImage src={identity.orgLogo} alt={identity.orgName} />
            <AvatarFallback className="rounded-xl bg-blue-600 text-sm font-bold text-white">
              {identity.orgName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 py-2">
            <p className="truncate text-[15px] font-bold capitalize leading-tight text-slate-900">{identity.orgName}</p>
            <p className="truncate text-xs leading-tight text-slate-500">{config.roleLabel}</p>
          </div>
        </>
      ) : (
        <>
          {showBack && (
            <button
              type="button"
              onClick={goBack}
              aria-label="Go back"
              className={
                accountStyle
                  ? "-ml-1 flex h-11 w-11 shrink-0 items-center justify-center"
                  : "-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-800 active:bg-slate-100"
              }
            >
              {accountStyle ? (
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700">
                  <ChevronLeft className="h-5 w-5" />
                </span>
              ) : (
                <ChevronLeft className="h-6 w-6" />
              )}
            </button>
          )}
          <h1
            className={`min-w-0 flex-1 truncate py-2 text-[17px] font-bold tracking-tight text-slate-900 ${
              accountStyle && showBack ? "text-center" : ""
            }`}
          >
            {title}
          </h1>
        </>
      )}
      {config.bell ? (
        // 44px hit area around a 36px circle: it looks light, it stays easy to tap.
        <Link
          href={config.bell.href}
          aria-label={config.bell.dot ? `${config.bell.label} (new activity)` : config.bell.label}
          className="-mr-1 flex h-11 w-11 shrink-0 items-center justify-center"
        >
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700">
            <Bell className="h-[18px] w-[18px]" />
            {config.bell.dot && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-slate-50" />}
          </span>
        </Link>
      ) : (
        config.showNotifications !== false && <NotificationSheet triggerClassName={bell} />
      )}
    </header>
  );
}
