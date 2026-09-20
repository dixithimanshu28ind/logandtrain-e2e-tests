# Log & Train E2E Tests

Playwright + TypeScript end-to-end test suite for [Log & Train](https://github.com/dixithimanshu28ind/gym-workout-logger), a workout logging app ([live app](https://gym-workout-logger-ashen.vercel.app/)).

## Coverage

The `@smoke` set covers the critical paths and gates every PR preview and deploy. Everything marked `@regression` is deeper and runs nightly.

**Smoke**
- **Public pages** — landing, features, how-it-works, legal, support, 404
- **Authentication** — sign up, sign in, sign out
- **Programs** — list and detail pages, checked against `/api/programs`
- **Dashboard** — seeded workouts, streak, running total
- **Workout CRUD** — log via the type dropdown, edit, remove, streak updates
- **Profile** — save and persist across a reload
- **API** — programs endpoints, and `/api/revalidate` rejecting bad secrets

**Regression**
- **Sign-out destination** — lands on the homepage from every page, on slow networks, and after the unsaved-changes dialog; visitors who didn't choose to sign out still go to `/signin`
- **Program selection** — the consent checkbox gates joining, joining is saved, leaving asks first, the consent stays checked on revisit, the dashboard and profile show the program, and joining while signed out goes through sign-up
- **Logging a program workout** — the recommended day and prefill, prescribed exercises and targets, swapping to an alternative, the partial-completion and nothing-completed dialogs, resuming a part-done day, "Log Something Else", and choosing another day
- **Logging edge cases** — several workouts on one day, the Rest Day rules, custom "Other" types, the unsaved-changes guard on in-app navigation, and the measurement types (weight, bodyweight, duration)
- **Dashboard** — the current-streak rules (including the unlogged-today leniency and a broken streak), the 7-day threshold for the longest-streak card, the empty states, and week navigation
- **Auth** — wrong password and unknown email, form validation, the sign-in/sign-up links, forgot-password, and the modal
- **Profile** — decimals and trimming, clearing a field, and the sidebar showing the saved name
- **CMS admin** — the login page, and the user list not being readable anonymously

Expected values for program content (day titles, exercise names, counts) are read from `/api/programs` at run time, so editing programs in the CMS doesn't break tests.

## Structure

```
pages/        Page objects, one per app page
components/   Page objects for reusable UI (type dropdown, dialogs)
fixtures/     Playwright fixtures: throwaway users, API sign-in, seeding,
              console-error guard, Vercel protection bypass
utils/        Supabase admin/session helpers, seeding, date and network helpers
tests/
  smoke/          Browser specs for the critical paths
  regression/     Deeper browser specs, run nightly
  api/            HTTP-only specs (no browser page)
```

## Tags

Every spec carries a tag; run a slice with `--grep`.

| Tag | Meaning |
|---|---|
| `@smoke` | Critical paths. Fast; meant to gate every deploy. |
| `@api` | HTTP-only checks. |
| `@regression` | Deeper coverage: more scenarios, slow-network runs. Runs nightly, not on every deploy. |
| `@known-issue` | Documents a current app bug (none right now); see below. |

Two Playwright projects run: `chromium` (desktop) and `mobile-chrome` (Pixel 7 viewport, `@smoke` only).

## How the framework keeps tests reliable

- **Throwaway users.** Each test gets its own Supabase user via the admin API, deleted afterwards along with any rows it owns. Tests share no state, so they run in parallel.
- **API sign-in.** `signedInPage` injects a session instead of driving the sign-in form. Sign-in through the UI is tested once, in `auth.spec.ts`.
- **API seeding.** The `seed` fixture inserts workouts directly, so a test that needs data doesn't click through the log form.
- **Console-error guard.** An automatic fixture fails any test that produces an uncaught exception, a console error, a 5xx response, or a failed request. A test that legitimately triggers one opts out of that single message with `test.use({ allowedProblems: [/regex/] })`.
- **Timeouts and retries on setup calls.** `signInViaApi` gives each attempt a 20 s timeout and retries on a Supabase rate limit (429) or a transient network failure, and `fetchProgram` retries transient failures on its read-only GET. Navigations time out at 45 s. A stalled connection now fails fast with its own error instead of hanging until the test times out.
- **Ambiguous alerts.** Next.js keeps an empty `role="alert"` route announcer on every page, so a bare `getByRole("alert")` matches two elements. Use `alertWith(page, text)` (`utils/locators.ts`).
- **Throttled runs.** `throttleNetwork` (`utils/network.ts`) slows the network at the moment of the action under test. It waits for the page to go idle first; changing the emulated conditions mid-request aborts in-flight requests with `ERR_NETWORK_CHANGED`, which the guard would rightly report.

## Running heavily from one machine

Supabase Auth rate-limits sign-ins per IP (about 100 in a few minutes), and Vercel's firewall can start **challenging** an IP that sends a lot of traffic to the site: plain requests get `403` with an `x-vercel-mitigated: challenge` header, and browsers see `ERR_TIMED_OUT`. Both are temporary and say nothing about the app. Normal runs, and CI (each run from a fresh GitHub runner), stay well under both. If you're repeating the suite many times locally (`--repeat-each`), keep the worker count low, run subsets, and wait a few minutes if failures suddenly turn into 403s or timeouts.

## Known issues

None right now. Both problems this suite found early on (the chat widget's dead webhook, GYM-36, and sign-out landing on `/signin` about a third of the time, GYM-37) were fixed in the app, and their known-issue tests and the chat stub were removed. The sign-out fix is now covered by `tests/regression/sign-out.spec.ts`.

When the suite finds a bug that can't be fixed straight away, record it under `tests/known-issues/` and tag it `@known-issue`, so it stays visible without keeping the deploy gate red. Use `test.fixme` for something that fails intermittently, or `test.fail` for something that fails consistently: it passes while the bug exists and fails once it's fixed, which is the cue to delete it.

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

- **Production** deploys are tested at the public production alias, because Vercel's per-deployment URLs are behind login.
- **Preview** deploys are behind Vercel login too. They're tested only when `VERCEL_BYPASS_SECRET` is set (below); otherwise the run is skipped, not failed.
- **Waiting for the right build.** The URL can lag the deploy event, and testing the previous build would report a pass for a commit it never saw. So before any test runs, `scripts/wait-for-deploy.sh` polls the app's `GET /api/version` until it reports the commit under test (up to 3 minutes; the bypass secret is sent only to `*.vercel.app` hosts). Outcomes:
  - **Reports the commit:** the tests run.
  - **Never does:** the run stops without running any tests, and the commit gets an `error` status saying "Deployment never served this commit; no tests ran", not a misleading test failure.
  - **A build with no `/api/version`** (an older branch, or a deploy made without git metadata): let through after a 45 s grace period with a notice, since it can't be verified. The grace period is there because the first deploy that *adds* the endpoint is served by the old build (404) until the URL switches.
  - A manual run with `report_sha` set gets the same wait, meaning "this URL should be serving that commit".
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

**Setting a token secret.** `gh secret set NAME` only prompts for the value in a real interactive terminal. Run non-interactively (e.g. through an agent's shell), it silently stores an **empty** secret, and the workflow's gate then fails with "is missing or empty". To avoid that, copy the token to the clipboard and pipe it in, so it never appears in the command or its output:

```bash
pbpaste | gh secret set APP_STATUS_TOKEN -R dixithimanshu28ind/logandtrain-e2e-tests
pbpaste | gh secret set E2E_DISPATCH_TOKEN -R dixithimanshu28ind/gym-workout-logger
```

### Test-user sweep

Throwaway users are normally deleted by each test. The daily run also calls `npm run sweep`, which deletes any that were orphaned (a crashed run, say) once they're over 2 hours old. It matches only the exact test-email shape (`e2e-<digits>-<id>@logandtrain-test.dev`, or the older `@gymlog-test.dev`), never a real account.
