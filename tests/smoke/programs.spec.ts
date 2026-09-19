import { test, expect } from "../../fixtures/test-fixtures";

interface ProgramSummary {
  id: string;
  name: string;
}

test.describe("Programs", { tag: "@smoke" }, () => {
  // The expected programs come from the API rather than being hard-coded, so
  // editing program content in the CMS doesn't break the test — only the page
  // disagreeing with the API does.
  test("lists every published program", async ({ page, request, programsPage }) => {
    const { programs } = (await (await request.get("/api/programs")).json()) as {
      programs: ProgramSummary[];
    };
    expect(programs.length).toBeGreaterThan(0);

    await programsPage.goto();
    for (const program of programs) {
      await expect(page.getByRole("heading", { level: 2, name: program.name })).toBeVisible();
    }
  });

  test("opens a program's detail page from the list", async ({ page, request, programsPage }) => {
    const { programs } = (await (await request.get("/api/programs")).json()) as {
      programs: ProgramSummary[];
    };
    const first = programs[0];

    await programsPage.goto();
    await programsPage.programLink(first.id).click();

    await page.waitForURL(`**/programs/${first.id}`);
    await expect(page.getByRole("heading", { level: 1, name: first.name })).toBeVisible();
  });
});
