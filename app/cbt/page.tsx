"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Settings, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { cbtApi } from "@/lib/api-cbt";
import { HCBT_BASE } from "@/lib/api";
import { toast } from "sonner";
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

  // Signed-in people came here to work: send them straight to their console.
  useEffect(() => {
    if (loading || !authStatus?.authenticated) return;
    const role = String(authStatus.user?.role || "").toLowerCase();
    router.replace(role === "student" ? "/cbt/student" : "/cbt/admin");
  }, [authStatus, loading, router]);

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

  const opening = loading || authStatus?.authenticated;

  return (
    <main className="flex min-h-[100dvh] flex-col bg-slate-50 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] text-slate-900">
      <header className="mx-auto flex w-full max-w-md items-center justify-between py-2">
        <Logo className="h-9 w-9" badgeText="CBT" textColor="text-[#0B1220]" />
        <a
          href="/welcome"
          className="-mr-2 flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-slate-700 transition-colors hover:text-blue-700"
        >
          <ArrowLeft className="h-4 w-4" /> Hanoled Suite
        </a>
      </header>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Computer-based tests</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
            Set, sit and mark school exams. Use the account your school gave you.
          </p>

          {opening ? (
            <div className="mt-8 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-50 text-sm font-medium text-slate-600" role="status">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              {loading ? "Checking your session…" : "Opening your console…"}
            </div>
          ) : (
            <form onSubmit={handleLogin} className="mt-8">
              <button
                type="submit"
                disabled={isRedirecting}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-base font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
              >
                {isRedirecting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isRedirecting ? "Opening sign in…" : "Sign in with Hanoled"}
                {!isRedirecting && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>
          )}

          <ul className="mt-8 space-y-3 border-t border-slate-100 pt-6 text-sm text-slate-600">
            <li className="flex gap-3">
              <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
              Students see their exams and results. Exams are taken on a computer, not a phone.
            </li>
            <li className="flex gap-3">
              <Settings className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
              Teachers and admins build question banks, schedule exams and review grades.
            </li>
          </ul>
        </div>

        {/* Dev panel toggle — only in development */}
        {process.env.NODE_ENV !== "production" && (
          <div className="mt-8">
            <button
              type="button"
              onClick={() => setShowDevPanel(!showDevPanel)}
              className="flex min-h-11 items-center gap-2 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-800"
            >
              <Settings className="h-3.5 w-3.5" />
              {showDevPanel ? "Hide developer sandbox" : "Developer sandbox"}
            </button>

            {showDevPanel && (
              <div className="mt-2 grid gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-4 sm:grid-cols-2">
                <p className="text-xs text-slate-500 sm:col-span-2">Local only: injects a mock HCBT session cookie.</p>
                {(["student", "admin"] as const).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleDevLogin(role)}
                    disabled={loading || loggingInRole !== null}
                    className="flex min-h-12 items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 text-left text-sm font-semibold text-slate-800 transition-colors hover:border-slate-300"
                  >
                    {role === "student" ? "Mock student" : "Mock teacher"}
                    {loggingInRole === role ? <Loader2 className="h-4 w-4 animate-spin text-blue-600" /> : null}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
