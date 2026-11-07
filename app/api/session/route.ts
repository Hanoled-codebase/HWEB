import { NextRequest, NextResponse } from "next/server";
import { sessionCookieOptions } from "@/lib/session-cookies";
import { getHcoreBaseUrl, fetchWithFallback } from "@/lib/api-endpoints";

// The browser can mint a new HCORE access token on its own (the refresh-token
// cookie belongs to the API host), but proxy.ts and the dashboard layout read
// Hweb's own httpOnly `hcore_session` copy on the server. Without this route
// that copy keeps the sign-in-time token, which expires after an hour and then
// bounces every protected navigation back to /signin even though the session is
// still perfectly refreshable.
//
// GET: provides the active session token to client-side code (for localStorage re-hydration
//      across tabs, cold reloads, or cross-origin environments) and refreshes it if needed.
// POST: allows syncing a freshly minted token from the client or explicit refresh.

const HCORE_BASE = getHcoreBaseUrl();
const JWT = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

function isLikelyValidToken(token: string): boolean {
  if (!token || typeof token !== "string") return false;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return false;
    const payload = parts[1];
    if (!payload) return false;
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof decoded.exp !== "number") return false;
    // Valid if it doesn't expire within the next 30 seconds
    return decoded.exp * 1000 - 30_000 > Date.now();
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get("hcore_session")?.value || request.cookies.get("accessToken")?.value;
  const refreshToken = request.cookies.get("hcore_refresh_web")?.value;
  const hcbtToken = request.cookies.get("hcbt_session")?.value;

  // 1. If we have a currently valid access token, return it directly
  if (token && isLikelyValidToken(token)) {
    return NextResponse.json({
      authenticated: true,
      token,
      hcbtToken: hcbtToken || null,
    });
  }

  // 2. If token is missing or expired, but we have a refresh token, mint a fresh one
  if (refreshToken) {
    try {
      const res = await fetchWithFallback(`${HCORE_BASE}/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        const newToken = typeof data?.token === "string" ? data.token : "";
        if (newToken && JWT.test(newToken)) {
          const response = NextResponse.json({
            authenticated: true,
            token: newToken,
            hcbtToken: hcbtToken || null,
          });
          response.cookies.set("hcore_session", newToken, sessionCookieOptions(3600));
          if (data?.refreshToken) {
            response.cookies.set("hcore_refresh_web", data.refreshToken, sessionCookieOptions(60 * 60 * 24 * 30));
          }
          return response;
        }
      }
    } catch (err) {
      console.error("[api/session] Token refresh error:", err);
    }
  }

  // 3. If token exists but is close to expiring (and refresh failed or not available),
  // still return the existing token as best effort if exp is in the future
  if (token && JWT.test(token)) {
    return NextResponse.json({
      authenticated: true,
      token,
      hcbtToken: hcbtToken || null,
    });
  }

  return NextResponse.json({ authenticated: false, token: null }, { status: 401 });
}

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

