import { beforeEach, describe, expect, it, vi } from "vitest";

// HCORE hands out an access token that lives one hour. Before this, only HCORE
// calls retried after a refresh: every HSMS/HCBT call 401'd silently, and a
// page load after the hour looked signed out. These cover the three parts that
// make a session survive: minting early, replaying once, and never signing out
// a silent background poll.

const now = () => Math.floor(Date.now() / 1000);

function jwt(payload: Record<string, unknown>) {
  const part = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${part({ alg: "none" })}.${part(payload)}.sig`;
}

const EXPIRED = jwt({ exp: now() - 60 });
const FRESH = jwt({ exp: now() + 3600 });
const ROTATED = jwt({ exp: now() + 7200 });

function response(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as unknown as Response;
}

async function loadApi(initialToken: string | null) {
  vi.resetModules();
  const store: { token: string | null } = { token: initialToken };
  vi.doMock("../auth-tokens", () => ({
    COOKIE_AUTH: false,
    getHcoreToken: () => store.token,
    getHcbtToken: () => null,
    setAuthTokens: ({ hcoreToken }: { hcoreToken?: string | null }) => {
      if (hcoreToken) store.token = hcoreToken;
    },
  }));
  const api = await import("../api");
  return { api, store };
}

function stubWindow() {
  const location = { pathname: "/dashboard/school/elyon-college", href: "" };
  (globalThis as unknown as { window: unknown }).window = { location };
  return location;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("access-token refresh", () => {
  it("mints a new token before sending an expired one, once for concurrent calls", async () => {
    stubWindow();
    const { api, store } = await loadApi(EXPIRED);
    const seen: Array<{ url: string; auth: string | null }> = [];

    globalThis.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const href = String(url);
      const auth = new Headers(init?.headers).get("Authorization");
      seen.push({ url: href, auth });
      if (href.endsWith("/v1/auth/refresh")) return response(200, { token: FRESH, refreshToken: "rotated" });
      if (href.endsWith("/api/session")) return response(200, { ok: true });
      return response(200, { ok: true });
    }) as unknown as typeof fetch;

    await Promise.all([
      api.request("http://hsms.test", "/notifications", { showErrorToast: false }),
      api.request("http://hsms.test", "/attendance/elyon-college/my-classes", { showErrorToast: false }),
    ]);

    const refreshes = seen.filter((call) => call.url.endsWith("/v1/auth/refresh"));
    expect(refreshes).toHaveLength(1);
    expect(store.token).toBe(FRESH);

    const apiCalls = seen.filter((call) => call.url.startsWith("http://hsms.test"));
    expect(apiCalls.every((call) => call.auth === `Bearer ${FRESH}`)).toBe(true);

    // Hweb's own httpOnly copy has to move with it, or proxy.ts keeps reading
    // the expired one on the next navigation.
    const handoff = seen.find((call) => call.url.endsWith("/api/session"));
    expect(handoff).toBeTruthy();
  });

  it("replays a request that 401s once the token is renewed", async () => {
    stubWindow();
    const { api } = await loadApi(FRESH);
    let notificationsCalls = 0;

    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      const href = String(url);
      if (href.endsWith("/v1/auth/refresh")) return response(200, { token: ROTATED });
      if (href.endsWith("/api/session")) return response(200, { ok: true });
      notificationsCalls += 1;
      return notificationsCalls === 1 ? response(401, { error: "Unauthorized" }) : response(200, { ok: true });
    }) as unknown as typeof fetch;

    await expect(api.request("http://hsms.test", "/notifications")).resolves.toEqual({ ok: true });
    expect(notificationsCalls).toBe(2);
  });

  it("never signs a silent poll out when the refresh itself fails", async () => {
    const location = stubWindow();
    const { api } = await loadApi(FRESH);

    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      if (String(url).endsWith("/v1/auth/refresh")) return response(401, { code: "INVALID_REFRESH" });
      return response(401, { error: "Unauthorized" });
    }) as unknown as typeof fetch;

    await expect(
      api.request("http://hsms.test", "/notifications", { showErrorToast: false }),
    ).rejects.toMatchObject({ status: 401 });
    expect(location.href).toBe("");
  });

  it("ends a user-facing session whose refresh token is gone", async () => {
    const location = stubWindow();
    const { api } = await loadApi(FRESH);

    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      if (String(url).endsWith("/v1/auth/refresh")) return response(401, { code: "INVALID_REFRESH" });
      return response(401, { error: "Unauthorized" });
    }) as unknown as typeof fetch;

    await expect(api.request("http://hsms.test", "/students")).rejects.toMatchObject({ status: 401 });
    expect(location.href).toBe("/api/logout");
  });
});
