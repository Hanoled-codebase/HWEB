"use client";

import { useRef, useEffect, useState } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { SidebarProvider, SidebarInset, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { StudentSidebar } from "@/components/dashboard/StudentSidebar";
import { GraduationCap, Loader2, ChevronLeft, Menu } from "lucide-react";
import { HanoledLoader } from "@/components/ui/hanoled-loader";

function MobileMenuButton() {
  const { setOpenMobile } = useSidebar();
  return (
    <button
      onClick={() => setOpenMobile(true)}
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm cursor-pointer"
      aria-label="Open menu"
    >
      <Menu className="h-5 w-5" />
    </button>
  );
}
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { StudentMobileLayout } from "@/components/dashboard/StudentMobileLayout";
import { StaffRouteGuard } from "@/components/dashboard/StaffRouteGuard";
import { NotificationSheet } from "@/components/dashboard/NotificationSheet";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";

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
 * Prevents the shadcn Sidebar Sheet from opening on mobile when the user
 * is on the dashboard homepage — AdminMobileDashboard and MemberMobileDashboard
 * provide their own navigation drawers on that route.
 */
function MobileSidebarGuard({ slug, pathname }: { slug: string; pathname: string }) {
  const { setOpenMobile, openMobile, isMobile } = useSidebar();
  const isDashboardHome = pathname === `/dashboard/school/${slug}`;

  useEffect(() => {
    if (isMobile && isDashboardHome && openMobile) {
      setOpenMobile(false);
    }
  }, [isMobile, isDashboardHome, openMobile, setOpenMobile]);

  return null;
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
  const { currentOrg, currentMember, currentStudent, isStudent, setCurrentOrg, isLoading, error } =
    useOrganization();
  const {
    user,
    checkAuth,
    isInitialized,
    isLoading: authLoading,
    logout,
  } = useAuth();
  const [isInitializing, setIsInitializing] = useState(true);
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

  useEffect(() => {
    async function init() {
      if (authLoading || !isInitialized) return;
      
      if (!user) {
        setIsInitializing(false);
        return;
      }

      if (slug) {
        try {
          if (!currentOrg || currentOrg.slug !== slug) {
            await setCurrentOrg(slug);
          }
        } catch {
          toast.error("Error loading organization. You might not have access.");
        }
      }
      setIsInitializing(false);
    }
    
    init();
  }, [slug, user, authLoading, currentOrg, setCurrentOrg, isInitialized]);

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

  return (
    <TooltipProvider>
      <SidebarProvider>
        <MobileSidebarGuard slug={slug} pathname={pathname} />
        <AppSidebar />
        <SidebarInset className="bg-slate-50 flex flex-col min-h-screen relative overflow-x-hidden">
          {/* Desktop Header */}
          <header className={`sticky top-0 z-10 hidden md:flex h-14 shrink-0 items-center border-b bg-white/80 backdrop-blur-md px-6`}>
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1 text-slate-500 hover:text-slate-800" />
              </div>
              <div className="flex items-center gap-3">
                <NotificationSheet />
              </div>
            </div>
          </header>

          {/* Mobile Sub-page Header */}
          {pathname !== `/dashboard/school/${slug}` && (
            <header className="sticky top-0 z-20 flex md:hidden h-14 shrink-0 items-center border-b border-slate-100 bg-white px-4 justify-between">
              <button
                onClick={() => {
                  if (window.history.length > 2) {
                    router.back();
                  } else {
                    const parts = pathname.split("/");
                    parts.pop();
                    const parent = parts.join("/");
                    router.push(parent || `/dashboard/school/${slug}`);
                  }
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100/80 text-slate-700 shadow-sm cursor-pointer hover:bg-slate-200 transition-colors"
                aria-label="Go back"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <h1 className="text-base font-bold text-slate-900 tracking-tight truncate max-w-[200px] text-center">
                {getPageTitle(pathname, slug)}
              </h1>

              <NotificationSheet />
            </header>
          )}

          <main className={`flex-1 overflow-y-auto ${
            pathname === `/dashboard/school/${slug}` ? "p-0" : "p-4 pb-28 md:pb-6"
          } md:p-6 lg:p-8`}>
            <div className="mx-auto w-full max-w-[1400px]">
              <StaffRouteGuard slug={slug}>
                {children}
              </StaffRouteGuard>
            </div>
          </main>

          {pathname !== `/dashboard/school/${slug}` && <MobileBottomNav slug={slug} />}
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
