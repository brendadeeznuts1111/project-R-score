#!/usr/bin/env bun

/**
 * 🎯 PRO-TIPS FOR BUN'S COMPILE-TIME FEATURE FLAGS
 *
 * This file demonstrates best practices for using Bun's compile-time feature flags
 * for maximum dead code elimination and bundle size optimization.
 */

import { feature } from "bun:bundle";

// ============================================================================
// 🔧 TYPE SAFETY PATTERN
// ============================================================================

// TypeScript validates feature names at compile time
// (See env.d.ts for type definitions)

// ❌ This would cause a compile error if TYPO isn't in the registry
// if (feature("TYPO")) { } // Compile error!

// ✅ Valid feature names
if (feature("FEAT_EXTENDED_LOGGING")) {
  console.log("Debug mode enabled");
}

// ============================================================================
// 🚀 RUNTIME VS COMPILE-TIME SPLIT
// ============================================================================

// COMPILE-TIME: Eliminated from bundle when feature is disabled
if (feature("FEAT_MOCK_API")) {
  // This entire block is removed from production builds
  console.log("Using mock API");
  // useMockData(); // ← Removed from production builds
}

// RUNTIME: Stays in bundle, toggle at startup
if (process.env.ENABLE_FEATURE_X) {
  // This code stays in bundle but is conditionally executed
  console.log("Feature X enabled via environment variable");
}

// ============================================================================
// BUNDLE SIZE OPTIMIZATION
// ============================================================================

// Entire modules can be eliminated
export async function loadAdminPanel() {
  if (feature("FEAT_PREMIUM")) {
    // This would be tree-shaken away if FEAT_PREMIUM=false
    return { admin: true }; // Placeholder
  }
  return null;
}

// Premium features completely removed from free tier
export function advancedAnalytics() {
  if (feature("FEAT_PREMIUM")) {
    return "Premium analytics";
  }
  return "Basic analytics";
}

export function batchProcessing() {
  if (feature("FEAT_BATCH_PROCESSING")) {
    return "Batch processing";
  }
  return "Sequential processing";
}

// ============================================================================
// 🔄 PLATFORM-SPECIFIC CODE
// ============================================================================

// Eliminate platform-specific code from wrong builds
export function setupMobileGestures() {
  if (feature("PLATFORM_ANDROID")) {
    // This never reaches server-side bundles
    return "Mobile gestures setup";
  }
  return "Desktop setup";
}

export function initializeTouchEvents() {
  if (feature("PLATFORM_ANDROID")) {
    return "Touch events initialized";
  }
  return "Mouse events initialized";
}

export function setupDatabasePool() {
  if (feature("ENV_PRODUCTION")) {
    // This never reaches client bundles
    return "Database pool setup";
  }
  return "No database needed";
}

export function initializeCronJobs() {
  if (feature("ENV_PRODUCTION")) {
    return "Cron jobs initialized";
  }
  return "No cron jobs needed";
}

// ============================================================================
// 🏗️ ARCHITECTURE PATTERNS
// ============================================================================

// 1. Feature-flagged exports
export const FEATURES = {
  analytics: feature("FEAT_ADVANCED_MONITORING")
    ? () => "Real analytics"
    : () => "Dummy analytics",
  payments: feature("INTEGRATION_EMAIL_SERVICE")
    ? () => "Stripe processor"
    : () => "Mock processor",
};

// 2. Feature-gated middleware
export function getMiddleware() {
  const middleware = [];

  if (feature("FEAT_ENCRYPTION")) {
    middleware.push(() => "Auth middleware");
  }
  if (feature("FEAT_BATCH_PROCESSING")) {
    middleware.push(() => "Rate limit middleware");
  }
  if (feature("FEAT_BATCH_PROCESSING")) {
    middleware.push(() => "Cache middleware");
  }

  return middleware;
}

// 3. Conditional plugin system
export function getPlugins() {
  const plugins = [];

  if (feature("FEAT_ADVANCED_MONITORING")) {
    plugins.push(() => "SEO plugin");
  }
  if (feature("FEAT_ADVANCED_MONITORING")) {
    plugins.push(() => "Analytics plugin");
  }

  return plugins;
}

// ============================================================================
// 🚫 PITFALLS TO AVOID - Examples of what NOT to do
// ============================================================================

export function badPatterns() {
  // ❌ DON'T: Use dynamic feature names
  // const flag = "PREMIUM";
  // if (feature(flag)) { } // Can't be statically analyzed!

  // ✅ DO: Use literal strings
  if (feature("FEAT_PREMIUM")) {
    // Perfectly analyzable
  }

  // ❌ DON'T: Hide side effects in eliminated branches
  // if (feature("FEAT_EXTENDED_LOGGING")) {
  //   const importantValue = computeSomething(); // Never runs!
  // }
  // useValue(importantValue); // Error in production!

  // ✅ DO: Move declarations outside
  const importantValue = "computed"; // Always runs
  if (feature("FEAT_EXTENDED_LOGGING")) {
    console.log("Value:", importantValue); // Only logs in debug
  }
}

// ============================================================================
// 🎯 QUICK WINS - Practical examples
// ============================================================================

// 1. Gate expensive imports
export async function loadHeavyModule() {
  if (feature("FEAT_PREMIUM")) {
    // Placeholder for heavy module
    return { heavy: true };
  }
  return null;
}

// 2. Remove dev tools from production
export function initializeDevTools() {
  if (feature("FEAT_EXTENDED_LOGGING")) {
    // enableDevTools(); // Only in debug builds
    return "Dev tools enabled";
  }
  return null;
}

// 3. Eliminate polyfills for modern browsers
export function includePolyfills() {
  if (feature("ENV_DEVELOPMENT")) {
    // includePolyfills(); // Only in legacy builds
    return "Polyfills included";
  }
  return null;
}

// 4. Analytics for paid users only
export function trackEvents(event: string) {
  if (feature("FEAT_PREMIUM")) {
    // trackEvents(event); // Only in paid tier builds
    return `Tracked: ${event}`;
  }
  return null;
}

// ============================================================================
// ⚡ PERFORMANCE COMPARISON
// ============================================================================

// Before: Runtime check always in bundle
export function oldWay(config: { features: { premium: boolean } }) {
  if (config.features.premium) {
    return "Premium feature";
  }
  return "Free feature";
}

// After: No runtime check, no code in free tier
export function newWay() {
  if (feature("FEAT_PREMIUM")) {
    return "Premium feature";
    // ^^ Eliminated from free tier
  }
  return "Free feature";
}

// ============================================================================
// 🔒 SECURITY BENEFIT
// ============================================================================

// Sensitive admin code never reaches client bundles
export function exposeAdminApis() {
  if (feature("FEAT_PREMIUM")) {
    // This code ONLY exists in admin builds
    return {
      sensitiveApi: () => "Sensitive data",
      adminFunctions: () => "Admin functions",
    };
  }
  return null;
}
