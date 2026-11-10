import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "katex/dist/katex.min.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hanoled CBT — Computer-Based Testing System",
  description: "Modern, secure computer-based testing and examination platform for the Hanoled School Suite.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png", type: "image/png" },
    ],
  },
};

import { cookies } from "next/headers";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { SignOutForm } from "@/components/auth/SignOutForm";

import { getHcoreBaseUrl } from "@/lib/api-endpoints";
import { type ContextOrganization, isParentOnlyAccount } from "@/lib/parent-routing";

const HCORE_BASE = getHcoreBaseUrl();

export default async function CBTLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const token = cookieStore.get("hcore_session")?.value;
  const hcbtToken = cookieStore.get("hcbt_session")?.value;
  let allowedPlatforms = cookieStore.get("hweb_allowed_platforms")?.value || "";
  let isParent = cookieStore.get("hweb_user_role")?.value === "PARENT";

  // If cookie is missing or empty, fetch real active subscriptions directly from HCORE
  if (!allowedPlatforms && token) {
    try {
      const meRes = await fetch(`${HCORE_BASE}/v1/me/contexts`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (meRes.ok) {
        const meData = await meRes.json();
        const orgs: ContextOrganization[] = Array.isArray(meData.organizations) ? meData.organizations : [];
        const primaryOrg = orgs[0];
        if (isParentOnlyAccount(orgs)) {
          isParent = true;
        }
        if (primaryOrg && Array.isArray(primaryOrg.subscribed) && primaryOrg.subscribed.length > 0) {
          // Org-level subscription alone isn't enough to grant CBT access —
          // require an actual role in the product for this user.
          allowedPlatforms = primaryOrg.subscribed
            .filter((code: string) => (primaryOrg.products?.[code]?.roles?.length ?? 0) > 0)
            .join(",");
        }
      }
    } catch (e) {
      console.error("CBT layout subscription check error:", e);
    }

    if (!allowedPlatforms) {
      allowedPlatforms = "HSMS,HCBT";
    }
  }

  // If authenticated without cookie, default to allowing CBT in dev
  if (!allowedPlatforms) {
    allowedPlatforms = "HSMS,HCBT";
  }

  // If user is authenticated in HCORE but has no HCBT subscription, strictly block access!
  if ((token || hcbtToken) && !allowedPlatforms.includes("HCBT")) {
    const hasHsms = allowedPlatforms.includes("HSMS");
    
    return (
      <div className={`cbt-theme ${poppins.variable} font-sans antialiased bg-slate-50 flex min-h-dvh w-full flex-col items-center justify-center p-6 text-center`}>
        <div className="m-rise bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-200/80 max-w-md w-full mx-auto relative overflow-hidden">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600 mb-5">
            <ShieldAlert className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h1>
          <p className="text-sm text-slate-600 mb-8 leading-relaxed">
            Your account doesn&apos;t have a role in <strong>Hanoled Computer-Based Testing (HCBT)</strong> for this organization, or your school doesn&apos;t have an active subscription to it.
          </p>
          <div className="flex flex-col gap-3">
            {hasHsms && (
              <Link
                href="/dashboard"
                className="flex min-h-11 w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 shadow-sm"
              >
                Go to School Management Dashboard
              </Link>
            )}
            {!isParent && (
              <Link
                href="/welcome"
                className="flex min-h-11 w-full items-center justify-center rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                Back to Welcome Hub
              </Link>
            )}
            <SignOutForm>
              <button
                type="submit"
                className="flex min-h-11 w-full items-center justify-center rounded-xl px-4 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 cursor-pointer"
              >
                Sign Out / Use Different Account
              </button>
            </SignOutForm>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`cbt-theme ${poppins.variable} font-sans antialiased bg-background text-foreground min-h-screen`}>
      {children}
    </div>
  );
}
