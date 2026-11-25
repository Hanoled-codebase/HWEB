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
    await expect(page.getByText("Enter a score between 0 and 20.")).toBeVisible();
    await score("Kemi Bello").fill("20");
    await expect(score("Kemi Bello")).toHaveValue("20");

    await page.getByRole("button", { name: "Save 2 scores" }).click();
    await expect(page.getByText("CA 2 scores saved")).toBeVisible();

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
    await expect(page.getByText(/Showing 1 of 1 spreadsheets?/)).toBeVisible();

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
    await expect(dialog.getByRole("heading", { name: "Save changes before leaving?" })).toBeVisible();

    await dialog.getByRole("button", { name: "Stay here" }).click();
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
    await expect(page.getByText("Examination scores saved")).toBeVisible();

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
    await expect(page.getByText("Enter a score between 0 and 10.")).toBeVisible();
    await cw3Ada.fill("9");
    await page.getByRole("button", { name: "Save 1 score" }).click();
    await expect(page.getByText("Classwork 3 scores saved")).toBeVisible();

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
    await expect(page.getByText("Classwork scores saved")).toBeVisible();

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

  test("renders mobile Results flow: Level 1 catalog -> Level 2 general overview -> Level 3 subject breakdown & options sheet", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, "admin");
    await expect(page).toHaveURL(/\/welcome$/);
    await page.goto("/dashboard/school/greenfield/results");

    // Level 1: Admin first sees Result Editions Catalog and selects "First Term Result".
    await expect(page.getByRole("heading", { name: "Academic Results Catalog" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "First Term Result", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "First Term Mid-Term Result", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Open Overview" }).first().click();

    // Level 2: Mobile General Overview shows All Students (2), KPI strip, Filter & Sort, and both learners.
    await expect(page.getByRole("tab", { name: /All Students \(2\)/i })).toBeVisible();
    await expect(page.getByText("Ada Obi").filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText("Kemi Bello").filter({ visible: true }).first()).toBeVisible();

    // Open Filter & Sort bottom sheet and verify period/type/bundle controls live inside cleanly.
    await page.getByRole("button", { name: /Filter & Sort/i }).click();
    await expect(page.getByRole("heading", { name: /Term, filters & export/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Mid-term" })).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();

    // Tap View Result on Ada Obi to enter Level 3 Individual View and open subject breakdown dialog.
    await page.getByRole("button", { name: "View Result" }).first().click();
    await expect(page.getByRole("button", { name: /Print Report/i })).toBeVisible();

    await page.getByRole("button", { name: /Mathematics/i }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog").getByRole("heading", { name: "Mathematics" })).toBeVisible();
  });

  test("admin selects result edition first, inspects Level 2 general overview & matrix, then drills into Level 3 individual result and switches stages", async ({ page }) => {
    await signIn(page, "admin");
    await expect(page).toHaveURL(/\/welcome$/);
    await page.goto("/dashboard/school/greenfield/results");

    // Level 1: Admin sees Result Editions Catalog first and selects "First Term Result".
    await expect(page.getByRole("heading", { name: "Academic Results Catalog" })).toBeVisible();

    // Verify organization brand color (#0F766E) is applied via SchoolThemeProvider CSS variable.
    await expect
      .poll(() =>
        page.evaluate(() =>
          getComputedStyle(document.documentElement).getPropertyValue("--primary").trim().toUpperCase(),
        ),
      )
      .toBe("#0F766E");

    await page.getByRole("button", { name: "Open Overview" }).first().click();

    // Level 2: General Results Overview opens on "All Students (2)" tab with KPI cards and multi-student table.
    await expect(page.getByRole("heading", { name: /Results Overview - JSS 1A/i })).toBeVisible();
    const allStudentsTab = page.getByRole("tab", { name: /All Students \(2\)/i }).filter({ visible: true }).first();
    await expect(allStudentsTab).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("rowheader", { name: /Ada Obi/i })).toBeVisible();
    await expect(page.getByRole("rowheader", { name: /Kemi Bello/i })).toBeVisible();

    // Switch to Subject Performance Matrix tab and verify matrix renders.
    const matrixTab = page.getByRole("tab", { name: "Subject Performance Matrix" });
    await matrixTab.click();
    await expect(matrixTab).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("columnheader", { name: "Mathematics" })).toBeVisible();
    await expect(page.getByText("Subject Average")).toBeVisible();

    // Return to All Students tab and click "View Result" for Ada Obi -> transitions to Level 3 Individual Student View.
    await allStudentsTab.click();
    await page.getByRole("button", { name: "View Result" }).filter({ visible: true }).first().click();
    await expect(page.getByRole("tab", { name: "Individual Student View" })).toHaveAttribute("aria-selected", "true");

    // End-of-term loads Mathematics by default.
    await expect(page.getByText("Mathematics").filter({ visible: true }).first()).toBeVisible();

    // Switch to Mid-term on the results page -> fetches ?resultType=MID_TERM and updates subject list to Physics.
    await page.getByRole("button", { name: "Mid-term" }).filter({ visible: true }).first().click();
    await expect(page.getByText("Physics").filter({ visible: true }).first()).toBeVisible();

    // Open Print Report modal -> banner shows Mid-Term and Physics row.
    await page.getByRole("button", { name: "Print Report", exact: true }).filter({ visible: true }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/Mid-Term Report Sheet/i)).toBeVisible();
    await expect(dialog.getByText("Physics")).toBeVisible();

    // Switch back to End-of-term INSIDE the report card modal -> updates live preview to Mathematics.
    await dialog.getByRole("button", { name: "End-of-term" }).click();
    await expect(dialog.getByText(/End-of-Term Report Sheet/i)).toBeVisible();
    await expect(dialog.getByText("Mathematics")).toBeVisible();

    // Close modal and confirm the page stayed synced to End-of-term.
    await dialog.getByRole("button", { name: "Close report preview" }).click();
    await expect(page.getByRole("button", { name: "End-of-term" }).filter({ visible: true }).first()).toHaveAttribute("aria-pressed", "true");
  });

  test("parent sees only available result names in Level 1 catalog and opens child result directly", async ({ page }) => {
    await signIn(page, "parent");
    await expect(page).toHaveURL(/\/dashboard\/school\/greenfield/);
    await page.goto("/dashboard/school/greenfield/results");

    // Level 1: Parent sees only the names of the results available to view (no class-wide KPIs or other students).
    await expect(page.getByRole("heading", { name: "Available Academic Results" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "First Term Result", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "First Term Mid-Term Result", exact: true })).toBeVisible();
    await expect(page.getByText("Kemi Bello")).toHaveCount(0);

    // Selecting "View First Term Result" opens Level 3 Child Academic Report directly.
    await page.getByRole("button", { name: "View First Term Result" }).click();
    await expect(page.getByText("Mathematics").filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Available Results" })).toBeVisible();
  });

  test("student sees only available result names in Level 1 catalog, selects result, and switches between End-of-term and Mid-term", async ({ page }) => {
    await signIn(page, "pupil");
    await expect(page).toHaveURL(/\/dashboard\/school\/greenfield/);
    await page.goto("/dashboard/school/greenfield/student/results");

    // Level 1: Student sees only available result names first.
    await expect(page.getByRole("heading", { name: "Available Academic Results" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "First Term Result", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "First Term Mid-Term Result", exact: true })).toBeVisible();

    // Student selects "View First Term Result" to open Level 3 report detail.
    await page.getByRole("button", { name: "View First Term Result" }).click();
    await expect(page.getByText(/mathematics/i).filter({ visible: true }).first()).toBeVisible();

    // Switch to Mid-term on student results page.
    await page.getByRole("button", { name: "Mid-term" }).click();
    await expect(page.getByText(/physics/i).filter({ visible: true }).first()).toBeVisible();

    // Open Print / Preview modal and switch back to End-of-term live inside the modal.
    await page.getByRole("button", { name: /Print \/ Preview/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText(/Mid-Term Report Sheet/i)).toBeVisible();
    await expect(dialog.getByText("Physics")).toBeVisible();

    await dialog.getByRole("button", { name: "End-of-term" }).click();
    await expect(dialog.getByText(/End-of-Term Report Sheet/i)).toBeVisible();
    await expect(dialog.getByText("Mathematics")).toBeVisible();
  });

  test("admin combines extra class arms from conflict dialog preserving scores and updates arms from sheet controls", async ({ page }) => {
    await signIn(page, "admin");
    await expect(page).toHaveURL(/\/welcome$/);

    const classes = [
      { id: "sss2-sci", name: "SSS 2 SCIENCE", level: "SSS2" },
      { id: "sss2-art", name: "SSS 2 ART/HUMANITIES", level: "SSS2" },
      { id: "sss2-bus", name: "SSS 2 BUSINESS/COMMERCIAL", level: "SSS2" },
    ];
    let currentClassIds = ["sss2-sci"];
    let currentVersion = 4;
    const combinePayloads: Array<Record<string, unknown>> = [];

    await page.route("**/classes/greenfield*", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(classes) });
    });
    await page.route("**/result-templates/templates/greenfield*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "tpl-sss-end",
            name: "SSS End-of-Term Standard",
            isApproved: true,
            isDefault: true,
            schoolSection: "ALL",
            termType: "END_TERM",
            resultType: "END_OF_TERM",
            assessmentCategories: [
              { id: "cat-ca", name: "CA", maxMarks: 30, isSingleInstance: false, position: 0 },
              { id: "cat-exam", name: "Exam", maxMarks: 70, isSingleInstance: true, position: 1 },
            ],
          },
        ]),
      });
    });
    await page.route("**/spreadsheets/greenfield?*", async (route) => {
      if (route.request().method() !== "GET") return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "X-Total-Count": "1" },
        body: JSON.stringify([
          {
            id: "sheet-maths",
            title: "Mathematics - SSS 2 SCIENCE",
            status: "pending",
            createdAt: "2026-10-29T08:58:22.805Z",
            resultType: "END_OF_TERM",
            termType: "END_TERM",
            hcoreAssessmentId: "hcore-sched-1",
            canonicalStatus: "SCHEDULED",
            recordedScoreCount: 24,
            canonicalScoreCount: 0,
            classLevelId: "sss2-sci",
            classLevelIds: currentClassIds,
            classLevels: classes.filter((c) => currentClassIds.includes(c.id)),
            classLevel: { id: "sss2-sci", name: "SSS 2 SCIENCE" },
            subject: { id: "maths", name: "Mathematics" },
          },
        ]),
      });
    });
    await page.route("**/spreadsheets/greenfield", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "sheet-maths",
            created: false,
            title: "Mathematics - SSS 2 SCIENCE",
            version: currentVersion,
            classLevelId: "sss2-sci",
            classLevelIds: currentClassIds,
            hasScores: true,
            recordedScoreCount: 24,
            hcoreAssessmentId: "hcore-sched-1",
            canonicalStatus: "SCHEDULED",
            canonicalScoreCount: 0,
            assessmentStorageMode: "RELATIONAL",
          }),
        });
        return;
      }
      await route.continue();
    });
    await page.route("**/spreadsheets/greenfield/sheet-maths/classes", async (route) => {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      combinePayloads.push(body);
      currentClassIds = Array.isArray(body.classLevels) ? (body.classLevels as string[]) : currentClassIds;
      currentVersion += 1;
      const selected = classes.filter((c) => currentClassIds.includes(c.id));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "sheet-maths",
          title: `Mathematics - ${selected.map((c) => c.name).join(", ")}`,
          status: "pending",
          version: currentVersion,
          assessmentStorageMode: "RELATIONAL",
          hcoreAssessmentId: "hcore-sched-1",
          canonicalStatus: "SCHEDULED",
          recordedScoreCount: 24,
          canonicalScoreCount: 0,
          classLevelId: selected[0]?.id ?? "sss2-sci",
          classLevelIds: currentClassIds,
          classLevels: selected,
          classLevel: selected[0] ?? { id: "sss2-sci", name: "SSS 2 SCIENCE" },
          subject: { id: "maths", name: "Mathematics" },
          assessments: [{ id: "sub-1", name: "CA 1", total: 20, maxObtainableScore: 20 }],
          columns: ["CA 1"],
          data: [],
        }),
      });
    });
    await page.route("**/spreadsheets/greenfield/sheet-maths", async (route) => {
      if (route.request().method() !== "GET") return route.continue();
      const selected = classes.filter((c) => currentClassIds.includes(c.id));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "sheet-maths",
          title: `Mathematics - ${selected.map((c) => c.name).join(", ")}`,
          status: "pending",
          version: currentVersion,
          assessmentStorageMode: "RELATIONAL",
          hcoreAssessmentId: "hcore-sched-1",
          canonicalStatus: "SCHEDULED",
          recordedScoreCount: 24,
          canonicalScoreCount: 0,
          classLevelId: selected[0]?.id ?? "sss2-sci",
          classLevelIds: currentClassIds,
          classLevels: selected,
          classLevel: selected[0] ?? { id: "sss2-sci", name: "SSS 2 SCIENCE" },
          subject: { id: "maths", name: "Mathematics" },
          assessments: [{ id: "sub-1", name: "CA 1", total: 20, maxObtainableScore: 20 }],
          columns: ["CA 1"],
          data: [],
        }),
      });
    });

    await page.goto("/dashboard/school/greenfield/spreadsheets");
    await page.getByRole("button", { name: "New Spreadsheet" }).click();

    const createDialog = page.getByRole("dialog");
    await createDialog.getByRole("combobox", { name: /Class/i }).click();
    await page.getByRole("option", { name: "SSS 2 SCIENCE" }).click();
    await createDialog.getByRole("button", { name: "SSS 2 ART/HUMANITIES", exact: true }).click();
    await createDialog.getByRole("combobox", { name: /Subject/i }).click();
    await page.getByRole("option", { name: "Mathematics" }).click();
    await createDialog.getByRole("button", { name: "Create Spreadsheet" }).click();

    // Conflict dialog displays score count, hides Reset Empty Spreadsheet, and offers Combine Arms.
    await expect(page.getByText(/24 recorded student scores/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Reset Empty Spreadsheet/i })).toHaveCount(0);
    await page.getByRole("button", { name: /Combine Selected Class Arms into Existing Sheet/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/school\/greenfield\/spreadsheets\/sheet-maths$/);
    expect(combinePayloads[0]).toEqual({
      classLevels: ["sss2-sci", "sss2-art"],
      expectedVersion: 4,
    });

    // Open Sheet & roster controls on detail page and add SSS 2 BUSINESS/COMMERCIAL.
    await page.getByText("Sheet & roster controls").click();
    await page.getByLabel("SSS 2 BUSINESS/COMMERCIAL").check();
    await page.getByRole("button", { name: "Save class arms" }).click();
    await expect(page.getByText("Combined class arms updated without losing any scores.")).toBeVisible();
    expect(combinePayloads[1]).toEqual({
      classLevels: ["sss2-sci", "sss2-art", "sss2-bus"],
      expectedVersion: 5,
    });
  });

  test("admin sees recorded score warning and cancels unsubmitted HCORE draft when deleting a spreadsheet", async ({ page }) => {
    await signIn(page, "admin");
    await expect(page).toHaveURL(/\/welcome$/);

    const deletedUrls: string[] = [];

    await page.route("**/spreadsheets/greenfield?*", async (route) => {
      if (route.request().method() !== "GET") return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "X-Total-Count": "2" },
        body: JSON.stringify([
          {
            id: "sheet-draft",
            title: "Mathematics - SSS 2 SCIENCE",
            status: "pending",
            createdAt: "2026-10-29T08:58:22.805Z",
            resultType: "END_OF_TERM",
            termType: "END_TERM",
            hcoreAssessmentId: "hcore-sched-1",
            canonicalStatus: "SCHEDULED",
            recordedScoreCount: 24,
            canonicalScoreCount: 0,
            classLevelId: "sss2-sci",
            classLevelIds: ["sss2-sci"],
            classLevel: { id: "sss2-sci", name: "SSS 2 SCIENCE" },
            subject: { id: "maths", name: "Mathematics" },
          },
          {
            id: "sheet-locked",
            title: "Physics - SSS 2 SCIENCE",
            status: "active",
            createdAt: "2026-10-28T08:58:22.805Z",
            resultType: "END_OF_TERM",
            termType: "END_TERM",
            hcoreAssessmentId: "hcore-scored-1",
            canonicalStatus: "OPEN",
            recordedScoreCount: 12,
            canonicalScoreCount: 5,
            classLevelId: "sss2-sci",
            classLevelIds: ["sss2-sci"],
            classLevel: { id: "sss2-sci", name: "SSS 2 SCIENCE" },
            subject: { id: "physics", name: "Physics" },
          },
        ]),
      });
    });

    await page.route("**/spreadsheets/greenfield/sheet-draft*", async (route) => {
      if (route.request().method() === "DELETE") {
        deletedUrls.push(route.request().url());
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true, id: "sheet-draft", canonicalCancelled: true }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto("/dashboard/school/greenfield/spreadsheets");

    // Sheet with submitted canonical scores stays delete-locked.
    await expect(
      page.getByRole("button", {
        name: "Cannot delete locked spreadsheet Physics - SSS 2 SCIENCE",
        exact: true,
      }),
    ).toBeDisabled();

    // Unsubmitted SCHEDULED HCORE draft can be deleted after explicit score + HCORE cancel warning.
    await page
      .getByRole("button", { name: "Delete Mathematics - SSS 2 SCIENCE", exact: true })
      .click();
    const alertDialog = page.getByRole("alertdialog");
    await expect(alertDialog.getByText(/24 recorded student scores on this sheet will be permanently deleted/i)).toBeVisible();
    await expect(alertDialog.getByText(/Deleting will cancel the HCORE draft/i)).toBeVisible();
    await alertDialog.getByRole("button", { name: "Cancel Draft & Delete" }).click();

    await expect(page.getByText(/Cancelled HCORE draft and deleted/i)).toBeVisible();
    expect(deletedUrls).toHaveLength(1);
    expect(deletedUrls[0]).toContain("cancelCanonical=true");
  });
});
