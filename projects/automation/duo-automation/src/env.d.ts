// src/env.d.ts
// Empire Pro v3.7 - Compile-time feature flags for tiered deployments

declare module "bun:bundle" {
  interface Registry {
    features: 
      | "ENTERPRISE_SECURITY"   // Full audit trails, compliance checks
      | "DEVELOPMENT_TOOLS"     // Mock data, debug overlays
      | "DEBUG_UNICODE"         // Zero-width char highlighting
      | "PREMIUM_ANALYTICS"    // Advanced matrix sorting
      | "ADVANCED_DASHBOARD"    // Enhanced security dashboard
      | "AUDIT_EXPORT"          // S3 audit log export
      | "REAL_TIME_UPDATES"     // Live dashboard refresh
      | "MULTI_TENANT"          // Multi-tenant support
      | "V37_DETERMINISTIC_TZ"  // v3.7 Static timezone baseline
      | "V37_NATIVE_R2"         // v3.7 Bun-native R2 features
  }
}

// Additional type definitions for feature flag safety
export type FeatureFlag = 
  | "ENTERPRISE_SECURITY"
  | "DEVELOPMENT_TOOLS" 
  | "DEBUG_UNICODE"
  | "PREMIUM_ANALYTICS"
  | "ADVANCED_DASHBOARD"
  | "AUDIT_EXPORT"
  | "REAL_TIME_UPDATES"
  | "MULTI_TENANT"
  | "V37_DETERMINISTIC_TZ"
  | "V37_NATIVE_R2";

// Feature flag validation at compile time
export const VALID_FEATURES: readonly FeatureFlag[] = [
  "ENTERPRISE_SECURITY",
  "DEVELOPMENT_TOOLS", 
  "DEBUG_UNICODE",
  "PREMIUM_ANALYTICS",
  "ADVANCED_DASHBOARD",
  "AUDIT_EXPORT",
  "REAL_TIME_UPDATES",
  "MULTI_TENANT",
  "V37_DETERMINISTIC_TZ",
  "V37_NATIVE_R2"
] as const;