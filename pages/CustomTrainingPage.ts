import { Page } from "@playwright/test";

/** The Custom Training Program landing page (GYM-41). Public; a 404 unless `custom_programs` is Live. */
export class CustomTrainingPage {
  static readonly path = "/programs/custom/training";
  static readonly questionnairePath = "/programs/custom/training/questionnaire";

  constructor(private page: Page) {}

  async goto() {
    await this.page.goto(CustomTrainingPage.path);
  }

  heroButton() {
    return this.page.getByRole("button", { name: "Build My Program →" });
  }

  finalButton() {
    return this.page.getByRole("button", { name: "Start My Questionnaire →" });
  }

  /** Once signed in, the same two buttons are links on to the questionnaire. */
  heroLink() {
    return this.page.getByRole("link", { name: "Build My Program →" });
  }

  finalLink() {
    return this.page.getByRole("link", { name: "Start My Questionnaire →" });
  }
}
