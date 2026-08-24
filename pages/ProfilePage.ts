import { Page } from "@playwright/test";

export type GymExperience = "rookie" | "intermediate" | "expert";

export interface ProfileDetails {
  name: string;
  age: number;
  weightKg: number;
  targetWeightKg: number;
  gymExperience: GymExperience;
}

export class ProfilePage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/profile");
  }

  async fill(details: ProfileDetails) {
    await this.page.getByLabel("Name").fill(details.name);
    await this.page.getByLabel("Age").fill(String(details.age));
    await this.page
      .getByLabel("Weight (kg)", { exact: true })
      .fill(String(details.weightKg));
    await this.page
      .getByLabel("Target Weight (kg)")
      .fill(String(details.targetWeightKg));
    await this.page.getByLabel("Gym Experience").selectOption(details.gymExperience);
  }

  async save() {
    await this.page.getByRole("button", { name: "Save Profile" }).click();
  }
}
