/**
 * @fileoverview Data Sources Registry v17
 * @description 17.15.0.0.0.0.0 - RadianceTyped data sources registry queries
 * @module 17.15.0.0.0.0.0-radiance/registry.data-sources.17
 */

import type { DataSourceConfig } from "./types.radiance.17";
import { ROUTING_REGISTRY_NAMES } from "../../utils/rss-constants";

/**
 * Query Data Sources Registry v17
 * 
 * @param filters - Optional filters for querying data sources
 * @returns Array of DataSourceConfig items
 */
export async function queryDataSourcesRegistry17(
	filters?: {
		type?: "rest" | "websocket" | "graphql" | "grpc";
		auth?: "bearer" | "api-key" | "none" | "oauth2";
		namespace?: string;
	},
): Promise<DataSourceConfig[]> {
	const { DataSourceRegistry } = await import("../../sources/registry");
	const registry = new DataSourceRegistry();

	try {
		const sources = registry.query ? registry.query(filters || {}) : [];
		
		return sources.map((source: any) => ({
			...source,
			id: source.id?.startsWith("source_") ? source.id : `source_${source.id}`,
			endpoint: source.endpoint instanceof URL ? source.endpoint : new URL(source.endpoint || ""),
			rbac: new Set(source.rbac?.roles || []),
			featureFlags: new Set(source.featureFlags || []),
			version: source.version || "v1.0.0",
			__category: ROUTING_REGISTRY_NAMES.DATA_SOURCES as const,
			__version: "17.15.0" as const,
			__radianceChannel: "radiance-data-sources" as const,
			__semanticType: "DataSourceConfig",
		})) as DataSourceConfig[];
	} finally {
		registry.close();
	}
}

/**
 * Probe Data Sources Health v17
 * 
 * @returns Health status
 */
export async function probeDataSourcesHealth17(): Promise<{
	healthy: boolean;
	status: "healthy" | "degraded" | "offline";
	sourceCount: number;
	lastChecked: number;
}> {
	try {
		const sources = await queryDataSourcesRegistry17();
		return {
			healthy: sources.length > 0,
			status: sources.length > 0 ? "healthy" : "degraded",
			sourceCount: sources.length,
			lastChecked: Date.now(),
		};
	} catch (error) {
		return {
			healthy: false,
			status: "offline",
			sourceCount: 0,
			lastChecked: Date.now(),
		};
	}
}
