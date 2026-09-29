import { describe, expect, it } from "vitest";
import { scrubBreadcrumb, scrubEvent, sentryOptions } from "../sentry";

describe("Sentry options", () => {
  it("stays off without a DSN and turns off Sentry's default data collection", () => {
    expect(sentryOptions(undefined).enabled).toBe(false);
    const options = sentryOptions("https://public@o0.ingest.sentry.io/0");
    expect(options.enabled).toBe(true);
    expect(options.dataCollection).toMatchObject({
      userInfo: false,
      cookies: false,
      httpBodies: [],
      urlQueryParams: false,
      stackFrameVariables: false,
    });
  });

  it("drops query strings (reset links carry emails), cookies, bodies, referers and user details", () => {
    const event = scrubEvent({
      request: {
        url: "https://app.hanoled.com/reset-password?email=parent@example.com#code",
        query_string: "email=parent@example.com",
        data: { newPassword: "x" },
        cookies: { hcore_session: "x" },
        headers: { "User-Agent": "Chrome", Referer: "https://app.hanoled.com/forgot-password?email=parent@example.com" },
      },
      user: { id: "p-1", email: "parent@example.com" },
    } as never);

    expect(event.request).toEqual({ url: "https://app.hanoled.com/reset-password", headers: { "User-Agent": "Chrome" } });
    expect(event.user).toEqual({ id: "p-1" });
  });

  it("drops console breadcrumbs and query strings from navigation and requests", () => {
    expect(scrubBreadcrumb({ category: "console", message: "student@school.ng" })).toBeNull();
    const navigation = scrubBreadcrumb({
      category: "navigation",
      data: { from: "/signin?callbackUrl=/x", to: "/accept-invite?token=abc" },
    });
    expect(navigation?.data).toEqual({ from: "/signin", to: "/accept-invite" });
    expect(scrubBreadcrumb({ category: "fetch", data: { url: "https://api.test/a?token=abc" } })?.data?.url).toBe("https://api.test/a");
  });
});
