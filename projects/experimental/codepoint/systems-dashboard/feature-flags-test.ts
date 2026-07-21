#!/usr/bin/env bun
// feature-flags-test.ts - Test Bun feature flags with different configurations

import { feature } from "bun:bundle";

// Type-safe feature registry
declare module "bun:bundle" {
  interface Registry {
    features:
      | "PREMIUM"
      | "DEBUG"
      | "BETA_FEATURES"
      | "ADMIN"
      | "ANALYTICS"
      | "PERFORMANCE"
      | "MOCK_API";
  }
}

console.info("🧪 Testing Bun Feature Flags");
console.info("========================");

// Test each feature individually (must use string literals)
console.info("📊 Feature Status:");

const enabledFeatures = [];
const disabledFeatures = [];

if (feature("PREMIUM")) {
  enabledFeatures.push("PREMIUM");
  console.info("✅ PREMIUM: Enabled");
} else {
  disabledFeatures.push("PREMIUM");
  console.info("❌ PREMIUM: Disabled");
}

if (feature("DEBUG")) {
  enabledFeatures.push("DEBUG");
  console.info("✅ DEBUG: Enabled");
} else {
  disabledFeatures.push("DEBUG");
  console.info("❌ DEBUG: Disabled");
}

if (feature("BETA_FEATURES")) {
  enabledFeatures.push("BETA_FEATURES");
  console.info("✅ BETA_FEATURES: Enabled");
} else {
  disabledFeatures.push("BETA_FEATURES");
  console.info("❌ BETA_FEATURES: Disabled");
}

if (feature("ADMIN")) {
  enabledFeatures.push("ADMIN");
  console.info("✅ ADMIN: Enabled");
} else {
  disabledFeatures.push("ADMIN");
  console.info("❌ ADMIN: Disabled");
}

if (feature("ANALYTICS")) {
  enabledFeatures.push("ANALYTICS");
  console.info("✅ ANALYTICS: Enabled");
} else {
  disabledFeatures.push("ANALYTICS");
  console.info("❌ ANALYTICS: Disabled");
}

if (feature("PERFORMANCE")) {
  enabledFeatures.push("PERFORMANCE");
  console.info("✅ PERFORMANCE: Enabled");
} else {
  disabledFeatures.push("PERFORMANCE");
  console.info("❌ PERFORMANCE: Disabled");
}

if (feature("MOCK_API")) {
  enabledFeatures.push("MOCK_API");
  console.info("✅ MOCK_API: Enabled");
} else {
  disabledFeatures.push("MOCK_API");
  console.info("❌ MOCK_API: Disabled");
}

console.info(
  `\nSummary: ${enabledFeatures.length} enabled, ${disabledFeatures.length} disabled`
);

// Test conditional code execution
console.info("\n🔧 Testing Conditional Code:");

if (feature("PREMIUM")) {
  console.info("🎯 Premium features are active!");
  console.info("   - Advanced dashboard with real-time analytics");
  console.info("   - Premium analytics with predictive insights");
  console.info("   - Priority support system");
} else {
  console.info("📦 Basic features only");
  console.info("   - Standard dashboard");
  console.info("   - Limited analytics");
  console.info("   - Standard support");
}

if (feature("DEBUG")) {
  console.info("🐛 Debug mode is active!");
  console.info("   - Verbose logging with structured output");
  console.info("   - Development tools and hot reload");
  console.info("   - Debug endpoints with tracing");
} else {
  console.info("🚀 Production mode");
  console.info("   - Production logging only");
  console.info("   - No debug overhead");
  console.info("   - Optimized for performance");
}

if (feature("ANALYTICS")) {
  console.info("📊 Analytics are enabled!");
  console.info("   - Comprehensive usage tracking");
  console.info("   - Performance metrics collection");
  console.info("   - User behavior analysis");
} else {
  console.info("🔒 Privacy mode");
  console.info("   - No tracking overhead");
  console.info("   - Privacy-focused approach");
  console.info("   - Basic metrics only");
}

// Test ternary operators
const mode = feature("DEBUG") ? "development" : "production";
console.info(`\n🌍 Running in ${mode} mode`);

// Test configuration object
const config = {
  premiumMode: feature("PREMIUM") ? true : false,
  debugMode: feature("DEBUG") ? true : false,
  betaMode: feature("BETA_FEATURES") ? true : false,
  adminMode: feature("ADMIN") ? true : false,
  analyticsEnabled: feature("ANALYTICS") ? true : false,
  performanceMode: feature("PERFORMANCE") ? true : false,
  mockApi: feature("MOCK_API") ? true : false,
};

console.info("\n⚙️ Configuration:", config);

// Test API endpoints based on features
console.info("\n🌐 Available API Endpoints:");
console.info("  GET /api/status - Basic status");
console.info("  GET /api/health - Health check");

if (feature("PREMIUM")) {
  console.info("  GET /api/premium/analytics - Advanced analytics");
  console.info("  POST /api/premium/export - Data export");
}

if (feature("DEBUG")) {
  console.info("  GET /api/debug/logs - Debug logs");
  console.info("  GET /api/debug/metrics - Debug metrics");
}

if (feature("ADMIN")) {
  console.info("  GET /api/admin/users - User management");
  console.info("  POST /api/admin/config - Configuration");
}

// Test build implications
console.info("\n🔍 Build Implications:");
console.info(
  `   - Bundle Size: ${enabledFeatures.length > 4 ? "High" : enabledFeatures.length > 2 ? "Medium" : "Low"} impact`
);
console.info(
  `   - Runtime Overhead: ${enabledFeatures.length > 5 ? "High" : enabledFeatures.length > 3 ? "Medium" : "Low"}`
);
console.info(
  `   - Features Active: ${enabledFeatures.length}/7 (${Math.round((enabledFeatures.length / 7) * 100)}%)`
);

console.info("\n✅ Feature flags test completed!");
