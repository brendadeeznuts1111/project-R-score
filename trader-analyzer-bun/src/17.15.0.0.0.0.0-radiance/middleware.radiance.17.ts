/**
 * @fileoverview Radiance Middleware
 * @description 17.15.0.0.0.0.0 - Hono middleware for automatic Radiance header injection
 * @module 17.15.0.0.0.0.0-radiance/middleware.radiance.17
 */

import type { Context, Next } from "hono";
import {
    buildRadianceContentType17,
    buildRadianceHeaders17,
    type RadianceHeadersConfig,
} from "./headers.radiance.17";
import type { RadianceCategory } from "./types.radiance.17";

/**
 * Radiance Middleware Options
 */
export interface RadianceMiddlewareOptions {
	version?: string;
	defaultChannel?: `radiance-${RadianceCategory}`;
	enableCompression?: boolean;
	includeHealthStatus?: boolean;
}

/**
 * Radiance Middleware - Automatically injects Radiance headers into all responses
 */
export function radianceMiddleware17(
	options: RadianceMiddlewareOptions = {},
) {
	const {
		version = "17.16.0",
		defaultChannel,
		enableCompression = true,
		includeHealthStatus = false,
	} = options;

	return async (c: Context, next: Next) => {
		// Generate request ID
		const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

		// Store in context for later use
		c.set("radiance.requestId", requestId);
		c.set("radiance.version", version);

		await next();

		// Get response
		const res = c.res;

		// Extract registry ID from path if available
		const path = c.req.path;
		const registryIdMatch = path.match(/\/api\/v17\/registry\/([^/]+)/);
		const registryId = registryIdMatch ? registryIdMatch[1] : undefined;

		// Determine semantic type from registry ID
		const semanticTypeMap: Record<string, string> = {
			properties: "PropertyDefinition",
			"data-sources": "DataSourceConfig",
			"mcp-tools": "McpToolDefinition",
			"sharp-books": "SharpBookDefinition",
			"security-threats": "SecurityThreatDefinition",
			"tension-patterns": "TensionPatternDefinition",
			"url-anomaly-patterns": "UrlAnomalyPatternDefinition",
			errors: "ErrorDefinition",
		};

		const semanticType = registryId ? semanticTypeMap[registryId] : undefined;
		const channel = defaultChannel ||
			(registryId ? (`radiance-${registryId}` as `radiance-${RadianceCategory}`) : undefined);

		// Build Radiance headers config
		const headersConfig: RadianceHeadersConfig = {
			version,
			channel,
			registryId,
			semanticType,
			compression: enableCompression ? "permessage-deflate" : "none",
			timestamp: Date.now(),
			traceId: c.get("radiance.traceId") as string | undefined,
			requestId,
		};

		// Add health status if enabled
		if (includeHealthStatus && registryId) {
			// Try to get health status from context or default to unknown
			const healthStatus = c.get("radiance.healthStatus") as
				| "healthy"
				| "degraded"
				| "offline"
				| "unknown"
				| undefined;
			if (healthStatus) {
				headersConfig.healthStatus = healthStatus;
			}
		}

		// Build and inject headers
		const radianceHeaders = buildRadianceHeaders17(headersConfig);

		// Inject headers into response
		for (const [key, value] of Object.entries(radianceHeaders)) {
			res.headers.set(key, value);
		}

		// Set Content-Type if JSON response
		const contentType = res.headers.get("Content-Type");
		if (contentType?.includes("application/json")) {
			res.headers.set(
				"Content-Type",
				buildRadianceContentType17(version, semanticType),
			);
		}
	};
}
