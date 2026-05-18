// lib/polish/error-handling/codes.ts - Error Code Registry
// ═══════════════════════════════════════════════════════════════════════════════

import type { ErrorDefinition, ErrorSeverity } from "../types.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Error Code Ranges
// ─────────────────────────────────────────────────────────────────────────────
// 1xxx - Configuration errors
// 2xxx - Database/storage errors
// 3xxx - Network/API errors
// 4xxx - File system errors
// 5xxx - Authentication/authorization errors
// 6xxx - Validation errors
// 7xxx - Business logic errors
// 8xxx - External service errors
// 9xxx - System/runtime errors

// ─────────────────────────────────────────────────────────────────────────────
// Error Definitions
// ─────────────────────────────────────────────────────────────────────────────

export const ERROR_CODES = {
  // Configuration Errors (1xxx)
  CONFIG_MISSING: {
    code: 1001,
    severity: "warning" as ErrorSeverity,
    recoverable: true,
    message: "Configuration file not found",
    solutions: [
      "Create a config file using: bun init-config",
      "Copy from template: cp config.example.json config.json",
    ],
  },
  CONFIG_INVALID: {
    code: 1002,
    severity: "error" as ErrorSeverity,
    recoverable: false,
    message: "Invalid configuration format",
    solutions: [
      "Check JSON syntax in config file",
      "Validate against schema",
      "Reset to defaults: bun reset-config",
    ],
  },
  ENV_VAR_MISSING: {
    code: 1003,
    severity: "warning" as ErrorSeverity,
    recoverable: true,
    message: "Required environment variable not set",
    solutions: [
      "Add to .env file",
      "Export in shell: export VAR_NAME=value",
    ],
  },
  S3_NOT_CONFIGURED: {
    code: 1010,
    severity: "warning" as ErrorSeverity,
    recoverable: true,
    message: "S3 storage not configured",
    solutions: [
      "Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY",
      "Configure S3 bucket in settings",
      "Use local storage as fallback",
    ],
  },

  // Database Errors (2xxx)
  DB_CONNECTION_FAILED: {
    code: 2001,
    severity: "critical" as ErrorSeverity,
    recoverable: false,
    message: "Database connection failed",
    solutions: [
      "Check database server is running",
      "Verify connection string",
      "Check network connectivity",
    ],
  },
  DB_QUERY_FAILED: {
    code: 2002,
    severity: "error" as ErrorSeverity,
    recoverable: true,
    message: "Database query failed",
    solutions: [
      "Check query syntax",
      "Verify table/column names",
      "Check for constraint violations",
    ],
  },
  DB_MIGRATION_FAILED: {
    code: 2003,
    severity: "critical" as ErrorSeverity,
    recoverable: false,
    message: "Database migration failed",
    solutions: [
      "Review migration file for errors",
      "Check for conflicting migrations",
      "Rollback: bun db:rollback",
    ],
  },

  // Network Errors (3xxx)
  NETWORK_TIMEOUT: {
    code: 3001,
    severity: "warning" as ErrorSeverity,
    recoverable: true,
    message: "Network request timed out",
    solutions: [
      "Check internet connection",
      "Increase timeout setting",
      "Retry the request",
    ],
  },
  API_ERROR: {
    code: 3002,
    severity: "error" as ErrorSeverity,
    recoverable: true,
    message: "API request failed",
    solutions: [
      "Check API endpoint URL",
      "Verify API key/authentication",
      "Check API rate limits",
    ],
  },
  RATE_LIMITED: {
    code: 3003,
    severity: "warning" as ErrorSeverity,
    recoverable: true,
    message: "Rate limit exceeded",
    solutions: [
      "Wait before retrying",
      "Reduce request frequency",
      "Request rate limit increase",
    ],
  },

  // File System Errors (4xxx)
  FILE_NOT_FOUND: {
    code: 4001,
    severity: "error" as ErrorSeverity,
    recoverable: false,
    message: "File not found",
    solutions: [
      "Check file path is correct",
      "Verify file exists",
      "Check file permissions",
    ],
  },
  FILE_PERMISSION_DENIED: {
    code: 4002,
    severity: "error" as ErrorSeverity,
    recoverable: false,
    message: "Permission denied accessing file",
    solutions: [
      "Check file permissions: ls -la",
      "Run with elevated privileges if needed",
      "Change file ownership",
    ],
  },
  DISK_FULL: {
    code: 4003,
    severity: "critical" as ErrorSeverity,
    recoverable: false,
    message: "Disk space exhausted",
    solutions: [
      "Free up disk space",
      "Check with: df -h",
      "Clean temporary files",
    ],
  },

  // Auth Errors (5xxx)
  AUTH_REQUIRED: {
    code: 5001,
    severity: "error" as ErrorSeverity,
    recoverable: true,
    message: "Authentication required",
    solutions: [
      "Log in to continue",
      "Provide API key",
      "Check token expiration",
    ],
  },
  AUTH_INVALID: {
    code: 5002,
    severity: "error" as ErrorSeverity,
    recoverable: true,
    message: "Invalid credentials",
    solutions: [
      "Check username/password",
      "Reset password if forgotten",
      "Verify API key is correct",
    ],
  },
  AUTH_EXPIRED: {
    code: 5003,
    severity: "warning" as ErrorSeverity,
    recoverable: true,
    message: "Session expired",
    solutions: [
      "Log in again",
      "Refresh authentication token",
    ],
  },

  // Validation Errors (6xxx)
  VALIDATION_FAILED: {
    code: 6001,
    severity: "warning" as ErrorSeverity,
    recoverable: true,
    message: "Validation failed",
    solutions: [
      "Check input format",
      "Review validation rules",
    ],
  },
  INVALID_INPUT: {
    code: 6002,
    severity: "warning" as ErrorSeverity,
    recoverable: true,
    message: "Invalid input provided",
    solutions: [
      "Check input type and format",
      "Review allowed values",
    ],
  },

  // System Errors (9xxx)
  UNKNOWN_ERROR: {
    code: 9001,
    severity: "error" as ErrorSeverity,
    recoverable: false,
    message: "An unexpected error occurred",
    solutions: [
      "Check logs for details",
      "Report issue if persistent",
    ],
  },
  MEMORY_EXHAUSTED: {
    code: 9002,
    severity: "critical" as ErrorSeverity,
    recoverable: false,
    message: "Memory limit exceeded",
    solutions: [
      "Increase memory limit",
      "Optimize memory usage",
      "Process data in smaller chunks",
    ],
  },
} as const satisfies Record<string, ErrorDefinition>;

export type ErrorCode = keyof typeof ERROR_CODES;

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

export function getErrorDefinition(code: ErrorCode): ErrorDefinition {
  return ERROR_CODES[code];
}

export function getErrorByNumericCode(numericCode: number): ErrorDefinition | null {
  for (const def of Object.values(ERROR_CODES)) {
    if (def.code === numericCode) return def;
  }
  return null;
}

export function isCriticalError(code: ErrorCode): boolean {
  return ERROR_CODES[code].severity === "critical";
}

export function isRecoverableError(code: ErrorCode): boolean {
  return ERROR_CODES[code].recoverable;
}
