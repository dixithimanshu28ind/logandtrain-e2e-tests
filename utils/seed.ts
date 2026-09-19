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
