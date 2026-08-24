import { test, expect } from "../../fixtures/test-fixtures";

test.describe("Landing page", () => {
  test("shows branding and both auth entry points", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /GYM/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign Up" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign In" })).toBeVisible();
  });
});
