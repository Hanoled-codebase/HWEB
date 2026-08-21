"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  Menu,
  Bell,
  X,
  LayoutDashboard,
  FileText,
  Clock,
  CalendarDays,
  BookMarked,
  DollarSign,
  Home,
  MoreHorizontal,
  ChevronDown,
  LogOut,
  GraduationCap,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationSheet } from "@/components/dashboard/NotificationSheet";
import { HanoledLogo } from "@/components/ui/HanoledLogo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type StudentMobileLayoutProps = {
  children: React.ReactNode;
};

export function StudentMobileLayout({ children }: StudentMobileLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentOrg, currentStudent, organizations, setCurrentOrg } = useOrganization();
  const { user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer on pathname change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  if (!currentOrg || !user) return <div className="min-h-screen bg-slate-50" />;

  const baseUrl = `/dashboard/school/${currentOrg.slug}`;

  // Drawer menu items matching image 1
  const menuItems = [
    { title: "Dashboard", url: baseUrl, icon: LayoutDashboard },
    { title: "My Results", url: `${baseUrl}/student/results`, icon: FileText },
    { title: "Pending Exams", url: `${baseUrl}/student/pending`, icon: Clock },
    { title: "Timetable", url: `${baseUrl}/student/timetable`, icon: CalendarDays },
    { title: "Library", url: `${baseUrl}/student/library`, icon: BookMarked },
    { title: "Invoices", url: `${baseUrl}/student/invoices`, icon: DollarSign },
  ];

  // Bottom Navigation tabs matching image 2 & 3
  const bottomTabs = [
    { key: "home", label: "Home", icon: Home, url: baseUrl },
    { key: "results", label: "Results", icon: FileText, url: `${baseUrl}/student/results` },
    { key: "exams", label: "Exams", icon: Clock, url: `${baseUrl}/student/pending` },
    { key: "timetable", label: "Timetable", icon: CalendarDays, url: `${baseUrl}/student/timetable` },
    { key: "more", label: "More", icon: MoreHorizontal, url: "#" },
  ];

  // Determine which bottom tab is active
  const getActiveTab = () => {
    if (pathname === baseUrl) return "home";
    if (pathname.includes("/student/results")) return "results";
    if (pathname.includes("/student/pending")) return "exams";
    if (pathname.includes("/student/timetable")) return "timetable";
    return "";
  };

  const activeTab = getActiveTab();

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);

  const studentName = currentStudent
    ? `${currentStudent.firstName} ${currentStudent.lastName}`
    : user.name;

  const classLevelName = currentStudent?.classLevel?.name || "No Class";
  const admissionNumber = currentStudent?.admissionNumber || "No ID";

  const handleTabClick = (tabKey: string, tabUrl: string) => {
    if (tabKey === "more") {
      setDrawerOpen(true);
    } else {
      router.push(tabUrl);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 relative pb-20 md:pb-0">
      {/* Top Header Bar on Mobile */}
      <header className="sticky top-0 z-30 flex md:hidden h-14 items-center justify-between bg-[#f5f5f7] px-4">
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm cursor-pointer"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <HanoledLogo size="sm" href="/" />

        <div className="flex items-center gap-2">
          <NotificationSheet />
          
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-800 border border-slate-200">
            {user.name ? getInitials(user.name)[0] : "E"}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1400px]">
          {children}
        </div>
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-white/95 backdrop-blur-md pb-safe md:hidden">
        <div className="flex items-end justify-around px-2 pt-2 pb-3">
          {bottomTabs.map((tab) => {
            const isActive = activeTab === tab.key;
            const Icon = tab.icon;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabClick(tab.key, tab.url)}
                className="flex flex-col items-center cursor-pointer"
              >
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={cn(
                      "flex items-center justify-center rounded-xl px-3 py-1.5 transition-colors",
                      isActive && "bg-[#EEF0FF]"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5",
                        isActive ? "text-[#1447E6]" : "text-slate-400"
                      )}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-medium",
                      isActive ? "text-[#1447E6]" : "text-slate-400"
                    )}
                  >
                    {tab.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Sidebar Navigation Drawer (Image 1) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300"
          />

          {/* Drawer Content Panel */}
          <div className="absolute inset-y-0 left-0 w-[290px] max-w-[85vw] bg-white shadow-2xl flex flex-col justify-between transform translate-x-0 transition-transform duration-300 ease-in-out border-r border-slate-100">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                  <GraduationCap className="h-6 w-6" />
                </div>
                
                <div className="flex flex-col">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="flex items-center gap-1 font-bold text-slate-900 text-base capitalize text-left focus:outline-none cursor-pointer">
                      {currentOrg.name} <ChevronDown className="h-4 w-4 text-slate-400" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[200px] z-50">
                      <DropdownMenuLabel className="text-xs text-slate-500">
                        Switch School
                      </DropdownMenuLabel>
                      {organizations.map((org) => (
                        <DropdownMenuItem
                          key={org.id}
                          onClick={() => {
                            void setCurrentOrg(org.slug);
                            router.push(`/dashboard/school/${org.slug}`);
                            setDrawerOpen(false);
                          }}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Avatar className="h-6 w-6 rounded-sm">
                            <AvatarImage src={org.logo} alt={org.name} />
                            <AvatarFallback className="rounded-sm bg-indigo-600 text-[11px] text-white">
                              {getInitials(org.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate capitalize text-sm">{org.name}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <span className="text-xs text-slate-400 font-medium">Student</span>
                </div>
              </div>

              <button
                onClick={() => setDrawerOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Navigation List */}
            <div className="flex-1 py-4 px-3 overflow-y-auto space-y-1.5">
              {menuItems.map((item) => {
                const isActive = pathname === item.url || (item.url !== baseUrl && pathname.startsWith(item.url));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.title}
                    href={item.url}
                    onClick={() => setDrawerOpen(false)}
                    className={cn(
                      "flex items-center gap-3.5 px-4 py-3.5 rounded-xl font-semibold text-sm transition-colors",
                      isActive
                        ? "bg-indigo-50/80 text-indigo-600"
                        : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <Icon className={cn("h-5 w-5", isActive ? "text-indigo-600" : "text-slate-400")} />
                    <span>{item.title}</span>
                  </Link>
                );
              })}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3">
              {/* Row 1: Student info */}
              <div className="flex items-center gap-3 px-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900 truncate capitalize">
                    {studentName}
                  </p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {classLevelName} · {admissionNumber}
                  </p>
                </div>
              </div>

              {/* Row 2: User email & Logout trigger */}
              <DropdownMenu>
                <DropdownMenuTrigger className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-100/70 border border-slate-200/50 bg-white transition-colors cursor-pointer text-left focus:outline-none">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs shrink-0">
                      {user.name ? getInitials(user.name)[0] : "E"}
                    </div>
                    <span className="text-xs font-semibold text-slate-600 truncate max-w-[150px]">
                      {user.email}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="top" className="w-[200px] mb-2 z-50">
                  <DropdownMenuLabel className="font-normal text-xs text-slate-500">
                    My Account
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      setDrawerOpen(false);
                      void logout();
                    }}
                    className="text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span className="text-sm font-semibold">Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
