import { Page } from "@playwright/test";

export class WorkoutFormPage {
  constructor(private page: Page) {}

  async gotoNew() {
    await this.page.goto("/workout/new");
  }

  async fillWorkoutType(type: string) {
    await this.page.getByLabel("Workout Type").fill(type);
  }

  async addExercise() {
    await this.page.getByRole("button", { name: "+ Add Exercise" }).click();
  }

  async fillExerciseName(index: number, name: string) {
    await this.page.getByPlaceholder(`Exercise ${index + 1} name`).fill(name);
  }

  async fillFirstSet(effortValue: number, reps: number) {
    await this.page.getByPlaceholder("kg").first().fill(String(effortValue));
    await this.page.getByPlaceholder("reps").first().fill(String(reps));
  }

  async firstSetEffortValue(): Promise<string> {
    return (await this.page.getByPlaceholder("kg").first().inputValue()) ?? "";
  }

  async submit(label: "Submit Workout" | "Save Changes") {
    await this.page.getByRole("button", { name: label }).click();
  }

  async deleteWorkout() {
    await this.page.getByRole("button", { name: "Delete Workout" }).click();
    await this.page.getByRole("button", { name: "Yes, delete" }).click();
  }
}
