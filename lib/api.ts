import { toast } from "sonner";
import { getHcoreToken, getHcbtToken } from "./auth-tokens";

export const HCORE_BASE = process.env.NEXT_PUBLIC_HCORE_URL || 'http://localhost:4000';
export const HSMS_BASE = process.env.NEXT_PUBLIC_HSMS_URL || 'http://localhost:3001';
export const HCBT_BASE = process.env.NEXT_PUBLIC_HCBT_URL || 'http://localhost:4002';

export type RequestOptions = RequestInit & {
  params?: Record<string, string | number | boolean | undefined>;
  showErrorToast?: boolean;
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

function buildHeaders(headers: HeadersInit | undefined, isFormData: boolean) {
  const mergedHeaders = new Headers();
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
  const { params, headers, showErrorToast = true, ...rest } = options;

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
    const token = baseUrl === HCBT_BASE ? getHcbtToken() : getHcoreToken();
    if (token) requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  try {
    const response = await fetch(url, {
      credentials: "include",
      headers: requestHeaders,
      ...rest,
    });

    // Automatic session refresh attempt for HCORE
    const isAuthPath = ["/v1/auth/login", "/v1/auth/register", "/v1/auth/refresh", "/auth/logout"].some((p) =>
      endpoint.includes(p)
    );

    if (!response.ok) {
      if (response.status === 401 && !isAuthPath) {
        try {
          const refreshRes = await fetch(`${HCORE_BASE}/v1/auth/refresh`, {
            method: "POST",
            credentials: "include",
          });

          if (refreshRes.ok) {
            return request<T>(baseUrl, endpoint, options); // Retry original request
          }
        } catch (e) {
          console.error("Token refresh failed:", e);
        }

        // Redirect to login if refresh fails
        if (typeof window !== "undefined") {
          const currentPath = window.location.pathname;
          const publicRoutes = ["/signin", "/signup", "/forgot-password", "/reset-password", "/verify", "/accept-invite"];
          if (!publicRoutes.some((route) => currentPath.startsWith(route))) {
            window.location.href = "/signin";
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
