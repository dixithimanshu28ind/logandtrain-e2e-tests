import { test, expect } from "@playwright/test";

// The FitSpark chat widget (components/FitSparkChat.tsx in the app) posts to
// this n8n webhook on every page load.
const CHAT_WEBHOOK =
  "https://dixithimanshu28.app.n8n.cloud/webhook/e6e85eb0-6427-4c68-ba02-80ac9c8e069f/chat";

test.describe("Known issues", { tag: "@known-issue" }, () => {
  // KNOWN ISSUE (found 2026-09-19): the webhook answers 404, so the chat
  // widget is broken for real users and logs a CORS error on every page (the
  // 404 carries no CORS headers). Browser tests stub the webhook so this
  // doesn't fail everything else.
  //
  // `test.fail` inverts the result: this passes while the webhook is down and
  // FAILS once it's fixed, which is the cue to delete this file and the stub
  // in fixtures/third-party.ts.
  test("chat webhook accepts a request", async ({ request }) => {
    test.fail(true, "n8n chat webhook returns 404 — delete this test and the stub once fixed");

    const response = await request.post(CHAT_WEBHOOK, {
      data: { action: "loadPreviousSession", sessionId: "e2e-health-check" },
    });
    expect(response.status()).toBeLessThan(400);
  });
});
