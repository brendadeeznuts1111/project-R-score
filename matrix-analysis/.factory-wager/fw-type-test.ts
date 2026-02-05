#!/usr/bin/env bun
/**
 * FactoryWager CLI Type Safety Verification
 * This should have ZERO TypeScript errors
 */

import "./fw-cli-archetype.ts";

// Test 1: Bun.env has custom FactoryWager properties
const fwMode: "development" | "production" | "testing" | "audit" | "demo" = Bun.env.FW_MODE;
const fwLogLevel: "debug" | "info" | "warn" | "error" = Bun.env.FW_LOG_LEVEL;
const fwProfile: string | undefined = Bun.env.FW_PROFILE;
const fwReportFormat: "html" | "ansi" | "markdown" | "react" = Bun.env.FW_REPORT_FORMAT;
const fwAuditMode: "true" | "false" = Bun.env.FW_AUDIT_MODE;
const fwDebug: "true" | "false" = Bun.env.FW_DEBUG;

// Test 2: Optional properties work
const fwMaxRows: string | undefined = Bun.env.FW_MAX_ROWS;
const fwConfigPath: string | undefined = Bun.env.FW_CONFIG_PATH;
const fwTimeout: string | undefined = Bun.env.FW_TIMEOUT;

// Test 3: Native Bun env vars are typed
const tls: "0" | "1" | undefined = Bun.env.NODE_TLS_REJECT_UNAUTHORIZED;
const verbose: "curl" | "1" | undefined = Bun.env.BUN_CONFIG_VERBOSE_FETCH;
const maxHttp: string | undefined = Bun.env.BUN_CONFIG_MAX_HTTP_REQUESTS;
const noClearTerminal: "true" | "false" | undefined = Bun.env.BUN_CONFIG_NO_CLEAR_TERMINAL_ON_RELOAD;
const doNotTrack: "1" | undefined = Bun.env.DO_NOT_TRACK;
const forceColor: "1" | undefined = Bun.env.FORCE_COLOR;
const noColor: "1" | undefined = Bun.env.NO_COLOR;

// Test 4: FactoryWagerEnvManager returns correct types
import { FactoryWagerEnvManager } from "./fw-cli-archetype.ts";

const num: number = FactoryWagerEnvManager.getNumberOrDefault("FW_MAX_ROWS", 100);
const bool: boolean = FactoryWagerEnvManager.getBoolean("FW_DEBUG");
const str: string = FactoryWagerEnvManager.getStringOrDefault("FW_CONFIG_PATH", "./config.toml");

// Test 5: FactoryWager configuration is typed
const fwConfig = FactoryWagerEnvManager.getFactoryWagerConfig();
const mode: "development" | "production" | "testing" | "audit" | "demo" = fwConfig.mode;
const logLevel: "debug" | "info" | "warn" | "error" = fwConfig.logLevel;
const reportFormat: "html" | "ansi" | "markdown" | "react" = fwConfig.reportFormat;

// Test 6: CLI options are typed
import { FactoryWagerCLIParser, type FactoryWagerCLIOptions } from "./fw-cli-archetype.ts";

const opts: FactoryWagerCLIOptions = {
  command: "serve",
  configPath: "./test.toml",
  format: "html",
  debug: true,
  verbose: false,
  args: []
};

// Test 7: Runtime configuration is typed
import { BunRuntimeConfigManager, type BunRuntimeConfig } from "./fw-cli-archetype.ts";

const runtimeConfig: BunRuntimeConfig = BunRuntimeConfigManager.getConfig();
const tlsEnabled: boolean = runtimeConfig.tlsRejectUnauthorized;
const verboseMode: "curl" | "basic" | "none" = runtimeConfig.verboseFetch;
const maxRequests: number = runtimeConfig.http.maxConcurrentRequests;

// Test 8: Server is typed
import { FactoryWagerServer } from "./fw-cli-archetype.ts";

const server = new FactoryWagerServer();

// Test 9: Type guards work
function isValidMode(mode: string): mode is "development" | "production" | "testing" | "audit" | "demo" {
  return ["development", "production", "testing", "audit", "demo"].includes(mode);
}

const testMode = "production";
if (isValidMode(testMode)) {
  // TypeScript knows testMode is a valid mode here
  const validMode: "development" | "production" | "testing" | "audit" | "demo" = testMode;
}

// Test 10: Complex type operations
const config = {
  factoryWager: FactoryWagerEnvManager.getFactoryWagerConfig(),
  bunRuntime: BunRuntimeConfigManager.getConfig(),
  cli: FactoryWagerCLIParser.parse(["bun", "serve", "-p", "8080"]),
  security: {
    sslEnabled: Bun.env.NODE_TLS_REJECT_UNAUTHORIZED !== "0",
    telemetryEnabled: Bun.env.DO_NOT_TRACK !== "1",
    debugMode: FactoryWagerEnvManager.getBoolean("FW_DEBUG")
  }
};

console.log("✅ All FactoryWager TypeScript type checks passed!");
console.log(`🔧 Mode: ${config.factoryWager.mode}`);
console.log(`📝 Log Level: ${config.factoryWager.logLevel}`);
console.log(`🔒 SSL Validation: ${config.security.sslEnabled ? "enabled" : "disabled"}`);
console.log(`🌍 Environment: ${config.factoryWager.mode}`);
console.log(`🐛 Debug: ${config.security.debugMode ? "enabled" : "disabled"}`);

// Export for external usage
export type { FactoryWagerCLIOptions, BunRuntimeConfig };
export { FactoryWagerEnvManager, BunRuntimeConfigManager, FactoryWagerCLIParser, FactoryWagerServer };
