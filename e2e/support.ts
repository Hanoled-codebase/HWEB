import { expect, test as base, type Page } from "@playwright/test";

const MOCK = "http://127.0.0.1:4911";

export type MockRequest = { backend: "hcore" | "hsms" | "hcbt"; method: string; path: string; search: string; body: Record<string, unknown> };

/** What the fake backends were sent (see e2e/mock-api.mjs). */
export async function mockRequests(): Promise<MockRequest[]> {
  return (await fetch(`${MOCK}/__requests`)).json();
}

export const PEOPLE = {
  parent: { tab: "Staff / Admin", identifier: "mrs.obi@greenfield.test", password: "Greenfield-Parent-2026" },
  pupil: { tab: "Student / Candidate", identifier: "GF/2026/001", password: "ada-2026" },
  candidate: { tab: "Staff / Admin", identifier: "chidi.candidate@greenfield.test", password: "Candidate-2026" },
  newTeacher: { tab: "Staff / Admin", identifier: "new.teacher@greenfield.test", password: "School-Issued-1" },
};

/** Fills and sends the sign-in form. */
export async function signIn(page: Page, who: keyof typeof PEOPLE, { path = "/signin" } = {}) {
  const person = PEOPLE[who];
  await page.goto(path);
  await page.getByRole("button", { name: person.tab }).click();
  if (who === "pupil") {
    await page.getByRole("button", { name: /Select your school/ }).click();
    await page.getByRole("button", { name: /Greenfield Academy/ }).click();
  }
  await page.getByPlaceholder(who === "pupil" ? "e.g. GW/2026/001" : "staff@school.edu").fill(person.identifier);
  await page.getByPlaceholder("••••••••").fill(person.password);
  await page.getByRole("button", { name: /Sign In to Dashboard|Enter CBT Examination Portal/ }).click();
}

// Every test starts with fresh fake data, and nothing leaves this machine.
export const test = base.extend({
  // (Playwright's fixture callback, named so lint doesn't take it for React's `use`.)
  page: async ({ page }, providePage) => {
    await fetch(`${MOCK}/__reset`, { method: "POST" });
    await page.context().route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (route) => route.abort());
    await providePage(page);
  },
});

export { expect };
