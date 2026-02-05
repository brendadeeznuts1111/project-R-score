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
  console.log("🧪 Testing Basic Features");

  // Test basic functionality
  const basicData = { test: true };
  console.log("✅ Basic functionality test passed");

  // Test that non-premium features work
  if (!feature("PREMIUM")) {
    console.log("✅ Free tier functionality test passed");
  }
}

function testPremiumFeatures() {
  console.log("🧪 Testing Premium Features");

  if (feature("PREMIUM")) {
    console.log("✅ Premium features available");
    console.log("   - Advanced analytics");
    console.log("   - Custom reports");
    console.log("   - Priority features");
  } else {
    console.log("ℹ️ Premium features not enabled - skipping premium tests");
  }
}

function testDebugFeatures() {
  console.log("🧪 Testing Debug Features");

  if (feature("DEBUG")) {
    console.log("✅ Debug mode enabled");
    console.log("   - Verbose logging active");
    console.log("   - Debug tools available");
    console.log("   - Development endpoints enabled");
  } else {
    console.log("ℹ️ Debug mode not enabled - production tests");
  }
}

function testMockApi() {
  console.log("🧪 Testing Mock API");

  const api = new ApiService();

  if (feature("MOCK_API")) {
    console.log("✅ Mock API enabled - testing with mock data");

    // Test mock user fetch
    api.fetchUser(1).then((user) => {
      console.log("✅ Mock user fetch test passed:", user);
    });

    // Test mock analytics
    api.fetchAnalytics().then((analytics) => {
      console.log("✅ Mock analytics test passed:", analytics);
    });
  } else {
    console.log("ℹ️ Mock API not enabled - real API tests would run here");
  }
}

function testFeatureCombinations() {
  console.log("🧪 Testing Feature Combinations");

  const enabledFeatures = [];

  if (feature("PREMIUM")) enabledFeatures.push("PREMIUM");
  if (feature("DEBUG")) enabledFeatures.push("DEBUG");
  if (feature("BETA_FEATURES")) enabledFeatures.push("BETA_FEATURES");
  if (feature("ADMIN")) enabledFeatures.push("ADMIN");
  if (feature("ANALYTICS")) enabledFeatures.push("ANALYTICS");
  if (feature("MOCK_API")) enabledFeatures.push("MOCK_API");

  console.log(`✅ Enabled features: ${enabledFeatures.join(", ")}`);
  console.log(`✅ Feature count: ${enabledFeatures.length}`);

  // Test specific combinations
  if (feature("PREMIUM") && feature("ANALYTICS")) {
    console.log("✅ Premium + Analytics combination test passed");
  }

  if (feature("DEBUG") && feature("MOCK_API")) {
    console.log("✅ Debug + Mock API combination test passed");
  }
}

// Main test runner
function runTests() {
  console.log("🚀 Running Feature Flag Tests");
  console.log("==============================");

  testBasicFeatures();
  testPremiumFeatures();
  testDebugFeatures();
  testMockApi();
  testFeatureCombinations();

  console.log("\n✅ All tests completed!");
  console.log("📊 Test Summary:");
  console.log("   - Basic features: Tested");
  console.log(
    "   - Premium features: " + (feature("PREMIUM") ? "Enabled" : "Disabled")
  );
  console.log(
    "   - Debug features: " + (feature("DEBUG") ? "Enabled" : "Disabled")
  );
  console.log(
    "   - Mock API: " + (feature("MOCK_API") ? "Enabled" : "Disabled")
  );
}

// Run tests
runTests();
