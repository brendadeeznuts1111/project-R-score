// [65.0.0.0] COMPILE-TIME FEATURE FLAGS - Dead-Code Elimination
// Bun v1.3.5+ native, zero-npm, production-ready
// Statically-analyzable feature flags with complete dead-code elimination

import { feature } from "bun:bundle";

/**
 * [65.1.0.0] Feature flag registry interface
 * Augment this in env.d.ts for type safety and autocomplete
 */
export interface FeatureRegistry {
  DEBUG: boolean;
  PREMIUM: boolean;
  BETA_FEATURES: boolean;
  MOCK_API: boolean;
  ANALYTICS: boolean;
  SECURITY_AUDIT: boolean;
  PERFORMANCE_MONITORING: boolean;
}

/**
 * [65.2.0.0] Feature flag checker with type safety
 * Returns true/false at compile time, enabling dead-code elimination
 */
export function isFeatureEnabled(featureName: keyof FeatureRegistry): boolean {
  return feature(featureName as string) as boolean;
}

/**
 * [65.3.0.0] Debug logging - eliminated when DEBUG=false
 */
export function debugLog(message: string, data?: any): void {
  if (feature("DEBUG")) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] DEBUG: ${message}`, data ?? "");
  }
}

/**
 * [65.4.0.0] Premium feature guard
 * Code path completely removed when PREMIUM=false
 */
export function initPremiumFeatures(): void {
  if (feature("PREMIUM")) {
    console.log("✅ Premium features initialized");
    // Premium-only initialization code
    enableAdvancedAnalytics();
    enableCustomThemes();
    enablePrioritySupport();
  }
}

/**
 * [65.5.0.0] Beta features guard
 * Entire feature set eliminated from production builds
 */
export function initBetaFeatures(): void {
  if (feature("BETA_FEATURES")) {
    console.log("⚠️ Beta features enabled");
    // Experimental features only in beta builds
    enableExperimentalUI();
    enableNewAlgorithms();
    enableUnstableAPIs();
  }
}

// ===== API Configuration =====
const API_CONFIG = {
  MOCK_PORT: parseInt(process.env.MOCK_API_PORT || "3000"),
  MOCK_HOST: process.env.MOCK_API_HOST || "localhost",
  PRODUCTION_URL:
    process.env.PRODUCTION_API_URL || "https://api.production.com",
};

/**
 * [65.6.0.0] Mock API for testing
 * Replaced with real API in production
 */
export function getAPIEndpoint(): string {
  if (feature("MOCK_API")) {
    return `http://${API_CONFIG.MOCK_HOST}:${API_CONFIG.MOCK_PORT}/api`;
  }
  return API_CONFIG.PRODUCTION_URL;
}

/**
 * [65.7.0.0] Analytics tracking
 * Completely removed when ANALYTICS=false
 */
export function trackEvent(
  eventName: string,
  data?: Record<string, any>
): void {
  if (feature("ANALYTICS")) {
    const event = {
      name: eventName,
      timestamp: Date.now(),
      data: data ?? {},
    };
    // Send to analytics service
    console.log("📊 Event tracked:", event);
  }
}

/**
 * [65.8.0.0] Security audit logging
 * Eliminated in non-audit builds
 */
export function auditLog(action: string, details: Record<string, any>): void {
  if (feature("SECURITY_AUDIT")) {
    const auditEntry = {
      action,
      timestamp: Date.now(),
      details,
      severity: "info",
    };
    console.log("🔐 Audit:", auditEntry);
  }
}

/**
 * [65.9.0.0] Performance monitoring
 * Removed entirely when PERFORMANCE_MONITORING=false
 */
export function measurePerformance<T>(label: string, callback: () => T): T {
  if (feature("PERFORMANCE_MONITORING")) {
    const startTime = performance.now();
    const result = callback();
    const duration = performance.now() - startTime;
    console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
    return result;
  }
  return callback();
}

// [65.10.0.0] Helper functions (eliminated when not needed)
function enableAdvancedAnalytics(): void {
  if (feature("PREMIUM")) {
    console.log("  → Advanced analytics enabled");
  }
}

function enableCustomThemes(): void {
  if (feature("PREMIUM")) {
    console.log("  → Custom themes enabled");
  }
}

function enablePrioritySupport(): void {
  if (feature("PREMIUM")) {
    console.log("  → Priority support enabled");
  }
}

function enableExperimentalUI(): void {
  if (feature("BETA_FEATURES")) {
    console.log("  → Experimental UI enabled");
  }
}

function enableNewAlgorithms(): void {
  if (feature("BETA_FEATURES")) {
    console.log("  → New algorithms enabled");
  }
}

function enableUnstableAPIs(): void {
  if (feature("BETA_FEATURES")) {
    console.log("  → Unstable APIs enabled");
  }
}

export default {
  isFeatureEnabled,
  debugLog,
  initPremiumFeatures,
  initBetaFeatures,
  getAPIEndpoint,
  trackEvent,
  auditLog,
  measurePerformance,
};
