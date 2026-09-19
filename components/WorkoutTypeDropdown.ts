import { Page } from "@playwright/test";

/** The searchable "Workout Type" dropdown used on the log-workout form. */
export class WorkoutTypeDropdown {
  constructor(private page: Page) {}

  /**
   * Picks a type in the first workout section that has none chosen yet, by
   * searching the list and clicking the match.
   */
  async select(type: string) {
    await this.page.getByRole("button", { name: "Select workout type" }).first().click();
    const search = this.page.getByPlaceholder("Search workout types...");
    await search.fill(type);
    // The option list is a sibling of the search box inside the open panel.
    await search
      .locator("xpath=..")
      .getByRole("button", { name: type, exact: true })
      .click();
  }
}
