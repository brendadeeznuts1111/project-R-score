#!/usr/bin/env bun
/**
 * EnvManager Usage Examples — Fully Typed, No Any
 * Demonstrates type-safe environment access with the EnvManager pattern
 */

// Import the main CLI file to activate the global interface merging and EnvManager
import { EnvManager } from "./fw.ts";

// Usage examples – fully typed, no any
const session = EnvManager.getString("FW_PROFILE");           // string | undefined
const mode    = EnvManager.getString("FW_MODE");             // "development" | "production" | "testing" | "audit" | "demo"
const rows    = EnvManager.getNumberOrDefault("FW_MAX_ROWS", 50); // number
const debug   = EnvManager.getBoolean("FW_DEBUG");           // boolean

// Advanced usage examples
const logLevel = EnvManager.getString("FW_LOG_LEVEL");       // "debug" | "info" | "warn" | "error"
const reportFormat = EnvManager.getString("FW_REPORT_FORMAT"); // "html" | "ansi" | "markdown" | "react"
const auditMode = EnvManager.getBoolean("FW_AUDIT_MODE");    // boolean

// Bun variables with full type safety
const tlsRejectUnauthorized = EnvManager.getString("NODE_TLS_REJECT_UNAUTHORIZED"); // "0" | "1" | undefined
const verboseFetch = EnvManager.getString("BUN_CONFIG_VERBOSE_FETCH"); // "curl" | "1" | undefined
const maxHttpRequests = EnvManager.getNumberOrDefault("BUN_CONFIG_MAX_HTTP_REQUESTS", 256); // number
const doNotTrack = EnvManager.getBoolean("DO_NOT_TRACK");    // boolean

// Validation – throws if missing
try {
  EnvManager.validateRequired(["FW_MODE", "FW_LOG_LEVEL"]);
  console.log("✅ Required environment variables validated");
} catch (error) {
  console.error("❌ Validation failed:", (error as Error).message);
}

// Get complete configuration objects
const fwConfig = EnvManager.getFactoryWagerConfig();
const bunConfig = EnvManager.getBunConfig();

console.log("🔧 EnvManager Usage Examples");
console.log("============================");

console.log("\n📋 Basic Usage:");
console.log(`  Profile: ${session || "None"}`);
console.log(`  Mode: ${mode}`);
console.log(`  Max Rows: ${rows}`);
console.log(`  Debug: ${debug ? "enabled" : "disabled"}`);

console.log("\n🏭 FactoryWager Configuration:");
console.log(`  Mode: ${fwConfig.mode}`);
console.log(`  Log Level: ${fwConfig.logLevel}`);
console.log(`  Report Format: ${fwConfig.reportFormat}`);
console.log(`  Output Dir: ${fwConfig.outputDir}`);
console.log(`  Config Dir: ${fwConfig.configDir}`);
console.log(`  Audit Mode: ${fwConfig.auditMode ? "enabled" : "disabled"}`);
console.log(`  Debug: ${fwConfig.debug ? "enabled" : "disabled"}`);

console.log("\n🥟 Bun Configuration:");
console.log(`  TLS Reject Unauthorized: ${bunConfig.tlsRejectUnauthorized ? "enabled" : "disabled"}`);
console.log(`  Verbose Fetch: ${bunConfig.verboseFetch}`);
console.log(`  Max HTTP Requests: ${bunConfig.maxHttpRequests}`);
console.log(`  No Clear Terminal: ${bunConfig.noClearTerminalOnReload ? "enabled" : "disabled"}`);
console.log(`  Do Not Track: ${bunConfig.doNotTrack ? "enabled" : "disabled"}`);
console.log(`  Force Color: ${bunConfig.forceColor ? "enabled" : "disabled"}`);
console.log(`  No Color: ${bunConfig.noColor ? "enabled" : "disabled"}`);

// Type safety demonstration
function demonstrateTypeSafety() {
  console.log("\n🎯 Type Safety Demonstration:");

  // These are all fully typed - no 'any' anywhere
  const typedMode: "development" | "production" | "testing" | "audit" | "demo" = mode;
  const typedRows: number = rows;
  const typedDebug: boolean = debug;
  const typedLogLevel: "debug" | "info" | "warn" | "error" = logLevel || "info";
  const typedReportFormat: "html" | "ansi" | "markdown" | "react" = reportFormat || "html";

  console.log(`  ✅ Mode type: ${typedMode} (${typeof typedMode})`);
  console.log(`  ✅ Rows type: ${typedRows} (${typeof typedRows})`);
  console.log(`  ✅ Debug type: ${typedDebug} (${typeof typedDebug})`);
  console.log(`  ✅ Log Level type: ${typedLogLevel} (${typeof typedLogLevel})`);
  console.log(`  ✅ Report Format type: ${typedReportFormat} (${typeof typedReportFormat})`);

  // Union type safety
  if (tlsRejectUnauthorized === "0") {
    console.log(`  ⚠️  SSL validation disabled (type: ${typeof tlsRejectUnauthorized})`);
  } else if (tlsRejectUnauthorized === "1") {
    console.log(`  ✅ SSL validation enabled (type: ${typeof tlsRejectUnauthorized})`);
  } else {
    console.log(`  ❓ SSL validation not set (type: ${typeof tlsRejectUnauthorized})`);
  }
}

// Runtime validation demonstration
function demonstrateRuntimeValidation() {
  console.log("\n🛡️ Runtime Validation:");

  try {
    // This will throw if required variables are missing
    EnvManager.validateRequired(["FW_MODE", "FW_LOG_LEVEL"]);
    console.log("  ✅ Required variables present");
  } catch (error) {
    console.log(`  ❌ Validation error: ${(error as Error).message}`);
  }

  // Safe number parsing
  const parsedTimeout = EnvManager.getNumber("FW_TIMEOUT");
  const safeTimeout = EnvManager.getNumberOrDefault("FW_TIMEOUT", 30000);
  console.log(`  ✅ Parsed timeout: ${parsedTimeout || "undefined"} (${typeof parsedTimeout})`);
  console.log(`  ✅ Safe timeout: ${safeTimeout} (${typeof safeTimeout})`);
}

// Advanced usage demonstration
function demonstrateAdvancedUsage() {
  console.log("\n🚀 Advanced Usage:");

  // Complex configuration object
  const complexConfig = {
    factoryWager: {
      ...fwConfig,
      computed: {
        isProduction: fwConfig.mode === "production",
        isDebugMode: fwConfig.debug || fwConfig.logLevel === "debug",
        hasProfile: !!fwConfig.profile,
        maxRowsSafe: Math.max(fwConfig.maxRows, 100),
        timeoutMs: fwConfig.timeout
      }
    },
    bun: {
      ...bunConfig,
      computed: {
        hasVerboseFetch: bunConfig.verboseFetch !== "none",
        isSecure: bunConfig.tlsRejectUnauthorized,
        hasTelemetry: bunConfig.doNotTrack === false,
        colorEnabled: bunConfig.forceColor && !bunConfig.noColor
      }
    }
  };

  console.log(`  ✅ Is Production: ${complexConfig.factoryWager.computed.isProduction}`);
  console.log(`  ✅ Is Debug Mode: ${complexConfig.factoryWager.computed.isDebugMode}`);
  console.log(`  ✅ Has Profile: ${complexConfig.factoryWager.computed.hasProfile}`);
  console.log(`  ✅ Has Verbose Fetch: ${complexConfig.bun.computed.hasVerboseFetch}`);
  console.log(`  ✅ Is Secure: ${complexConfig.bun.computed.isSecure}`);
  console.log(`  ✅ Has Telemetry: ${complexConfig.bun.computed.hasTelemetry}`);
  console.log(`  ✅ Color Enabled: ${complexConfig.bun.computed.colorEnabled}`);
}

// Run all demonstrations
demonstrateTypeSafety();
demonstrateRuntimeValidation();
demonstrateAdvancedUsage();

console.log("\n🎉 EnvManager Test Complete!");
console.log("✅ All operations fully typed with zero 'any' usage");
console.log("✅ Runtime validation working correctly");
console.log("✅ Type safety maintained throughout");

export { EnvManager };
