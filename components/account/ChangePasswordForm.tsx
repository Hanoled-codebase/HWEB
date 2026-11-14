'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Check, Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { request, HCORE_BASE } from '@/lib/api';
import { endBackendSessions, leaveSignedOut } from '@/lib/sign-out';
import { passwordRules } from '@/lib/password-policy';

const inputClass =
  'w-full p-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1447E6] focus:border-[#1447E6] outline-none text-base sm:text-sm text-[#0B1220] placeholder-slate-500 read-only:bg-slate-100 read-only:text-slate-600 transition-all';

/**
 * Voluntary password change for whoever is signed in — student, teacher,
 * admin or parent. The student/teacher rule mirrors the one shown at the
 * required first sign-in change; the school's backend makes the final call.
 *
 * Changing the password revokes every session the account holds, so on
 * success this signs the browser out everywhere and lands on the sign-in
 * page. The person then signs in with the password they just chose.
 */
export function ChangePasswordForm({ isStudent }: { isStudent: boolean }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const rules = passwordRules(password, isStudent ? 'learner' : 'staff');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('The two new passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await request(HCORE_BASE, '/auth/password/change-own', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword: password }),
        showErrorToast: false,
      });

      // Every session was revoked, including this browser's. Sign out for
      // real — the leftover cookie would bounce /signin back to /welcome.
      toast.success('Password changed. Sign in with your new password.');
      setSignedOut(true);
      await endBackendSessions();
      leaveSignedOut();
    } catch (err) {
      setSubmitting(false);
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      if ((err as { status?: number }).status === 401) {
        // The session expired while the form sat open — the change endpoint
        // requires a live session. Signing in again is the way back.
        setError('Your session has ended. Sign in again, then change your password here.');
        return;
      }
      setError(message);
    }
  }

  const filled = currentPassword && password && confirmPassword;

  return (
    <div className="w-full max-w-md">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1447E6]/10 text-[#1447E6]">
          <KeyRound size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#0B1220]">Change password</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Choose a password only you know. Everyone else is signed out everywhere when it changes.
          </p>
        </div>
      </div>

      {error && (
        <div role="alert" className="bg-rose-50 text-rose-700 p-3 rounded-lg text-xs sm:text-sm mb-4 border border-rose-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <label htmlFor="currentPassword" className="block text-xs font-bold text-[#0B1220] uppercase tracking-wider">
            Current password
          </label>
          <div className="relative">
            <input
              id="currentPassword"
              type={showCurrentPassword ? 'text' : 'password'}
              autoComplete="current-password"
              className={inputClass}
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              readOnly={submitting}
              required
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
              className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1447E6] transition-colors cursor-pointer"
            >
              {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="newPassword" className="block text-xs font-bold text-[#0B1220] uppercase tracking-wider">
            New password
          </label>
          <div className="relative">
            <input
              id="newPassword"
              type={showNewPassword ? 'text' : 'password'}
              autoComplete="new-password"
              className={inputClass}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              readOnly={submitting}
              required
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
              className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1447E6] transition-colors cursor-pointer"
            >
              {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <ul className="space-y-1 pt-1">
            {rules.map((rule) => (
              <li key={rule.label} className={`flex items-center gap-1.5 text-[11px] ${rule.met ? 'text-[#12B76A]' : 'text-slate-500'}`}>
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
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              className={inputClass}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              readOnly={submitting}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
              className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1447E6] transition-colors cursor-pointer"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          aria-busy={submitting}
          disabled={submitting || !filled || rules.some((rule) => !rule.met)}
          className="w-full min-h-12 flex items-center justify-center gap-2 bg-[#1447E6] hover:bg-[#103BBD] text-white font-bold py-3.5 rounded-xl transition-all disabled:cursor-not-allowed disabled:opacity-60 mt-3 cursor-pointer shadow-sm text-xs sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1447E6] focus-visible:ring-offset-2"
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" aria-hidden="true" /> {signedOut ? 'Signing you out…' : 'Saving…'}
            </>
          ) : (
            'Change password'
          )}
        </button>

        <p className="text-center text-xs text-slate-500">
          <Link href="/dashboard" className="font-medium text-slate-600 hover:text-[#1447E6]">
            Back to dashboard
          </Link>
        </p>
      </form>
    </div>
  );
}
