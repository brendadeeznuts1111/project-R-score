#!/usr/bin/env bun
import { feature } from "bun:bundle";
import { readFileSync } from "fs";
import { join } from "path";

console.log("🔍 DEV HQ Enhanced Feature Flag Verification");
console.log("==========================================\n");

// Load meta.json for performance impact and configuration data
let metaConfig: any = {};
try {
  const metaPath = join(import.meta.dir, "../meta.json");
  metaConfig = JSON.parse(readFileSync(metaPath, "utf-8"));
  console.log("✅ Loaded meta.json configuration");
} catch (error) {
  console.warn("⚠️  Could not load meta.json, using defaults");
}

// Enhanced feature list with new A/B testing flags
const allFeatures = [
  // Environment
  "ENV_DEVELOPMENT", "ENV_PRODUCTION", "ENV_STAGING", "ENV_TEST", "AUDIT_MODE",
  // Tier
  "FEAT_PREMIUM", "FEAT_FREE", "FEAT_ENTERPRISE",
  // Security
  "FEAT_ENCRYPTION", "FEAT_VALIDATION_STRICT", "FEAT_AUDIT_LOGGING",
  // Resilience
  "FEAT_AUTO_HEAL", "FEAT_CIRCUIT_BREAKER", "FEAT_RETRY_LOGIC",
  // Monitoring
  "FEAT_NOTIFICATIONS", "FEAT_ADVANCED_MONITORING", "FEAT_REAL_TIME_DASHBOARD", "FEAT_PERFORMANCE_TRACKING",
  // Performance
  "FEAT_BATCH_PROCESSING", "FEAT_CACHE_OPTIMIZED", "FEAT_COMPRESSION", "FEAT_ASYNC_OPERATIONS",
  // Logging
  "FEAT_EXTENDED_LOGGING", "FEAT_DEBUG_TOOLS", "FEAT_VERBOSE_OUTPUT",
  // Testing & A/B Testing
  "FEAT_MOCK_API", "FEAT_VARIANT_A", "FEAT_VARIANT_B",
  // Integration
  "INTEGRATION_GEELARK_API", "INTEGRATION_PROXY_SERVICE", "INTEGRATION_EMAIL_SERVICE", "INTEGRATION_SMS_SERVICE", "INTEGRATION_WEBHOOK",
];

// Feature dependencies and conflicts
const featureDependencies: Record<string, string[]> = {
  "FEAT_PREMIUM": ["FEAT_ENCRYPTION", "FEAT_ADVANCED_MONITORING"],
  "FEAT_ADVANCED_MONITORING": ["FEAT_NOTIFICATIONS"],
  "FEAT_BATCH_PROCESSING": ["FEAT_CACHE_OPTIMIZED"],
  "FEAT_VARIANT_A": ["FEAT_MOCK_API"],
  "FEAT_VARIANT_B": ["FEAT_MOCK_API"],
};

const featureConflicts: Record<string, string[]> = {
  "ENV_DEVELOPMENT": ["ENV_PRODUCTION", "ENV_STAGING", "ENV_TEST"],
  "ENV_PRODUCTION": ["ENV_DEVELOPMENT", "ENV_STAGING", "ENV_TEST"],
  "FEAT_MOCK_API": ["FEAT_ENCRYPTION"],
  "FEAT_VARIANT_A": ["FEAT_VARIANT_B"],
  "FEAT_VARIANT_B": ["FEAT_VARIANT_A"],
};

// Performance impact data from meta.json
const performanceImpacts = metaConfig?.featureFlags || {};

console.log("📋 Feature Status Report");
console.log("----------------------");

// Check features using Bun's feature() function with string literals
const featureStatus = {
  "ENV_DEVELOPMENT": feature("ENV_DEVELOPMENT"),
  "ENV_PRODUCTION": feature("ENV_PRODUCTION"),
  "ENV_STAGING": feature("ENV_STAGING"),
  "ENV_TEST": feature("ENV_TEST"),
  "AUDIT_MODE": feature("AUDIT_MODE"),
  "FEAT_PREMIUM": feature("FEAT_PREMIUM"),
  "FEAT_FREE": feature("FEAT_FREE"),
  "FEAT_ENTERPRISE": feature("FEAT_ENTERPRISE"),
  "FEAT_ENCRYPTION": feature("FEAT_ENCRYPTION"),
  "FEAT_VALIDATION_STRICT": feature("FEAT_VALIDATION_STRICT"),
  "FEAT_AUDIT_LOGGING": feature("FEAT_AUDIT_LOGGING"),
  "FEAT_AUTO_HEAL": feature("FEAT_AUTO_HEAL"),
  "FEAT_CIRCUIT_BREAKER": feature("FEAT_CIRCUIT_BREAKER"),
  "FEAT_RETRY_LOGIC": feature("FEAT_RETRY_LOGIC"),
  "FEAT_NOTIFICATIONS": feature("FEAT_NOTIFICATIONS"),
  "FEAT_ADVANCED_MONITORING": feature("FEAT_ADVANCED_MONITORING"),
  "FEAT_REAL_TIME_DASHBOARD": feature("FEAT_REAL_TIME_DASHBOARD"),
  "FEAT_PERFORMANCE_TRACKING": feature("FEAT_PERFORMANCE_TRACKING"),
  "FEAT_BATCH_PROCESSING": feature("FEAT_BATCH_PROCESSING"),
  "FEAT_CACHE_OPTIMIZED": feature("FEAT_CACHE_OPTIMIZED"),
  "FEAT_COMPRESSION": feature("FEAT_COMPRESSION"),
  "FEAT_ASYNC_OPERATIONS": feature("FEAT_ASYNC_OPERATIONS"),
  "FEAT_EXTENDED_LOGGING": feature("FEAT_EXTENDED_LOGGING"),
  "FEAT_DEBUG_TOOLS": feature("FEAT_DEBUG_TOOLS"),
  "FEAT_VERBOSE_OUTPUT": feature("FEAT_VERBOSE_OUTPUT"),
  "FEAT_MOCK_API": feature("FEAT_MOCK_API"),
  "FEAT_VARIANT_A": feature("FEAT_VARIANT_A"),
  "FEAT_VARIANT_B": feature("FEAT_VARIANT_B"),
  "INTEGRATION_GEELARK_API": feature("INTEGRATION_GEELARK_API"),
  "INTEGRATION_PROXY_SERVICE": feature("INTEGRATION_PROXY_SERVICE"),
  "INTEGRATION_EMAIL_SERVICE": feature("INTEGRATION_EMAIL_SERVICE"),
  "INTEGRATION_SMS_SERVICE": feature("INTEGRATION_SMS_SERVICE"),
  "INTEGRATION_WEBHOOK": feature("INTEGRATION_WEBHOOK"),
};

let enabledCount = 0;
const enabledFeatures: string[] = [];
const disabledFeatures: string[] = [];

for (const [flag, isEnabled] of Object.entries(featureStatus)) {
  if (isEnabled) {
    enabledCount++;
    enabledFeatures.push(flag);
  } else {
    disabledFeatures.push(flag);
  }

  const status = isEnabled ? "✅ ENABLED" : "❌ DISABLED";
  const impact = performanceImpacts[flag]?.impact?.performance || "N/A";
  console.log(`${status} ${flag.padEnd(25)} | Performance: ${impact.padEnd(8)}`);
}

console.log(`\n📊 Summary: ${enabledCount}/${allFeatures.length} features enabled (${Math.round(enabledCount/allFeatures.length*100)}%)`);

// Dependencies Analysis
console.log("\n🔗 Dependencies Analysis");
console.log("------------------------");

let dependencyIssues: string[] = [];
let conflictIssues: string[] = [];

for (const feature of enabledFeatures) {
  // Check dependencies
  const deps = featureDependencies[feature];
  if (deps) {
    for (const dep of deps) {
      if (!enabledFeatures.includes(dep)) {
        dependencyIssues.push(`${feature} requires ${dep} but it's disabled`);
      }
    }
  }

  // Check conflicts
  const conflicts = featureConflicts[feature];
  if (conflicts) {
    for (const conflict of conflicts) {
      if (enabledFeatures.includes(conflict)) {
        conflictIssues.push(`${feature} conflicts with ${conflict} (both enabled)`);
      }
    }
  }
}

if (dependencyIssues.length === 0 && conflictIssues.length === 0) {
  console.log("✅ No dependency or conflict issues found");
} else {
  if (dependencyIssues.length > 0) {
    console.log("⚠️  Dependency Issues:");
    dependencyIssues.forEach(issue => console.log(`   - ${issue}`));
  }
  if (conflictIssues.length > 0) {
    console.log("⚠️  Conflict Issues:");
    conflictIssues.forEach(issue => console.log(`   - ${issue}`));
  }
}

// Performance Impact Analysis
console.log("\n⚡ Performance Impact Analysis");
console.log("-----------------------------");

let totalPerformanceImpact = 0;
let performanceBreakdown: {
  positive: string[];
  negative: string[];
  neutral: string[];
} = {
  positive: [],
  negative: [],
  neutral: []
};

for (const feature of enabledFeatures) {
  const impact = performanceImpacts[feature]?.impact?.performance;
  if (impact && impact !== "N/A") {
    const value = parseInt(impact.replace(/[^-\d]/g, ''));
    totalPerformanceImpact += value;

    if (value > 0) {
      performanceBreakdown.positive.push(`${feature}: +${value}%`);
    } else if (value < 0) {
      performanceBreakdown.negative.push(`${feature}: ${value}%`);
    } else {
      performanceBreakdown.neutral.push(`${feature}: ${impact}`);
    }
  }
}

console.log(`📈 Net Performance Impact: ${totalPerformanceImpact > 0 ? '+' : ''}${totalPerformanceImpact}%`);

if (performanceBreakdown.positive.length > 0) {
  console.log("\n🟢 Performance Improvements:");
  performanceBreakdown.positive.forEach(imp => console.log(`   + ${imp}`));
}

if (performanceBreakdown.negative.length > 0) {
  console.log("\n🔴 Performance Overheads:");
  performanceBreakdown.negative.forEach(imp => console.log(`   - ${imp}`));
}

// Bundle Analysis Verification
console.log("\n📦 Bundle Analysis Verification");
console.log("------------------------------");

try {
  // Check if --analyze option is available in CLI configuration
  const cliCommands = metaConfig?.cli?.commands || {};
  const insightsCommand = cliCommands.insights || {};
  const hasAnalyzeOption = insightsCommand.options?.some((opt: any) => opt.flag === "--analyze");

  if (hasAnalyzeOption) {
    console.log("✅ Bundle analysis (--analyze) option is available");
    console.log("   Usage: bunx dev-hq insights --analyze");
  } else {
    console.log("⚠️  Bundle analysis option not found in CLI configuration");
  }

  // Check build configurations
  const buildConfigs = metaConfig?.build?.configurations || [];
  console.log(`📋 Found ${buildConfigs.length} build configurations:`);

  buildConfigs.forEach((config: any, index: number) => {
    const optimizations = config.optimizations?.join(", ") || "None";
    console.log(`   ${index + 1}. ${config.name}: ${optimizations}`);
  });

} catch (error) {
  console.warn("⚠️  Could not verify bundle analysis configuration");
}

// Build Configuration Analysis
console.log("\n🏗️  Build Configuration Analysis");
console.log("-------------------------------");

try {
  const buildConfigs = metaConfig?.build?.configurations || [];

  for (const config of buildConfigs) {
    console.log(`\n📦 ${config.name} Configuration:`);
    console.log(`   Command: ${config.cliCommand}`);
    console.log(`   Features: ${config.features?.join(", ") || "None"}`);
    console.log(`   Optimizations: ${config.optimizations?.join(", ") || "None"}`);
    console.log(`   Output: ${config.output}`);
    console.log(`   Size Estimate: ${config.sizeEstimate}`);
    console.log(`   Dead Code Elimination: ${config.deadCodeElimination || "N/A"}`);
  }
} catch (error) {
  console.warn("⚠️  Could not analyze build configurations");
}

// A/B Testing Status
console.log("\n🧪 A/B Testing Status");
console.log("---------------------");

const variantAEnabled = enabledFeatures.includes("FEAT_VARIANT_A");
const variantBEnabled = enabledFeatures.includes("FEAT_VARIANT_B");
const mockApiEnabled = enabledFeatures.includes("FEAT_MOCK_API");

if (variantAEnabled && variantBEnabled) {
  console.log("⚠️  Both variants A and B are enabled - this may cause conflicts");
} else if (variantAEnabled) {
  console.log("✅ Variant A is active (testing mode)");
} else if (variantBEnabled) {
  console.log("✅ Variant B is active (testing mode)");
} else {
  console.log("ℹ️  No A/B testing variants are enabled");
}

if (!mockApiEnabled && (variantAEnabled || variantBEnabled)) {
  console.log("⚠️  A/B testing variants require FEAT_MOCK_API to be enabled");
}

// Security Analysis
console.log("\n🔒 Security Analysis");
console.log("-------------------");

const encryptionEnabled = enabledFeatures.includes("FEAT_ENCRYPTION");
const validationStrict = enabledFeatures.includes("FEAT_VALIDATION_STRICT");
const auditLogging = enabledFeatures.includes("FEAT_AUDIT_LOGGING");

console.log(`🔐 Encryption: ${encryptionEnabled ? "✅ ENABLED" : "❌ DISABLED"}`);
console.log(`🛡️  Strict Validation: ${validationStrict ? "✅ ENABLED" : "❌ DISABLED"}`);
console.log(`📋 Audit Logging: ${auditLogging ? "✅ ENABLED" : "❌ DISABLED"}`);

if (!encryptionEnabled && enabledFeatures.includes("ENV_PRODUCTION")) {
  console.log("⚠️  WARNING: Production environment without encryption");
}

// Recommendations
console.log("\n💡 Recommendations");
console.log("------------------");

const recommendations: string[] = [];

if (!encryptionEnabled) {
  recommendations.push("Enable FEAT_ENCRYPTION for better security");
}

if (enabledFeatures.includes("ENV_PRODUCTION") && enabledFeatures.includes("FEAT_MOCK_API")) {
  recommendations.push("Disable FEAT_MOCK_API in production environment");
}

if (dependencyIssues.length > 0) {
  recommendations.push("Resolve dependency issues for optimal functionality");
}

if (conflictIssues.length > 0) {
  recommendations.push("Resolve feature conflicts to avoid unexpected behavior");
}

if (totalPerformanceImpact < -10) {
  recommendations.push("Consider optimizing feature selection for better performance");
}

if (recommendations.length === 0) {
  console.log("✅ Configuration looks good! No immediate recommendations.");
} else {
  recommendations.forEach((rec, index) => {
    console.log(`${index + 1}. ${rec}`);
  });
}

console.log("\n✅ Enhanced verification complete");
console.log(`📊 Generated comprehensive report with ${enabledCount} enabled features`);
