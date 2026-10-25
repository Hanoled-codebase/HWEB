import { afterEach, describe, expect, it, vi } from "vitest";

// Signing out has to end every backend session, including HSMS's. HSMS's
// cookies are host-only to api.hanoled.com, so Hweb cannot delete them itself —
// only HSMS can, by answering a logout call with Set-Cookie. If this call goes
// missing, the stale `accessToken` cookie survives sign-out, and before the
// verifyJwt fix that alone was enough to 401 every later request.

async function loadSignOut({ edgeMode = false, backendDown = false } = {}) {
  vi.resetModules();
  // One ordered log across all three mocks, so ordering is actually assertable.
  const log: string[] = [];
  const maybeFail = async () => {
    if (backendDown) throw new Error("ECONNREFUSED");
  };

  vi.doMock("../api", () => ({
    HCORE_BASE: "http://hcore.test",
    HSMS_BASE: "http://hsms.test",
    EDGE_MODE: edgeMode,
    request: vi.fn(async (base: string, endpoint: string) => {
      log.push(`${base}${endpoint}`);
      await maybeFail();
      return {};
    }),
  }));
  vi.doMock("../api-cbt", () => ({
    cbtApi: {
      logout: vi.fn(async () => {
        log.push("cbt/auth/logout");
        await maybeFail();
      }),
    },
  }));
  vi.doMock("../auth-tokens", () => ({
    clearAuthTokens: vi.fn(() => {
      log.push("clearAuthTokens");
    }),
  }));

  const { endBackendSessions } = await import("../sign-out");
  return { endBackendSessions, log };
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("endBackendSessions", () => {
  it("ends the HCORE, HCBT and HSMS sessions, then forgets the stored tokens", async () => {
    const { endBackendSessions, log } = await loadSignOut();

    await endBackendSessions();

    expect(log).toEqual([
      "http://hcore.test/v1/auth/logout",
      "cbt/auth/logout",
      "http://hsms.test/auth/logout",
      // Last: in bearer mode the calls above authenticate with these tokens.
      "clearAuthTokens",
    ]);
  });

  it("asks HSMS to log out even when HCORE and HCBT are unreachable", async () => {
    const { endBackendSessions, log } = await loadSignOut({ backendDown: true });

    await endBackendSessions();

    expect(log).toContain("http://hsms.test/auth/logout");
    expect(log[log.length - 1]).toBe("clearAuthTokens");
  });

  it("reaches no remote backend in the offline edge build", async () => {
    const { endBackendSessions, log } = await loadSignOut({ edgeMode: true });

    await endBackendSessions();

    // Only HCBT, which the appliance serves itself.
    expect(log).toEqual(["cbt/auth/logout", "clearAuthTokens"]);
  });

  it("never rejects when a backend is down", async () => {
    const { endBackendSessions } = await loadSignOut({ backendDown: true });

    await expect(endBackendSessions()).resolves.toBeUndefined();
  });
});
