import { test, expect } from "../../fixtures/test-fixtures";

// Every public page: loads with a 200 and shows its own h1. The FitSpark chat
// widget also renders an h1 on every page, so each check names the heading
// text rather than just "an h1 exists".
const PUBLIC_PAGES = [
  { path: "/features", h1: /Everything you need to keep training/ },
  { path: "/how-it-works", h1: /Training shouldn.t need instructions/ },
  { path: "/terms", h1: "Terms of Use" },
  { path: "/privacy", h1: "Privacy Policy" },
  { path: "/fitness-disclaimer", h1: "Fitness Disclaimer" },
  { path: "/support", h1: "Support" },
];

test.describe("Public pages", { tag: "@smoke" }, () => {
  for (const { path, h1 } of PUBLIC_PAGES) {
    test(`${path} renders`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1, name: h1 })).toBeVisible();
    });
  }

});

test.describe("404 page", { tag: "@smoke" }, () => {
  // Loading a missing page makes the browser log one "404" console error for
  // that very request. Allow only that message, not console errors in general.
  test.use({ allowedProblems: [/status of 404.*this-page-does-not-exist/] });

  test("an unknown route shows the 404 page", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: "404" })).toBeVisible();
  });
});
