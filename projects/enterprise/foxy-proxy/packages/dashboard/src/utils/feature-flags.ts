/**
 * Enhanced Feature Flags System with Compile-time Elimination
 * Uses Bun's feature() for dead-code elimination and runtime checks
 */
import { feature } from "bun:bundle";

// Compile-time feature flags (eliminated from bundle if false)
export const COMPILE_TIME_FEATURES = {
  // Always included in development
  DEBUG: feature("DEBUG") ? true : false,

  // Tier-based features
  PREMIUM_TIER: feature("PREMIUM_TIER") ? true : false,
  ENTERPRISE: feature("ENTERPRISE") ? true : false,

  // Advanced features
  QUANTUM_SAFE: feature("QUANTUM_SAFE") ? true : false,
  ADVANCED_WIDTH_CALC: feature("ADVANCED_WIDTH_CALC") ? true : false,

  // Integration features
  MOCK_API: feature("MOCK_API") ? true : false,
  BETA_FEATURES: feature("BETA_FEATURES") ? true : false,

  // Enterprise features
  SSO_INTEGRATION: feature("SSO_INTEGRATION") ? true : false,
  AUDIT_LOGS: feature("AUDIT_LOGS") ? true : false,
  COMPLIANCE_MODE: feature("COMPLIANCE_MODE") ? true : false,

  // Analytics and monitoring
  ADVANCED_ANALYTICS: feature("ADVANCED_ANALYTICS") ? true : false,
  PERFORMANCE_PROFILING: feature("PERFORMANCE_PROFILING") ? true : false,

  // Development tools
  WEBHOOK_SUPPORT: feature("WEBHOOK_SUPPORT") ? true : false,
  BACKUP_AUTOMATION: feature("BACKUP_AUTOMATION") ? true : false
} as const;

// Runtime feature flags (can be changed without rebuild)
export const RUNTIME_FEATURES = {
  // Dashboard features
  UNIFIED_MANAGEMENT: process.env.VITE_UNIFIED_MANAGEMENT !== "false",
  SCHEMA_MATCHING: process.env.VITE_SCHEMA_MATCHING === "true",
  ENHANCED_TEMPLATES: process.env.VITE_ENHANCED_TEMPLATES !== "false",

  // API features
  DUOPLUS_INTEGRATION: process.env.VITE_DUOPLUS_INTEGRATION !== "false",
  ADVANCED_PROXY_CONFIG: process.env.VITE_ADVANCED_PROXY_CONFIG === "true",

  // UI features
  DARK_MODE: process.env.VITE_DARK_MODE !== "false",
  ANALYTICS_DASHBOARD: process.env.VITE_ANALYTICS_DASHBOARD !== "false",
  REAL_TIME_UPDATES: process.env.VITE_REAL_TIME_UPDATES === "true",

  // Development features
  DEBUG_MODE: process.env.NODE_ENV === "development",
  MOCK_DATA: process.env.VITE_MOCK_DATA === "true",
  VERBOSE_LOGGING: process.env.VITE_VERBOSE_LOGGING === "true"
} as const;

// Combined feature checking
export function isFeatureEnabled(
  feature: keyof typeof COMPILE_TIME_FEATURES | keyof typeof RUNTIME_FEATURES
): boolean {
  // Check compile-time features first
  if (feature in COMPILE_TIME_FEATURES) {
    return COMPILE_TIME_FEATURES[feature as keyof typeof COMPILE_TIME_FEATURES];
  }

  // Check runtime features
  if (feature in RUNTIME_FEATURES) {
    return RUNTIME_FEATURES[feature as keyof typeof RUNTIME_FEATURES];
  }

  return false;
}

// Tier-specific feature checking
export function isTierFeature(tier: "free" | "premium" | "enterprise", feature: string): boolean {
  switch (tier) {
    case "free":
      return ["UNIFIED_MANAGEMENT", "BASIC_PROXY_CONFIG"].includes(feature);
    case "premium":
      return [
        "UNIFIED_MANAGEMENT",
        "ADVANCED_PROXY_CONFIG",
        "ANALYTICS_DASHBOARD",
        "ENHANCED_TEMPLATES",
        "REAL_TIME_UPDATES"
      ].includes(feature);
    case "enterprise":
      return [
        "UNIFIED_MANAGEMENT",
        "ADVANCED_PROXY_CONFIG",
        "ANALYTICS_DASHBOARD",
        "ENHANCED_TEMPLATES",
        "REAL_TIME_UPDATES",
        "SCHEMA_MATCHING",
        "SSO_INTEGRATION",
        "AUDIT_LOGS",
        "COMPLIANCE_MODE"
      ].includes(feature);
    default:
      return false;
  }
}

// Get current tier from environment or compile-time features
export function getCurrentTier(): "free" | "premium" | "enterprise" {
  if (COMPILE_TIME_FEATURES.ENTERPRISE) {
    return "enterprise";
  }
  if (COMPILE_TIME_FEATURES.PREMIUM_TIER) {
    return "premium";
  }
  return "free";
}

// Feature availability matrix
export const FEATURE_MATRIX = {
  free: ["UNIFIED_MANAGEMENT", "BASIC_PROXY_CONFIG", "DUOPLUS_INTEGRATION", "DARK_MODE"],
  premium: [
    "UNIFIED_MANAGEMENT",
    "ADVANCED_PROXY_CONFIG",
    "ANALYTICS_DASHBOARD",
    "ENHANCED_TEMPLATES",
    "REAL_TIME_UPDATES",
    "DUOPLUS_INTEGRATION",
    "DARK_MODE"
  ],
  enterprise: [
    "UNIFIED_MANAGEMENT",
    "ADVANCED_PROXY_CONFIG",
    "ANALYTICS_DASHBOARD",
    "ENHANCED_TEMPLATES",
    "REAL_TIME_UPDATES",
    "SCHEMA_MATCHING",
    "SSO_INTEGRATION",
    "AUDIT_LOGS",
    "COMPLIANCE_MODE",
    "DUOPLUS_INTEGRATION",
    "DARK_MODE"
  ]
} as const;

// Debug logging (only when DEBUG is enabled)
export const debug = {
  log: (...args: unknown[]) => {
    if (COMPILE_TIME_FEATURES.DEBUG) {
      console.log("[DEBUG]", ...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (COMPILE_TIME_FEATURES.DEBUG) {
      console.warn("[DEBUG]", ...args);
    }
  },
  error: (...args: unknown[]) => {
    if (COMPILE_TIME_FEATURES.DEBUG) {
      console.error("[DEBUG]", ...args);
    }
  }
};

// Performance profiling (only when enabled)
export const performanceProfiler = {
  mark: (name: string) => {
    if (COMPILE_TIME_FEATURES.PERFORMANCE_PROFILING) {
      globalThis.performance?.mark?.(name);
    }
  },
  measure: (name: string, startMark: string, endMark: string) => {
    if (COMPILE_TIME_FEATURES.PERFORMANCE_PROFILING) {
      globalThis.performance?.measure?.(name, startMark, endMark);
    }
  },
  now: () => {
    if (COMPILE_TIME_FEATURES.PERFORMANCE_PROFILING) {
      return globalThis.performance?.now?.() || 0;
    }
    return 0;
  }
};

// Feature gate for components
export function withFeatureGate<T>(
  feature: keyof typeof COMPILE_TIME_FEATURES | keyof typeof RUNTIME_FEATURES,
  component: T,
  fallback?: T
): T | undefined {
  return isFeatureEnabled(feature) ? component : fallback;
}

// Async feature checking (for runtime features that might require async validation)
export async function isFeatureEnabledAsync(
  feature: keyof typeof RUNTIME_FEATURES
): Promise<boolean> {
  // Some features might require async validation
  switch (feature) {
    case "DUOPLUS_INTEGRATION":
      // Check if DuoPlus is configured
      return RUNTIME_FEATURES.DUOPLUS_INTEGRATION && (await checkDuoPlusConfiguration());
    case "ADVANCED_PROXY_CONFIG":
      // Check if user has permissions
      return RUNTIME_FEATURES.ADVANCED_PROXY_CONFIG && (await checkProxyPermissions());
    default:
      return RUNTIME_FEATURES[feature];
  }
}

// Helper functions for async feature checking
async function checkDuoPlusConfiguration(): Promise<boolean> {
  // Mock implementation - would check actual DuoPlus configuration
  return process.env.VITE_DUOPLUS_CONFIGURED === "true";
}

async function checkProxyPermissions(): Promise<boolean> {
  // Mock implementation - would check actual user permissions
  return process.env.VITE_ADVANCED_PROXY_ENABLED === "true";
}

// Export feature types for external use
export type FeatureFlag = keyof typeof COMPILE_TIME_FEATURES | keyof typeof RUNTIME_FEATURES;
export type SubscriptionTier = "free" | "premium" | "enterprise";

// Feature validation
export function validateFeature(feature: string): boolean {
  return feature in COMPILE_TIME_FEATURES || feature in RUNTIME_FEATURES;
}

// Get all enabled features
export function getEnabledFeatures(): string[] {
  const features: string[] = [];

  // Add compile-time features
  Object.entries(COMPILE_TIME_FEATURES).forEach(([key, value]) => {
    if (value) {
      features.push(key);
    }
  });

  // Add runtime features
  Object.entries(RUNTIME_FEATURES).forEach(([key, value]) => {
    if (value) {
      features.push(key);
    }
  });

  return features;
}

// Feature usage analytics (only when analytics are enabled)
export function trackFeatureUsage(feature: string, action: string): void {
  if (isFeatureEnabled("ADVANCED_ANALYTICS")) {
    // Send analytics data
    debug.log("Feature usage tracked:", { feature, action, timestamp: new Date().toISOString() });
  }
}

// Legacy exports for backward compatibility
export const isDuoPlusEnabled = () => isFeatureEnabled("DUOPLUS_INTEGRATION");
export const isUnifiedManagementEnabled = () => isFeatureEnabled("UNIFIED_MANAGEMENT");
export const isSchemaMatchingEnabled = () => isFeatureEnabled("SCHEMA_MATCHING");
export const isEnhancedTemplatesEnabled = () => isFeatureEnabled("ENHANCED_TEMPLATES");
export const areEnhancedTemplatesEnabled = () => isFeatureEnabled("ENHANCED_TEMPLATES");
export const isDebugEnabled = () => isFeatureEnabled("DEBUG_MODE");
export const isAdvancedAnalyticsEnabled = () => isFeatureEnabled("ADVANCED_ANALYTICS");

// Additional legacy wrapper functions for existing components
export const isDebugMode = (): boolean => isFeatureEnabled("DEBUG_MODE");
export const isDeveloperMode = (): boolean => process.env.NODE_ENV === "development";
export const isPerformanceProfilingEnabled = (): boolean =>
  COMPILE_TIME_FEATURES.PERFORMANCE_PROFILING;
export const isDateTimeStandardizationEnabled = (): boolean =>
  process.env.VITE_DATE_TIME_STANDARDIZATION !== "false";
export const isBunTimezoneEnabled = (): boolean => process.env.VITE_BUN_TIMEZONE === "true";
export const areBetaFeaturesEnabled = (): boolean => isFeatureEnabled("BETA_FEATURES");
export const isPremiumEnabled = (): boolean =>
  getCurrentTier() === "premium" || getCurrentTier() === "enterprise";
export const isAnalyticsEnabled = (): boolean => isFeatureEnabled("ANALYTICS_DASHBOARD");
export const isMonitoringEnabled = (): boolean => isFeatureEnabled("ADVANCED_ANALYTICS");

// Build mode detection
export const getBuildMode = (): string => {
  if (process.env.NODE_ENV === "development") {
    return "development";
  }
  if (process.env.NODE_ENV === "staging") {
    return "staging";
  }
  if (COMPILE_TIME_FEATURES.ENTERPRISE) {
    return "enterprise";
  }
  if (COMPILE_TIME_FEATURES.PREMIUM_TIER) {
    return "premium";
  }
  return "production";
};

// Debug logging convenience
export const debugLog = (...args: unknown[]) => {
  debug.log(...args);
};

// Performance profiling convenience
export const profilePerformance = async <T>(name: string, fn: () => Promise<T> | T): Promise<T> => {
  if (!COMPILE_TIME_FEATURES.PERFORMANCE_PROFILING) {
    return fn();
  }

  const startMark = `${name}-start`;
  const endMark = `${name}-end`;

  performanceProfiler.mark(startMark);
  const result = await fn();
  performanceProfiler.mark(endMark);
  performanceProfiler.measure(name, startMark, endMark);

  return result;
};

/**
 * Helper function to check if any of the provided features are enabled
 * @param features - Array of feature check functions
 * @returns true if any feature is enabled
 */
export const isAnyFeatureEnabled = (features: (() => boolean)[]): boolean => {
  return features.some((featureCheck) => featureCheck());
};
