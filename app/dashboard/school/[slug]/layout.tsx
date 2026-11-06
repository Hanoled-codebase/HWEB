"use client";

import { useRef, useEffect, useState } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { StudentSidebar } from "@/components/dashboard/StudentSidebar";
import { HanoledLoader } from "@/components/ui/hanoled-loader";

import { toast } from "sonner";
import { Menu, ShieldAlert } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";

import { StudentMobileFrame, StudentMobileTopBar } from "@/components/dashboard/StudentMobileFrame";
import { StaffRouteGuard } from "@/components/dashboard/StaffRouteGuard";
import { NotificationSheet } from "@/components/dashboard/NotificationSheet";
import { MobileMenuProvider } from "@/components/dashboard/mobile/MobileMenuProvider";
import { MobileTopBar } from "@/components/dashboard/mobile/MobileTopBar";
import { MobileTabBar } from "@/components/dashboard/mobile/MobileTabBar";
import { useStaffMobileConfig } from "@/components/dashboard/mobile/mobile-config";
import { SchoolThemeProvider } from "@/components/providers/SchoolThemeProvider";

function isUuidLike(segment: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(segment) || /^[0-9a-f]{20,}$/i.test(segment);
}

function isNumericSegment(segment: string) {
  return /^\d+$/.test(segment);
}

function getPageTitle(pathname: string, slug: string) {
  const parts = pathname.split("/").filter(Boolean);
  const lastPart = parts[parts.length - 1];
  if (lastPart === slug) return "Overview";

  const titleMap: Record<string, string> = {
    classes: "Classes",
    students: "Students",
    teachers: "Teachers",
    subjects: "Subjects",
    spreadsheets: "Spreadsheets",
    timetable: "Timetable",
    attendance: "Attendance",
    affective: "Affective Records",
    hr: "Human Resources",
    parents: "Parents",
    invites: "Pending Invites",
    billing: "Billing & Plans",
    // SCRATCH_CARD_PARKED — title map entry (page is gated "coming soon" for the MVP launch).
    // "scratch-cards": "Scratch Cards",
    invoices: "Invoices",
    homework: "Homework",
    support: "Support",
    library: "Library",
    hostel: "Hostel",
    "bus-tracking": "Bus Routes",
    payments: "Payments",
    "fee-structure": "Fee Structure",
    debt: "Debt Profile",
    "result-templates": "Result Templates",
    "scheme-of-work": "Scheme of Work",
    "lesson-notes": "Lesson Notes",
    "question-bank": "Question Bank",
    admissions: "Admissions",
    // MESSAGING_PARKED — title map entry (page is gated "coming soon" for the MVP launch).
    // messaging: "Messaging",
    settings: "Settings",
    features: "Features",
    new: "Add Student",
    edit: "Edit Student",
    assessment: "Assessment",
    clinic: "Clinic Log",
    "staff-attendance": "Staff Attendance",
    payroll: "Payroll",
    record: "Record Payment",
    access: "Staff Access",
    desk: "Library Desk",
  };

  // If the last part is a known name, use it directly
  if (titleMap[lastPart]) {
    return titleMap[lastPart];
  }

  // If the last segment is a UUID or number, look at the context from parent segments
  if (isUuidLike(lastPart) || isNumericSegment(lastPart)) {
    // Walk backwards through the path to find the parent context
    const contextMap: Record<string, string> = {
      students: "Student Record",
      subjects: "Subject Details",
      classes: "Class Details",
      spreadsheets: "Spreadsheet",
      assessment: "Assessment",
      teachers: "Teacher Profile",
      parents: "Parent Profile",
      invoices: "Invoice",
      homework: "Homework",
      "result-templates": "Result Template",
      "scheme-of-work": "Scheme of Work",
      "lesson-notes": "Lesson Note",
      "question-bank": "Question",
    };

    // Search backwards to find the nearest known context segment
    for (let i = parts.length - 2; i >= 0; i--) {
      if (contextMap[parts[i]]) {
        return contextMap[parts[i]];
      }
    }

    // Fallback: if we can't determine context, show a generic title
    return "Details";
  }

  return lastPart.charAt(0).toUpperCase() + lastPart.slice(1);
}

/**
 * Phone chrome for every staff and parent role: one top bar, one role-tuned tab
 * bar, one menu sheet. Built from the same permission-filtered nav as the
 * desktop sidebar, so a role never sees a destination it cannot open.
 * Desktop (md and up) is untouched: everything here is md:hidden.
 */
function StaffMobileFrame({ children }: { children: React.ReactNode }) {
  const config = useStaffMobileConfig();
  if (!config) return <>{children}</>;
  return <MobileMenuProvider config={config}>{children}</MobileMenuProvider>;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const pathname = usePathname();
  const { currentOrg, currentMember, isStudent, setCurrentOrg, isLoading, error } =
    useOrganization();
  const {
    user,
    checkAuth,
    isInitialized,
    isLoading: authLoading,
    logout,
  } = useAuth();
  // Slug whose org load has finished. Set only from the async completion (never
  // synchronously in an effect); "still initializing" is derived below.
  const [initializedSlug, setInitializedSlug] = useState<string | null>(null);
  const lastLoadedSlug = useRef<string | null>(null);
  // Tablet nav drawer (md to lg). Remembering the page it was opened on closes
  // it on navigation without an effect; rotating past lg closes it too.
  const [navOpenedOn, setNavOpenedOn] = useState<string | null>(null);
  const navOpen = navOpenedOn === pathname;
  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1024px)");
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) setNavOpenedOn(null);
    };
    wide.addEventListener("change", onChange);
    return () => wide.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!isInitialized && !authLoading) {
      void checkAuth();
    }
  }, [authLoading, checkAuth, isInitialized]);

  useEffect(() => {
    if (isInitialized && !authLoading && !user) {
      void logout();
    }
  }, [authLoading, isInitialized, logout, user]);

  // Load the org context in parallel with checkAuth (/v1/me). Neither needs
  // the other's result (both authenticate via the bearer token), so waiting
  // for auth first added a full serial round trip to every cold load. See
  // fast-rendering skill, Rule 2.
  useEffect(() => {
    if (!slug || lastLoadedSlug.current === slug) return;
    lastLoadedSlug.current = slug;

    if (currentOrg && currentOrg.slug === slug) return;

    setCurrentOrg(slug)
      .catch(() => {
        toast.error("Error loading organization. You might not have access.");
      })
      .finally(() => setInitializedSlug(slug));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const isInitializing =
    !!slug && initializedSlug !== slug && !(currentOrg && currentOrg.slug === slug);

  if (isInitializing || authLoading || !isInitialized || (slug && isLoading)) {
    return <HanoledLoader />;
  }

  if (slug && error) {
    return (
      <div className="absolute inset-0 z-[100] flex min-h-[100dvh] w-full flex-col items-center justify-center bg-slate-50 p-4 text-center sm:p-6">
        <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
            <ShieldAlert className="h-7 w-7" aria-hidden="true" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-slate-900">You can&apos;t open this school</h2>
          <p className="mb-8 text-sm leading-relaxed text-slate-600">
            This account isn&apos;t a member of it, or the school link is wrong. Pick one of your schools, or sign in with the account the school invited.
          </p>
          <div className="grid gap-2">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="min-h-12 w-full rounded-xl bg-blue-600 px-4 font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Go to my schools
            </button>
            <button
              type="button"
              onClick={() => void logout()}
              className="min-h-12 w-full rounded-xl border border-slate-200 px-4 font-semibold text-slate-800 transition-colors hover:bg-slate-50"
            >
              Sign in with another account
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentOrg || !user) return null;

  // Student shell: one copy of the page for every width. The phone bars are
  // md:hidden and the desktop header hidden below md, like the staff shell.
  // Rendering children once per shell mounted every student page twice and
  // doubled its API calls.
  if (isStudent) {
    return (
      <SchoolThemeProvider>
        <TooltipProvider>
          <SidebarProvider>
            <StudentSidebar />
            <SidebarInset className="bg-slate-50 flex flex-col min-h-screen relative md:overflow-x-hidden">
              <StudentMobileFrame>
                {/* Desktop top bar */}
                <header className="sticky top-0 z-10 hidden h-14 shrink-0 items-center border-b bg-white/85 backdrop-blur-md px-6 md:flex">
                  <div className="flex w-full items-center justify-between">
                    <div className="flex items-center gap-2">
                      <SidebarTrigger className="-ml-1 text-slate-500 hover:text-slate-800" />
                    </div>
                    <div className="flex items-center gap-3">
                      <NotificationSheet />
                    </div>
                  </div>
                </header>

                <StudentMobileTopBar />

                {/* pb-safe-nav (tab bar clearance) is plain CSS that outranks Tailwind padding, so desktop needs ! to drop it. */}
                <main className="flex-1 px-4 pt-4 pb-safe-nav md:overflow-y-auto md:p-6 md:!pb-6 lg:p-8 lg:!pb-8">
                  <div key={pathname} className="m-page mx-auto w-full max-w-[1400px]">
                    {children}
                  </div>
                </main>

                <MobileTabBar />
              </StudentMobileFrame>
            </SidebarInset>
          </SidebarProvider>
        </TooltipProvider>
      </SchoolThemeProvider>
    );
  }

  const isHome = pathname === `/dashboard/school/${slug}`;

  return (
    <SchoolThemeProvider>
      <TooltipProvider>
        <SidebarProvider>
          <AppSidebar drawerOpen={navOpen} onDrawerOpenChange={(open) => setNavOpenedOn(open ? pathname : null)} />
          {/* overflow-x-clip, not hidden: hidden makes this a scroll container and breaks position:sticky in pages. */}
          <div className="relative flex min-h-svh min-w-0 flex-1 flex-col overflow-x-clip bg-slate-50">
            <StaffMobileFrame>
              {/* Tablet and desktop top bar (phones use MobileTopBar). Below lg it opens the nav drawer. */}
              <header className="sticky top-0 z-10 hidden items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2.5 md:flex lg:px-8 lg:py-4">
                <div className="flex min-w-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setNavOpenedOn(pathname)}
                    aria-label="Open navigation"
                    aria-expanded={navOpen}
                    className="-ml-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-700 transition-colors hover:bg-slate-100 lg:hidden"
                  >
                    <Menu className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <span className="truncate text-sm font-semibold capitalize text-slate-900 lg:hidden">{currentOrg.name}</span>
                  <span className="hidden whitespace-nowrap text-sm font-medium text-slate-600 lg:inline">School Operations Dashboard</span>
                </div>
                <div className="flex shrink-0 items-center gap-2 lg:gap-3">
                  {currentMember?.role !== "parent" && (
                    <a
                      href={`/cbt/admin?orgSlug=${encodeURIComponent(slug)}`}
                      className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100 pointer-coarse:min-h-11"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                      CBT Console
                    </a>
                  )}
                  <a
                    href="/welcome"
                    className="flex items-center whitespace-nowrap rounded-full border border-slate-200 px-4 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 pointer-coarse:min-h-11"
                  >
                    Suite Hub
                  </a>
                  <NotificationSheet />
                </div>
              </header>

              <MobileTopBar title={getPageTitle(pathname, slug)} isHome={isHome} />

              <main className="min-w-0 flex-1 px-4 pt-4 pb-safe-nav md:overflow-y-auto md:p-6 md:pb-6 lg:p-8">
                <div key={pathname} className="m-page mx-auto w-full max-w-[1400px]">
                  <StaffRouteGuard slug={slug}>
                    {children}
                  </StaffRouteGuard>
                </div>
              </main>

              <MobileTabBar />
            </StaffMobileFrame>
          </div>
        </SidebarProvider>
      </TooltipProvider>
    </SchoolThemeProvider>
  );
}
