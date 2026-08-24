import { Page } from "@playwright/test";

export class AuthPage {
  constructor(private page: Page) {}

  async goto(mode: "signin" | "signup") {
    await this.page.goto(`/${mode}`);
  }

  async signIn(email: string, password: string) {
    await this.page.getByLabel("Email").fill(email);
    await this.page.getByLabel("Password").fill(password);
    await this.page.getByRole("button", { name: "Sign In" }).click();
  }

  async signUp(email: string, password: string) {
    await this.page.getByLabel("Email").fill(email);
    await this.page.getByLabel("Password").fill(password);
    await this.page.getByRole("button", { name: "Sign Up" }).click();
  }
}
