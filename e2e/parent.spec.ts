import { expect, mockRequests, signIn, test } from "./support";

test.describe("a parent", () => {
  test("sees their child's published results", async ({ page }) => {
    await signIn(page, "parent");
    await expect(page).toHaveURL(/\/welcome$/);
    await page.goto("/dashboard/school/greenfield/results");

    await expect(page.getByRole("heading", { name: "Ada Obi" })).toBeVisible();
    const maths = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Mathematics" }) });
    // CA 1 17/20, CA 2 18/20, Exam 52/60: 87 of 100.
    await expect(maths.getByText("52 / 60")).toBeVisible();
    await expect(maths.getByText("87 / 100").first()).toBeVisible();

    const asked = (await mockRequests()).filter((r) => r.backend === "hsms").map((r) => r.path);
    expect(asked).toContain("/spreadsheets/greenfield/results");
  });

  test("pays what's left of a fee invoice online", async ({ page }) => {
    // Signing in from a link to the fees page comes back to it.
    await signIn(page, "parent", { path: "/signin?callbackUrl=%2Fdashboard%2Fschool%2Fgreenfield%2Finvoices" });
    await expect(page).toHaveURL(/\/dashboard\/school\/greenfield\/invoices$/);

    await expect(page.getByText("₦100,000").first()).toBeVisible();
    await page.getByRole("button", { name: /Pay/ }).first().click();

    // Paystack's checkout (a stand-in here) is where the parent ends up.
    await page.waitForURL(/127\.0\.0\.1:4912\/__checkout\?invoice=inv-first-term/);
    const init = (await mockRequests()).find((r) => r.backend === "hsms" && r.path === "/payments/init/greenfield");
    expect(init?.body).toMatchObject({ invoiceId: "inv-first-term" });
  });
});
