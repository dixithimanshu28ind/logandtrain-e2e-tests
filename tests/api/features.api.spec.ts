import { test, expect } from "../../fixtures/api-fixtures";

// GET /api/features lists the features that are "Coming soon" or "Live", so
// this suite (and the mobile app) can tell what an environment is showing.
// Features that are Off are left out, so nothing unreleased is revealed.
//
// These checks hold whatever the flags happen to be set to, so they do not
// break when a feature is switched in the CMS. The per-feature tests (Off means
// its entry point is absent and its routes 404; Live means it works) belong with
// each feature, starting with Custom Programs (GYM-39): they read this endpoint
// to decide which branch to expect.
//
// @regression, not @smoke: until the app change that added the endpoint has
// shipped, the older build has no such route, and a smoke test would fail the
// deploy check for it.
test.describe("Feature flags API", { tag: ["@api", "@regression"] }, () => {
  test("GET /api/features answers with a features object", async ({ request }) => {
    const response = await request.get("/api/features");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/json");

    const body = await response.json();
    expect(Object.keys(body)).toEqual(["features"]);
    expect(typeof body.features).toBe("object");
    expect(body.features).not.toBeNull();
  });

  test("it lists only Coming soon and Live features, never Off", async ({ request }) => {
    const { features } = await (await request.get("/api/features")).json();
    for (const [key, state] of Object.entries(features)) {
      expect(["coming_soon", "live"], `state of ${key}`).toContain(state);
    }
  });

  test("it is never cached, so a switched flag is reported at once", async ({ request }) => {
    const response = await request.get("/api/features");
    expect(response.headers()["cache-control"]).toContain("no-store");
  });
});
