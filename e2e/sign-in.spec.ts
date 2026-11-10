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
  });

  test("a pupil signs in with their admission number and goes straight to their exams", async ({ page }) => {
    await signIn(page, "pupil");
    await expect(page).toHaveURL(/\/cbt\/student\?orgSlug=greenfield/);
    const login = (await mockRequests()).find((r) => r.path === "/v1/auth/login");
    expect(login?.body).toMatchObject({ identifierType: "ADMISSION_NUMBER", identifier: "GF/2026/001", organizationSlugOrId: "greenfield" });
  });

  test("an exam candidate who signs in by email is taken to their exams", async ({ page }) => {
    await signIn(page, "candidate");
    await expect(page).toHaveURL(/\/cbt\/student\?orgSlug=greenfield/);
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
    // Pupil lands in the exam room after sign-in (CBT-first).
    await expect(page).toHaveURL(/\/cbt\/student/);

    // Navigate to the Welcome Hub (the "Back to Suite" destination).
    await page.goto("/welcome");
    await expect(page).toHaveURL(/\/welcome$/);

    // The hub renders with the HSMS "Launch dashboard" tile visible.
    await expect(page.getByRole("link", { name: "Launch dashboard" })).toBeVisible();
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
