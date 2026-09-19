import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { randomTestEmail, TEST_PASSWORD } from "./testData";

export interface TestUser {
  id: string;
  email: string;
  password: string;
}

let cachedClient: SupabaseClient | null = null;

// Lazily created so specs that never touch the admin API (e.g. the landing
// page smoke test) don't need SUPABASE_SERVICE_ROLE_KEY set just to load.
export function getAdminClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (see .env.example) " +
        "to create or clean up test users."
    );
  }

  cachedClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cachedClient;
}

export async function createTestUser(): Promise<TestUser> {
  const admin = getAdminClient();
  const email = randomTestEmail();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
  });

  if (error || !data.user) {
    throw new Error(`Failed to create test user: ${error?.message}`);
  }

  return { id: data.user.id, email, password: TEST_PASSWORD };
}

export async function deleteTestUser(userId: string): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    throw new Error(`Failed to delete test user ${userId}: ${error.message}`);
  }
}

export async function deleteTestUserByEmail(email: string): Promise<void> {
  const admin = getAdminClient();
  const perPage = 200;
  let page = 1;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Failed to list users: ${error.message}`);

    const match = data.users.find((u) => u.email === email);
    if (match) {
      await deleteTestUser(match.id);
      return;
    }

    if (data.users.length < perPage) return;
    page++;
  }
}
