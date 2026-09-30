import { expect, mockRequests, signIn, test } from "./support";

test.describe("signing in", () => {
  test("a parent lands on the welcome page with the school dashboard", async ({ page }) => {
    await signIn(page, "parent");
    await expect(page).toHaveURL(/\/welcome$/);
    await expect(page.getByRole("link", { name: "Launch dashboard" })).toBeVisible();
    // A parent holds no CBT role, so the exam engine isn't offered.
    await expect(page.getByRole("link", { name: "Launch CBT engine" })).toHaveCount(0);

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

  test("a signed-out visitor to the dashboard is sent to sign in first", async ({ page }) => {
    await page.goto("/dashboard/school/greenfield/invoices");
    await expect(page).toHaveURL(/\/signin\?callbackUrl=%2Fdashboard%2Fschool%2Fgreenfield%2Finvoices/);
  });
});
