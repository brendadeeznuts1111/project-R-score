#!/usr/bin/env bun

// Test file demonstrating feature flags in testing
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

// Mock API service
class ApiService {
  async fetchUser(id: number) {
    if (feature("MOCK_API")) {
      // Mock API response
      return {
        id,
        name: `Mock User ${id}`,
        email: `mock${id}@example.com`,
        premium: feature("PREMIUM") ? true : false,
      };
    } else {
      // Real API call (would be implemented)
      throw new Error("Real API not implemented in this demo");
    }
  }

  async fetchAnalytics() {
    if (feature("ANALYTICS")) {
      if (feature("MOCK_API")) {
        return {
          users: 1000,
          requests: 10000,
          errors: 50,
          performance: 95,
        };
      }
      throw new Error("Real analytics API not implemented");
    }
    return null;
  }
}

// Test functions
function testBasicFeatures() {
  console.info("🧪 Testing Basic Features");

  // Test basic functionality
  const basicData = { test: true };
  console.info("✅ Basic functionality test passed");

  // Test that non-premium features work
  if (!feature("PREMIUM")) {
    console.info("✅ Free tier functionality test passed");
  }
}

function testPremiumFeatures() {
  console.info("🧪 Testing Premium Features");

  if (feature("PREMIUM")) {
    console.info("✅ Premium features available");
    console.info("   - Advanced analytics");
    console.info("   - Custom reports");
    console.info("   - Priority features");
  } else {
    console.info("ℹ️ Premium features not enabled - skipping premium tests");
  }
}

function testDebugFeatures() {
  console.info("🧪 Testing Debug Features");

  if (feature("DEBUG")) {
    console.info("✅ Debug mode enabled");
    console.info("   - Verbose logging active");
    console.info("   - Debug tools available");
    console.info("   - Development endpoints enabled");
  } else {
    console.info("ℹ️ Debug mode not enabled - production tests");
  }
}

function testMockApi() {
  console.info("🧪 Testing Mock API");

  const api = new ApiService();

  if (feature("MOCK_API")) {
    console.info("✅ Mock API enabled - testing with mock data");

    // Test mock user fetch
    api.fetchUser(1).then((user) => {
      console.info("✅ Mock user fetch test passed:", user);
    });

    // Test mock analytics
    api.fetchAnalytics().then((analytics) => {
      console.info("✅ Mock analytics test passed:", analytics);
    });
  } else {
    console.info("ℹ️ Mock API not enabled - real API tests would run here");
  }
}

function testFeatureCombinations() {
  console.info("🧪 Testing Feature Combinations");

  const enabledFeatures = [];

  if (feature("PREMIUM")) enabledFeatures.push("PREMIUM");
  if (feature("DEBUG")) enabledFeatures.push("DEBUG");
  if (feature("BETA_FEATURES")) enabledFeatures.push("BETA_FEATURES");
  if (feature("ADMIN")) enabledFeatures.push("ADMIN");
  if (feature("ANALYTICS")) enabledFeatures.push("ANALYTICS");
  if (feature("MOCK_API")) enabledFeatures.push("MOCK_API");

  console.info(`✅ Enabled features: ${enabledFeatures.join(", ")}`);
  console.info(`✅ Feature count: ${enabledFeatures.length}`);

  // Test specific combinations
  if (feature("PREMIUM") && feature("ANALYTICS")) {
    console.info("✅ Premium + Analytics combination test passed");
  }

  if (feature("DEBUG") && feature("MOCK_API")) {
    console.info("✅ Debug + Mock API combination test passed");
  }
}

// Main test runner
function runTests() {
  console.info("🚀 Running Feature Flag Tests");
  console.info("==============================");

  testBasicFeatures();
  testPremiumFeatures();
  testDebugFeatures();
  testMockApi();
  testFeatureCombinations();

  console.info("\n✅ All tests completed!");
  console.info("📊 Test Summary:");
  console.info("   - Basic features: Tested");
  console.info(
    "   - Premium features: " + (feature("PREMIUM") ? "Enabled" : "Disabled")
  );
  console.info(
    "   - Debug features: " + (feature("DEBUG") ? "Enabled" : "Disabled")
  );
  console.info(
    "   - Mock API: " + (feature("MOCK_API") ? "Enabled" : "Disabled")
  );
}

// Run tests
runTests();
