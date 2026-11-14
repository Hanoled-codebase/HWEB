"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { queriesForRoute } from "@/lib/queries";
import { usePathname, useRouter } from "next/navigation";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useSchoolNavItems, type SchoolNavItem } from "@/hooks/useSchoolNavItems";
import { useWorkspace, type WorkspaceKey } from "@/hooks/useWorkspace";
import { WorkspaceSwitch } from "@/components/dashboard/WorkspaceSwitch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { LogOut, ChevronDown, Search, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Staff sidebar. From lg (1024px) it is always open; on tablets (md to lg) the same panel is a
 * drawer the layout's menu button opens, so pages get the full width. Phones use the
 * bottom-sheet menu in components/dashboard/mobile.
 * Only the daily-work destinations live here. Finance, staff, facilities and admin tools are
 * launched from the Overview page ("More for your school"), so the list stays short.
 */
const PRIMARY = ["overview"];
const ACADEMICS = ["students", "classes", "subjects", "attendance", "timetable", "results", "homework"];
const PEOPLE = ["teachers", "parents", "admissions"];
// MESSAGING_PARKED — the Communication workspace is parked for the MVP launch; restore post-launch.
// const COMMUNICATION = ["messaging"];
const BOTTOM = ["settings", "access", "support"];
// Staff whose role covers any of the bursary get it as its own group; admins
// reach these from the Overview launcher instead.
// Each workspace's tools as one group, for staff who hold that workspace.
const WORKSPACE_GROUPS: Array<{ workspace: WorkspaceKey; title: string; keys: string[] }> = [
  { workspace: "department", title: "Department", keys: ["spreadsheets", "scheme-of-work", "lesson-notes", "hr", "staff-attendance"] },
  // SCRATCH_CARD_PARKED — "scratch-cards" out of the Bursary workspace for the MVP launch; restore post-launch.
  { workspace: "finance", title: "Bursary", keys: ["record-payment", "payments", "debt", "fee-structure", "billing", "payroll", "staff-attendance"] },
  { workspace: "library", title: "Library", keys: ["library-desk", "library"] },
];
// MESSAGING_PARKED — COMMUNICATION spread parked for the MVP launch; restore post-launch.
const IN_SIDEBAR = new Set([...PRIMARY, ...ACADEMICS, ...PEOPLE, ...BOTTOM]);

function NavGroup({
  title,
  items,
  pathname,
  onHover,
  onNavigate,
}: {
  title?: string;
  items: SchoolNavItem[];
  pathname: string;
  onHover: (url: string) => void;
  onNavigate?: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mb-1">
      {title && <div className="px-3 pb-1 pt-4 text-xs font-medium text-slate-400">{title}</div>}
      {items.map((item) => {
        // A nested destination (Payments › Record Payment) lights up alone.
        const matches = (url: string) => pathname === url || pathname.startsWith(`${url}/`);
        const isActive =
          item.key === "overview"
            ? pathname === item.url
            : matches(item.url) &&
              !items.some((other) => other.url.length > item.url.length && other.url.startsWith(item.url) && matches(other.url));
        return (
          <Link
            key={item.key}
            href={item.url}
            onMouseEnter={() => onHover(item.url)}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-[background-color,color,scale] duration-150 active:scale-[0.98] pointer-coarse:min-h-11",
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

export function AppSidebar({
  drawerOpen = false,
  onDrawerOpenChange,
}: {
  /** Tablet drawer (below lg); ignored from lg up, where the sidebar is always shown. */
  drawerOpen?: boolean;
  onDrawerOpenChange?: (open: boolean) => void;
} = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentOrg, currentMember, organizations, setCurrentOrg } = useOrganization();
  const { user, logout } = useAuth();
  const { visibleNavItems, role: userRole } = useSchoolNavItems();
  const { isAccountant, isHOD, isLibrarian, isClassTeacher, isSubjectTeacher, isPrivileged } = usePermissions();
  const { available: workspaces, active: workspace, setActive: setWorkspace } = useWorkspace();
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
  // Groups for the workspaces this person holds, the active one first; a key
  // shown in an earlier group is not repeated in a later one.
  const groups = useMemo(() => {
    if (isPrivileged) return [];
    const held = WORKSPACE_GROUPS.filter((group) => workspaces.includes(group.workspace)).sort(
      (a, b) => Number(b.workspace === workspace) - Number(a.workspace === workspace),
    );
    const used = new Set<string>();
    return held.map((group) => {
      const items = group.keys.filter((key) => !used.has(key) && byKey.has(key)).map((key) => byKey.get(key)!);
      items.forEach((item) => used.add(item.key));
      return { ...group, items };
    });
  }, [isPrivileged, workspaces, workspace, byKey]);
  const grouped = new Set(groups.flatMap((group) => group.items.map((item) => item.key)));
  const extras = isPrivileged ? [] : visibleNavItems.filter((item) => !IN_SIDEBAR.has(item.key) && !grouped.has(item.key));
  const activeGroup = groups.find((group) => group.workspace === workspace);
  const otherGroups = groups.filter((group) => group !== activeGroup);

  if (!currentOrg || !currentMember || !user) return null;

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);

  // Every hat this person wears, not just the first one found.
  const heldRoles = [
    isHOD && "Head of Department",
    isClassTeacher && "Class Teacher",
    isSubjectTeacher && "Subject Teacher",
    isAccountant && "Accountant",
    isLibrarian && "Librarian",
  ].filter(Boolean) as string[];
  const roleLabel =
    userRole === "owner"
      ? "School Owner"
      : userRole === "admin"
        ? "School Admin"
        : userRole === "parent"
          ? "Parent"
          : heldRoles.length
            ? heldRoles.join(" · ")
            : "Staff";

  const needle = search.trim().toLowerCase();
  const results = needle ? visibleNavItems.filter((item) => item.title.toLowerCase().includes(needle)) : null;

  const panel = (onNavigate?: () => void) => (
    <>
      {/* School switcher: the school, your role, and the account menu behind one control */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button className="flex w-full cursor-pointer items-center gap-3 border-b border-slate-100 px-4 py-4 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={currentOrg.logo} alt={currentOrg.name} />
                <AvatarFallback className="bg-blue-600 text-sm font-bold text-white">{getInitials(currentOrg.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold capitalize text-slate-900">{currentOrg.name}</div>
                <div className="truncate text-xs text-slate-500">{roleLabel}</div>
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
            </button>
          }
        />
        <DropdownMenuContent align="start" className="w-[250px]">
          {userRole !== "parent" && (
            <>
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
                  <Link href={orgSlug ? `/cbt/admin?orgSlug=${encodeURIComponent(orgSlug)}` : "/cbt/admin"} className="flex w-full items-center justify-between px-1 py-1 text-slate-600 hover:text-slate-900">
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
            </>
          )}

          {organizations.length > 1 && (
            <>
              <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Switch School</div>
              {organizations.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  render={
                    <button
                      type="button"
                      onClick={async () => {
                        await setCurrentOrg(org.slug);
                        router.push(`/dashboard/school/${org.slug}`);
                      }}
                      className="flex w-full items-center gap-3 py-1 text-left"
                    >
                      <Avatar className="h-7 w-7 rounded-lg">
                        <AvatarImage src={org.logo} alt={org.name} />
                        <AvatarFallback className="rounded-lg bg-blue-600 text-[11px] text-white">{getInitials(org.name)}</AvatarFallback>
                      </Avatar>
                      <span className="truncate text-sm font-medium capitalize">{org.name}</span>
                    </button>
                  }
                />
              ))}
              <DropdownMenuSeparator />
            </>
          )}

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
          <DropdownMenuItem
            onClick={() => router.push("/account/password")}
            className="cursor-pointer"
          >
            <KeyRound className="mr-2 h-4 w-4" />
            <span>Change password</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {workspace && workspaces.length > 1 && (
        <div className="px-3 pt-3">
          <WorkspaceSwitch
            size="sm"
            items={workspaces}
            active={workspace}
            onChange={(key) => {
              setWorkspace(key);
              const home = `/dashboard/school/${currentOrg.slug}`;
              if (pathname !== home) router.push(home);
            }}
          />
        </div>
      )}

      {/* Search */}
      <div className="px-3 pt-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find anything..."
            aria-label="Find a page"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-sm pointer-coarse:min-h-11 outline-none placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2 pt-2" aria-label="School navigation">
        {results ? (
          results.length ? (
            <NavGroup title="Results" items={results} pathname={pathname} onHover={prefetchRoute} onNavigate={onNavigate} />
          ) : (
            <div className="px-3 py-6 text-center text-sm text-slate-400">No matches</div>
          )
        ) : (
          <>
            <NavGroup items={pick(PRIMARY)} pathname={pathname} onHover={prefetchRoute} onNavigate={onNavigate} />
            {/* The active workspace's tools come first. */}
            {activeGroup && <NavGroup title={activeGroup.title} items={activeGroup.items} pathname={pathname} onHover={prefetchRoute} onNavigate={onNavigate} />}
            <NavGroup title="Academics" items={pick(ACADEMICS)} pathname={pathname} onHover={prefetchRoute} onNavigate={onNavigate} />
            <NavGroup title="People" items={pick(PEOPLE)} pathname={pathname} onHover={prefetchRoute} onNavigate={onNavigate} />
            {/* MESSAGING_PARKED — the Communication workspace group is parked for the MVP launch; restore post-launch. */}
            {/* <NavGroup title="Communication" items={pick(COMMUNICATION)} pathname={pathname} onHover={prefetchRoute} onNavigate={onNavigate} /> */}
            {otherGroups.map((group) => (
              <NavGroup key={group.workspace} title={group.title} items={group.items} pathname={pathname} onHover={prefetchRoute} onNavigate={onNavigate} />
            ))}
            <NavGroup title="More" items={extras} pathname={pathname} onHover={prefetchRoute} onNavigate={onNavigate} />
          </>
        )}
      </nav>

      {/* Bottom utility */}
      <div className="border-t border-slate-100 px-2 py-2">
        <NavGroup items={pick(BOTTOM)} pathname={pathname} onHover={prefetchRoute} onNavigate={onNavigate} />
      </div>
    </>
  );

  return (
    <>
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">{panel()}</aside>
      <Sheet open={drawerOpen} onOpenChange={(open) => onDrawerOpenChange?.(open)}>
        <SheetContent side="left" showCloseButton={false} className="gap-0 bg-white p-0 data-[side=left]:w-72 lg:hidden">
          <SheetTitle className="sr-only">School navigation</SheetTitle>
          {panel(() => onDrawerOpenChange?.(false))}
        </SheetContent>
      </Sheet>
    </>
  );
}
