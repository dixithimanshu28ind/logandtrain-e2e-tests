import { test as base, Page } from "@playwright/test";
import { createTestUser, deleteTestUser, TestUser } from "../utils/supabaseAdmin";
import { AuthPage } from "../pages/AuthPage";
import { DashboardPage } from "../pages/DashboardPage";
import { WorkoutFormPage } from "../pages/WorkoutFormPage";
import { ProfilePage } from "../pages/ProfilePage";

type Fixtures = {
  testUser: TestUser;
  authPage: AuthPage;
  dashboardPage: DashboardPage;
  workoutFormPage: WorkoutFormPage;
  profilePage: ProfilePage;
  /** A page already signed in as `testUser`, sitting on /dashboard. */
  signedInPage: Page;
};

export const test = base.extend<Fixtures>({
  // Each test gets its own throwaway Supabase user, created and deleted via
  // the admin API. Keeps tests isolated and safe to run in parallel, and
  // never leaves junk accounts behind in the real project.
  testUser: async ({}, use) => {
    const user = await createTestUser();
    await use(user);
    await deleteTestUser(user.id);
  },

  authPage: async ({ page }, use) => {
    await use(new AuthPage(page));
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  workoutFormPage: async ({ page }, use) => {
    await use(new WorkoutFormPage(page));
  },

  profilePage: async ({ page }, use) => {
    await use(new ProfilePage(page));
  },

  signedInPage: async ({ page, testUser, authPage }, use) => {
    await authPage.goto("signin");
    await authPage.signIn(testUser.email, testUser.password);
    await page.waitForURL("**/dashboard");
    await use(page);
  },
});

export { expect } from "@playwright/test";
