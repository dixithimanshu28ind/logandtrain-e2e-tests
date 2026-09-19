import type { Page } from "@playwright/test";
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
 * Ends the session the way another browser tab would: supabase-js syncs auth
 * state across tabs over a BroadcastChannel named after its storage key, so
 * posting SIGNED_OUT there makes this tab's client see the session vanish
 * without the user having clicked Sign Out here. Relies on that supabase-js
 * internal, so if it ever changes, this is the one place to update.
 */
export async function endSessionElsewhere(page: Page): Promise<void> {
  await page.evaluate(
    (key) => new BroadcastChannel(key).postMessage({ event: "SIGNED_OUT", session: null }),
    sessionStorageKey()
  );
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

  // Supabase rate-limits auth requests per IP. A big or heavily repeated run
  // can hit that, and it says nothing about the app, so wait and retry rather
  // than fail the test.
  const maxAttempts = 8;
  for (let attempt = 1; ; attempt++) {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (!error && data.session) return data.session;

    const rateLimited = error?.status === 429 || /rate limit/i.test(error?.message ?? "");
    if (!rateLimited || attempt === maxAttempts) {
      throw new Error(`API sign-in failed for ${email}: ${error?.message}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 3000 * attempt + Math.random() * 1000));
  }
}
