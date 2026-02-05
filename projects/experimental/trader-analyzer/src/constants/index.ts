/**
 * @fileoverview NEXUS Platform Constants
 * @description Centralized constants, variables, and configuration values
 * @module constants
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-CONSTANTS@0.1.0;instance-id=CONSTANTS-001;version=0.1.0}]
 * [PROPERTIES:{constants={value:"platform-constants";@root:"ROOT-CORE";@chain:["BP-CONSTANTS","BP-CONFIG"];@version:"0.1.0"}}]
 * [CLASS:PlatformConstants][#REF:v-0.1.0.BP.CONSTANTS.1.0.A.1.1.CORE.1.1]]
 */

/**
 * API Configuration Constants
 */
export const API_CONSTANTS = {
	VERSION: "0.1.15",
	NAME: "NEXUS Trading Platform",
	DESCRIPTION: "Unified Trading Intelligence Platform",
	
	// Ports (hardcoded - override via environment variables)
	PORT: 3000,
	DEFAULT_PORT: 3000, // Alias for PORT
	WS_PORT: 3002,
	DEFAULT_WS_PORT: 3002, // Alias for WS_PORT
	
	// Timeouts
	DEFAULT_TIMEOUT: 3000,
	LONG_TIMEOUT: 10000,
	
	// Limits
	MAX_REQUEST_SIZE: 10 * 1024 * 1024, // 10MB
	MAX_LOG_LIMIT: 500,
	DEFAULT_LOG_LIMIT: 50,
	
	// Cache
	DEFAULT_CACHE_TTL: 300, // 5 minutes
	MAX_CACHE_ENTRIES: 10000,
	
	// Pagination
	DEFAULT_PAGE_SIZE: 100,
	MAX_PAGE_SIZE: 500,
} as const;

/**
 * Environment Variable Names
 */
export const ENV_VARS = {
	// Server
	PORT: "PORT",
	WS_PORT: "WS_PORT",
	NODE_ENV: "NODE_ENV",
	
	// Telegram
	TELEGRAM_BOT_TOKEN: "TELEGRAM_BOT_TOKEN",
	TELEGRAM_CHAT_ID: "TELEGRAM_CHAT_ID",
	TELEGRAM_SUPERGROUP_ID: "TELEGRAM_SUPERGROUP_ID",
	TELEGRAM_LIVE_TOPIC_ID: "TELEGRAM_LIVE_TOPIC_ID",
	TELEGRAM_LOG_DIR: "TELEGRAM_LOG_DIR",
	
	// API
	API_URL: "API_URL",
	API_KEY: "API_KEY",
	
	// Database
	DATABASE_URL: "DATABASE_URL",
	
	// Security
	SECURITY_MONITOR_ENABLED: "BUN_SECURITY_MONITOR_ENABLED",
	PAGERDUTY_KEY: "BUN_PAGERDUTY_KEY",
	AUDIT_LOG_LEVEL: "BUN_AUDIT_LOG_LEVEL",
	
	// Feature Flags
	URL_SANITIZE: "BUN_URL_SANITIZE",
	ANOMALY_DETECTION: "BUN_ANOMALY_DETECTION",
	CORRECT_HISTORICAL: "BUN_CORRECT_HISTORICAL",
} as const;

/**
 * Bun.secrets Keys
 */
export const SECRETS_KEYS = {
	TELEGRAM_BOT_TOKEN: "TELEGRAM_BOT_TOKEN",
	TELEGRAM_CHAT_ID: "TELEGRAM_CHAT_ID",
	TELEGRAM_SUPERGROUP_ID: "TELEGRAM_SUPERGROUP_ID",
	TELEGRAM_LIVE_TOPIC_ID: "TELEGRAM_LIVE_TOPIC_ID",
	API_KEY: "API_KEY",
	PAGERDUTY_KEY: "PAGERDUTY_KEY",
} as const;

/**
 * File Paths
 */
export const FILE_PATHS = {
	// Data directories
	DATA_DIR: "data",
	STREAMS_DIR: "data/streams",
	TELEGRAM_LOGS_DIR: "data/telegram-logs",
	SECURITY_DIR: "data/security",
	RESEARCH_DIR: "data/research",
	FORENSIC_DIR: "data/forensic",
	COMPLIANCE_DIR: "data/compliance",
	
	// Databases
	PIPELINE_DB: "data/pipeline.sqlite",
	RBAC_DB: "data/rbac.sqlite",
	PROPERTIES_DB: "data/properties.sqlite",
	SOURCES_DB: "data/sources.sqlite",
	FEATURES_DB: "data/features.sqlite",
	SECURITY_DB: "data/security.db",
	COMPLIANCE_DB: "data/compliance-audit.db",
	RESEARCH_DB: "data/research.db",
	
	// Logs
	TELEGRAM_LOG_PATTERN: "data/telegram-logs/telegram-{date}.jsonl",
} as const;

/**
 * HTTP Status Codes
 */
export const HTTP_STATUS = {
	OK: 200,
	CREATED: 201,
	NO_CONTENT: 204,
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	METHOD_NOT_ALLOWED: 405,
	CONFLICT: 409,
	UNPROCESSABLE_ENTITY: 422,
	TOO_MANY_REQUESTS: 429,
	INTERNAL_SERVER_ERROR: 500,
	BAD_GATEWAY: 502,
	SERVICE_UNAVAILABLE: 503,
	GATEWAY_TIMEOUT: 504,
} as const;

/**
 * Error Categories
 */
export const ERROR_CATEGORIES = {
	VALIDATION: "validation",
	NETWORK: "network",
	AUTHENTICATION: "authentication",
	AUTHORIZATION: "authorization",
	NOT_FOUND: "not_found",
	RATE_LIMIT: "rate_limit",
	INTERNAL: "internal",
	DATABASE: "database",
	EXTERNAL_API: "external_api",
} as const;

/**
 * Cache Keys Patterns
 */
export const CACHE_KEYS = {
	ANALYTICS_PATTERNS: "analytics:patterns",
	ANALYTICS_TRENDS: "analytics:trends",
	STREAMS_LIST: "streams:list",
	ARBITRAGE_STATUS: "arbitrage:status",
	ORCA_STATS: "orca:stats",
	SHARP_BOOKS: "sharp-books:all",
} as const;

/**
 * Time Constants (milliseconds)
 */
export const TIME_CONSTANTS = {
	SECOND: 1000,
	MINUTE: 60 * 1000,
	HOUR: 60 * 60 * 1000,
	DAY: 24 * 60 * 60 * 1000,
	WEEK: 7 * 24 * 60 * 60 * 1000,
} as const;

/**
 * Regex Patterns
 */
export const REGEX_PATTERNS = {
	UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
	EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
	URL: /^https?:\/\/.+/,
	DATE_ISO: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
} as const;

/**
 * Common Query Parameter Names
 * Standardized query parameter names used across NEXUS API endpoints
 */
export const QUERY_PARAMS = {
	// Pagination
	PAGE: "page",
	LIMIT: "limit",
	OFFSET: "offset",
	
	// Filtering
	LEVEL: "level",
	SOURCE: "source",
	SEARCH: "search",
	SYMBOL: "symbol",
	CATEGORY: "category",
	STATUS: "status",
	
	// Date Ranges
	FROM: "from",
	TO: "to",
	START_DATE: "startDate",
	END_DATE: "endDate",
	
	// File Operations
	FILE: "file",
	
	// Arbitrage
	MIN_SPREAD: "minSpread",
	MIN_EV: "minEv",
	ARBITRAGE_ONLY: "arbitrageOnly",
	
	// Sorting
	SORT: "sort",
	ORDER: "order",
	
	// Cache Control
	NO_CACHE: "noCache",
	REFRESH: "refresh",
} as const;

/**
 * Query Parameter Default Values
 */
export const QUERY_DEFAULTS = {
	PAGE: 1,
	LIMIT: API_CONSTANTS.DEFAULT_PAGE_SIZE,
	MAX_LIMIT: API_CONSTANTS.MAX_PAGE_SIZE,
	MIN_SPREAD: 0,
	MIN_EV: 0,
} as const;

/**
 * Get environment variable with fallback
 */
export function getEnv(key: string, defaultValue?: string): string | undefined {
	return process.env[key] ?? defaultValue;
}

/**
 * Get required environment variable (throws if missing)
 */
export function getRequiredEnv(key: string): string {
	const value = process.env[key];
	if (!value) {
		throw new Error(`Required environment variable ${key} is not set`);
	}
	return value;
}

/**
 * Get Bun secret with fallback to environment variable
 */
export function getSecret(key: string, defaultValue?: string): string | undefined {
	try {
		const secret = Bun.secrets[key];
		if (secret) return secret;
	} catch {
		// Bun.secrets not available or key not found
	}
	return process.env[key] ?? defaultValue;
}

/**
 * Get API port from environment or default
 */
export function getPort(): number {
	const port = getEnv(ENV_VARS.PORT, String(API_CONSTANTS.DEFAULT_PORT));
	return parseInt(port || String(API_CONSTANTS.DEFAULT_PORT), 10);
}

/**
 * Get WebSocket port from environment or default
 */
export function getWSPort(): number {
	const port = getEnv(ENV_VARS.WS_PORT, String(API_CONSTANTS.DEFAULT_WS_PORT));
	return parseInt(port || String(API_CONSTANTS.DEFAULT_WS_PORT), 10);
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
	return getEnv(ENV_VARS.NODE_ENV, "development") === "production";
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
	return getEnv(ENV_VARS.NODE_ENV, "development") === "development";
}

/**
 * All constants exported for reference
 */
export const CONSTANTS = {
	API: API_CONSTANTS,
	ENV_VARS,
	SECRETS_KEYS,
	FILE_PATHS,
	HTTP_STATUS,
	ERROR_CATEGORIES,
	CACHE_KEYS,
	TIME_CONSTANTS,
	REGEX_PATTERNS,
	QUERY_PARAMS,
	QUERY_DEFAULTS,
} as const;
