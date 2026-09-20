import { test, expect } from "../../fixtures/test-fixtures";
import { workoutsOf } from "../../utils/seed";
import { todayKey } from "../../utils/dates";

test.describe("Logging a workout: edge cases", { tag: "@regression" }, () => {
  test.describe("several workouts on one day", () => {
    test("two workouts on the same day are saved and shown as one tile", async ({
      signedInPage: page,
      workoutFormPage,
      dashboardPage,
      testUser,
    }) => {
      await workoutFormPage.gotoNew();
      await workoutFormPage.selectWorkoutType("Push");
      await workoutFormPage.addExercise();
      await workoutFormPage.fillExerciseName(0, "Bench Press");
      await workoutFormPage.fillFirstSet(60, 10);

      await workoutFormPage.addWorkout();
      await workoutFormPage.selectWorkoutType("Pull");
      await workoutFormPage.addExercise();
      await workoutFormPage.fillExerciseName(0, "Barbell Row");
      await workoutFormPage.fillFirstSet(50, 10);

      await workoutFormPage.save();
      await page.waitForURL("**/dashboard");

      // One day, one tile, both workouts on it; the total counts each workout.
      await expect(dashboardPage.workoutCard("Push")).toBeVisible();
      await expect(dashboardPage.workoutCard("Pull")).toBeVisible();
      await expect(page.locator('a[href^="/workout/new?date="]')).toHaveCount(1);
      await expect(dashboardPage.totalLogged(2)).toBeVisible();
      expect(await workoutsOf(testUser.id)).toHaveLength(2);
    });

    test("removing one of two workouts on a day keeps the other", async ({
      signedInPage: page,
      workoutFormPage,
      dashboardPage,
      seed,
      testUser,
    }) => {
      await seed({
        date: todayKey(),
        workoutType: "Push",
        exercises: [{ name: "Bench Press", sets: [{ effortValue: 60, reps: 10 }] }],
      });
      await seed({
        date: todayKey(),
        workoutType: "Pull",
        exercises: [{ name: "Barbell Row", sets: [{ effortValue: 50, reps: 10 }] }],
      });

      await workoutFormPage.gotoDate(todayKey());
      // With two workouts both sections start collapsed; open one to remove it.
      await expect(workoutFormPage.sectionHeader("Push · 1 exercise")).toBeVisible();
      await workoutFormPage.openSection("Push · 1 exercise");
      await workoutFormPage.removeFirstWorkout();
      await workoutFormPage.save();
      await page.waitForURL("**/dashboard");

      await expect(dashboardPage.workoutCard("Pull")).toBeVisible();
      await expect(dashboardPage.totalLogged(1)).toBeVisible();
      const remaining = await workoutsOf(testUser.id);
      expect(remaining.map((w) => w.workout_type)).toEqual(["Pull"]);
    });
  });

  test.describe("Rest Day", () => {
    test("a Rest Day has no exercises and can be saved on its own", async ({
      signedInPage: page,
      workoutFormPage,
      dashboardPage,
      testUser,
    }) => {
      await workoutFormPage.gotoNew();
      await workoutFormPage.selectWorkoutType("Rest Day");

      await expect(page.getByText("Enjoy your Rest Day")).toBeVisible();
      await expect(page.getByRole("button", { name: "+ Add Exercise" })).toHaveCount(0);

      await workoutFormPage.save();
      await page.waitForURL("**/dashboard");
      await expect(dashboardPage.workoutCard("Rest Day")).toBeVisible();

      const saved = await workoutsOf(testUser.id);
      expect(saved).toHaveLength(1);
      expect(saved[0]).toMatchObject({ workout_type: "Rest Day", exercises: 0 });
    });

    test("next to a Rest Day, only light activity can be added", async ({ signedInPage: _page, workoutFormPage }) => {
      await workoutFormPage.gotoNew();
      await workoutFormPage.selectWorkoutType("Rest Day");
      await workoutFormPage.addWorkout();

      const offered = await workoutFormPage.offeredTypes();
      expect([...offered].sort()).toEqual(["Cardio", "Mobility / Recovery", "Other"]);
    });

    test("next to a training workout, Rest Day is not offered", async ({ signedInPage: _page, workoutFormPage }) => {
      await workoutFormPage.gotoNew();
      await workoutFormPage.selectWorkoutType("Push");
      await workoutFormPage.addWorkout();

      const offered = await workoutFormPage.offeredTypes();
      expect(offered).not.toContain("Rest Day");
      expect(offered).toContain("Pull");
    });

    test("a workout that has exercises cannot be switched to Rest Day", async ({
      signedInPage: page,
      workoutFormPage,
    }) => {
      await workoutFormPage.gotoNew();
      await workoutFormPage.selectWorkoutType("Push");
      await workoutFormPage.addExercise();
      await workoutFormPage.fillExerciseName(0, "Bench Press");

      await workoutFormPage.changeWorkoutType("Push", "Rest Day");
      await expect(page.getByRole("dialog")).toContainText("Remove exercises first");
      await page.getByRole("dialog").getByRole("button", { name: "Got it", exact: true }).click();

      // Still a Push workout, exercise intact.
      await expect(page.getByRole("button", { name: "Push", exact: true })).toBeVisible();
      await expect(workoutFormPage.exerciseNameInput(0)).toHaveValue("Bench Press");
    });
  });

  test("a custom 'Other' workout type is saved and shown by its own name", async ({
    signedInPage: page,
    workoutFormPage,
    dashboardPage,
    testUser,
  }) => {
    await workoutFormPage.gotoNew();
    await workoutFormPage.selectWorkoutType("Other");
    await workoutFormPage.otherTypeInput().fill("Boxing");
    await workoutFormPage.addExercise();
    await workoutFormPage.fillExerciseName(0, "Heavy bag rounds");
    await workoutFormPage.fillFirstSet(0.1, 10);
    await workoutFormPage.save();
    await page.waitForURL("**/dashboard");

    await expect(dashboardPage.workoutCard("Boxing")).toBeVisible();
    const saved = await workoutsOf(testUser.id);
    expect(saved[0]).toMatchObject({ workout_type: "Other", workout_type_custom: "Boxing" });
  });

  test.describe("leaving with unsaved changes", () => {
    test("asks first; Stay keeps the form, Leave Without Saving discards it", async ({
      signedInPage: page,
      workoutFormPage,
      testUser,
    }) => {
      await workoutFormPage.gotoNew();
      await workoutFormPage.selectWorkoutType("Push");

      await page.getByRole("link", { name: "Programs", exact: true }).click();
      await expect(page.getByRole("dialog")).toContainText("Save before you leave?");

      await workoutFormPage.stay();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(page).toHaveURL(/\/workout\/new/);

      await page.getByRole("link", { name: "Programs", exact: true }).click();
      await workoutFormPage.leaveWithoutSaving();
      await page.waitForURL("**/programs");
      expect(await workoutsOf(testUser.id)).toHaveLength(0);
    });

    test("Save & Leave saves the workout and then goes where the user was headed", async ({
      signedInPage: page,
      workoutFormPage,
      testUser,
    }) => {
      await workoutFormPage.gotoNew();
      await workoutFormPage.selectWorkoutType("Push");
      await workoutFormPage.addExercise();
      await workoutFormPage.fillExerciseName(0, "Bench Press");
      await workoutFormPage.fillFirstSet(60, 10);

      await page.getByRole("link", { name: "Programs", exact: true }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Save & Leave", exact: true }).click();

      await page.waitForURL("**/programs");
      await expect.poll(async () => (await workoutsOf(testUser.id)).length).toBe(1);
    });
  });

  test.describe("measurement types", () => {
    test("Bodyweight hides the weight box; Duration swaps reps for a duration and unit", async ({
      signedInPage: _page,
      workoutFormPage,
    }) => {
      await workoutFormPage.gotoNew();
      await workoutFormPage.selectWorkoutType("Core / Abs");
      await workoutFormPage.addExercise();
      await workoutFormPage.fillExerciseName(0, "Plank");

      // Default: weight and reps.
      await expect(workoutFormPage.firstSetEffortInput()).toBeVisible();
      await expect(workoutFormPage.firstSetRepsInput()).toBeVisible();

      await workoutFormPage.setFirstSetType("bodyweight");
      await expect(workoutFormPage.firstSetEffortInput()).toHaveCount(0);
      await expect(workoutFormPage.firstSetRepsInput()).toBeVisible();

      await workoutFormPage.setFirstSetType("duration");
      await expect(workoutFormPage.firstSetDurationInput()).toBeVisible();
      await expect(workoutFormPage.firstSetRepsInput()).toHaveCount(0);
      await expect(workoutFormPage.firstSetEffortInput()).toHaveCount(0);

      // "Weight — Each" keeps the weight box.
      await workoutFormPage.setFirstSetType("weight_each");
      await expect(workoutFormPage.firstSetEffortInput()).toBeVisible();
    });

    test("a duration set is saved and comes back as entered", async ({
      signedInPage: page,
      workoutFormPage,
      testUser,
    }) => {
      await workoutFormPage.gotoNew();
      await workoutFormPage.selectWorkoutType("Core / Abs");
      await workoutFormPage.addExercise();
      await workoutFormPage.fillExerciseName(0, "Plank");
      await workoutFormPage.setFirstSetType("duration");
      await workoutFormPage.firstSetDurationInput().fill("45");
      await workoutFormPage.save();
      await page.waitForURL("**/dashboard");

      expect(await workoutsOf(testUser.id)).toHaveLength(1);

      await workoutFormPage.gotoDate(todayKey());
      await expect(workoutFormPage.firstSetTypeSelect()).toHaveValue("duration");
      await expect(workoutFormPage.firstSetDurationInput()).toHaveValue("45");
    });
  });
});
