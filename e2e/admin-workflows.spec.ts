import type { Page } from "@playwright/test";
import { expect, mockRequests, signIn, test } from "./support";

const schoolPath = "/dashboard/school/greenfield";

// The full Chromium channel includes the browser's PDF viewer.
test.use({ channel: "chromium" });

async function enterAdminDashboard(page: Page) {
  await signIn(page, "admin", { path: `/signin?callbackUrl=${encodeURIComponent(schoolPath)}` });
  await expect(page).toHaveURL(new RegExp(`${schoolPath}$`));
  await expect(page.getByRole("navigation", { name: "School navigation" })).toBeVisible();
}

function monitorBrowser(page: Page) {
  const errors = new Set<string>();
  const failedRequests = new Set<string>();
  page.on("pageerror", (error) => errors.add(error.message));
  page.on("console", (entry) => {
    if (entry.type() === "error" && !entry.text().startsWith("Failed to load resource:")) {
      errors.add(entry.text());
    }
  });
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.hostname === "127.0.0.1" && response.status() >= 400) {
      failedRequests.add(`${response.status()} ${response.request().method()} ${url.pathname}`);
    }
  });
  return { errors, failedRequests };
}

test("admin computes and publishes each result type independently and opens report PDFs", async ({ page }) => {
  test.setTimeout(180_000);
  const browser = monitorBrowser(page);
  await enterAdminDashboard(page);
  const nav = page.getByRole("navigation", { name: "School navigation" });
  const findPage = page.getByRole("textbox", { name: "Find a page" });
  await findPage.fill("Result Templates");
  await nav.getByRole("link", { name: "Result Templates", exact: true }).click();
  await expect(page.getByText("Greenfield Results", { exact: true }).first()).toBeVisible();
  await page.getByRole("tab", { name: "Results Overview & Computation" }).click();
  const resultsPanel = page.getByRole("tabpanel");
  await resultsPanel.getByRole("combobox").filter({ hasText: "Select class" }).click();
  await page.getByRole("option", { name: "JSS 1A", exact: true }).click();
  const chooseResultType = async (name: "Mid-term" | "End-of-term") => {
    await resultsPanel.getByRole("combobox", { name: "Result type", exact: true }).click();
    await page.getByRole("option", { name, exact: true }).click();
  };

  await chooseResultType("Mid-term");
  await resultsPanel.getByRole("button", { name: "Compute Class Results" }).click();
  await expect(resultsPanel.getByText("Unpublished", { exact: true }).locator("visible=true")).toBeVisible();
  await resultsPanel.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(resultsPanel.getByText("Published", { exact: true }).locator("visible=true")).toBeVisible();

  await chooseResultType("End-of-term");
  await expect(resultsPanel.getByText("Published", { exact: true })).toHaveCount(0);
  await resultsPanel.getByRole("button", { name: "Compute Class Results" }).click();
  await expect(resultsPanel.getByText("Unpublished", { exact: true }).locator("visible=true")).toBeVisible();
  await chooseResultType("Mid-term");
  await resultsPanel.getByRole("button", { name: "View", exact: true }).click();
  await expect(resultsPanel.getByText("Published", { exact: true }).locator("visible=true")).toBeVisible();
  await resultsPanel.getByRole("button", { name: "Unpublish", exact: true }).click();
  await expect(resultsPanel.getByText("Unpublished", { exact: true }).locator("visible=true")).toBeVisible();
  await chooseResultType("End-of-term");
  await resultsPanel.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(resultsPanel.getByText("Published", { exact: true }).locator("visible=true")).toBeVisible();

  await findPage.fill("");
  await nav.getByRole("link", { name: "Results", exact: true }).click();
  await page.getByRole("combobox", { name: "Report type for PDF exports" }).selectOption("MID_TERM");
  const openPdf = async (button: string, path: string) => {
    const [popup, response] = await Promise.all([
      page.waitForEvent("popup"),
      page.waitForResponse((response) => new URL(response.url()).pathname === path),
      page.getByRole("button", { name: button, exact: true }).click(),
    ]);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toBe("application/pdf");
    expect(new URL(response.url()).searchParams.get("resultType")).toBe("MID_TERM");
    await expect(popup).toHaveURL(/^blob:/);
    await popup.close();
  };
  await openPdf("View Bundle", "/export/greenfield/report-card-bundle/jss1a");
  const printReport = page.getByRole("button", { name: "Print Report", exact: true });
  await printReport.click();
  await page.setViewportSize({ width: 390, height: 844 });
  const preview = page.getByRole("dialog", { name: /Official Report Sheet Preview/ });
  await expect(preview).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  // Mobile defaults to Fit-to-screen; switching to 100% enables horizontal scrolling inside the sheet region.
  await preview.getByRole("button", { name: "100%", exact: true }).click();
  await expect.poll(() => preview.getByRole("region", { name: "Scrollable report sheet" })
    .evaluate((region) => region.scrollWidth > region.clientWidth)).toBe(true);
  const pdfType = preview.getByRole("combobox", { name: "PDF report type" });
  await pdfType.click();
  await page.getByRole("option", { name: "End-of-term", exact: true }).click();
  await expect(pdfType).toContainText("End-of-term");
  await pdfType.click();
  await page.getByRole("option", { name: "Mid-term", exact: true }).click();
  await openPdf("View PDF", "/export/greenfield/report-card/stu-ada");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download PDF", exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("Report_Card_ADA_OBI_First_Term_Mid_Term.pdf");
  await page.setViewportSize({ width: 1366, height: 800 });
  await page.evaluate(() => {
    window.print = () => window.dispatchEvent(new Event("test-report-print"));
    window.addEventListener("test-report-print", () => document.body.setAttribute("data-report-printed", "true"), { once: true });
  });
  await page.getByRole("button", { name: "Print Template" }).click();
  await expect(page.locator("body")).toHaveAttribute("data-report-printed", "true");
  const printedPdf = await page.pdf({ format: "A4", printBackground: true });
  expect(printedPdf.toString("latin1").match(/\/Type\s*\/Page\b/g)).toHaveLength(1);
  await page.keyboard.press("Escape");
  await expect(preview).toHaveCount(0);
  await expect(printReport).toBeFocused();

  const requests = await mockRequests();
  expect(requests.filter((request) => request.path.includes("/bulk-compute/")).map((request) => request.body.resultType))
    .toEqual(["MID_TERM", "END_OF_TERM"]);
  expect([...browser.errors]).toEqual([]);
  expect([...browser.failedRequests]).toEqual([]);
});

test("class ratings stay locked after a class load fails", async ({ page }) => {
  const browser = monitorBrowser(page);
  await page.route("**/organizations/greenfield/member-profile", async (route) => {
    const response = await route.fetch();
    const profile = await response.json();
    await route.fulfill({
      response,
      json: {
        ...profile,
        memberAssignments: [{
          id: "class-teacher-jss1a",
          type: "CLASS_TEACHER",
          classLevelId: "jss1a",
          classLevel: { id: "jss1a", name: "JSS 1A" },
        }],
      },
    });
  });
  await signIn(page, "teacher", { path: `/signin?callbackUrl=${encodeURIComponent(schoolPath)}` });
  await expect(page.getByRole("navigation", { name: "School navigation" })).toBeVisible();
  await page.getByRole("textbox", { name: "Find a page" }).fill("Affective");
  await page.getByRole("navigation", { name: "School navigation" })
    .getByRole("link", { name: /Affective/ }).click();
  await page.getByRole("tab", { name: "Class Grid" }).click();
  const grid = page.getByRole("tabpanel");
  const rating = grid.getByRole("combobox", { name: /rating$/ }).first();
  const save = grid.getByRole("button", { name: "Save Class Ratings" });
  await expect(rating).toBeEnabled();
  await rating.selectOption("5");

  await page.route("**/affective/greenfield/affective?*", (route) => {
    if (new URL(route.request().url()).searchParams.has("classLevelId")) {
      return route.fulfill({ status: 503, json: { message: "Ratings temporarily unavailable" } });
    }
    return route.continue();
  });
  await grid.getByRole("combobox", { name: "Class", exact: true }).click();
  await page.getByRole("option", { name: "JSS 1A", exact: true }).click();
  await expect.poll(() => [...browser.failedRequests]).toEqual(["503 GET /affective/greenfield/affective"]);
  await expect(rating).toBeDisabled();
  await expect(rating).toHaveValue("0");
  await expect(save).toBeDisabled();

  await grid.getByRole("combobox", { name: "Class", exact: true }).click();
  await page.getByRole("option", { name: "All students", exact: true }).click();
  await expect(rating).toBeEnabled();
  await expect(rating).toHaveValue("0");
  expect((await mockRequests()).some(({ method, path }) => method === "POST" && path === "/affective/greenfield/affective")).toBe(false);
  expect([...browser.errors]).toEqual([]);
});

test("admin opens Support, cancels and creates a ticket, then switches to Hanoled support", async ({ page }) => {
  test.setTimeout(120_000);
  const browser = monitorBrowser(page);
  await enterAdminDashboard(page);
  await page.getByRole("link", { name: "Support", exact: true }).filter({ visible: true }).first().click();
  await expect(page).toHaveURL(new RegExp(`${schoolPath}/support$`));
  await expect(page.getByRole("heading", { name: "Support Tickets" })).toBeVisible();
  await expect(page.getByText("No tickets yet")).toBeVisible();
  const newTicket = page.getByRole("button", { name: "New Ticket", exact: true });
  await expect(newTicket).toHaveCount(2);
  await newTicket.first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await newTicket.last().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Create Ticket", exact: true }).click();
  await expect(page.getByText("Subject is required")).toBeVisible();
  await dialog.getByPlaceholder("Brief title for your issue").fill("Fixture admin support ticket");
  await dialog.getByPlaceholder("Describe your issue in detail...").fill("Verify the support workflow with isolated data.");
  await dialog.getByRole("combobox").click();
  await page.getByRole("option", { name: "High", exact: true }).click();
  await dialog.getByRole("button", { name: "Create Ticket", exact: true }).click();
  await expect(page.getByText("Ticket created", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Fixture admin support ticket/ })).toBeVisible();
  expect((await mockRequests()).find((request) => request.method === "POST" && request.path === "/support-tickets")?.body)
    .toMatchObject({ subject: "Fixture admin support ticket", priority: "high", isDevTicket: false });
  await page.getByRole("button", { name: /Fixture admin support ticket/ }).click();
  const reply = page.getByPlaceholder("Type your message...");
  await reply.fill("Fixture reply from the school admin");
  await reply.press("Enter");
  await expect(page.getByText("Fixture reply from the school admin", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Resolve", exact: true }).click();
  await expect(page.getByText("Ticket resolved", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Reopen", exact: true }).click();
  await expect(page.getByText("Ticket reopened", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Hanoled support", exact: true }).click();
  await expect(page.getByRole("button", { name: "New Report", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "New Report", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Report to Dev Team" })).toBeVisible();
  await dialog.getByPlaceholder("Brief title for your issue").fill("Fixture report to Hanoled");
  await dialog.getByPlaceholder("Describe your issue in detail...").fill("Verify routing to the separate support queue.");
  await dialog.getByRole("button", { name: "Create Ticket", exact: true }).click();
  await expect(page.getByRole("button", { name: /Fixture report to Hanoled/ })).toBeVisible();
  await page.getByRole("button", { name: "Our school", exact: true }).click();
  await expect(page.getByRole("button", { name: /Fixture admin support ticket/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Fixture report to Hanoled/ })).toHaveCount(0);
  expect([...browser.errors]).toEqual([]);
  expect([...browser.failedRequests]).toEqual([]);
});

test("admin can open each visible school destination and its create forms", async ({ page }) => {
  test.setTimeout(900_000);
  const browser = monitorBrowser(page);
  await enterAdminDashboard(page);
  const navigation = page.getByRole("navigation", { name: "School navigation" });
  const search = page.getByRole("textbox", { name: "Find a page" });
  const destinations = new Map<string, string>();
  // Admin tools beyond the default sidebar are discoverable through search.
  for (const query of "abcdefghijklmnopqrstuvwxyz") {
    await search.fill(query);
    for (const link of await navigation.getByRole("link").all()) {
      const href = await link.getAttribute("href");
      if (href?.startsWith(schoolPath)) destinations.set(href, (await link.innerText()).trim());
    }
  }
  const failures: string[] = [];
  const createForms = new Map([
    ["Question Bank", { button: "New question", dialog: "New Question" }],
    ["Result Templates", { button: "New Class Template", dialog: "New Class Result Template" }],
    ["Library", { button: "Add Book", dialog: "Add New Book" }],
    ["Bus Routes", { button: "Add Route", dialog: "Add Bus Route" }],
    ["Scheme of Work", { button: "New scheme", dialog: "New Scheme of Work" }],
    ["Clinic Log", { button: "New Visit", dialog: "Record Clinic Visit" }],
    ["Lesson Notes", { button: "New lesson note", dialog: "New Lesson Note" }],
    ["Homework", { button: "Create Assignment", dialog: "Create Assignment" }],
    ["Hostel", { button: "Add Room", dialog: "Add New Room" }],
    ["HR", { button: "Create Profile", dialog: "Create Teacher Profile" }],
  ]);
  const inventory: { page: string; controls: number; createForm: boolean; failedRequests: string[] }[] = [];
  for (const [href, label] of destinations) {
    browser.failedRequests.clear();
    try {
      await search.fill(label);
      await navigation.getByRole("link", { name: label, exact: true }).click({ timeout: 15_000 });
      await expect(page).toHaveURL(new RegExp(`${href}$`), { timeout: 15_000 });
      const main = page.getByRole("main");
      await expect(main).toBeVisible({ timeout: 10_000 });
      await expect(main).not.toBeEmpty({ timeout: 10_000 });
      const controls = await main.locator("a:visible, button:visible, input:visible, select:visible, textarea:visible, [role=combobox]:visible").count();
      const form = createForms.get(label);
      if (form) {
        await main.getByRole("button", { name: form.button, exact: true }).click({ timeout: 10_000 });
        const dialog = page.getByRole("dialog", { name: form.dialog, exact: true });
        await expect(dialog).toBeVisible({ timeout: 10_000 });
        await page.keyboard.press("Escape");
        await expect(dialog).toHaveCount(0);
      }
      inventory.push({ page: label, controls, createForm: Boolean(form), failedRequests: [...browser.failedRequests] });
    } catch (error) {
      failures.push(`${label}: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`);
      if (!page.url().endsWith(schoolPath)) await page.goto(schoolPath);
    }
  }
  console.log("Admin navigation inventory:", JSON.stringify(inventory));
  expect(destinations.size).toBeGreaterThan(20);
  expect(failures).toEqual([]);
  expect([...browser.errors]).toEqual([]);
  expect(inventory.flatMap(({ page, failedRequests }) => failedRequests.map((request) => `${page}: ${request}`))).toEqual([]);
});
