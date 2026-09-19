// For HTTP-only specs. Uses Playwright's base `test` (no browser page per
// test) with the `request` fixture swapped for one that can pass Vercel's
// deployment-protection bypass header.
import { test as base } from "@playwright/test";
import { requestWithBypass } from "./vercel-bypass";

export const test = base.extend({
  request: requestWithBypass,
});

export { expect } from "@playwright/test";
