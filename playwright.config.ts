import { defineConfig, devices } from "@playwright/test";

// E2E tests drive the real Vite app (dev server) in Chromium.
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    // Dedicated, uncommon port so we never collide with another dev server.
    baseURL: "http://localhost:4317",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev -- --port 4317 --strictPort",
    url: "http://localhost:4317",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
