import { HSMS_BASE } from "./api";
import { deriveTheme, DerivedTheme } from "./theme-colors";

export interface TenantBranding {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  theme: DerivedTheme;
}

// In-memory short TTL cache (60 seconds) to avoid slamming the DB on busy login pages
interface CacheEntry {
  data: TenantBranding | null;
  expiresAt: number;
}

const brandingCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000;

export function clearTenantBrandingCache(slug?: string): void {
  if (slug) {
    brandingCache.delete(slug.trim().toLowerCase());
  } else {
    brandingCache.clear();
  }
}

/**
 * Resolves school slug from a hostname or subdomain.
 * e.g. "elyon.hanoled.com" -> "elyon"
 * Ignores common system domains like "localhost", "127.0.0.1", "hanoled.com", "app", "www".
 */
export function extractSlugFromHost(host: string | null | undefined): string | null {
  if (!host) return null;
  const cleanHost = host.split(":")[0].toLowerCase().trim();
  
  if (
    cleanHost === "localhost" ||
    cleanHost === "127.0.0.1" ||
    cleanHost === "hanoled.com" ||
    cleanHost === "www.hanoled.com" ||
    cleanHost.endsWith(".vercel.app")
  ) {
    return null;
  }

  // Check for subdomain pattern: <slug>.hanoled.com
  const parts = cleanHost.split(".");
  if (parts.length >= 3 && parts[parts.length - 2] === "hanoled" && parts[parts.length - 1] === "com") {
    const sub = parts[0];
    if (sub !== "www" && sub !== "app" && sub !== "api" && sub !== "core" && sub !== "cbt") {
      return sub;
    }
  }

  return null;
}

/**
 * Fetch tenant branding by slug from HSMS.
 * Returns null if tenant not found or request fails.
 */
export async function getTenantBranding(slug: string | null | undefined): Promise<TenantBranding | null> {
  if (!slug) return null;
  const normalizedSlug = slug.trim().toLowerCase();
  if (!normalizedSlug) return null;

  // Check cache
  const cached = brandingCache.get(normalizedSlug);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  try {
    const res = await fetch(`${HSMS_BASE}/organizations/${encodeURIComponent(normalizedSlug)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 60 }, // Next.js ISR cache
    }).catch(() => null);

    if (!res || !res.ok) {
      brandingCache.set(normalizedSlug, { data: null, expiresAt: now + CACHE_TTL_MS });
      return null;
    }

    const org = await res.json().catch(() => null);
    if (!org || !org.name || !org.slug) {
      brandingCache.set(normalizedSlug, { data: null, expiresAt: now + CACHE_TTL_MS });
      return null;
    }

    const branding: TenantBranding = {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logo: org.logo || null,
      primaryColor: org.primaryColor || null,
      secondaryColor: org.secondaryColor || null,
      theme: deriveTheme(org.primaryColor, org.secondaryColor),
    };

    brandingCache.set(normalizedSlug, { data: branding, expiresAt: now + CACHE_TTL_MS });
    return branding;
  } catch (err) {
    console.warn(`Failed to fetch tenant branding for ${normalizedSlug}:`, err);
    return null;
  }
}
