/**
 * @fileoverview Security Constants
 * @description Constants for security-related functionality
 * @module security/constants
 */

/**
 * CSRF token configuration
 */
export const CSRF_CONSTANTS = {
	/** Token expiry time in milliseconds (1 hour) */
	TOKEN_EXPIRY_MS: 60 * 60 * 1000,
	/** Secret key name in Bun.secrets */
	SECRET_NAME: "csrf-secret",
	/** Service name for Bun.secrets */
	SERVICE_NAME: "nexus",
} as const;

/**
 * Security Scanner constants
 */
export const SCANNER_CONSTANTS = {
	/** Default CVSS threshold for fatal advisories */
	DEFAULT_FATAL_CVSS_THRESHOLD: 9.0,
	/** Default CVSS threshold for warning advisories */
	DEFAULT_WARN_CVSS_THRESHOLD: 7.0,
	/** Default local threat database path */
	DEFAULT_THREAT_DATABASE_PATH: "data/threat-database.json",
	/** Service name for Bun.secrets */
	SERVICE_NAME: "nexus-security-scanner",
	/** Threat intel API key name in Bun.secrets */
	THREAT_INTEL_API_KEY_NAME: "threat-intel-api-key",
} as const;

/**
 * Miniapp monitoring constants
 */
export const MINIAPP_CONSTANTS = {
	/** Status cache TTL in milliseconds (10 seconds) */
	STATUS_CACHE_TTL_MS: 10_000,
	/** Health cache TTL in milliseconds (30 seconds) */
	HEALTH_CACHE_TTL_MS: 30_000,
	/** Cache max size */
	CACHE_MAX_SIZE: 1000,
	/** Request timeout in milliseconds (5 seconds) */
	REQUEST_TIMEOUT_MS: 5_000,
} as const;

/**
 * Chunked encoding guard constants
 */
export const CHUNKED_ENCODING_CONSTANTS = {
	/** Maximum size for a single chunk (1MB) */
	MAX_CHUNK_SIZE: 1024 * 1024,
	/** Maximum total size across all chunks (10MB) */
	MAX_TOTAL_SIZE: 10 * 1024 * 1024,
	/** Maximum chunk size line length (prevents unbounded reads) */
	MAX_SIZE_LINE_LENGTH: 16,
} as const;
