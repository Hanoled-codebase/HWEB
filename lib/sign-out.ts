// Signing in opens a session in HCORE and one in HCBT, and Hweb keeps its own
// httpOnly copies of both (hcore_session / hcbt_session, set by loginAction).
// Signing out has to end every one of them: proxy.ts treats a surviving session
// cookie as "logged in", so a leftover one sends /signin to /welcome, which
// sends it straight back (ERR_TOO_MANY_REDIRECTS, no way to reach the form).
//
// HSMS is the third backend holding a session, and the one Hweb cannot clean up
// by itself: its cookies (a legacy `accessToken`, `refreshToken`) are host-only
// to api.hanoled.com, so a `cookieStore.delete` here reaches the wrong domain.
// Only HSMS can expire them, by answering a logout call with Set-Cookie — so we
// ask. This also retires the stale `accessToken` that used to shadow the HCORE
// bearer token (see Hanoled middleware/verifyJwt.js).

import { request, HCORE_BASE, HSMS_BASE, EDGE_MODE } from "./api";
import { cbtApi } from "./api-cbt";
import { clearAuthTokens } from "./auth-tokens";

// A backend that is down or slow must never keep the browser signed in.
const BACKEND_LOGOUT_TIMEOUT_MS = 4000;

// /api/logout clears Hweb's own cookies and redirects to /signin. The static
// edge build has no server routes, and its only session is HCBT's.
const SIGNED_OUT_URL = EDGE_MODE ? "/signin/" : "/api/logout";

/**
 * Best-effort: asks HCORE, HCBT and HSMS to end their sessions, then forgets
 * the stored bearer tokens. Never throws.
 */
export async function endBackendSessions(): Promise<void> {
  const options = {
    method: "POST",
    showErrorToast: false,
    signal: AbortSignal.timeout(BACKEND_LOGOUT_TIMEOUT_MS),
  };
  await Promise.allSettled([
    // The edge appliance runs offline, with no HCORE or HSMS to reach — and a
    // 4s timeout on each would stall sign-out before it navigates away.
    EDGE_MODE ? Promise.resolve() : request(HCORE_BASE, "/v1/auth/logout", options),
    cbtApi.logout(options),
    EDGE_MODE ? Promise.resolve() : request(HSMS_BASE, "/auth/logout", options),
  ]);
  // Cleared last: in bearer mode the calls above authenticate with these tokens.
  clearAuthTokens();
}

/** Leaves the app through the route that clears Hweb's own session cookies. */
export function leaveSignedOut(): void {
  window.location.assign(SIGNED_OUT_URL);
}

/** Ends every session this browser holds and lands on the sign-in page. */
export async function signOutEverywhere(): Promise<void> {
  await endBackendSessions();
  leaveSignedOut();
}
