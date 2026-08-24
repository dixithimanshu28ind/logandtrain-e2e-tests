import { test, expect } from "../../fixtures/test-fixtures";

test.describe("Workout CRUD", () => {
  test("log, edit, and delete a workout, with the streak updating", async ({
    signedInPage: page,
    dashboardPage,
    workoutFormPage,
  }) => {
    await dashboardPage.goto();
    // Wait for the fetch to resolve before trusting the streak count — a
    // fresh user has zero workouts either way, but relying on that
    // coincidence instead of an explicit ready-signal is how flaky tests
    // get written.
    await expect(page.getByText("No workouts logged yet.")).toBeVisible();
    expect(await dashboardPage.streakDays()).toBe(0);

    await dashboardPage.logNewWorkoutLink().click();
    await workoutFormPage.fillWorkoutType("Push Day");
    await workoutFormPage.addExercise();
    await workoutFormPage.fillExerciseName(0, "Bench Press");
    await workoutFormPage.fillFirstSet(60, 10);
    await workoutFormPage.submit("Submit Workout");
    await page.waitForURL("**/dashboard");

    // The streak card and the workout list both derive from the same async
    // fetch. Waiting for the workout card guarantees that fetch has
    // resolved, so the streak count is guaranteed fresh too.
    await expect(dashboardPage.workoutCard("Push Day")).toBeVisible();
    expect(await dashboardPage.streakDays()).toBe(1);

    await dashboardPage.workoutCard("Push Day").click();
    await expect(page.getByRole("heading", { name: "Edit Workout" })).toBeVisible();
    await page.getByPlaceholder("kg").first().fill("65");
    await workoutFormPage.submit("Save Changes");
    await page.waitForURL("**/dashboard");

    await dashboardPage.workoutCard("Push Day").click();
    expect(await workoutFormPage.firstSetEffortValue()).toBe("65");

    await workoutFormPage.deleteWorkout();
    await page.waitForURL("**/dashboard");
    await expect(page.getByText("No workouts logged yet.")).toBeVisible();
  });
});
