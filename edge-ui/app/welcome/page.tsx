"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Monitor, ArrowRight } from "lucide-react";
import { HanoledLogo } from "@/components/ui/HanoledLogo";
import { SignOutForm } from "@/components/auth/SignOutForm";
import { cbtApi } from "@/lib/api-cbt";

// The suite's /welcome is a server component (HCORE cookies + subscription
// context). The appliance runs one product, so this client stand-in ships the
// same welcome hub — same background, badge, title and card language — with
// just the CBT destination, while students are transparently sent into their
// examination room exactly as the online hub's candidate redirect does.
export default function EdgeWelcome() {
  useEffect(() => {
    cbtApi
      .checkAuth()
      .then((res) => {
        const role = String(res?.user?.role || "").toLowerCase();
        if (!res?.authenticated) return window.location.replace("/signin/");
        if (role === "candidate" || role === "student") return window.location.replace("/cbt/student/");
      })
      .catch(() => window.location.replace("/signin/"));
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fbff] font-sans selection:bg-[#1447e6] selection:text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Repeating Hanoled Step-Line SVG Background Pattern (as online) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="welcome-pattern" width="68" height="68" patternUnits="userSpaceOnUse">
            <path d="M14 6 V22 H32 V38" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.45" />
            <path d="M48 40 V56 H66 V72" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.45" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#welcome-pattern)" />
      </svg>

      {/* Subtle radial glow accents for depth */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-96 h-96 bg-amber-100/35 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center text-center py-8">
        <div className="mb-4">
          <HanoledLogo size="md" variant="blue" />
        </div>

        <div className="inline-flex items-center gap-2 bg-[#edf3ff] border border-[#d8e5ff] text-[#1447e6] px-3.5 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase mb-5 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623]"></span>
          <span>WELCOME HUB</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-black tracking-tight text-[#0B1220] leading-[1.12] mb-4">
          Welcome to this device&apos;s
          <br />
          <span className="text-[#1447e6]">CBT engine</span>
        </h1>

        <p className="text-sm sm:text-base text-slate-500 max-w-xl mx-auto leading-relaxed mb-10">
          You&apos;re on the HCBT Edge Appliance this school runs offline. Pick a destination to start running your computer-based tests.
        </p>

        <div className="grid grid-cols-1 gap-6 w-full max-w-[420px] mx-auto">
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

            <Link
              href="/cbt/"
              className="w-full py-3.5 px-4 bg-[#1447e6] hover:bg-[#103bbd] text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs group"
            >
              <span>Launch CBT engine</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Discreet Sign Out */}
        <div className="mt-10 text-center">
          <SignOutForm>
            <button type="submit" className="text-xs text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
              Sign out / Use a different account
            </button>
          </SignOutForm>
        </div>
      </div>
    </div>
  );
}
