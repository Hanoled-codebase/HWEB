import { expect, mockRequests, signIn, test } from "./support";

test.describe("a subject teacher's gradebook", () => {
  test("enters CA 2 scores for the class and saves them", async ({ page }) => {
    await signIn(page, "teacher");
    await expect(page).toHaveURL(/\/welcome$/);
    // CA 2 is the second assessment (index 1) on the Mathematics JSS 1A sheet.
    await page.goto("/dashboard/school/greenfield/spreadsheets/sheet-maths/assessment/1");

    // Each learner's score box (the +/- buttons beside it are named after them too).
    const score = (name: string) => page.getByRole("spinbutton", { name });
    await score("Ada Obi").fill("18");
    // A score above the assessment's total is capped at it (CA 2 is out of 20).
    await score("Kemi Bello").fill("25");
    await expect(score("Kemi Bello")).toHaveValue("20");

    await page.getByRole("button", { name: "Save 2 scores" }).click();
    await expect(page.getByText("CA 2 saved successfully")).toBeVisible();

    const saved = (await mockRequests()).find(
      (r) => r.backend === "hsms" && r.method === "PATCH" && r.path === "/spreadsheets/greenfield/sheet-maths",
    );
    const rows = (saved?.body.data ?? []) as Array<{ student: { id: string }; values: Array<string | number | null> }>;
    const ca2 = Object.fromEntries(rows.map((row) => [row.student.id, Number(row.values[1])]));
    expect(ca2).toEqual({ "stu-ada": 18, "stu-kemi": 20 });
    // CA 1 scores already on the sheet are kept.
    expect(rows.map((row) => Number(row.values[0]))).toEqual([17, 15]);

    // Walk backwards up the desktop spreadsheet hierarchy cleanly.
    await page.getByRole("link", { name: "Back to Assessments" }).click();
    await expect(page).toHaveURL(/\/dashboard\/school\/greenfield\/spreadsheets\/sheet-maths$/);
    await expect(page.getByRole("heading", { name: /Mathematics/ })).toBeVisible();

    await page.getByRole("link", { name: "Back to Spreadsheets" }).click();
    await expect(page).toHaveURL(/\/dashboard\/school\/greenfield\/spreadsheets$/);
    await expect(page.getByText(/Showing 1 of 1 spreadsheets/)).toBeVisible();

    await page.getByRole("link", { name: "Back to Overview" }).click();
    await expect(page).toHaveURL(/\/dashboard\/school\/greenfield$/);
  });

  test("warns on unsaved score changes before navigating back", async ({ page }) => {
    await signIn(page, "teacher");
    await expect(page).toHaveURL(/\/welcome$/);
    await page.goto("/dashboard/school/greenfield/spreadsheets/sheet-maths/assessment/1");

    const score = page.getByRole("spinbutton", { name: "Ada Obi" });
    await score.fill("19");

    await page.getByRole("link", { name: "Back to Assessments" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Unsaved score changes" })).toBeVisible();

    await dialog.getByRole("button", { name: "Stay on page" }).click();
    await expect(dialog).toBeHidden();
    await expect(score).toHaveValue("19");

    await page.getByRole("link", { name: "Back to Assessments" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Save & go back" }).click();
    await expect(page).toHaveURL(/\/dashboard\/school\/greenfield\/spreadsheets\/sheet-maths$/);
  });
});
