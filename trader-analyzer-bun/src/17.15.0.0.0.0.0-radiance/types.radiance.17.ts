/**
 * @fileoverview Radiance Type System
 * @description 17.15.0.0.0.0.0 - RadianceTyped<T> branded types for zero-ambiguity semantic architecture
 * @module 17.15.0.0.0.0.0-radiance/types.radiance.17
 *
 * **From Human-Readable Chaos → Deterministic, Self-Documenting, Radiance-Aligned Semantic Architecture**
 *
 * Every type knows its purpose.
 * Every function knows its version.
 * Every route knows its contract.
 */

import type { z } from "zod";

/**
 * Brand symbol for type safety
 */
declare const brand: unique symbol;

/**
 * Radiance Category - Registry categories that map to radiance channels
 */
export type RadianceCategory =
	| "properties"
	| "data-sources"
	| "mcp-tools"
	| "sharp-books"
	| "security-threats"
	| "tension-patterns"
	| "url-anomaly-patterns"
	| "errors"
	| "bookmaker-profiles"
	| "cli-commands"
	| "team-departments"
	| "topics"
	| "api-examples"
	| "mini-app"
	| "css-bundler"
	| "bun-apis"
	| "correlation-engine";

/**
 * RadianceTyped - Branded type for zero-ambiguity registry items
 *
 * @template T - The underlying data structure
 * @template Category - The registry category (maps to radiance channel)
 *
 * @example
 * ```ts
 * const prop: PropertyDefinition = {
 *   id: "prop_user_id",
 *   name: "User ID",
 *   schema: z.string().uuid(),
 *   version: "v1.0.0",
 *   lineage: ["source:users"],
 *   validationMode: "strict"
 * } as PropertyDefinition;
 * ```
 */
export interface RadianceTyped<T, Category extends RadianceCategory> {
	readonly [brand]: T;
	readonly __category: Category;
	readonly __version: `${number}.${number}.${number}`;
	readonly __radianceChannel: `radiance-${Category}`;
	readonly __semanticType: string;
}

/**
 * Semantic Version Pattern
 */
export type SemanticVersion = `v${number}.${number}.${number}`;

/**
 * Property Definition - RadianceTyped property registry item
 */
export type PropertyDefinition = RadianceTyped<
	{
		id: `prop_${string}`;
		name: string;
		schema: z.ZodTypeAny;
		version: SemanticVersion;
		lineage: string[];
		validationMode: "strict" | "lax" | "legacy";
		namespace?: string;
		metadata?: Record<string, unknown>;
		accessControl?: {
			roles: Set<`role_${string}`>;
			featureFlags: Set<`ff_${string}`>;
		};
	},
	"properties"
>;

/**
 * Data Source Configuration - RadianceTyped data source registry item
 */
export type DataSourceConfig = RadianceTyped<
	{
		id: `source_${string}`;
		name: string;
		endpoint: URL;
		auth: "bearer" | "api-key" | "none" | "oauth2";
		rbac: Set<`role_${string}`>;
		featureFlags: Set<`ff_${string}`>;
		version: SemanticVersion;
		type: "rest" | "websocket" | "graphql" | "grpc";
		namespace?: string;
		metadata?: Record<string, unknown>;
	},
	"data-sources"
>;

/**
 * MCP Tool Definition - RadianceTyped MCP tools registry item
 */
export type McpToolDefinition = RadianceTyped<
	{
		id: `tool_${string}`;
		name: string;
		description: string;
		category: string;
		inputSchema: Record<string, unknown>;
		execute: (args: Record<string, unknown>) => Promise<unknown>;
		version: SemanticVersion;
		latencyMs?: number;
		lastExecuted?: number;
		metadata?: Record<string, unknown>;
	},
	"mcp-tools"
>;

/**
 * Sharp Book Definition - RadianceTyped sharp books registry item
 */
export type SharpBookDefinition = RadianceTyped<
	{
		id: `book_${string}`;
		name: string;
		sharpTier: 1 | 2 | 3 | 4;
		weight: number;
		status: "active" | "degraded" | "offline";
		endpoints: {
			odds: URL;
			markets?: URL;
			auth?: URL;
		};
		rateLimit: {
			requestsPerSecond: number;
			burst: number;
		};
		latencyBenchmark: number;
		tags: Set<string>;
		cryptoAccepted: boolean;
		limitsWinners: boolean;
		version: SemanticVersion;
		metadata?: Record<string, unknown>;
	},
	"sharp-books"
>;

/**
 * Security Threat Definition - RadianceTyped security threats registry item
 */
export type SecurityThreatDefinition = RadianceTyped<
	{
		id: `threat_${string}`;
		type: "breach" | "ddos" | "injection" | "unauthorized" | "malware";
		severity: "critical" | "high" | "medium" | "low";
		detectedAt: number;
		resolvedAt?: number;
		source: string;
		target: string;
		description: string;
		mitigation: string[];
		version: SemanticVersion;
		metadata?: Record<string, unknown>;
	},
	"security-threats"
>;

/**
 * Tension Pattern Definition - RadianceTyped tension patterns registry item
 */
export type TensionPatternDefinition = RadianceTyped<
	{
		id: `pattern_${string}`;
		eventId: string;
		marketId: string;
		tensionScore: number;
		confidence: number;
		detectedAt: number;
		bookmakers: Set<string>;
		arbitrageOpportunity?: {
			edge: number;
			profitEstimate: number;
		};
		version: SemanticVersion;
		metadata?: Record<string, unknown>;
	},
	"tension-patterns"
>;

/**
 * URL Anomaly Pattern Definition - RadianceTyped URL anomaly patterns registry item
 */
export type UrlAnomalyPatternDefinition = RadianceTyped<
	{
		id: `anomaly_${string}`;
		pattern: string;
		anomalyType: "false_steam" | "covert_steam" | "line_movement" | "other";
		confidence: number;
		detectedAt: number;
		bookmaker: string;
		eventId?: string;
		marketImpact: {
			avgLineDelta: number;
			frequencyPerHour: number;
			falseSteamProbability: number;
		};
		version: SemanticVersion;
		metadata?: Record<string, unknown>;
	},
	"url-anomaly-patterns"
>;

/**
 * Error Definition - RadianceTyped error registry item
 */
export type ErrorDefinition = RadianceTyped<
	{
		id: `error_${string}`;
		code: `NX-${number}`;
		message: string;
		category: string;
		status: number;
		recoverable: boolean;
		ref?: string;
		version: SemanticVersion;
		metadata?: Record<string, unknown>;
	},
	"errors"
>;

/**
 * Registry Item Union - All possible registry item types
 */
export type RegistryItem17 =
	| PropertyDefinition
	| DataSourceConfig
	| McpToolDefinition
	| SharpBookDefinition
	| SecurityThreatDefinition
	| TensionPatternDefinition
	| UrlAnomalyPatternDefinition
	| ErrorDefinition;

/**
 * Type guard: Check if item is PropertyDefinition
 */
export function isPropertyDefinition17(
	item: RegistryItem17,
): item is PropertyDefinition {
	return (item as PropertyDefinition).__category === "properties";
}

/**
 * Type guard: Check if item is DataSourceConfig
 */
export function isDataSourceConfig17(
	item: RegistryItem17,
): item is DataSourceConfig {
	return (item as DataSourceConfig).__category === "data-sources";
}

/**
 * Type guard: Check if item is McpToolDefinition
 */
export function isMcpToolDefinition17(
	item: RegistryItem17,
): item is McpToolDefinition {
	return (item as McpToolDefinition).__category === "mcp-tools";
}

/**
 * Get radiance channel from registry item
 */
export function getRadianceChannel17<T extends RegistryItem17>(
	item: T,
): T["__radianceChannel"] {
	return item.__radianceChannel;
}

/**
 * Get semantic type from registry item
 */
export function getSemanticType17<T extends RegistryItem17>(
	item: T,
): T["__semanticType"] {
	return item.__semanticType;
}
