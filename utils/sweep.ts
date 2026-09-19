import { getAdminClient } from "./supabaseAdmin";
import { purgeUserData } from "./seed";

/**
 * Exactly the shape `randomTestEmail()` produces, for the current and the
 * pre-rename domain. Deliberately strict: the sweeper deletes real auth users
 * in the production project, so it must never match a genuine account.
 */
const TEST_EMAIL = /^e2e-\d{10,}-[a-z0-9]+@(logandtrain|gymlog)-test\.dev$/;

export interface SweepResult {
  scanned: number;
  matched: { id: string; email: string; createdAt: string }[];
  deleted: number;
}

/**
 * Deletes throwaway test users (and everything they own) that are older than
 * `olderThanHours`. The age floor protects users belonging to a run that is
 * still in progress. With `dryRun`, only reports what it would delete.
 */
export async function sweepTestUsers(opts: {
  olderThanHours: number;
  dryRun: boolean;
}): Promise<SweepResult> {
  const admin = getAdminClient();
  const cutoff = Date.now() - opts.olderThanHours * 60 * 60 * 1000;

  const users = [];
  const perPage = 200;
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Failed to list users: ${error.message}`);
    users.push(...data.users);
    if (data.users.length < perPage) break;
  }

  const matched = users
    .filter((u) => u.email && TEST_EMAIL.test(u.email) && Date.parse(u.created_at) < cutoff)
    .map((u) => ({ id: u.id, email: u.email!, createdAt: u.created_at }));

  let deleted = 0;
  if (!opts.dryRun) {
    for (const user of matched) {
      await purgeUserData(user.id);
      const { error } = await admin.auth.admin.deleteUser(user.id);
      if (error) throw new Error(`Failed to delete ${user.email}: ${error.message}`);
      deleted++;
    }
  }

  return { scanned: users.length, matched, deleted };
}
