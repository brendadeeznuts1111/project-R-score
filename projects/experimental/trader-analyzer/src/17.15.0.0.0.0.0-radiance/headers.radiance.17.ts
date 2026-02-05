/**
 * @fileoverview Radiance Header Suite
 * @description 17.15.0.0.0.0.0 - Comprehensive Radiance headers for all responses
 * @module 17.15.0.0.0.0.0-radiance/headers.radiance.17
 *
 * **Every header screams: "I am radiance."**
 */

import type { RadianceCategory } from "./types.radiance.17";

/**
 * Radiance Header Names
 */
export const RADIANCE_HEADERS = {
	VERSION: "X-Radiance-Version",
	CHANNEL: "X-Radiance-Channel",
	REGISTRY_ID: "X-Registry-ID",
	SEMANTIC_TYPE: "X-Semantic-Type",
	COMPRESSION: "X-Compression",
	TIMESTAMP: "X-Timestamp",
	TRACE_ID: "X-Trace-ID",
	REQUEST_ID: "X-Request-ID",
	HEALTH_STATUS: "X-Health-Status",
	LAST_CHECKED: "X-Last-Checked",
} as const;

/**
 * Radiance Content-Type
 */
export const RADIANCE_CONTENT_TYPE = "application/radiance+json";

/**
 * Generate trace ID
 */
function generateTraceId17(): string {
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).substring(2, 8);
	return `rad-17-15-${timestamp}-${random}`;
}

/**
 * Radiance Headers Configuration
 */
export interface RadianceHeadersConfig {
	version: string;
	channel?: `radiance-${RadianceCategory}`;
	registryId?: string;
	semanticType?: string;
	compression?: "permessage-deflate" | "none";
	timestamp?: number;
	traceId?: string;
	requestId?: string;
	healthStatus?: "healthy" | "degraded" | "offline" | "unknown";
	lastChecked?: number;
}

/**
 * Build Radiance Headers
 */
export function buildRadianceHeaders17(
	config: RadianceHeadersConfig,
): Record<string, string> {
	const headers: Record<string, string> = {
		[RADIANCE_HEADERS.VERSION]: config.version,
		[RADIANCE_HEADERS.TIMESTAMP]: (config.timestamp || Date.now()).toString(),
		[RADIANCE_HEADERS.TRACE_ID]: config.traceId || generateTraceId17(),
	};

	if (config.channel) {
		headers[RADIANCE_HEADERS.CHANNEL] = config.channel;
	}

	if (config.registryId) {
		headers[RADIANCE_HEADERS.REGISTRY_ID] = config.registryId;
	}

	if (config.semanticType) {
		headers[RADIANCE_HEADERS.SEMANTIC_TYPE] = config.semanticType;
	}

	if (config.compression) {
		headers[RADIANCE_HEADERS.COMPRESSION] = config.compression;
	}

	if (config.requestId) {
		headers[RADIANCE_HEADERS.REQUEST_ID] = config.requestId;
	}

	if (config.healthStatus) {
		headers[RADIANCE_HEADERS.HEALTH_STATUS] = config.healthStatus;
	}

	if (config.lastChecked) {
		headers[RADIANCE_HEADERS.LAST_CHECKED] = config.lastChecked.toString();
	}

	return headers;
}

/**
 * Build Radiance Content-Type header
 */
export function buildRadianceContentType17(
	version: string = "17.16",
	schema?: string,
): string {
	let contentType = `${RADIANCE_CONTENT_TYPE}; version=${version}`;
	if (schema) {
		contentType += `; schema=${schema}`;
	}
	return contentType;
}

/**
 * Extract Radiance headers from response
 */
export function extractRadianceHeaders17(
	headers: Headers | Record<string, string>,
): Partial<RadianceHeadersConfig> {
	const headerMap = headers instanceof Headers
		? Object.fromEntries(headers.entries())
		: headers;

	return {
		version: headerMap[RADIANCE_HEADERS.VERSION],
		channel: headerMap[RADIANCE_HEADERS.CHANNEL] as
			| `radiance-${RadianceCategory}`
			| undefined,
		registryId: headerMap[RADIANCE_HEADERS.REGISTRY_ID],
		semanticType: headerMap[RADIANCE_HEADERS.SEMANTIC_TYPE],
		compression: headerMap[RADIANCE_HEADERS.COMPRESSION] as
			| "permessage-deflate"
			| "none"
			| undefined,
		timestamp: headerMap[RADIANCE_HEADERS.TIMESTAMP]
			? parseInt(headerMap[RADIANCE_HEADERS.TIMESTAMP], 10)
			: undefined,
		traceId: headerMap[RADIANCE_HEADERS.TRACE_ID],
		requestId: headerMap[RADIANCE_HEADERS.REQUEST_ID],
		healthStatus: headerMap[RADIANCE_HEADERS.HEALTH_STATUS] as
			| "healthy"
			| "degraded"
			| "offline"
			| "unknown"
			| undefined,
		lastChecked: headerMap[RADIANCE_HEADERS.LAST_CHECKED]
			? parseInt(headerMap[RADIANCE_HEADERS.LAST_CHECKED], 10)
			: undefined,
	};
}

/**
 * Check if response has Radiance headers
 */
export function isRadianceResponse17(
	headers: Headers | Record<string, string>,
): boolean {
	const headerMap = headers instanceof Headers
		? Object.fromEntries(headers.entries())
		: headers;
	return !!headerMap[RADIANCE_HEADERS.VERSION];
}
