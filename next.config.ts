import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

// Headers that are safe to enforce everywhere: they stop MIME sniffing, plugin
// embeds and <base> hijacking, and stop leaking full URLs to other sites.
const baseSecurityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Content-Security-Policy", value: "object-src 'none'; base-uri 'self'" },
];

// The signed-in app must never be framed by another site (clickjacking on
// admin actions). The public admissions portal is deliberately left out: schools
// may embed it on their own websites.
const appOnlyHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Not a CSP `script-src`: that needs per-request nonces and a full browser
  // pass over every page (Paystack, fonts, KaTeX) before it can be enforced.
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // The end-to-end tests run their own dev server against fake APIs; its
  // build output goes elsewhere so it never mixes with a normal `next dev`.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  // Dev server only (ignored in production builds): lets the app be opened as
  // 127.0.0.1 as well as localhost, e.g. to get a clean origin for CORS testing.
  allowedDevOrigins: ["127.0.0.1"],
  async headers() {
    return [
      { source: "/:path*", headers: baseSecurityHeaders },
      ...["/dashboard/:path*", "/cbt/:path*", "/admin/:path*", "/signin", "/welcome"].map((source) => ({
        source,
        headers: appOnlyHeaders,
      })),
    ];
  },
};

// Source maps go to Sentry only when SENTRY_AUTH_TOKEN (with SENTRY_ORG and
// SENTRY_PROJECT) is set at build time; otherwise the build is unchanged.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  widenClientFileUpload: true,
  silent: !process.env.CI,
  telemetry: false,
});
