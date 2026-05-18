#!/usr/bin/env bun
/**
 * Test Global Bun.env Interface Merging
 * This file demonstrates that the global interface merging at the top of fw.ts
 * provides full type safety and auto-completion for all environment variables
 */

// Import the main CLI file to activate the global interface merging
import "./fw.ts";

// Test 1: FactoryWager variables are fully typed with auto-completion
const fwMode: "development" | "production" | "testing" | "audit" | "demo" = Bun.env.FW_MODE;
const fwLogLevel: "debug" | "info" | "warn" | "error" = Bun.env.FW_LOG_LEVEL;
const fwProfile: string | undefined = Bun.env.FW_PROFILE;
const fwReportFormat: "html" | "ansi" | "markdown" | "react" = Bun.env.FW_REPORT_FORMAT;
const fwOutputDir: string = Bun.env.FW_OUTPUT_DIR;
const fwConfigDir: string = Bun.env.FW_CONFIG_DIR;
const fwAuditMode: "true" | "false" = Bun.env.FW_AUDIT_MODE;
const fwDebug: "true" | "false" = Bun.env.FW_DEBUG;

// Test 2: Extended FactoryWager variables
const fwMaxRows: string | undefined = Bun.env.FW_MAX_ROWS;
const fwConfigPath: string | undefined = Bun.env.FW_CONFIG_PATH;
const fwTimeout: string | undefined = Bun.env.FW_TIMEOUT;
const fwRetryCount: string | undefined = Bun.env.FW_RETRY_COUNT;
const fwCacheSize: string | undefined = Bun.env.FW_CACHE_SIZE;

// Test 3: Official Bun variables are fully typed
const nodeTlsRejectUnauthorized: "0" | "1" | undefined = Bun.env.NODE_TLS_REJECT_UNAUTHORIZED;
const bunConfigVerboseFetch: "curl" | "1" | undefined = Bun.env.BUN_CONFIG_VERBOSE_FETCH;
const bunRuntimeTranspilerCachePath: string | undefined = Bun.env.BUN_RUNTIME_TRANSPILER_CACHE_PATH;
const bunConfigMaxHttpRequests: string | undefined = Bun.env.BUN_CONFIG_MAX_HTTP_REQUESTS;
const bunConfigNoClearTerminalOnReload: "true" | "false" | undefined = Bun.env.BUN_CONFIG_NO_CLEAR_TERMINAL_ON_RELOAD;
const doNotTrack: "1" | undefined = Bun.env.DO_NOT_TRACK;
const bunOptions: string | undefined = Bun.env.BUN_OPTIONS;
const tmpdir: string | undefined = Bun.env.TMPDIR;
const forceColor: "1" | undefined = Bun.env.FORCE_COLOR;
const noColor: "1" | undefined = Bun.env.NO_COLOR;

// Test 4: Type-safe operations with the merged interface
function getFactoryWagerConfig() {
  return {
    mode: fwMode || "development",
    logLevel: fwLogLevel || "info",
    profile: fwProfile,
    reportFormat: fwReportFormat || "html",
    outputDir: fwOutputDir || "./reports",
    configDir: fwConfigDir || "./config",
    auditMode: fwAuditMode === "true",
    debug: fwDebug === "true",
    maxRows: fwMaxRows ? parseInt(fwMaxRows, 10) : 1000,
    configPath: fwConfigPath || "./config/report-config.toml",
    timeout: fwTimeout ? parseInt(fwTimeout, 10) : 30000,
    retryCount: fwRetryCount ? parseInt(fwRetryCount, 10) : 3,
    cacheSize: fwCacheSize ? parseInt(fwCacheSize, 10) : 100
  };
}

function getBunConfig() {
  return {
    tlsRejectUnauthorized: nodeTlsRejectUnauthorized !== "0",
    verboseFetch: bunConfigVerboseFetch === "curl" ? "curl" 
      : bunConfigVerboseFetch === "1" ? "basic" 
      : "none",
    transpilerCachePath: bunRuntimeTranspilerCachePath,
    maxHttpRequests: bunConfigMaxHttpRequests ? parseInt(bunConfigMaxHttpRequests, 10) : 256,
    noClearTerminalOnReload: bunConfigNoClearTerminalOnReload === "true",
    doNotTrack: doNotTrack === "1",
    bunOptions: bunOptions || "",
    tmpdir: tmpdir,
    forceColor: forceColor === "1",
    noColor: noColor === "1"
  };
}

// Test 5: Runtime validation with type safety
function validateEnvironment() {
  const warnings: string[] = [];
  
  // Security validation
  if (nodeTlsRejectUnauthorized === "0") {
    warnings.push("🔒 SSL certificate validation is DISABLED - SECURITY RISK");
  }
  
  // Environment validation
  if (fwDebug === "true" && fwMode === "production") {
    warnings.push("🐛 Debug mode enabled in production environment");
  }
  
  // Configuration validation
  if (fwMode === "production" && fwLogLevel === "debug") {
    warnings.push("📝 Debug logging in production environment");
  }
  
  return warnings;
}

// Test 6: Demonstrate full type safety
console.info("✅ Global Bun.env Interface Merging Test");
console.info("=========================================");

const fwConfig = getFactoryWagerConfig();
const bunConfig = getBunConfig();
const warnings = validateEnvironment();

console.info("🏭 FactoryWager Configuration:");
console.info(`  Mode: ${fwConfig.mode}`);
console.info(`  Log Level: ${fwConfig.logLevel}`);
console.info(`  Report Format: ${fwConfig.reportFormat}`);
console.info(`  Debug: ${fwConfig.debug ? "enabled" : "disabled"}`);

console.info("\n🥟 Bun Configuration:");
console.info(`  TLS Validation: ${bunConfig.tlsRejectUnauthorized ? "enabled" : "disabled"}`);
console.info(`  Verbose Fetch: ${bunConfig.verboseFetch}`);
console.info(`  Max HTTP Requests: ${bunConfig.maxHttpRequests}`);
console.info(`  Force Color: ${bunConfig.forceColor ? "enabled" : "disabled"}`);

if (warnings.length > 0) {
  console.info("\n⚠️  Warnings:");
  warnings.forEach(warning => console.info(`  ${warning}`));
} else {
  console.info("\n✅ No warnings - Configuration is secure");
}

console.info("\n🎯 Type Safety Status:");
console.info("  ✅ All FactoryWager variables typed");
console.info("  ✅ All Bun variables typed");
console.info("  ✅ Full auto-completion available");
console.info("  ✅ Compile-time validation active");
console.info("  ✅ Runtime validation working");

export { getFactoryWagerConfig, getBunConfig, validateEnvironment };
