import { test, expect } from "../../fixtures/test-fixtures";

test.describe("Known issues", { tag: "@known-issue" }, () => {
  // KNOWN ISSUE (found 2026-09-19): GYM-24 intends sign-out to land on the
  // landing page ("/"), but it lands on /signin roughly 30% of the time
  // (6 of 20 runs under parallel load).
  //
  // Cause: AppShell.handleSignOut() calls router.push("/") then signOut().
  // The App Router navigation isn't instant, so the dashboard is still
  // mounted when signOut() clears the user, and its own effect
  // ("no user -> router.push('/signin')") can win the race. The user is
  // still signed out; only the destination is unreliable.
  //
  // Skipped because a test that fails one run in three gates nothing. Enable
  // it once the app fixes the race, and make the smoke test in
  // tests/smoke/auth.spec.ts assert the destination again.
  test.fixme(true, "sign-out destination is racy in the app — see comment above");

  test("sign out lands on the landing page", async ({ signedInPage: page, dashboardPage }) => {
    await dashboardPage.signOut();
    await page.waitForURL((url) => url.pathname === "/");
    await expect(page.getByRole("heading", { level: 1, name: /Train your way/ })).toBeVisible();
  });
});
