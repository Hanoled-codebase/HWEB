import { HSMS_BASE } from "./api-endpoints";

export const ADMIN_API = `${HSMS_BASE}/api/admin`;

const ADMIN_TOKEN_KEY = "hanoled_admin_token";

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token) {
      localStorage.setItem(ADMIN_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
    }
  } catch {}
}

export function clearAdminToken(): void {
  setAdminToken(null);
}

/**
 * Fetch wrapper for platform admin endpoints that ensures the Bearer token
 * and credentials ("include") are automatically attached.
 */
export async function adminFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const token = getAdminToken();
  const headers = new Headers(init?.headers);

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(input, {
    ...init,
    credentials: "include",
    headers,
  });
}
