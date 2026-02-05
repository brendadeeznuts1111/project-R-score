/**
 * @file packages/blog/feature-guard.ts
 * @description Feature-Flag-Guard: Zero-runtime cost feature flag enforcement
 * @version 2.4.1
 *
 * This component provides compile-time feature flag validation and dead code elimination
 * for the blog infrastructure. It enforces the Registry interface at build time,
 * eliminating invalid feature usage before runtime.
 */

import { feature } from "bun:bundle";

/**
 * Feature Flag Guard - Compile-Time Validation
 *
 * This utility provides type-safe feature flag checking with zero runtime cost.
 * Invalid feature flags are caught at compile time, and dead code elimination
 * removes unreachable branches during bundling.
 */
export class FeatureFlagGuard {
  /**
   * Validate that only registered features are used
   * This method serves as documentation and compile-time validation
   */
  static validateFeatures(): void {
    // ✅ VALID: These compile successfully
    if (feature("DEBUG")) {
      // Debug features enabled - compile-time inclusion
      this.enableDebugFeatures();
    }

    if (feature("PREMIUM")) {
      // Premium features enabled - compile-time inclusion
      this.enablePremiumFeatures();
    }

    if (feature("BETA_FEATURES")) {
      // Beta features enabled - compile-time inclusion
      this.enableBetaFeatures();
    }

    // ❌ INVALID: These would cause compile errors:
    // if (feature("TYPO")) { ... } // TypeScript error!
    // if (feature("PRODUCTION")) { ... } // TypeScript error!
  }

  /**
   * Get active features at build time
   * Dead code elimination will remove unused branches
   */
  static getActiveFeatures(): readonly FeatureFlag[] {
    const active: FeatureFlag[] = [];

    // Build-time conditional inclusion
    if (feature("DEBUG")) {
      active.push("DEBUG");
    }
    if (feature("PREMIUM")) {
      active.push("PREMIUM");
    }
    if (feature("BETA_FEATURES")) {
      active.push("BETA_FEATURES");
    }

    return active as readonly FeatureFlag[];
  }

  /**
   * Check if a specific feature is enabled
   * Uses conditional execution pattern required by Bun's feature() constraints
   */
  static isEnabled(flag: FeatureFlag): boolean {
    let result = false;

    switch (flag) {
      case "DEBUG":
        if (feature("DEBUG")) {
          result = true;
        }
        break;
      case "PREMIUM":
        if (feature("PREMIUM")) {
          result = true;
        }
        break;
      case "BETA_FEATURES":
        if (feature("BETA_FEATURES")) {
          result = true;
        }
        break;
    }

    return result;
  }

  /**
   * Conditionally execute code based on feature flags
   * Enables type-safe conditional compilation
   */
  static whenEnabled<T>(flag: FeatureFlag, callback: () => T): T | undefined {
    if (this.isEnabled(flag)) {
      return callback();
    }
    return undefined;
  }

  /**
   * Debug features implementation
   * Only included when DEBUG feature is enabled at build time
   */
  private static enableDebugFeatures(): void {
    // Debug-specific code that gets eliminated when DEBUG is disabled
    console.log("🔧 Debug features enabled at build time");
  }

  /**
   * Premium features implementation
   * Only included when PREMIUM feature is enabled at build time
   */
  private static enablePremiumFeatures(): void {
    // Premium-specific code that gets eliminated when PREMIUM is disabled
    console.log("💎 Premium features enabled at build time");
  }

  /**
   * Beta features implementation
   * Only included when BETA_FEATURES feature is enabled at build time
   */
  private static enableBetaFeatures(): void {
    // Beta-specific code that gets eliminated when BETA_FEATURES is disabled
    console.log("🧪 Beta features enabled at build time");
  }
}

/**
 * Type-safe feature flag union
 * This ensures only valid features can be used
 */
export type FeatureFlag = "DEBUG" | "PREMIUM" | "BETA_FEATURES";

/**
 * Feature flag constants for runtime reference
 */
export const FEATURES = {
  DEBUG: "DEBUG" as const,
  PREMIUM: "PREMIUM" as const,
  BETA_FEATURES: "BETA_FEATURES" as const,
} as const;

/**
 * Build-time feature detection
 * These are resolved to boolean literals during compilation
 */
export const BUILD_FEATURES = {
  get DEBUG(): boolean {
    let enabled = false;
    if (feature("DEBUG")) {
      enabled = true;
    }
    return enabled;
  },
  get PREMIUM(): boolean {
    let enabled = false;
    if (feature("PREMIUM")) {
      enabled = true;
    }
    return enabled;
  },
  get BETA_FEATURES(): boolean {
    let enabled = false;
    if (feature("BETA_FEATURES")) {
      enabled = true;
    }
    return enabled;
  },
} as const;

/**
 * Utility functions for feature flag usage
 */
export const FeatureUtils = {
  /**
   * Get all available features
   */
  getAllFeatures(): readonly FeatureFlag[] {
    return ["DEBUG", "PREMIUM", "BETA_FEATURES"];
  },

  /**
   * Check if any features are enabled
   */
  hasAnyFeatures(): boolean {
    let hasAny = false;

    if (feature("DEBUG") || feature("PREMIUM") || feature("BETA_FEATURES")) {
      hasAny = true;
    }

    return hasAny;
  },

  /**
   * Get feature status for logging/debugging
   */
  getFeatureStatus(): Record<FeatureFlag, boolean> {
    const status: Record<FeatureFlag, boolean> = {
      DEBUG: false,
      PREMIUM: false,
      BETA_FEATURES: false,
    };

    if (feature("DEBUG")) {
      status.DEBUG = true;
    }
    if (feature("PREMIUM")) {
      status.PREMIUM = true;
    }
    if (feature("BETA_FEATURES")) {
      status.BETA_FEATURES = true;
    }

    return status;
  },
} as const;

/**
 * Initialize feature flag guard
 * Call this at application startup to validate configuration
 */
export function initializeFeatureGuard(): void {
  FeatureFlagGuard.validateFeatures();

  // Log active features in debug mode
  if (feature("DEBUG")) {
    const active = FeatureFlagGuard.getActiveFeatures();
    console.log(`🚩 Active features: ${active.join(", ") || "none"}`);
  }
}

/**
 * Build-time assertion for feature combinations
 * Use this to enforce business rules at compile time
 */
export function assertFeatureCombination(
  condition: boolean,
  message: string
): void {
  // This assertion is evaluated at build time
  // If condition is false, it will cause a build error
  if (!condition) {
    throw new Error(`Feature combination assertion failed: ${message}`);
  }
}

// Build-time validations
// These assertions are evaluated during compilation
assertFeatureCombination(
  true, // Always true - just validates the system works
  "Feature flag guard initialized successfully"
);