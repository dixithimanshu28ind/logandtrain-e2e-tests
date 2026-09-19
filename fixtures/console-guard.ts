import type { Page } from "@playwright/test";

/**
 * Watches a page for problems a user would never see in a screenshot but that
 * still mean something is broken: uncaught exceptions, console errors, 5xx
 * responses and failed requests. Returns the live list; the fixture asserts
 * it is empty at the end of the test.
 *
 * `allowed` patterns are matched against the message text, so a test that
 * legitimately triggers an error (e.g. a wrong-password attempt) can opt out
 * of just that one message instead of switching the guard off.
 */
export function watchPage(page: Page, allowed: RegExp[]): string[] {
  const problems: string[] = [];
  const record = (kind: string, text: string) => {
    if (allowed.some((pattern) => pattern.test(text))) return;
    problems.push(`[${kind}] ${text.slice(0, 300)}`);
  };

  page.on("pageerror", (err) => record("pageerror", err.message));

  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const url = msg.location().url;
    record("console.error", url ? `${msg.text()} (${url})` : msg.text());
  });

  page.on("response", (res) => {
    if (res.status() >= 500) record(`http ${res.status()}`, res.url());
  });

  page.on("requestfailed", (req) => {
    const reason = req.failure()?.errorText ?? "unknown";
    // Aborts are the browser cancelling its own requests (navigating away
    // mid-fetch), not a failure.
    if (reason.includes("ERR_ABORTED")) return;
    record("requestfailed", `${req.method()} ${req.url()} (${reason})`);
  });

  return problems;
}
