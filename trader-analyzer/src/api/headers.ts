/**
 * @fileoverview HTTP Headers Constants and Utilities
 * @description Standardized HTTP headers for NEXUS API
 * @module api/headers
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-API-HEADERS@0.1.0;instance-id=API-HEADERS-001;version=0.1.0}]
 * [PROPERTIES:{headers={value:"http-headers";@root:"ROOT-API";@chain:["BP-HTTP","BP-HEADERS"];@version:"0.1.0"}}]
 * [CLASS:APIHeaders][#REF:v-0.1.0.BP.API.HEADERS.1.0.A.1.1.API.1.1]]
 */

/**
 * HTTP Header Names
 * Standardized header names used across the NEXUS API
 */
export const HEADER_NAMES = {
	// Request Headers
	CONTENT_TYPE: "Content-Type",
	AUTHORIZATION: "Authorization",
	REQUEST_ID: "X-Request-ID",
	IF_NONE_MATCH: "If-None-Match",
	IF_MODIFIED_SINCE: "If-Modified-Since",
	ACCEPT: "Accept",
	ACCEPT_ENCODING: "Accept-Encoding",
	USER_AGENT: "User-Agent",
	
	// Response Headers
	API_VERSION: "X-API-Version",
	RESPONSE_TIME: "X-Response-Time",
	CACHE: "X-Cache",
	CACHE_HIT_RATE: "X-Cache-Hit-Rate",
	LOG_COUNT: "X-Log-Count",
	METRICS_TYPE: "X-Metrics-Type",
	REQUEST_ID_ECHO: "X-Request-ID",
	ETAG: "ETag",
	CACHE_CONTROL: "Cache-Control",
	CONTENT_ENCODING: "Content-Encoding",
	CONTENT_DISPOSITION: "Content-Disposition",
	LAST_MODIFIED: "Last-Modified",
	
	// Security Headers
	X_CONTENT_TYPE_OPTIONS: "X-Content-Type-Options",
	X_FRAME_OPTIONS: "X-Frame-Options",
	X_XSS_PROTECTION: "X-XSS-Protection",
	STRICT_TRANSPORT_SECURITY: "Strict-Transport-Security",
	CONTENT_SECURITY_POLICY: "Content-Security-Policy",
	REFERRER_POLICY: "Referrer-Policy",
	PERMISSIONS_POLICY: "Permissions-Policy",
} as const;

/**
 * HTTP Header Values
 * Standardized header values
 */
export const HEADER_VALUES = {
	CONTENT_TYPE: {
		JSON: "application/json",
		TEXT: "text/plain",
		HTML: "text/html",
		XML: "application/xml",
		CSV: "text/csv",
		OCTET_STREAM: "application/octet-stream",
		GZIP: "application/gzip",
		ZSTD: "application/zstd",
	},
	
	CACHE_CONTROL: {
		NO_CACHE: "no-cache",
		NO_STORE: "no-store",
		PUBLIC: "public, max-age=3600",
		PRIVATE: "private, max-age=300",
		IMMUTABLE: "public, max-age=31536000, immutable",
	},
	
	X_CONTENT_TYPE_OPTIONS: "nosniff",
	X_FRAME_OPTIONS: "DENY",
	X_XSS_PROTECTION: "1; mode=block",
	STRICT_TRANSPORT_SECURITY: "max-age=31536000; includeSubDomains",
	REFERRER_POLICY: "strict-origin-when-cross-origin",
} as const;

/**
 * API Version
 */
export const API_VERSION = "0.1.15";

/**
 * Default Response Headers
 * Headers included in all API responses
 */
export const DEFAULT_RESPONSE_HEADERS: Record<string, string> = {
	[HEADER_NAMES.API_VERSION]: API_VERSION,
	[HEADER_NAMES.CACHE_CONTROL]: HEADER_VALUES.CACHE_CONTROL.NO_CACHE,
	[HEADER_NAMES.X_CONTENT_TYPE_OPTIONS]: HEADER_VALUES.X_CONTENT_TYPE_OPTIONS,
	[HEADER_NAMES.X_FRAME_OPTIONS]: HEADER_VALUES.X_FRAME_OPTIONS,
	[HEADER_NAMES.X_XSS_PROTECTION]: HEADER_VALUES.X_XSS_PROTECTION,
	[HEADER_NAMES.REFERRER_POLICY]: HEADER_VALUES.REFERRER_POLICY,
};

/**
 * Create response headers with defaults and custom overrides
 */
export function createResponseHeaders(
	customHeaders: Record<string, string> = {},
	includeSecurity: boolean = true,
): Headers {
	const headers = new Headers();
	
	// Add default headers
	if (includeSecurity) {
		Object.entries(DEFAULT_RESPONSE_HEADERS).forEach(([key, value]) => {
			headers.set(key, value);
		});
	} else {
		// Minimal headers (for metrics endpoint, etc.)
		headers.set(HEADER_NAMES.API_VERSION, API_VERSION);
		headers.set(HEADER_NAMES.CACHE_CONTROL, HEADER_VALUES.CACHE_CONTROL.NO_CACHE);
	}
	
	// Add custom headers (override defaults if needed)
	Object.entries(customHeaders).forEach(([key, value]) => {
		headers.set(key, value);
	});
	
	return headers;
}

/**
 * Add response time header
 */
export function addResponseTimeHeader(
	headers: Headers,
	startTime: bigint,
): void {
	const duration = ((Bun.nanoseconds() - startTime) / 1_000_000).toFixed(2);
	headers.set(HEADER_NAMES.RESPONSE_TIME, `${duration}ms`);
}

/**
 * Add cache status headers
 */
export function addCacheHeaders(
	headers: Headers,
	hitRate: number,
	isHit: boolean = false,
): void {
	headers.set(HEADER_NAMES.CACHE, isHit ? "HIT" : "MISS");
	headers.set(HEADER_NAMES.CACHE_HIT_RATE, hitRate.toFixed(2));
}

/**
 * Add ETag header
 */
export function addETagHeader(headers: Headers, etag: string): void {
	headers.set(HEADER_NAMES.ETAG, `"${etag}"`);
}

/**
 * Echo request ID if present
 */
export function echoRequestId(
	headers: Headers,
	requestId: string | null,
): void {
	if (requestId) {
		headers.set(HEADER_NAMES.REQUEST_ID_ECHO, requestId);
	}
}

/**
 * Extract request ID from headers
 */
export function getRequestId(headers: Headers): string | null {
	return headers.get(HEADER_NAMES.REQUEST_ID) || null;
}

/**
 * Get content type from request
 */
export function getContentType(headers: Headers): string {
	return headers.get(HEADER_NAMES.CONTENT_TYPE) || HEADER_VALUES.CONTENT_TYPE.JSON;
}

/**
 * Check if request accepts JSON
 */
export function acceptsJSON(headers: Headers): boolean {
	const accept = headers.get(HEADER_NAMES.ACCEPT) || "";
	return accept.includes("application/json") || accept.includes("*/*");
}

/**
 * Security headers for production
 */
export const SECURITY_HEADERS: Record<string, string> = {
	[HEADER_NAMES.X_CONTENT_TYPE_OPTIONS]: HEADER_VALUES.X_CONTENT_TYPE_OPTIONS,
	[HEADER_NAMES.X_FRAME_OPTIONS]: HEADER_VALUES.X_FRAME_OPTIONS,
	[HEADER_NAMES.X_XSS_PROTECTION]: HEADER_VALUES.X_XSS_PROTECTION,
	[HEADER_NAMES.STRICT_TRANSPORT_SECURITY]: HEADER_VALUES.STRICT_TRANSPORT_SECURITY,
	[HEADER_NAMES.REFERRER_POLICY]: HEADER_VALUES.REFERRER_POLICY,
	[HEADER_NAMES.CONTENT_SECURITY_POLICY]: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
	[HEADER_NAMES.PERMISSIONS_POLICY]: "geolocation=(), microphone=(), camera=()",
};

/**
 * All header constants exported for reference
 */
export const HEADERS_CONSTANTS = {
	NAMES: HEADER_NAMES,
	VALUES: HEADER_VALUES,
	API_VERSION,
	DEFAULT_RESPONSE_HEADERS,
	SECURITY_HEADERS,
} as const;
