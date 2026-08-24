# GymLog E2E Smoke Tests

Playwright + TypeScript smoke test suite for [GymLog](https://github.com/dixithimanshu28ind/gym-workout-logger), a workout logging app ([live app](https://gym-workout-logger-ashen.vercel.app/)).

## Coverage

- **Landing page** — branding and both auth entry points render
- **Authentication** — sign up, sign in, sign out
- **Workout CRUD** — log a workout, confirm the streak counter updates, edit it, delete it
- **Profile** — save profile details and confirm they persist across a reload

## Structure

```
pages/        Page Object Model classes (one per app page)
fixtures/     Custom Playwright fixtures — per-test throwaway Supabase users
utils/        Test data generation + Supabase admin API helpers
tests/smoke/  The actual test specs
```

## Test data strategy

There's a single Supabase project behind GymLog — no separate test/staging environment. To avoid polluting the real `auth.users` table, each test that needs a signed-in user gets its own **throwaway account**, created via the Supabase admin API in a fixture and deleted again after the test (`fixtures/test-fixtures.ts`). This also makes tests safe to run in parallel — no shared state between them.

## Setup

```bash
npm install
npx playwright install chromium
cp .env.example .env
```

Fill in `.env`:
- `BASE_URL` — defaults to `http://localhost:3000` for local runs; set to the Vercel URL to smoke-test production
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — from Supabase Dashboard → Project Settings → API. The service role key is highly privileged — never commit it (it's gitignored via `.env`).

## Running

```bash
npm test              # headless run
npm run test:headed   # see the browser
npm run test:ui       # Playwright's interactive UI mode
npm run report        # open the last HTML report
```

## CI

`.github/workflows/e2e.yml` runs the suite against the live production URL on every push to `main`, on a daily schedule (6am UTC), and on demand via `workflow_dispatch`. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as repository secrets (Settings → Secrets and variables → Actions) for it to work — the workflow can't create these itself.
