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
  console.info("✅ Required environment variables validated");
} catch (error) {
  console.error("❌ Validation failed:", (error as Error).message);
}

// Get complete configuration objects
const fwConfig = EnvManager.getFactoryWagerConfig();
const bunConfig = EnvManager.getBunConfig();

console.info("🔧 EnvManager Usage Examples");
console.info("============================");

console.info("\n📋 Basic Usage:");
console.info(`  Profile: ${session || "None"}`);
console.info(`  Mode: ${mode}`);
console.info(`  Max Rows: ${rows}`);
console.info(`  Debug: ${debug ? "enabled" : "disabled"}`);

console.info("\n🏭 FactoryWager Configuration:");
console.info(`  Mode: ${fwConfig.mode}`);
console.info(`  Log Level: ${fwConfig.logLevel}`);
console.info(`  Report Format: ${fwConfig.reportFormat}`);
console.info(`  Output Dir: ${fwConfig.outputDir}`);
console.info(`  Config Dir: ${fwConfig.configDir}`);
console.info(`  Audit Mode: ${fwConfig.auditMode ? "enabled" : "disabled"}`);
console.info(`  Debug: ${fwConfig.debug ? "enabled" : "disabled"}`);

console.info("\n🥟 Bun Configuration:");
console.info(`  TLS Reject Unauthorized: ${bunConfig.tlsRejectUnauthorized ? "enabled" : "disabled"}`);
console.info(`  Verbose Fetch: ${bunConfig.verboseFetch}`);
console.info(`  Max HTTP Requests: ${bunConfig.maxHttpRequests}`);
console.info(`  No Clear Terminal: ${bunConfig.noClearTerminalOnReload ? "enabled" : "disabled"}`);
console.info(`  Do Not Track: ${bunConfig.doNotTrack ? "enabled" : "disabled"}`);
console.info(`  Force Color: ${bunConfig.forceColor ? "enabled" : "disabled"}`);
console.info(`  No Color: ${bunConfig.noColor ? "enabled" : "disabled"}`);

// Type safety demonstration
function demonstrateTypeSafety() {
  console.info("\n🎯 Type Safety Demonstration:");

  // These are all fully typed - no 'any' anywhere
  const typedMode: "development" | "production" | "testing" | "audit" | "demo" = mode;
  const typedRows: number = rows;
  const typedDebug: boolean = debug;
  const typedLogLevel: "debug" | "info" | "warn" | "error" = logLevel || "info";
  const typedReportFormat: "html" | "ansi" | "markdown" | "react" = reportFormat || "html";

  console.info(`  ✅ Mode type: ${typedMode} (${typeof typedMode})`);
  console.info(`  ✅ Rows type: ${typedRows} (${typeof typedRows})`);
  console.info(`  ✅ Debug type: ${typedDebug} (${typeof typedDebug})`);
  console.info(`  ✅ Log Level type: ${typedLogLevel} (${typeof typedLogLevel})`);
  console.info(`  ✅ Report Format type: ${typedReportFormat} (${typeof typedReportFormat})`);

  // Union type safety
  if (tlsRejectUnauthorized === "0") {
    console.info(`  ⚠️  SSL validation disabled (type: ${typeof tlsRejectUnauthorized})`);
  } else if (tlsRejectUnauthorized === "1") {
    console.info(`  ✅ SSL validation enabled (type: ${typeof tlsRejectUnauthorized})`);
  } else {
    console.info(`  ❓ SSL validation not set (type: ${typeof tlsRejectUnauthorized})`);
  }
}

// Runtime validation demonstration
function demonstrateRuntimeValidation() {
  console.info("\n🛡️ Runtime Validation:");

  try {
    // This will throw if required variables are missing
    EnvManager.validateRequired(["FW_MODE", "FW_LOG_LEVEL"]);
    console.info("  ✅ Required variables present");
  } catch (error) {
    console.info(`  ❌ Validation error: ${(error as Error).message}`);
  }

  // Safe number parsing
  const parsedTimeout = EnvManager.getNumber("FW_TIMEOUT");
  const safeTimeout = EnvManager.getNumberOrDefault("FW_TIMEOUT", 30000);
  console.info(`  ✅ Parsed timeout: ${parsedTimeout || "undefined"} (${typeof parsedTimeout})`);
  console.info(`  ✅ Safe timeout: ${safeTimeout} (${typeof safeTimeout})`);
}

// Advanced usage demonstration
function demonstrateAdvancedUsage() {
  console.info("\n🚀 Advanced Usage:");

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

  console.info(`  ✅ Is Production: ${complexConfig.factoryWager.computed.isProduction}`);
  console.info(`  ✅ Is Debug Mode: ${complexConfig.factoryWager.computed.isDebugMode}`);
  console.info(`  ✅ Has Profile: ${complexConfig.factoryWager.computed.hasProfile}`);
  console.info(`  ✅ Has Verbose Fetch: ${complexConfig.bun.computed.hasVerboseFetch}`);
  console.info(`  ✅ Is Secure: ${complexConfig.bun.computed.isSecure}`);
  console.info(`  ✅ Has Telemetry: ${complexConfig.bun.computed.hasTelemetry}`);
  console.info(`  ✅ Color Enabled: ${complexConfig.bun.computed.colorEnabled}`);
}

// Run all demonstrations
demonstrateTypeSafety();
demonstrateRuntimeValidation();
demonstrateAdvancedUsage();

console.info("\n🎉 EnvManager Test Complete!");
console.info("✅ All operations fully typed with zero 'any' usage");
console.info("✅ Runtime validation working correctly");
console.info("✅ Type safety maintained throughout");

export { EnvManager };
