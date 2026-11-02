"use client";

import { createContext, useContext, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Check,
  ChevronRight,
  LogOut,
  Search,
  School,
  ShieldCheck,
  X,
  LayoutGrid,
} from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { cn } from "@/lib/utils";
import { WorkspaceSwitch } from "@/components/dashboard/WorkspaceSwitch";
import type { MobileNavItem, MobileShellConfig } from "./mobile-config";

type PageTitle = { path: string; title: string } | null;

type MobileMenuContextValue = {
  config: MobileShellConfig;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  /** Title a page handed to the top bar (an entity name like "JSS1A"), only for the path that set it. */
  pageTitle: string | null;
  setPageTitle: Dispatch<SetStateAction<PageTitle>>;
};

const MobileMenuContext = createContext<MobileMenuContextValue | null>(null);

export function useMobileMenu() {
  const ctx = useContext(MobileMenuContext);
  if (!ctx) throw new Error("useMobileMenu must be used inside <MobileMenuProvider>");
  return ctx;
}

/** Like useMobileMenu, but null outside a provider (config not resolved yet). */
export function useOptionalMobileMenu() {
  return useContext(MobileMenuContext);
}

/**
 * On phones the top bar is the page's only title. A page whose real title is data
 * (a class, a learner, a subject) hands it up here and hides its own H1 below md.
 * Safe to call outside the phone shell (desktop, loading): it does nothing there.
 */
export function useMobilePageTitle(title: string | null | undefined) {
  const setPageTitle = useContext(MobileMenuContext)?.setPageTitle;
  const pathname = usePathname();
  useEffect(() => {
    if (!setPageTitle || !title) return;
    setPageTitle({ path: pathname, title });
    return () => setPageTitle((current) => (current?.path === pathname && current.title === title ? null : current));
  }, [setPageTitle, title, pathname]);
}

export function isPathActive(pathname: string, item: { href: string }, basePath: string) {
  if (item.href === basePath) return pathname === basePath;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function MobileMenuProvider({
  config,
  children,
}: {
  config: MobileShellConfig;
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  // Any navigation dismisses the sheet, including links inside pages.
  // Adjusting state while rendering avoids an extra effect-driven render.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMenuOpen(false);
  }

  const [titleEntry, setPageTitle] = useState<PageTitle>(null);
  const pageTitle = titleEntry?.path === pathname ? titleEntry.title : null;

  const value = useMemo(
    () => ({ config, menuOpen, setMenuOpen, pageTitle, setPageTitle }),
    [config, menuOpen, pageTitle],
  );

  return (
    <MobileMenuContext.Provider value={value}>
      {children}
      <MobileMenuSheet />
    </MobileMenuContext.Provider>
  );
}

function MenuTile({ item, active, onNavigate }: { item: MobileNavItem; active: boolean; onNavigate: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-[92px] flex-col items-center justify-start gap-2 rounded-2xl border px-1.5 pb-2.5 pt-3 text-center transition-colors active:scale-[0.97]",
        active
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : "border-slate-100 bg-white text-slate-700 active:bg-slate-50",
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl",
          active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600",
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="line-clamp-2 text-[12px] font-medium leading-tight">{item.label}</span>
    </Link>
  );
}

function MobileMenuSheet() {
  const { config, menuOpen, setMenuOpen } = useMobileMenu();
  return (
    <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="max-h-[90dvh] gap-0 rounded-t-[28px] border-t-0 bg-slate-50 p-0 duration-300 ease-[var(--ease-out-smooth)] md:hidden"
      >
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <SheetDescription className="sr-only">Navigate to any area available to your role</SheetDescription>
        {/* Mounted only while open, so search text and the school switcher reset on every open. */}
        <MenuBody config={config} close={() => setMenuOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

function MenuBody({ config, close }: { config: MobileShellConfig; close: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const { organizations, currentOrg, setCurrentOrg } = useOrganization();
  const [query, setQuery] = useState("");
  const [switching, setSwitching] = useState(false);
  // Log out sits where the thumb rests; one stray tap should not end the session.
  const [confirmLogout, setConfirmLogout] = useState(false);

  const needle = query.trim().toLowerCase();
  const totalItems = config.sections.reduce((count, section) => count + section.items.length, 0);
  // Search only earns its space when there is a lot to search through.
  const showSearch = totalItems > 9;

  const filtered = useMemo(() => {
    if (!needle) return config.sections;
    return config.sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.label.toLowerCase().includes(needle)),
      }))
      .filter((section) => section.items.length > 0);
  }, [config.sections, needle]);

  const { identity } = config;

  return (
      <>
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-slate-300" aria-hidden="true" />

        {/* Who am I, where am I */}
        <div className="flex items-center gap-3 px-4 pb-3 pt-3">
          <Avatar className="h-12 w-12 shrink-0 rounded-2xl">
            <AvatarImage src={identity.orgLogo} alt={identity.orgName} />
            <AvatarFallback className="rounded-2xl bg-blue-600 text-sm font-bold text-white">
              {identity.orgName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold capitalize text-slate-900">{identity.orgName}</p>
            <p className="truncate text-xs text-slate-500">
              <span className="font-semibold capitalize text-slate-700">{identity.userName}</span> · {config.roleLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close menu"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm active:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Staff with more than one hat switch here; the new workspace opens on its home. */}
        {config.workspaces && !switching && (
          <div className="px-4 pb-4">
            <WorkspaceSwitch
              items={config.workspaces.items.map((item) => item.key)}
              active={config.workspaces.active}
              onChange={(key) => {
                config.workspaces?.onChange(key);
                if (pathname !== config.basePath) router.push(config.basePath);
                close();
              }}
            />
          </div>
        )}

        {switching ? (
          <div className="flex-1 space-y-2 overflow-y-auto px-4 pb-4">
            <p className="px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Switch school</p>
            {organizations.map((org) => {
              const isCurrent = org.slug === currentOrg?.slug;
              return (
                <button
                  key={org.id}
                  type="button"
                  onClick={async () => {
                    if (!isCurrent) {
                      await setCurrentOrg(org.slug);
                      router.push(`/dashboard/school/${org.slug}`);
                    }
                    close();
                  }}
                  className="flex min-h-[56px] w-full items-center gap-3 rounded-2xl border border-slate-100 bg-white px-3 text-left active:bg-slate-50"
                >
                  <Avatar className="h-9 w-9 rounded-xl">
                    <AvatarImage src={org.logo} alt={org.name} />
                    <AvatarFallback className="rounded-xl bg-blue-600 text-xs font-bold text-white">
                      {org.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold capitalize text-slate-900">{org.name}</span>
                  {isCurrent && <Check className="h-4 w-4 text-blue-600" />}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
            {showSearch && (
              <label className="mb-4 flex h-11 items-center gap-2 rounded-xl bg-white px-3 shadow-sm ring-1 ring-slate-100 focus-within:ring-2 focus-within:ring-blue-600">
                <Search className="h-4 w-4 shrink-0 text-slate-400" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Find a page"
                  className="min-w-0 flex-1 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
                />
              </label>
            )}

            {/* Overview is always the first stop — one tap home */}
            {!needle && (
              <Link
                href={config.basePath}
                onClick={close}
                className={cn(
                  "mb-4 flex min-h-[52px] items-center gap-3 rounded-2xl px-3.5",
                  pathname === config.basePath ? "bg-blue-600 text-white" : "border border-slate-100 bg-white text-slate-800",
                )}
              >
                <LayoutGrid className="h-5 w-5" />
                <span className="flex-1 text-sm font-semibold">Overview</span>
                <ChevronRight className="h-4 w-4 opacity-60" />
              </Link>
            )}

            {filtered.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">
                Nothing matches &ldquo;{query}&rdquo; for your role.
              </p>
            ) : (
              filtered.map((section) => (
                <div key={section.title} className="mb-5">
                  <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {section.title}
                  </p>
                  <div className="m-stagger grid grid-cols-3 gap-2">
                    {section.items.map((item) => (
                      <MenuTile
                        key={item.key}
                        item={item}
                        active={isPathActive(pathname, item, config.basePath)}
                        onNavigate={close}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Account actions stay in thumb reach and above the home indicator */}
        <div className="grid shrink-0 gap-2 border-t border-slate-200/80 bg-white px-4 pb-safe pt-3">
          <div className="mb-3 grid grid-cols-2 gap-2">
            {config.showCbtConsole && (
              <Link
                href={currentOrg ? `/cbt/admin?orgSlug=${encodeURIComponent(currentOrg.slug)}` : "/cbt/admin"}
                onClick={close}
                className="col-span-2 flex min-h-[48px] items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-800 active:bg-slate-50"
              >
                <span className="flex items-center gap-2.5">
                  <ShieldCheck className="h-5 w-5 text-blue-600" /> CBT Exam Console
                </span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </Link>
            )}
            {organizations.length > 1 && config.profile !== "student" && !confirmLogout && (
              <button
                type="button"
                onClick={() => setSwitching((v) => !v)}
                className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 active:bg-slate-50"
              >
                <School className="h-4 w-4 text-slate-500" /> {switching ? "Back" : "Switch school"}
              </button>
            )}
            {confirmLogout ? (
              <div className="col-span-2 grid grid-cols-2 gap-2" role="group" aria-label="Confirm log out">
                <button
                  type="button"
                  onClick={() => setConfirmLogout(false)}
                  className="flex min-h-[48px] items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 active:bg-slate-50"
                >
                  Stay signed in
                </button>
                <button
                  type="button"
                  autoFocus
                  onClick={() => {
                    close();
                    void (config.logout ?? logout)();
                  }}
                  className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-red-600 px-3 text-sm font-semibold text-white active:bg-red-700"
                >
                  <LogOut className="h-4 w-4" /> Log out
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmLogout(true)}
                className={cn(
                  "flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-red-600 active:bg-red-50",
                  organizations.length > 1 && config.profile !== "student" ? "bg-red-50/60" : "col-span-2 bg-red-50/60",
                )}
              >
                <LogOut className="h-4 w-4" /> Log out
              </button>
            )}
          </div>
        </div>
      </>
  );
}
