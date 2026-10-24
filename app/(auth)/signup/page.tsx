'use client';

import React, { useState, useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import { registerAction } from '../../actions/auth';

import { HanoledLogo } from '@/components/ui/HanoledLogo';
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_2px,transparent_2px)] [background-size:32px_32px] opacity-70 pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob pointer-events-none" />
      <div className="absolute top-1/4 -right-20 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob pointer-events-none animation-delay-2000" />
      <div className="absolute -bottom-40 left-1/4 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob pointer-events-none animation-delay-4000" />

      <div className="w-full max-w-xl p-10 bg-white/80 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-white relative z-10 m-rise">
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
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-5 flex items-center gap-2 border border-red-100">
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Your Full Name</label>
              <input
                type="text"
                name="displayName"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Dr. Samuel Adeleke"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Work Email</label>
              <input
                type="email"
                name="email"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="principal@school.edu.ng"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">School / Institution Name</label>
            <input
              type="text"
              name="organizationName"
              onChange={handleOrgNameChange}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="Crown Heights College"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Organization Unique Identifier (Slug)</label>
            <input
              type="text"
              name="organizationSlug"
              value={orgSlug}
              onChange={(e) => setOrgSlug(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="crown-heights-college"
              required
            />
            <p className="text-xs text-slate-500">
              Students will use this slug to sign in (e.g. {orgSlug || 'your-school'}.hanoled.com)
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Secure Password (min 12 characters, 3 character classes)</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="new-password"
                minLength={12}
                className="w-full p-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                placeholder="••••••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors p-1 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <label className="text-sm font-semibold text-slate-700 block">Select Subscriptions (At least one required)</label>
            
            <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
              <input 
                type="checkbox" 
                name="platforms" 
                value="HSMS" 
                defaultChecked 
                className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500" 
              />
              <div className="flex flex-col">
                <span className="font-semibold text-slate-800 text-sm">Hanodel School Management (HSMS)</span>
                <span className="text-xs text-slate-500">Admissions, payments, results, and administration</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
              <input 
                type="checkbox" 
                name="platforms" 
                value="HCBT" 
                defaultChecked 
                className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500" 
              />
              <div className="flex flex-col">
                <span className="font-semibold text-slate-800 text-sm">Computer-Based Testing (HCBT)</span>
                <span className="text-xs text-slate-500">Secure exams, past questions, and offline testing</span>
              </div>
            </label>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition-all disabled:opacity-70 mt-2"
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
              className="text-blue-600 font-semibold hover:underline"
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
