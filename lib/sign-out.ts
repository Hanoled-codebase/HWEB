// Signing in opens a session in HCORE and one in HCBT, and Hweb keeps its own
// httpOnly copies of both (hcore_session / hcbt_session, set by loginAction).
// Signing out has to end every one of them: proxy.ts treats a surviving session
// cookie as "logged in", so a leftover one sends /signin to /welcome, which
// sends it straight back (ERR_TOO_MANY_REDIRECTS, no way to reach the form).

import { request, HCORE_BASE, EDGE_MODE } from "./api";
import { cbtApi } from "./api-cbt";
import { clearAuthTokens } from "./auth-tokens";

// A backend that is down or slow must never keep the browser signed in.
const BACKEND_LOGOUT_TIMEOUT_MS = 4000;

// /api/logout clears Hweb's own cookies and redirects to /signin. The static
// edge build has no server routes, and its only session is HCBT's.
const SIGNED_OUT_URL = EDGE_MODE ? "/signin/" : "/api/logout";

/**
 * Best-effort: asks HCORE and HCBT to end their sessions, then forgets the
 * stored bearer tokens. Never throws.
 */
export async function endBackendSessions(): Promise<void> {
  const options = {
    method: "POST",
    showErrorToast: false,
    signal: AbortSignal.timeout(BACKEND_LOGOUT_TIMEOUT_MS),
  };
  await Promise.allSettled([
    // The edge appliance runs offline, with no HCORE to reach.
    EDGE_MODE ? Promise.resolve() : request(HCORE_BASE, "/v1/auth/logout", options),
    cbtApi.logout(options),
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
