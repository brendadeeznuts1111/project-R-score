#!/usr/bin/env bun
import { feature } from "bun:bundle";
import { readFileSync } from "fs";
import { join } from "path";

console.info("🔍 DEV HQ Feature Flag Verification");
console.info("===================================\n");

// Load meta.json for configuration data
try {
  const metaPath = join(import.meta.dir, "../meta.json");
  const metaConfig = JSON.parse(readFileSync(metaPath, "utf-8"));
  console.info("✅ Loaded meta.json configuration");
} catch (error) {
  console.warn("⚠️  Could not load meta.json, using defaults");
}

console.info("📋 Feature Status Report");
console.info("----------------------");

let enabledCount = 0;
const totalFeatures = 36;

// Check features using Bun's feature() function directly in if statements
// Environment features
if (feature("ENV_DEVELOPMENT")) { console.info("✅ ENABLED ENV_DEVELOPMENT"); enabledCount++; } else { console.info("❌ DISABLED ENV_DEVELOPMENT"); }
if (feature("ENV_PRODUCTION")) { console.info("✅ ENABLED ENV_PRODUCTION"); enabledCount++; } else { console.info("❌ DISABLED ENV_PRODUCTION"); }
if (feature("ENV_STAGING")) { console.info("✅ ENABLED ENV_STAGING"); enabledCount++; } else { console.info("❌ DISABLED ENV_STAGING"); }
if (feature("ENV_TEST")) { console.info("✅ ENABLED ENV_TEST"); enabledCount++; } else { console.info("❌ DISABLED ENV_TEST"); }
if (feature("AUDIT_MODE")) { console.info("✅ ENABLED AUDIT_MODE"); enabledCount++; } else { console.info("❌ DISABLED AUDIT_MODE"); }

// Tier features
if (feature("FEAT_PREMIUM")) { console.info("✅ ENABLED FEAT_PREMIUM"); enabledCount++; } else { console.info("❌ DISABLED FEAT_PREMIUM"); }
if (feature("FEAT_FREE")) { console.info("✅ ENABLED FEAT_FREE"); enabledCount++; } else { console.info("❌ DISABLED FEAT_FREE"); }
if (feature("FEAT_ENTERPRISE")) { console.info("✅ ENABLED FEAT_ENTERPRISE"); enabledCount++; } else { console.info("❌ DISABLED FEAT_ENTERPRISE"); }

// Security features
if (feature("FEAT_ENCRYPTION")) { console.info("✅ ENABLED FEAT_ENCRYPTION"); enabledCount++; } else { console.info("❌ DISABLED FEAT_ENCRYPTION"); }
if (feature("FEAT_VALIDATION_STRICT")) { console.info("✅ ENABLED FEAT_VALIDATION_STRICT"); enabledCount++; } else { console.info("❌ DISABLED FEAT_VALIDATION_STRICT"); }
if (feature("FEAT_AUDIT_LOGGING")) { console.info("✅ ENABLED FEAT_AUDIT_LOGGING"); enabledCount++; } else { console.info("❌ DISABLED FEAT_AUDIT_LOGGING"); }

// Resilience features
if (feature("FEAT_AUTO_HEAL")) { console.info("✅ ENABLED FEAT_AUTO_HEAL"); enabledCount++; } else { console.info("❌ DISABLED FEAT_AUTO_HEAL"); }
if (feature("FEAT_CIRCUIT_BREAKER")) { console.info("✅ ENABLED FEAT_CIRCUIT_BREAKER"); enabledCount++; } else { console.info("❌ DISABLED FEAT_CIRCUIT_BREAKER"); }
if (feature("FEAT_RETRY_LOGIC")) { console.info("✅ ENABLED FEAT_RETRY_LOGIC"); enabledCount++; } else { console.info("❌ DISABLED FEAT_RETRY_LOGIC"); }

// Monitoring features
if (feature("FEAT_NOTIFICATIONS")) { console.info("✅ ENABLED FEAT_NOTIFICATIONS"); enabledCount++; } else { console.info("❌ DISABLED FEAT_NOTIFICATIONS"); }
if (feature("FEAT_ADVANCED_MONITORING")) { console.info("✅ ENABLED FEAT_ADVANCED_MONITORING"); enabledCount++; } else { console.info("❌ DISABLED FEAT_ADVANCED_MONITORING"); }
if (feature("FEAT_REAL_TIME_DASHBOARD")) { console.info("✅ ENABLED FEAT_REAL_TIME_DASHBOARD"); enabledCount++; } else { console.info("❌ DISABLED FEAT_REAL_TIME_DASHBOARD"); }
if (feature("FEAT_PERFORMANCE_TRACKING")) { console.info("✅ ENABLED FEAT_PERFORMANCE_TRACKING"); enabledCount++; } else { console.info("❌ DISABLED FEAT_PERFORMANCE_TRACKING"); }

// Performance features
if (feature("FEAT_BATCH_PROCESSING")) { console.info("✅ ENABLED FEAT_BATCH_PROCESSING"); enabledCount++; } else { console.info("❌ DISABLED FEAT_BATCH_PROCESSING"); }
if (feature("FEAT_CACHE_OPTIMIZED")) { console.info("✅ ENABLED FEAT_CACHE_OPTIMIZED"); enabledCount++; } else { console.info("❌ DISABLED FEAT_CACHE_OPTIMIZED"); }
if (feature("FEAT_COMPRESSION")) { console.info("✅ ENABLED FEAT_COMPRESSION"); enabledCount++; } else { console.info("❌ DISABLED FEAT_COMPRESSION"); }
if (feature("FEAT_ASYNC_OPERATIONS")) { console.info("✅ ENABLED FEAT_ASYNC_OPERATIONS"); enabledCount++; } else { console.info("❌ DISABLED FEAT_ASYNC_OPERATIONS"); }

// Logging features
if (feature("FEAT_EXTENDED_LOGGING")) { console.info("✅ ENABLED FEAT_EXTENDED_LOGGING"); enabledCount++; } else { console.info("❌ DISABLED FEAT_EXTENDED_LOGGING"); }
if (feature("FEAT_DEBUG_TOOLS")) { console.info("✅ ENABLED FEAT_DEBUG_TOOLS"); enabledCount++; } else { console.info("❌ DISABLED FEAT_DEBUG_TOOLS"); }
if (feature("FEAT_VERBOSE_OUTPUT")) { console.info("✅ ENABLED FEAT_VERBOSE_OUTPUT"); enabledCount++; } else { console.info("❌ DISABLED FEAT_VERBOSE_OUTPUT"); }

// Testing & A/B Testing features
if (feature("FEAT_MOCK_API")) { console.info("✅ ENABLED FEAT_MOCK_API"); enabledCount++; } else { console.info("❌ DISABLED FEAT_MOCK_API"); }
if (feature("FEAT_VARIANT_A")) { console.info("✅ ENABLED FEAT_VARIANT_A"); enabledCount++; } else { console.info("❌ DISABLED FEAT_VARIANT_A"); }
if (feature("FEAT_VARIANT_B")) { console.info("✅ ENABLED FEAT_VARIANT_B"); enabledCount++; } else { console.info("❌ DISABLED FEAT_VARIANT_B"); }

// Integration features
if (feature("INTEGRATION_GEELARK_API")) { console.info("✅ ENABLED INTEGRATION_GEELARK_API"); enabledCount++; } else { console.info("❌ DISABLED INTEGRATION_GEELARK_API"); }
if (feature("INTEGRATION_PROXY_SERVICE")) { console.info("✅ ENABLED INTEGRATION_PROXY_SERVICE"); enabledCount++; } else { console.info("❌ DISABLED INTEGRATION_PROXY_SERVICE"); }
if (feature("INTEGRATION_EMAIL_SERVICE")) { console.info("✅ ENABLED INTEGRATION_EMAIL_SERVICE"); enabledCount++; } else { console.info("❌ DISABLED INTEGRATION_EMAIL_SERVICE"); }
if (feature("INTEGRATION_SMS_SERVICE")) { console.info("✅ ENABLED INTEGRATION_SMS_SERVICE"); enabledCount++; } else { console.info("❌ DISABLED INTEGRATION_SMS_SERVICE"); }
if (feature("INTEGRATION_WEBHOOK")) { console.info("✅ ENABLED INTEGRATION_WEBHOOK"); enabledCount++; } else { console.info("❌ DISABLED INTEGRATION_WEBHOOK"); }

console.info(`\n📊 Summary: ${enabledCount}/${totalFeatures} features enabled (${Math.round(enabledCount/totalFeatures*100)}%)`);

// A/B Testing Analysis
console.info("\n🧪 A/B Testing Status");
console.info("---------------------");

if (feature("FEAT_VARIANT_A") && feature("FEAT_VARIANT_B")) {
  console.info("⚠️  Both variants A and B are enabled - this may cause conflicts");
} else if (feature("FEAT_VARIANT_A")) {
  console.info("✅ Variant A is active (testing mode)");
} else if (feature("FEAT_VARIANT_B")) {
  console.info("✅ Variant B is active (testing mode)");
} else {
  console.info("ℹ️  No A/B testing variants are enabled");
}

if (!feature("FEAT_MOCK_API") && (feature("FEAT_VARIANT_A") || feature("FEAT_VARIANT_B"))) {
  console.info("⚠️  A/B testing variants require FEAT_MOCK_API to be enabled");
}

// Security Analysis
console.info("\n🔒 Security Analysis");
console.info("-------------------");

console.info(`🔐 Encryption: ${feature("FEAT_ENCRYPTION") ? "✅ ENABLED" : "❌ DISABLED"}`);
console.info(`🛡️  Strict Validation: ${feature("FEAT_VALIDATION_STRICT") ? "✅ ENABLED" : "❌ DISABLED"}`);
console.info(`📋 Audit Logging: ${feature("FEAT_AUDIT_LOGGING") ? "✅ ENABLED" : "❌ DISABLED"}`);

if (!feature("FEAT_ENCRYPTION") && feature("ENV_PRODUCTION")) {
  console.info("⚠️  WARNING: Production environment without encryption");
}

// Recommendations
console.info("\n💡 Recommendations");
console.info("------------------");

if (!feature("FEAT_ENCRYPTION")) {
  console.info("1. Enable FEAT_ENCRYPTION for better security");
}

if (feature("ENV_PRODUCTION") && feature("FEAT_MOCK_API")) {
  console.info("2. Disable FEAT_MOCK_API in production environment");
}

if (enabledCount < totalFeatures * 0.5) {
  console.info("3. Consider enabling more features for full functionality");
}

if (feature("FEAT_ENCRYPTION") && !feature("FEAT_VALIDATION_STRICT")) {
  console.info("4. Consider enabling FEAT_VALIDATION_STRICT for better security");
}

console.info("\n✅ Feature verification complete");
console.info(`🚀 Dev HQ is running with ${enabledCount} active features`);
