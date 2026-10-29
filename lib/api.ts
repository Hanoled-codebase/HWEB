import { toast } from "sonner";
import { getHcoreToken, getHcbtToken, setAuthTokens } from "./auth-tokens";

export const HCORE_BASE = process.env.NEXT_PUBLIC_HCORE_URL || 'http://localhost:4000';
export const HSMS_BASE = process.env.NEXT_PUBLIC_HSMS_URL || 'http://localhost:3001';
// The HCBT Edge Appliance serves this UI itself, so its API is same-origin.
export const EDGE_MODE = process.env.NEXT_PUBLIC_EDGE_MODE === "1";
export const HCBT_BASE = EDGE_MODE ? '' : (process.env.NEXT_PUBLIC_HCBT_URL || 'http://localhost:4002');

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
    const res = await fetch(`${HCORE_BASE}/v1/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!res.ok) return null;

    const data = await res.json().catch(() => null);
    const token = typeof data?.token === "string" ? data.token : "";
    if (!token) return null;

    setAuthTokens({ hcoreToken: token });
    // proxy.ts reads Hweb's own httpOnly copy on the next navigation, and it
    // can only be refreshed from the server, so hand it the new token.
    await fetch("/api/session", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, refreshToken: data?.refreshToken }),
    }).catch(() => null);

    refreshAttemptedAt = 0;
    return token;
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
    const token = (baseUrl === HCBT_BASE ? getHcbtToken() : null) || getHcoreToken();
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
      const data = await response.json().catch(() => ({}));
      const errMsg = typeof data.error === "string" ? data.error : data.error?.message || data.message || response.statusText;
      const error = new Error(errMsg) as ApiFetchError;
      error.status = response.status;
      error.code = data.code;
      error.details = data.issues || data.details || data;

      if (showErrorToast && response.status !== 401) {
        toast.error(error.message || "An unexpected error occurred");
      }
      throw error;
    }

    return await response.json().catch(() => ({})) as T;
  } catch (error: unknown) {
    const apiError = error as ApiFetchError;
    if (showErrorToast && !apiError.status && !(error instanceof Error && apiError.status === 401)) {
      toast.error(apiError.message || "Connection failed. Please check your internet.");
    }
    throw error;
  }
}

// Backward compatibility helper for HSMS-focused legacy components
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return request<T>(HSMS_BASE, path, options);
}
