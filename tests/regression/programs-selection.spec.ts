import { test, expect } from "../../fixtures/test-fixtures";
import { randomTestEmail, TEST_PASSWORD } from "../../utils/testData";
import {
  deleteUserAndData,
  findUserIdByEmail,
  selectProgramFor,
  selectedProgramOf,
} from "../../utils/seed";
import { TEST_PROGRAM_ID } from "../../utils/programs";

test.describe("Program selection", { tag: "@regression" }, () => {
  test("the consent checkbox gates joining, and joining is saved", async ({
    signedInPage: page,
    programDetailPage,
    programData,
    testUser,
  }) => {
    await programDetailPage.goto(TEST_PROGRAM_ID);

    // Unchecked: the start button is disabled.
    await expect(programDetailPage.startButton()).toBeDisabled();
    await programDetailPage.consentCheckbox().check();
    await expect(programDetailPage.startButton()).toBeEnabled();

    await programDetailPage.startButton().click();
    await expect(programDetailPage.selectedMessage(programData.program.name)).toBeVisible();

    // The card now reads "Current Program" (disabled) and offers Leave.
    await expect(programDetailPage.currentProgramButton()).toBeDisabled();
    await expect(programDetailPage.leaveButton()).toBeVisible();

    // And it was actually saved, not just shown.
    await expect.poll(() => selectedProgramOf(testUser.id)).toBe(TEST_PROGRAM_ID);
    await expect(page).toHaveURL(new RegExp(`/programs/${TEST_PROGRAM_ID}$`));
  });

  test("leaving a program asks first, and can be cancelled", async ({
    signedInPage: page,
    programDetailPage,
    testUser,
  }) => {
    await selectProgramFor(testUser.id, TEST_PROGRAM_ID);
    await programDetailPage.goto(TEST_PROGRAM_ID);

    await programDetailPage.leaveButton().click();
    await expect(page.getByRole("dialog")).toContainText("Are you sure you want to leave this program?");

    // "No" changes nothing.
    await programDetailPage.cancelLeave();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(programDetailPage.currentProgramButton()).toBeVisible();
    expect(await selectedProgramOf(testUser.id)).toBe(TEST_PROGRAM_ID);

    // "Yes" leaves it.
    await programDetailPage.leaveButton().click();
    await programDetailPage.confirmLeave();
    await expect(page.getByRole("dialog")).toContainText("You've left the program.");
    await expect(page.getByRole("link", { name: "Select Another Program" })).toBeVisible();
    await expect.poll(() => selectedProgramOf(testUser.id)).toBeNull();
  });

  test("after leaving, the program can be joined again with a fresh consent", async ({
    signedInPage: page,
    programDetailPage,
    testUser,
  }) => {
    await selectProgramFor(testUser.id, TEST_PROGRAM_ID);
    await programDetailPage.goto(TEST_PROGRAM_ID);
    await programDetailPage.leaveButton().click();
    await programDetailPage.confirmLeave();
    await expect(page.getByRole("dialog")).toContainText("You've left the program.");

    // Reloading the page shows it as not joined, with the consent unchecked.
    await programDetailPage.goto(TEST_PROGRAM_ID);
    await expect(programDetailPage.consentCheckbox()).not.toBeChecked();
    await expect(programDetailPage.startButton()).toBeDisabled();
  });

  // Regression from GYM-24: revisiting the page of the program you're on used
  // to show the consent box unchecked, as if you had never agreed.
  test("revisiting the current program keeps the consent checked", async ({
    signedInPage: page,
    programDetailPage,
    testUser,
  }) => {
    await selectProgramFor(testUser.id, TEST_PROGRAM_ID);
    await programDetailPage.goto(TEST_PROGRAM_ID);

    await expect(programDetailPage.currentProgramButton()).toBeVisible();
    await expect(programDetailPage.consentCheckbox()).toBeChecked();
    await expect(page.getByText("Current Program", { exact: true }).first()).toBeVisible();
  });

  test("the dashboard and profile show the current program", async ({
    signedInPage: page,
    dashboardPage,
    profilePage,
    programData,
    testUser,
  }) => {
    // Before joining: no program.
    await expect(dashboardPage.programPill("My Own Program")).toBeVisible();
    await profilePage.goto();
    await expect(page.getByText("No program selected yet.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Browse programs" })).toBeVisible();

    // After joining: the name shows in both places.
    await selectProgramFor(testUser.id, TEST_PROGRAM_ID);
    await dashboardPage.goto();
    await expect(dashboardPage.programPill(programData.program.name)).toBeVisible();

    await profilePage.goto();
    await expect(page.getByText(programData.program.name, { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Change program" })).toBeVisible();
  });

  // The signed-out path: agree, click start, get the sign-up modal, create an
  // account, and land on the program already selected.
  test("joining while signed out goes through sign-up and then selects the program", async ({
    page,
    programDetailPage,
    programData,
  }) => {
    const email = randomTestEmail();
    try {
      await programDetailPage.goto(TEST_PROGRAM_ID);
      await programDetailPage.consentCheckbox().check();
      await programDetailPage.startButton().click();

      const dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("heading", { level: 1, name: "Start training" })).toBeVisible();
      await dialog.getByLabel("Email").fill(email);
      await dialog.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);
      await dialog.getByLabel("Confirm Password").fill(TEST_PASSWORD);
      await dialog.getByRole("button", { name: "Create Account", exact: true }).click();

      await expect(programDetailPage.selectedMessage(programData.program.name)).toBeVisible();

      const userId = await findUserIdByEmail(email);
      expect(userId, "the account was created").not.toBeNull();
      await expect.poll(() => selectedProgramOf(userId!)).toBe(TEST_PROGRAM_ID);
    } finally {
      await deleteUserAndData(email);
    }
  });
});
