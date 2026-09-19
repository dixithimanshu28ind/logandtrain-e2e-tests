# Log & Train E2E Tests

Playwright + TypeScript end-to-end test suite for [Log & Train](https://github.com/dixithimanshu28ind/gym-workout-logger), a workout logging app ([live app](https://gym-workout-logger-ashen.vercel.app/)).

## Coverage

- **Public pages** — landing, features, how-it-works, legal, support, 404
- **Authentication** — sign up, sign in, sign out
- **Programs** — list and detail pages, checked against `/api/programs`
- **Dashboard** — seeded workouts, streak, running total
- **Workout CRUD** — log via the type dropdown, edit, remove, streak updates
- **Profile** — save and persist across a reload
- **API** — programs endpoints, and `/api/revalidate` rejecting bad secrets

## Structure

```
pages/        Page objects, one per app page
components/   Page objects for reusable UI (type dropdown, dialogs)
fixtures/     Playwright fixtures: throwaway users, API sign-in, seeding,
              console-error guard, third-party stubs
utils/        Supabase admin/session helpers, seeding, date helpers
tests/
  smoke/          Browser specs for the critical paths
  api/            HTTP-only specs (no browser page)
  known-issues/   Tests documenting known app problems (see below)
```

## Tags

Every spec carries a tag; run a slice with `--grep`.

| Tag | Meaning |
|---|---|
| `@smoke` | Critical paths. Fast; meant to gate every deploy. |
| `@api` | HTTP-only checks. |
| `@regression` | Full coverage (nightly). Empty so far. |
| `@known-issue` | Documents a current app bug; see below. |

Two Playwright projects run: `chromium` (desktop) and `mobile-chrome` (Pixel 7 viewport, `@smoke` only).

## How the framework keeps tests reliable

- **Throwaway users.** Each test gets its own Supabase user via the admin API, deleted afterwards along with any rows it owns. Tests share no state, so they run in parallel.
- **API sign-in.** `signedInPage` injects a session instead of driving the sign-in form. Sign-in through the UI is tested once, in `auth.spec.ts`.
- **API seeding.** The `seed` fixture inserts workouts directly, so a test that needs data doesn't click through the log form.
- **Console-error guard.** An automatic fixture fails any test that produces an uncaught exception, a console error, a 5xx response, or a failed request. A test that legitimately triggers one opts out of that single message with `test.use({ allowedProblems: [/regex/] })`.
- **Third-party stubs.** The chat widget's n8n webhook is stubbed in browser tests (`fixtures/third-party.ts`), so the suite tests Log & Train rather than n8n's uptime.

## Known issues

`tests/known-issues/` records app problems the suite has found, so they stay visible without keeping the deploy gate red:

- **Chat webhook returns 404** (`chat-webhook.spec.ts`). The FitSpark chat widget is broken for real users. The test uses `test.fail`, so it passes while the webhook is down and **fails once it's fixed** — the cue to delete it and the stub.
- **Sign-out destination is racy** (`sign-out-destination.spec.ts`). Sign-out should land on `/` but lands on `/signin` about 30% of the time. Skipped with `test.fixme`; enable it once the app fixes the race.

## Test data strategy

There's a single Supabase project behind Log & Train — no separate test/staging environment. To avoid polluting the real `auth.users` table, each test that needs a signed-in user gets its own **throwaway account**, created via the Supabase admin API in a fixture and deleted again after the test (`fixtures/test-fixtures.ts`). Test emails end in `@logandtrain-test.dev`.

## Setup

```bash
npm install
npx playwright install chromium
cp .env.example .env
```

Fill in `.env`:
- `BASE_URL` — defaults to `http://localhost:3000` for local runs; set to the Vercel URL to test production
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — from Supabase Dashboard → Project Settings → API. The service role key is highly privileged — never commit it (it's gitignored via `.env`).

## Running

```bash
npm test                # everything, both projects
npm run test:smoke      # @smoke only
npm run test:api        # @api only
npm run typecheck       # tsc --noEmit
npm run test:headed     # see the browser
npm run test:ui         # Playwright's interactive UI mode
npm run report          # open the last HTML report
```

## CI

`.github/workflows/e2e.yml` typechecks, then runs the suite on every push to `main`, on a daily schedule (6am UTC), and on demand via `workflow_dispatch`. The URL under test is, in order: the `base_url` input on a manual run, the `BASE_URL` repository variable, then the production URL. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as repository secrets (Settings → Secrets and variables → Actions) for it to work — the workflow can't create these itself.
