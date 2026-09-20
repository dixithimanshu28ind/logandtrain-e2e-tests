import { test, expect } from "../../fixtures/api-fixtures";

const PRODUCTION = "https://www.logandtrain.com";
const APEX = "https://logandtrain.com";

// The custom domain is what real users actually type, so its DNS, certificate
// and apex redirect are part of the product. Everything else in the suite now
// runs against www, which covers the domain serving the app; this covers the
// apex, which nothing else would notice if it broke.
//
// @regression, not @smoke, on purpose: this is DNS and domain configuration,
// which a code deploy cannot break, so it should not be able to fail a deploy
// check. The nightly run catches drift.
test.describe("Production domain", { tag: "@regression" }, () => {
  test.skip(
    ({ baseURL }) => (baseURL ?? "").replace(/\/$/, "") !== PRODUCTION,
    "only meaningful when the suite is pointed at production"
  );

  test("the apex redirects to www", async ({ request }) => {
    const response = await request.get(`${APEX}/`, { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    expect(response.headers()["location"]).toBe(`${PRODUCTION}/`);
  });

  test("the apex redirect preserves the path", async ({ request }) => {
    const response = await request.get(`${APEX}/programs`, { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    expect(response.headers()["location"]).toBe(`${PRODUCTION}/programs`);
  });
});
