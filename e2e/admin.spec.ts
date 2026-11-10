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

  test("saves school details on Settings and shows real School Information values across reloads", async ({ page }) => {
    await signIn(page, "admin");
    await expect(page).toHaveURL(/\/welcome$/);

    await page.goto("/dashboard/school/greenfield");
    await expect(page.getByRole("heading", { name: "School Information" })).toBeVisible();
    await expect(page.getByText("Standard", { exact: true })).toBeVisible();

    await page.getByRole("link", { name: "Edit details" }).click();
    await expect(page).toHaveURL(/\/dashboard\/school\/greenfield\/settings$/);

    await page.getByRole("combobox", { name: "Category" }).click();
    await page.getByRole("option", { name: "Secondary School" }).click();

    await page.getByRole("combobox", { name: "Type" }).click();
    await page.getByRole("option", { name: "Private" }).click();

    await page.getByLabel("Student ID Prefix").fill("GFA");
    await page.getByLabel("Next ID Sequence Number").fill("15");

    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText("School profile updated successfully")).toBeVisible();

    const patch = (await mockRequests()).find((r) => r.backend === "hsms" && r.method === "PATCH" && r.path === "/organizations/greenfield");
    expect(patch?.body).toMatchObject({
      category: "secondary",
      schoolType: "private",
      idPrefix: "GFA",
      nextIdSequence: 15,
    });

    // Hard reload verifies settings and dashboard pull persisted values from the backend.
    await page.reload();
    await expect(page.getByLabel("Student ID Prefix")).toHaveValue("GFA");
    await expect(page.getByLabel("Next ID Sequence Number")).toHaveValue("15");
    await expect(page.getByRole("combobox", { name: "Category" })).toContainText("Secondary School");
    await expect(page.getByRole("combobox", { name: "Type" })).toContainText("Private");

    await page.goto("/dashboard/school/greenfield");
    const infoCard = page.getByRole("region", { name: "School Information" });
    await expect(infoCard.getByText("Secondary", { exact: true })).toBeVisible();
    await expect(infoCard.getByText("Private", { exact: true })).toBeVisible();
    await expect(infoCard.getByText("Active", { exact: true })).toBeVisible();
    await expect(infoCard.getByText("Standard", { exact: true })).toBeVisible();
  });
});
