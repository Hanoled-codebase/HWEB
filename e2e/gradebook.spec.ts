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

  test("navigates conditional assessment flow: direct entry for fixed exam, nested sub-assessment list for split category, and saves scores", async ({ page }) => {
    await signIn(page, "teacher");
    await expect(page).toHaveURL(/\/welcome$/);
    await page.goto("/dashboard/school/greenfield/spreadsheets/sheet-physics-rel");

    // 1. Clean admin-defined assessment category list is shown.
    await expect(page.getByRole("button", { name: /Classwork.*Max 10/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Assignments.*Max 10/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Projects.*Max 10/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Examination.*Max 70/i })).toBeVisible();

    // 2. Examination has no sub-assessments -> tapping opens dedicated Score Entry directly.
    await page.getByRole("button", { name: /Examination.*Max 70/i }).click();
    await expect(page).toHaveURL(/\/spreadsheets\/sheet-physics-rel\/assessment\/sub-exam$/);
    await expect(page.getByText("Out of 70")).toBeVisible();

    const examAda = page.getByRole("spinbutton", { name: "Ada Obi" });
    await examAda.fill("60");
    await page.getByRole("button", { name: "Save 1 score" }).click();
    await expect(page.getByText("Examination saved successfully")).toBeVisible();

    // Back from direct entry returns to Assessments list.
    await page.getByRole("link", { name: "Back to Assessments" }).click();
    await expect(page).toHaveURL(/\/spreadsheets\/sheet-physics-rel$/);

    // 3. Classwork has teacher-created sub-assessments -> tapping opens the nested Sub-Assessments List.
    await page.getByRole("button", { name: /Classwork.*2 sub-assessments/i }).click();
    await expect(page).toHaveURL(/\/spreadsheets\/sheet-physics-rel\/category\/cat-cw$/);
    await expect(page.getByRole("button", { name: /Classwork 1.*Max 10/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Classwork 2.*Max 10/i })).toBeVisible();

    // 4. Add a 3rd 10-mark Classwork sub-assessment (30 raw marks scaling to 10-mark admin cap).
    await page.getByRole("button", { name: "Add sub-assessment" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Sub-Assessment Name").fill("Classwork 3");
    await dialog.getByLabel("Maximum Marks (whole number)").fill("10");
    await dialog.getByRole("button", { name: "Add Sub-Assessment" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText("30 raw → 10")).toBeVisible();

    // 5. Open Classwork 3 dedicated score page, verify validation and save.
    await page.getByRole("button", { name: /Classwork 3.*Max 10/i }).click();
    await expect(page.getByText("Out of 10")).toBeVisible();

    const cw3Ada = page.getByRole("spinbutton", { name: "Ada Obi" });
    await cw3Ada.fill("12");
    await expect(page.getByText("Enter a score from 0 to 10")).toBeVisible();
    await cw3Ada.fill("9");
    await page.getByRole("button", { name: "Save 1 score" }).click();
    await expect(page.getByText("Classwork 3 saved successfully")).toBeVisible();

    // Back from a sub-assessment returns to the Classwork sub-assessments list.
    await page.getByRole("link", { name: "Back to Classwork" }).click();
    await expect(page).toHaveURL(/\/spreadsheets\/sheet-physics-rel\/category\/cat-cw$/);

    const savedReqs = (await mockRequests()).filter(
      (r) => r.backend === "hsms" && r.method === "PUT" && r.path === "/spreadsheets/greenfield/sheet-physics-rel/scores",
    );
    expect(savedReqs.length).toBe(2);
  });

  test("opens direct score entry when a category has no sub-assessments yet and auto-provisions on save", async ({ page }) => {
    await signIn(page, "teacher");
    await expect(page).toHaveURL(/\/welcome$/);
    await page.goto("/dashboard/school/greenfield/spreadsheets/sheet-agri-rel");

    // Classwork has 0 sub-assessments -> tapping opens dedicated Score Entry directly (Out of 5).
    await page.getByRole("button", { name: /Classwork.*Max 5/i }).click();
    await expect(page).toHaveURL(/\/spreadsheets\/sheet-agri-rel\/assessment\/category-cat-agri-cw$/);
    await expect(page.getByText("Out of 5")).toBeVisible();

    await page.getByRole("spinbutton", { name: "Ada Obi" }).fill("5");
    await page.getByRole("spinbutton", { name: "Kemi Bello" }).fill("4");
    await page.getByRole("button", { name: "Save 2 scores" }).click();
    await expect(page.getByText("Classwork saved successfully")).toBeVisible();

    const reqs = await mockRequests();
    const createdSub = reqs.find(
      (r) => r.backend === "hsms" && r.method === "POST" && r.path === "/spreadsheets/greenfield/sheet-agri-rel/sub-assessments",
    );
    const savedScores = reqs.find(
      (r) => r.backend === "hsms" && r.method === "PUT" && r.path === "/spreadsheets/greenfield/sheet-agri-rel/scores",
    );
    expect(createdSub?.body).toMatchObject({ categoryId: "cat-agri-cw", name: "Classwork", maxMarks: 5 });
    expect(savedScores).toBeTruthy();
  });

  test("renders distilled mobile Results view with Options sheet and clean subject breakdown", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, "admin");
    await expect(page).toHaveURL(/\/welcome$/);
    await page.goto("/dashboard/school/greenfield/results");

    await expect(page.getByRole("button", { name: /Options/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Print Report/i })).toBeVisible();

    // Open Options bottom sheet and verify period/type/bundle controls live inside cleanly.
    await page.getByRole("button", { name: /Options/i }).click();
    await expect(page.getByRole("heading", { name: /Term, filters & export/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Mid-term" })).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();

    // Open a subject breakdown row from the distilled unified list.
    await page.getByRole("button", { name: /Mathematics/i }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog").getByRole("heading", { name: "Mathematics" })).toBeVisible();
  });
});
