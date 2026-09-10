import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";

const HCORE_BASE = process.env.NEXT_PUBLIC_HCORE_URL || 'http://localhost:4000';

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("hcore_session")?.value;

  // 1. Must be authenticated
  if (!token) {
    redirect("/signin?callbackUrl=/dashboard");
  }

  // 2. Fetch real-time subscriptions directly from HCORE if cookie is missing
  let allowedPlatforms = cookieStore.get("hweb_allowed_platforms")?.value || "";
  if (!allowedPlatforms) {
    try {
      const meRes = await fetch(`${HCORE_BASE}/v1/me/contexts`, {
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

  // 3. If organization only has HCBT, redirect to /cbt/admin automatically
  if (allowedPlatforms && !allowedPlatforms.includes("HSMS")) {
    if (allowedPlatforms.includes("HCBT")) {
      redirect("/cbt/admin");
    } else {
      redirect("/welcome");
    }
  }

  return children;
}
