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

  const rawToken =
    request.cookies.get('hcore_session')?.value ||
    request.cookies.get('hcbt_session')?.value ||
    request.cookies.get('accessToken')?.value;
  const token = rawToken && isLikelyValidToken(rawToken) ? rawToken : undefined;

  // 1. If accessing a protected route without a token, redirect to login
  if (isProtectedRoute && !token) {
    const url = new URL('/signin', request.url);
    // Add the original URL so we can redirect them back after login if needed
    url.searchParams.set('callbackUrl', request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // 2. If logged in and trying to access login/register, honor callbackUrl or redirect to welcome hub
  if (isAuthRoute && token) {
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
