"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationSheet } from "@/components/dashboard/NotificationSheet";
import { HanoledLogo } from "@/components/ui/HanoledLogo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bell,
  Menu,
  X,
  LayoutGrid,
  GraduationCap,
  UserRound,
  UserPlus,
  Building2,
  ClipboardList,
  ClipboardCheck,
  BookOpen,
  BookMarked,
  HelpCircle,
  FileText,
  Table2,
  Wallet,
  MessageSquare,
  CalendarDays,
  Heart,
  Briefcase,
  CreditCard,
  Receipt,
  Ticket,
  Landmark,
  AlertCircle,
  NotebookPen,
  Library,
  BedDouble,
  Bus,
  LifeBuoy,
  MoreHorizontal,
  Home,
  Settings,
  ChevronRight,
  Award,
  Users,
  ChevronDown,
  Stethoscope,
  Clock,
  Banknote,
} from "lucide-react";

type NavItem = { key: string; label: string; icon: React.ElementType; href: string };
type NavSection = { title: string; items: NavItem[] };

type StatItem = {
  label: string;
  value: string | number;
  icon: React.ElementType;
  dark?: boolean;
  href?: string;
};

export function AdminMobileDashboard({
  slug,
  stats,
  org = { name: "" },
}: {
  slug: string;
  stats: StatItem[];
  org?: { name: string; category?: string; type?: string; subscription?: { status?: string; plan?: string } };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentOrg, organizations, setCurrentOrg } = useOrganization();
  const { user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const base = `/dashboard/school/${slug}`;

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "AD";

  const firstName = user?.name?.split(" ")[0] || "Admin";
  const role = (currentOrg as any)?.currentMember?.role || "Owner";

  const navSections: NavSection[] = [
    {
      title: "OVERVIEW",
      items: [
        { key: "overview", label: "Overview", icon: LayoutGrid, href: base },
      ],
    },
    {
      title: "ACADEMICS",
      items: [
        { key: "students", label: "Students", icon: GraduationCap, href: `${base}/students` },
        { key: "results", label: "Results", icon: Award, href: `${base}/results` },
        { key: "classes", label: "Classes", icon: Building2, href: `${base}/classes` },
        { key: "subjects", label: "Subjects", icon: BookOpen, href: `${base}/subjects` },
        { key: "spreadsheets", label: "Spreadsheets", icon: Table2, href: `${base}/spreadsheets` },
        { key: "timetable", label: "Timetable", icon: CalendarDays, href: `${base}/timetable` },
        { key: "attendance", label: "Attendance", icon: ClipboardCheck, href: `${base}/attendance` },
        { key: "affective", label: "Affective", icon: Heart, href: `${base}/affective` },
        { key: "scheme-of-work", label: "Scheme of Work", icon: NotebookPen, href: `${base}/scheme-of-work` },
        { key: "lesson-notes", label: "Lesson Notes", icon: FileText, href: `${base}/lesson-notes` },
        { key: "question-bank", label: "Question Bank", icon: HelpCircle, href: `${base}/question-bank` },
        { key: "result-templates", label: "Result Templates", icon: ClipboardList, href: `${base}/result-templates` },
        { key: "admissions", label: "Admissions", icon: UserPlus, href: `${base}/admissions` },
        { key: "homework", label: "Homework", icon: BookMarked, href: `${base}/homework` },
      ],
    },
    {
      title: "PEOPLE",
      items: [
        { key: "teachers", label: "Teachers", icon: UserRound, href: `${base}/teachers` },
        { key: "parents", label: "Parents", icon: Users, href: `${base}/parents` },
        { key: "hr", label: "HR", icon: Briefcase, href: `${base}/hr` },
        { key: "invites", label: "Pending Invites", icon: UserPlus, href: `${base}/invites` },
        { key: "messaging", label: "Messaging", icon: MessageSquare, href: `${base}/messaging` },
      ],
    },
    {
      title: "FINANCE",
      items: [
        { key: "payments", label: "Payments", icon: Wallet, href: `${base}/payments` },
        { key: "billing", label: "Billing", icon: CreditCard, href: `${base}/billing` },
        { key: "fee-structure", label: "Fee Structure", icon: Landmark, href: `${base}/fee-structure` },
        { key: "invoices", label: "Invoices", icon: Receipt, href: `${base}/invoices` },
        { key: "scratch-cards", label: "Scratch Cards", icon: Ticket, href: `${base}/scratch-cards` },
        { key: "debt", label: "Debt Profile", icon: AlertCircle, href: `${base}/debt` },
        { key: "payroll", label: "Payroll", icon: Banknote, href: `${base}/payroll` },
      ],
    },
    {
      title: "OPERATIONS",
      items: [
        { key: "hostel", label: "Hostel", icon: BedDouble, href: `${base}/hostel` },
        { key: "bus-tracking", label: "Bus Routes", icon: Bus, href: `${base}/bus-tracking` },
        { key: "library", label: "Library", icon: Library, href: `${base}/library` },
        { key: "clinic", label: "Clinic Log", icon: Stethoscope, href: `${base}/clinic` },
        { key: "staff-attendance", label: "Staff Attendance", icon: Clock, href: `${base}/staff-attendance` },
        { key: "support", label: "Support", icon: LifeBuoy, href: `${base}/support` },
      ],
    },
    {
      title: "SYSTEM",
      items: [
        { key: "settings", label: "Settings", icon: Settings, href: `${base}/settings` },
      ],
    },
  ];

  const quickLinks = [
    { label: "Grades", icon: ClipboardList, href: `${base}/spreadsheets` },
    { label: "Classes", icon: Building2, href: `${base}/classes` },
    { label: "Attendance", icon: ClipboardCheck, href: `${base}/attendance` },
    { label: "Fees", icon: Wallet, href: `${base}/payments` },
    { label: "Messages", icon: MessageSquare, href: `${base}/messaging` },
    { label: "More", icon: MoreHorizontal, href: `${base}/settings` },
  ];

  const bottomTabs = [
    { key: "home", label: "Home", icon: Home, href: base, exact: true },
    { key: "students", label: "Students", icon: GraduationCap, href: `${base}/students`, exact: false },
    { key: "classes", label: "Classes", icon: Building2, href: `${base}/classes`, exact: false },
    { key: "messages", label: "Messages", icon: MessageSquare, href: `${base}/messaging`, exact: false },
    { key: "more", label: "More", icon: MoreHorizontal, href: null, exact: false, action: () => setDrawerOpen(true) },
  ];

  return (
    <div className="relative min-h-screen bg-[#f5f5f7] pb-24">
   
      <header className="flex h-14 items-center justify-between bg-[#f5f5f7] px-4">
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm"
          aria-label="Open menu"
        >
          <Menu className="h-4.5 w-4.5" />
        </button>

        <HanoledLogo size="sm" href="/" />

        <NotificationSheet />
      </header>

      <div className="px-4 space-y-4">
       
        <div className="relative overflow-hidden rounded-2xl bg-[#1447E6] p-5 shadow-md">
        
          <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute right-6 top-6 h-20 w-20 rounded-full bg-white/10" />

          <div className="relative flex items-start justify-between">
            <div className="flex-1">
              <p className="text-[13px] font-medium text-white/80">Welcome back</p>
              <h1 className="mt-0.5 text-3xl font-bold text-white leading-tight">{firstName}</h1>
              <p className="mt-1 text-[12px] text-white/70">Here&apos;s what&apos;s happening today</p>
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Active
                <span className="text-white/50">·</span>
                <span className="capitalize">{org?.category || "Secondary"}</span>
                <span className="text-white/50">·</span>
                <span className="capitalize">{org?.subscription?.plan || "Free"} plan</span>
              </div>
            </div>

          
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/25 text-base font-bold text-white">
              {initials}
            </div>
          </div>
        </div>

       
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat) => {
            const Icon = stat.icon;
            if (stat.dark) {
              return (
                <Link
                  key={stat.label}
                  href={stat.href || base}
                  className="group flex items-center gap-3 rounded-xl bg-[#181B2E] p-3 shadow-sm"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold leading-tight text-white">{stat.label}</p>
                    <p className="truncate text-xs font-medium text-white/50">{stat.value}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-white/40 transition-colors group-hover:text-white/70" />
                </Link>
              );
            }
            return (
              <div
                key={stat.label}
                className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                  <Icon className="h-4 w-4 text-slate-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">{stat.value}</p>
                  <p className="truncate text-[10px] font-medium text-slate-400">{stat.label}</p>
                </div>
              </div>
            );
          })}
        </div>

       
        <div>
          <p className="mb-3 text-[16px] font-bold text-slate-900">Quick links</p>
          <div className="grid grid-cols-3 gap-3">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className="flex flex-col items-center gap-1.5 rounded-xl bg-white py-2.5 shadow-sm hover:bg-slate-50 transition-colors"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                    <Icon className="h-4 w-4 text-slate-500" />
                  </div>
                  <span className="text-[10px] font-medium text-slate-600">{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/80 bg-white/96 backdrop-blur-lg">
        <div className="flex items-end justify-around px-2 pt-2 pb-safe-or-3">
          {bottomTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.exact
              ? pathname === tab.href
              : tab.href
              ? pathname.startsWith(tab.href!)
              : false;
            const content = (
              <div className="flex flex-col items-center gap-1">
                <div className={`flex items-center justify-center rounded-xl px-3 py-1.5 transition-colors ${isActive ? "bg-[#EEF0FF]" : ""}`}>
                  <Icon className={`h-5 w-5 ${isActive ? "text-[#1447E6]" : "text-slate-400"}`} />
                </div>
                <span className={`text-[10px] font-medium ${isActive ? "text-[#1447E6]" : "text-slate-400"}`}>
                  {tab.label}
                </span>
              </div>
            );

            if (tab.action) {
              return (
                <button key={tab.key} onClick={tab.action} className="flex flex-col items-center">
                  {content}
                </button>
              );
            }
            return (
              <Link key={tab.key} href={tab.href!} className="flex flex-col items-center">
                {content}
              </Link>
            );
          })}
        </div>
      </nav>

      
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
       
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />

          
          <div className="relative flex h-full w-[84vw] max-w-[320px] flex-col bg-white shadow-2xl overflow-hidden">
          
            <div className="flex items-center gap-3 px-5 pt-6 pb-5">
         
              <DropdownMenu>
                <DropdownMenuTrigger className="flex flex-1 min-w-0 items-center gap-3 text-left focus:outline-none">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1447E6]">
                    <GraduationCap className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-[15px] font-bold text-slate-900 truncate capitalize">{firstName}</span>
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    </div>
                    <p className="text-[12px] text-slate-400 truncate capitalize">{firstName} Owner</p>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[240px] z-[60]">
                  <DropdownMenuLabel className="text-xs text-slate-500">
                    Switch School
                  </DropdownMenuLabel>
                  {organizations.map((orgItem) => (
                    <DropdownMenuItem
                      key={orgItem.id}
                      className="flex cursor-pointer items-center gap-3 py-2"
                      onClick={() => {
                        setCurrentOrg(orgItem.slug);
                        router.push(`/dashboard/school/${orgItem.slug}`);
                        setDrawerOpen(false);
                      }}
                    >
                      <Avatar className="h-8 w-8 rounded-lg">
                        <AvatarImage src={orgItem.logo} alt={orgItem.name} />
                        <AvatarFallback className="rounded-lg bg-indigo-100 text-indigo-700">
                          {orgItem.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-slate-900 truncate">{orgItem.name}</span>
                        <span className="text-xs text-slate-500 capitalize truncate">{orgItem.category || "School"}</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
             
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

           
            <div className="flex-1 overflow-y-auto px-4 pb-6">
              {navSections.map((section) => (
                <div key={section.title} className="mb-4">
                  <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    {section.title}
                  </p>
                  <div className="space-y-0.5">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive =
                        item.href === base
                          ? pathname === base
                          : pathname.startsWith(item.href);
                      return (
                        <Link
                          key={item.key}
                          href={item.href}
                          onClick={() => setDrawerOpen(false)}
                          className={`flex items-center gap-3 rounded-xl px-3 py-3 transition-colors ${
                            isActive
                              ? "bg-[#EEF0FF] text-[#1447E6]"
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? "text-[#1447E6]" : "text-slate-500"}`} />
                          <span className={`text-[14px] font-medium ${isActive ? "text-[#1447E6] font-semibold" : ""}`}>
                            {item.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

         
          <div className="flex flex-col items-end pt-6 pr-4 flex-1">
            <button className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 ring-1 ring-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
