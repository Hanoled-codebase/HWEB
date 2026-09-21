// How the browser authenticates to the backends (HCORE / HSMS / HCBT).
//
// "bearer" (default): the tokens are kept in localStorage and sent in an
//   Authorization header. Needed while Hweb and the APIs are on different
//   registrable domains (e.g. hweb-*.vercel.app -> *.hanoled.com), because the
//   httpOnly session cookies Hweb sets can never be sent to the APIs. The cost:
//   any XSS bug can read the tokens and take over the session.
//
// "cookie" (NEXT_PUBLIC_AUTH_MODE=cookie): the tokens live only in httpOnly
//   cookies that JavaScript cannot read. Login never returns them to the
//   browser, nothing is written to localStorage, and any token left over from
//   bearer mode is deleted. Requires Hweb to be served from the same parent
//   domain as the APIs (e.g. app.hanoled.com) with AUTH_COOKIE_DOMAIN=.hanoled.com
//   (see lib/session-cookies.ts). The backends already accept the cookies and
//   check the request Origin on cookie-authenticated mutations.

export const COOKIE_AUTH = process.env.NEXT_PUBLIC_AUTH_MODE === "cookie";

const HCORE_TOKEN_KEY = "hanoled_hcore_token";
const HCBT_TOKEN_KEY = "hanoled_hcbt_token";

function removeStoredTokens() {
  try {
    localStorage.removeItem(HCORE_TOKEN_KEY);
    localStorage.removeItem(HCBT_TOKEN_KEY);
  } catch {
    // Storage may be unavailable (private mode); nothing to remove then.
  }
}

// Switching to cookie mode must not leave existing users' old tokens sitting
// in localStorage where an XSS bug could still read them.
if (COOKIE_AUTH && typeof window !== "undefined") removeStoredTokens();

export function setAuthTokens(tokens: { hcoreToken?: string | null; hcbtToken?: string | null }) {
  if (typeof window === "undefined") return;
  if (COOKIE_AUTH) {
    removeStoredTokens();
    return;
  }
  if (tokens.hcoreToken) localStorage.setItem(HCORE_TOKEN_KEY, tokens.hcoreToken);
  if (tokens.hcbtToken) localStorage.setItem(HCBT_TOKEN_KEY, tokens.hcbtToken);
}

export function getHcoreToken(): string | null {
  if (typeof window === "undefined" || COOKIE_AUTH) return null;
  return localStorage.getItem(HCORE_TOKEN_KEY);
}

export function getHcbtToken(): string | null {
  if (typeof window === "undefined" || COOKIE_AUTH) return null;
  return localStorage.getItem(HCBT_TOKEN_KEY);
}

export function clearAuthTokens() {
  if (typeof window === "undefined") return;
  removeStoredTokens();
}

/**
 * The `fetch` options that authenticate a request to a backend, in whichever
 * mode is active: the session cookie always rides along (`credentials`), and
 * in bearer mode the stored token is added as an Authorization header.
 * Use this for any direct `fetch` (blob downloads, uploads) that bypasses
 * `request()` in lib/api.ts.
 */
export function authFetchInit(kind: "hcore" | "hcbt"): {
  credentials: "include";
  headers: Record<string, string>;
} {
  const token = kind === "hcbt" ? getHcbtToken() : getHcoreToken();
  return { credentials: "include", headers: token ? { Authorization: `Bearer ${token}` } : {} };
}
