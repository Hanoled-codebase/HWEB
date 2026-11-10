import { isSafeRedirectUrl } from "@/lib/safe-redirect";

export type ContextProductEntry = {
  status?: string;
  roles?: string[];
};

export type ContextOrganization = {
  id?: string;
  slug?: string;
  name?: string;
  subscribed?: string[];
  products?: Record<string, ContextProductEntry | undefined>;
};

const PARENT_ROLE_CODES = new Set(["PARENT", "GUARDIAN"]);

/**
 * Returns true when every role held by the account across its active
 * organizations (or login-response fallback roles) is a parent/guardian role.
 * Dual-role users (e.g. a teacher who is also a parent) return false so they
 * keep access to the Suite Welcome Hub.
 */
export function isParentOnlyAccount(
  organizations: ContextOrganization[] = [],
  fallbackRoles: string[] = [],
): boolean {
  const contextRoles = organizations.flatMap((org) =>
    Object.values(org.products ?? {}).flatMap((product) => product?.roles ?? []),
  );
  const effectiveRoles = (contextRoles.length > 0 ? contextRoles : fallbackRoles)
    .map((role) => String(role).trim().toUpperCase())
    .filter(Boolean);

  return (
    effectiveRoles.length > 0 &&
    effectiveRoles.every((role) => PARENT_ROLE_CODES.has(role))
  );
}

/**
 * Resolves the school dashboard landing path for a parent account, honoring an
 * explicit organization slug/id when present and falling back to /dashboard.
 */
export function resolveParentDashboardPath(
  organizations: ContextOrganization[] = [],
  preferredOrgSlugOrId?: string | null,
  fallbackSlug?: string | null,
): string {
  const needle = preferredOrgSlugOrId?.trim().toLowerCase();
  const matched = needle
    ? organizations.find(
        (org) =>
          org.slug?.toLowerCase() === needle || org.id?.toLowerCase() === needle,
      )
    : undefined;

  const targetSlug = matched?.slug || organizations[0]?.slug || fallbackSlug || "";
  return targetSlug ? `/dashboard/school/${encodeURIComponent(targetSlug)}` : "/dashboard";
}

/**
 * True when a callbackUrl represents a generic post-auth landing rather than
 * an explicit deep link into a specific feature page.
 */
export function isGenericPostAuthTarget(callbackUrl: string | null | undefined): boolean {
  if (!callbackUrl || !isSafeRedirectUrl(callbackUrl)) return true;
  const pathname = callbackUrl.split("?")[0];
  return pathname === "/" || pathname === "/dashboard" || pathname === "/welcome";
}
