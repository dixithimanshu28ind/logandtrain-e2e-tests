import { test, expect } from "../../fixtures/test-fixtures";
import { AuthModal } from "../../components/AuthModal";
import { TEST_PASSWORD } from "../../utils/testData";
import { alertWith } from "../../utils/locators";

// A rejected sign-in makes the browser log one "400" console error for the
// auth request itself. Allow only that message, not console errors in general.
const REJECTED_AUTH_REQUEST = /status of 4\d\d.*\/auth\/v1\/token/;

test.describe("Sign in: errors", { tag: "@regression" }, () => {
  test.use({ allowedProblems: [REJECTED_AUTH_REQUEST] });

  test("a wrong password is rejected with a message, and the user stays put", async ({
    page,
    authPage,
    testUser,
  }) => {
    await authPage.goto("signin");
    await authPage.signIn(testUser.email, "not-the-password");

    await expect(alertWith(page, "Invalid login credentials")).toBeVisible();
    await expect(page).toHaveURL(/\/signin$/);
  });

  test("an unknown email gets the same message, so accounts can't be probed", async ({
    page,
    authPage,
  }) => {
    await authPage.goto("signin");
    await authPage.signIn("nobody-here@logandtrain-test.dev", TEST_PASSWORD);

    await expect(alertWith(page, "Invalid login credentials")).toBeVisible();
    await expect(page).toHaveURL(/\/signin$/);
  });

  test("the form can be retried after a failure", async ({ page, authPage, testUser }) => {
    await authPage.goto("signin");
    await authPage.signIn(testUser.email, "not-the-password");
    await expect(alertWith(page, "Invalid login credentials")).toBeVisible();

    await page.getByLabel("Password", { exact: true }).fill(testUser.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL("**/dashboard");
  });
});

// These are caught in the browser before any request is made.
test.describe("Sign in and sign up: form validation", { tag: "@regression" }, () => {
  test("submitting an empty sign-in form asks for both fields", async ({ page, authPage }) => {
    await authPage.goto("signin");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(alertWith(page, "Email and password are required.")).toBeVisible();
  });

  test("a password under 6 characters is refused", async ({ page, authPage }) => {
    await authPage.goto("signup");
    await page.getByLabel("Email").fill("short-password@logandtrain-test.dev");
    await page.getByLabel("Password", { exact: true }).fill("12345");
    await page.getByLabel("Confirm Password").fill("12345");
    await page.getByRole("button", { name: "Create Account" }).click();
    await expect(alertWith(page, "Password must be at least 6 characters.")).toBeVisible();
    await expect(page).toHaveURL(/\/signup$/);
  });

  test("mismatched passwords are refused on sign-up", async ({ page, authPage }) => {
    await authPage.goto("signup");
    await page.getByLabel("Email").fill("mismatch@logandtrain-test.dev");
    await page.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);
    await page.getByLabel("Confirm Password").fill(`${TEST_PASSWORD}-different`);
    await page.getByRole("button", { name: "Create Account" }).click();
    await expect(alertWith(page, "Passwords do not match.")).toBeVisible();
    await expect(page).toHaveURL(/\/signup$/);
  });

  test("the sign-in and sign-up pages link to each other", async ({ page, authPage }) => {
    await authPage.goto("signin");
    await page.getByRole("link", { name: "Create an account" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Start training" })).toBeVisible();

    await page.getByRole("link", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Welcome back" })).toBeVisible();
  });
});

test.describe("Forgot password", { tag: "@regression" }, () => {
  test("is reachable from the sign-in page and asks for an email", async ({ page, authPage }) => {
    await authPage.goto("signin");
    await page.getByRole("button", { name: "Forgot password?" }).click();
    await page.waitForURL("**/forgot-password");
    await expect(page.getByRole("heading", { level: 1, name: "Reset your password" })).toBeVisible();

    // Submitting nothing is caught in the browser; no email is sent.
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(alertWith(page, "Enter your email address.")).toBeVisible();
  });

  test("links back to sign in", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.getByRole("link", { name: "Back to sign in" }).click();
    await page.waitForURL("**/signin");
    await expect(page.getByRole("heading", { level: 1, name: "Welcome back" })).toBeVisible();
  });
});

test.describe("The sign-in and sign-up modal", { tag: "@regression" }, () => {
  test("opens from the landing page, switches between sign-up and sign-in, and closes", async ({
    page,
  }) => {
    const modal = new AuthModal(page);
    await page.goto("/");

    await modal.openSignUp();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { level: 1, name: "Start training" })).toBeVisible();

    await dialog.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(dialog.getByRole("heading", { level: 1, name: "Welcome back" })).toBeVisible();

    await dialog.getByRole("button", { name: "Create an account", exact: true }).click();
    await expect(dialog.getByRole("heading", { level: 1, name: "Start training" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });

  test("signing in through the modal reaches the dashboard", async ({ page, testUser }) => {
    const modal = new AuthModal(page);
    await page.goto("/");
    await modal.openSignIn();
    await modal.signIn(testUser.email, testUser.password);

    await page.waitForURL("**/dashboard");
    await expect(page.getByRole("heading", { name: "My Workouts" })).toBeVisible();
  });
});
