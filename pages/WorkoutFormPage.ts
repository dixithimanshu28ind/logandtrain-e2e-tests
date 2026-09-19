import { Page } from "@playwright/test";
import { Dialog } from "../components/Dialog";
import { WorkoutTypeDropdown } from "../components/WorkoutTypeDropdown";

export class WorkoutFormPage {
  private typeDropdown: WorkoutTypeDropdown;
  private dialog: Dialog;

  constructor(private page: Page) {
    this.typeDropdown = new WorkoutTypeDropdown(page);
    this.dialog = new Dialog(page);
  }

  async gotoNew() {
    await this.page.goto("/workout/new");
  }

  async selectWorkoutType(type: string) {
    await this.typeDropdown.select(type);
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
    await this.dialog.press("Remove");
  }
}
