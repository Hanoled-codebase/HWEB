/**
 * Resolves API base URLs across local development, Edge appliance mode, and Cloud/Production environments.
 */

export const EDGE_MODE = process.env.NEXT_PUBLIC_EDGE_MODE === "1";

const HCORE_CLOUD_FALLBACK = "https://hanoled-core-api.netlify.app";
const HSMS_CLOUD_FALLBACK = "https://api.hanoled.com";
const HCBT_CLOUD_FALLBACK = "https://hanoled-cbt-api.netlify.app";

function isCloudEnvironment(): boolean {
  if (typeof window !== "undefined") {
    const host = window.location?.hostname || "";
    return (
      host.includes("hanoled.com") ||
      host.endsWith(".vercel.app") ||
      host.endsWith(".netlify.app")
    );
  }
  return Boolean(
    process.env.VERCEL ||
    process.env.NETLIFY ||
    process.env.NEXT_PUBLIC_VERCEL_ENV ||
    process.env.NODE_ENV === "production"
  );
}

function resolveServiceUrl(
  envUrl: string | undefined,
  cloudFallback: string,
  localFallback: string,
): string {
  if (envUrl) {
    if (isCloudEnvironment() && (envUrl.includes("localhost") || envUrl.includes("127.0.0.1"))) {
      return cloudFallback;
    }
    return envUrl;
  }
  return isCloudEnvironment() ? cloudFallback : localFallback;
}

export function getHcoreBaseUrl(): string {
  return resolveServiceUrl(
    process.env.NEXT_PUBLIC_HCORE_URL || process.env.HCORE_URL,
    HCORE_CLOUD_FALLBACK,
    "http://localhost:4000",
  );
}

export function getHsmsBaseUrl(): string {
  return resolveServiceUrl(
    process.env.NEXT_PUBLIC_HSMS_URL || process.env.HSMS_URL,
    HSMS_CLOUD_FALLBACK,
    "http://localhost:3001",
  );
}

export function getHcbtBaseUrl(): string {
  if (EDGE_MODE) return "";
  return resolveServiceUrl(
    process.env.NEXT_PUBLIC_HCBT_URL || process.env.HCBT_URL,
    HCBT_CLOUD_FALLBACK,
    "http://localhost:4002",
  );
}

export const HCORE_BASE = getHcoreBaseUrl();
export const HSMS_BASE = getHsmsBaseUrl();
export const HCBT_BASE = getHcbtBaseUrl();

const DEFAULT_SERVER_FETCH_TIMEOUT_MS = 8000;
// When a fallback URL exists, don't spend the full budget on the primary: a
// hung primary used to stack 8s per leg (primary + fallback) and push a login
// well past a minute once several legs chained. Probe the primary briefly,
// keep the full budget for the fallback that must actually succeed.
const FALLBACK_PROBE_TIMEOUT_MS = 3000;

function withTimeout(init?: RequestInit, ms: number = DEFAULT_SERVER_FETCH_TIMEOUT_MS): RequestInit {
  if (init?.signal || typeof AbortSignal === "undefined" || typeof AbortSignal.timeout !== "function") {
    return init ?? {};
  }
  return { ...init, signal: AbortSignal.timeout(ms) };
}

/**
 * Resilient fetch helper with IPv4/IPv6 dual-stack fallback and cloud domain resolution.
 */
export async function fetchWithFallback(url: string, init?: RequestInit): Promise<Response> {
  const hasFallback =
    (url.includes("localhost:4000") || url.includes("127.0.0.1:4000") || url.includes("core-api.hanoled.com")) &&
    // The 127.0.0.1 <-> localhost retries only make sense off Vercel.
    (process.env.VERCEL ? url.includes("core-api.hanoled.com") : true);
  try {
    return await fetch(url, withTimeout(init, hasFallback ? FALLBACK_PROBE_TIMEOUT_MS : DEFAULT_SERVER_FETCH_TIMEOUT_MS));
  } catch (err: unknown) {
    if (init?.signal?.aborted) throw err;
    if (url.includes("localhost:4000") && !process.env.VERCEL) {
      try {
        return await fetch(url.replace("localhost:4000", "127.0.0.1:4000"), withTimeout(init));
      } catch {}
    }
    if (url.includes("127.0.0.1:4000") && !process.env.VERCEL) {
      try {
        return await fetch(url.replace("127.0.0.1:4000", "localhost:4000"), withTimeout(init));
      } catch {}
    }
    if (url.includes("localhost:4000") || url.includes("127.0.0.1:4000") || url.includes("core-api.hanoled.com")) {
      const cloudUrl = url
        .replace(/https?:\/\/localhost:4000/, HCORE_CLOUD_FALLBACK)
        .replace(/https?:\/\/127\.0\.0\.1:4000/, HCORE_CLOUD_FALLBACK)
        .replace("https://core-api.hanoled.com", HCORE_CLOUD_FALLBACK);
      return await fetch(cloudUrl, withTimeout(init));
    }
    throw err;
  }
}
