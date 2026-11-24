import { toast } from "sonner";
import { COOKIE_AUTH, getHcoreToken, getHcbtToken, setAuthTokens } from "./auth-tokens";

import { HCORE_BASE, HSMS_BASE, EDGE_MODE, HCBT_BASE } from "./api-endpoints";
export { HCORE_BASE, HSMS_BASE, EDGE_MODE, HCBT_BASE };

export type RequestOptions = RequestInit & {
  params?: Record<string, string | number | boolean | undefined>;
  showErrorToast?: boolean;
  /** Internal: set when replaying a request after the access token was refreshed. */
  retried?: boolean;
};

export interface ApiErrorResponse {
  error: string;
  message?: string;
  code?: string;
  issues?: unknown[];
  details?: unknown[];
}

interface ValidationIssueLike {
  message?: unknown;
  path?: unknown;
}

function formatApiErrorMessage(data: Record<string, unknown>, fallback: string): string {
  const rawError = data.error;
  const baseMsg =
    typeof rawError === "string"
      ? rawError
      : rawError && typeof rawError === "object" && "message" in rawError && typeof rawError.message === "string"
        ? rawError.message
        : typeof data.message === "string"
          ? data.message
          : fallback;

  if (baseMsg !== "Validation error") {
    return baseMsg;
  }

  const issueList = Array.isArray(data.issues)
    ? data.issues
    : Array.isArray(data.details)
      ? data.details
      : [];
  const first = issueList[0] as ValidationIssueLike | undefined;
  const detailMsg =
    first && typeof first.message === "string" && first.message.trim()
      ? first.message.trim()
      : "";
  if (!detailMsg) {
    return baseMsg;
  }
  const path =
    first && Array.isArray(first.path) && first.path.length > 0
      ? first.path.map(String).join(".")
      : "";
  return path ? `${baseMsg}: ${path} — ${detailMsg}` : `${baseMsg}: ${detailMsg}`;
}

export type ApiFetchError = Error & {
  status?: number;
  details?: ApiErrorResponse | unknown;
  code?: string;
};

// A 403 means the viewer is authenticated but not allowed to see this
// resource — a permission boundary working as intended, not a bug. Pages
// should show that distinctly from a genuine failure (500, network error),
// since the same generic "couldn't load" card for both makes a correct
// access check look like broken functionality.
export function isForbiddenError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as ApiFetchError).status === 403;
}

/**
 * True when the token is already dead or dies within the next minute. The
 * signature is never checked here — this only decides when to refresh early.
 */
function tokenExpiresSoon(token: string, withinMs = 60_000): boolean {
  try {
    const payload = token.split(".")[1];
    if (!payload) return false;
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json.exp === "number" && json.exp * 1000 - withinMs <= Date.now();
  } catch {
    return false;
  }
}

const REFRESH_RETRY_AFTER_MS = 20_000;
const SESSION_TIMEOUT_MS = 8_000;
const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;
const FORM_REQUEST_TIMEOUT_MS = 60_000;

function timeoutSignal(ms: number): AbortSignal | undefined {
  return typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
    ? AbortSignal.timeout(ms)
    : undefined;
}

let refreshAttemptedAt = 0;
let refreshInFlight: Promise<string | null> | null = null;

/**
 * Mint a fresh HCORE access token from the refresh-token cookie.
 *
 * HCORE rotates the refresh token on every use, so concurrent calls must share
 * one attempt: two parallel refreshes would invalidate each other and leave the
 * browser holding a token HCORE no longer recognises.
 */
export function refreshHcoreSession(): Promise<string | null> {
  if (typeof window === "undefined" || EDGE_MODE) return Promise.resolve(null);
  // A refresh that just failed is not worth retrying for every poll tick.
  if (!refreshInFlight && Date.now() - refreshAttemptedAt < REFRESH_RETRY_AFTER_MS) {
    return Promise.resolve(null);
  }
  if (!refreshInFlight) {
    refreshAttemptedAt = Date.now();
    refreshInFlight = mintAccessToken().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function mintAccessToken(): Promise<string | null> {
  try {
    // 1. Try our same-origin /api/session first (shares httpOnly session & refresh cookies)
    const sessionRes = await fetch("/api/session", {
      method: "GET",
      credentials: "include",
      headers: { "Cache-Control": "no-cache" },
      signal: timeoutSignal(SESSION_TIMEOUT_MS),
    }).catch(() => null);

    if (sessionRes && sessionRes.ok) {
      const data = await sessionRes.json().catch(() => null);
      if (data?.authenticated && typeof data.token === "string" && data.token) {
        setAuthTokens({ hcoreToken: data.token, hcbtToken: data?.hcbtToken });
        refreshAttemptedAt = 0;
        return data.token;
      }
    }

    // 2. Direct HCORE refresh fallback (for localhost / same-domain environments & unit tests)
    const res = await fetch(`${HCORE_BASE}/v1/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
      signal: timeoutSignal(SESSION_TIMEOUT_MS),
    }).catch(() => null);

    if (res && res.ok) {
      const data = await res.json().catch(() => null);
      const token = typeof data?.token === "string" ? data.token : "";
      if (token) {
        setAuthTokens({ hcoreToken: token });
        // proxy.ts reads Hweb's own httpOnly copy on the next navigation, and it
        // can only be refreshed from the server, so hand it the new token.
        await fetch("/api/session", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, refreshToken: data?.refreshToken }),
          signal: timeoutSignal(SESSION_TIMEOUT_MS),
        }).catch(() => null);

        refreshAttemptedAt = 0;
        return token;
      }
    }

    return null;
  } catch {
    return null;
  }
}

function buildHeaders(headers: HeadersInit | undefined, isFormData: boolean) {  const mergedHeaders = new Headers();
  if (!isFormData) mergedHeaders.set("Content-Type", "application/json");
  if (!headers) return mergedHeaders;

  const appendHeader = (key: string, value: string | undefined | null) => {
    if (value == null) return;
    mergedHeaders.set(key, String(value));
  };

  if (headers instanceof Headers) {
    headers.forEach((value, key) => appendHeader(key, value));
    return mergedHeaders;
  }
  if (Array.isArray(headers)) {
    headers.forEach(([key, value]) => appendHeader(key, value));
    return mergedHeaders;
  }
  Object.entries(headers).forEach(([key, value]) =>
    appendHeader(key, value as string | undefined | null)
  );

  return mergedHeaders;
}

export async function request<T>(baseUrl: string, endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, showErrorToast = true, retried = false, ...rest } = options;

  let url = `${baseUrl}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, String(value));
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const isFormData = rest.body instanceof FormData;
  const requestHeaders = buildHeaders(headers, isFormData);

  // HCORE/HSMS/HCBT live on *.hanoled.com, a different registrable domain
  // than the Hweb frontend, so session cookies can't cross that boundary.
  // Attach the bearer token explicitly instead (backends accept both).
  if (!requestHeaders.has("Authorization")) {
    const hcbtToken = baseUrl === HCBT_BASE ? getHcbtToken() : null;
    if (hcbtToken && tokenExpiresSoon(hcbtToken) && typeof window !== "undefined") {
      try {
        localStorage.removeItem("hanoled_hcbt_token");
      } catch {}
    }
    let token =
      (baseUrl === HCBT_BASE && hcbtToken && !tokenExpiresSoon(hcbtToken) ? hcbtToken : null) ||
      getHcoreToken();
    if (!token && !COOKIE_AUTH && typeof window !== "undefined" && !EDGE_MODE) {
      token = await refreshHcoreSession();
    }
    if (token) {
      // HCORE's access token lives one hour. Refresh it before it lapses rather
      // than spending a round trip on a guaranteed 401 — this also keeps the
      // session cookie proxy.ts reads in step while the tab stays open.
      const usable = tokenExpiresSoon(token) ? await refreshHcoreSession() : token;
      requestHeaders.set("Authorization", `Bearer ${usable || token}`);
    }
  }

  try {
    const response = await fetch(url, {
      credentials: "include",
      headers: requestHeaders,
      ...rest,
      signal: rest.signal ?? timeoutSignal(isFormData ? FORM_REQUEST_TIMEOUT_MS : DEFAULT_REQUEST_TIMEOUT_MS),
    });

    const isAuthPath = ["/v1/auth/login", "/v1/auth/register", "/v1/auth/refresh", "/auth/refresh", "/auth/logout"].some((p) =>
      endpoint.includes(p)
    );

    if (!response.ok) {
      if (response.status === 401 && !isAuthPath) {
        if (EDGE_MODE) {
          // No HCORE to refresh against offline — the local session is simply over.
          if (typeof window !== "undefined" && !window.location.pathname.startsWith("/signin")) {
            window.location.href = "/signin/";
          }
        } else if (!retried) {
          if (baseUrl === HCBT_BASE && typeof window !== "undefined") {
            try {
              localStorage.removeItem("hanoled_hcbt_token");
            } catch {}
          }
          // The access token is short-lived, and every backend checks it: a
          // satellite call (HSMS, HCBT) used to fail here while HCORE alone
          // tried to recover. Mint a new one and replay the request once.
          const fresh = await refreshHcoreSession();
          if (fresh) {
            return request<T>(baseUrl, endpoint, { ...options, retried: true });
          }

          // Refresh failed — the session itself is gone (key rotation, a
          // revoked tokenVersion/credentialVersion, signed out elsewhere).
          // Route through /api/logout so the cookie is actually cleared
          // server-side instead of just navigating to /signin: proxy.ts treats
          // a present-but-unverifiable cookie as "logged in" and bounces
          // /signin -> /welcome -> (another 401) -> /signin forever, which
          // otherwise leaves no way back to the login form.
          //
          // Silent background polls must never end the session on a blip — they
          // just report the failure to their caller.
          if (showErrorToast && typeof window !== "undefined") {
            const currentPath = window.location.pathname;
            const publicRoutes = ["/signin", "/signup", "/forgot-password", "/reset-password", "/verify", "/accept-invite"];
            // A 401 from a satellite product (HCBT) must NEVER log the user out of their core session.
            if (baseUrl !== HCBT_BASE && !publicRoutes.some((route) => currentPath.startsWith(route))) {
              window.location.href = "/api/logout";
            }
          }
        }
      }

      // Handle standard error schema
      const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      const errMsg = formatApiErrorMessage(data, response.statusText);
      const error = new Error(errMsg) as ApiFetchError;
      error.status = response.status;
      error.code = typeof data.code === "string" ? data.code : undefined;
      error.details = data.issues || data.details || data;

      if (showErrorToast && response.status !== 401) {
        toast.error(error.message || "An unexpected error occurred");
      }
      throw error;
    }

    return await response.json().catch(() => ({})) as T;
  } catch (error: unknown) {
    const isTimeout = error instanceof Error && error.name === "TimeoutError";
    const resolvedError = isTimeout ? new Error("Request timed out. Please try again.") : error;
    const apiError = resolvedError as ApiFetchError;
    if (showErrorToast && !apiError.status && !(resolvedError instanceof Error && apiError.status === 401)) {
      toast.error(apiError.message || "Connection failed. Please check your internet.");
    }
    throw resolvedError;
  }
}

// Backward compatibility helper for HSMS-focused legacy components
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return request<T>(HSMS_BASE, path, options);
}
