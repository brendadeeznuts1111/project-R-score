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

console.log("🧪 Testing Bun Feature Flags");
console.log("========================");

// Test each feature individually (must use string literals)
console.log("📊 Feature Status:");

const enabledFeatures = [];
const disabledFeatures = [];

if (feature("PREMIUM")) {
  enabledFeatures.push("PREMIUM");
  console.log("✅ PREMIUM: Enabled");
} else {
  disabledFeatures.push("PREMIUM");
  console.log("❌ PREMIUM: Disabled");
}

if (feature("DEBUG")) {
  enabledFeatures.push("DEBUG");
  console.log("✅ DEBUG: Enabled");
} else {
  disabledFeatures.push("DEBUG");
  console.log("❌ DEBUG: Disabled");
}

if (feature("BETA_FEATURES")) {
  enabledFeatures.push("BETA_FEATURES");
  console.log("✅ BETA_FEATURES: Enabled");
} else {
  disabledFeatures.push("BETA_FEATURES");
  console.log("❌ BETA_FEATURES: Disabled");
}

if (feature("ADMIN")) {
  enabledFeatures.push("ADMIN");
  console.log("✅ ADMIN: Enabled");
} else {
  disabledFeatures.push("ADMIN");
  console.log("❌ ADMIN: Disabled");
}

if (feature("ANALYTICS")) {
  enabledFeatures.push("ANALYTICS");
  console.log("✅ ANALYTICS: Enabled");
} else {
  disabledFeatures.push("ANALYTICS");
  console.log("❌ ANALYTICS: Disabled");
}

if (feature("PERFORMANCE")) {
  enabledFeatures.push("PERFORMANCE");
  console.log("✅ PERFORMANCE: Enabled");
} else {
  disabledFeatures.push("PERFORMANCE");
  console.log("❌ PERFORMANCE: Disabled");
}

if (feature("MOCK_API")) {
  enabledFeatures.push("MOCK_API");
  console.log("✅ MOCK_API: Enabled");
} else {
  disabledFeatures.push("MOCK_API");
  console.log("❌ MOCK_API: Disabled");
}

console.log(
  `\nSummary: ${enabledFeatures.length} enabled, ${disabledFeatures.length} disabled`
);

// Test conditional code execution
console.log("\n🔧 Testing Conditional Code:");

if (feature("PREMIUM")) {
  console.log("🎯 Premium features are active!");
  console.log("   - Advanced dashboard with real-time analytics");
  console.log("   - Premium analytics with predictive insights");
  console.log("   - Priority support system");
} else {
  console.log("📦 Basic features only");
  console.log("   - Standard dashboard");
  console.log("   - Limited analytics");
  console.log("   - Standard support");
}

if (feature("DEBUG")) {
  console.log("🐛 Debug mode is active!");
  console.log("   - Verbose logging with structured output");
  console.log("   - Development tools and hot reload");
  console.log("   - Debug endpoints with tracing");
} else {
  console.log("🚀 Production mode");
  console.log("   - Production logging only");
  console.log("   - No debug overhead");
  console.log("   - Optimized for performance");
}

if (feature("ANALYTICS")) {
  console.log("📊 Analytics are enabled!");
  console.log("   - Comprehensive usage tracking");
  console.log("   - Performance metrics collection");
  console.log("   - User behavior analysis");
} else {
  console.log("🔒 Privacy mode");
  console.log("   - No tracking overhead");
  console.log("   - Privacy-focused approach");
  console.log("   - Basic metrics only");
}

// Test ternary operators
const mode = feature("DEBUG") ? "development" : "production";
console.log(`\n🌍 Running in ${mode} mode`);

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

console.log("\n⚙️ Configuration:", config);

// Test API endpoints based on features
console.log("\n🌐 Available API Endpoints:");
console.log("  GET /api/status - Basic status");
console.log("  GET /api/health - Health check");

if (feature("PREMIUM")) {
  console.log("  GET /api/premium/analytics - Advanced analytics");
  console.log("  POST /api/premium/export - Data export");
}

if (feature("DEBUG")) {
  console.log("  GET /api/debug/logs - Debug logs");
  console.log("  GET /api/debug/metrics - Debug metrics");
}

if (feature("ADMIN")) {
  console.log("  GET /api/admin/users - User management");
  console.log("  POST /api/admin/config - Configuration");
}

// Test build implications
console.log("\n🔍 Build Implications:");
console.log(
  `   - Bundle Size: ${enabledFeatures.length > 4 ? "High" : enabledFeatures.length > 2 ? "Medium" : "Low"} impact`
);
console.log(
  `   - Runtime Overhead: ${enabledFeatures.length > 5 ? "High" : enabledFeatures.length > 3 ? "Medium" : "Low"}`
);
console.log(
  `   - Features Active: ${enabledFeatures.length}/7 (${Math.round((enabledFeatures.length / 7) * 100)}%)`
);

console.log("\n✅ Feature flags test completed!");
