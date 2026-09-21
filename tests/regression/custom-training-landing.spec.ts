import { test, expect } from "../../fixtures/test-fixtures";
import { CustomTrainingPage } from "../../pages/CustomTrainingPage";
import { deleteInterestRows, deleteUserAndData, interestRowsFor } from "../../utils/seed";
import { featureState } from "../../utils/features";
import { randomTestEmail, TEST_PASSWORD } from "../../utils/testData";

// The Custom Training Program landing page (GYM-41) depends on the
// `custom_programs` feature flag:
//   Off          a real 404
//   Coming soon  the page, with no price, whose buttons open the "Register your
//                interest" form (GYM-47, no login)
//   Live         the full offer
// As with the Programs page entry, each test reads /api/features and runs only
// in the state it is about, so the spec is right against production (Off), a
// preview or local build with FEATURE_FLAGS_OVERRIDE, or after a CMS change.
//
// Interest entries made here use a test address (e2e-<digits>-<id>@logandtrain-test.dev):
// the site saves those but never emails them to support. Each test deletes its own.
test.describe("Custom Training Program landing page", { tag: "@regression" }, () => {
  test("Off: the page does not exist", async ({ request }) => {
    test.skip((await featureState(request, "custom_programs")) !== "off", "custom_programs is not Off here");

    const response = await request.get(CustomTrainingPage.path);
    expect(response.status()).toBe(404);
    expect(await response.text()).not.toContain("Built around you");
  });

  test("Coming soon: the page shows with no price, no delivery promise and no payment step", async ({
    page,
    request,
    customTrainingPage,
  }) => {
    test.skip(
      (await featureState(request, "custom_programs")) !== "coming_soon",
      "custom_programs is not Coming soon here"
    );

    await customTrainingPage.goto();
    await expect(page.getByRole("heading", { level: 1, name: "Built around you." })).toBeVisible();
    await expect(page.getByText("CUSTOM TRAINING PROGRAM", { exact: true })).toBeVisible();

    // The fee is described, not priced (twice: hero and final banner).
    await expect(page.getByText("A small one-time fee", { exact: true })).toHaveCount(2);
    await expect(page.getByText("Personalized for you · No payment needed now")).toBeVisible();
    await expect(page.getByText("No payment needed now. We'll email you when it's ready.")).toBeVisible();

    const text = await page.locator("main").innerText();
    expect(text, "no price").not.toContain("₹");
    expect(text, "no delivery promise").not.toMatch(/24\s*[–-]\s*36|within \d+ hours/i);
    expect(text, "no pay-later line").not.toContain("You only pay after");
    expect(text).not.toMatch(/\bplans?\b/i);

    // The buttons ask for interest, not a purchase or a questionnaire.
    await expect(customTrainingPage.heroInterestButton()).toBeVisible();
    await expect(customTrainingPage.finalInterestButton()).toBeVisible();
    await expect(customTrainingPage.heroButton()).toHaveCount(0);
    await expect(customTrainingPage.finalButton()).toHaveCount(0);
  });

  test("Coming soon: registering interest saves the entry and lets the visitor move on", async ({
    page,
    request,
    customTrainingPage,
  }) => {
    test.skip(
      (await featureState(request, "custom_programs")) !== "coming_soon",
      "custom_programs is not Coming soon here"
    );
    const email = randomTestEmail();

    try {
      await customTrainingPage.goto();
      await customTrainingPage.heroInterestButton().click();

      const dialog = customTrainingPage.interestDialog();
      await expect(dialog.getByRole("heading", { level: 1, name: "Register your interest" })).toBeVisible();
      await expect(dialog.getByText("We'll only use your email to tell you when this launches.")).toBeVisible();
      await expect(dialog.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
      // No login is asked for, and the visitor stays on the page.
      await expect(page).toHaveURL(new RegExp(`${CustomTrainingPage.path}$`));

      await customTrainingPage.submitInterest(email, "I can train 4 days a week with dumbbells only.");
      await expect(dialog.getByRole("heading", { level: 1, name: "Thanks, you're on the list." })).toBeVisible();

      // Saved, with what they said, and a test entry is never emailed.
      await expect.poll(async () => (await interestRowsFor(email)).length).toBe(1);
      const [row] = await interestRowsFor(email);
      expect(row.interest).toBe("custom-training-program");
      expect(row.message).toBe("I can train 4 days a week with dumbbells only.");
      await expect.poll(async () => (await interestRowsFor(email))[0].email_status).toBe("skipped_test");

      // They can move on.
      await dialog.getByRole("link", { name: "Explore Free Programs →" }).click();
      await page.waitForURL("**/programs");
    } finally {
      await deleteInterestRows(email);
    }
  });

  test("Coming soon: the final button opens the same form", async ({ page, request, customTrainingPage }) => {
    test.skip(
      (await featureState(request, "custom_programs")) !== "coming_soon",
      "custom_programs is not Coming soon here"
    );

    await customTrainingPage.goto();
    await customTrainingPage.finalInterestButton().click();
    await expect(
      customTrainingPage.interestDialog().getByRole("heading", { level: 1, name: "Register your interest" })
    ).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${CustomTrainingPage.path}$`));
  });

  test.describe("Coming soon: a refused submission", () => {
    // The server correctly answers 400 to a bad email, and the browser logs any
    // failed request. Allow only that one, for the one test that sends it.
    test.use({ allowedProblems: [/status of 400.*\/api\/interest/] });

    test("Coming soon: a bad email shows an error and saves nothing", async ({ page, request, customTrainingPage }) => {
      test.skip(
        (await featureState(request, "custom_programs")) !== "coming_soon",
        "custom_programs is not Coming soon here"
      );

      await customTrainingPage.goto();
      await customTrainingPage.heroInterestButton().click();
      await customTrainingPage.submitInterest("not-an-email", "hello");

      const dialog = customTrainingPage.interestDialog();
      await expect(dialog.getByRole("alert")).toHaveText("Enter a valid email address.");
      // Still the form, not the thank-you.
      await expect(dialog.getByRole("heading", { level: 1, name: "Register your interest" })).toBeVisible();
      expect(await interestRowsFor("not-an-email")).toEqual([]);
      void page;
    });
  });

  test("Coming soon: registering twice with the same address updates the comment, not the count", async ({
    request,
    customTrainingPage,
  }) => {
    test.skip(
      (await featureState(request, "custom_programs")) !== "coming_soon",
      "custom_programs is not Coming soon here"
    );
    const email = randomTestEmail();

    try {
      await customTrainingPage.goto();
      await customTrainingPage.heroInterestButton().click();
      await customTrainingPage.submitInterest(email, "first thought");
      await expect(customTrainingPage.interestDialog().getByRole("heading", { level: 1, name: /on the list/ })).toBeVisible();

      await customTrainingPage.goto(); // a fresh page, as a returning visitor would have
      await customTrainingPage.finalInterestButton().click();
      await customTrainingPage.submitInterest(email, "second thought");
      await expect(customTrainingPage.interestDialog().getByRole("heading", { level: 1, name: /on the list/ })).toBeVisible();

      await expect.poll(async () => (await interestRowsFor(email))[0]?.message).toBe("second thought");
      expect(await interestRowsFor(email)).toHaveLength(1);
    } finally {
      await deleteInterestRows(email);
    }
  });

  test("Coming soon: a signed-in visitor has their email filled in", async ({
    signedInPage: page,
    request,
    testUser,
    customTrainingPage,
  }) => {
    test.skip(
      (await featureState(request, "custom_programs")) !== "coming_soon",
      "custom_programs is not Coming soon here"
    );

    try {
      await customTrainingPage.goto();
      await customTrainingPage.heroInterestButton().click();
      await expect(customTrainingPage.interestDialog().getByLabel("Email")).toHaveValue(testUser.email);

      await customTrainingPage.interestDialog().getByRole("button", { name: "Register interest", exact: true }).click();
      await expect(customTrainingPage.interestDialog().getByRole("heading", { level: 1, name: /on the list/ })).toBeVisible();
      await expect.poll(async () => (await interestRowsFor(testUser.email)).length).toBe(1);
      void page;
    } finally {
      await deleteInterestRows(testUser.email);
    }
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
