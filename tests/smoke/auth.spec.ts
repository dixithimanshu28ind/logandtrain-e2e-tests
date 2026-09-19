import { test, expect } from "../../fixtures/test-fixtures";
import { randomTestEmail, TEST_PASSWORD } from "../../utils/testData";
import { deleteTestUserByEmail } from "../../utils/supabaseAdmin";

test.describe("Authentication", () => {
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

  // Sign-out goes to the public landing page ("/"), not /signin. That is
  // deliberate in the app (GYM-24), so this asserts the current behavior.
  test("sign out returns to the landing page", async ({ signedInPage, dashboardPage }) => {
    await dashboardPage.signOut();
    await signedInPage.waitForURL((url) => url.pathname === "/");
    await expect(
      signedInPage.getByRole("heading", { level: 1, name: /Train your way/ })
    ).toBeVisible();
  });
});
