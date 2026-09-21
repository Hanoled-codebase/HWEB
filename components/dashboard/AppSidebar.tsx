"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { queriesForRoute } from "@/lib/queries";
import { usePathname } from "next/navigation";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useSchoolNavItems, type SchoolNavItem } from "@/hooks/useSchoolNavItems";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { School, LogOut, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Desktop sidebar (md and up; phones use the bottom-sheet menu in components/dashboard/mobile).
 * Only the daily-work destinations live here. Finance, staff, facilities and admin tools are
 * launched from the Overview page ("More for your school"), so the list stays short.
 */
const PRIMARY = ["overview"];
const ACADEMICS = ["students", "classes", "subjects", "attendance", "timetable", "results", "homework"];
const PEOPLE = ["teachers", "parents", "admissions"];
const COMMUNICATION = ["messaging"];
const BOTTOM = ["settings", "support"];
const IN_SIDEBAR = new Set([...PRIMARY, ...ACADEMICS, ...PEOPLE, ...COMMUNICATION, ...BOTTOM]);

function NavGroup({
  title,
  items,
  pathname,
  onHover,
}: {
  title?: string;
  items: SchoolNavItem[];
  pathname: string;
  onHover: (url: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mb-1">
      {title && <div className="px-3 pb-1 pt-4 text-xs font-medium text-slate-400">{title}</div>}
      {items.map((item) => {
        const isActive = item.key === "overview" ? pathname === item.url : pathname === item.url || pathname.startsWith(`${item.url}/`);
        return (
          <Link
            key={item.key}
            href={item.url}
            onMouseEnter={() => onHover(item.url)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              isActive ? "bg-blue-50 font-semibold text-blue-700" : "font-medium text-slate-600 hover:bg-slate-50",
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" strokeWidth={2} />
            <span className="truncate">{item.title}</span>
          </Link>
        );
      })}
    </div>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { currentOrg, currentMember, organizations } = useOrganization();
  const { user, logout } = useAuth();
  const { visibleNavItems, role: userRole } = useSchoolNavItems();
  const { isAccountant, isHOD, isLibrarian, isClassTeacher, isSubjectTeacher, isPrivileged } = usePermissions();
  const queryClient = useQueryClient();
  const orgSlug = currentOrg?.slug;
  const [search, setSearch] = useState("");

  // Warm the caches for a destination's lists so the click renders instantly.
  const prefetchRoute = (url: string) => {
    if (!orgSlug) return;
    const segment = url.split("/").filter(Boolean).pop() || "";
    for (const query of queriesForRoute(segment, orgSlug, !!isPrivileged)) {
      void queryClient.prefetchQuery({ ...query, staleTime: 15_000 });
    }
  };

  // After the dashboard has settled, quietly warm the most-visited lists for
  // admins so the first click on Students/Classes/Teachers is already cached.
  useEffect(() => {
    if (!orgSlug || !isPrivileged) return;
    const timer = setTimeout(() => {
      for (const segment of ["students", "classes", "teachers"]) {
        for (const query of queriesForRoute(segment, orgSlug, true)) {
          void queryClient.prefetchQuery({ ...query, staleTime: 60_000 });
        }
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [orgSlug, isPrivileged, queryClient]);

  const byKey = useMemo(() => new Map(visibleNavItems.map((item) => [item.key, item])), [visibleNavItems]);
  const pick = (keys: string[]) => keys.flatMap((key) => (byKey.has(key) ? [byKey.get(key)!] : []));
  // Roles without the Overview tool launcher (teachers, accountants, librarians...) still need to
  // reach everything they are allowed to, so their extra destinations stay in the sidebar.
  const extras = useMemo(
    () => (isPrivileged ? [] : visibleNavItems.filter((item) => !IN_SIDEBAR.has(item.key))),
    [isPrivileged, visibleNavItems],
  );

  if (!currentOrg || !currentMember || !user) return null;

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);

  const roleLabel = isAccountant
    ? "Accountant"
    : isHOD
      ? "Head of Department"
      : isLibrarian
        ? "Librarian"
        : isClassTeacher
          ? "Class Teacher"
          : isSubjectTeacher
            ? "Subject Teacher"
            : userRole === "owner"
              ? "School Owner"
              : userRole === "admin"
                ? "School Admin"
                : userRole === "parent"
                  ? "Parent"
                  : "Staff";

  const needle = search.trim().toLowerCase();
  const results = needle ? visibleNavItems.filter((item) => item.title.toLowerCase().includes(needle)) : null;

  return (
    <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
      {/* School switcher: the school, your role, and the account menu behind one control */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-4 text-left transition-colors hover:bg-slate-50">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={currentOrg.logo} alt={currentOrg.name} />
                <AvatarFallback className="bg-blue-600 text-sm font-bold text-white">{getInitials(currentOrg.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold capitalize text-slate-900">{currentOrg.name}</div>
                <div className="truncate text-xs text-slate-400">{roleLabel}</div>
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
            </button>
          }
        />
        <DropdownMenuContent align="start" className="w-[250px]">
          <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Hanoled Products</div>
          <DropdownMenuItem
            render={
              <div className="flex w-full items-center justify-between px-1 py-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-sm font-semibold text-slate-900">School Management</span>
                </div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">Active</span>
              </div>
            }
          />
          <DropdownMenuItem
            render={
              <Link href="/cbt/admin" className="flex w-full items-center justify-between px-1 py-1 text-slate-600 hover:text-slate-900">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-blue-500" />
                  <span className="text-sm font-medium">CBT Exam Console</span>
                </div>
                <span className="rounded-full border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">Switch</span>
              </Link>
            }
          />
          <DropdownMenuItem
            render={
              <Link href="/welcome" className="flex w-full items-center justify-between px-1 py-1 text-slate-600 hover:text-slate-900">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-blue-500" />
                  <span className="text-sm font-medium">Suite Welcome Hub</span>
                </div>
                <span className="rounded-full border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500">Hub</span>
              </Link>
            }
          />
          <DropdownMenuSeparator />

          {organizations.length > 1 && (
            <>
              <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Switch School</div>
              {organizations.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  render={
                    <Link href={`/dashboard/school/${org.slug}`} className="flex w-full items-center gap-3 py-1">
                      <Avatar className="h-7 w-7 rounded-lg">
                        <AvatarImage src={org.logo} alt={org.name} />
                        <AvatarFallback className="rounded-lg bg-blue-600 text-[11px] text-white">{getInitials(org.name)}</AvatarFallback>
                      </Avatar>
                      <span className="truncate text-sm font-medium capitalize">{org.name}</span>
                    </Link>
                  }
                />
              ))}
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem
            render={
              <Link href="/onboarding" className="flex w-full items-center gap-3 py-1 text-blue-600">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-blue-200 bg-blue-50">
                  <School className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm font-medium">Create new school</span>
              </Link>
            }
          />
          <DropdownMenuSeparator />
          <div className="px-2 py-2">
            <div className="flex items-center gap-3 rounded-lg px-2 py-2">
              <Avatar className="h-8 w-8 rounded-full">
                <AvatarFallback className="bg-slate-100 text-xs font-semibold text-slate-600">{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium capitalize text-slate-900">{user.name}</span>
                <span className="truncate text-xs text-slate-500">{user.email}</span>
              </div>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Search */}
      <div className="px-3 pt-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find anything..."
            aria-label="Find a page"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2 pt-2" aria-label="School navigation">
        {results ? (
          results.length ? (
            <NavGroup title="Results" items={results} pathname={pathname} onHover={prefetchRoute} />
          ) : (
            <div className="px-3 py-6 text-center text-sm text-slate-400">No matches</div>
          )
        ) : (
          <>
            <NavGroup items={pick(PRIMARY)} pathname={pathname} onHover={prefetchRoute} />
            <NavGroup title="Academics" items={pick(ACADEMICS)} pathname={pathname} onHover={prefetchRoute} />
            <NavGroup title="People" items={pick(PEOPLE)} pathname={pathname} onHover={prefetchRoute} />
            <NavGroup title="Communication" items={pick(COMMUNICATION)} pathname={pathname} onHover={prefetchRoute} />
            <NavGroup title="More" items={extras} pathname={pathname} onHover={prefetchRoute} />
          </>
        )}
      </nav>

      {/* Bottom utility */}
      <div className="border-t border-slate-100 px-2 py-2">
        <NavGroup items={pick(BOTTOM)} pathname={pathname} onHover={prefetchRoute} />
      </div>
    </aside>
  );
}
