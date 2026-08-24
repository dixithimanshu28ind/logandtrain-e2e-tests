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
    await expect(page.getByRole("heading", { name: "Your Workouts" })).toBeVisible();

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
    await expect(page.getByRole("heading", { name: "Your Workouts" })).toBeVisible();
  });

  test("sign out redirects back to sign in", async ({ signedInPage, dashboardPage }) => {
    await dashboardPage.signOut();
    await signedInPage.waitForURL("**/signin");
  });
});
