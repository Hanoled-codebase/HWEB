import { cookies } from "next/headers";
import Link from "next/link";
import { HanoledLogo } from "@/components/ui/HanoledLogo";
import { ArrowRight, LayoutGrid, Monitor, Rocket } from "lucide-react";
import { redirect } from "next/navigation";
import { SignOutForm } from "@/components/auth/SignOutForm";

const HCORE_BASE = process.env.NEXT_PUBLIC_HCORE_URL || "http://localhost:4000";

export default async function WelcomePortal() {
  const cookieStore = await cookies();
  const token = cookieStore.get("hcore_session")?.value;

  if (!token) {
    redirect("/signin");
  }

  // 1. If user is a student, send directly to student examination portal
  const userRole = cookieStore.get("hweb_user_role")?.value;
  if (userRole === "STUDENT") {
    redirect("/cbt/student");
  }

  let allowedPlatforms = cookieStore.get("hweb_allowed_platforms")?.value || "";
  // Set at sign-in time (finishSignIn): the action already resolved whether
  // this person is a student / exam candidate and where they go. Redirecting
  // from the cookie keeps the reveal deterministic — no render-time HCORE
  // round-trip can flake it.
  const candidateCookie = cookieStore.get("hweb_candidate_redirect")?.value;
  // Set inside the try below, followed after it: redirect() works by throwing,
  // so calling it inside the try would be caught and ignored.
  let candidateRedirect: string | null = null;
  if (candidateCookie) {
    redirect(candidateCookie);
  }

  // If cookie is missing or empty, fetch real active subscriptions directly from HCORE
  try {
    const meRes = await fetch(`${HCORE_BASE}/v1/me/contexts`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (meRes.ok) {
      const meData = await meRes.json();
      const primaryOrg = meData.organizations?.[0];
      
      // Check if primary role is student / candidate
      const isCandidate =
        primaryOrg?.products?.HCBT?.roles?.includes("CANDIDATE") ||
        primaryOrg?.products?.HSMS?.roles?.includes("STUDENT");
      if (isCandidate) {
        const orgSlug = primaryOrg?.slug || "";
        candidateRedirect = orgSlug ? `/cbt/student?orgSlug=${encodeURIComponent(orgSlug)}` : "/cbt/student";
      }

      if (!allowedPlatforms && primaryOrg && Array.isArray(primaryOrg.subscribed) && primaryOrg.subscribed.length > 0) {
        // Org-level subscription isn't enough — only offer a product this
        // user actually has a role in (a Parent shouldn't see "Launch CBT
        // engine" just because the school also subscribes to HCBT).
        allowedPlatforms = primaryOrg.subscribed
          .filter((code: string) => (primaryOrg.products?.[code]?.roles?.length ?? 0) > 0)
          .join(",");
      }
    } else {
      console.error(`[probe] /welcome contexts not ok: ${meRes.status}`);
    }
  } catch (e) {
    console.error("Failed to fetch subscriptions in /welcome:", e);
  }
  if (candidateRedirect) redirect(candidateRedirect);

  if (!allowedPlatforms) {
    allowedPlatforms = "HSMS,HCBT";
  }

  const hasHsms = allowedPlatforms.includes("HSMS");
  const hasHcbt = allowedPlatforms.includes("HCBT");
  const hasBoth = hasHsms && hasHcbt;

  return (
    <div className="min-h-screen bg-[#f8fbff] font-sans selection:bg-[#1447e6] selection:text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Repeating Hanoled Step-Line SVG Background Pattern */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="welcome-pattern"
            width="68"
            height="68"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M14 6 V22 H32 V38"
              stroke="#cbd5e1"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity="0.45"
            />
            <path
              d="M48 40 V56 H66 V72"
              stroke="#cbd5e1"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity="0.45"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#welcome-pattern)" />
      </svg>

      {/* Subtle radial glow accents for depth */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-96 h-96 bg-amber-100/35 rounded-full blur-3xl pointer-events-none" />

      {/* Content Container */}
      <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center text-center py-8">
        
        {/* Brand Logo */}
        <div className="mb-4">
          <HanoledLogo size="md" variant="blue" />
        </div>

        {/* Pill Badge */}
        <div className="inline-flex items-center gap-2 bg-[#edf3ff] border border-[#d8e5ff] text-[#1447e6] px-3.5 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase mb-5 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623]"></span>
          <span>WELCOME HUB</span>
        </div>

        {/* Main Title */}
        <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-black tracking-tight text-[#0B1220] leading-[1.12] mb-4">
          Welcome to the full<br />
          <span className="text-[#1447e6]">Hanoled suite</span>
        </h1>

        {/* Subtitle / Description */}
        <p className="text-sm sm:text-base text-slate-500 max-w-xl mx-auto leading-relaxed mb-10">
          You&apos;re subscribed to every premium service. Choose a destination to start managing your school or running your computer-based tests.
        </p>

        {/* Two Destination Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-[840px] mx-auto">
          
          {/* Card 1: School Management */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs flex flex-col justify-between text-left transition-all duration-200 hover:shadow-md hover:border-slate-300">
            <div>
              <div className="w-12 h-12 rounded-xl bg-[#edf3ff] text-[#1447e6] flex items-center justify-center mb-6">
                <LayoutGrid className="w-5 h-5 text-[#1447e6]" />
              </div>
              <h2 className="text-lg font-bold text-[#0B1220] mb-2">School management</h2>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-8">
                Complete administrative control. Manage students, process payments, and automate grading in one place.
              </p>
            </div>

            {hasHsms ? (
              <Link
                href="/dashboard"
                className="w-full py-3.5 px-4 bg-[#1447e6] hover:bg-[#103bbd] text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs group"
              >
                <span>Launch dashboard</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ) : (
              <Link
                href="/features"
                className="w-full py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <Rocket className="w-4 h-4 text-slate-500" />
                <span>Explore SMS Features</span>
              </Link>
            )}
          </div>

          {/* Card 2: Computer-Based Testing */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs flex flex-col justify-between text-left transition-all duration-200 hover:shadow-md hover:border-slate-300">
            <div>
              <div className="w-12 h-12 rounded-xl bg-[#edf3ff] text-[#1447e6] flex items-center justify-center mb-6">
                <Monitor className="w-5 h-5 text-[#1447e6]" />
              </div>
              <h2 className="text-lg font-bold text-[#0B1220] mb-2">Computer-based testing</h2>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-8">
                High-integrity digital exams. Build question banks and deliver tests with instant grading.
              </p>
            </div>

            {hasHcbt ? (
              <Link
                href="/cbt/admin"
                className="w-full py-3.5 px-4 bg-[#1447e6] hover:bg-[#103bbd] text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs group"
              >
                <span>Launch CBT engine</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ) : (
              <Link
                href="/hcbt"
                className="w-full py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <Rocket className="w-4 h-4 text-slate-500" />
                <span>Explore CBT Features</span>
              </Link>
            )}
          </div>

        </div>

        {/* Discreet Sign Out */}
        <div className="mt-10 text-center">
          <SignOutForm>
            <button
              type="submit"
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              Sign out / Use a different account
            </button>
          </SignOutForm>
        </div>

      </div>
    </div>
  );
}
