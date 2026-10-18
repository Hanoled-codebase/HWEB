import { expect, signIn, test } from "./support";

test.describe("the MVP launch parks the money rails", () => {
  test("the accountant's payment recorder points at the bursary book instead", async ({ page }) => {
    await signIn(page, "accountant");
    await expect(page).toHaveURL(/\/welcome$/);
    await page.goto("/dashboard/school/greenfield/payments/record");

    // PARKED_FOR_MVP: the recorder is commented out in the page until the
    // payments release — the bursary keeps its book meanwhile.
    await expect(page.getByText("Recording payments is coming soon")).toBeVisible();
  });

  test("a parent's fees page asks them to pay at the bursary for now", async ({ page }) => {
    // Signing in from a link to the fees page still comes back to it.
    await signIn(page, "parent", { path: "/signin?callbackUrl=%2Fdashboard%2Fschool%2Fgreenfield%2Finvoices" });
    await expect(page).toHaveURL(/\/dashboard\/school\/greenfield\/invoices$/);

    await expect(page.getByText("Fees & invoices are coming soon")).toBeVisible();
    await expect(page.getByText("pay at the school bursary and your records sync once payments go live")).toBeVisible();
  });
});
