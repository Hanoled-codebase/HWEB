import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isSafeRedirectUrl } from '@/lib/safe-redirect';

// Add the routes that require authentication
const protectedRoutes = ['/dashboard', '/cbt/admin'];

// Add routes that are only accessible when unauthenticated (like login)
const authRoutes = ['/signin', '/signup'];

// A present-but-expired JWT must not count as "logged in" here — otherwise an
// expired session cookie makes /signin permanently redirect away (to /welcome,
// which for a STUDENT bounces into /cbt/student, whose own auth check 401s and
// redirects back to /signin) with no way for the user to ever reach the login
// form again. This only reads the unverified `exp` claim to break that loop;
// real verification still happens server-side on every API call.
function isLikelyValidToken(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return false;
    const payload = parts[1];
    if (!payload) return false;
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    if (typeof decoded.exp !== 'number') return false;
    return decoded.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  const liveCookie = (name: string) => {
    const value = request.cookies.get(name)?.value;
    return value && isLikelyValidToken(value) ? value : undefined;
  };
  // Protected pages accept any live session: the CBT console runs on HCBT's alone.
  const token = liveCookie('hcore_session') || liveCookie('hcbt_session') || liveCookie('accessToken');
  // HCORE's access token lasts an hour, but the session behind it lasts thirty
  // days and the browser can mint a new one from the refresh-token cookie. A
  // page load that arrives after the hour on a protected route is still signed in: let it
  // through, and the app refreshes on its first API call (or this route's own
  // /api/session) instead of throwing the person back to the sign-in form
  // mid-task.
  const canRenewHcoreSession = Boolean(request.cookies.get('hcore_refresh_web')?.value);
  // Only an actual live HCORE token counts as signed-in for auth pages.
  // We do NOT use `canRenewHcoreSession` here because /welcome requires a live
  // `hcore_session` token to render. If the session has expired and only the
  // refresh cookie remains, redirecting to /welcome causes an infinite loop:
  // /welcome sees no token and redirects to /signin, which redirects to /welcome.
  // Furthermore, if the user explicitly supplies tenant parameters like `orgSlug`
  // or `school`, they are attempting to view or use that specific school's sign-in
  // portal, so we let them reach the sign-in form.
  const hasLiveHcoreSession = Boolean(liveCookie('hcore_session')) || Boolean(liveCookie('accessToken'));
  const hasExplicitTenant = request.nextUrl.searchParams.has('orgSlug') || request.nextUrl.searchParams.has('school');
  const hasHcoreSession = hasLiveHcoreSession && !hasExplicitTenant;

  // 1. If accessing a protected route without a token, redirect to login
  if (isProtectedRoute && !token && !canRenewHcoreSession) {
    const url = new URL('/signin', request.url);
    // Add the original URL so we can redirect them back after login if needed
    url.searchParams.set('callbackUrl', request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // 2. If logged in and trying to access generic login/register, honor callbackUrl or redirect to welcome hub
  if (isAuthRoute && hasHcoreSession) {
    const callbackUrl = request.nextUrl.searchParams.get('callbackUrl');
    if (isSafeRedirectUrl(callbackUrl) && callbackUrl !== '/welcome' && !authRoutes.some((r) => callbackUrl.startsWith(r))) {
      return NextResponse.redirect(new URL(callbackUrl, request.url));
    }
    // Only bounce generic /signin or /signup to /welcome (or directly to the
    // school dashboard for parents, who never see the suite welcome screen).
    // If a user is intentionally visiting an explicit entrance like /signin/staff, /signin/student, /signin/parent,
    // let them reach the sign-in form.
    if (pathname === '/signin' || pathname === '/signup') {
      const candidateRedirect = request.cookies.get('hweb_candidate_redirect')?.value;
      if (isSafeRedirectUrl(candidateRedirect) && candidateRedirect !== '/welcome') {
        return NextResponse.redirect(new URL(candidateRedirect, request.url));
      }
      const parentRedirect = request.cookies.get('hweb_parent_redirect')?.value;
      if (isSafeRedirectUrl(parentRedirect) && parentRedirect !== '/welcome') {
        return NextResponse.redirect(new URL(parentRedirect, request.url));
      }
      const userRole = request.cookies.get('hweb_user_role')?.value;
      if (userRole === 'PARENT') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      if (userRole === 'STUDENT') {
        const primarySlug = request.cookies.get('hweb_primary_org_slug')?.value;
        const allowed = (request.cookies.get('hweb_allowed_platforms')?.value || '').split(',').filter(Boolean);
        if (allowed.includes('HSMS')) {
          return NextResponse.redirect(new URL(primarySlug ? `/dashboard/school/${encodeURIComponent(primarySlug)}` : '/dashboard', request.url));
        }
        return NextResponse.redirect(new URL('/cbt/student', request.url));
      }
      return NextResponse.redirect(new URL('/welcome', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Only run edge middleware on routes proxy.ts actually inspects (protected & auth routes).
  matcher: ['/dashboard/:path*', '/cbt/admin/:path*', '/signin/:path*', '/signup/:path*'],
};
