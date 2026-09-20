import { test, expect } from "../../fixtures/test-fixtures";
import { alertWith } from "../../utils/locators";

test.describe("Profile", { tag: "@regression" }, () => {
  test("decimal weights are kept, and the name is trimmed", async ({
    signedInPage: page,
    profilePage,
  }) => {
    await profilePage.goto();
    await page.getByLabel("Name").fill("  Alex Tester  ");
    await page.getByLabel("Weight (kg)", { exact: true }).fill("72.5");
    await page.getByLabel("Target Weight (kg)").fill("68.2");
    await profilePage.save();
    await expect(page.getByText("Profile saved.")).toBeVisible();

    await page.reload();
    await expect(page.getByLabel("Name")).toHaveValue("Alex Tester");
    await expect(page.getByLabel("Weight (kg)", { exact: true })).toHaveValue("72.5");
    await expect(page.getByLabel("Target Weight (kg)")).toHaveValue("68.2");
  });

  test("an empty profile can be saved without an error", async ({
    signedInPage: page,
    profilePage,
  }) => {
    await profilePage.goto();
    await profilePage.save();
    await expect(page.getByText("Profile saved.")).toBeVisible();
    await expect(alertWith(page, "Failed")).toHaveCount(0);
  });

  test("a field that is cleared and saved stays empty", async ({
    signedInPage: page,
    profilePage,
  }) => {
    await profilePage.goto();
    await page.getByLabel("Name").fill("Alex");
    await page.getByLabel("Age").fill("31");
    await profilePage.save();
    await expect(page.getByText("Profile saved.")).toBeVisible();

    await page.getByLabel("Age").fill("");
    await profilePage.save();
    await expect(page.getByText("Profile saved.")).toBeVisible();

    await page.reload();
    await expect(page.getByLabel("Name")).toHaveValue("Alex");
    await expect(page.getByLabel("Age")).toHaveValue("");
  });

  test("the sidebar shows the saved name in place of the email", async ({
    signedInPage: page,
    profilePage,
    testUser,
  }) => {
    // Before a name is saved, the sidebar falls back to the email.
    await expect(page.getByText(testUser.email, { exact: true })).toBeVisible();

    await profilePage.goto();
    await page.getByLabel("Name").fill("Alex Tester");
    await profilePage.save();
    await expect(page.getByText("Profile saved.")).toBeVisible();

    await page.goto("/dashboard");
    await expect(page.getByText("Alex Tester", { exact: true })).toBeVisible();
    await expect(page.getByText(testUser.email, { exact: true })).toHaveCount(0);
  });
});
