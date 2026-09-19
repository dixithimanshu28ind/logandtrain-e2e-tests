import { Page } from "@playwright/test";

export class WorkoutFormPage {
  constructor(private page: Page) {}

  async gotoNew() {
    await this.page.goto("/workout/new");
  }

  /**
   * Picks a type in the first section that has none chosen yet, by searching
   * the dropdown and clicking the match.
   */
  async selectWorkoutType(type: string) {
    await this.page.getByRole("button", { name: "Select workout type" }).first().click();
    const search = this.page.getByPlaceholder("Search workout types...");
    await search.fill(type);
    // Scope to the open dropdown, whose siblings include the search box.
    await search
      .locator("xpath=..")
      .getByRole("button", { name: type, exact: true })
      .click();
  }

  async addExercise() {
    await this.page.getByRole("button", { name: "+ Add Exercise" }).click();
  }

  async fillExerciseName(index: number, name: string) {
    await this.page.getByPlaceholder(`Exercise ${index + 1} name`).fill(name);
  }

  async fillFirstSet(effortValue: number, reps: number) {
    await this.firstSetEffortInput().fill(String(effortValue));
    await this.page.getByPlaceholder("reps").first().fill(String(reps));
  }

  firstSetEffortInput() {
    return this.page.getByPlaceholder("kg").first();
  }

  async save() {
    await this.page.getByRole("button", { name: "Save Workouts" }).click();
  }

  /**
   * Removes the first workout section (confirming the dialog). Deletion is
   * only persisted by the next `save()` — the form removes locally first.
   */
  async removeFirstWorkout() {
    await this.page.getByRole("button", { name: "Remove Workout" }).first().click();
    await this.page
      .getByRole("dialog")
      .getByRole("button", { name: "Remove", exact: true })
      .click();
  }
}
