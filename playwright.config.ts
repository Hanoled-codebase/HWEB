import { defineConfig, devices } from "@playwright/test";

// End-to-end tests: Hweb's own dev server against fake HCORE, HSMS and HCBT
// servers (e2e/mock-api.mjs), so no real school data or backend is touched.
const PORT = 3100;
const API = { HCORE: "http://127.0.0.1:4911", HSMS: "http://127.0.0.1:4912", HCBT: "http://127.0.0.1:4913" };

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    viewport: { width: 1366, height: 800 },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 800 } } }],
  webServer: [
    {
      command: "node e2e/mock-api.mjs",
      url: `${API.HCORE}/__requests`,
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
    },
    {
      command: `npx next dev --port ${PORT}`,
      url: `http://localhost:${PORT}/signin`,
      timeout: 240_000,
      reuseExistingServer: !process.env.CI,
      env: {
        NEXT_DIST_DIR: ".next-e2e",
        NEXT_PUBLIC_HCORE_URL: API.HCORE,
        NEXT_PUBLIC_HSMS_URL: API.HSMS,
        NEXT_PUBLIC_HCBT_URL: API.HCBT,
        NEXT_PUBLIC_AUTH_MODE: "bearer",
        NEXT_TELEMETRY_DISABLED: "1",
      },
    },
  ],
});
