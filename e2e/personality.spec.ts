import { test, expect, type Page } from "@playwright/test";

const PROFILE_HEADING = "Competency Assessment Profile";

// Click into a quiz and choose Practice Mode (untimed, lets us advance freely).
async function startQuiz(page: Page, quizId: string) {
  await page.goto(`/?quiz-id=${quizId}`);
  await page.getByRole("button", { name: /Practice Mode/ }).click();
  await expect(page.getByText(/Question 1 of/i)).toBeVisible();
}

// Complete a forced-choice quiz: in each block, repeatedly pick the first
// remaining statement until the results report appears.
async function completeForcedChoice(page: Page) {
  const report = page.getByRole("heading", { name: PROFILE_HEADING });
  for (let guard = 0; guard < 200; guard++) {
    if (await report.isVisible().catch(() => false)) return;
    const stmt = page.getByTestId("fc-statement").first();
    if (!(await stmt.isVisible().catch(() => false))) return;
    await stmt.click();
  }
  throw new Error("forced-choice quiz did not reach the results report");
}

// Complete a rating quiz: pick the first band on each question (auto-advances).
async function completeRating(page: Page) {
  const report = page.getByRole("heading", { name: PROFILE_HEADING });
  const counter = page.getByText(/Question \d+ of/i);
  for (let guard = 0; guard < 100; guard++) {
    if (await report.isVisible().catch(() => false)) return;
    const before = await counter.textContent().catch(() => null);
    await page.getByTestId("rating-option").first().click();
    // each pick auto-advances after a short beat — wait for the next question
    await page
      .waitForFunction(
        (prev) => {
          const el = [...document.querySelectorAll("span")].find((s) => /Question \d+ of/i.test(s.textContent || ""));
          const profile = [...document.querySelectorAll("h1")].some((h) => h.textContent?.includes("Competency"));
          return profile || (el && el.textContent !== prev);
        },
        before,
        { timeout: 5000 }
      )
      .catch(() => {});
  }
  throw new Error("rating quiz did not reach the results report");
}

test.describe("BCG CCA personality prep — E2E", () => {
  test("forced-choice flow has no flash and shows no clickable hint as an option", async ({ page }) => {
    await startQuiz(page, "personality-test-1.yaml");

    await expect(page.getByRole("heading", { name: /Which statement describes you/ })).toBeVisible();
    await expect(page.getByText(/PICK 1 OF \d+/i)).toBeVisible();

    // Exactly the statements are clickable — the progress hint is not a button.
    const options = page.getByTestId("fc-statement");
    await expect(options).toHaveCount(3);
    await expect(page.getByRole("button", { name: /Keep going/i })).toHaveCount(0);
  });

  test("Test 1 produces a competency report and prompts for Test 2", async ({ page }) => {
    await startQuiz(page, "personality-test-1.yaml");
    await completeForcedChoice(page);

    // Competency Assessment Profile: a row per trait, banded Low/Moderate/High.
    await expect(page.getByRole("heading", { name: PROFILE_HEADING })).toBeVisible();
    await expect(page.locator("table tbody tr")).toHaveCount(7);
    await expect(page.getByRole("heading", { name: /Behavioral Traits Radar/ })).toBeVisible();
    await expect(page.locator("svg")).toBeVisible();

    // No second profile yet → consistency analysis is locked.
    await expect(page.getByText(/unlock the self-vs-others consistency/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: /Consistency: self vs\. others/ })).toHaveCount(0);
  });

  test("completing both tests unlocks the self-vs-others consistency analysis", async ({ page }) => {
    // Test 1 (self) — forced choice
    await startQuiz(page, "personality-test-1.yaml");
    await completeForcedChoice(page);
    await expect(page.getByRole("heading", { name: PROFILE_HEADING })).toBeVisible();

    // Test 2 (others) — rating; same browser context, so Test 1 persists.
    await startQuiz(page, "personality-test-2.yaml");
    await completeRating(page);

    await expect(page.getByRole("heading", { name: PROFILE_HEADING })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Consistency: self vs\. others/ })).toBeVisible();

    const score = await page.getByTestId("consistency-score").textContent();
    const n = Number(score);
    expect(Number.isInteger(n)).toBe(true);
    expect(n).toBeGreaterThanOrEqual(0);
    expect(n).toBeLessThanOrEqual(100);
  });
});
