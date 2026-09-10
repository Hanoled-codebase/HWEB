"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { GraduationCap, Settings, ArrowRight, CheckCircle, Loader2, Eye, EyeOff, Mail, Lock, ArrowUpRight } from "lucide-react";
import { cbtApi } from "@/lib/api-cbt";
import { HCBT_BASE } from "@/lib/api";
import { toTitleCase } from "@/lib/utils";
import { toast, Toaster } from "sonner";
import { Logo } from "@/components/ui/Logo";

export default function Home() {
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<{ authenticated: boolean; user?: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingInRole, setLoggingInRole] = useState<"student" | "admin" | null>(null);
  const [showDevPanel, setShowDevPanel] = useState(false);

  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await cbtApi.checkAuth();
        setAuthStatus(res);
      } catch {
        // Not authenticated — show login form
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsRedirecting(true);
    // Route them through the unified sign-in, and have them drop into the welcome portal
    router.push('/signin?callbackUrl=' + encodeURIComponent('/welcome'));
  };

  const handleEnterDashboard = () => {
    if (authStatus?.user?.role === 'student' || authStatus?.user?.role === 'STUDENT') {
      router.push('/cbt/student');
    } else {
      router.push('/cbt/admin');
    }
  };


  const handleDevLogin = async (role: "admin" | "student") => {
    setLoggingInRole(role);
    try {
      const res = await fetch(`${HCBT_BASE}/api/auth/dev/dev-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role }),
      }).then((r) => r.json());
      setAuthStatus({ authenticated: true, user: res.user });
      toast.success(`Dev session injected for ${role}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to inject mock JWT");
    } finally {
      setLoggingInRole(null);
    }
  };

  const handleDevLogout = async () => {
    try {
      await fetch(`${HCBT_BASE}/api/auth/dev/dev-logout`, {
        method: "POST",
        credentials: "include",
      });
      setAuthStatus({ authenticated: false });
      toast.success("Session cleared.");
    } catch {
      // Best-effort
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans relative overflow-x-hidden p-4 sm:p-6 lg:p-8">
      <Toaster position="top-right" richColors />
      
      {/* Outer Wrapper to match Hanoled landing page style */}
      <div className="flex-1 w-full max-w-[1400px] mx-auto bg-white rounded-sm shadow-sm border border-slate-200 overflow-hidden relative flex flex-col">
        
        {/* Subtle Dot Pattern Background */}
        <div 
          className="absolute inset-0 z-0 pointer-events-none opacity-[0.4]"
          style={{
            backgroundImage: "radial-gradient(#cbd5e1 1.5px, transparent 1.5px)",
            backgroundSize: "32px 32px"
          }}
        />

        <header className="w-full px-6 lg:px-12 h-24 flex items-center justify-between relative z-10 border-b border-slate-100">
          <div className="flex items-center space-x-4">
            <Logo className="w-9 h-9" badgeText="CBT" textColor="text-[#0B1220]" />
            <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
            <p className="text-[11px] text-slate-500 font-semibold tracking-wide uppercase hidden sm:block">Computer-Based Testing</p>
          </div>

          <a
            href="/welcome"
            className="text-sm font-semibold text-[#0B1220] hover:text-[#1447E6] transition-colors bg-white px-5 py-2.5 rounded-sm border border-slate-200 shadow-sm hover:shadow-md hover:border-[#1447E6]/30 flex items-center space-x-2"
          >
            <span>Back to Suite</span>
            <ArrowRight className="w-4 h-4 text-[#1447E6]" />
          </a>
        </header>

        <div className="flex-1 w-full px-6 lg:px-12 py-12 lg:py-16 flex flex-col relative z-10">
          
          {/* Main Grid Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-12 items-center">
            
            {/* Left Column */}
            <div className="space-y-10">
              {/* Typography Section */}
              <div className="space-y-6">
                <span className="inline-flex items-center space-x-2 bg-[#1447E6]/10 border border-[#1447E6]/20 text-[#1447E6] px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1447E6] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1447E6]"></span>
                  </span>
                  <span>Hanoled Suite CBT</span>
                </span>
                
                <h2 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-[#0B1220] leading-[1.1]">
                  Keep Learning <br />
                  <span className="text-[#1447E6] relative inline-block">
                    on Track
                    <svg className="absolute w-full h-3 -bottom-1 left-0 text-[#F5A623]" viewBox="0 0 100 10" preserveAspectRatio="none">
                      <path d="M0 5 Q 25 15 50 5 T 100 5" stroke="currentColor" strokeWidth="4" fill="transparent" />
                    </svg>
                  </span>
                </h2>
                
                <p className="text-slate-600 text-lg leading-relaxed max-w-xl">
                  Unified school examination system. Empower administrators, teachers, and students with high-integrity computer-based testing, question banks, and instant grading.
                </p>
              </div>

              {/* Integrated Login Form */}
              <div className="w-full max-w-md bg-white border border-slate-200 rounded-sm p-6 relative overflow-hidden shadow-xl shadow-slate-200/50">
                <h3 className="text-base font-bold text-[#0B1220] mb-1">Get Started</h3>
                <p className="text-xs text-slate-500 mb-6">Sign in with your Hanoled credentials</p>
                {/* Auth status and Main Action */}
                {!loading && authStatus?.authenticated ? (
                  <div className="flex flex-col space-y-4">
                    <button
                      onClick={handleEnterDashboard}
                      className="w-full bg-[#1447E6] hover:bg-[#1039B8] text-white font-bold text-sm py-3.5 rounded-sm shadow-md shadow-[#1447E6]/20 transition-all active:scale-[0.98] flex items-center justify-center space-x-2 mt-2"
                    >
                      Enter CBT Dashboard
                      <ArrowRight className="w-4 h-4 ml-2 opacity-80" />
                    </button>
                    
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center space-x-2 bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span>Signed in as {authStatus.user?.role || "user"}</span>
                      </div>
                      <button onClick={handleDevLogout} className="text-[10px] font-bold text-slate-500 hover:text-slate-800 uppercase tracking-wider transition-colors">
                        Sign Out
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <form onSubmit={handleLogin} className="flex flex-col space-y-4">
                      <button
                        type="submit"
                        className="w-full bg-[#1447E6] hover:bg-[#1039B8] text-white font-bold text-sm py-3.5 rounded-sm shadow-md shadow-[#1447E6]/20 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center space-x-2 mt-2"
                        disabled={isRedirecting || loading}
                      >
                        {isRedirecting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Redirecting to Secure Login...
                          </>
                        ) : (
                          <>
                            Sign In with Hanoled Suite
                            <ArrowRight className="w-4 h-4 ml-2 opacity-80" />
                          </>
                        )}
                      </button>
                    </form>
                    
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      {loading ? (
                        <div className="flex items-center space-x-2 text-[10px] text-slate-500">
                          <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
                          <span>Checking session...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 bg-slate-100 text-slate-500 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider w-fit">
                          <span>Not signed in</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
              {/* Info Cards Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4">
                {/* Card 1 */}
                <div className="bg-white border border-slate-200 rounded-sm p-5 flex flex-col justify-between items-start shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center space-x-4 w-full">
                    <div className="w-14 h-14 rounded-sm overflow-hidden relative border border-slate-100 flex-shrink-0">
                      <Image 
                        src="/images/card_teacher_1782039206847.png" 
                        alt="Certified Teacher" 
                        fill 
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="text-slate-900 font-bold text-sm leading-tight">
                        Best <span className="text-blue-600">Certified</span> <br/>Teacher Worldwide
                      </h4>
                    </div>
                  </div>
                  <div className="mt-5 flex items-center justify-between w-full">
                    <div>
                      <span className="text-2xl font-black text-slate-900 block">210+</span>
                      <span className="text-[10px] text-slate-500 font-medium">Experts already joined us</span>
                    </div>
                  </div>
                </div>

                {/* Card 2 */}
                <div className="bg-white border border-slate-200 rounded-sm p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                  <div className="w-full h-20 rounded-sm overflow-hidden relative mb-4">
                    <Image 
                      src="/images/card_classroom_1782039218483.png" 
                      alt="Classroom" 
                      fill 
                      className="object-cover"
                    />
                  </div>
                  <div className="flex items-end justify-between relative z-10">
                    <h4 className="text-slate-900 font-bold text-sm leading-tight max-w-[140px]">
                      Transforming schools and students
                    </h4>
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column - Hero Graphic */}
            <div className="relative h-full min-h-[500px] lg:min-h-[600px] w-full hidden lg:block rounded-sm overflow-hidden border border-slate-200 shadow-xl group bg-slate-100">
              {/* The Student Image */}
              <div className="absolute inset-0 z-10">
                <Image 
                  src="/images/hero_student_1782039196778.png" 
                  alt="Student holding books" 
                  fill 
                  className="object-cover object-center group-hover:scale-105 transition-transform duration-1000"
                  priority
                />
              </div>
              
              {/* Decorative squiggles on top of the image */}
              <svg className="absolute top-10 left-10 w-20 h-20 text-white/80 z-30 pointer-events-none drop-shadow-md" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M 10,50 Q 25,25 50,50 T 90,50" />
                <path d="M 80,40 L 90,50 L 80,60" />
              </svg>
              
              <svg className="absolute bottom-20 right-10 w-12 h-12 text-amber-400/90 z-30 pointer-events-none drop-shadow-md" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
                <line x1="20" y1="20" x2="35" y2="35" />
                <line x1="10" y1="50" x2="30" y2="50" />
                <line x1="20" y1="80" x2="35" y2="65" />
              </svg>

              {/* Fake UI Overlay to match Hanoled style */}
              <div className="absolute bottom-10 left-10 z-30 bg-green-500 text-white p-4 rounded-sm shadow-lg flex items-center space-x-3 max-w-[250px]">
                <div className="w-10 h-10 border border-white/20 rounded-sm flex items-center justify-center shrink-0">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide">Unified Platform</p>
                  <p className="text-[10px] text-green-100">Role-aware workflows</p>
                </div>
              </div>
            </div>
          </div>

          {/* Portals and Dev Tools Below */}
          <div className="mt-20 pt-10 border-t border-slate-100">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-900">Quick Access Portals</h3>
              <p className="text-sm text-slate-500 mt-1">Direct links for authenticated users</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              <Link
                href={authStatus?.authenticated ? "/cbt/student" : "#"}
                className="group bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md p-6 rounded-sm transition-all flex items-center justify-between"
              >
                <div className="flex items-center space-x-5">
                  <div className="bg-blue-50 border border-blue-100 p-3.5 rounded-sm text-blue-600 group-hover:scale-110 transition-transform">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      Student Portal
                    </h3>
                    <p className="text-slate-500 text-xs mt-1">
                      Take assigned exams and review results.
                    </p>
                  </div>
                </div>
                <ArrowUpRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
              </Link>

              <Link
                href={authStatus?.authenticated ? `/admin?orgSlug=hanoled-default` : "#"}
                className="group bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md p-6 rounded-sm transition-all flex items-center justify-between"
              >
                <div className="flex items-center space-x-5">
                  <div className="bg-indigo-50 border border-indigo-100 p-3.5 rounded-sm text-indigo-600 group-hover:scale-110 transition-transform">
                    <Settings className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      Admin & Educator Portal
                    </h3>
                    <p className="text-slate-500 text-xs mt-1">
                      Design exams and manage questions.
                    </p>
                  </div>
                </div>
                <ArrowUpRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
              </Link>
            </div>

            {/* Dev panel toggle — only in development */}
            {process.env.NODE_ENV !== "production" && (
            <div className="mt-12">
              <button
                onClick={() => setShowDevPanel(!showDevPanel)}
                className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider transition-colors flex items-center space-x-2"
              >
                <Settings className="w-3 h-3" />
                <span>{showDevPanel ? "Hide Developer Sandbox" : "Show Developer Sandbox"}</span>
              </button>
              
              {showDevPanel && (
                <div className="w-full bg-white border border-slate-200 rounded-sm p-6 text-left relative overflow-hidden shadow-sm mt-4 max-w-2xl">
                  <div className="space-y-1 mb-4">
                    <div className="flex items-center space-x-2">
                      <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Local Developer Sandbox</h3>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Inject mock JWT tokens directly into cookies for testing.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      onClick={() => handleDevLogin("student")}
                      disabled={loading || loggingInRole !== null}
                      className="p-4 rounded-sm border transition-all text-left flex flex-col justify-between h-[110px] group bg-slate-50 border-slate-200 hover:border-slate-300 hover:shadow-sm cursor-pointer"
                    >
                      <div className="flex items-start justify-between w-full">
                        <div>
                          <span className="text-[9px] font-extrabold text-blue-600 uppercase tracking-widest block">Candidate Account</span>
                          <span className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors mt-1 block">Mock Student</span>
                        </div>
                        {loggingInRole === "student" ? (
                          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                        ) : (
                          <GraduationCap className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 group-hover:text-slate-700 mt-2 font-medium">Inject Student JWT</span>
                    </button>

                    <button
                      onClick={() => handleDevLogin("admin")}
                      disabled={loading || loggingInRole !== null}
                      className="p-4 rounded-sm border transition-all text-left flex flex-col justify-between h-[110px] group bg-slate-50 border-slate-200 hover:border-slate-300 hover:shadow-sm cursor-pointer"
                    >
                      <div className="flex items-start justify-between w-full">
                        <div>
                          <span className="text-[9px] font-extrabold text-indigo-600 uppercase tracking-widest block">Educator Account</span>
                          <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors mt-1 block">Mock Teacher</span>
                        </div>
                        {loggingInRole === "admin" ? (
                          <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                        ) : (
                          <Settings className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 group-hover:text-slate-700 mt-2 font-medium">Inject Admin JWT</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
            )}
          </div>
        </div>

        <footer className="w-full bg-slate-50 border-t border-slate-100 relative z-10 py-6 mt-auto">
          <div className="px-6 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-slate-500">
            <div className="flex flex-wrap items-center justify-center gap-6">
              <span className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-blue-500 shrink-0" />
                <span>Zustand State & Auto-Save</span>
              </span>
              <span className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-blue-500 shrink-0" />
                <span>Integrity Timeout Countdown</span>
              </span>
              <span className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-blue-500 shrink-0" />
                <span>SSCE Board Questions Cache</span>
              </span>
            </div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">© Hanoled Inc.</p>
          </div>
        </footer>
      </div>
    </main>
  );
}
