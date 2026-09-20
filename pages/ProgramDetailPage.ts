import { Page } from "@playwright/test";
import { Dialog } from "../components/Dialog";

/** A program's detail page, including its consent ("Before you start") card. */
export class ProgramDetailPage {
  private dialog: Dialog;

  constructor(private page: Page, private actionLabel: string) {
    this.dialog = new Dialog(page);
  }

  async goto(programId: string) {
    await this.page.goto(`/programs/${programId}`);
  }

  consentCheckbox() {
    return this.page.getByRole("checkbox", { name: /I understand and will exercise/ });
  }

  /**
   * The card's start button, e.g. "Select & Start". Exact match, because the
   * header repeats it as "Select & Start ↓" (a scroll link).
   */
  startButton() {
    return this.page.getByRole("button", { name: this.actionLabel, exact: true });
  }

  /** Once selected, the same button reads "Current Program" and is disabled. */
  currentProgramButton() {
    return this.page.getByRole("button", { name: "Current Program", exact: true });
  }

  leaveButton() {
    return this.page.getByRole("button", { name: "Leave Program", exact: true });
  }

  selectedMessage(programName: string) {
    return this.page.getByText(`You're on the ${programName} program.`);
  }

  async confirmLeave() {
    await this.dialog.press("Yes, Leave Program");
  }

  async cancelLeave() {
    await this.dialog.press("No");
  }
}
