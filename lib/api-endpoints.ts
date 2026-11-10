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

const DEFAULT_SERVER_FETCH_TIMEOUT_MS = 8000;

function withTimeout(init?: RequestInit): RequestInit {
  if (init?.signal || typeof AbortSignal === "undefined" || typeof AbortSignal.timeout !== "function") {
    return init ?? {};
  }
  return { ...init, signal: AbortSignal.timeout(DEFAULT_SERVER_FETCH_TIMEOUT_MS) };
}

/**
 * Resilient fetch helper with IPv4/IPv6 dual-stack fallback and cloud domain resolution.
 */
export async function fetchWithFallback(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, withTimeout(init));
  } catch (err: unknown) {
    if (init?.signal?.aborted) throw err;
    if (url.includes('localhost:4000') && !process.env.VERCEL) {
      try {
        return await fetch(url.replace('localhost:4000', '127.0.0.1:4000'), withTimeout(init));
      } catch {}
    }
    if (url.includes('127.0.0.1:4000') && !process.env.VERCEL) {
      try {
        return await fetch(url.replace('127.0.0.1:4000', 'localhost:4000'), withTimeout(init));
      } catch {}
    }
    if (url.includes('localhost:4000') || url.includes('127.0.0.1:4000') || url.includes('core-api.hanoled.com')) {
      const cloudUrl = url
        .replace(/https?:\/\/localhost:4000/, 'https://hcore-backend-eta.vercel.app')
        .replace(/https?:\/\/127\.0\.0\.1:4000/, 'https://hcore-backend-eta.vercel.app')
        .replace('https://core-api.hanoled.com', 'https://hcore-backend-eta.vercel.app');
      return await fetch(cloudUrl, withTimeout(init));
    }
    throw err;
  }
}

