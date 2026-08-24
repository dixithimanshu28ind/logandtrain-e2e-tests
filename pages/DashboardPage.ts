import { Page } from "@playwright/test";

export class DashboardPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/dashboard");
  }

  async streakDays(): Promise<number> {
    const text = await this.page
      .locator("text=/\\d+ days?/")
      .first()
      .textContent();
    return Number(text?.match(/\d+/)?.[0] ?? 0);
  }

  workoutCard(workoutType: string) {
    return this.page.getByRole("link").filter({ hasText: workoutType });
  }

  logNewWorkoutLink() {
    return this.page.getByRole("link", { name: "+ Log New Workout" });
  }

  async signOut() {
    await this.page.getByRole("button", { name: "Sign Out" }).click();
  }
}
