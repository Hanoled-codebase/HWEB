import { toast } from "sonner";

function getApiUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host !== "localhost" && host !== "127.0.0.1") {
      return "https://hanoled-backend.vercel.app/api";
    }
  }
  return "http://localhost:3001/api";
}

export const API_URL = getApiUrl();

type RequestOptions = RequestInit & {
  params?: Record<string, string | number | boolean | undefined>;
  showErrorToast?: boolean; // Option to disable auto-toast for specific calls
};

export interface ApiErrorResponse {
  error: string;
  message?: string;
}

export type ApiFetchError = Error & {
  status?: number;
  details?: ApiErrorResponse | unknown;
};

function buildHeaders(headers: HeadersInit | undefined, isFormData: boolean) {
  const mergedHeaders = new Headers();

  if (!isFormData) {
    mergedHeaders.set("Content-Type", "application/json");
  }

  if (!headers) {
    return mergedHeaders;
  }

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
    appendHeader(key, value as string | undefined | null),
  );

  return mergedHeaders;
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
  retry = true,
): Promise<T> {
  const { params, headers, showErrorToast = true, ...rest } = options;

  let url = `${API_URL}${path}`;
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

  try {
    const response = await fetch(url, {
      credentials: "include",
      headers: requestHeaders,
      ...rest,
    });

    // Handle 401 Unauthorized - Attempt refresh
    const isAuthPath = ["/auth/login", "/auth/signup", "/auth/refresh", "/auth/profile", "/auth/logout"].some((p) =>
      path.includes(p)
    );

    if (response.status === 401 && retry && !isAuthPath) {
      try {
        const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });

        if (refreshRes.ok) {
          return apiFetch<T>(path, options, false);
        }
      } catch (e) {
        console.error("Token refresh failed:", e);
      }

      // Redirect to login if refresh fails and not already on auth pages
      if (typeof window !== "undefined") {
        const currentPath = window.location.pathname;
        const authRoutes = ["/signin", "/signup", "/forgot-password", "/reset-password", "/verify", "/accept-invite"];
        if (!authRoutes.some((route) => currentPath.startsWith(route))) {
          window.location.href = "/signin";
        }
      }
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errMsg =
        typeof data.error === "string"
          ? data.error
          : data.error?.message || data.message || response.statusText;
      const error: ApiFetchError = new Error(errMsg);
      error.status = response.status;
      error.details = data.details || data;
      
      // Auto-toast error for non-401 errors (401 is handled by auth redirects)
      if (showErrorToast && response.status !== 401) {
        toast.error(error.message || "An unexpected error occurred");
      }
      
      throw error;
    }

    return data as T;
  } catch (error: unknown) {
    const apiError = error as ApiFetchError;
    // Only toast for genuine network errors (no status means no HTTP response was received).
    // HTTP errors (4xx/5xx) are already toasted in the !response.ok block above.
    if (showErrorToast && !apiError.status && !(error instanceof Error && apiError.status === 401)) {
       toast.error(apiError.message || "Connection failed. Please check your internet.");
    }
    throw error;
  }
}
