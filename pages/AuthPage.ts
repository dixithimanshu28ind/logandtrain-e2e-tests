import { Page } from "@playwright/test";

export class AuthPage {
  constructor(private page: Page) {}

  async goto(mode: "signin" | "signup") {
    await this.page.goto(`/${mode}`);
  }

  async signIn(email: string, password: string) {
    await this.page.getByLabel("Email").fill(email);
    await this.page.getByLabel("Password", { exact: true }).fill(password);
    await this.page.getByRole("button", { name: "Sign In" }).click();
  }

  async signUp(email: string, password: string) {
    await this.page.getByLabel("Email").fill(email);
    // exact: true — "Password" is a substring of "Confirm Password".
    await this.page.getByLabel("Password", { exact: true }).fill(password);
    await this.page.getByLabel("Confirm Password").fill(password);
    await this.page.getByRole("button", { name: "Create Account" }).click();
  }
}
