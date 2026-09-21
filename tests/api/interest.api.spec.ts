// API specs don't need a browser page, so they use the lightweight API
// fixtures rather than the app fixtures (which would open a page per test).
import { test, expect } from "../../fixtures/api-fixtures";
import { deleteInterestRows, interestRowsFor } from "../../utils/seed";
import { featureState } from "../../utils/features";
import { randomTestEmail } from "../../utils/testData";

const OFFERING = "custom-training-program";

// POST /api/interest is the "Register your interest" endpoint (GYM-47). It
// exists while the `custom_programs` flag is Coming soon or Live, and is a 404
// when Off. Each test reads /api/features and runs only in the state it is
// about. Test entries use a test address, which the site saves but never emails.
test.describe("Interest API", { tag: ["@api", "@regression"] }, () => {
  test("Off: the endpoint does not exist", async ({ request }) => {
    test.skip((await featureState(request, "custom_programs")) !== "off", "custom_programs is not Off here");

    const response = await request.post("/api/interest", { data: { interest: OFFERING, email: "x@example.com" } });
    expect(response.status()).toBe(404);
  });

  test.describe("when the feature is Coming soon or Live", () => {
    test.beforeEach(async ({ request }) => {
      test.skip((await featureState(request, "custom_programs")) === "off", "custom_programs is Off here");
    });

    test("bad requests are refused and save nothing", async ({ request }) => {
      const refused = async (data: unknown, status = 400) => {
        const response = await request.post("/api/interest", { data: data as never });
        expect(response.status(), JSON.stringify(data)).toBe(status);
      };

      await refused({ interest: OFFERING, email: "nope" });
      await refused({ interest: OFFERING, email: "a@b.com,c@d.com" }); // a list is not one address
      await refused({ interest: OFFERING, email: "a@b.com\nBcc: x@y.com" });
      await refused({ interest: OFFERING });
      await refused({ interest: "something-else", email: "a@b.com" });
      await refused({ interest: OFFERING, email: "a@b.com", message: "x".repeat(1001) });
      await refused({ interest: OFFERING, email: "a@b.com", message: 42 });

      // Not JSON at all: a plain form post from another site cannot get through.
      const form = await request.post("/api/interest", { form: { email: "a@b.com" } });
      expect(form.status()).toBe(415);
    });

    test("a filled honeypot looks like success but stores nothing", async ({ request }) => {
      const email = randomTestEmail();
      try {
        const response = await request.post("/api/interest", {
          data: { interest: OFFERING, email, website: "http://spam.example" },
        });
        expect(response.status()).toBe(200);
        expect(await response.json()).toEqual({ ok: true });
        expect(await interestRowsFor(email)).toEqual([]);
      } finally {
        await deleteInterestRows(email);
      }
    });

    test("a valid entry is saved once; sending it again refreshes the comment", async ({ request }) => {
      const email = randomTestEmail();
      try {
        const first = await request.post("/api/interest", { data: { interest: OFFERING, email, message: "one" } });
        expect(first.status()).toBe(200);
        expect(await first.json()).toEqual({ ok: true });

        const second = await request.post("/api/interest", {
          data: { interest: OFFERING, email: email.toUpperCase(), message: "two" },
        });
        expect(second.status()).toBe(200);

        await expect.poll(async () => (await interestRowsFor(email)).length).toBe(1);
        const [row] = await interestRowsFor(email);
        expect(row.message).toBe("two");
        expect(row.interest).toBe(OFFERING);
        // A test address is saved but never emailed to support.
        await expect.poll(async () => (await interestRowsFor(email))[0].email_status).toBe("skipped_test");
      } finally {
        await deleteInterestRows(email);
      }
    });
  });
});
