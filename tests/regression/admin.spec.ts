import { test, expect } from "../../fixtures/test-fixtures";

// The Payload CMS admin. Editors log in here to change program content; that
// content is what /programs serves, so the login page being reachable matters.
test.describe("CMS admin", { tag: "@regression" }, () => {
  test("an anonymous visit to /admin is sent to the login page", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForURL(/\/admin\/login/);
    await expect(page).toHaveTitle(/Login/);
  });

  test("the login page has an email and a password field", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /login/i })).toBeVisible();
  });

  // Programs, media and exercises are readable anonymously on purpose (the
  // public site serves them), but the list of CMS user accounts must not be.
  test("the CMS user list is not readable without logging in", async ({ request }) => {
    const users = await request.get("/api/payload/users");
    expect([401, 403]).toContain(users.status());
  });
});
