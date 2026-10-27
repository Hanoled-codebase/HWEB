'use client';

import React, { useState, useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import { registerAction } from '../../actions/auth';

import { HanoledLogo } from '@/components/ui/HanoledLogo';
import { SignInShell } from '@/components/auth/SignInForm';
import { setAuthTokens } from '@/lib/auth-tokens';

export default function RegisterPage() {
  const router = useRouter();
  const [orgSlug, setOrgSlug] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [state, formAction, pending] = useActionState(registerAction, null);

  useEffect(() => {
    if (state?.success && state?.redirectUrl) {
      setAuthTokens({ hcoreToken: state.hcoreToken, hcbtToken: state.hcbtToken });
      router.push(state.redirectUrl);
    }
  }, [state, router]);

  const handleOrgNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const generatedSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setOrgSlug(generatedSlug);
  };

  return (
    <SignInShell>
      <div className="m-rise relative z-10 w-full max-w-xl rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] sm:rounded-[2.5rem] sm:p-10">
        <div className="flex justify-center mb-4">
          <HanoledLogo size="lg" variant="blue" iconOnly />
        </div>

        <h1 className="text-2xl font-bold text-center text-slate-900 mb-1">
          Register Your School
        </h1>
        <p className="text-center text-sm text-slate-500 mb-7">
          Creates unified HCORE identity and activates 30-day full access to HSMS and HCBT.
        </p>

        {state?.error && (
          <div role="alert" className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-5 flex items-center gap-2 border border-red-100">
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="displayName" className="block text-xs font-bold uppercase tracking-wider text-slate-700">Your Full Name</label>
              <input
                id="displayName"
                type="text"
                name="displayName"
                autoComplete="name"
                className="w-full rounded-xl border border-slate-300 bg-white p-3 text-base text-slate-900 placeholder-slate-500 outline-none transition-all focus:border-blue-600 focus:ring-2 focus:ring-blue-600/25 sm:text-sm"
                placeholder="Dr. Samuel Adeleke"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-700">Work Email</label>
              <input
                id="email"
                type="email"
                name="email"
                autoComplete="email"
                className="w-full rounded-xl border border-slate-300 bg-white p-3 text-base text-slate-900 placeholder-slate-500 outline-none transition-all focus:border-blue-600 focus:ring-2 focus:ring-blue-600/25 sm:text-sm"
                placeholder="principal@school.edu.ng"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="organizationName" className="block text-xs font-bold uppercase tracking-wider text-slate-700">School / Institution Name</label>
            <input
              id="organizationName"
              type="text"
              name="organizationName"
              autoComplete="organization"
              onChange={handleOrgNameChange}
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-base text-slate-900 placeholder-slate-500 outline-none transition-all focus:border-blue-600 focus:ring-2 focus:ring-blue-600/25 sm:text-sm"
              placeholder="Crown Heights College"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="organizationSlug" className="block text-xs font-bold uppercase tracking-wider text-slate-700">Organization Unique Identifier (Slug)</label>
            <input
              id="organizationSlug"
              type="text"
              name="organizationSlug"
              value={orgSlug}
              onChange={(e) => setOrgSlug(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-base text-slate-900 placeholder-slate-500 outline-none transition-all focus:border-blue-600 focus:ring-2 focus:ring-blue-600/25 sm:text-sm"
              placeholder="crown-heights-college"
              required
            />
            <p className="text-xs text-slate-500">
              Students will use this slug to sign in (e.g. {orgSlug || 'your-school'}.hanoled.com)
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-700">Secure Password (min 12 characters, 3 character classes)</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="new-password"
                minLength={12}
                className="w-full rounded-xl border border-slate-300 bg-white p-3 pr-12 text-base text-slate-900 placeholder-slate-500 outline-none transition-all focus:border-blue-600 focus:ring-2 focus:ring-blue-600/25 sm:text-sm"
                placeholder="••••••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition-colors hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-700">Select Subscriptions (At least one required)</span>
            
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 text-left transition-colors hover:bg-slate-50">
              <input 
                type="checkbox" 
                name="platforms" 
                value="HSMS" 
                defaultChecked 
                className="mt-0.5 h-5 w-5 shrink-0 rounded accent-blue-700 focus:ring-blue-600" 
              />
              <span className="flex flex-col">
                <span className="font-semibold text-slate-800 text-sm">Hanodel School Management (HSMS)</span>
                <span className="text-xs text-slate-500">Admissions, payments, results, and administration</span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 text-left transition-colors hover:bg-slate-50">
              <input 
                type="checkbox" 
                name="platforms" 
                value="HCBT" 
                defaultChecked 
                className="mt-0.5 h-5 w-5 shrink-0 rounded accent-blue-700 focus:ring-blue-600" 
              />
              <span className="flex flex-col">
                <span className="font-semibold text-slate-800 text-sm">Computer-Based Testing (HCBT)</span>
                <span className="text-xs text-slate-500">Secure exams, past questions, and offline testing</span>
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 py-3.5 font-semibold text-white transition-all hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-70"
          >
            {pending ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Creating School...
              </>
            ) : (
              <>
                Complete Registration <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-5 border-t border-slate-100 text-center">
          <p className="text-sm text-slate-500">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => router.push('/signin')}
              className="inline-flex min-h-11 items-center font-semibold text-blue-700 hover:underline"
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </SignInShell>
  );
}
