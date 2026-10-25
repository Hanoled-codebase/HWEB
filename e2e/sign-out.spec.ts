import { expect, mockRequests, signIn, test } from "./support";

// Signing out has to reach HSMS, not just HCORE and HCBT. HSMS's cookies are
// host-only to api.hanoled.com, so Hweb cannot expire them itself: only HSMS
// answering the logout call with Set-Cookie can. A stale legacy `accessToken`
// left behind here used to shadow the HCORE bearer token on every later
// request (see Hanoled middleware/verifyJwt.js).
test.describe("signing out", () => {
  test("ends the HCORE, HCBT and HSMS sessions", async ({ page }) => {
    await signIn(page, "parent");
    await expect(page).toHaveURL(/\/welcome$/);

    await page.getByRole("button", { name: /Sign out/ }).click();
    await expect(page).toHaveURL(/\/signin/);

    const requests = await mockRequests();
    const loggedOut = requests
      .filter((r) => r.method === "POST" && r.path.endsWith("/auth/logout"))
      .map((r) => `${r.backend}${r.path}`);

    expect(loggedOut).toContain("hcore/v1/auth/logout");
    expect(loggedOut).toContain("hsms/auth/logout");
    expect(loggedOut).toContain("hcbt/api/auth/logout");
  });
});
