import type { Page } from "@playwright/test";

export interface NetworkProfile {
  /** Added round-trip delay, in milliseconds. */
  latencyMs: number;
  /** Throughput cap in kilobytes per second, both directions. */
  kbps: number;
}

export const SLOW_3G: NetworkProfile = { latencyMs: 400, kbps: 50 };
export const VERY_SLOW: NetworkProfile = { latencyMs: 1500, kbps: 20 };

/**
 * Throttles the page's network from now on. Call it after setup so only the
 * action under test is slow. Chromium only (uses the DevTools protocol), which
 * is fine here: both browser projects are Chromium.
 */
export async function throttleNetwork(page: Page, profile: NetworkProfile): Promise<void> {
  // Changing the emulated conditions aborts requests still in flight with
  // net::ERR_NETWORK_CHANGED (prefetches, late chunks), which the console-error
  // guard rightly reports. Let the page go idle first so nothing is mid-request.
  await page.waitForLoadState("networkidle");

  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: profile.latencyMs,
    downloadThroughput: profile.kbps * 1024,
    uploadThroughput: profile.kbps * 1024,
  });
}
