'use client';

import React, { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, KeyRound, Loader2, Eye, EyeOff } from 'lucide-react';
import { completePasswordChangeAction, type SignInContext } from '@/app/actions/auth';
import { setAuthTokens } from '@/lib/auth-tokens';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { passwordRules } from '@/lib/password-policy';

const inputClass =
  'w-full p-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1447E6] focus:border-[#1447E6] outline-none text-base sm:text-sm text-[#0B1220] placeholder-slate-500 read-only:bg-slate-100 read-only:text-slate-600 transition-all';

/**
 * Shown instead of the sign-in form when the password was right but was set by
 * someone else (an import default or an admin reset). No session exists until
 * the person picks their own password here.
 */
export function RequiredPasswordChange({
  changeToken,
  context,
  onRestart,
}: {
  changeToken: string;
  context: SignInContext;
  onRestart: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(completePasswordChangeAction, null);
  const isRedirecting = Boolean(state && 'success' in state);
  const isSubmitting = pending || isRedirecting;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const isStudent = context.identifierType === 'ADMISSION_NUMBER';
  const rules = passwordRules(password, isStudent ? 'learner' : 'staff');

  useEffect(() => {
    if (state && 'success' in state) {
      setAuthTokens({ hcoreToken: state.hcoreToken, hcbtToken: state.hcbtToken });
      useAuth.setState({ user: null, isAuthenticated: false, isInitialized: false, error: null });
      useOrganization.getState().clear();
      router.replace(state.redirectUrl);
    }
  }, [state, router]);

  return (
    <div>
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#1447E6]/10 text-[#1447E6]">
        <KeyRound size={22} />
      </div>
      <h2 className="text-2xl font-bold text-center text-[#0B1220] mb-1">Choose a new password</h2>
      <p className="text-center text-xs sm:text-sm text-slate-500 mb-6">
        Your password was set by your school. Pick one only you know to finish signing in
        {isStudent ? ' — not your admission number.' : '.'}
      </p>

      {state && 'error' in state && (
        <div
          role="alert"
          className="bg-rose-50 text-rose-700 p-3 rounded-lg text-xs sm:text-sm mb-4 border border-rose-200"
        >
          {state.error}
          {state.expired && (
            <button type="button" onClick={onRestart} className="ml-1 font-bold underline cursor-pointer">
              Sign in again
            </button>
          )}
          {state.reference && (
            <span className="block mt-1 text-[11px] sm:text-xs">
              Reference: <span className="font-mono select-all break-all">{state.reference}</span>
            </span>
          )}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="changeToken" value={changeToken} />
        <input type="hidden" name="identifierType" value={context.identifierType} />
        <input type="hidden" name="identifier" value={context.identifier} />
        <input type="hidden" name="organizationSlugOrId" value={context.organizationSlugOrId || ''} />
        <input type="hidden" name="callbackUrl" value={context.callbackUrl || ''} />

        <div className="space-y-1.5">
          <label htmlFor="newPassword" className="block text-xs font-bold text-[#0B1220] uppercase tracking-wider">
            New password
          </label>
          <div className="relative">
            <input
              id="newPassword"
              type={showNewPassword ? "text" : "password"}
              name="newPassword"
              autoComplete="new-password"
              className={inputClass}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              readOnly={isSubmitting}
              required
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              aria-label={showNewPassword ? "Hide password" : "Show password"}
              className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1447E6] transition-colors cursor-pointer"
            >
              {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <ul className="space-y-1 pt-1">
            {rules.map((rule) => (
              <li
                key={rule.label}
                className={`flex items-center gap-1.5 text-[11px] ${rule.met ? 'text-[#12B76A]' : 'text-slate-500'}`}
              >
                <Check size={12} className={rule.met ? 'opacity-100' : 'opacity-30'} />
                {rule.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirmPassword" className="block text-xs font-bold text-[#0B1220] uppercase tracking-wider">
            Type it again
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              autoComplete="new-password"
              className={inputClass}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              readOnly={isSubmitting}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1447E6] transition-colors cursor-pointer"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          aria-busy={isSubmitting}
          disabled={isSubmitting || rules.some((rule) => !rule.met)}
          className="w-full min-h-12 flex items-center justify-center gap-2 bg-[#1447E6] hover:bg-[#103BBD] text-white font-bold py-3.5 rounded-xl transition-all disabled:cursor-not-allowed disabled:opacity-60 mt-3 cursor-pointer shadow-sm text-xs sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1447E6] focus-visible:ring-offset-2"
        >
          {pending ? (
            <>
              <Loader2 size={16} className="animate-spin" aria-hidden="true" /> Saving…
            </>
          ) : isRedirecting ? (
            <>
              <Loader2 size={16} className="animate-spin" aria-hidden="true" /> Redirecting…
            </>
          ) : (
            <>
              Set password and continue <ArrowRight size={16} aria-hidden="true" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-4 border-t border-slate-100 text-center">
        <button
          type="button"
          onClick={onRestart}
          disabled={isSubmitting}
          className="inline-flex min-h-11 items-center justify-center rounded-lg px-3 text-xs font-medium text-slate-600 hover:text-[#1447E6] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1447E6] cursor-pointer"
        >
          Back to sign in
        </button>
      </div>
    </div>
  );
}
