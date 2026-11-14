import type { Viewport } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";

// viewport-fit=cover lets the mobile app shell paint under the notch / home indicator
// and position itself with env(safe-area-inset-*). Scoped to the signed-in app only.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1447E6",
};

import { getHcoreBaseUrl, fetchWithFallback } from "@/lib/api-endpoints";

const HCORE_BASE = getHcoreBaseUrl();

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("hcore_session")?.value || cookieStore.get("accessToken")?.value;

  // 1. Must be authenticated
  if (!token) {
    redirect("/signin?callbackUrl=/dashboard");
  }

  // 2. Fetch real-time subscriptions directly from HCORE if cookie is missing
  let allowedPlatforms = cookieStore.get("hweb_allowed_platforms")?.value || "";
  if (!allowedPlatforms) {
    try {
      const meRes = await fetchWithFallback(`${HCORE_BASE}/v1/me/contexts`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (meRes.ok) {
        const meData = await meRes.json();
        const primaryOrg = meData.organizations?.[0];
        if (primaryOrg?.subscribed?.length > 0) {
          // Org-level subscription alone isn't enough — require an actual
          // role in the product for this user.
          allowedPlatforms = primaryOrg.subscribed
            .filter((code: string) => (primaryOrg.products?.[code]?.roles?.length ?? 0) > 0)
            .join(",");
        }
      }
    } catch (e) {
      console.error("Dashboard layout subscription check error:", e);
    }
  }

  // 3. If the person has no HSMS access, route them to the surface they do have.
  // CBT-only candidates (external exam candidates) hit this after signing in,
  // or when their sign-in cookies are present but stale.
  if (allowedPlatforms && !allowedPlatforms.includes("HSMS")) {
    if (cookieStore.get("hweb_user_role")?.value === "STUDENT") {
      // Enrolled students stay on their school dashboard and must not be bounced to CBT.
      return children;
    }
    if (allowedPlatforms.includes("HCBT")) {
      redirect("/cbt/admin");
    } else {
      redirect("/welcome");
    }
  }

  return children;
}
