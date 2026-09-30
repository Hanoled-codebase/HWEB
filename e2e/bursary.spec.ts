import { expect, mockRequests, signIn, test } from "./support";

test.describe("the school accountant", () => {
  test("records part of a fee paid in cash and gets a receipt", async ({ page }) => {
    await signIn(page, "accountant");
    await expect(page).toHaveURL(/\/welcome$/);
    await page.goto("/dashboard/school/greenfield/payments/record");
    await expect(page.getByRole("heading", { name: "Record a payment" })).toBeVisible();

    // Find who is paying.
    await page.getByPlaceholder("Student name or admission number").fill("Ada");
    await page.getByRole("button", { name: /Ada Obi/ }).click();

    // ₦40,000 of the ₦100,000 still owed, taken as cash.
    await page.getByLabel("Amount received").fill("40000");
    await page.getByRole("button", { name: "Record ₦40,000" }).click();
    await expect(page.getByText("₦60,000 will still be owed")).toBeVisible();
    await page.getByRole("button", { name: "Confirm payment" }).click();

    await expect(page.getByRole("heading", { name: "₦40,000 recorded" })).toBeVisible();
    await expect(page.getByText("RCPT-0002")).toBeVisible();
    await expect(page.getByText("₦60,000 left")).toBeVisible();

    const recorded = (await mockRequests()).find(
      (r) => r.backend === "hsms" && r.method === "POST" && r.path === "/finance/greenfield/invoices/inv-first-term/payments",
    );
    expect(recorded?.body).toMatchObject({ amount: 40000, channel: "CASH" });
  });

  test("can't take more than is owed on a bill", async ({ page }) => {
    await signIn(page, "accountant");
    await expect(page).toHaveURL(/\/welcome$/);
    await page.goto("/dashboard/school/greenfield/payments/record");

    await page.getByPlaceholder("Student name or admission number").fill("GF/2026");
    await page.getByRole("button", { name: /Ada Obi/ }).click();
    await page.getByLabel("Amount received").fill("150000");
    await page.getByRole("button", { name: "Record ₦150,000" }).click();

    await expect(page.getByRole("alert").filter({ hasText: "more than the ₦100,000 owed" })).toBeVisible();
    const posted = (await mockRequests()).filter((r) => r.backend === "hsms" && r.method === "POST" && r.path.includes("/payments"));
    expect(posted).toEqual([]);
  });
});
