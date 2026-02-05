/**
 * @fileoverview Radiance Routing Constants
 * @description 17.15.0.0.0.0.0 - Versioned, semantic, radiant routing standard
 * @module 17.15.0.0.0.0.0-radiance/routing.v17
 *
 * **No more guessing which version.**
 * **Easy A/B testing of v17 vs v18.**
 * **Breaking changes = new version → zero surprise.**
 * 
 * **Constants Integration:**
 * - Registry names match `ROUTING_REGISTRY_NAMES` in `src/utils/rss-constants.ts`
 * - Path constants available in `RSS_API_PATHS.V17_*` for consistency
 * - Used by `src/17.16.0.0.0.0.0-routing/` URLPattern routing system
 * 
 * @see src/utils/rss-constants.ts for ROUTING_REGISTRY_NAMES and RSS_API_PATHS.V17_*
 */

/**
 * Version 17 Routing Constants
 * All routes are versioned and semantic
 */
export const v17 = {
	/**
	 * Registry Routes - All registry endpoints under /api/v17/registry
	 */
	registry: {
		properties: "/api/v17/registry/properties",
		"data-sources": "/api/v17/registry/data-sources",
		"mcp-tools": "/api/v17/registry/mcp-tools",
		"sharp-books": "/api/v17/registry/sharp-books",
		"bookmaker-profiles": "/api/v17/registry/bookmaker-profiles",
		"security-threats": "/api/v17/security/threats",
		"url-anomaly-patterns": "/api/v17/research/url-anomaly-patterns",
		"tension-patterns": "/api/v17/research/tension-patterns",
		errors: "/api/v17/registry/errors",
		"cli-commands": "/api/v17/registry/cli-commands",
		"team-departments": "/api/v17/registry/team-departments",
		topics: "/api/v17/registry/topics",
		"api-examples": "/api/v17/examples",
		"mini-app": "/api/v17/telegram/miniapp",
		"css-bundler": "/api/v17/registry/css-bundler",
		"bun-apis": "/api/v17/registry/bun-apis",
		"correlation-engine": "/api/v17/registry/correlation-engine",
		"registry-of-registries": "/api/v17/registry/registry-of-registries",
	} as const,

	/**
	 * Real-time WebSocket Routes
	 */
	realtime: {
		ws: "/ws/v17/radiance",
		pubsub: "/ws/v17/pubsub",
		logStream: "/ws/v17/log-stream",
		sportsbooks: "/ws/v17/sportsbooks",
		betting: "/ws/v17/betting",
	} as const,

	/**
	 * Mini App Routes
	 */
	miniapp: {
		base: "/api/v17/telegram/miniapp",
		sportsbooks: "/api/v17/telegram/miniapp/sportsbooks",
		markets: "/api/v17/telegram/miniapp/markets",
		arbitrage: "/api/v17/telegram/miniapp/arbitrage",
		bets: "/api/v17/telegram/miniapp/bets",
		status: "/api/v17/telegram/miniapp/status",
		info: "/api/v17/telegram/miniapp/info",
	} as const,

	/**
	 * Health & Status Routes
	 */
	health: {
		base: "/health/v17",
		registry: "/health/v17/registry",
		radiance: "/health/v17/radiance",
		system: "/health/v17/system",
	} as const,

	/**
	 * Documentation Routes
	 */
	docs: {
		base: "/docs/v17",
		openapi: "/docs/v17/openapi.json",
		registry: "/docs/v17/registry",
		radiance: "/docs/v17/radiance",
	} as const,
} as const;

/**
 * Get registry route by ID
 */
export function getRegistryRoute17(
	registryId: keyof typeof v17.registry,
): string {
	return v17.registry[registryId];
}

/**
 * Get all registry routes
 */
export function getAllRegistryRoutes17(): Record<string, string> {
	return { ...v17.registry };
}

/**
 * Check if route is version 17
 */
export function isV17Route(path: string): boolean {
	return path.startsWith("/api/v17/") ||
		path.startsWith("/ws/v17/") ||
		path.startsWith("/health/v17/") ||
		path.startsWith("/docs/v17/");
}

/**
 * Extract registry ID from v17 route
 */
export function extractRegistryIdFromRoute17(path: string): string | null {
	const match = path.match(/^\/api\/v17\/registry\/([^/]+)/);
	return match ? match[1] : null;
}
