import { test, expect } from "../../fixtures/test-fixtures";
import { featureState } from "../../utils/features";

interface ProgramSummary {
  id: string;
  name: string;
}

// The Custom Programs entry on the Programs page is controlled by the
// `custom_programs` feature flag (GYM-40), so what the page should show depends
// on what the environment has set. Each test reads /api/features, runs only
// when its state is the one in force, and is skipped otherwise. Production is
// Off today, so the Off tests run there; the others run against a preview or
// local build with FEATURE_FLAGS_OVERRIDE set, or once the flag is switched in
// the CMS.
//
// @regression: whichever state is in force, a flag change is a CMS edit, not a
// deploy, so the nightly run is what notices a page that no longer matches.
test.describe("Programs page: Custom Programs entry", { tag: "@regression" }, () => {
  const freePrograms = async (request: Parameters<typeof featureState>[0]) => {
    const { programs } = (await (await request.get("/api/programs")).json()) as { programs: ProgramSummary[] };
    expect(programs.length).toBeGreaterThan(0);
    return programs;
  };

  test("Off: the page has nothing about Custom Programs", async ({ page, request, programsPage }) => {
    test.skip((await featureState(request, "custom_programs")) !== "off", "custom_programs is not Off here");
    const programs = await freePrograms(request);

    await programsPage.goto();
    // Wait for the list first, so the absences below are not just a page still loading.
    await expect(page.getByRole("heading", { level: 2, name: programs[0].name })).toBeVisible();

    await expect(programsPage.customProgramsSection()).toHaveCount(0);
    await expect(programsPage.freeProgramsHeading()).toHaveCount(0);
    await expect(programsPage.customProgramLinks()).toHaveCount(0);
    await expect(page.getByText("CUSTOM PROGRAMS", { exact: true })).toHaveCount(0);
    await expect(page.getByText("₹")).toHaveCount(0);
    for (const program of programs) {
      await expect(page.getByRole("heading", { level: 2, name: program.name })).toBeVisible();
    }
  });

  test("Off: signed in, the page is the same", async ({ signedInPage: page, request, programsPage }) => {
    test.skip((await featureState(request, "custom_programs")) !== "off", "custom_programs is not Off here");
    const programs = await freePrograms(request);

    await programsPage.goto();
    await expect(page.getByRole("heading", { level: 2, name: programs[0].name })).toBeVisible();
    await expect(programsPage.customProgramsSection()).toHaveCount(0);
    await expect(programsPage.freeProgramsHeading()).toHaveCount(0);
  });

  test("Coming soon: no prices; Training leads to Register interest, Diet is only a teaser", async ({
    page,
    request,
    programsPage,
  }) => {
    test.skip(
      (await featureState(request, "custom_programs")) !== "coming_soon",
      "custom_programs is not Coming soon here"
    );
    const programs = await freePrograms(request);

    await programsPage.goto();
    const section = programsPage.customProgramsSection();
    await expect(section).toBeVisible();
    await expect(section.getByText("CUSTOM PROGRAMS", { exact: true })).toBeVisible();
    await expect(section.getByRole("heading", { level: 3, name: "Training Program" })).toBeVisible();
    await expect(section.getByRole("heading", { level: 3, name: "Training + Diet Program" })).toBeVisible();

    // Both options say Coming soon and neither shows a price.
    await expect(section.getByText("Coming soon", { exact: true })).toHaveCount(2);
    await expect(section.getByText("₹")).toHaveCount(0);
    await expect(section.getByRole("button")).toHaveCount(0);

    // Training has its landing page (GYM-41), where the interest form lives, so
    // it leads there. Diet has none yet (GYM-45), so it offers nothing to click.
    const training = section.getByRole("article").filter({ has: page.getByRole("heading", { level: 3, name: "Training Program", exact: true }) });
    await expect(training.getByText("Coming soon", { exact: true })).toBeVisible();
    await expect(training.getByRole("link", { name: "Register interest →" })).toHaveAttribute(
      "href",
      "/programs/custom/training"
    );
    await expect(section.getByRole("link")).toHaveCount(1);
    await expect(programsPage.customProgramLinks()).toHaveCount(1);

    // The free programs sit underneath, with their heading.
    await expect(programsPage.freeProgramsHeading()).toBeVisible();
    await expect(page.getByText("Choose a program and start training right away.")).toBeVisible();
    for (const program of programs) {
      await expect(page.getByRole("heading", { level: 2, name: program.name })).toBeVisible();
    }
  });

  test("Live: Training has a price and a button; Training + Diet stays Coming soon until its page exists", async ({
    page,
    request,
    programsPage,
  }) => {
    test.skip((await featureState(request, "custom_programs")) !== "live", "custom_programs is not Live here");
    const programs = await freePrograms(request);

    await programsPage.goto();
    const section = programsPage.customProgramsSection();
    await expect(section).toBeVisible();
    await expect(section.getByText("CUSTOM PROGRAMS", { exact: true })).toBeVisible();

    await expect(section.getByRole("heading", { level: 3, name: "Training Program" })).toBeVisible();
    await expect(section.getByText("₹299 · One-time")).toBeVisible();
    await expect(section.getByRole("link", { name: "Get My Training Program →" })).toHaveAttribute(
      "href",
      "/programs/custom/training"
    );

    // The Diet option has no landing page yet (its own card and flag, GYM-45), so
    // even with the flag Live it is a teaser: no price, and nothing to click. A
    // link to a page that is not there would make every visitor's browser
    // request a 404.
    await expect(section.getByRole("heading", { level: 3, name: "Training + Diet Program" })).toBeVisible();
    await expect(section.getByText("Coming soon", { exact: true })).toHaveCount(1);
    await expect(section.getByText("₹499")).toHaveCount(0);
    await expect(section.getByRole("link")).toHaveCount(1);
    await expect(section.getByRole("link", { name: /Diet/ })).toHaveCount(0);

    await expect(programsPage.freeProgramsHeading()).toBeVisible();
    for (const program of programs) {
      await expect(page.getByRole("heading", { level: 2, name: program.name })).toBeVisible();
    }
  });

  test("Coming soon or Live: the block also shows inside the signed-in app", async ({
    signedInPage: page,
    request,
    programsPage,
  }) => {
    const state = await featureState(request, "custom_programs");
    test.skip(state === "off", "custom_programs is Off here");
    const programs = await freePrograms(request);

    await programsPage.goto();
    await expect(programsPage.customProgramsSection()).toBeVisible();
    await expect(programsPage.freeProgramsHeading()).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: programs[0].name })).toBeVisible();
  });
});
