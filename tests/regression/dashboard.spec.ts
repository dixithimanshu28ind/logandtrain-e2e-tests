import { test, expect } from "../../fixtures/test-fixtures";
import { daysAgoKey, todayKey } from "../../utils/dates";
import { TEST_PROGRAM_ID } from "../../utils/programs";
import { selectProgramFor } from "../../utils/seed";

const workoutOn = (date: string, workoutType = "Push") => ({
  date,
  workoutType,
  exercises: [{ name: "Bench Press", sets: [{ effortValue: 60, reps: 10 }] }],
});

test.describe("Dashboard", { tag: "@regression" }, () => {
  test.describe("the current streak", () => {
    test("counts consecutive days back from today", async ({
      signedInPage: _page,
      dashboardPage,
      seed,
    }) => {
      for (const days of [0, 1, 2]) await seed(workoutOn(daysAgoKey(days)));
      await dashboardPage.goto();
      await expect(dashboardPage.loadedMarker()).toBeVisible();
      expect(await dashboardPage.streakDays()).toBe(3);
    });

    test("survives a today with nothing logged yet", async ({
      signedInPage: _page,
      dashboardPage,
      seed,
    }) => {
      for (const days of [1, 2]) await seed(workoutOn(daysAgoKey(days)));
      await dashboardPage.goto();
      await expect(dashboardPage.loadedMarker()).toBeVisible();
      expect(await dashboardPage.streakDays()).toBe(2);
    });

    test("breaks once a whole day is skipped", async ({
      signedInPage: _page,
      dashboardPage,
      seed,
    }) => {
      // Today and two days ago, with yesterday missing: only today counts.
      for (const days of [0, 2, 3]) await seed(workoutOn(daysAgoKey(days)));
      await dashboardPage.goto();
      await expect(dashboardPage.loadedMarker()).toBeVisible();
      expect(await dashboardPage.streakDays()).toBe(1);
    });
  });

  test("the longest streak card appears only after 7 logged days", async ({
    signedInPage: _page,
    dashboardPage,
    seed,
  }) => {
    for (const days of [0, 1, 2, 3, 4, 5]) await seed(workoutOn(daysAgoKey(days)));
    await dashboardPage.goto();
    await expect(dashboardPage.loadedMarker()).toBeVisible();
    await expect(dashboardPage.longestStreakLabel()).toHaveCount(0);

    // The seventh day brings the card in.
    await seed(workoutOn(daysAgoKey(6)));
    await dashboardPage.goto();
    await expect(dashboardPage.longestStreakLabel()).toBeVisible();
    expect(await dashboardPage.longestStreakDays()).toBe(7);
    expect(await dashboardPage.streakDays()).toBe(7);
  });

  test.describe("empty state", () => {
    test("without a program, invites the user to start logging or browse programs", async ({
      signedInPage: page,
      dashboardPage,
    }) => {
      await expect(page.getByText("No workouts logged yet.")).toBeVisible();
      expect(await dashboardPage.streakDays()).toBe(0);
      await expect(page.getByRole("link", { name: "Start logging here." })).toBeVisible();
      await expect(page.getByRole("link", { name: "Check our pre-designed programs." })).toBeVisible();
    });

    test("on a program, invites the user to log their first workout", async ({
      signedInPage: page,
      dashboardPage,
      testUser,
    }) => {
      await selectProgramFor(testUser.id, TEST_PROGRAM_ID);
      await dashboardPage.goto();
      await expect(page.getByText("Ready to get started?")).toBeVisible();
      await expect(page.getByRole("link", { name: "Log your first workout here." })).toBeVisible();
      await expect(page.getByRole("link", { name: "Check more programs." })).toBeVisible();
    });
  });

  test("the weekly history can go back a week and forward again", async ({
    signedInPage: page,
    dashboardPage,
    seed,
  }) => {
    // Seven days ago is always in the previous calendar week.
    await seed(workoutOn(todayKey(), "Push"));
    await seed(workoutOn(daysAgoKey(7), "Pull"));
    await dashboardPage.goto();

    await expect(dashboardPage.workoutCard("Push")).toBeVisible();
    await expect(dashboardPage.workoutCard("Pull")).toHaveCount(0);
    await expect(dashboardPage.nextWeekButton()).toBeDisabled();

    await dashboardPage.previousWeekButton().click();
    await expect(dashboardPage.workoutCard("Pull")).toBeVisible();
    await expect(dashboardPage.workoutCard("Push")).toHaveCount(0);
    await expect(dashboardPage.nextWeekButton()).toBeEnabled();

    await dashboardPage.nextWeekButton().click();
    await expect(dashboardPage.workoutCard("Push")).toBeVisible();
    await expect(page.getByRole("button", { name: "← Previous Week" })).toBeEnabled();
  });

  test("a day's tile opens that day's workout", async ({
    signedInPage: page,
    dashboardPage,
    workoutFormPage,
    seed,
  }) => {
    await seed(workoutOn(todayKey(), "Push"));
    await dashboardPage.goto();
    await dashboardPage.workoutCard("Push").click();

    await expect(page).toHaveURL(new RegExp(`/workout/new\\?date=${todayKey()}$`));
    await expect(workoutFormPage.exerciseNameInput(0)).toHaveValue("Bench Press");
  });
});
