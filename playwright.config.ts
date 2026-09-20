import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env") });

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }], ["list"]]
    : [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: BASE_URL,
    // A navigation that stalls should fail with its own error, not wait out
    // the whole test timeout.
    navigationTimeout: 45_000,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // Phone-sized viewport. Runs only the smoke set, and skips API specs
      // (a viewport changes nothing about an HTTP call).
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
      grep: /@smoke/,
      testIgnore: /tests\/api\//,
    },
  ],
});
