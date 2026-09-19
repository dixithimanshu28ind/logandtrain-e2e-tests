import type { APIRequestContext, BrowserContext, PlaywrightWorkerArgs } from "@playwright/test";

/**
 * Vercel puts Preview deployments (and per-deployment URLs) behind login.
 * "Protection Bypass for Automation" lets a request through when it carries
 * the project's secret in this header. Absent secret = no-op, so local runs
 * and runs against the public production alias are unaffected.
 */
const HEADER = "x-vercel-protection-bypass";

function secret(): string | undefined {
  return process.env.VERCEL_BYPASS_SECRET || undefined;
}

/**
 * Adds the bypass header to browser requests, but only those to the app's own
 * origin. A blanket `extraHTTPHeaders` would also send the secret to Supabase
 * and every other third party the page calls.
 */
export async function applyBypassToBrowser(context: BrowserContext, baseURL: string | undefined) {
  const value = secret();
  if (!value || !baseURL) return;

  const appOrigin = new URL(baseURL).origin;
  await context.route(
    (url) => url.origin === appOrigin,
    (route) => route.continue({ headers: { ...route.request().headers(), [HEADER]: value } })
  );
}

/** Replacement for the built-in `request` fixture that carries the bypass header. */
export async function requestWithBypass(
  { playwright, baseURL }: Pick<PlaywrightWorkerArgs, "playwright"> & { baseURL: string | undefined },
  use: (request: APIRequestContext) => Promise<void>
) {
  const value = secret();
  const request = await playwright.request.newContext({
    baseURL,
    extraHTTPHeaders: value ? { [HEADER]: value } : {},
  });
  await use(request);
  await request.dispose();
}
