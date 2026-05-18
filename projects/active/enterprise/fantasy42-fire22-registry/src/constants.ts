/**
 * Enterprise Constants - No More Magic Numbers
 *
 * Centralized constants for better maintainability and clarity.
 * Replace magic numbers with named, documented constants.
 */

// ============================================================================
// DATABASE CONSTANTS
// ============================================================================

export const DATABASE_CONSTANTS = {
  // SQLite PRAGMA settings with explanations
  CACHE_SIZE: -64000, // 64MB cache (-64000 pages * 1KB per page)
  MMAP_SIZE: 268435456, // 256MB memory map for better performance
  BUSY_TIMEOUT: 5000, // 5 second timeout for database locks
  WAL_CHECKPOINT: 1000, // Checkpoint WAL every 1000 pages

  // Performance optimization values
  DEFAULT_PAGE_SIZE: 4096, // Standard SQLite page size
  MAX_CONNECTIONS: 10, // Maximum database connections
  STATEMENT_CACHE_SIZE: 100, // Prepared statement cache size

  // Timeouts and intervals
  CONNECTION_TIMEOUT: 30000, // 30 seconds
  QUERY_TIMEOUT: 10000, // 10 seconds for individual queries
  HEALTH_CHECK_INTERVAL: 60000, // 60 seconds
} as const;

// ============================================================================
// APPLICATION CONSTANTS
// ============================================================================

export const APPLICATION_CONSTANTS = {
  // Server configuration
  DEFAULT_PORT: 3000,
  MAX_PORT: 65535,
  MIN_PORT: 1024,

  // Performance thresholds
  MAX_LOAD_TIME: 1000, // 1 second maximum load time
  MAX_MEMORY_USAGE: 100, // 100MB maximum memory usage
  MAX_BUNDLE_SIZE: 2000000, // 2MB maximum bundle size

  // Pagination defaults
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 1000,
  MIN_PAGE_SIZE: 10,

  // Rate limiting
  MAX_REQUESTS_PER_MINUTE: 1000,
  MAX_REQUESTS_PER_HOUR: 10000,

  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second base delay
  EXPONENTIAL_BACKOFF_MULTIPLIER: 2,
} as const;

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

export const VALIDATION_CONSTANTS = {
  // String length limits
  MAX_PACKAGE_NAME_LENGTH: 214, // npm package name limit
  MAX_VERSION_LENGTH: 255,
  MAX_DESCRIPTION_LENGTH: 10000,
  MAX_AUTHOR_LENGTH: 1000,

  // Security validation
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  MIN_USERNAME_LENGTH: 3,
  MAX_USERNAME_LENGTH: 50,

  // File size limits
  MAX_PACKAGE_SIZE: 104857600, // 100MB
  MAX_TARBALL_SIZE: 52428800, // 50MB

  // URL validation
  MAX_URL_LENGTH: 2048,
} as const;

// ============================================================================
// ENTERPRISE STANDARDS
// ============================================================================

export const ENTERPRISE_STANDARDS = {
  // Security standards
  MIN_SECURITY_SCORE: 85,
  MAX_CRITICAL_ISSUES: 0,
  MAX_HIGH_ISSUES: 2,
  MAX_MEDIUM_ISSUES: 5,

  // Performance standards
  MIN_LIGHTHOUSE_SCORE: 90,
  MAX_CORE_WEB_VITALS_LCP: 2500, // 2.5s
  MAX_CORE_WEB_VITALS_FID: 100, // 100ms
  MAX_CORE_WEB_VITALS_CLS: 0.1, // 0.1

  // Testing standards
  MIN_TEST_COVERAGE: 80,
  MAX_TEST_EXECUTION_TIME: 30000, // 30 seconds
  MIN_TEST_COUNT: 10,
  MAX_FAILED_TESTS: 0,

  // Quality standards
  MAX_CYCLOMATIC_COMPLEXITY: 15,
  MAX_CODE_DUPLICATION: 5, // 5%
  MIN_MAINTAINABILITY_INDEX: 70,
  MAX_TECHNICAL_DEBT_DAYS: 20,

  // Compliance standards
  MIN_COMPLIANCE_SCORE: 80,
  MAX_COMPLIANCE_VIOLATIONS: 0,
} as const;

// ============================================================================
// ERROR CODES AND MESSAGES
// ============================================================================

export const ERROR_CODES = {
  // Database errors
  DB_CONNECTION_FAILED: 'DB_CONNECTION_FAILED',
  DB_QUERY_FAILED: 'DB_QUERY_FAILED',
  DB_TRANSACTION_FAILED: 'DB_TRANSACTION_FAILED',
  DB_SCHEMA_ERROR: 'DB_SCHEMA_ERROR',

  // Configuration errors
  CONFIG_VALIDATION_FAILED: 'CONFIG_VALIDATION_FAILED',
  CONFIG_MISSING_REQUIRED: 'CONFIG_MISSING_REQUIRED',
  CONFIG_INVALID_VALUE: 'CONFIG_INVALID_VALUE',

  // Service errors
  SERVICE_INITIALIZATION_FAILED: 'SERVICE_INITIALIZATION_FAILED',
  SERVICE_DEPENDENCY_MISSING: 'SERVICE_DEPENDENCY_MISSING',
  SERVICE_TIMEOUT: 'SERVICE_TIMEOUT',

  // Validation errors
  VALIDATION_SCHEMA_ERROR: 'VALIDATION_SCHEMA_ERROR',
  VALIDATION_INPUT_INVALID: 'VALIDATION_INPUT_INVALID',
  VALIDATION_CONSTRAINT_VIOLATION: 'VALIDATION_CONSTRAINT_VIOLATION',
} as const;

// ============================================================================
// LOGGING CONSTANTS
// ============================================================================

export const LOGGING_CONSTANTS = {
  // Log levels
  LEVELS: {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    FATAL: 4,
  } as const,

  // Log categories
  CATEGORIES: {
    DATABASE: 'DATABASE',
    SECURITY: 'SECURITY',
    PERFORMANCE: 'PERFORMANCE',
    COMPLIANCE: 'COMPLIANCE',
    MONITORING: 'MONITORING',
    CONFIGURATION: 'CONFIGURATION',
  } as const,

  // Log formats
  FORMATS: {
    JSON: 'json',
    TEXT: 'text',
    STRUCTURED: 'structured',
  } as const,
} as const;

// ============================================================================
// SECURITY CONSTANTS
// ============================================================================

export const SECURITY_CONSTANTS = {
  // Encryption
  AES_KEY_SIZE: 256,
  SALT_ROUNDS: 12,
  JWT_EXPIRY: '24h',

  // Rate limiting
  WINDOW_SIZE: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 100,

  // Session management
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  ABSOLUTE_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours

  // Password policy
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  PASSWORD_REQUIRE_UPPERCASE: true,
  PASSWORD_REQUIRE_LOWERCASE: true,
  PASSWORD_REQUIRE_NUMBERS: true,
  PASSWORD_REQUIRE_SYMBOLS: true,

  // Security headers
  CSP_DEFAULT_SRC: "'self'",
  CSP_SCRIPT_SRC: "'self' 'unsafe-inline'",
  CSP_STYLE_SRC: "'self' 'unsafe-inline'",
} as const;

// ============================================================================
// MONITORING CONSTANTS
// ============================================================================

export const MONITORING_CONSTANTS = {
  // Health check thresholds
  HEALTH_CHECK_TIMEOUT: 5000, // 5 seconds
  HEALTH_CHECK_INTERVAL: 60000, // 1 minute

  // Performance thresholds
  SLOW_QUERY_THRESHOLD: 1000, // 1 second
  HIGH_MEMORY_THRESHOLD: 100 * 1024 * 1024, // 100MB
  HIGH_CPU_THRESHOLD: 80, // 80%

  // Alert thresholds
  CRITICAL_ERROR_RATE: 5, // 5% error rate
  WARNING_ERROR_RATE: 1, // 1% error rate

  // Metrics collection
  METRICS_RETENTION_DAYS: 30,
  LOG_RETENTION_DAYS: 90,
  AUDIT_RETENTION_DAYS: 365,
} as const;
