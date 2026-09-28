import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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
  try {
    const payload = token.split('.')[1];
    if (!payload) return true; // not a JWT (e.g. an opaque session id) — treat as valid, let the API be the source of truth
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    if (typeof decoded.exp !== 'number') return true;
    return decoded.exp * 1000 > Date.now();
  } catch {
    return true;
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
  // Only an HCORE session counts as signed in on /signin: /welcome, where the
  // redirect below lands, requires one, so a leftover HCBT cookie (e.g. after a
  // logout that only reached HCORE) would bounce /signin <-> /welcome forever.
  const hasHcoreSession = Boolean(liveCookie('hcore_session'));

  // 1. If accessing a protected route without a token, redirect to login
  if (isProtectedRoute && !token) {
    const url = new URL('/signin', request.url);
    // Add the original URL so we can redirect them back after login if needed
    url.searchParams.set('callbackUrl', request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // 2. If logged in and trying to access login/register, honor callbackUrl or redirect to welcome hub
  if (isAuthRoute && hasHcoreSession) {
    const callbackUrl = request.nextUrl.searchParams.get('callbackUrl');
    if (callbackUrl && callbackUrl.startsWith('/')) {
      return NextResponse.redirect(new URL(callbackUrl, request.url));
    }
    return NextResponse.redirect(new URL('/welcome', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Apply middleware to all routes except api, _next/static, _next/image, and favicon
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
