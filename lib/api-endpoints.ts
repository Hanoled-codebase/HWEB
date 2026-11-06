/**
 * Resolves API base URLs across local development, Edge appliance mode, and Cloud/Production environments.
 */

export const EDGE_MODE = process.env.NEXT_PUBLIC_EDGE_MODE === "1";

function isCloudEnvironment(): boolean {
  if (typeof window !== "undefined") {
    const host = window.location?.hostname || "";
    return host.includes("hanoled.com") || host.endsWith(".vercel.app");
  }
  return Boolean(
    process.env.VERCEL ||
    process.env.NEXT_PUBLIC_VERCEL_ENV ||
    process.env.NODE_ENV === "production"
  );
}

export function getHcoreBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_HCORE_URL || process.env.HCORE_URL;
  if (envUrl && !envUrl.includes("core-api.hanoled.com")) {
    if (isCloudEnvironment() && (envUrl.includes("localhost") || envUrl.includes("127.0.0.1"))) {
      return "https://hcore-backend-eta.vercel.app";
    }
    return envUrl;
  }
  if (isCloudEnvironment()) {
    return "https://hcore-backend-eta.vercel.app";
  }
  return "http://localhost:4000";
}

export function getHsmsBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_HSMS_URL || process.env.HSMS_URL;
  if (envUrl && !envUrl.includes("api.hanoled.com")) {
    if (isCloudEnvironment() && (envUrl.includes("localhost") || envUrl.includes("127.0.0.1"))) {
      return "https://hanoled-backend.vercel.app";
    }
    return envUrl;
  }
  if (isCloudEnvironment()) {
    return "https://hanoled-backend.vercel.app";
  }
  return "http://localhost:3001";
}

export function getHcbtBaseUrl(): string {
  if (EDGE_MODE) return "";
  const envUrl = process.env.NEXT_PUBLIC_HCBT_URL || process.env.HCBT_URL;
  if (envUrl && !envUrl.includes("cbt-api.hanoled.com")) {
    if (isCloudEnvironment() && (envUrl.includes("localhost") || envUrl.includes("127.0.0.1"))) {
      return "https://hcbt-iota.vercel.app";
    }
    return envUrl;
  }
  if (isCloudEnvironment()) {
    return "https://hcbt-iota.vercel.app";
  }
  return "http://localhost:4002";
}

export const HCORE_BASE = getHcoreBaseUrl();
export const HSMS_BASE = getHsmsBaseUrl();
export const HCBT_BASE = getHcbtBaseUrl();
