import type { APIRequestContext } from "@playwright/test";

// The slice of /api/programs/:id that tests rely on. Tests read expected
// values (day titles, exercise names, counts) from here instead of hard-coding
// them, so editing program content in the CMS doesn't break the suite.

export interface ProgramExercise {
  exercise: string;
  targetReps?: string;
  measurementType?: string;
  alternative?: string;
}

export interface ProgramGroup {
  workoutType?: string;
  exercises: ProgramExercise[];
}

export interface ProgramDay {
  day: number;
  title: string;
  groups?: ProgramGroup[];
}

export interface ProgramData {
  program: { id: string; name: string };
  detail: {
    safetyNote: { actionLabel: string; requireAcknowledgement: boolean };
    weekBlocks: { id: string; kind: string; title: string; days?: ProgramDay[] }[];
  };
}

/** The program these tests exercise. It has grouped days with alternatives. */
export const TEST_PROGRAM_ID = "bro-split";

export async function fetchProgram(request: APIRequestContext, id = TEST_PROGRAM_ID): Promise<ProgramData> {
  // A read-only GET, so retrying a transient network failure (ETIMEDOUT and
  // friends, which Playwright's own retry option doesn't cover) is safe.
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await request.get(`/api/programs/${id}`, { timeout: 15_000 });
      if (response.ok()) return (await response.json()) as ProgramData;
      if (response.status() < 500) throw new Error(`GET /api/programs/${id} returned ${response.status()}`);
      lastError = new Error(`GET /api/programs/${id} returned ${response.status()}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes("returned 4")) throw error;
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
  }
  throw lastError;
}

/** All days in program order, the way the log page lists them. */
export function allDays(data: ProgramData): ProgramDay[] {
  return data.detail.weekBlocks.flatMap((block) => block.days ?? []);
}

/** The day title as the app shows it, without the "Day N — " prefix. */
export function shortTitle(day: ProgramDay): string {
  return day.title.replace(/^Day \d+ — /, "");
}

/** How the log page labels a prefilled section: "Chest · 5 exercises". */
export function sectionLabel(group: ProgramGroup): string {
  const n = group.exercises.length;
  return `${group.workoutType ?? ""} · ${n} exercise${n === 1 ? "" : "s"}`;
}

export function exerciseCount(day: ProgramDay): number {
  return (day.groups ?? []).reduce((total, g) => total + g.exercises.length, 0);
}

/** First exercise of the day that offers a real alternative. */
export function firstWithAlternative(day: ProgramDay): ProgramExercise | undefined {
  for (const group of day.groups ?? []) {
    for (const ex of group.exercises) {
      if (ex.alternative && ex.alternative !== "—") return ex;
    }
  }
  return undefined;
}
