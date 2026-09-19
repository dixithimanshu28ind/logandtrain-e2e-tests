import { test, expect } from "../../fixtures/test-fixtures";

test.describe("Landing page", () => {
  test("shows branding, the hero, and both auth entry points", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { level: 1, name: /Train your way/ })
    ).toBeVisible();

    // Scoped to the header: the hero repeats "Start Training" / "Sign In".
    const header = page.getByRole("banner");
    await expect(header.getByRole("link", { name: "LOG&TRAIN" })).toBeVisible();
    await expect(header.getByRole("button", { name: "Sign In" })).toBeVisible();
    await expect(header.getByRole("button", { name: "Start Training" })).toBeVisible();
  });
});
