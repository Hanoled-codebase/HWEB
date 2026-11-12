import { expect, mockRequests, signIn, test } from "./support";

const EXAM_TITLE = "JSS 1 Mathematics — First Term Test";

test.describe("a pupil's school dashboard", () => {
  test("lists the exam HCBT has assigned and opens its start dialog", async ({ page }) => {
    await signIn(page, "pupil");
    await expect(page).toHaveURL(/\/dashboard\/school\/greenfield/);

    // HSMS reports no exams (they live in HCBT); the list comes from HCBT.
    // (The student layout renders each page for phones and for desktops and
    // hides one with CSS, so only the visible copy counts.)
    await expect(page.getByText("1 exam waiting for you").filter({ visible: true })).toBeVisible();
    await expect(page.getByText(EXAM_TITLE).filter({ visible: true })).toBeVisible();
    const asked = (await mockRequests()).filter((r) => r.backend === "hcbt").map((r) => `${r.path}${r.search}`);
    expect(asked).toContain("/api/student/assigned?orgSlug=greenfield");

    // Start goes through the CBT portal's dialog, where passkeys and device checks happen.
    await page.getByRole("link", { name: "Start" }).filter({ visible: true }).click();
    await expect(page).toHaveURL(/\/cbt\/student\?examId=0f5f1a52-0000-4000-8000-0000000000e1$/);
    await expect(page.getByRole("button", { name: "Start Exam Now" })).toBeVisible();
  });

  test("shows the same exam on the pending exams page", async ({ page }) => {
    await signIn(page, "pupil");
    await expect(page).toHaveURL(/\/dashboard\/school\/greenfield/);
    await page.goto("/dashboard/school/greenfield/student/pending");

    await expect(page.getByText(EXAM_TITLE).filter({ visible: true })).toBeVisible();
    await expect(page.getByText("All caught up!")).toHaveCount(0);
  });

  test("a pupil views and submits homework", async ({ page }) => {
    await signIn(page, "pupil");
    await expect(page).toHaveURL(/\/dashboard\/school\/greenfield/);
    await page.goto("/dashboard/school/greenfield/student/homework");

    await expect(page.getByText("Algebra Exercises 1 to 10").filter({ visible: true })).toBeVisible();
    await page.getByRole("button", { name: "Submit Homework" }).filter({ visible: true }).click();
    await page.getByPlaceholder("https://drive.google.com/...").fill("https://drive.google.com/ada-homework.pdf");
    await page.getByRole("button", { name: "Confirm Submission" }).click();

    await expect(page.getByText("Assignment submitted successfully")).toBeVisible();
    const submitReq = (await mockRequests()).find((r) => r.path.includes("/homework/") && r.path.endsWith("/submit"));
    expect(submitReq?.body).toEqual({ fileUrl: "https://drive.google.com/ada-homework.pdf" });
  });

  test("a pupil views scheme of work for their class", async ({ page }) => {
    await signIn(page, "pupil");
    await expect(page).toHaveURL(/\/dashboard\/school\/greenfield/);
    await page.goto("/dashboard/school/greenfield/student/scheme-of-work");

    await expect(page.getByText("Mathematics First Term Syllabus").filter({ visible: true })).toBeVisible();
    await expect(page.getByText("Whole numbers and counting").filter({ visible: true })).toBeVisible();
  });
});
