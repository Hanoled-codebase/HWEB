"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
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
  const { config } = useMobileMenu();
  const { identity } = config;

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
      {isHome ? (
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
          <button
            type="button"
            onClick={goBack}
            aria-label="Go back"
            className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-800 active:bg-slate-100"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="min-w-0 flex-1 truncate py-2 text-[17px] font-bold tracking-tight text-slate-900">{title}</h1>
        </>
      )}
      {config.showNotifications !== false && <NotificationSheet triggerClassName={bell} />}
    </header>
  );
}
