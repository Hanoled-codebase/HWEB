import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardWorkspaceError } from "@/components/dashboard/DashboardWorkspaceError";
import { fetchWithFallback, getHcoreBaseUrl } from "@/lib/api-endpoints";
import type { ContextOrganization } from "@/lib/parent-routing";

const HCORE_BASE = getHcoreBaseUrl();

function isValidOrgSlug(slug: string | undefined): slug is string {
  return Boolean(slug && /^[a-zA-Z0-9_-]+$/.test(slug));
}

async function fetchContexts(token: string) {
  return fetchWithFallback(`${HCORE_BASE}/v1/me/contexts`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("hcore_session")?.value || cookieStore.get("accessToken")?.value;

  if (!token) {
    redirect("/signin?callbackUrl=/dashboard");
  }

  const primaryOrgSlug = cookieStore.get("hweb_primary_org_slug")?.value?.trim();
  const allowedPlatforms = cookieStore.get("hweb_allowed_platforms")?.value || "";
  const userRole = cookieStore.get("hweb_user_role")?.value;

  // Fast path: sign-in already cached the primary school slug and HSMS entitlement.
  if (isValidOrgSlug(primaryOrgSlug) && (!allowedPlatforms || allowedPlatforms.includes("HSMS"))) {
    redirect(`/dashboard/school/${encodeURIComponent(primaryOrgSlug)}`);
  }

  // Fallback for sessions without hweb_primary_org_slug (e.g. post-onboarding or pre-existing cookies).
  let targetUrl: string | null = null;
  let loadError: string | null = null;

  try {
    let meRes = await fetchContexts(token);

    if (meRes.status === 401) {
      const refreshToken = cookieStore.get("hcore_refresh_web")?.value;
      if (refreshToken) {
        const refreshRes = await fetchWithFallback(`${HCORE_BASE}/v1/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
          cache: "no-store",
        }).catch(() => null);

        if (refreshRes && refreshRes.ok) {
          const refreshData = await refreshRes.json().catch(() => null);
          if (typeof refreshData?.token === "string" && refreshData.token) {
            meRes = await fetchContexts(refreshData.token);
          }
        }
      }
    }

    if (meRes.status === 401) {
      targetUrl = "/api/logout";
    } else if (meRes.ok) {
      const meData = await meRes.json().catch(() => ({}));
      const organizations: ContextOrganization[] = Array.isArray(meData.organizations)
        ? meData.organizations
        : [];

      if (organizations.length === 0) {
        targetUrl = "/onboarding";
      } else {
        const primaryOrg = organizations[0];
        const subscribed = Array.isArray(primaryOrg.subscribed) ? primaryOrg.subscribed : [];
        const hasRole = (code: string) =>
          !primaryOrg.products || (primaryOrg.products[code]?.roles?.length ?? 0) > 0;
        const hasHsms =
          subscribed.length === 0 ? hasRole("HSMS") : subscribed.includes("HSMS") && hasRole("HSMS");
        const hasHcbt = subscribed.includes("HCBT") && hasRole("HCBT");

        if (!hasHsms && hasHcbt) {
          targetUrl = userRole === "STUDENT" ? "/cbt/student" : "/cbt/admin";
        } else if (hasHsms && primaryOrg.slug) {
          targetUrl = `/dashboard/school/${encodeURIComponent(primaryOrg.slug)}`;
        } else {
          targetUrl = "/welcome";
        }
      }
    } else {
      loadError = `Workspace lookup failed (${meRes.status}). Please try again.`;
    }
  } catch (error: unknown) {
    const isTimeout = error instanceof Error && error.name === "TimeoutError";
    loadError = isTimeout
      ? "Loading your workspace took too long. Please try again."
      : "Unable to connect to the authentication service. Please try again.";
  }

  if (targetUrl) {
    redirect(targetUrl);
  }

  return <DashboardWorkspaceError error={loadError || "Failed to load organizations"} />;
}
