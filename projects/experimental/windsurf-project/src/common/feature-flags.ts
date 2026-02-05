// src/common/feature-flags.ts
/**
 * §Bun:133 - Feature Flag Implementation
 * @pattern Gate:133
 * @perf <1μs
 * @roi ∞
 * @section §Bun
 */

import { feature as bunFeature } from "bun:bundle";

/**
 * Global helper for feature gating.
 */
export function feature(key: any): boolean {
  // Use strings directly in if statements for Bun's static analyzer
  if (key === "FREE") if (bunFeature("FREE")) return true;
  if (key === "PREMIUM") if (bunFeature("PREMIUM")) return true;
  if (key === "DUO_PLUS") if (bunFeature("DUO_PLUS")) return true;
  if (key === "PHONE_DEEP_ENRICH") if (bunFeature("PHONE_DEEP_ENRICH" as any)) return true;
  if (key === "PTY_INTERACTIVE") if (bunFeature("PTY_INTERACTIVE" as any)) return true;
  if (key === "AB_TEST_MESH") if (bunFeature("AB_TEST_MESH" as any)) return true;
  if (key === "VALIDATION_STRICT") if (bunFeature("VALIDATION_STRICT" as any)) return true;
  if (key === "DEBUG") if (bunFeature("DEBUG" as any)) return true;

  // Fallback for non-bundled runtime
  return Boolean(process.env.EMPIRE_FEATURES?.split(',').includes(key));
}

// Global exposure
if (typeof (globalThis as any).feature === "undefined") {
  (globalThis as any).feature = feature;
}
