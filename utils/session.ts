import { createClient, Session } from "@supabase/supabase-js";

function supabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (see .env.example).");
  }
  return { url, key };
}

/**
 * Where supabase-js keeps the session in the browser: `sb-<project-ref>-auth-token`
 * in localStorage. The app builds a default client, so it uses this default key.
 */
export function sessionStorageKey(): string {
  const { url } = supabaseConfig();
  return `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
}

/**
 * Signs a user in over the API and returns the session, so a test can start
 * already authenticated instead of driving the sign-in form. UI sign-in is
 * covered once, in the auth spec.
 */
export async function signInViaApi(email: string, password: string): Promise<Session> {
  const { url, key } = supabaseConfig();
  // A throwaway client: signing in on the shared admin client would replace
  // its service-role identity with the user's.
  const client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(`API sign-in failed for ${email}: ${error?.message}`);
  }
  return data.session;
}
