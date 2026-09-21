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

  /** The Custom Programs block (present only when its feature flag is Coming soon or Live). */
  customProgramsSection() {
    return this.page.getByRole("region", { name: "Built around you." });
  }

  /** Heading above the free programs; it only exists alongside the Custom Programs block. */
  freeProgramsHeading() {
    return this.page.getByRole("heading", { level: 2, name: "Free Training Programs" });
  }

  /** Any link into the Custom Programs experience, anywhere on the page. */
  customProgramLinks() {
    return this.page.locator('a[href^="/programs/custom"]');
  }
}
