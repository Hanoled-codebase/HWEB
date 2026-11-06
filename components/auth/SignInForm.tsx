'use client';

import React, { useState, useActionState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Hash, ArrowRight, Loader2, School, Search, ChevronDown, Check, Building2, Eye, EyeOff } from 'lucide-react';
import { loginAction } from '@/app/actions/auth';
import { api } from '@/services/api';
import { HanoledLogo } from '@/components/ui/HanoledLogo';
import { setAuthTokens } from '@/lib/auth-tokens';
import { RequiredPasswordChange } from '@/components/auth/RequiredPasswordChange';
import { TenantBranding, getTenantBranding } from '@/lib/tenant-branding';
import { generateTenantCssVariables, generateTenantStyleBlock } from '@/lib/theme-colors';

export type SignInAudience = 'all' | 'staff' | 'parent' | 'student';

export const AUDIENCE_COPY: Record<SignInAudience, { title: string; subtitle: string }> = {
  all: {
    title: 'Sign in to Hanoled Suite',
    subtitle: 'School Management, CBT Examinations, and Staff Portal.',
  },
  staff: {
    title: 'Staff & Admin sign in',
    subtitle: 'Your school dashboard: results, people and records.',
  },
  parent: {
    title: 'Parent sign in',
    subtitle: 'Follow your child’s results, homework and school life.',
  },
  student: {
    title: 'Candidate & pupil sign in',
    subtitle: 'Enter your school code and admission number to open your exams.',
  },
};

/** The tab each audience pins to (staff/parent use EMAIL; students log in by admission number). */
export const AUDIENCE_TAB: Record<Exclude<SignInAudience, 'all'>, 'EMAIL' | 'ADMISSION_NUMBER'> = {
  staff: 'EMAIL',
  parent: 'EMAIL',
  student: 'ADMISSION_NUMBER',
};

export default function SignInForm({
  audience = 'all',
  initialBranding = null,
}: {
  audience?: SignInAudience;
  initialBranding?: TenantBranding | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/welcome';
  const queryOrgSlug = searchParams.get('orgSlug') || searchParams.get('school') || '';

  const [branding, setBranding] = useState<TenantBranding | null>(initialBranding);

  // Students pin the admission-number tab; parents/staff pin the email tab;
  // the universal page keeps both tabs switchable.
  const pinnedTab = audience === 'all' ? null : AUDIENCE_TAB[audience];
  const [tab, setTab] = useState<'EMAIL' | 'ADMISSION_NUMBER'>(pinnedTab ?? (queryOrgSlug ? 'ADMISSION_NUMBER' : 'EMAIL'));
  const [schools, setSchools] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [selectedSchool, setSelectedSchool] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [schoolSearchQuery, setSchoolSearchQuery] = useState('');
  const [isSchoolPickerOpen, setIsSchoolPickerOpen] = useState(false);
  const [loadingSchools, setLoadingSchools] = useState(false);

  const [state, formAction, pending] = useActionState(loginAction, null);
  const [showPassword, setShowPassword] = useState(false);
  // "Back to sign in" from the new-password step hides that step for this token.
  const [abandonedChangeToken, setAbandonedChangeToken] = useState<string | null>(null);

  // Fetch or sync branding dynamically when queryOrgSlug or selected school changes
  useEffect(() => {
    const slugToResolve = queryOrgSlug || selectedSchool?.slug;
    if (!slugToResolve) {
      if (!initialBranding) setBranding(null);
      return;
    }
    if (branding?.slug.toLowerCase() === slugToResolve.toLowerCase()) return;

    let isMounted = true;
    getTenantBranding(slugToResolve).then((b) => {
      if (isMounted && b) {
        setBranding(b);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [queryOrgSlug, selectedSchool?.slug, initialBranding, branding?.slug]);

  // Load public organizations for discovery (only needed on generic portal with no school set).
  useEffect(() => {
    if (tab !== 'ADMISSION_NUMBER' || queryOrgSlug || branding) return;
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
  }, [tab, queryOrgSlug, selectedSchool]);

  // Handle school selection
  const handleSelectSchool = (school: { id: string; name: string; slug: string }) => {
    setSelectedSchool(school);
    setIsSchoolPickerOpen(false);
    localStorage.setItem('hanoled_student_school_slug', school.slug);
  };

  useEffect(() => {
    if (state && 'success' in state) {
      setAuthTokens({ hcoreToken: state.hcoreToken, hcbtToken: state.hcbtToken });
      router.push(state.redirectUrl);
    }
  }, [state, router]);

  const filteredSchools = schools.filter((s) =>
    s.name.toLowerCase().includes(schoolSearchQuery.toLowerCase()) ||
    s.slug.toLowerCase().includes(schoolSearchQuery.toLowerCase())
  );

  if (state && 'passwordChangeRequired' in state && state.changeToken !== abandonedChangeToken) {
    return (
      <div className={cardClass}>
        <RequiredPasswordChange
          changeToken={state.changeToken}
          context={state.context}
          onRestart={() => setAbandonedChangeToken(state.changeToken)}
        />
      </div>
    );
  }

  const copy = AUDIENCE_COPY[audience];

  return (
    <div className={`${cardClass} m-rise`}>
      <div className="m-stagger">
        {branding ? (
          <div className="flex flex-col items-center justify-center mb-5">
            {branding.logo ? (
              <div className="relative mb-3 flex items-center justify-center max-h-16 max-w-[200px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={branding.logo}
                  alt={branding.name}
                  className="max-h-16 w-auto object-contain drop-shadow-xs"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            ) : (
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg mb-3 shadow-xs"
                style={{
                  backgroundColor: branding.theme.primary,
                  color: branding.theme.foreground,
                }}
              >
                {branding.name.charAt(0).toUpperCase()}
              </div>
            )}

            <h1 className="text-2xl font-black text-center text-slate-900 tracking-tight mb-1">
              {branding.name}
            </h1>
            <p className="text-center text-xs sm:text-sm text-slate-500 mb-2">
              {audience === 'student'
                ? 'Candidate & pupil entrance'
                : audience === 'staff'
                ? 'Staff & Administrator portal'
                : audience === 'parent'
                ? 'Parent & Guardian entrance'
                : 'Sign in to access school records and portal'}
            </p>
          </div>
        ) : (
          <div>
            <div className="flex justify-center mb-4">
              <HanoledLogo size="lg" variant="blue" iconOnly />
            </div>

            <h1 className="text-2xl font-bold text-center text-slate-900 mb-1">
              {copy.title}
            </h1>
            <p className="text-center text-xs sm:text-sm text-slate-500 mb-6">
              {copy.subtitle}
            </p>
          </div>
        )}
      </div>

      {/* Role Tabs — only the universal page shows them; audience pages pin one */}
      {audience === 'all' && (
        <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl mb-5">
          <button
            type="button"
            onClick={() => setTab('EMAIL')}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
              tab === 'EMAIL'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Mail size={16} /> Staff / Admin
          </button>
          <button
            type="button"
            onClick={() => setTab('ADMISSION_NUMBER')}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
              tab === 'ADMISSION_NUMBER'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Hash size={16} /> Student / Candidate
          </button>
        </div>
      )}

      {state && 'error' in state && (
        <div role="alert" className="bg-rose-50 text-rose-600 p-3 rounded-lg text-xs sm:text-sm mb-4 flex flex-col gap-1 border border-rose-200">
          <span>{state.error}</span>
          {state.reference && (
            <span className="text-[11px] sm:text-xs">
              Reference: <span className="font-mono select-all break-all">{state.reference}</span>
            </span>
          )}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="identifierType" value={tab} />
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <input
          type="hidden"
          name="organizationSlugOrId"
          value={branding?.slug || selectedSchool?.slug || selectedSchool?.id || queryOrgSlug || schoolSearchQuery}
        />

        {/* STUDENT TAB: SCHOOL SELECTOR (Only shown on generic portal when no school is predetermined) */}
        {tab === 'ADMISSION_NUMBER' && !queryOrgSlug && !branding && (
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Target School / Organization
            </label>

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
                  className="min-h-11 shrink-0 cursor-pointer rounded-lg border border-blue-200 bg-white px-3 text-xs font-bold text-blue-700 hover:bg-blue-50"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsSchoolPickerOpen(!isSchoolPickerOpen)}
                  className="flex min-h-11 w-full items-center justify-between rounded-xl border border-slate-300 bg-white p-3 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 cursor-pointer"
                >
                  <div className="flex items-center space-x-2 text-slate-600 text-sm">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span>Select your school from list...</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                {isSchoolPickerOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-2 space-y-2 animate-fade-in">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        autoFocus
                        value={schoolSearchQuery}
                        onChange={(e) => setSchoolSearchQuery(e.target.value)}
                        placeholder="Search school by name or slug..."
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-base outline-none focus:ring-2 focus:ring-blue-600 md:text-sm"
                      />
                    </div>

                    <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                      {filteredSchools.length === 0 ? (
                        <div className="p-3 text-center text-sm text-slate-500">
                          {schoolSearchQuery ? (
                            <div>
                              <p>No registered school matches &quot;{schoolSearchQuery}&quot;.</p>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSchool({ id: schoolSearchQuery, name: schoolSearchQuery, slug: schoolSearchQuery });
                                  setIsSchoolPickerOpen(false);
                                }}
                                className="mt-1.5 min-h-11 text-blue-700 font-bold hover:underline"
                              >
                                Use &quot;{schoolSearchQuery}&quot; as custom code
                              </button>
                            </div>
                          ) : loadingSchools ? (
                            <div className="flex items-center justify-center gap-1.5 py-2 text-slate-600">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Loading registered schools...</span>
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
                            className="group flex min-h-11 w-full items-center justify-between rounded-lg p-3 text-left transition hover:bg-blue-50"
                          >
                            <div>
                              <div className="text-sm font-bold text-slate-800">{s.name}</div>
                              <div className="text-xs text-slate-500 font-mono">{s.slug}</div>
                            </div>
                            <Check className="w-4 h-4 text-blue-600 opacity-0 group-hover:opacity-100" />
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
            autoComplete={tab === 'EMAIL' ? 'email' : 'off'}
            className="w-full rounded-xl border border-slate-300 bg-white p-3 text-base text-slate-900 placeholder-slate-500 outline-none transition-all font-medium focus:border-blue-600 focus:ring-2 focus:ring-blue-600/25 sm:text-sm"
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
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              className="w-full rounded-xl border border-slate-300 bg-white p-3 pr-12 text-base text-slate-900 placeholder-slate-500 outline-none transition-all focus:border-blue-600 focus:ring-2 focus:ring-blue-600/25 sm:text-sm"
              placeholder="••••••••"
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

        <button
          type="submit"
          disabled={pending || (tab === 'ADMISSION_NUMBER' && !selectedSchool && !queryOrgSlug && !branding && !schoolSearchQuery)}
          className="mt-3 flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-sm font-bold shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50"
          style={
            branding
              ? {
                  backgroundColor: branding.theme.primary,
                  color: branding.theme.foreground,
                }
              : {
                  backgroundColor: '#1d4ed8',
                  color: '#ffffff',
                }
          }
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
        {branding ? (
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-slate-500">
              Need assistance signing in to <span className="font-semibold text-slate-700">{branding.name}</span>?
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span>Powered by</span>
              <Link href="/" className="inline-flex items-center gap-1 font-bold text-slate-600 hover:text-slate-800 transition-colors">
                <HanoledLogo size="sm" variant="blue" iconOnly />
                <span>Hanoled</span>
              </Link>
            </div>
          </div>
        ) : (
          <>
            <p className="text-xs text-slate-500">
              New school or organization?{' '}
              <Link
                href="/contact"
                className="text-blue-700 font-bold hover:underline pointer-coarse:inline-flex pointer-coarse:min-h-11 pointer-coarse:items-center"
              >
                Contact Support
              </Link>
            </p>
            {audience === 'all' && (
              <p className="mt-1 flex flex-wrap items-center justify-center gap-x-1 text-xs text-slate-500">
                Straight to your entrance:
                <Link href="/signin/staff" className="inline-flex min-h-11 items-center px-1 text-blue-700 font-bold hover:underline">Staff</Link>
                <span aria-hidden="true">·</span>
                <Link href="/signin/parent" className="inline-flex min-h-11 items-center px-1 text-blue-700 font-bold hover:underline">Parent</Link>
                <span aria-hidden="true">·</span>
                <Link href="/signin/student" className="inline-flex min-h-11 items-center px-1 text-blue-700 font-bold hover:underline">Student</Link>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const cardClass =
  'w-full max-w-md rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] sm:rounded-[2rem] sm:p-10 relative z-10';

/**
 * Shared page frame for every auth route (decorative background + Suspense).
 *
 * The frame is deliberately not `overflow-hidden`: on a short phone the card
 * is taller than the viewport, and clipping the page hid the top of the form
 * (and the bottom once the keyboard opened). The decoration is clipped in its
 * own layer instead, and the page keeps scrolling.
 */
export function SignInShell({
  children,
  branding,
}: {
  children: React.ReactNode;
  branding?: TenantBranding | null;
}) {
  const tenantVars = branding ? generateTenantCssVariables(branding.theme) : undefined;

  return (
    <div
      data-school-theme
      className="relative min-h-dvh overflow-x-clip bg-slate-50"
      style={tenantVars as unknown as React.CSSProperties}
    >
      {branding && (
        <style
          dangerouslySetInnerHTML={{
            __html: generateTenantStyleBlock(":root, [data-school-theme]", branding.theme),
          }}
        />
      )}
      {/* Decorative Background Elements */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_2px,transparent_2px)] [background-size:32px_32px] opacity-70" />
        <div
          className="absolute -top-40 -left-40 h-96 w-96 rounded-full opacity-30 mix-blend-multiply blur-[100px] animate-blob"
          style={{ backgroundColor: branding ? branding.theme.light : '#93c5fd' }}
        />
        <div
          className="absolute top-1/4 -right-20 h-80 w-80 rounded-full opacity-25 mix-blend-multiply blur-[100px] animate-blob animation-delay-2000"
          style={{ backgroundColor: branding ? branding.theme.primary : '#3b82f6' }}
        />
        <div
          className="absolute -bottom-40 left-1/4 h-96 w-96 rounded-full opacity-25 mix-blend-multiply blur-[100px] animate-blob animation-delay-4000"
          style={{ backgroundColor: branding ? branding.theme.light : '#60a5fa' }}
        />
      </div>

      <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-4 py-8 sm:p-6">
        {children}
      </div>
    </div>
  );
}
