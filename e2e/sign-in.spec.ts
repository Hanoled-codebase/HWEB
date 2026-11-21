import { expect, mockRequests, signIn, test } from "./support";

test.describe("signing in", () => {
  test("a parent lands straight on their school dashboard and never sees the suite welcome screen", async ({ page }) => {
    await signIn(page, "parent");
    await expect(page).toHaveURL(/\/dashboard\/school\/greenfield$/);
    await expect(page.getByText("Ada Obi").filter({ visible: true }).first()).toBeVisible();
    // Parents have no suite switcher in the dashboard chrome.
    await expect(page.getByRole("link", { name: "Suite Hub" })).toHaveCount(0);

    // Direct navigation to /welcome or /signin bounces straight back to the school dashboard.
    await page.goto("/welcome");
    await expect(page).toHaveURL(/\/dashboard\/school\/greenfield$/);
    await expect(page.getByText("Welcome to the full")).toHaveCount(0);

    await page.goto("/signin");
    await expect(page).toHaveURL(/\/dashboard\/school\/greenfield$/);

    const login = (await mockRequests()).find((r) => r.backend === "hcore" && r.path === "/v1/auth/login");
    expect(login?.body).toMatchObject({ identifierType: "EMAIL", identifier: "mrs.obi@greenfield.test", audience: "hcore-api" });
  });

  test("a wrong password says so and stays on the form", async ({ page }) => {
    await page.goto("/signin");
    await page.getByPlaceholder("staff@school.edu").fill("mrs.obi@greenfield.test");
    await page.getByPlaceholder("••••••••").fill("not-my-password");
    await page.getByRole("button", { name: /Sign In to Dashboard/ }).click();
    await expect(page.getByText("Wrong email, admission number or password")).toBeVisible();
    await expect(page).toHaveURL(/\/signin/);
    // Typed identifier stays in the field instead of resetting blank after the action.
    await expect(page.getByPlaceholder("staff@school.edu")).toHaveValue("mrs.obi@greenfield.test");
  });

  test("clicking Launch dashboard on /welcome goes straight to the school dashboard", async ({ page }) => {
    await signIn(page, "teacher");
    await expect(page).toHaveURL(/\/welcome$/);

    await page.getByRole("link", { name: "Launch dashboard" }).click();
    await expect(page).toHaveURL(/\/dashboard\/school\/greenfield$/);
  });

  test("a pupil signs in with their admission number and lands in their HSMS dashboard", async ({ page }) => {
    await signIn(page, "pupil");
    await expect(page).toHaveURL(/\/dashboard\/school\/greenfield/);
    const login = (await mockRequests()).find((r) => r.path === "/v1/auth/login");
    expect(login?.body).toMatchObject({ identifierType: "ADMISSION_NUMBER", identifier: "GF/2026/001", organizationSlugOrId: "greenfield" });
  });

  test("the school picker recovers from an invalid directory response on mobile", async ({ page }) => {
    let calls = 0;
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route("**/v1/public/organizations", (route) => {
      calls++;
      return calls === 1 ? route.fulfill({ json: [{ slug: "greenfield" }] }) : route.fallback();
    });

    await page.goto("/signin");
    await page.getByRole("button", { name: "Student / Candidate" }).click();
    await page.getByRole("button", { name: /Select your school/ }).click();
    await expect(page.getByText(/School directory unavailable/)).toBeVisible();
    const retry = page.getByRole("button", { name: "Try again" });
    await retry.focus();
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: /Greenfield Academy/ }).click();
    await expect(page.getByText("Greenfield Academy", { exact: true }).filter({ visible: true }).first()).toBeVisible();
    expect(calls).toBe(2);
    expect(pageErrors).toEqual([]);
  });

  test("an exam candidate who signs in by email is taken to their exams", async ({ page }) => {
    await signIn(page, "candidate");
    await expect(page).toHaveURL(/\/cbt\/student\?orgSlug=greenfield/);
  });

  // The pupil holds an HSMS STUDENT role as well as the HCBT CANDIDATE one, so
  // the welcome hub must stay reachable — it carries their "Launch dashboard"
  // tile into the HSMS student view. Only CBT-only candidates are bounced.
  test("a pupil visiting the welcome hub keeps their HSMS access", async ({ page }) => {
    await signIn(page, "pupil");
    await expect(page).toHaveURL(/\/dashboard\/school\/greenfield/);
    await page.goto("/welcome");
    await expect(page.getByRole("link", { name: "Launch dashboard" })).toBeVisible();
    await expect(page).not.toHaveURL(/\/cbt\/student/);
  });

  test("a CBT-only candidate visiting the welcome hub is sent to their exam room", async ({ page }) => {
    await signIn(page, "candidate");
    await expect(page).toHaveURL(/\/cbt\/student\?orgSlug=greenfield/);
    await page.goto("/welcome");
    await expect(page).toHaveURL(/\/cbt\/student\?orgSlug=greenfield/);
  });

  // "Back to Suite" in the CBT portal returns pupils to their HSMS school dashboard.
  test("a pupil clicking Back to Suite leaves the exam room", async ({ page }) => {
    await signIn(page, "pupil");
    await expect(page).toHaveURL(/\/dashboard\/school\/greenfield/);
    await page.goto("/cbt/student?orgSlug=greenfield");
    await page.getByRole("link", { name: "Back to Suite" }).click();
    await expect(page).toHaveURL(/\/dashboard\/school\/greenfield/);
    await expect(page).not.toHaveURL(/\/cbt\/student/);
  });

  test("someone on a school-issued password chooses their own first", async ({ page }) => {
    await signIn(page, "newTeacher");
    await expect(page.getByRole("heading", { name: "Choose a new password" })).toBeVisible();
    await page.getByLabel("New password", { exact: true }).fill("My-Own-Password-2026");
    await page.getByLabel("Type it again").fill("My-Own-Password-2026");
    await page.getByRole("button", { name: /Set password and continue/ }).click();
    await expect(page).toHaveURL(/\/welcome$/);

    const change = (await mockRequests()).find((r) => r.path === "/v1/auth/password/change");
    expect(change?.body).toMatchObject({ newPassword: "My-Own-Password-2026" });
  });

  test("a pupil visiting /welcome keeps HSMS access (not bounced to CBT)", async ({ page }) => {
    await signIn(page, "pupil");
    await expect(page).toHaveURL(/\/dashboard\/school\/greenfield/);

    // Navigate to the Welcome Hub.
    await page.goto("/welcome");
    await expect(page).toHaveURL(/\/welcome$/);

    // The hub renders with the HSMS "Launch dashboard" tile visible and opens the student dashboard.
    await expect(page.getByRole("link", { name: "Launch dashboard" })).toBeVisible();
    await page.getByRole("link", { name: "Launch dashboard" }).click();
    await expect(page).toHaveURL(/\/dashboard\/school\/greenfield$/);
  });

  test("a pupil navigating to a staff-only route is redirected to their school dashboard", async ({ page }) => {
    await signIn(page, "pupil");
    await expect(page).toHaveURL(/\/dashboard\/school\/greenfield/);
    await page.goto("/dashboard/school/greenfield/payroll");
    await expect(page).toHaveURL(/\/dashboard\/school\/greenfield$/);
  });

  test("a CBT-only candidate visiting /welcome is routed to the exam room", async ({ page }) => {
    await signIn(page, "candidate");
    await expect(page).toHaveURL(/\/cbt\/student/);

    // A candidate with no HSMS role has no reason to stay on the hub.
    await page.goto("/welcome");
    await expect(page).toHaveURL(/\/cbt\/student/);
  });

  test("a signed-out visitor to the dashboard is sent to sign in first", async ({ page }) => {
    await page.goto("/dashboard/school/greenfield/invoices");
    await expect(page).toHaveURL(/\/signin\?callbackUrl=%2Fdashboard%2Fschool%2Fgreenfield%2Finvoices/);
  });
});
