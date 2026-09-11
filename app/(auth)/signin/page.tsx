'use client';

import React, { useState, useActionState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Hash, ArrowRight, Loader2, School, Search, ChevronDown, Check, Building2, Sparkles } from 'lucide-react';
import { loginAction } from '../../actions/auth';
import { api } from '@/services/api';
import { HanoledLogo } from '@/components/ui/HanoledLogo';
import { setAuthTokens } from '@/lib/auth-tokens';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/welcome';
  const queryOrgSlug = searchParams.get('orgSlug') || searchParams.get('school') || '';

  const [tab, setTab] = useState<'EMAIL' | 'ADMISSION_NUMBER'>(queryOrgSlug ? 'ADMISSION_NUMBER' : 'EMAIL');
  const [schools, setSchools] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [selectedSchool, setSelectedSchool] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [schoolSearchQuery, setSchoolSearchQuery] = useState('');
  const [isSchoolPickerOpen, setIsSchoolPickerOpen] = useState(false);
  const [loadingSchools, setLoadingSchools] = useState(false);

  const [state, formAction, pending] = useActionState(loginAction, null);

  // Load public organizations for discovery
  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoadingSchools(true);
      try {
        const orgs = await api.getPublicOrganizations();
        if (isMounted && Array.isArray(orgs)) {
          setSchools(orgs);

          // 1. If query param provided, match it
          if (queryOrgSlug) {
            const matched = orgs.find(
              (o) => o.slug.toLowerCase() === queryOrgSlug.toLowerCase() || o.id === queryOrgSlug
            );
            if (matched) {
              setSelectedSchool(matched);
              setTab('ADMISSION_NUMBER');
              return;
            }
          }

          // 2. Otherwise try localStorage
          const savedSlug = localStorage.getItem('hanoled_student_school_slug');
          if (savedSlug && !selectedSchool) {
            const savedMatch = orgs.find((o) => o.slug === savedSlug || o.id === savedSlug);
            if (savedMatch) {
              setSelectedSchool(savedMatch);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load public schools list:', err);
      } finally {
        if (isMounted) setLoadingSchools(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [queryOrgSlug]);

  // Handle school selection
  const handleSelectSchool = (school: { id: string; name: string; slug: string }) => {
    setSelectedSchool(school);
    setIsSchoolPickerOpen(false);
    localStorage.setItem('hanoled_student_school_slug', school.slug);
  };

  useEffect(() => {
    if (state?.success && state?.redirectUrl) {
      setAuthTokens({ hcoreToken: state.hcoreToken, hcbtToken: state.hcbtToken });
      router.push(state.redirectUrl);
    }
  }, [state, router]);

  const filteredSchools = schools.filter((s) =>
    s.name.toLowerCase().includes(schoolSearchQuery.toLowerCase()) ||
    s.slug.toLowerCase().includes(schoolSearchQuery.toLowerCase())
  );

  return (
    <div className="w-full max-w-md p-8 sm:p-10 bg-white/90 backdrop-blur-2xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-200/80 relative z-10">
      <div className="flex justify-center mb-4">
        <HanoledLogo size="lg" variant="blue" iconOnly />
      </div>

      <h2 className="text-2xl font-bold text-center text-slate-900 mb-1">
        Sign in to Hanoled Suite
      </h2>
      <p className="text-center text-xs sm:text-sm text-slate-500 mb-6">
        School Management, CBT Examinations, and Staff Portal.
      </p>

      {/* Role Tabs */}
      <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl mb-5">
        <button
          type="button"
          onClick={() => setTab('EMAIL')}
          className={`flex items-center justify-center gap-2 py-2 text-xs sm:text-sm rounded-lg font-semibold transition-all cursor-pointer ${
            tab === 'EMAIL'
              ? 'bg-white text-blue-600 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Mail size={15} /> Staff / Admin
        </button>
        <button
          type="button"
          onClick={() => setTab('ADMISSION_NUMBER')}
          className={`flex items-center justify-center gap-2 py-2 text-xs sm:text-sm rounded-lg font-semibold transition-all cursor-pointer ${
            tab === 'ADMISSION_NUMBER'
              ? 'bg-white text-blue-600 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Hash size={15} /> Student / Candidate
        </button>
      </div>

      {state?.error && (
        <div className="bg-rose-50 text-rose-600 p-3 rounded-lg text-xs sm:text-sm mb-4 flex items-center gap-2 border border-rose-200">
          {state.error}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="identifierType" value={tab} />
        <input type="hidden" name="callbackUrl" value={callbackUrl} />

        {/* STUDENT TAB: SCHOOL SELECTOR */}
        {tab === 'ADMISSION_NUMBER' && (
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Target School / Organization
            </label>

            {/* Hidden form input holding the exact slug/ID for backend authentication */}
            <input
              type="hidden"
              name="organizationSlugOrId"
              value={selectedSchool?.slug || selectedSchool?.id || queryOrgSlug || schoolSearchQuery}
            />

            {selectedSchool ? (
              <div className="p-3 bg-blue-50/80 border border-blue-200/80 rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-2.5 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <School className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <span className="block text-xs font-bold text-blue-950 truncate">
                      {selectedSchool.name}
                    </span>
                    <span className="text-[11px] text-blue-600 font-mono">
                      Code: {selectedSchool.slug}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSchool(null);
                    setIsSchoolPickerOpen(true);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-bold px-2 py-1 bg-white rounded-md border border-blue-200 shrink-0 cursor-pointer"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsSchoolPickerOpen(!isSchoolPickerOpen)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-left flex items-center justify-between hover:bg-slate-100/70 transition cursor-pointer"
                >
                  <div className="flex items-center space-x-2 text-slate-600 text-xs">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span>Select your school from list...</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                {isSchoolPickerOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-2 space-y-2 animate-fade-in">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        autoFocus
                        value={schoolSearchQuery}
                        onChange={(e) => setSchoolSearchQuery(e.target.value)}
                        placeholder="Search school by name or slug..."
                        className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                      {filteredSchools.length === 0 ? (
                        <div className="p-3 text-center text-xs text-slate-400">
                          {schoolSearchQuery ? (
                            <div>
                              <p>No registered school matches "{schoolSearchQuery}".</p>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSchool({ id: schoolSearchQuery, name: schoolSearchQuery, slug: schoolSearchQuery });
                                  setIsSchoolPickerOpen(false);
                                }}
                                className="mt-1.5 text-blue-600 font-bold hover:underline"
                              >
                                Use "{schoolSearchQuery}" as custom code
                              </button>
                            </div>
                          ) : (
                            'No schools available'
                          )}
                        </div>
                      ) : (
                        filteredSchools.map((s) => (
                          <button
                            key={s.id || s.slug}
                            type="button"
                            onClick={() => handleSelectSchool(s)}
                            className="w-full text-left p-2.5 hover:bg-blue-50 rounded-lg flex items-center justify-between transition cursor-pointer"
                          >
                            <div>
                              <div className="text-xs font-bold text-slate-800">{s.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{s.slug}</div>
                            </div>
                            <Check className="w-3.5 h-3.5 text-blue-600 opacity-0 group-hover:opacity-100" />
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* IDENTIFIER FIELD */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            {tab === 'EMAIL' ? 'Email Address' : 'Student Admission Number'}
          </label>
          <input
            type={tab === 'EMAIL' ? 'email' : 'text'}
            name="identifier"
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-xs sm:text-sm text-slate-800 placeholder-slate-400 transition-all font-medium"
            placeholder={tab === 'EMAIL' ? 'staff@school.edu' : 'e.g. GW/2026/001'}
            required
          />
        </div>

        {/* PASSWORD FIELD */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Password
            </label>
            {tab === 'ADMISSION_NUMBER' && (
              <span className="text-[11px] text-slate-400">
                Default: Admission No.
              </span>
            )}
          </div>
          <input
            type="password"
            name="password"
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-xs sm:text-sm text-slate-800 placeholder-slate-400 transition-all"
            placeholder="••••••••"
            required
          />
        </div>

        <button
          type="submit"
          disabled={pending || (tab === 'ADMISSION_NUMBER' && !selectedSchool && !queryOrgSlug && !schoolSearchQuery)}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 mt-3 cursor-pointer shadow-sm text-xs sm:text-sm"
        >
          {pending ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Authenticating...
            </>
          ) : (
            <>
              {tab === 'ADMISSION_NUMBER' ? 'Enter CBT Examination Portal' : 'Sign In to Dashboard'}
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-4 border-t border-slate-100 text-center">
        <p className="text-xs text-slate-500">
          New school or organization?{' '}
          <button
            type="button"
            onClick={() => router.push('/contact')}
            className="text-blue-600 font-bold hover:underline cursor-pointer"
          >
            Contact Support
          </button>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_2px,transparent_2px)] [background-size:32px_32px] opacity-70 pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob pointer-events-none" />
      <div className="absolute top-1/4 -right-20 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob pointer-events-none animation-delay-2000" />
      <div className="absolute -bottom-40 left-1/4 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob pointer-events-none animation-delay-4000" />

      <Suspense fallback={<div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
