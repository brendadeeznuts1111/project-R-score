#!/usr/bin/env bun
import { feature } from "bun:bundle";
import { readFileSync } from "fs";
import { join } from "path";

console.info("🔍 DEV HQ Feature Flag Verification");
console.info("===================================\n");

// Load meta.json for configuration data
let metaConfig: any = {};
try {
  const metaPath = join(import.meta.dir, "../meta.json");
  metaConfig = JSON.parse(readFileSync(metaPath, "utf-8"));
  console.info("✅ Loaded meta.json configuration");
} catch (error) {
  console.warn("⚠️  Could not load meta.json, using defaults");
}

console.info("📋 Feature Status Report");
console.info("----------------------");

let enabledCount = 0;
const totalFeatures = 36; // Total number of features we're checking

// Check features using Bun's feature() function directly in if statements
function checkFeature(flagName: string, flagLiteral: string): boolean {
  if (feature(flagLiteral as any)) {
    console.info(`✅ ENABLED ${flagName.padEnd(25)}`);
    return true;
  } else {
    console.info(`❌ DISABLED ${flagName.padEnd(25)}`);
    return false;
  }
}

// Environment features
if (feature("ENV_DEVELOPMENT")) enabledCount++;
if (feature("ENV_PRODUCTION")) enabledCount++;
if (feature("ENV_STAGING")) enabledCount++;
if (feature("ENV_TEST")) enabledCount++;
if (feature("AUDIT_MODE")) enabledCount++;

// Tier features
if (feature("FEAT_PREMIUM")) enabledCount++;
if (feature("FEAT_FREE")) enabledCount++;
if (feature("FEAT_ENTERPRISE")) enabledCount++;

// Security features
if (feature("FEAT_ENCRYPTION")) enabledCount++;
if (feature("FEAT_VALIDATION_STRICT")) enabledCount++;
if (feature("FEAT_AUDIT_LOGGING")) enabledCount++;

// Resilience features
if (feature("FEAT_AUTO_HEAL")) enabledCount++;
if (feature("FEAT_CIRCUIT_BREAKER")) enabledCount++;
if (feature("FEAT_RETRY_LOGIC")) enabledCount++;

// Monitoring features
if (feature("FEAT_NOTIFICATIONS")) enabledCount++;
if (feature("FEAT_ADVANCED_MONITORING")) enabledCount++;
if (feature("FEAT_REAL_TIME_DASHBOARD")) enabledCount++;
if (feature("FEAT_PERFORMANCE_TRACKING")) enabledCount++;

// Performance features
if (feature("FEAT_BATCH_PROCESSING")) enabledCount++;
if (feature("FEAT_CACHE_OPTIMIZED")) enabledCount++;
if (feature("FEAT_COMPRESSION")) enabledCount++;
if (feature("FEAT_ASYNC_OPERATIONS")) enabledCount++;

// Logging features
if (feature("FEAT_EXTENDED_LOGGING")) enabledCount++;
if (feature("FEAT_DEBUG_TOOLS")) enabledCount++;
if (feature("FEAT_VERBOSE_OUTPUT")) enabledCount++;

// Testing & A/B Testing features
if (feature("FEAT_MOCK_API")) enabledCount++;
if (feature("FEAT_VARIANT_A")) enabledCount++;
if (feature("FEAT_VARIANT_B")) enabledCount++;

// Integration features
if (feature("INTEGRATION_GEELARK_API")) enabledCount++;
if (feature("INTEGRATION_PROXY_SERVICE")) enabledCount++;
if (feature("INTEGRATION_EMAIL_SERVICE")) enabledCount++;
if (feature("INTEGRATION_SMS_SERVICE")) enabledCount++;
if (feature("INTEGRATION_WEBHOOK")) enabledCount++;

console.info(`\n📊 Summary: ${enabledCount}/${totalFeatures} features enabled (${Math.round(enabledCount/totalFeatures*100)}%)`);

// A/B Testing Analysis
console.info("\n🧪 A/B Testing Status");
console.info("---------------------");

const variantAEnabled = feature("FEAT_VARIANT_A" as any);
const variantBEnabled = feature("FEAT_VARIANT_B" as any);
const mockApiEnabled = feature("FEAT_MOCK_API" as any);

if (variantAEnabled && variantBEnabled) {
  console.info("⚠️  Both variants A and B are enabled - this may cause conflicts");
} else if (variantAEnabled) {
  console.info("✅ Variant A is active (testing mode)");
} else if (variantBEnabled) {
  console.info("✅ Variant B is active (testing mode)");
} else {
  console.info("ℹ️  No A/B testing variants are enabled");
}

if (!mockApiEnabled && (variantAEnabled || variantBEnabled)) {
  console.info("⚠️  A/B testing variants require FEAT_MOCK_API to be enabled");
}

// Security Analysis
console.info("\n🔒 Security Analysis");
console.info("-------------------");

const encryptionEnabled = feature("FEAT_ENCRYPTION" as any);
const validationStrict = feature("FEAT_VALIDATION_STRICT" as any);
const auditLogging = feature("FEAT_AUDIT_LOGGING" as any);
const productionEnv = feature("ENV_PRODUCTION" as any);

console.info(`🔐 Encryption: ${encryptionEnabled ? "✅ ENABLED" : "❌ DISABLED"}`);
console.info(`🛡️  Strict Validation: ${validationStrict ? "✅ ENABLED" : "❌ DISABLED"}`);
console.info(`📋 Audit Logging: ${auditLogging ? "✅ ENABLED" : "❌ DISABLED"}`);

if (!encryptionEnabled && productionEnv) {
  console.info("⚠️  WARNING: Production environment without encryption");
}

// Bundle Analysis Verification
console.info("\n📦 Bundle Analysis Verification");
console.info("------------------------------");

try {
  const cliCommands = metaConfig?.cli?.commands || {};
  const insightsCommand = cliCommands.insights || {};
  const hasAnalyzeOption = insightsCommand.options?.some((opt: any) => opt.flag === "--analyze");

  if (hasAnalyzeOption) {
    console.info("✅ Bundle analysis (--analyze) option is available");
    console.info("   Usage: bunx dev-hq insights --analyze");
  } else {
    console.info("⚠️  Bundle analysis option not found in CLI configuration");
  }

  const buildConfigs = metaConfig?.build?.configurations || [];
  console.info(`📋 Found ${buildConfigs.length} build configurations`);

} catch (error) {
  console.warn("⚠️  Could not verify bundle analysis configuration");
}

// Recommendations
console.info("\n💡 Recommendations");
console.info("------------------");

const recommendations: string[] = [];

if (!encryptionEnabled) {
  recommendations.push("Enable FEAT_ENCRYPTION for better security");
}

if (productionEnv && feature("FEAT_MOCK_API" as any)) {
  recommendations.push("Disable FEAT_MOCK_API in production environment");
}

if (enabledCount < totalFeatures * 0.5) {
  recommendations.push("Consider enabling more features for full functionality");
}

if (recommendations.length === 0) {
  console.info("✅ Configuration looks good! No immediate recommendations.");
} else {
  recommendations.forEach((rec, index) => {
    console.info(`${index + 1}. ${rec}`);
  });
}

console.info("\n✅ Feature verification complete");
console.info(`🚀 Dev HQ is running with ${enabledCount} active features`);
