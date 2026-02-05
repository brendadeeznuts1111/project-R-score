/**
 * @fileoverview URL Parameter Parsing Utilities
 * @description Bun-native URL parameter parsing using canonical URLSearchParams API
 * @module api/url-params
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-URL-PARAMS@0.1.0;instance-id=URL-PARAMS-001;version=0.1.0}]
 * [PROPERTIES:{url-params={value:"url-parameter-parsing";@root:"ROOT-API";@chain:["BP-HTTP","BP-URL"];@version:"0.1.0"}}]
 * [CLASS:URLParamsParser][#REF:v-0.1.0.BP.URL.PARAMS.1.0.A.1.1.API.1.1]]
 * 
 * @see Bun API: URLSearchParams - https://bun.com/reference/globals/URLSearchParams
 * @see Bun API: URL - https://bun.com/reference/globals/URL
 */

import { QUERY_PARAMS, QUERY_DEFAULTS, HTTP_STATUS, REGEX_PATTERNS } from "../constants";

/**
 * Parse query parameters from URL string using Bun's canonical URLSearchParams
 * 
 * @param url - Full URL string or query string (e.g., "?a=1&b=2")
 * @returns URLSearchParams instance
 * 
 * @example
 * ```typescript
 * const params = parseQueryParams("https://api.example.com/trades?symbol=BTC&limit=10");
 * const symbol = params.get("symbol"); // "BTC"
 * const limit = parseInt(params.get("limit") || "100"); // 10
 * ```
 * 
 * @see Bun API: URLSearchParams - https://bun.com/reference/globals/URLSearchParams
 */
export function parseQueryParams(url: string): URLSearchParams {
	// Handle full URL or query string
	if (url.startsWith("http://") || url.startsWith("https://")) {
		const urlObj = new URL(url);
		return urlObj.searchParams;
	}
	
	// Handle query string starting with ?
	if (url.startsWith("?")) {
		return new URLSearchParams(url.slice(1));
	}
	
	// Handle raw query string
	return new URLSearchParams(url);
}

/**
 * Parse query parameters from Hono request context
 * 
 * @param queryString - Query string from c.req.url or c.req.query()
 * @returns URLSearchParams instance
 * 
 * @example
 * ```typescript
 * api.get("/trades", (c) => {
 *   const params = parseQueryFromRequest(c.req.url);
 *   const symbol = params.get("symbol");
 *   const limit = parseInt(params.get("limit") || "100");
 * });
 * ```
 */
export function parseQueryFromRequest(queryString: string): URLSearchParams {
	const url = queryString.includes("?") ? queryString : `?${queryString}`;
	return parseQueryParams(url);
}

/**
 * Get integer query parameter with default and bounds
 * 
 * @param params - URLSearchParams instance
 * @param key - Parameter name
 * @param defaultValue - Default value if not present
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Parsed integer value
 * 
 * @example
 * ```typescript
 * const params = parseQueryParams(req.url);
 * const limit = getIntParam(params, "limit", 50, 1, 500);
 * ```
 */
export function getIntParam(
	params: URLSearchParams,
	key: string,
	defaultValue: number,
	min?: number,
	max?: number,
): number {
	const value = params.get(key);
	if (!value) return defaultValue;
	
	const parsed = parseInt(value, 10);
	if (isNaN(parsed)) return defaultValue;
	
	if (min !== undefined && parsed < min) return min;
	if (max !== undefined && parsed > max) return max;
	
	return parsed;
}

/**
 * Get float query parameter with default and bounds
 * 
 * @param params - URLSearchParams instance
 * @param key - Parameter name
 * @param defaultValue - Default value if not present
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Parsed float value
 */
export function getFloatParam(
	params: URLSearchParams,
	key: string,
	defaultValue: number,
	min?: number,
	max?: number,
): number {
	const value = params.get(key);
	if (!value) return defaultValue;
	
	const parsed = parseFloat(value);
	if (isNaN(parsed)) return defaultValue;
	
	if (min !== undefined && parsed < min) return min;
	if (max !== undefined && parsed > max) return max;
	
	return parsed;
}

/**
 * Get boolean query parameter
 * 
 * @param params - URLSearchParams instance
 * @param key - Parameter name
 * @param defaultValue - Default value if not present
 * @returns Boolean value (true for "true", "1", "yes", false otherwise)
 */
export function getBoolParam(
	params: URLSearchParams,
	key: string,
	defaultValue: boolean = false,
): boolean {
	const value = params.get(key);
	if (!value) return defaultValue;
	
	const normalized = value.toLowerCase().trim();
	return normalized === "true" || normalized === "1" || normalized === "yes";
}

/**
 * Get string query parameter with validation
 * 
 * @param params - URLSearchParams instance
 * @param key - Parameter name
 * @param defaultValue - Default value if not present
 * @param allowedValues - Optional array of allowed values
 * @returns String value or default
 */
export function getStringParam(
	params: URLSearchParams,
	key: string,
	defaultValue?: string,
	allowedValues?: readonly string[],
): string | undefined {
	const value = params.get(key);
	if (!value) return defaultValue;
	
	if (allowedValues && !allowedValues.includes(value)) {
		return defaultValue;
	}
	
	return value;
}

/**
 * Get date query parameter (ISO 8601 format)
 * 
 * @param params - URLSearchParams instance
 * @param key - Parameter name
 * @param defaultValue - Default ISO date string
 * @returns ISO date string or default
 */
export function getDateParam(
	params: URLSearchParams,
	key: string,
	defaultValue?: string,
): string | undefined {
	const value = params.get(key);
	if (!value) return defaultValue;
	
	// Validate ISO 8601 format
	if (!REGEX_PATTERNS.DATE_ISO.test(value)) {
		return defaultValue;
	}
	
	return value;
}

/**
 * Get all values for a query parameter (for multi-value params)
 * 
 * @param params - URLSearchParams instance
 * @param key - Parameter name
 * @returns Array of all values for the parameter
 * 
 * @example
 * ```typescript
 * // URL: ?category=crypto&category=stocks
 * const categories = getAllParam(params, "category"); // ["crypto", "stocks"]
 * ```
 */
export function getAllParam(params: URLSearchParams, key: string): string[] {
	return params.getAll(key);
}

/**
 * Convert URLSearchParams to plain object
 * 
 * @param params - URLSearchParams instance
 * @returns Object with parameter keys and values (last value for duplicates)
 */
export function paramsToObject(params: URLSearchParams): Record<string, string> {
	const obj: Record<string, string> = {};
	for (const [key, value] of params) {
		obj[key] = value;
	}
	return obj;
}

/**
 * Convert URLSearchParams to object with arrays for multi-value params
 * 
 * @param params - URLSearchParams instance
 * @returns Object with parameter keys and arrays of values
 */
export function paramsToObjectWithArrays(
	params: URLSearchParams,
): Record<string, string | string[]> {
	const obj: Record<string, string | string[]> = {};
	const seen = new Set<string>();
	
	for (const [key, value] of params) {
		if (seen.has(key)) {
			const existing = obj[key];
			if (Array.isArray(existing)) {
				existing.push(value);
			} else {
				obj[key] = [existing, value];
			}
		} else {
			obj[key] = value;
			seen.add(key);
		}
	}
	
	return obj;
}

/**
 * Build query string from object
 * 
 * @param obj - Object with parameter key-value pairs
 * @returns Query string (without leading ?)
 * 
 * @example
 * ```typescript
 * const query = buildQueryString({ symbol: "BTC", limit: "10" });
 * // Returns: "symbol=BTC&limit=10"
 * ```
 */
export function buildQueryString(obj: Record<string, string | number | boolean>): string {
	const params = new URLSearchParams();
	
	for (const [key, value] of Object.entries(obj)) {
		if (value !== undefined && value !== null) {
			params.set(key, String(value));
		}
	}
	
	return params.toString();
}

/**
 * Validate query parameters against schema
 * 
 * @param params - URLSearchParams instance
 * @param schema - Validation schema mapping parameter names to validators
 * @returns Object with isValid flag and errors array
 */
export function validateQueryParams(
	params: URLSearchParams,
	schema: Record<
		string,
		{
			required?: boolean;
			type?: "string" | "number" | "boolean" | "date";
			min?: number;
			max?: number;
			allowedValues?: readonly string[];
			pattern?: RegExp;
		}
	>,
): { isValid: boolean; errors: Array<{ param: string; error: string }> } {
	const errors: Array<{ param: string; error: string }> = [];
	
	for (const [param, config] of Object.entries(schema)) {
		const value = params.get(param);
		
		// Check required
		if (config.required && !value) {
			errors.push({ param, error: `Parameter '${param}' is required` });
			continue;
		}
		
		if (!value) continue; // Skip optional params
		
		// Type validation
		if (config.type === "number") {
			const num = parseFloat(value);
			if (isNaN(num)) {
				errors.push({ param, error: `Parameter '${param}' must be a number` });
				continue;
			}
			if (config.min !== undefined && num < config.min) {
				errors.push({
					param,
					error: `Parameter '${param}' must be >= ${config.min}`,
				});
			}
			if (config.max !== undefined && num > config.max) {
				errors.push({
					param,
					error: `Parameter '${param}' must be <= ${config.max}`,
				});
			}
		} else if (config.type === "boolean") {
			const normalized = value.toLowerCase().trim();
			if (!["true", "false", "1", "0", "yes", "no"].includes(normalized)) {
				errors.push({ param, error: `Parameter '${param}' must be a boolean` });
			}
		} else if (config.type === "date") {
			if (!REGEX_PATTERNS.DATE_ISO.test(value)) {
				errors.push({
					param,
					error: `Parameter '${param}' must be a valid ISO 8601 date`,
				});
			}
		}
		
		// Allowed values check
		if (config.allowedValues && !config.allowedValues.includes(value)) {
			errors.push({
				param,
				error: `Parameter '${param}' must be one of: ${config.allowedValues.join(", ")}`,
			});
		}
		
		// Pattern check
		if (config.pattern && !config.pattern.test(value)) {
			errors.push({
				param,
				error: `Parameter '${param}' does not match required pattern`,
			});
		}
	}
	
	return {
		isValid: errors.length === 0,
		errors,
	};
}

/**
 * Parse pagination parameters with defaults
 * 
 * @param params - URLSearchParams instance
 * @returns Object with page and limit
 */
export function parsePaginationParams(params: URLSearchParams): {
	page: number;
	limit: number;
} {
	return {
		page: getIntParam(
			params,
			QUERY_PARAMS.PAGE,
			QUERY_DEFAULTS.PAGE,
			1,
			undefined,
		),
		limit: getIntParam(
			params,
			QUERY_PARAMS.LIMIT,
			QUERY_DEFAULTS.LIMIT,
			1,
			QUERY_DEFAULTS.MAX_LIMIT,
		),
	};
}

/**
 * Parse date range parameters
 * 
 * @param params - URLSearchParams instance
 * @returns Object with from and to dates (ISO strings)
 */
export function parseDateRangeParams(params: URLSearchParams): {
	from?: string;
	to?: string;
} {
	return {
		from: getDateParam(params, QUERY_PARAMS.FROM),
		to: getDateParam(params, QUERY_PARAMS.TO),
	};
}

/**
 * Detect HTML entity encoding anomalies in URL parameters
 * Bun's URLSearchParams parses HTML entities as parameter separators
 * 
 * @param url - URL string to check
 * @returns Object with anomaly detection results
 * 
 * @example
 * ```typescript
 * // URL: "?team=NE&amp;spread=-3"
 * // Bun's URLSearchParams will parse this as: { team: "NE", spread: "-3" }
 * // This is a security concern - HTML entities should not be parsed as separators
 * const result = detectUrlAnomalies(url);
 * ```
 * 
 * @see Bun API: URLSearchParams - https://bun.com/reference/globals/URLSearchParams
 * @see Research: src/research/fingerprinting/url-encoding-anomalies.ts
 */
export function detectUrlAnomalies(url: string): {
	hasEntities: boolean;
	entityTypes: string[];
	paramCount: number;
	threatLevel: "none" | "low" | "medium" | "high";
} {
	const entityPatterns = [
		/&amp;/gi, // Named entity
		/&#x26;/gi, // Hex entity
		/&#38;/gi, // Decimal entity
	];
	
	const foundEntities: string[] = [];
	for (const pattern of entityPatterns) {
		if (pattern.test(url)) {
			const match = pattern.source.match(/&#?x?(\w+)/);
			if (match) foundEntities.push(match[1]);
		}
	}
	
	const params = parseQueryParams(url);
	const paramCount = [...params].length;
	
	let threatLevel: "none" | "low" | "medium" | "high" = "none";
	if (foundEntities.length > 0) {
		threatLevel = foundEntities.length > 2 ? "high" : foundEntities.length > 1 ? "medium" : "low";
	}
	
	return {
		hasEntities: foundEntities.length > 0,
		entityTypes: foundEntities,
		paramCount,
		threatLevel,
	};
}

/**
 * All URL parameter utilities exported for reference
 */
export const URL_PARAMS_UTILS = {
	parseQueryParams,
	parseQueryFromRequest,
	getIntParam,
	getFloatParam,
	getBoolParam,
	getStringParam,
	getDateParam,
	getAllParam,
	paramsToObject,
	paramsToObjectWithArrays,
	buildQueryString,
	validateQueryParams,
	parsePaginationParams,
	parseDateRangeParams,
	detectUrlAnomalies,
} as const;
