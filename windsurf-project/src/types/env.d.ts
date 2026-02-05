/**
 * §Bun:133.TYPES - Feature Registry (Empire Edition)
 */

declare module "bun:bundle" {
  /**
   * Bun 1.1+ Feature Registry for statically-analyzable dead-code elimination (DCE)
   * Serves as living documentation of available tiers and capabilities.
   */
  interface Registry {
    // Tier definitions
    features: "FREE" | "PREMIUM" | "DUO_PLUS";
    
    // Capability flags
    capabilities: "PHONE_DEEP_ENRICH" | "PTY_INTERACTIVE" | "PREDICTIVE_ANALYTICS" | "FRAUD_RING_DETECTION" | "AB_TEST_MESH";
    
    // Build modes
    modes: "DEBUG" | "VALIDATION_STRICT" | "MOCK_API" | "PRODUCTION" | "STRICT_TYPE_VALIDATION";
  }
}

declare global {
  /**
   * Global Feature Gating Fallbacks for legacy/runtime support
   */
  var FEATURE_PREMIUM: boolean | undefined;
  var FEATURE_DUO_PLUS: boolean | undefined;
}

export {};
