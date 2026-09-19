import type { BrowserContext } from "@playwright/test";

/**
 * The FitSpark chat widget talks to an n8n webhook on every page. It's a
 * third-party service we don't control, so browser tests stub it: the suite
 * then tests Log & Train, not n8n's uptime, and the console-error guard can
 * stay strict about everything else.
 *
 * The real webhook's health is checked separately (see
 * tests/known-issues/chat-webhook.spec.ts).
 */
export async function stubChatWebhook(context: BrowserContext): Promise<void> {
  const cors = {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "*",
    "access-control-allow-methods": "POST, OPTIONS",
  };

  await context.route(/n8n\.cloud\//, async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: cors });
      return;
    }
    await route.fulfill({
      status: 200,
      headers: cors,
      contentType: "application/json",
      body: JSON.stringify({ data: [] }),
    });
  });
}
