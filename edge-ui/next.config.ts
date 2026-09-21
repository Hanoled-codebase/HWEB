import type { NextConfig } from "next";
import path from "node:path";

// Static-export build of Hweb's real /cbt experience for the HCBT Edge
// Appliance. The pages themselves are imported from ../app/cbt (nothing is
// copied), so the appliance can never drift from the online UI; this project
// only supplies an offline shell (layout, sign-in) and the export settings.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  turbopack: {
    root: path.join(__dirname, ".."),
    resolveAlias: {
      "@/app/actions/auth": "./shims/auth-actions.ts",
    },
  },
  env: {
    NEXT_PUBLIC_EDGE_MODE: "1",
  },
};

export default nextConfig;
