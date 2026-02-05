/**
 * @fileoverview MCP Tools Registry v17
 * @description 17.15.0.0.0.0.0 - RadianceTyped MCP tools registry queries
 * @module 17.15.0.0.0.0.0-radiance/registry.mcp-tools.17
 */

import type { McpToolDefinition } from "./types.radiance.17";
import { ROUTING_REGISTRY_NAMES } from "../../utils/rss-constants";

/**
 * Query MCP Tools Registry v17
 * 
 * @param filters - Optional filters for querying tools
 * @returns Array of McpToolDefinition items
 */
export async function queryMcpToolsRegistry17(
	filters?: {
		category?: string;
		name?: string;
	},
): Promise<McpToolDefinition[]> {
	const { createBunToolingTools } = await import("../../mcp");
	const tools = createBunToolingTools();

	return tools.map((tool: any) => ({
		...tool,
		id: tool.id?.startsWith("tool_") ? tool.id : `tool_${tool.id || tool.name}`,
		version: tool.version || "v1.0.0",
		__category: ROUTING_REGISTRY_NAMES.MCP_TOOLS as const,
		__version: "17.15.0" as const,
		__radianceChannel: "radiance-mcp" as const,
		__semanticType: "McpToolDefinition",
	})) as McpToolDefinition[];
}

/**
 * Probe MCP Tools Health v17
 * 
 * @returns Health status
 */
export async function probeMcpToolsHealth17(): Promise<{
	healthy: boolean;
	status: "healthy" | "degraded" | "offline";
	toolCount: number;
	lastChecked: number;
}> {
	try {
		const tools = await queryMcpToolsRegistry17();
		return {
			healthy: tools.length > 0,
			status: tools.length > 0 ? "healthy" : "degraded",
			toolCount: tools.length,
			lastChecked: Date.now(),
		};
	} catch (error) {
		return {
			healthy: false,
			status: "offline",
			toolCount: 0,
			lastChecked: Date.now(),
		};
	}
}
