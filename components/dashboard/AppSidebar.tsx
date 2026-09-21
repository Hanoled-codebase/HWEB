"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { queriesForRoute } from "@/lib/queries";
import { usePathname } from "next/navigation";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useSchoolNavItems } from "@/hooks/useSchoolNavItems";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  School,
  LogOut,
  ChevronUp,
} from "lucide-react";

export function AppSidebar() {
  const pathname = usePathname();
  const { isMobile } = useSidebar();
  const { currentOrg, currentMember, organizations } = useOrganization();
  const { user, logout } = useAuth();
  const { visibleNavItems, role: userRole } = useSchoolNavItems();
  const { isAccountant, isHOD, isLibrarian, isClassTeacher, isSubjectTeacher, isPrivileged } = usePermissions();
  const queryClient = useQueryClient();
  const orgSlug = currentOrg?.slug;

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

  if (!currentOrg || !currentMember || !user) return null;
  // Phones use the bottom-sheet menu (components/dashboard/mobile); this sidebar is desktop-only.
  if (isMobile) return null;

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);

  const safeRole = isAccountant ? "Accountant" : isHOD ? "HOD" : isLibrarian ? "Librarian" : isClassTeacher ? "Class Teacher" : isSubjectTeacher ? "Subject Teacher" : (userRole || "member");

  return (
    <Sidebar variant="inset">
      {/* Unified account switcher — org + user in one dropdown */}
      <SidebarHeader className="p-0">
        <div className="px-4 pt-4 pb-3">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 transition-colors hover:bg-sidebar-accent">
                  <div className="relative shrink-0">
                    <Avatar className="h-9 w-9 rounded-xl">
                      <AvatarImage src={currentOrg.logo} alt={currentOrg.name} />
                      <AvatarFallback className="rounded-xl bg-blue-600 text-white font-semibold text-sm">
                        {getInitials(currentOrg.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-sidebar bg-white">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col text-left min-w-0">
                    <span className="text-sm font-semibold truncate text-sidebar-foreground capitalize">
                      {currentOrg.name}
                    </span>
                    <span className="text-[11px] text-sidebar-foreground/50 truncate capitalize">
                      {user.name.toLowerCase().endsWith(safeRole.toLowerCase()) ? user.name : `${user.name} · ${safeRole}`}
                    </span>
                  </div>
                  <ChevronUp className="h-4 w-4 shrink-0 text-sidebar-foreground/40 ml-2" />
                </button>
              }
            />
            <DropdownMenuContent align="start" className="w-[250px]">
              {/* Product Suite Switcher */}
              <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Hanoled Products
              </div>
              <DropdownMenuItem
                render={
                  <div className="flex items-center justify-between w-full py-1 px-1">
                    <div className="flex items-center gap-2">
                      <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-sm font-semibold text-slate-900">School Management</span>
                    </div>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full font-bold">Active</span>
                  </div>
                }
              />
              <DropdownMenuItem
                render={
                  <Link
                    href="/cbt/admin"
                    className="flex items-center justify-between w-full py-1 px-1 text-slate-600 hover:text-slate-900"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-2 w-2 rounded-full bg-purple-500" />
                      <span className="text-sm font-medium">CBT Exam Console</span>
                    </div>
                    <span className="text-[10px] border border-purple-200 bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">Switch</span>
                  </Link>
                }
              />
              <DropdownMenuItem
                render={
                  <Link
                    href="/welcome"
                    className="flex items-center justify-between w-full py-1 px-1 text-slate-600 hover:text-slate-900"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-2 w-2 rounded-full bg-blue-500" />
                      <span className="text-sm font-medium">Suite Welcome Hub</span>
                    </div>
                    <span className="text-[10px] border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full">Hub</span>
                  </Link>
                }
              />
              <DropdownMenuSeparator />

              {/* Org switching */}
              {organizations.length > 1 && (
                <>
                  <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Switch School
                  </div>
                  {organizations.map((org) => (
                    <DropdownMenuItem
                      key={org.id}
                      render={
                        <Link
                          href={`/dashboard/school/${org.slug}`}
                          className="flex items-center gap-3 w-full py-1"
                        >
                          <Avatar className="h-7 w-7 rounded-lg">
                            <AvatarImage src={org.logo} alt={org.name} />
                            <AvatarFallback className="rounded-lg bg-blue-600 text-[11px] text-white">
                              {getInitials(org.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium truncate capitalize">{org.name}</span>
                        </Link>
                      }
                    />
                  ))}
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem
                render={
                  <Link
                    href="/onboarding"
                    className="flex items-center gap-3 w-full py-1 text-blue-600"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-blue-200 bg-blue-50">
                      <School className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-sm font-medium">Create new school</span>
                  </Link>
                }
              />
              <DropdownMenuSeparator />
              {/* User section */}
              <div className="px-2 py-2">
                <div className="flex items-center gap-3 rounded-lg px-2 py-2">
                  <Avatar className="h-8 w-8 rounded-full">
                    <AvatarFallback className="bg-slate-100 text-slate-600 text-xs font-semibold">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium text-slate-900 truncate capitalize">
                      {user.name}
                    </span>
                    <span className="text-xs text-slate-500 truncate">
                      {user.email}
                    </span>
                  </div>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                className="text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="px-3 py-2">
        <SidebarMenu className="space-y-0.5">
          {visibleNavItems.map((item) => {
            const isActive =
              pathname === item.url || pathname.startsWith(`${item.url}/`);
            return (
              <SidebarMenuItem key={item.title} className="relative">
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-blue-600 z-10" />
                )}
                <SidebarMenuButton
                  render={
                    <Link
                      href={item.url}
                      onMouseEnter={() => prefetchRoute(item.url)}
                      onFocus={() => prefetchRoute(item.url)}
                    />
                  }
                  tooltip={item.title}
                  className={
                    isActive
                      ? "bg-blue-50/80 text-blue-700 font-medium"
                      : "text-sidebar-foreground/70"
                  }
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      {/* Spacer pushes nav up, logout lives in the dropdown */}
    </Sidebar>
  );
}
