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
import { TooltipProvider } from "@/components/ui/tooltip";

import { StudentMobileLayout } from "@/components/dashboard/StudentMobileLayout";
import { StaffRouteGuard } from "@/components/dashboard/StaffRouteGuard";
import { NotificationSheet } from "@/components/dashboard/NotificationSheet";
import { MobileMenuProvider } from "@/components/dashboard/mobile/MobileMenuProvider";
import { MobileTopBar } from "@/components/dashboard/mobile/MobileTopBar";
import { MobileTabBar } from "@/components/dashboard/mobile/MobileTabBar";
import { useStaffMobileConfig } from "@/components/dashboard/mobile/mobile-config";

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
    "scratch-cards": "Scratch Cards",
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
    messaging: "Messaging",
    settings: "Settings",
    features: "Features Settings",
    assessment: "Assessment",
    clinic: "Clinic Log",
    "staff-attendance": "Staff Attendance",
    payroll: "Payroll",
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
    if (error === "User is not linked to a student profile") {
      router.replace("/signin");
      return null;
    }

    return (
      <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-slate-50 p-6 text-center absolute inset-0 z-[100]">
        <div className="bg-white p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 max-w-md w-full min-w-[300px] mx-auto relative overflow-hidden">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 mb-5">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-sm text-slate-500 mb-8 leading-relaxed">
            We couldn&apos;t load this organization. You may not have access to it or it doesn&apos;t exist.
          </p>
          <button 
            onClick={() => router.push("/onboarding")}
            className="w-full py-2.5 px-4 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors shadow-sm"
          >
            Create a new school
          </button>
        </div>
      </div>
    );
  }

  if (!currentOrg || !user) return null;

  // Dedicated split layout for Student profile
  if (isStudent) {
    return (
      <TooltipProvider>
        {/* Mobile student view */}
        <div className="md:hidden">
          <StudentMobileLayout>
            {children}
          </StudentMobileLayout>
        </div>
        {/* Desktop student view */}
        <div className="hidden md:block">
          <SidebarProvider>
            <StudentSidebar />
            <SidebarInset className="bg-slate-50 flex flex-col min-h-screen relative overflow-x-hidden">
              <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center border-b bg-white/85 backdrop-blur-md px-6">
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SidebarTrigger className="-ml-1 text-slate-500 hover:text-slate-800" />
                  </div>
                  <div className="flex items-center gap-3">
                    <NotificationSheet />
                  </div>
                </div>
              </header>
              <main className="flex-1 overflow-y-auto p-6 lg:p-8">
                <div className="mx-auto w-full max-w-[1400px]">
                  {children}
                </div>
              </main>
            </SidebarInset>
          </SidebarProvider>
        </div>
      </TooltipProvider>
    );
  }

  const isHome = pathname === `/dashboard/school/${slug}`;

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <div className="relative flex min-h-svh min-w-0 flex-1 flex-col overflow-x-hidden bg-slate-50">
          <StaffMobileFrame>
            {/* Desktop top bar */}
            <header className="sticky top-0 z-10 hidden items-center justify-between border-b border-slate-200 bg-white px-8 py-4 md:flex">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="font-medium">School Operations Dashboard</span>
              </div>
              <div className="flex items-center gap-3">
                {currentMember?.role !== "parent" && (
                  <a
                    href="/cbt/admin"
                    className="flex items-center gap-1.5 rounded-full bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                    CBT Console
                  </a>
                )}
                <a
                  href="/welcome"
                  className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Suite Hub
                </a>
                <NotificationSheet />
              </div>
            </header>

            <MobileTopBar title={getPageTitle(pathname, slug)} isHome={isHome} />

            <main className="flex-1 overflow-y-auto px-4 pt-4 pb-safe-nav md:p-6 md:pb-6 lg:p-8">
              <div className="mx-auto w-full max-w-[1400px]">
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
  );
}
