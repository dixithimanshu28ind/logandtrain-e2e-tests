import { test, expect } from "../../fixtures/test-fixtures";
import { randomTestEmail, TEST_PASSWORD } from "../../utils/testData";
import { deleteTestUserByEmail } from "../../utils/supabaseAdmin";
import { sessionStorageKey } from "../../utils/session";

test.describe("Authentication", { tag: "@smoke" }, () => {
  test("sign up creates an account and lands on the dashboard", async ({
    page,
    authPage,
  }) => {
    const email = randomTestEmail();

    await authPage.goto("signup");
    await authPage.signUp(email, TEST_PASSWORD);
    await page.waitForURL("**/dashboard");
    await expect(page.getByRole("heading", { name: "My Workouts" })).toBeVisible();

    await deleteTestUserByEmail(email);
  });

  test("sign in with valid credentials reaches the dashboard", async ({
    page,
    authPage,
    testUser,
  }) => {
    await authPage.goto("signin");
    await authPage.signIn(testUser.email, testUser.password);
    await page.waitForURL("**/dashboard");
    await expect(page.getByRole("heading", { name: "My Workouts" })).toBeVisible();
  });

  // Sign-out lands on the homepage (GYM-24, made reliable by GYM-37) and ends
  // the session. More sign-out cases live in tests/regression/sign-out.spec.ts.
  test("sign out lands on the homepage and ends the session", async ({
    signedInPage: page,
    dashboardPage,
  }) => {
    await dashboardPage.signOut();
    await page.waitForURL((url) => url.pathname === "/");
    await expect(page.getByRole("heading", { level: 1, name: /Train your way/ })).toBeVisible();

    // Wait for the stored session to actually clear. That is also when a
    // competing redirect to /signin would have fired, so re-check the URL after.
    await expect
      .poll(() => page.evaluate((key) => localStorage.getItem(key), sessionStorageKey()))
      .toBeNull();
    expect(new URL(page.url()).pathname).toBe("/");

    // Protected pages are locked again.
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { level: 1, name: "Welcome back" })).toBeVisible();
  });
});
