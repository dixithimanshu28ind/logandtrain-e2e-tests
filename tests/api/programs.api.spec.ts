// API specs don't need a browser page, so they use Playwright's base `test`
// rather than the app fixtures (which would open a page per test).
import { test, expect } from "@playwright/test";

test.describe("Programs API", { tag: ["@api", "@smoke"] }, () => {
  test("GET /api/programs returns the published programs", async ({ request }) => {
    const response = await request.get("/api/programs");
    expect(response.status()).toBe(200);

    const { programs } = await response.json();
    expect(programs.length).toBeGreaterThan(0);
    for (const program of programs) {
      expect(program).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        durationWeeks: expect.any(Number),
        daysPerWeek: expect.any(Number),
      });
    }
  });

  test("GET /api/programs/:id returns a single program", async ({ request }) => {
    const { programs } = await (await request.get("/api/programs")).json();
    const response = await request.get(`/api/programs/${programs[0].id}`);
    expect(response.status()).toBe(200);
    expect(await response.json()).toHaveProperty("program.name", programs[0].name);
  });

  test("GET /api/programs/:id returns 404 for an unknown program", async ({ request }) => {
    const response = await request.get("/api/programs/no-such-program");
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({ error: "Program not found" });
  });
});

test.describe("Revalidate API", { tag: ["@api", "@smoke"] }, () => {
  test("POST without the secret is rejected", async ({ request }) => {
    const response = await request.post("/api/revalidate");
    expect(response.status()).toBe(401);
  });

  test("POST with a wrong secret is rejected", async ({ request }) => {
    const response = await request.post("/api/revalidate", {
      headers: { "x-revalidate-secret": "definitely-not-the-secret" },
    });
    expect(response.status()).toBe(401);
  });
});
