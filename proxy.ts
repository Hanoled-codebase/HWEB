import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Add the routes that require authentication
const protectedRoutes = ['/dashboard', '/cbt/admin'];

// Add routes that are only accessible when unauthenticated (like login)
const authRoutes = ['/signin', '/signup'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));
  
  const token = request.cookies.get('hcore_session')?.value;

  // 1. If accessing a protected route without a token, redirect to login
  if (isProtectedRoute && !token) {
    const url = new URL('/signin', request.url);
    // Add the original URL so we can redirect them back after login if needed
    url.searchParams.set('callbackUrl', encodeURI(request.url));
    return NextResponse.redirect(url);
  }

  // 2. If logged in and trying to access login/register, redirect to dashboard
  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Apply middleware to all routes except api, _next/static, _next/image, and favicon
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg$).*)'],
};
