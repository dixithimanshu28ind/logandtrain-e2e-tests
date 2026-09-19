import { test, expect } from "../../fixtures/test-fixtures";

test.describe("Profile", { tag: "@smoke" }, () => {
  test("saves profile details and persists them across a reload", async ({
    signedInPage: page,
    profilePage,
  }) => {
    await profilePage.goto();
    await profilePage.fill({
      name: "E2E Tester",
      age: 30,
      weightKg: 75,
      targetWeightKg: 70,
      gymExperience: "intermediate",
    });
    await profilePage.save();
    await expect(page.getByText("Profile saved.")).toBeVisible();

    await page.reload();
    await expect(page.getByLabel("Name")).toHaveValue("E2E Tester");
    await expect(page.getByLabel("Age")).toHaveValue("30");
    await expect(page.getByLabel("Weight (kg)", { exact: true })).toHaveValue("75");
    await expect(page.getByLabel("Target Weight (kg)")).toHaveValue("70");
    await expect(page.getByLabel("Gym Experience")).toHaveValue("intermediate");
  });
});
