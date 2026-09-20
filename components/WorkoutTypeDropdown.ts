import { Page } from "@playwright/test";

/** The searchable "Workout Type" dropdown used on the log-workout form. */
export class WorkoutTypeDropdown {
  constructor(private page: Page) {}

  /**
   * Picks a type in the first workout section that has none chosen yet, by
   * searching the list and clicking the match.
   */
  async select(type: string) {
    await this.open();
    const search = this.page.getByPlaceholder("Search workout types...");
    await search.fill(type);
    await this.panel().getByRole("button", { name: type, exact: true }).click();
  }

  /** Changes a section that already has a type (its button shows the current type) to another. */
  async change(current: string, next: string) {
    await this.page.getByRole("button", { name: current, exact: true }).click();
    await this.page.getByPlaceholder("Search workout types...").fill(next);
    await this.panel().getByRole("button", { name: next, exact: true }).click();
  }

  /** Opens the dropdown of the first section that has no type chosen yet. */
  async open() {
    await this.page.getByRole("button", { name: "Select workout type" }).first().click();
  }

  /** Every type the open dropdown offers (a section's allowed types depend on its siblings). */
  async options(): Promise<string[]> {
    const names = await this.panel().getByRole("button").allInnerTexts();
    return names.map((n) => n.trim());
  }

  /** The open panel: a sibling of the search box, which holds the option buttons. */
  private panel() {
    return this.page.getByPlaceholder("Search workout types...").locator("xpath=..");
  }
}
