'use client';

import React, { useState, useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2 } from 'lucide-react';
import { registerAction } from '../../actions/auth';

const HanoledLogo = () => (
  <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-2xl mb-4">
    H
  </div>
);

export default function RegisterPage() {
  const router = useRouter();
  const [orgSlug, setOrgSlug] = useState('');
  
  const [state, formAction, pending] = useActionState(registerAction, null);

  useEffect(() => {
    if (state?.success && state?.redirectUrl) {
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-blue-700 p-6">
      <div className="w-full max-w-xl p-10 bg-white rounded-3xl shadow-2xl">
        <div className="flex justify-center">
          <HanoledLogo />
        </div>

        <h2 className="text-2xl font-bold text-center text-slate-900 mb-1">
          Register Your School
        </h2>
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
            <label className="text-sm font-semibold text-slate-700">Secure Password (min 8 characters)</label>
            <input
              type="password"
              name="password"
              minLength={8}
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
