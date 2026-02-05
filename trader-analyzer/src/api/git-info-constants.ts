/**
 * @fileoverview Git Info API Constants
 * @description Centralized constants for git-info endpoint used across tests, API routes, and dashboard.
 * Uses Bun Shell (`$`) and Bun APIs following official Bun documentation.
 *
 * @module api/git-info-constants
 *
 * @example
 * ```typescript
 * import { GIT_INFO_CONSTANTS } from './api/git-info-constants';
 *
 * // Use in API route
 * if (hash && hash.length === GIT_INFO_CONSTANTS.HASH_LENGTHS.FULL) {
 *   const short = hash.substring(0, GIT_INFO_CONSTANTS.HASH_LENGTHS.SHORT);
 * }
 *
 * // Use in tests
 * expect(hash.length).toBe(GIT_INFO_CONSTANTS.HASH_LENGTHS.FULL);
 * ```
 *
 * @see {@link https://bun.sh/docs/runtime/shell|Bun Shell Documentation}
 * @see {@link src/api/routes.ts|API Implementation}
 * @see {@link test/api-git-info.test.ts|Test Suite}
 */

// ═══════════════════════════════════════════════════════════════
// Hash Length Constants
// ═══════════════════════════════════════════════════════════════

/**
 * Git commit hash length constants
 * @constant {object}
 *
 * @description
 * Git uses SHA-1 hashing algorithm which produces 40-character hexadecimal strings.
 * Short hashes are typically the first 7 characters for display purposes.
 *
 * @see {@link https://git-scm.com/book/en/v2/Git-Tools-Revision-Selection|Git Revision Selection}
 */
export const HASH_LENGTHS = {
	/** Full SHA-1 commit hash length (40 hexadecimal characters) */
	FULL: 40,
	/** Short commit hash length (first 7 characters of full hash) */
	SHORT: 7,
} as const;

// ═══════════════════════════════════════════════════════════════
// Performance Constants
// ═══════════════════════════════════════════════════════════════

/**
 * Performance thresholds for git-info endpoint
 * @constant {object}
 *
 * @description
 * Performance thresholds used in test suite to ensure endpoint responsiveness.
 * Git commands are typically fast (< 100ms), but network latency and system load
 * can affect response times.
 */
export const PERFORMANCE = {
	/**
	 * Maximum acceptable response time in milliseconds
	 * Used in performance tests to ensure endpoint responds within reasonable time
	 * Default: 5000ms (5 seconds)
	 */
	MAX_RESPONSE_TIME_MS: 5000,

	/**
	 * Expected cached response time in milliseconds
	 * Used in performance tests for cached/secondary requests
	 * Default: 1000ms (1 second)
	 */
	MAX_CACHED_RESPONSE_TIME_MS: 1000,
} as const;

// ═══════════════════════════════════════════════════════════════
// Validation Patterns
// ═══════════════════════════════════════════════════════════════

/**
 * Regular expression patterns for validation
 * @constant {object}
 *
 * @description
 * Validation patterns for git-info endpoint response fields.
 * Used in test suite to ensure response format compliance.
 */
export const VALIDATION_PATTERNS = {
	/**
	 * ISO 8601 timestamp regex pattern
	 * Format: YYYY-MM-DDTHH:mm:ss.sssZ (e.g., "2025-12-06T03:48:08.063Z")
	 *
	 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString|Date.toISOString()}
	 */
	ISO_TIMESTAMP: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,

	/**
	 * Hex hash validation regex (case-insensitive, 40 characters)
	 * Validates full SHA-1 commit hash format
	 */
	HEX_HASH: /^[0-9a-f]{40}$/i,

	/**
	 * Short hash validation regex (case-insensitive, 7 characters)
	 * Validates short commit hash format (first 7 chars of full hash)
	 */
	SHORT_HASH: /^[0-9a-f]{7}$/i,
} as const;

// ═══════════════════════════════════════════════════════════════
// API Response Structure
// ═══════════════════════════════════════════════════════════════

/**
 * Git info API response field names
 * @constant {object}
 */
export const RESPONSE_FIELDS = {
	COMMIT: "commit",
	COMMIT_FULL: "full",
	COMMIT_SHORT: "short",
	COMMIT_REVERSE: "reverse",
	BRANCH: "branch",
	REPOSITORY: "repository",
	REMOTE_URL: "remoteUrl",
	TIMESTAMP: "timestamp",
} as const;

/**
 * Error response field names
 * @constant {object}
 */
export const ERROR_FIELDS = {
	ERROR: "error",
	MESSAGE: "message",
} as const;

// ═══════════════════════════════════════════════════════════════
// HTTP Status Codes
// ═══════════════════════════════════════════════════════════════

/**
 * HTTP status codes used by git-info endpoint
 * @constant {object}
 *
 * Maps to NEXUS error codes:
 * - 200: Success (no error code)
 * - 404: NX-004 - Git information not available
 * - 500: NX-005 - Git information fetch failed
 */
export const HTTP_STATUS = {
	/** Success - git info retrieved successfully */
	OK: 200,
	/** Not Found - git not available or not a repository (NX-004) */
	NOT_FOUND: 404,
	/** Request Timeout - server did not receive complete request (NX-006) */
	REQUEST_TIMEOUT: 408,
	/** Internal Server Error - unexpected error occurred (NX-005) */
	INTERNAL_ERROR: 500,
} as const;

// ═══════════════════════════════════════════════════════════════
// Error Messages
// ═══════════════════════════════════════════════════════════════

/**
 * Standard error messages for git-info endpoint
 * @constant {object}
 *
 * @see {@link src/errors/index.ts|Error Registry} for error codes:
 * - NX-004: Git information not available (404)
 * - NX-005: Git information fetch failed (500)
 */
export const ERROR_MESSAGES = {
	/** Git information not available - matches NX-004 error message */
	NOT_AVAILABLE: "Git information not available",
	/** Detailed message when git is unavailable - used in NX-004 error details */
	NOT_AVAILABLE_DETAIL: "Not a git repository or git not installed",
	/** Failed to get git information - matches NX-005 error message */
	FETCH_FAILED: "Failed to get git information",
} as const;

// ═══════════════════════════════════════════════════════════════
// Exported Constants Object
// ═══════════════════════════════════════════════════════════════

/**
 * All git-info constants grouped by category
 * @constant {object}
 * @example
 * ```typescript
 * import { GIT_INFO_CONSTANTS } from './api/git-info-constants';
 *
 * // Access hash lengths
 * const fullLength = GIT_INFO_CONSTANTS.HASH_LENGTHS.FULL; // 40
 * const shortLength = GIT_INFO_CONSTANTS.HASH_LENGTHS.SHORT; // 7
 *
 * // Access validation patterns
 * const isValidHash = GIT_INFO_CONSTANTS.VALIDATION_PATTERNS.HEX_HASH.test(hash);
 *
 * // Access performance thresholds
 * const maxTime = GIT_INFO_CONSTANTS.PERFORMANCE.MAX_RESPONSE_TIME_MS; // 5000
 * ```
 */
export const GIT_INFO_CONSTANTS = {
	HASH_LENGTHS,
	PERFORMANCE,
	VALIDATION_PATTERNS,
	RESPONSE_FIELDS,
	ERROR_FIELDS,
	HTTP_STATUS,
	ERROR_MESSAGES,
} as const;

// Type exports for TypeScript
export type HashLengths = typeof HASH_LENGTHS;
export type PerformanceConstants = typeof PERFORMANCE;
export type ValidationPatterns = typeof VALIDATION_PATTERNS;
export type ResponseFields = typeof RESPONSE_FIELDS;
export type ErrorFields = typeof ERROR_FIELDS;
export type HttpStatus = typeof HTTP_STATUS;
export type ErrorMessages = typeof ERROR_MESSAGES;
