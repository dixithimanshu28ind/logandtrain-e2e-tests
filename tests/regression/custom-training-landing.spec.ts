import { test, expect } from "../../fixtures/test-fixtures";
import { CustomTrainingPage } from "../../pages/CustomTrainingPage";
import { deleteUserAndData } from "../../utils/seed";
import { featureState } from "../../utils/features";
import { randomTestEmail, TEST_PASSWORD } from "../../utils/testData";

// The Custom Training Program landing page (GYM-41) exists only while the
// `custom_programs` feature flag is Live: anything else is a real 404. As with
// the Programs page entry, each test reads /api/features and runs only in the
// state it is about, so the spec is right against production (Off), a preview
// or local build with FEATURE_FLAGS_OVERRIDE, or after a CMS change.
test.describe("Custom Training Program landing page", { tag: "@regression" }, () => {
  test("Off or Coming soon: the page does not exist", async ({ request }) => {
    test.skip((await featureState(request, "custom_programs")) === "live", "custom_programs is Live here");

    const response = await request.get(CustomTrainingPage.path);
    expect(response.status()).toBe(404);
    expect(await response.text()).not.toContain("Built around you");
  });

  test("Live: every section of the page is there", async ({ page, request, customTrainingPage }) => {
    test.skip((await featureState(request, "custom_programs")) !== "live", "custom_programs is not Live here");

    await customTrainingPage.goto();

    // Hero
    await expect(page.getByText("CUSTOM TRAINING PROGRAM", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Built around you." })).toBeVisible();
    await expect(page.getByText("Personalized for you · Ready within 24–36 hours")).toBeVisible();
    await expect(customTrainingPage.heroButton()).toBeVisible();

    // The body, section by section
    for (const heading of [
      "A good program has to fit your life, too.",
      "Your program starts with you.",
      "Is it right for you?",
      "More than a workout document.",
      "How it works",
      "Ready for a program built around you?",
      "Not sure you need a Custom Training Program?",
    ]) {
      await expect(page.getByRole("heading", { level: 2, name: heading }), heading).toBeVisible();
    }
    for (const factor of ["Goal", "Experience", "Schedule", "Equipment", "Preferences", "Needs"]) {
      await expect(page.getByRole("heading", { level: 3, name: `Your ${factor}` }), factor).toBeVisible();
    }
    for (const step of ["Tell us about yourself", "We build your program", "Start training"]) {
      await expect(page.getByRole("heading", { level: 3, name: step }), step).toBeVisible();
    }
    await expect(page.getByText("You don't need to stay on the page while your program is being prepared.")).toBeVisible();

    // Price: shown in the hero and again by the final button, always the same.
    await expect(page.getByText("₹299 · One-time", { exact: true })).toHaveCount(2);

    // Payment message and the way out to the free programs.
    await expect(page.getByText(/You only pay after you've answered the questions/)).toBeVisible();
    await expect(customTrainingPage.finalButton()).toBeVisible();
    await expect(page.getByRole("link", { name: "Explore Free Programs →" })).toHaveAttribute("href", "/programs");
  });

  test("Live: the copy says program, never plan, and never suggests a subscription", async ({
    page,
    request,
    customTrainingPage,
  }) => {
    test.skip((await featureState(request, "custom_programs")) !== "live", "custom_programs is not Live here");

    await customTrainingPage.goto();
    await expect(page.getByRole("heading", { level: 1, name: "Built around you." })).toBeVisible();

    const text = await page.locator("main").innerText();
    expect(text).not.toMatch(/\bplans?\b/i);
    expect(text).not.toMatch(/subscri|per month|monthly|recurring|auto-?renew/i);
  });

  test("Live: signed out, a button asks you to sign up and leaves you on the page", async ({
    page,
    request,
    customTrainingPage,
  }) => {
    test.skip((await featureState(request, "custom_programs")) !== "live", "custom_programs is not Live here");
    const email = randomTestEmail();

    try {
      await customTrainingPage.goto();
      await customTrainingPage.heroButton().click();

      const dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("heading", { level: 1, name: "Start training" })).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`${CustomTrainingPage.path}$`));

      await dialog.getByLabel("Email").fill(email);
      await dialog.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);
      await dialog.getByLabel("Confirm Password").fill(TEST_PASSWORD);
      await dialog.getByRole("button", { name: "Create Account", exact: true }).click();

      // Signed up and still here: not sent to the dashboard or the home page.
      await expect(dialog).toHaveCount(0);
      await expect(page).toHaveURL(new RegExp(`${CustomTrainingPage.path}$`));
      await expect(page.getByRole("heading", { level: 1, name: "Built around you." })).toBeVisible();
      await expect(page.getByRole("link", { name: "Dashboard" }).first()).toBeVisible();

      // The buttons are now the way on to the questionnaire.
      await expect(customTrainingPage.heroLink()).toHaveAttribute("href", CustomTrainingPage.questionnairePath);
    } finally {
      await deleteUserAndData(email);
    }
  });

  test("Live: the final button asks for sign-up in the same way", async ({ page, request, customTrainingPage }) => {
    test.skip((await featureState(request, "custom_programs")) !== "live", "custom_programs is not Live here");

    await customTrainingPage.goto();
    await customTrainingPage.finalButton().click();

    await expect(page.getByRole("dialog").getByRole("heading", { level: 1, name: "Start training" })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${CustomTrainingPage.path}$`));
  });

  test("Live: signed in, both buttons lead on to the questionnaire", async ({
    signedInPage: page,
    request,
    customTrainingPage,
  }) => {
    test.skip((await featureState(request, "custom_programs")) !== "live", "custom_programs is not Live here");

    await customTrainingPage.goto();
    await expect(page.getByRole("heading", { level: 1, name: "Built around you." })).toBeVisible();

    await expect(customTrainingPage.heroLink()).toHaveAttribute("href", CustomTrainingPage.questionnairePath);
    await expect(customTrainingPage.finalLink()).toHaveAttribute("href", CustomTrainingPage.questionnairePath);
    // No sign-up wall for someone who is already signed in.
    await expect(customTrainingPage.heroButton()).toHaveCount(0);
  });
});
