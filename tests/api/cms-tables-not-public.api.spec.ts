import { test, expect } from "@playwright/test";

const PRODUCTION = "https://www.logandtrain.com";

// The public Supabase key is inside the website's JavaScript, so anyone can use
// it against Supabase's REST API. Every table in the database is reachable that
// way unless row-level security is on and the public roles' privileges are
// revoked (GYM-46: the CMS tables were created without either, and a stranger
// could read the admin's password hash and write to programs and flags).
//
// This test asks the database for its complete list of tables, using the
// service role the suite already holds, so a table added in future is included
// without anyone remembering to list it. For each one it then behaves like a
// stranger holding only the public key:
//
//   - reading must be refused (401/403, permission denied)
//   - a write that can match no row must be refused too
//
// The only tables allowed to answer the public key are the app's own four,
// which are protected row by row: they must never hand back a row.
//
// Writes use a value that cannot exist in the table's primary key, so even if a
// table were open the probe would change nothing.
const PROTECTED_BY_ROW_POLICY = new Set(["workouts", "exercises", "sets", "profiles"]);

type Column = { format?: string; description?: string };
type OpenApi = { paths: Record<string, unknown>; definitions: Record<string, { properties?: Record<string, Column> }> };

/** A primary-key value that cannot match any row, for the column's type. */
function neverMatching(format: string | undefined): string {
  if (format === "uuid") return "00000000-0000-0000-0000-000000000000";
  if (format && /int|numeric/.test(format)) return "-1";
  return "__e2e_no_such_row__";
}

function primaryKey(table: string, api: OpenApi): { column: string; never: string } | null {
  const properties = api.definitions[table]?.properties ?? {};
  for (const [column, meta] of Object.entries(properties)) {
    if (meta.description?.includes("Primary Key")) return { column, never: neverMatching(meta.format) };
  }
  return null;
}

// Only meaningful against the real database, and it is the same database for
// every deploy, so it runs once per production run (after each production
// deploy and in the nightly run) and is skipped on previews and local runs.
test.describe("CMS tables are not open to the public key", { tag: ["@api", "@smoke"] }, () => {
  test.skip(
    ({ baseURL }) => (baseURL ?? "").replace(/\/$/, "") !== PRODUCTION,
    "only meaningful when the suite is pointed at production"
  );
  test.setTimeout(120_000);

  test("the public key can neither read nor write any table it should not", async () => {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const publicKey = process.env.SUPABASE_ANON_KEY;
    if (!url || !serviceKey || !publicKey) {
      throw new Error("SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_ANON_KEY must all be set (see .env.example).");
    }

    // 1. Every table, as the service role sees them.
    const listing = await fetch(`${url}/rest/v1/`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } });
    expect(listing.status, "listing the tables").toBe(200);
    const api = (await listing.json()) as OpenApi;
    const tables = Object.keys(api.paths)
      .filter((path) => path !== "/" && !path.startsWith("/rpc/"))
      .map((path) => path.slice(1))
      .sort();

    // A broken listing must not let this pass by checking nothing.
    expect(tables, "the table listing found the known tables").toEqual(
      expect.arrayContaining(["users", "programs", "feature_flags", "workouts"])
    );

    // 2. What a stranger with the public key can do to each.
    const asPublic = { apikey: publicKey, Authorization: `Bearer ${publicKey}` };
    const problems: string[] = [];

    async function check(table: string) {
      const read = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, { headers: asPublic });
      const body = await read.text();

      if (PROTECTED_BY_ROW_POLICY.has(table)) {
        // Row-level security: fine to answer, never with data.
        if (read.status === 200 && body.trim() !== "[]") problems.push(`${table}: the public key can READ rows`);
        return;
      }

      if (read.status !== 401 && read.status !== 403) {
        problems.push(`${table}: READ answered ${read.status}${read.status === 200 ? ` (${body === "[]" ? "no rows, but not refused" : "ROWS RETURNED"})` : ""}`);
      }

      const pk = primaryKey(table, api);
      if (!pk) {
        problems.push(`${table}: no primary key found, so the write probe could not be built`);
        return;
      }
      const filter = `${pk.column}=eq.${pk.never}`;
      const writeHeaders = { ...asPublic, "Content-Type": "application/json", Prefer: "return=minimal" };

      const patch = await fetch(`${url}/rest/v1/${table}?${filter}`, {
        method: "PATCH",
        headers: writeHeaders,
        body: JSON.stringify({ [pk.column]: pk.never.match(/^-?\d+$/) ? Number(pk.never) : pk.never }),
      });
      if (patch.status !== 401 && patch.status !== 403) problems.push(`${table}: WRITE (update) answered ${patch.status}, not refused`);

      const del = await fetch(`${url}/rest/v1/${table}?${filter}`, { method: "DELETE", headers: writeHeaders });
      if (del.status !== 401 && del.status !== 403) problems.push(`${table}: WRITE (delete) answered ${del.status}, not refused`);
    }

    // A few at a time: about 150 requests in all.
    for (let i = 0; i < tables.length; i += 8) await Promise.all(tables.slice(i, i + 8).map(check));

    expect(
      problems,
      `${tables.length} tables checked. Every table needs row-level security ON and the public roles revoked ` +
        `(see "Database tables" in the app repo README)`
    ).toEqual([]);
  });
});
