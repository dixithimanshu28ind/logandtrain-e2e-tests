import { test, expect } from "../../fixtures/test-fixtures";
import { selectProgramFor, workoutsOf } from "../../utils/seed";
import { todayKey } from "../../utils/dates";
import {
  TEST_PROGRAM_ID,
  allDays,
  exerciseCount,
  firstWithAlternative,
  sectionLabel,
  shortTitle,
} from "../../utils/programs";

// Everything here starts from a user who is already on the program (seeded
// through the admin API), so each test exercises the log page, not the join flow.
test.describe("Logging a program workout", { tag: "@regression" }, () => {
  test.beforeEach(async ({ testUser }) => {
    await selectProgramFor(testUser.id, TEST_PROGRAM_ID);
  });

  test("recommends the first program day, and prefills its workouts", async ({
    signedInPage: page,
    workoutFormPage,
    programData,
  }) => {
    const day = allDays(programData)[0];

    await workoutFormPage.gotoNew();
    await expect(workoutFormPage.upNext()).toHaveText(`Up next: ${shortTitle(day)}`);
    await expect(page.getByText(`Day ${day.day} of your ${programData.program.name}`)).toBeVisible();

    await workoutFormPage.useThisWorkout();
    for (const group of day.groups ?? []) {
      await expect(workoutFormPage.sectionHeader(sectionLabel(group))).toBeVisible();
    }
    // Once a day is chosen, the recommendation goes away.
    await expect(workoutFormPage.upNext()).toHaveCount(0);
  });

  test("a prefilled section lists the prescribed exercises with their targets", async ({
    signedInPage: page,
    workoutFormPage,
    programData,
  }) => {
    const group = (allDays(programData)[0].groups ?? [])[0];
    await workoutFormPage.gotoNew();
    await workoutFormPage.useThisWorkout();
    await workoutFormPage.openSection(sectionLabel(group));

    for (const [i, ex] of group.exercises.entries()) {
      await expect(workoutFormPage.exerciseNameInput(i)).toHaveValue(ex.exercise);
    }
    if (group.exercises[0].targetReps) {
      await expect(workoutFormPage.targetHint(group.exercises[0].targetReps)).toBeVisible();
    }
    await expect(page.getByRole("button", { name: "Save Workouts" })).toBeVisible();
  });

  test("an exercise can be swapped for its alternative and back", async ({
    signedInPage: _page,
    workoutFormPage,
    programData,
  }) => {
    const day = allDays(programData)[0];
    const groups = day.groups ?? [];
    const alt = firstWithAlternative(day);
    test.skip(!alt, "the first program day has no exercise with an alternative");

    const group = groups.find((g) => g.exercises.includes(alt!))!;
    const index = group.exercises.indexOf(alt!);

    await workoutFormPage.gotoNew();
    await workoutFormPage.useThisWorkout();
    await workoutFormPage.openSection(sectionLabel(group));
    await expect(workoutFormPage.exerciseNameInput(index)).toHaveValue(alt!.exercise);

    await workoutFormPage.useAlternative();
    await expect(workoutFormPage.exerciseNameInput(index)).toHaveValue(alt!.alternative!);

    await workoutFormPage.useOriginal();
    await expect(workoutFormPage.exerciseNameInput(index)).toHaveValue(alt!.exercise);
  });

  test("saving with some exercises done asks first, and saves only the completed ones", async ({
    signedInPage: page,
    workoutFormPage,
    programData,
    testUser,
  }) => {
    const day = allDays(programData)[0];
    const groups = day.groups ?? [];
    const total = exerciseCount(day);

    await workoutFormPage.gotoNew();
    await workoutFormPage.useThisWorkout();
    await workoutFormPage.openSection(sectionLabel(groups[0]));
    await workoutFormPage.fillFirstSet(60, 10); // completes one exercise

    await workoutFormPage.save();
    await expect(page.getByRole("dialog")).toContainText("Some exercises aren't completed");
    await expect(page.getByRole("dialog")).toContainText(`You've completed 1 of ${total} exercises.`);

    // "Stay" changes nothing.
    await workoutFormPage.stay();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page).toHaveURL(/\/workout\/new/);
    expect(await workoutsOf(testUser.id)).toHaveLength(0);

    // "Save & Exit" saves, and only the completed exercise is kept.
    await workoutFormPage.save();
    await workoutFormPage.saveAndExit();
    await page.waitForURL("**/dashboard");

    const saved = await workoutsOf(testUser.id);
    expect(saved.map((w) => w.workout_type).sort()).toEqual(groups.map((g) => g.workoutType).sort());
    expect(saved.find((w) => w.workout_type === groups[0].workoutType)?.exercises).toBe(1);
    expect(saved.reduce((n, w) => n + w.exercises, 0)).toBe(1);
  });

  test("saving with nothing completed offers to leave without saving", async ({
    signedInPage: page,
    workoutFormPage,
    testUser,
  }) => {
    await workoutFormPage.gotoNew();
    await workoutFormPage.useThisWorkout();
    await workoutFormPage.save();

    await expect(page.getByRole("dialog")).toContainText("No exercises completed");
    await workoutFormPage.stay();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await workoutFormPage.save();
    await workoutFormPage.leaveWithoutSaving();
    await page.waitForURL("**/dashboard");
    expect(await workoutsOf(testUser.id)).toHaveLength(0);
  });

  test("a partly done day can be resumed, restoring the exercises that were missed", async ({
    signedInPage: page,
    workoutFormPage,
    programData,
  }) => {
    const day = allDays(programData)[0];
    const groups = day.groups ?? [];
    const total = exerciseCount(day);

    await workoutFormPage.gotoNew();
    await workoutFormPage.useThisWorkout();
    await workoutFormPage.openSection(sectionLabel(groups[0]));
    await workoutFormPage.fillFirstSet(60, 10);
    await workoutFormPage.save();
    await workoutFormPage.saveAndExit();
    await page.waitForURL("**/dashboard");

    // Reopening today offers to resume, and says how far along it is.
    await workoutFormPage.gotoDate(todayKey());
    await expect(workoutFormPage.resumeCard()).toBeVisible();
    await expect(page.getByText(`You completed 1 of ${total} prescribed exercises.`)).toBeVisible();

    // Resuming puts the missing exercises back, so every section is full again.
    await workoutFormPage.resumeWorkout();
    for (const group of groups) {
      await expect(workoutFormPage.sectionHeader(sectionLabel(group))).toBeVisible();
    }
  });

  test("'Log Something Else' starts an empty workout instead", async ({
    signedInPage: page,
    workoutFormPage,
  }) => {
    await workoutFormPage.gotoNew();
    await expect(workoutFormPage.upNext()).toBeVisible();

    await workoutFormPage.logSomethingElse();
    await expect(workoutFormPage.upNext()).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Select workout type" })).toBeVisible();
  });

  test("another program day can be chosen from the list", async ({
    signedInPage: page,
    workoutFormPage,
    programData,
  }) => {
    const second = allDays(programData)[1];
    test.skip(!second?.groups?.length, "the program's second day has no exercise groups");

    await workoutFormPage.gotoNew();
    await workoutFormPage.chooseAnotherProgramWorkout();
    await expect(page.getByRole("dialog")).toContainText("Choose a program workout");

    // Days in later blocks repeat the same titles; the first match is this block's.
    await page.getByRole("dialog").getByRole("button", { name: shortTitle(second) }).first().click();

    for (const group of second.groups ?? []) {
      await expect(workoutFormPage.sectionHeader(sectionLabel(group))).toBeVisible();
    }
  });
});
