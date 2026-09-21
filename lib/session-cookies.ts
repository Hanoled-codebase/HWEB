// Server-side helpers for the httpOnly session cookies (`hcore_session`,
// `hcbt_session`). Shared by the login/logout server actions and the logout
// route so a cookie is always set and cleared with the same scope.
//
// AUTH_COOKIE_DOMAIN (server-only, e.g. ".hanoled.com") scopes the cookies to the
// shared parent domain so the browser also sends them to the API subdomains.
// That is what makes NEXT_PUBLIC_AUTH_MODE=cookie possible (see lib/auth-tokens.ts).
// Unset, cookies stay host-only, exactly as before.

export const SESSION_COOKIE_NAMES = ["hcore_session", "hcbt_session"] as const;

function cookieDomain(): string | undefined {
  return process.env.AUTH_COOKIE_DOMAIN || undefined;
}

export function sessionCookieOptions(maxAgeSeconds: number) {
  const domain = cookieDomain();
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: maxAgeSeconds,
    path: "/",
    ...(domain ? { domain } : {}),
  };
}

/**
 * Deleting a cookie only works when the domain and path match the ones it was
 * set with, so clear both the domain-scoped cookie and any older host-only one.
 */
export function sessionCookieClearTargets(name: string) {
  const domain = cookieDomain();
  return domain
    ? [{ name, path: "/" }, { name, path: "/", domain }]
    : [{ name, path: "/" }];
}

/** Login returns the raw tokens to the browser only in the legacy bearer mode. */
export function exposeTokensToBrowser(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_MODE !== "cookie";
}
