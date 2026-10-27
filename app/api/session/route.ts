import { NextRequest, NextResponse } from "next/server";
import { sessionCookieOptions } from "@/lib/session-cookies";

// The browser can mint a new HCORE access token on its own (the refresh-token
// cookie belongs to the API host), but proxy.ts and the dashboard layout read
// Hweb's own httpOnly `hcore_session` copy on the server. Without this route
// that copy keeps the sign-in-time token, which expires after an hour and then
// bounces every protected navigation back to /signin even though the session is
// still perfectly refreshable.
//
// It only accepts a token the browser already holds, and the token is still
// verified downstream on every API call — this sets a cookie, not a trust.

const JWT = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";
  const refreshToken = typeof body?.refreshToken === "string" ? body.refreshToken : "";

  if (!JWT.test(token)) {
    return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("hcore_session", token, sessionCookieOptions(3600));
  if (refreshToken) {
    response.cookies.set("hcore_refresh_web", refreshToken, sessionCookieOptions(60 * 60 * 24 * 30));
  }
  return response;
}
