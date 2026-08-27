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
import { logoutAction } from "@/app/actions/auth";

const HCORE_BASE = process.env.NEXT_PUBLIC_HCORE_URL || 'http://localhost:4000';

export default async function CBTLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const token = cookieStore.get("hcore_session")?.value;
  const hcbtToken = cookieStore.get("hcbt_session")?.value;
  let allowedPlatforms = cookieStore.get("hweb_allowed_platforms")?.value || "";

  // If cookie is missing or empty, fetch real active subscriptions directly from HCORE
  if (!allowedPlatforms && token) {
    try {
      const meRes = await fetch(`${HCORE_BASE}/v1/me/contexts`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (meRes.ok) {
        const meData = await meRes.json();
        const primaryOrg = meData.organizations?.[0];
        if (primaryOrg && Array.isArray(primaryOrg.subscribed) && primaryOrg.subscribed.length > 0) {
          allowedPlatforms = primaryOrg.subscribed.join(",");
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
      <div className={`cbt-theme ${poppins.variable} font-sans antialiased bg-slate-50 flex min-h-screen w-full flex-col items-center justify-center p-6 text-center`}>
        <div className="bg-white p-8 rounded-sm shadow-xl border border-slate-100 max-w-md w-full mx-auto relative overflow-hidden">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 mb-5">
            <span className="text-2xl">🚫</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-sm text-slate-500 mb-8 leading-relaxed">
            Your school organization does not have an active subscription to <strong>Hanoled Computer-Based Testing (HCBT)</strong>.
          </p>
          <div className="flex flex-col gap-3">
            {hasHsms && (
              <Link
                href="/dashboard"
                className="w-full py-3 px-4 bg-blue-600 text-white rounded-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
              >
                Go to School Management Dashboard
              </Link>
            )}
            <Link
              href="/welcome"
              className="w-full py-2.5 px-4 bg-slate-100 text-slate-700 rounded-sm font-semibold hover:bg-slate-200 transition-colors shadow-sm"
            >
              Back to Welcome Hub
            </Link>
            <form action={logoutAction}>
              <button 
                type="submit"
                className="w-full py-2.5 px-4 text-xs text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
              >
                Sign Out / Use Different Account
              </button>
            </form>
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
