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
npm run sweep -- --dry-run   # list orphaned test users (drop --dry-run to delete)
npm run test:headed     # see the browser
npm run test:ui         # Playwright's interactive UI mode
npm run report          # open the last HTML report
```

## CI

`.github/workflows/e2e.yml` runs on:

| Trigger | What runs |
|---|---|
| A deploy finishing (see below) | `@smoke` against the deployed URL, then posts an `e2e/smoke` status on the app commit |
| Push to `main`, manual dispatch | Everything (manual runs can pick `smoke`, a `base_url`, and a `report_sha` to post a status on) |
| Daily 6am UTC | Everything against production, after sweeping orphaned test users |

The URL under test is, in order: the deploy's URL, the manual `base_url` input, the `BASE_URL` repository variable, then the production URL.

### Running after every deploy

Vercel reports each deployment to GitHub. The app repo's `.github/workflows/e2e-on-deploy.yml` listens for a successful one and sends this repo a `repository_dispatch` (`app-deployed`) carrying `{ url, sha, environment }`. This repo tests that URL and posts the result back, so the deploy commit shows a ✓ or ✗ linking to the run.

- **Production** deploys are tested at the public production alias. Vercel's per-deployment URLs are behind login, and the app exposes no build id, so the run waits 20 seconds for the alias to switch over.
- **Preview** deploys are behind Vercel login too. They're tested only when `VERCEL_BYPASS_SECRET` is set (below); otherwise the run is skipped, not failed.
- The dispatched URL and SHA are validated before use (`*.vercel.app` over https, 40-character hash), since they arrive in an external payload.

### Secrets and variables

| Where | Name | Purpose |
|---|---|---|
| This repo, secret | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Create/delete test users, seed data |
| This repo, secret | `APP_STATUS_TOKEN` | Post commit statuses on the app repo (fine-grained token, *Commit statuses: write*) |
| App repo, secret | `E2E_DISPATCH_TOKEN` | Send the dispatch to this repo (fine-grained token, *Contents: write*) |
| This repo, secret (optional) | `VERCEL_BYPASS_SECRET` | Test Preview deploys. Create it in Vercel: project → Settings → Deployment Protection → *Protection Bypass for Automation*. Sent only to the app's own origin. |
| This repo, variable (optional) | `BASE_URL` | Default URL under test |
| App repo, variable (optional) | `PRODUCTION_URL` | Overrides the production alias the trigger tests |

The two tokens are fine-grained personal access tokens and expire (max one year), so renew them before then — a run that fails with a 401/403 on the dispatch or status call means one has expired.

### Test-user sweep

Throwaway users are normally deleted by each test. The daily run also calls `npm run sweep`, which deletes any that were orphaned (a crashed run, say) once they're over 2 hours old. It matches only the exact test-email shape (`e2e-<digits>-<id>@logandtrain-test.dev`, or the older `@gymlog-test.dev`), never a real account.
