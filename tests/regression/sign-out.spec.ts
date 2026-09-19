import type { Page } from "@playwright/test";
import { test, expect } from "../../fixtures/test-fixtures";
import { AuthModal } from "../../components/AuthModal";
import { endSessionElsewhere, sessionStorageKey } from "../../utils/session";
import { SLOW_3G, VERY_SLOW, throttleNetwork } from "../../utils/network";

// Sign-out must land on the homepage every time (GYM-24, made reliable by
// GYM-37). Before GYM-37 it raced: each protected page ran its own
// "no user -> /signin" redirect, which could beat the sign-out navigation to
// "/". On a throttled network the old code landed on /signin every time, so
// several of these run slowed down on purpose.

/**
 * Waits for the homepage, then for the session to actually clear. Clearing is
 * the moment a competing redirect to /signin would fire, so the URL is
 * re-checked after it instead of after an arbitrary sleep.
 */
async function expectSignedOutOnHomepage(page: Page) {
  await page.waitForURL((url) => url.pathname === "/", { timeout: 90_000 });
  await expect(page.getByRole("heading", { level: 1, name: /Train your way/ })).toBeVisible();
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), sessionStorageKey()), {
      timeout: 90_000,
    })
    .toBeNull();
  expect(new URL(page.url()).pathname, "a late redirect moved the user off the homepage").toBe("/");
}

test.describe("Sign-out destination", { tag: "@regression" }, () => {
  test("from the profile page", async ({ signedInPage: page, dashboardPage }) => {
    await page.goto("/profile");
    await expect(page.getByRole("heading", { level: 1, name: "Profile" })).toBeVisible();
    await dashboardPage.signOut();
    await expectSignedOutOnHomepage(page);
  });

  test("from the log workout page", async ({ signedInPage: page, dashboardPage }) => {
    await page.goto("/workout/new");
    await expect(page.getByRole("heading", { level: 1, name: "Log Workout" })).toBeVisible();
    await dashboardPage.signOut();
    await expectSignedOutOnHomepage(page);
  });

  // The Programs pages are public but show the app shell when signed in, and
  // have no "no user" redirect, so this path relies on the shell's own navigation.
  test("from the public Programs page", async ({ signedInPage: page, dashboardPage }) => {
    await page.goto("/programs");
    await expect(page.getByRole("heading", { level: 1, name: "Programs" })).toBeVisible();
    await dashboardPage.signOut();
    await expectSignedOutOnHomepage(page);
  });

  test("after choosing 'Leave Without Saving' on the unsaved-changes dialog", async ({
    signedInPage: page,
    dashboardPage,
    workoutFormPage,
  }) => {
    await workoutFormPage.gotoNew();
    await workoutFormPage.selectWorkoutType("Push"); // makes the form dirty
    await dashboardPage.signOut();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("Save before you leave?");
    await dialog.getByRole("button", { name: "Leave Without Saving", exact: true }).click();
    await expectSignedOutOnHomepage(page);
  });

  for (const [label, profile] of [
    ["slow 3G", SLOW_3G],
    ["a very slow connection", VERY_SLOW],
  ] as const) {
    test(`from the dashboard on ${label}`, async ({ signedInPage: page, dashboardPage }) => {
      test.setTimeout(150_000);
      // Throttle only now, so setup is fast and the sign-out itself is slow.
      await throttleNetwork(page, profile);
      await dashboardPage.signOut();
      await expectSignedOutOnHomepage(page);
    });
  }
});

// Only a user-initiated sign-out goes to the homepage. Anyone else without a
// session still goes to /signin.
test.describe("Signed-out visitors still go to /signin", { tag: "@regression" }, () => {
  test("when the session ends in another tab", async ({ signedInPage: page }) => {
    await endSessionElsewhere(page);
    await page.waitForURL("**/signin");
    await expect(page.getByRole("heading", { level: 1, name: "Welcome back" })).toBeVisible();
  });

  // Guards the flag that marks "the user chose to sign out": it must reset on
  // sign-in, or a later session loss would wrongly send the user home.
  test("when the session ends after signing out and back in", async ({
    signedInPage: page,
    dashboardPage,
    testUser,
  }) => {
    await dashboardPage.signOut();
    await expectSignedOutOnHomepage(page);

    const modal = new AuthModal(page);
    await modal.openSignIn();
    await modal.signIn(testUser.email, testUser.password);
    await page.waitForURL("**/dashboard");
    await expect(page.getByRole("heading", { name: "My Workouts" })).toBeVisible();

    await endSessionElsewhere(page);
    await page.waitForURL("**/signin");
  });
});
