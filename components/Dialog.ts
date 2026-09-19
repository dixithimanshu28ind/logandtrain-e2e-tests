import { Page } from "@playwright/test";

/** The app's modal (`role="dialog"`): confirm prompts, save/leave warnings, the auth modal. */
export class Dialog {
  constructor(private page: Page) {}

  get root() {
    return this.page.getByRole("dialog");
  }

  /** Clicks a button by its exact label, scoped to the open dialog. */
  async press(label: string) {
    await this.root.getByRole("button", { name: label, exact: true }).click();
  }
}
