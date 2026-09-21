import type { APIRequestContext } from "@playwright/test";

export type FeatureState = "off" | "coming_soon" | "live";

/**
 * What this environment is currently showing for a feature, from the app's own
 * GET /api/features. That endpoint leaves out features that are Off, so absent
 * means Off.
 *
 * Feature tests read this to decide which branch to expect, and skip the
 * branches that are not the one in force, so the same spec is correct against
 * production, a preview (where an override may be set) and a local build.
 */
export async function featureState(request: APIRequestContext, key: string): Promise<FeatureState> {
  const response = await request.get("/api/features");
  if (!response.ok()) throw new Error(`GET /api/features answered ${response.status()}`);
  const { features } = (await response.json()) as { features: Record<string, FeatureState> };
  return features[key] ?? "off";
}
