import { NextRequest, NextResponse } from "next/server";

// A plain Route Handler (not the "use server" logoutAction) so the client-side
// 401 handler in lib/api.ts can reach it via a normal navigation. It exists
// because a session cookie can look valid to proxy.ts (unexpired `exp` claim)
// while actually failing real verification downstream (key rotation, or a
// revoked tokenVersion/credentialVersion) — redirecting straight to /signin
// without clearing the cookie left that cookie in place, so proxy.ts treated
// the still-present cookie as "logged in" and bounced back into the app,
// which hit the same 401 again: an infinite /signin <-> /welcome loop.
export async function GET(request: NextRequest) {
  const url = new URL("/signin", request.url);
  const response = NextResponse.redirect(url);
  for (const name of ["hcore_session", "hcbt_session", "hweb_allowed_platforms", "hweb_user_role", "accessToken"]) {
    response.cookies.delete(name);
  }
  return response;
}
