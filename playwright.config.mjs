// Browser tests for lukerebarchik.com (docs/planning.md#acceptance-criteria).
// Target: BASE_URL (a PR preview or production in CI). Without it, starts `npm run dev`.
//   npm run test:a11y                                   local dev server
//   BASE_URL=https://lukerebarchik.com npm run test:a11y   any deployed copy
import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.BASE_URL || "http://localhost:4280";

export default defineConfig({
  testDir: "tests",
  outputDir: "test-results",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: { baseURL },
  // Every check runs at desktop and phone widths, in light and dark mode.
  projects: [
    { name: "desktop-light", use: { ...devices["Desktop Chrome"], colorScheme: "light" } },
    { name: "desktop-dark", use: { ...devices["Desktop Chrome"], colorScheme: "dark" } },
    { name: "phone-light", use: { ...devices["Pixel 7"], colorScheme: "light" } },
    { name: "phone-dark", use: { ...devices["Pixel 7"], colorScheme: "dark" } },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : { command: "npm run dev", url: baseURL, reuseExistingServer: true, timeout: 120_000 },
});
