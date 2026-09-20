import { Page } from "@playwright/test";
import { Dialog } from "../components/Dialog";
import { WorkoutTypeDropdown } from "../components/WorkoutTypeDropdown";

export type EffortTypeValue = "total_weight" | "weight_each" | "bodyweight" | "duration";

export class WorkoutFormPage {
  private typeDropdown: WorkoutTypeDropdown;
  readonly dialog: Dialog;

  constructor(private page: Page) {
    this.typeDropdown = new WorkoutTypeDropdown(page);
    this.dialog = new Dialog(page);
  }

  async gotoNew() {
    await this.page.goto("/workout/new");
  }

  /** Opens the form for a specific day (YYYY-MM-DD), as the dashboard tiles do. */
  async gotoDate(dateKey: string) {
    await this.page.goto(`/workout/new?date=${dateKey}`);
  }

  // --- workout type -------------------------------------------------------

  async selectWorkoutType(type: string) {
    await this.typeDropdown.select(type);
  }

  /** Changes a section that already has a type to a different one. */
  async changeWorkoutType(current: string, next: string) {
    await this.typeDropdown.change(current, next);
  }

  /** The types the next unset section offers, then closes the dropdown again. */
  async offeredTypes(): Promise<string[]> {
    await this.typeDropdown.open();
    const options = await this.typeDropdown.options();
    await this.page.keyboard.press("Escape");
    return options;
  }

  otherTypeInput() {
    return this.page.getByPlaceholder("e.g. Boxing, Swimming, Yoga");
  }

  // --- sections -----------------------------------------------------------

  async addWorkout() {
    await this.page.getByRole("button", { name: "+ Add Workout" }).click();
  }

  /** A collapsible section's header, by its label, e.g. "Chest · 5 exercises". */
  sectionHeader(label: string) {
    return this.page.getByRole("button", { name: label });
  }

  async openSection(label: string) {
    await this.sectionHeader(label).click();
  }

  // --- exercises and sets -------------------------------------------------

  async addExercise() {
    await this.page.getByRole("button", { name: "+ Add Exercise" }).click();
  }

  exerciseNameInput(index: number) {
    return this.page.getByPlaceholder(`Exercise ${index + 1} name`);
  }

  async fillExerciseName(index: number, name: string) {
    await this.exerciseNameInput(index).fill(name);
  }

  async fillFirstSet(effortValue: number, reps: number) {
    await this.firstSetEffortInput().fill(String(effortValue));
    await this.firstSetRepsInput().fill(String(reps));
  }

  firstSetEffortInput() {
    return this.page.getByPlaceholder("kg").first();
  }

  firstSetRepsInput() {
    return this.page.getByPlaceholder("reps").first();
  }

  firstSetDurationInput() {
    return this.page.getByPlaceholder("duration").first();
  }

  /** The measurement type dropdown of the first set (Total Weight / Bodyweight / ...). */
  firstSetTypeSelect() {
    return this.page.locator("select").first();
  }

  async setFirstSetType(type: EffortTypeValue) {
    await this.firstSetTypeSelect().selectOption(type);
  }

  // --- program prefill ----------------------------------------------------

  upNext() {
    return this.page.getByText(/^Up next:/);
  }

  async useThisWorkout() {
    await this.page.getByRole("button", { name: "Use This Workout" }).click();
  }

  async chooseAnotherProgramWorkout() {
    await this.page.getByRole("button", { name: "Choose Another Program Workout" }).click();
  }

  async logSomethingElse() {
    await this.page.getByRole("button", { name: "Log Something Else" }).click();
  }

  /** In the "Choose a program workout" picker, pick a day by its short title. */
  async pickProgramDay(shortTitle: string) {
    await this.dialog.root.getByRole("button", { name: shortTitle }).click();
  }

  targetHint(text: string) {
    return this.page.getByText(`Target: ${text}`).first();
  }

  async useAlternative() {
    await this.page.getByRole("button", { name: "Use Alternative" }).first().click();
  }

  async useOriginal() {
    await this.page.getByRole("button", { name: "Use Original" }).first().click();
  }

  resumeCard() {
    return this.page.getByText("Workout not completed");
  }

  async resumeWorkout() {
    await this.page.getByRole("button", { name: "Resume Workout" }).click();
  }

  // --- saving, leaving, removing ------------------------------------------

  async save() {
    await this.page.getByRole("button", { name: "Save Workouts" }).click();
  }

  /** Buttons in the "Some exercises aren't completed" / "No exercises completed" dialogs. */
  async stay() {
    await this.dialog.press("Stay");
  }

  async saveAndExit() {
    await this.dialog.press("Save & Exit");
  }

  async leaveWithoutSaving() {
    await this.dialog.press("Leave Without Saving");
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
