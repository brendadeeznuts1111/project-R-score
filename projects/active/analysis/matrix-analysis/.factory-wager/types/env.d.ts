/**
 * FactoryWager Environment Variable Type Definitions
 * Extends Bun's environment interface with FactoryWager-specific variables
 */

declare module "bun" {
  interface Env {
    // FactoryWager Core Configuration
    FW_MODE?: "development" | "production" | "testing" | "audit" | "demo";
    FW_LOG_LEVEL?: "debug" | "info" | "warn" | "error";
    FW_PROFILE?: string;
    FW_REPORT_FORMAT?: "html" | "ansi" | "markdown" | "react";
    FW_OUTPUT_DIR?: string;
    FW_CONFIG_DIR?: string;
    FW_AUDIT_MODE?: "true" | "false";
    FW_DEBUG?: "true" | "false";
    
    // FactoryWager Extended Configuration
    FW_MAX_ROWS?: string;
    FW_CONFIG_PATH?: string;
    FW_TIMEOUT?: string;
    FW_RETRY_COUNT?: string;
    FW_CACHE_SIZE?: string;
    
    // Official Bun Environment Variables (for reference)
    BUN_CONFIG_VERBOSE_FETCH?: "curl" | "1";
    BUN_CONFIG_MAX_HTTP_REQUESTS?: string;
    BUN_CONFIG_NO_CLEAR_TERMINAL_ON_RELOAD?: "true" | "false";
    BUN_RUNTIME_TRANSPILER_CACHE_PATH?: string;
    BUN_OPTIONS?: string;
    FORCE_COLOR?: "1";
    NO_COLOR?: "1";
    NODE_TLS_REJECT_UNAUTHORIZED?: "0" | "1";
    DO_NOT_TRACK?: "1";
    TMPDIR?: string;
  }
}

/**
 * FactoryWager Configuration Interfaces
 */

export interface FactoryWagerEnvConfig {
  mode: "development" | "production" | "testing" | "audit" | "demo";
  logLevel: "debug" | "info" | "warn" | "error";
  profile?: string;
  reportFormat: "html" | "ansi" | "markdown" | "react";
  outputDir: string;
  configDir: string;
  auditMode: boolean;
  debug: boolean;
}

export interface BunEnvConfig {
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

/**
 * Environment Variable Validation Types
 */

export type ValidMode = "development" | "production" | "testing" | "audit" | "demo";
export type ValidLogLevel = "debug" | "info" | "warn" | "error";
export type ValidReportFormat = "html" | "ansi" | "markdown" | "react";

/**
 * Type Guard Functions
 */

export function isValidMode(mode: string): mode is ValidMode {
  return ["development", "production", "testing", "audit", "demo"].includes(mode);
}

export function isValidLogLevel(level: string): level is ValidLogLevel {
  return ["debug", "info", "warn", "error"].includes(level);
}

export function isValidReportFormat(format: string): format is ValidReportFormat {
  return ["html", "ansi", "markdown", "react"].includes(format);
}
