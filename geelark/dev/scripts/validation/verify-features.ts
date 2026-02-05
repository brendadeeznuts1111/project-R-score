#!/usr/bin/env bun
import { feature } from "bun:bundle";
import { readFileSync } from "fs";
import { join } from "path";

console.log("🔍 DEV HQ Feature Flag Verification");
console.log("===================================\n");

// Load meta.json for configuration data
try {
  const metaPath = join(import.meta.dir, "../meta.json");
  const metaConfig = JSON.parse(readFileSync(metaPath, "utf-8"));
  console.log("✅ Loaded meta.json configuration");
} catch (error) {
  console.warn("⚠️  Could not load meta.json, using defaults");
}

console.log("📋 Feature Status Report");
console.log("----------------------");

let enabledCount = 0;
const totalFeatures = 36;

// Check features using Bun's feature() function directly in if statements
// Environment features
if (feature("ENV_DEVELOPMENT")) { console.log("✅ ENABLED ENV_DEVELOPMENT"); enabledCount++; } else { console.log("❌ DISABLED ENV_DEVELOPMENT"); }
if (feature("ENV_PRODUCTION")) { console.log("✅ ENABLED ENV_PRODUCTION"); enabledCount++; } else { console.log("❌ DISABLED ENV_PRODUCTION"); }
if (feature("ENV_STAGING")) { console.log("✅ ENABLED ENV_STAGING"); enabledCount++; } else { console.log("❌ DISABLED ENV_STAGING"); }
if (feature("ENV_TEST")) { console.log("✅ ENABLED ENV_TEST"); enabledCount++; } else { console.log("❌ DISABLED ENV_TEST"); }
if (feature("AUDIT_MODE")) { console.log("✅ ENABLED AUDIT_MODE"); enabledCount++; } else { console.log("❌ DISABLED AUDIT_MODE"); }

// Tier features
if (feature("FEAT_PREMIUM")) { console.log("✅ ENABLED FEAT_PREMIUM"); enabledCount++; } else { console.log("❌ DISABLED FEAT_PREMIUM"); }
if (feature("FEAT_FREE")) { console.log("✅ ENABLED FEAT_FREE"); enabledCount++; } else { console.log("❌ DISABLED FEAT_FREE"); }
if (feature("FEAT_ENTERPRISE")) { console.log("✅ ENABLED FEAT_ENTERPRISE"); enabledCount++; } else { console.log("❌ DISABLED FEAT_ENTERPRISE"); }

// Security features
if (feature("FEAT_ENCRYPTION")) { console.log("✅ ENABLED FEAT_ENCRYPTION"); enabledCount++; } else { console.log("❌ DISABLED FEAT_ENCRYPTION"); }
if (feature("FEAT_VALIDATION_STRICT")) { console.log("✅ ENABLED FEAT_VALIDATION_STRICT"); enabledCount++; } else { console.log("❌ DISABLED FEAT_VALIDATION_STRICT"); }
if (feature("FEAT_AUDIT_LOGGING")) { console.log("✅ ENABLED FEAT_AUDIT_LOGGING"); enabledCount++; } else { console.log("❌ DISABLED FEAT_AUDIT_LOGGING"); }

// Resilience features
if (feature("FEAT_AUTO_HEAL")) { console.log("✅ ENABLED FEAT_AUTO_HEAL"); enabledCount++; } else { console.log("❌ DISABLED FEAT_AUTO_HEAL"); }
if (feature("FEAT_CIRCUIT_BREAKER")) { console.log("✅ ENABLED FEAT_CIRCUIT_BREAKER"); enabledCount++; } else { console.log("❌ DISABLED FEAT_CIRCUIT_BREAKER"); }
if (feature("FEAT_RETRY_LOGIC")) { console.log("✅ ENABLED FEAT_RETRY_LOGIC"); enabledCount++; } else { console.log("❌ DISABLED FEAT_RETRY_LOGIC"); }

// Monitoring features
if (feature("FEAT_NOTIFICATIONS")) { console.log("✅ ENABLED FEAT_NOTIFICATIONS"); enabledCount++; } else { console.log("❌ DISABLED FEAT_NOTIFICATIONS"); }
if (feature("FEAT_ADVANCED_MONITORING")) { console.log("✅ ENABLED FEAT_ADVANCED_MONITORING"); enabledCount++; } else { console.log("❌ DISABLED FEAT_ADVANCED_MONITORING"); }
if (feature("FEAT_REAL_TIME_DASHBOARD")) { console.log("✅ ENABLED FEAT_REAL_TIME_DASHBOARD"); enabledCount++; } else { console.log("❌ DISABLED FEAT_REAL_TIME_DASHBOARD"); }
if (feature("FEAT_PERFORMANCE_TRACKING")) { console.log("✅ ENABLED FEAT_PERFORMANCE_TRACKING"); enabledCount++; } else { console.log("❌ DISABLED FEAT_PERFORMANCE_TRACKING"); }

// Performance features
if (feature("FEAT_BATCH_PROCESSING")) { console.log("✅ ENABLED FEAT_BATCH_PROCESSING"); enabledCount++; } else { console.log("❌ DISABLED FEAT_BATCH_PROCESSING"); }
if (feature("FEAT_CACHE_OPTIMIZED")) { console.log("✅ ENABLED FEAT_CACHE_OPTIMIZED"); enabledCount++; } else { console.log("❌ DISABLED FEAT_CACHE_OPTIMIZED"); }
if (feature("FEAT_COMPRESSION")) { console.log("✅ ENABLED FEAT_COMPRESSION"); enabledCount++; } else { console.log("❌ DISABLED FEAT_COMPRESSION"); }
if (feature("FEAT_ASYNC_OPERATIONS")) { console.log("✅ ENABLED FEAT_ASYNC_OPERATIONS"); enabledCount++; } else { console.log("❌ DISABLED FEAT_ASYNC_OPERATIONS"); }

// Logging features
if (feature("FEAT_EXTENDED_LOGGING")) { console.log("✅ ENABLED FEAT_EXTENDED_LOGGING"); enabledCount++; } else { console.log("❌ DISABLED FEAT_EXTENDED_LOGGING"); }
if (feature("FEAT_DEBUG_TOOLS")) { console.log("✅ ENABLED FEAT_DEBUG_TOOLS"); enabledCount++; } else { console.log("❌ DISABLED FEAT_DEBUG_TOOLS"); }
if (feature("FEAT_VERBOSE_OUTPUT")) { console.log("✅ ENABLED FEAT_VERBOSE_OUTPUT"); enabledCount++; } else { console.log("❌ DISABLED FEAT_VERBOSE_OUTPUT"); }

// Testing & A/B Testing features
if (feature("FEAT_MOCK_API")) { console.log("✅ ENABLED FEAT_MOCK_API"); enabledCount++; } else { console.log("❌ DISABLED FEAT_MOCK_API"); }
if (feature("FEAT_VARIANT_A")) { console.log("✅ ENABLED FEAT_VARIANT_A"); enabledCount++; } else { console.log("❌ DISABLED FEAT_VARIANT_A"); }
if (feature("FEAT_VARIANT_B")) { console.log("✅ ENABLED FEAT_VARIANT_B"); enabledCount++; } else { console.log("❌ DISABLED FEAT_VARIANT_B"); }

// Integration features
if (feature("INTEGRATION_GEELARK_API")) { console.log("✅ ENABLED INTEGRATION_GEELARK_API"); enabledCount++; } else { console.log("❌ DISABLED INTEGRATION_GEELARK_API"); }
if (feature("INTEGRATION_PROXY_SERVICE")) { console.log("✅ ENABLED INTEGRATION_PROXY_SERVICE"); enabledCount++; } else { console.log("❌ DISABLED INTEGRATION_PROXY_SERVICE"); }
if (feature("INTEGRATION_EMAIL_SERVICE")) { console.log("✅ ENABLED INTEGRATION_EMAIL_SERVICE"); enabledCount++; } else { console.log("❌ DISABLED INTEGRATION_EMAIL_SERVICE"); }
if (feature("INTEGRATION_SMS_SERVICE")) { console.log("✅ ENABLED INTEGRATION_SMS_SERVICE"); enabledCount++; } else { console.log("❌ DISABLED INTEGRATION_SMS_SERVICE"); }
if (feature("INTEGRATION_WEBHOOK")) { console.log("✅ ENABLED INTEGRATION_WEBHOOK"); enabledCount++; } else { console.log("❌ DISABLED INTEGRATION_WEBHOOK"); }

console.log(`\n📊 Summary: ${enabledCount}/${totalFeatures} features enabled (${Math.round(enabledCount/totalFeatures*100)}%)`);

// A/B Testing Analysis
console.log("\n🧪 A/B Testing Status");
console.log("---------------------");

if (feature("FEAT_VARIANT_A") && feature("FEAT_VARIANT_B")) {
  console.log("⚠️  Both variants A and B are enabled - this may cause conflicts");
} else if (feature("FEAT_VARIANT_A")) {
  console.log("✅ Variant A is active (testing mode)");
} else if (feature("FEAT_VARIANT_B")) {
  console.log("✅ Variant B is active (testing mode)");
} else {
  console.log("ℹ️  No A/B testing variants are enabled");
}

if (!feature("FEAT_MOCK_API") && (feature("FEAT_VARIANT_A") || feature("FEAT_VARIANT_B"))) {
  console.log("⚠️  A/B testing variants require FEAT_MOCK_API to be enabled");
}

// Security Analysis
console.log("\n🔒 Security Analysis");
console.log("-------------------");

console.log(`🔐 Encryption: ${feature("FEAT_ENCRYPTION") ? "✅ ENABLED" : "❌ DISABLED"}`);
console.log(`🛡️  Strict Validation: ${feature("FEAT_VALIDATION_STRICT") ? "✅ ENABLED" : "❌ DISABLED"}`);
console.log(`📋 Audit Logging: ${feature("FEAT_AUDIT_LOGGING") ? "✅ ENABLED" : "❌ DISABLED"}`);

if (!feature("FEAT_ENCRYPTION") && feature("ENV_PRODUCTION")) {
  console.log("⚠️  WARNING: Production environment without encryption");
}

// Recommendations
console.log("\n💡 Recommendations");
console.log("------------------");

if (!feature("FEAT_ENCRYPTION")) {
  console.log("1. Enable FEAT_ENCRYPTION for better security");
}

if (feature("ENV_PRODUCTION") && feature("FEAT_MOCK_API")) {
  console.log("2. Disable FEAT_MOCK_API in production environment");
}

if (enabledCount < totalFeatures * 0.5) {
  console.log("3. Consider enabling more features for full functionality");
}

if (feature("FEAT_ENCRYPTION") && !feature("FEAT_VALIDATION_STRICT")) {
  console.log("4. Consider enabling FEAT_VALIDATION_STRICT for better security");
}

console.log("\n✅ Feature verification complete");
console.log(`🚀 Dev HQ is running with ${enabledCount} active features`);
