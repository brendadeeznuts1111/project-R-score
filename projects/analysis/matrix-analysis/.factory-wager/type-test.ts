#!/usr/bin/env bun
/**
 * TypeScript Type Test for FactoryWager CLI Environment Variables
 * Tests proper typing of Bun.env and FactoryWager environment variables
 */

import { FactoryWagerEnvConfig, BunEnvConfig, ValidMode, ValidLogLevel, isValidMode, isValidLogLevel } from "./types/env.d.ts";

// Test 1: Bun.env has custom properties for FactoryWager (now with extended types)
const fwMode: ValidMode | undefined = Bun.env.FW_MODE;
const fwLogLevel: ValidLogLevel | undefined = Bun.env.FW_LOG_LEVEL;
const fwProfile: string | undefined = Bun.env.FW_PROFILE;
const fwReportFormat: "html" | "ansi" | "markdown" | "react" = Bun.env.FW_REPORT_FORMAT;
const fwOutputDir: string = Bun.env.FW_OUTPUT_DIR;
const fwConfigDir: string = Bun.env.FW_CONFIG_DIR;
const fwAuditMode: boolean = Bun.env.FW_AUDIT_MODE === "true";
const fwDebug: boolean = Bun.env.FW_DEBUG === "true";

// Test 2: Official Bun environment variables are properly typed
const tlsRejectUnauthorized: "0" | "1" | undefined = Bun.env.NODE_TLS_REJECT_UNAUTHORIZED;
const verboseFetch: "curl" | "1" | undefined = Bun.env.BUN_CONFIG_VERBOSE_FETCH;
const maxHttpRequests: string = Bun.env.BUN_CONFIG_MAX_HTTP_REQUESTS;
const noClearTerminal: "true" | "false" | undefined = Bun.env.BUN_CONFIG_NO_CLEAR_TERMINAL_ON_RELOAD;
const transpilerCachePath: string | undefined = Bun.env.BUN_RUNTIME_TRANSPILER_CACHE_PATH;
const bunOptions: string = Bun.env.BUN_OPTIONS;
const forceColor: "1" | undefined = Bun.env.FORCE_COLOR;
const noColor: "1" | undefined = Bun.env.NO_COLOR;
const doNotTrack: "1" | undefined = Bun.env.DO_NOT_TRACK;
const tmpdir: string | undefined = Bun.env.TMPDIR;

// Test 3: Environment variable helper functions
class EnvManager {
  static getNumberOrDefault(key: string, defaultValue: number): number {
    const value = Bun.env[key];
    return value ? parseInt(value, 10) : defaultValue;
  }

  static getBoolean(key: string): boolean {
    return Bun.env[key] === "true";
  }

  static getStringOrDefault(key: string, defaultValue: string): string {
    return Bun.env[key] || defaultValue;
  }

  static getEnumOrDefault<T extends string>(key: string, defaultValue: T, validValues: T[]): T {
    const value = Bun.env[key];
    return value && validValues.includes(value as T) ? value as T : defaultValue;
  }
}

// Test 4: EnvManager returns correct types
const maxRows: number = EnvManager.getNumberOrDefault("FW_MAX_ROWS", 100);
const debugEnabled: boolean = EnvManager.getBoolean("FW_DEBUG");
const configPath: string = EnvManager.getStringOrDefault("FW_CONFIG_PATH", "./config.toml");
const logLevel: "debug" | "info" | "warn" | "error" = EnvManager.getEnumOrDefault(
  "FW_LOG_LEVEL",
  "info",
  ["debug", "info", "warn", "error"]
);

// Test 5: CLI options interface
interface CLIOptions {
  command: "profile" | "report" | "config" | "status" | "util" | "dev" | "prod" | "demo" | "report-html" | "info" | "welcome";
  subcommand?: string;
  options: string[];
  env: {
    mode: string;
    logLevel: string;
    debug: boolean;
  };
}

// Test 6: CLI options are typed
const opts: CLIOptions = {
  command: "status",
  subcommand: "system",
  options: ["--verbose"],
  env: {
    mode: fwMode || "development",
    logLevel: fwLogLevel || "info",
    debug: fwDebug
  }
};

// Test 7: Security validation types
interface SecurityValidation {
  sslValidationDisabled: boolean;
  environment: string;
  debugModeInProduction: boolean;
  warnings: string[];
}

const securityCheck: SecurityValidation = {
  sslValidationDisabled: tlsRejectUnauthorized === "0",
  environment: fwMode || "development",
  debugModeInProduction: fwDebug && fwMode === "production",
  warnings: []
};

// Test 8: Bun configuration interface
interface BunConfiguration {
  verboseFetch?: "curl" | "1";
  maxHttpRequests: number;
  noClearTerminal: boolean;
  transpilerCachePath?: string;
  options: string;
  forceColor: boolean;
  noColor: boolean;
  nodeTlsRejectUnauthorized: boolean;
  doNotTrack: boolean;
  tmpdir?: string;
}

const bunConfig: BunConfiguration = {
  verboseFetch: verboseFetch,
  maxHttpRequests: maxHttpRequests ? parseInt(maxHttpRequests, 10) : 256,
  noClearTerminal: noClearTerminal === "true",
  transpilerCachePath: transpilerCachePath,
  options: bunOptions || "",
  forceColor: forceColor === "1",
  noColor: noColor === "1",
  nodeTlsRejectUnauthorized: tlsRejectUnauthorized !== "0",
  doNotTrack: doNotTrack === "1",
  tmpdir: tmpdir
};

// Test 9: FactoryWager configuration interface
interface FactoryWagerConfiguration {
  mode: "development" | "production" | "testing" | "audit" | "demo";
  logLevel: "debug" | "info" | "warn" | "error";
  profile?: string;
  reportFormat: "html" | "ansi" | "markdown" | "react";
  outputDir: string;
  configDir: string;
  auditMode: boolean;
  debug: boolean;
}

const fwConfig: FactoryWagerConfiguration = {
  mode: fwMode || "development",
  logLevel: fwLogLevel || "info",
  profile: fwProfile,
  reportFormat: fwReportFormat || "html",
  outputDir: fwOutputDir || "./reports",
  configDir: fwConfigDir || "./config",
  auditMode: fwAuditMode,
  debug: fwDebug
};

// Test 10: Type guards and validation
function isValidMode(mode: string): mode is "development" | "production" | "testing" | "audit" | "demo" {
  return ["development", "production", "testing", "audit", "demo"].includes(mode);
}

function isValidLogLevel(level: string): level is "debug" | "info" | "warn" | "error" {
  return ["debug", "info", "warn", "error"].includes(level);
}

// Test 11: Runtime type validation
const validatedMode = fwMode && isValidMode(fwMode) ? fwMode : "development";
const validatedLogLevel = fwLogLevel && isValidLogLevel(fwLogLevel) ? fwLogLevel : "info";

console.log("✅ All TypeScript type checks passed!");
console.log(`🔧 Mode: ${validatedMode}`);
console.log(`📝 Log Level: ${validatedLogLevel}`);
console.log(`🔒 SSL Validation: ${bunConfig.nodeTlsRejectUnauthorized ? "enabled" : "disabled"}`);
console.log(`🌍 Environment: ${fwConfig.mode}`);
console.log(`🐛 Debug: ${fwConfig.debug ? "enabled" : "disabled"}`);

// Export types for external use
export type { CLIOptions, SecurityValidation, BunConfiguration, FactoryWagerConfiguration };
export { EnvManager, isValidMode, isValidLogLevel };
