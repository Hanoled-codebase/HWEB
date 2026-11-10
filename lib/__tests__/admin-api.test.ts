import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

function setupBrowserEnvironment() {
  const store = new Map<string, string>();
  const localStorageMock = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, String(value)),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  };

  Object.defineProperty(globalThis, "window", {
    value: {},
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis, "localStorage", {
    value: localStorageMock,
    writable: true,
    configurable: true,
  });

  return localStorageMock;
}

describe("admin-api helper", () => {
  let localStorageMock: ReturnType<typeof setupBrowserEnvironment>;
  let adminApi: typeof import("../admin-api");

  beforeEach(async () => {
    localStorageMock = setupBrowserEnvironment();
    vi.restoreAllMocks();
    adminApi = await import("../admin-api");
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  it("exports a valid ADMIN_API endpoint string", () => {
    expect(adminApi.ADMIN_API).toContain("/api/admin");
  });

  it("stores, retrieves, and clears the admin token", () => {
    expect(adminApi.getAdminToken()).toBeNull();
    adminApi.setAdminToken("test-jwt-token-123");
    expect(adminApi.getAdminToken()).toBe("test-jwt-token-123");
    adminApi.clearAdminToken();
    expect(adminApi.getAdminToken()).toBeNull();
  });

  it("attaches Authorization: Bearer token and credentials: include to fetch requests", async () => {
    adminApi.setAdminToken("admin-secret-token");
    const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", mockFetch);

    const res = await adminApi.adminFetch("https://api.hanoled.com/api/admin/auth/me");
    expect(res.status).toBe(200);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [callUrl, callInit] = mockFetch.mock.calls[0];
    expect(callUrl).toBe("https://api.hanoled.com/api/admin/auth/me");
    expect(callInit.credentials).toBe("include");

    const headers = callInit.headers instanceof Headers ? callInit.headers : new Headers(callInit.headers);
    expect(headers.get("Authorization")).toBe("Bearer admin-secret-token");
  });

  it("does not attach Authorization header if no admin token is stored", async () => {
    adminApi.clearAdminToken();
    const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", mockFetch);

    await adminApi.adminFetch("https://api.hanoled.com/api/admin/auth/me");
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, callInit] = mockFetch.mock.calls[0];
    const headers = callInit.headers instanceof Headers ? callInit.headers : new Headers(callInit.headers);
    expect(headers.get("Authorization")).toBeNull();
  });
});
