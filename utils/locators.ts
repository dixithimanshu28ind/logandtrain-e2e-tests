import type { Page } from "@playwright/test";

/**
 * The alert carrying this message. A bare `getByRole("alert")` is ambiguous:
 * Next.js keeps an empty `role="alert"` route announcer on every page, so a
 * form's error message is never the only alert.
 */
export function alertWith(page: Page, text: string) {
  return page.getByRole("alert").filter({ hasText: text });
}
