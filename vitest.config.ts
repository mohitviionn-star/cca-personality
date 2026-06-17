import { defineConfig } from "vitest/config";

// Unit tests for the scoring/evaluation engine. E2E specs live in ./e2e and are
// run by Playwright, not Vitest.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
