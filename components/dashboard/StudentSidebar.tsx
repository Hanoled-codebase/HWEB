"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  FileText,
  Clock,
  CalendarDays,
  LogOut,
  ChevronUp,
  School,
  GraduationCap,
  BookMarked,
  DollarSign,
} from "lucide-react";

export function StudentSidebar() {
  const pathname = usePathname();
  const { currentOrg, currentStudent, organizations } = useOrganization();
  const { user, logout } = useAuth();

  if (!currentOrg || !user) {
    return (
      <Sidebar>
        <SidebarHeader className="h-16" />
        <SidebarContent />
      </Sidebar>
    );
  }

  const baseUrl = `/dashboard/school/${currentOrg.slug}`;

  const navItems = [
    { title: "Dashboard", url: baseUrl, icon: LayoutDashboard },
    { title: "My Results", url: `${baseUrl}/student/results`, icon: FileText },
    { title: "Pending Exams", url: `${baseUrl}/student/pending`, icon: Clock },
    { title: "Timetable", url: `${baseUrl}/student/timetable`, icon: CalendarDays },
    { title: "Library", url: `${baseUrl}/student/library`, icon: BookMarked },
    { title: "Invoices", url: `${baseUrl}/student/invoices`, icon: DollarSign },
  ];

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);

  return (
    <Sidebar variant="inset">
      <SidebarHeader className="border-b border-sidebar-border py-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton size="lg" className="w-full justify-between px-3.5">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <Avatar className="h-8 w-8 rounded-lg shrink-0">
                        <AvatarImage src={currentOrg.logo} alt={currentOrg.name} />
                        <AvatarFallback className="rounded-lg bg-blue-600 text-white font-semibold">
                          {getInitials(currentOrg.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col gap-0.5 leading-none min-w-0 flex-1">
                        <span className="font-semibold text-sm truncate capitalize">
                          {currentOrg.name}
                        </span>
                        <span className="text-xs text-sidebar-foreground/70 truncate">
                          Student
                        </span>
                      </div>
                    </div>
                    <ChevronUp className="h-4 w-4 opacity-50 shrink-0 ml-2" />
                  </SidebarMenuButton>
                }
              />
              <DropdownMenuContent align="start" className="w-[240px]">
                <DropdownMenuLabel className="text-xs text-slate-500">
                  Switch School
                </DropdownMenuLabel>
                {organizations.map((org) => (
                  <DropdownMenuItem
                    key={org.id}
                    render={
                      <Link
                        href={`/dashboard/school/${org.slug}`}
                        className="flex items-center gap-2 w-full"
                      >
                        <Avatar className="h-6 w-6 rounded-sm">
                          <AvatarImage src={org.logo} alt={org.name} />
                          <AvatarFallback className="rounded-sm bg-blue-600 text-[11px] text-white">
                            {getInitials(org.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate capitalize">{org.name}</span>
                      </Link>
                    }
                  />
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4 gap-1">
        <SidebarMenu>
          {navItems.map((item) => {
            const isActive = pathname === item.url || pathname.startsWith(`${item.url}/`);
            return (
              <SidebarMenuItem key={item.title} className="relative">
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-blue-600 z-10" />
                )}
                <SidebarMenuButton
                  render={<Link href={item.url} />}
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

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 px-2 mb-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700 shrink-0">
            <GraduationCap className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-sidebar-foreground truncate capitalize">
              {currentStudent ? `${currentStudent.firstName} ${currentStudent.lastName}` : user.name}
            </p>
            {currentStudent?.classLevel && (
              <p className="text-xs text-sidebar-foreground/60 truncate">
                {currentStudent.classLevel.name}
                {currentStudent.admissionNumber && ` · ${currentStudent.admissionNumber}`}
              </p>
            )}
          </div>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton size="lg" className="w-full justify-between px-3.5 hover:bg-sidebar-accent">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <Avatar className="h-7 w-7 rounded-full border border-sidebar-border shrink-0">
                        <AvatarFallback className="bg-slate-100 text-slate-800 text-xs font-medium">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col gap-0.5 leading-none min-w-0 flex-1">
                        <span className="text-xs text-sidebar-foreground/70 truncate">
                          {user.email}
                        </span>
                      </div>
                    </div>
                    <ChevronUp className="h-4 w-4 opacity-50 shrink-0 ml-2" />
                  </SidebarMenuButton>
                }
              />
              <DropdownMenuContent align="end" side="top" className="w-[240px] mb-2">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none capitalize">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
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
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}