import { Page } from "@playwright/test";

/** The sign-in / sign-up modal opened from the landing page header and hero. */
export class AuthModal {
  constructor(private page: Page) {}

  /** Opens the modal from the header's "Sign In" button (desktop layout). */
  async openSignIn() {
    await this.page.getByRole("banner").getByRole("button", { name: "Sign In" }).click();
  }

  /** Opens the modal from the header's "Start Training" button (desktop layout). */
  async openSignUp() {
    await this.page.getByRole("banner").getByRole("button", { name: "Start Training" }).click();
  }

  async signIn(email: string, password: string) {
    const dialog = this.page.getByRole("dialog");
    await dialog.getByLabel("Email").fill(email);
    await dialog.getByLabel("Password", { exact: true }).fill(password);
    await dialog.getByRole("button", { name: "Sign In", exact: true }).click();
  }
}
