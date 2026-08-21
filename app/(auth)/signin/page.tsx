'use client';

import React, { useState, useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Hash, ArrowRight, Loader2 } from 'lucide-react';
import { loginAction } from '../../actions/auth';

// Minimal inline logo replacement until we import the actual HanoledLogo
const HanoledLogo = () => (
  <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-2xl mb-4">
    H
  </div>
);

export default function LoginPage() {
  const [tab, setTab] = useState<'EMAIL' | 'ADMISSION_NUMBER'>('EMAIL');
  const router = useRouter();
  
  const [state, formAction, pending] = useActionState(loginAction, null);

  useEffect(() => {
    if (state?.success && state?.redirectUrl) {
      router.push(state.redirectUrl);
    }
  }, [state, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-blue-700 p-6">
      <div className="w-full max-w-md p-10 bg-white rounded-3xl shadow-2xl">
        <div className="flex justify-center">
          <HanoledLogo />
        </div>

        <h2 className="text-2xl font-bold text-center text-slate-900 mb-1">
          Sign in to Hanoled Suite
        </h2>
        <p className="text-center text-sm text-slate-500 mb-7">
          One account for School Management, CBT, and Platform Admin.
        </p>

        <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1.5 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => setTab('EMAIL')}
            className={`flex items-center justify-center gap-2 py-2 text-sm rounded-lg transition-all ${
              tab === 'EMAIL'
                ? 'bg-white text-blue-600 shadow-sm font-semibold'
                : 'text-slate-500 font-medium hover:text-slate-700'
            }`}
          >
            <Mail size={16} /> Email / Staff
          </button>
          <button
            type="button"
            onClick={() => setTab('ADMISSION_NUMBER')}
            className={`flex items-center justify-center gap-2 py-2 text-sm rounded-lg transition-all ${
              tab === 'ADMISSION_NUMBER'
                ? 'bg-white text-blue-600 shadow-sm font-semibold'
                : 'text-slate-500 font-medium hover:text-slate-700'
            }`}
          >
            <Hash size={16} /> Student ID
          </button>
        </div>

        {state?.error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-5 flex items-center gap-2 border border-red-100">
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="identifierType" value={tab} />

          {tab === 'ADMISSION_NUMBER' && (
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">School Slug or Code</label>
              <input
                type="text"
                name="organizationSlugOrId"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="e.g. greenwood-academy"
                required
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">
              {tab === 'EMAIL' ? 'Email Address' : 'Admission Number'}
            </label>
            <input
              type={tab === 'EMAIL' ? 'email' : 'text'}
              name="identifier"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder={tab === 'EMAIL' ? 'admin@school.com' : 'e.g. STU/2026/001'}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Password</label>
            <input
              type="password"
              name="password"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition-all disabled:opacity-70 mt-2"
          >
            {pending ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Authenticating...
              </>
            ) : (
              <>
                Sign In <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-5 border-t border-slate-100 text-center">
          <p className="text-sm text-slate-500">
            New school or organization?{' '}
            <button
              type="button"
              onClick={() => router.push('/signup')}
              className="text-blue-600 font-semibold hover:underline"
            >
              Register your school
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
