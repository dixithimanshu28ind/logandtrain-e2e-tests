import { getAdminClient } from "./supabaseAdmin";

export type SeedEffortType = "total_weight" | "weight_each" | "bodyweight" | "duration";

export interface SeedSet {
  effortType?: SeedEffortType;
  effortValue: number;
  reps: number;
}

export interface SeedExercise {
  name: string;
  sets: SeedSet[];
}

export interface SeedWorkout {
  /** YYYY-MM-DD */
  date: string;
  workoutType: string;
  exercises?: SeedExercise[];
}

/**
 * Inserts a workout straight through the admin API (bypassing RLS), so tests
 * can set up state without clicking through the log form. Returns its id.
 */
export async function seedWorkout(userId: string, workout: SeedWorkout): Promise<string> {
  const admin = getAdminClient();

  const { data: row, error } = await admin
    .from("workouts")
    .insert({
      user_id: userId,
      date: workout.date,
      workout_type: workout.workoutType,
      workout_type_custom: null,
      program_id: null,
      program_day_key: null,
    })
    .select("id")
    .single();
  if (error || !row) throw new Error(`Failed to seed workout: ${error?.message}`);

  for (const exercise of workout.exercises ?? []) {
    const { data: ex, error: exError } = await admin
      .from("exercises")
      .insert({ workout_id: row.id, name: exercise.name, prescribed_index: null })
      .select("id")
      .single();
    if (exError || !ex) throw new Error(`Failed to seed exercise: ${exError?.message}`);

    const { error: setsError } = await admin.from("sets").insert(
      exercise.sets.map((s) => ({
        exercise_id: ex.id,
        effort_type: s.effortType ?? "total_weight",
        effort_value: s.effortValue,
        reps: s.reps,
        duration_unit: null,
      }))
    );
    if (setsError) throw new Error(`Failed to seed sets: ${setsError.message}`);
  }

  return row.id;
}

/**
 * Deletes everything a test user owns, children first. Done explicitly so a
 * throwaway account never leaves rows behind, whether or not the schema
 * cascades from auth.users.
 */
export async function purgeUserData(userId: string): Promise<void> {
  const admin = getAdminClient();

  const { data: workouts } = await admin.from("workouts").select("id").eq("user_id", userId);
  const workoutIds = (workouts ?? []).map((w) => w.id);

  if (workoutIds.length > 0) {
    const { data: exercises } = await admin
      .from("exercises")
      .select("id")
      .in("workout_id", workoutIds);
    const exerciseIds = (exercises ?? []).map((e) => e.id);

    if (exerciseIds.length > 0) {
      await admin.from("sets").delete().in("exercise_id", exerciseIds);
      await admin.from("exercises").delete().in("id", exerciseIds);
    }
    await admin.from("workouts").delete().in("id", workoutIds);
  }

  await admin.from("profiles").delete().eq("user_id", userId);
}

/**
 * Deletes an account created through the UI (e.g. by signing up), plus
 * everything it owns. `deleteTestUserByEmail` alone would leave the rows behind.
 */
export async function deleteUserAndData(email: string): Promise<string | null> {
  const admin = getAdminClient();
  const perPage = 200;
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Failed to list users: ${error.message}`);
    const match = data.users.find((u) => u.email === email);
    if (match) {
      await purgeUserData(match.id);
      const { error: deleteError } = await admin.auth.admin.deleteUser(match.id);
      if (deleteError) throw new Error(`Failed to delete ${email}: ${deleteError.message}`);
      return match.id;
    }
    if (data.users.length < perPage) return null;
  }
}

/** The id of the user with this email, or null. */
export async function findUserIdByEmail(email: string): Promise<string | null> {
  const admin = getAdminClient();
  const perPage = 200;
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Failed to list users: ${error.message}`);
    const match = data.users.find((u) => u.email === email);
    if (match) return match.id;
    if (data.users.length < perPage) return null;
  }
}

/** Puts a user on a program directly, without going through the consent flow. */
export async function selectProgramFor(userId: string, programId: string): Promise<void> {
  const { error } = await getAdminClient()
    .from("profiles")
    .upsert({ user_id: userId, selected_program_id: programId }, { onConflict: "user_id" });
  if (error) throw new Error(`Failed to select program: ${error.message}`);
}

/** The program a user is on according to the database, or null. */
export async function selectedProgramOf(userId: string): Promise<string | null> {
  const { data, error } = await getAdminClient()
    .from("profiles")
    .select("selected_program_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Failed to read profile: ${error.message}`);
  return data?.selected_program_id ?? null;
}

/** Workouts stored for a user, newest first, with how many exercises each has. */
export async function workoutsOf(
  userId: string
): Promise<{ date: string; workout_type: string; workout_type_custom: string | null; exercises: number }[]> {
  const { data, error } = await getAdminClient()
    .from("workouts")
    .select("date, workout_type, workout_type_custom, exercises(id)")
    .eq("user_id", userId)
    .order("date", { ascending: false });
  if (error) throw new Error(`Failed to read workouts: ${error.message}`);
  return (data ?? []).map((w) => ({
    date: w.date,
    workout_type: w.workout_type,
    workout_type_custom: w.workout_type_custom,
    exercises: Array.isArray(w.exercises) ? w.exercises.length : 0,
  }));
}
