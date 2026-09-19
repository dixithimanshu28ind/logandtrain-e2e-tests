import { test, expect } from "../../fixtures/test-fixtures";
import { daysAgoKey, todayKey } from "../../utils/dates";

test.describe("Dashboard", { tag: "@smoke" }, () => {
  test("shows seeded workouts, the current streak and the running total", async ({
    signedInPage: page,
    dashboardPage,
    seed,
  }) => {
    // Set up state through the API instead of clicking through the log form.
    await seed({
      date: todayKey(),
      workoutType: "Push",
      exercises: [{ name: "Bench Press", sets: [{ effortValue: 60, reps: 10 }] }],
    });
    await seed({
      date: daysAgoKey(1),
      workoutType: "Pull",
      exercises: [{ name: "Barbell Row", sets: [{ effortValue: 50, reps: 10 }] }],
    });

    // signedInPage loaded the dashboard before the seed, so reload it.
    await dashboardPage.goto();

    // Today's tile is always in the current week; yesterday's may not be
    // (on a Monday it's last week), so the streak carries that day.
    await expect(dashboardPage.workoutCard("Push")).toBeVisible();
    expect(await dashboardPage.streakDays()).toBe(2);
    await expect(page.getByText("2 total")).toBeVisible();
  });
});
