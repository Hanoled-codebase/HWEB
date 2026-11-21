import { expect, mockRequests, signIn, test } from "./support";

const EXAM_TITLE = "JSS 1 Mathematics — First Term Test";

test("a pupil sits an exam and hands it in", async ({ page }) => {
  await signIn(page, "pupil");
  await page.goto("/cbt/student?orgSlug=greenfield");
  await expect(page.getByText(EXAM_TITLE)).toBeVisible();

  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.getByRole("button", { name: "Start Exam Now" }).click();
  await expect(page).toHaveURL(/\/cbt\/student\/exam\/0f5f1a52-0000-4000-8000-0000000000e1$/);

  await expect(page.getByText("What is 7 × 8?")).toBeVisible();

  // If the exam room covers the questions with a full-screen prompt, dismiss it.
  const enterFsBtn = page.getByRole("button", { name: /full screen/i });
  if (await enterFsBtn.isVisible()) {
    await enterFsBtn.click();
    await expect(enterFsBtn).toBeHidden();
  }

  await page.getByText("56", { exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  await expect(page.getByText("Which of these is a prime number?")).toBeVisible();
  await page.getByText("29", { exact: true }).click();
  await page.getByRole("button", { name: "Submit", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Submit Your Exam?" })).toBeVisible();
  await page.getByRole("button", { name: "Yes, Submit Now" }).click();
  await expect(page).toHaveURL(/\/cbt\/student\/exam\/0f5f1a52-0000-4000-8000-0000000000e1\/result$/);

  const submitted = (await mockRequests()).find((r) => r.backend === "hcbt" && r.path.endsWith("/submit"));
  expect(submitted?.body.answers).toEqual(expect.arrayContaining([
    { questionId: "0f5f1a52-0000-4000-8000-0000000000f1", selectedOption: 1 },
    { questionId: "0f5f1a52-0000-4000-8000-0000000000f2", selectedOption: 2 },
  ]));
  expect(submitted?.body.cheating).toBeUndefined();
});

test("a pupil can't reach the staff CBT console", async ({ page }) => {
  await signIn(page, "pupil");
  await expect(page.getByText(EXAM_TITLE)).toBeVisible();
  await page.goto("/cbt/admin");
  await expect(page.getByRole("heading", { name: "Staff Access Required" })).toBeVisible();
});
