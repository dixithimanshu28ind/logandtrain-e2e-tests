#!/usr/bin/env bash
# Waits until a deployment is serving a specific commit, by polling the app's
# GET /api/version until it reports EXPECTED_SHA. This replaces guessing with a
# fixed sleep: if the URL is still on the previous build, tests would run
# against it and report a pass for a commit they never saw.
#
# Inputs (environment):
#   BASE_URL              the deployment to check (required)
#   EXPECTED_SHA          the commit it should be serving (required)
#   VERCEL_BYPASS_SECRET  sent, to *.vercel.app hosts only, so protected previews can be polled
#   WAIT_TIMEOUT          give up after this many seconds (default 180)
#   WAIT_NOENDPOINT_AFTER treat "no /api/version" as final after this many seconds of 404s (default 45)
#   WAIT_INTERVAL         seconds between polls (default 5)
#   GITHUB_OUTPUT         where `result=` is written (optional)
#
# Result (written to GITHUB_OUTPUT as `result`), with the exit code:
#   ok           the deployment reports EXPECTED_SHA                        exit 0
#   noendpoint   this build can't be verified (see below); carry on         exit 0
#   timeout      never reported EXPECTED_SHA in time; do NOT run the tests  exit 1
#
# "noendpoint" covers a build with no /api/version (only 404s), or one that
# answers but has no commit to report (a deploy made without git metadata).
# For the first deploy that adds the endpoint, the old build answers 404 until
# the URL switches, so 404s only count as "no endpoint" after a grace period.

set -u

: "${BASE_URL:?BASE_URL is required}"
: "${EXPECTED_SHA:?EXPECTED_SHA is required}"
TIMEOUT="${WAIT_TIMEOUT:-180}"
NOENDPOINT_AFTER="${WAIT_NOENDPOINT_AFTER:-45}"
INTERVAL="${WAIT_INTERVAL:-5}"
OUT="${GITHUB_OUTPUT:-/dev/null}"

url="${BASE_URL%/}/api/version"

# The bypass secret goes only to Vercel hosts, never to an arbitrary URL.
headers=()
if [ -n "${VERCEL_BYPASS_SECRET:-}" ] && [[ "$BASE_URL" =~ ^https://[A-Za-z0-9.-]+\.vercel\.app/?$ ]]; then
  headers=(-H "x-vercel-protection-bypass: ${VERCEL_BYPASS_SECRET}")
fi

finish() { echo "result=$1" >> "$OUT"; }

start=$SECONDS
seen_version=false
last_seen=""
code="000"

while true; do
  # ${headers[@]+...} keeps an empty array safe under `set -u` on older bash.
  response=$(curl -s -m 10 -w $'\n%{http_code}' ${headers[@]+"${headers[@]}"} "$url" 2>/dev/null) || response=$'\n000'
  code="${response##*$'\n'}"
  body="${response%$'\n'*}"
  elapsed=$((SECONDS - start))

  if [ "$code" = "200" ]; then
    if printf '%s' "$body" | jq -e 'has("sha")' >/dev/null 2>&1; then
      sha=$(printf '%s' "$body" | jq -r '.sha // empty')
      if [ -z "$sha" ]; then
        echo "::notice::$url has no commit to report (deployed without git metadata), so the commit can't be verified."
        finish noendpoint
        exit 0
      fi
      seen_version=true
      last_seen="$sha"
      if [ "$sha" = "$EXPECTED_SHA" ]; then
        echo "Deployment is serving ${EXPECTED_SHA:0:7} (took ${elapsed}s)."
        finish ok
        exit 0
      fi
    fi
  fi

  if ! $seen_version && [ "$code" = "404" ] && [ "$elapsed" -ge "$NOENDPOINT_AFTER" ]; then
    echo "::notice::$url answered 404 for ${elapsed}s, so this build has no /api/version. Not verifying the commit."
    finish noendpoint
    exit 0
  fi

  if [ "$elapsed" -ge "$TIMEOUT" ]; then
    seen="${last_seen:0:7}"
    echo "::error::The deployment did not serve ${EXPECTED_SHA:0:7} within ${TIMEOUT}s (last HTTP status ${code}, last commit seen: ${seen:-none})."
    finish timeout
    exit 1
  fi

  sleep "$INTERVAL"
done
