import { Page } from "@playwright/test";

export class ProgramsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/programs");
  }

  /** The list card for a program, by its id (the slug used in /programs/<id>). */
  programLink(id: string) {
    return this.page.locator(`a[href="/programs/${id}"]`);
  }
}
