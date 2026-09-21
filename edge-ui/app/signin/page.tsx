"use client";

import { useState } from "react";
import { Loader2, Lock, User } from "lucide-react";
import { cbtApi } from "@/lib/api-cbt";
import { setAuthTokens } from "@/lib/auth-tokens";
import { Logo } from "@/components/ui/Logo";

// Offline sign-in for the appliance. Students use their admission number;
// teachers and admins use their Hanoled email/username. Same credentials as
// online — the appliance verifies them against hashes cached at pairing time.
export default function EdgeSignIn() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res: any = await cbtApi.login(identifier.trim(), password);
      if (res?.token) setAuthTokens({ hcbtToken: res.token });
      const role = String(res?.user?.role || "").toLowerCase();
      window.location.assign(role === "candidate" || role === "student" ? "/cbt/student/" : "/cbt/admin/");
    } catch (err: any) {
      setError(err?.message || "Could not sign in.");
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-6">
      <div className="w-full max-w-md rounded-sm border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <Logo variant="stacked" className="h-12 w-12" badgeText="CBT" size="lg" />
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Edge Appliance · Offline Exam Room</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {error && (
            <p className="rounded-sm border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-[#F04438]">{error}</p>
          )}
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Admission number or email
            </span>
            <span className="relative block">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                required
                className="w-full rounded-sm border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/20"
              />
            </span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Password</span>
            <span className="relative block">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="w-full rounded-sm border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/20"
              />
            </span>
          </label>
          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-sm bg-[#1447E6] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0f36b8] disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
