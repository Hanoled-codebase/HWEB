import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchWithFallback } from "@/lib/api-endpoints";

const originalWindow = (globalThis as { window?: unknown }).window;
const originalFetch = globalThis.fetch;

function okResponse(body: unknown = { ok: true }) {
  return { ok: true, status: 200, json: async () => body } as unknown as Response;
}

function testJwt(exp = 9_999_999_999) {
  const part = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${part({ alg: "none" })}.${part({ exp })}.sig`;
}

describe("API timeouts and cold-load token hydration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalWindow === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window?: unknown }).window = originalWindow;
    }
  });

  it("fetchWithFallback attaches a timeout signal per attempt when none is provided", async () => {
    const signals: Array<AbortSignal | undefined> = [];
    globalThis.fetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      signals.push(init?.signal ?? undefined);
      if (signals.length === 1) throw new Error("ECONNREFUSED");
      return okResponse();
    }) as unknown as typeof fetch;

    const res = await fetchWithFallback("http://localhost:4000/v1/me/contexts");
    expect(res.ok).toBe(true);
    expect(signals).toHaveLength(2);
    expect(signals[0]).toBeInstanceOf(AbortSignal);
    expect(signals[1]).toBeInstanceOf(AbortSignal);
    expect(signals[0]).not.toBe(signals[1]);
  });

  it("fetchWithFallback stops immediately when the caller's own signal is aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchMock = vi.fn(async () => {
      throw new DOMException("Aborted", "AbortError");
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      fetchWithFallback("http://localhost:4000/v1/me/contexts", { signal: controller.signal }),
    ).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("deduplicates cold /api/session token hydration across concurrent requests", async () => {
    vi.resetModules();
    (globalThis as { window?: unknown }).window = { location: { pathname: "/dashboard/school/greenfield", href: "" } };
    let storedToken: string | null = null;
    vi.doMock("../auth-tokens", () => ({
      COOKIE_AUTH: false,
      getHcoreToken: () => storedToken,
      getHcbtToken: () => null,
      setAuthTokens: ({ hcoreToken }: { hcoreToken?: string | null }) => {
        if (hcoreToken) storedToken = hcoreToken;
      },
    }));

    const sampleToken = testJwt();
    const seen: string[] = [];
    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      const href = String(url);
      seen.push(href);
      if (href === "/api/session") {
        await new Promise((r) => setTimeout(r, 10));
        return okResponse({ authenticated: true, token: sampleToken });
      }
      return okResponse({ ok: true });
    }) as unknown as typeof fetch;

    const api = await import("../api");
    await Promise.all([
      api.request("http://hcore.test", "/v1/me", { showErrorToast: false }),
      api.request("http://hcore.test", "/v1/me/contexts", { showErrorToast: false }),
    ]);

    expect(seen.filter((u) => u === "/api/session")).toHaveLength(1);
    expect(storedToken).toBe(sampleToken);
  });

  it("skips /api/session pre-flight in COOKIE_AUTH mode and surfaces TimeoutError cleanly", async () => {
    vi.resetModules();
    (globalThis as { window?: unknown }).window = { location: { pathname: "/dashboard/school/greenfield", href: "" } };
    vi.doMock("../auth-tokens", () => ({
      COOKIE_AUTH: true,
      getHcoreToken: () => null,
      getHcbtToken: () => null,
      setAuthTokens: vi.fn(),
    }));

    const seen: string[] = [];
    globalThis.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      seen.push(String(url));
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      throw new DOMException("signal timed out", "TimeoutError");
    }) as unknown as typeof fetch;

    const api = await import("../api");
    await expect(
      api.request("http://hcore.test", "/v1/me", { showErrorToast: false }),
    ).rejects.toThrow("Request timed out. Please try again.");
    expect(seen).toEqual(["http://hcore.test/v1/me"]);
  });

  it("resolves Netlify and custom hanoled.com API origins without falling back to localhost:3001", async () => {
    const prevHsms = process.env.NEXT_PUBLIC_HSMS_URL;
    const prevHcore = process.env.NEXT_PUBLIC_HCORE_URL;
    const prevHcbt = process.env.NEXT_PUBLIC_HCBT_URL;
    try {
      (globalThis as { window?: unknown }).window = {
        location: { hostname: "hanoled-web.netlify.app", pathname: "/", href: "" },
      };
      process.env.NEXT_PUBLIC_HSMS_URL = "https://api.hanoled.com";
      process.env.NEXT_PUBLIC_HCORE_URL = "https://core-api.hanoled.com";
      process.env.NEXT_PUBLIC_HCBT_URL = "https://cbt-api.hanoled.com";

      const endpoints = await import("@/lib/api-endpoints");
      expect(endpoints.getHsmsBaseUrl()).toBe("https://api.hanoled.com");
      expect(endpoints.getHcoreBaseUrl()).toBe("https://core-api.hanoled.com");
      expect(endpoints.getHcbtBaseUrl()).toBe("https://cbt-api.hanoled.com");

      delete process.env.NEXT_PUBLIC_HSMS_URL;
      expect(endpoints.getHsmsBaseUrl()).toBe("https://api.hanoled.com");
    } finally {
      if (prevHsms === undefined) delete process.env.NEXT_PUBLIC_HSMS_URL;
      else process.env.NEXT_PUBLIC_HSMS_URL = prevHsms;
      if (prevHcore === undefined) delete process.env.NEXT_PUBLIC_HCORE_URL;
      else process.env.NEXT_PUBLIC_HCORE_URL = prevHcore;
      if (prevHcbt === undefined) delete process.env.NEXT_PUBLIC_HCBT_URL;
      else process.env.NEXT_PUBLIC_HCBT_URL = prevHcbt;
    }
  });

  it("surfaces the specific Zod issue detail when backend returns Validation error", async () => {
    vi.resetModules();
    (globalThis as { window?: unknown }).window = { location: { pathname: "/dashboard/school/greenfield", href: "" } };
    vi.doMock("../auth-tokens", () => ({
      COOKIE_AUTH: true,
      getHcoreToken: () => null,
      getHcbtToken: () => null,
      setAuthTokens: vi.fn(),
    }));

    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: async () => ({
        error: "Validation error",
        details: [
          {
            code: "invalid_type",
            path: ["assessments", 0, "maxObtainableScore"],
            message: "Max obtainable score must be a whole number",
          },
        ],
      }),
    })) as unknown as typeof fetch;

    const api = await import("../api");
    await expect(
      api.request("http://hsms.test", "/spreadsheets/greenfield", { method: "POST", showErrorToast: false }),
    ).rejects.toThrow("Validation error: assessments.0.maxObtainableScore — Max obtainable score must be a whole number");
  });
});
