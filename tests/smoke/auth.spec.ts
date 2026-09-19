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

  // The app intends sign-out to land on "/" (GYM-24) but a race sometimes
  // sends users to /signin instead, so the destination isn't asserted here —
  // see tests/known-issues/sign-out-destination.spec.ts. What must always
  // hold is that the session ends and protected pages are locked again.
  test("sign out ends the session", async ({ signedInPage: page, dashboardPage }) => {
    await dashboardPage.signOut();
    await page.waitForURL((url) => ["/", "/signin"].includes(url.pathname));

    // Wait for the stored session to actually be cleared before probing.
    await expect
      .poll(() => page.evaluate((key) => localStorage.getItem(key), sessionStorageKey()))
      .toBeNull();

    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { level: 1, name: "Welcome back" })).toBeVisible();
  });
});
