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
    // A score above the assessment's total is rejected (CA 2 is out of 20).
    await score("Kemi Bello").fill("25");
    await expect(page.getByText("Enter a score from 0 to 20")).toBeVisible();
    await score("Kemi Bello").fill("20");
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

  test("adds unlimited sub-assessments, validates scores, and normalizes category/overall totals to admin caps", async ({ page }) => {
    await signIn(page, "teacher");
    await expect(page).toHaveURL(/\/welcome$/);
    await page.goto("/dashboard/school/greenfield/spreadsheets/sheet-physics-rel");

    // 1. Admin-locked categories and readiness summary are shown.
    await expect(page.getByRole("heading", { name: "Assessment Categories" })).toBeVisible();
    await expect(page.getByText("Standard 10/10/10/70 Template")).toBeVisible();
    await expect(page.getByText("4/4 categories ready · 100 max")).toBeVisible();
    // Examination is fixed by admin and offers no Add button.
    await expect(page.getByRole("button", { name: /Add Examination/i })).toHaveCount(0);

    // 2. Add a 3rd 10-mark Classwork sub-assessment (30 raw marks scaling to the 10-mark admin cap).
    await page.getByRole("button", { name: "Add Classwork" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Sub-Assessment Name").fill("Classwork 3");
    await dialog.getByLabel("Maximum Marks (whole number)").fill("10");
    await dialog.getByRole("button", { name: "Add Sub-Assessment" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText("30 raw → 10")).toBeVisible();

    // 3. Reject invalid score above sub-assessment max and disable Save.
    const scoreRegion = page.getByRole("region", { name: "Student Scores & Totals" });
    const cw1Ada = scoreRegion.getByRole("spinbutton", { name: "Ada Obi Classwork 1 score out of 10" });
    await cw1Ada.fill("12");
    await expect(scoreRegion.getByText("Score cannot exceed 10")).toBeVisible();
    await expect(page.getByRole("button", { name: /Save/i })).toBeDisabled();

    // 4. Enter valid scores across all categories and verify normalized Category + Overall totals.
    // Classwork: (10/10 + 10/10 + 10/10) / 3 * 10 = 10
    await cw1Ada.fill("10");
    await scoreRegion.getByRole("spinbutton", { name: "Ada Obi Classwork 2 score out of 10" }).fill("10");
    await scoreRegion.getByRole("spinbutton", { name: "Ada Obi Classwork 3 score out of 10" }).fill("10");
    // Assignments: (5/5 + 4/5) / 2 * 10 = 9
    await scoreRegion.getByRole("spinbutton", { name: "Ada Obi Assignment 1 score out of 5" }).fill("5");
    await scoreRegion.getByRole("spinbutton", { name: "Ada Obi Assignment 2 score out of 5" }).fill("4");
    // Projects: (8/10 + 6/10) / 2 * 10 = 7
    await scoreRegion.getByRole("spinbutton", { name: "Ada Obi Project 1 score out of 10" }).fill("8");
    await scoreRegion.getByRole("spinbutton", { name: "Ada Obi Project 2 score out of 10" }).fill("6");
    // Examination: 60/70 = 60
    await scoreRegion.getByRole("spinbutton", { name: "Ada Obi Examination score out of 70" }).fill("60");

    // 10 (CW) + 9 (ASGN) + 7 (PRJ) + 60 (Exam) = 86/100.
    const adaRow = page.locator("tbody tr", { hasText: "Ada Obi" });
    await expect(adaRow).toContainText("86/100");

    await page.getByRole("button", { name: "Save 8 Scores" }).click();
    await expect(page.getByText("Saved 8 scores")).toBeVisible();

    const savedReq = (await mockRequests()).find(
      (r) => r.backend === "hsms" && r.method === "PUT" && r.path === "/spreadsheets/greenfield/sheet-physics-rel/scores",
    );
    expect(savedReq).toBeTruthy();
    expect(savedReq?.body.expectedVersion).toBe(2);
    expect((savedReq?.body.scores as unknown[])?.length).toBe(8);
  });
});
