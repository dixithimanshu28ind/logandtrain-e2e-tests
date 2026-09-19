import { Page } from "@playwright/test";

export class DashboardPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/dashboard");
  }

  async streakDays(): Promise<number> {
    // The count sits in the <p> right above the "Current streak" caption.
    // Anchoring on the caption avoids matching the "Longest streak" card,
    // which also renders "N days".
    const text = await this.page
      .getByText("Current streak", { exact: true })
      .locator("xpath=preceding-sibling::p[1]")
      .textContent();
    return Number(text?.match(/\d+/)?.[0] ?? 0);
  }

  /** The dashboard tile for a logged day, matched by a workout type shown on it. */
  workoutCard(workoutType: string) {
    return this.page
      .locator('a[href^="/workout/new?date="]')
      .filter({ hasText: workoutType });
  }

  logNewWorkoutLink() {
    return this.page.getByRole("link", { name: "+ Log New Workout" });
  }

  async signOut() {
    await this.page.getByRole("button", { name: "Sign Out" }).click();
  }
}
