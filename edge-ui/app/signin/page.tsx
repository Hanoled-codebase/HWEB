"use client";

import { useState } from "react";
import { Check, KeyRound, Loader2, Lock, User } from "lucide-react";
import { cbtApi } from "@/lib/api-cbt";
import { setAuthTokens } from "@/lib/auth-tokens";
import { passwordRules, type PasswordAudience } from "@/lib/password-policy";
import { Logo } from "@/components/ui/Logo";

type SignInResponse = {
  token?: string;
  user?: { role?: string };
  passwordChangeRequired?: boolean;
  changeToken?: string;
  accountKind?: PasswordAudience;
};

const inputClass =
  "w-full rounded-sm border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-[#1447E6] focus:outline-none focus:ring-2 focus:ring-[#1447E6]/20";
const labelClass = "mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500";
const buttonClass =
  "flex w-full items-center justify-center gap-2 rounded-sm bg-[#1447E6] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1447E6]/90 disabled:opacity-60";

function enter(res: SignInResponse) {
  if (res.token) setAuthTokens({ hcbtToken: res.token });
  const role = String(res.user?.role || "").toLowerCase();
  window.location.assign(role === "candidate" || role === "student" ? "/cbt/student/" : "/cbt/admin/");
}

function ErrorNote({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-sm border border-[#F04438]/30 bg-[#F04438]/10 px-3 py-2 text-sm text-[#F04438]">
      {message}
    </p>
  );
}

// A password the school set (an admission number, an admin reset) gets no
// session here, as online: the person picks their own first. Only its hash
// stays on the appliance, and reaches their Hanoled account at the next sync.
function ChoosePassword({
  changeToken,
  audience,
  onRestart,
}: {
  changeToken: string;
  audience: PasswordAudience;
  onRestart: (message?: string) => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const rules = passwordRules(password, audience);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      enter(await cbtApi.changePassword(changeToken, password));
    } catch (err: unknown) {
      const { code, message } = err as { code?: string; message?: string };
      if (code === "INVALID_CHANGE_TOKEN") onRestart(message);
      else setError(message || "Could not set your password.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="text-center">
        <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#1447E6]/10 text-[#1447E6]">
          <KeyRound className="h-5 w-5" />
        </span>
        <h1 className="text-lg font-bold text-[#0B1220]">Choose a new password</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your school set this password. Pick one only you know
          {audience === "learner" ? ", not your admission number." : "."}
        </p>
      </div>
      {error && <ErrorNote message={error} />}
      <label className="block">
        <span className={labelClass}>New password</span>
        <span className="relative block">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            autoFocus
            className={inputClass}
          />
        </span>
      </label>
      <ul className="space-y-1">
        {rules.map((rule) => (
          <li key={rule.label} className={`flex items-center gap-1.5 text-xs ${rule.met ? "text-[#12B76A]" : "text-slate-500"}`}>
            <Check className={`h-3 w-3 ${rule.met ? "opacity-100" : "opacity-30"}`} />
            {rule.label}
          </li>
        ))}
      </ul>
      <label className="block">
        <span className={labelClass}>Type it again</span>
        <span className="relative block">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
            className={inputClass}
          />
        </span>
      </label>
      <button type="submit" disabled={busy || rules.some((rule) => !rule.met)} className={buttonClass}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {busy ? "Saving…" : "Set password and continue"}
      </button>
      <button type="button" onClick={() => onRestart()} className="block w-full text-center text-xs text-slate-500 hover:text-[#1447E6]">
        Back to sign in
      </button>
    </form>
  );
}

// Offline sign-in for the appliance. Students use their admission number;
// teachers and admins use their Hanoled email/username. Same credentials as
// online — the appliance verifies them against hashes cached at pairing time.
export default function EdgeSignIn() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [change, setChange] = useState<{ token: string; audience: PasswordAudience } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res: SignInResponse = await cbtApi.login(identifier.trim(), password);
      if (res.passwordChangeRequired && res.changeToken) {
        setChange({ token: res.changeToken, audience: res.accountKind === "staff" ? "staff" : "learner" });
        setPassword("");
        setBusy(false);
        return;
      }
      enter(res);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || "Could not sign in.");
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

        {change ? (
          <ChoosePassword
            changeToken={change.token}
            audience={change.audience}
            onRestart={(message) => {
              setChange(null);
              setError(message || "");
            }}
          />
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            {error && <ErrorNote message={error} />}
            <label className="block">
              <span className={labelClass}>Admission number or email</span>
              <span className="relative block">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoComplete="username"
                  required
                  className={inputClass}
                />
              </span>
            </label>
            <label className="block">
              <span className={labelClass}>Password</span>
              <span className="relative block">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className={inputClass}
                />
              </span>
            </label>
            <button type="submit" disabled={busy} className={buttonClass}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
