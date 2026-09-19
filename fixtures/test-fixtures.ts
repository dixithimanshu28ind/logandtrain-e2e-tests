import { test as base, expect, Page } from "@playwright/test";
import { createTestUser, deleteTestUser, TestUser } from "../utils/supabaseAdmin";
import { purgeUserData, seedWorkout, SeedWorkout } from "../utils/seed";
import { sessionStorageKey, signInViaApi } from "../utils/session";
import { watchPage } from "./console-guard";
import { applyBypassToBrowser, requestWithBypass } from "./vercel-bypass";
import { AuthPage } from "../pages/AuthPage";
import { DashboardPage } from "../pages/DashboardPage";
import { WorkoutFormPage } from "../pages/WorkoutFormPage";
import { ProfilePage } from "../pages/ProfilePage";
import { ProgramsPage } from "../pages/ProgramsPage";

type Fixtures = {
  testUser: TestUser;
  authPage: AuthPage;
  dashboardPage: DashboardPage;
  workoutFormPage: WorkoutFormPage;
  profilePage: ProfilePage;
  programsPage: ProgramsPage;
  /**
   * A page already signed in as `testUser` and sitting on /dashboard. The
   * session is injected via the API, not the sign-in form, so this is fast
   * and doesn't depend on the auth UI.
   */
  signedInPage: Page;
  /**
   * Seeds a workout for `testUser` straight through the admin API. `signedInPage`
   * has already loaded the dashboard by then, so reload it to see seeded data.
   */
  seed: (workout: SeedWorkout) => Promise<string>;
  /** Auto: fails the test on console errors, uncaught exceptions, 5xx and failed requests. */
  consoleGuard: void;
};

type Options = {
  /** Console/network messages this test is allowed to produce. Use sparingly, per test. */
  allowedProblems: RegExp[];
};

export const test = base.extend<Fixtures & Options>({
  allowedProblems: [[], { option: true }],

  // The route is registered on the context as it's created, so it's in place
  // before any page can make a request. It adds the deployment-protection
  // bypass header when testing protected Vercel deployments (a no-op otherwise).
  context: async ({ context, baseURL }, use) => {
    await applyBypassToBrowser(context, baseURL);
    await use(context);
  },

  request: requestWithBypass,

  consoleGuard: [
    async ({ page, allowedProblems }, use) => {
      const problems = watchPage(page, allowedProblems);
      await use();
      expect(problems, "Unexpected console/network problems during the test").toEqual([]);
    },
    { auto: true },
  ],

  // Each test gets its own throwaway Supabase user, created and deleted via
  // the admin API. Keeps tests isolated and safe to run in parallel, and
  // never leaves junk accounts behind in the real project.
  testUser: async ({}, use) => {
    const user = await createTestUser();
    await use(user);
    await purgeUserData(user.id);
    await deleteTestUser(user.id);
  },

  seed: async ({ testUser }, use) => {
    await use((workout) => seedWorkout(testUser.id, workout));
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

  programsPage: async ({ page }, use) => {
    await use(new ProgramsPage(page));
  },

  // The longer timeout gives signInViaApi room to back off and retry if
  // Supabase rate-limits the sign-in during a heavy run.
  signedInPage: [async ({ page, context, testUser }, use) => {
    const session = await signInViaApi(testUser.email, testUser.password);
    // Init scripts re-run on every navigation. Seed the session once per tab
    // (sessionStorage survives reloads), or a test that signs out would be
    // silently signed back in by the next page load.
    await context.addInitScript(
      ([key, value]) => {
        if (window.sessionStorage.getItem("__e2e_session_seeded")) return;
        window.localStorage.setItem(key, value);
        window.sessionStorage.setItem("__e2e_session_seeded", "1");
      },
      [sessionStorageKey(), JSON.stringify(session)]
    );
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "My Workouts" })).toBeVisible();
    await use(page);
  }, { timeout: 120_000 }],
});

export { expect } from "@playwright/test";
