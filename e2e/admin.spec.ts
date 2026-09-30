import { expect, mockRequests, signIn, test } from "./support";

test.describe("a school admin", () => {
  test("gives a pupil a temporary password, shown once", async ({ page }) => {
    await signIn(page, "admin");
    await expect(page).toHaveURL(/\/welcome$/);
    await page.goto("/dashboard/school/greenfield/students/stu-ada");

    await page.getByRole("button", { name: "Reset password" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Reset Ada Obi's password?" })).toBeVisible();
    await dialog.getByRole("button", { name: "Reset password" }).click();

    await expect(dialog.getByLabel("Temporary password")).toHaveText("K7M2QX9PHD");
    await expect(dialog.getByText("They sign in with their admission number and this password")).toBeVisible();
    const reset = (await mockRequests()).find((r) => r.backend === "hcore" && r.path.endsWith("/password-resets"));
    expect(reset?.body).toEqual({ learnerId: "0f5f1a52-0000-4000-8000-0000000000c1" });

    // Closing the dialog forgets the password: reopening doesn't show it again.
    await dialog.getByRole("button", { name: "Done" }).click();
    await page.getByRole("button", { name: "Reset password" }).click();
    await expect(page.getByRole("dialog").getByText("K7M2QX9PHD")).toHaveCount(0);
  });

  test("is the only one offered the reset: a teacher opening the same pupil isn't", async ({ page }) => {
    await signIn(page, "teacher");
    await expect(page).toHaveURL(/\/welcome$/);
    await page.goto("/dashboard/school/greenfield/students/stu-ada");

    await expect(page.getByText("Ada Obi").filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Reset password" })).toHaveCount(0);
  });
});
