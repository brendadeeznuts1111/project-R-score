/**
 * @fileoverview NEXUS Registry of Registries
 * @description 17.14.0.0.0.0.0 - The One Registry to Rule Them All
 * @module 17.14.0.0.0.0.0-nexus/registry-of-registries
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-REGISTRY-OF-REGISTRIES@17.14.0;instance-id=NEXUS-REGISTRY-001;version=17.14.0}]
 * [PROPERTIES:{registry={value:"registry-of-registries";@root:"ROOT-NEXUS";@chain:["BP-RADIANCE","BP-REGISTRY"];@version:"17.14.0"}}]
 * [CLASS:RegistryOfRegistries][#REF:v-17.14.0.BP.REGISTRY.OF.REGISTRIES.1.0.A.1.1.NEXUS.1.1]]
 *
 * **The Registry Has Achieved Consciousness**
 *
 * Every registry is no longer just documented — it is monitored, versioned, validated, and radiantly exposed.
 */

import type { RegistryStatus } from "../../api/registry";
import { RSS_API_PATHS, ROUTING_REGISTRY_NAMES, TELEGRAM_MINIAPP_URLS } from "../../utils/rss-constants";

/**
 * Registry health check function
 * Returns true if registry is healthy, false otherwise
 */
export type RegistryHealthCheck = () => Promise<boolean> | boolean;

/**
 * Registry metadata with radiance integration
 */
export interface RegistryMetadata {
	/** Unique registry identifier */
	id: string;
	/** Human-readable name */
	name: string;
	/** Category classification */
	category: "data" | "tooling" | "security" | "research" | "integration" | "cli";
	/** API endpoint path */
	endpoint: string;
	/** Searchable tags */
	tags: string[];
	/** Use cases */
	useCases: string[];
	/** Whether this registry supports real-time monitoring */
	realtime: boolean;
	/** Radiance channel for events */
	radianceChannel: string;
	/** Radiance severity level */
	radianceSeverity: "critical" | "high" | "warn" | "info";
	/** Health check function */
	healthCheck: RegistryHealthCheck;
	/** Last known status */
	lastStatus?: RegistryStatus;
	/** Last checked timestamp */
	lastChecked?: number;
}

/**
 * NEXUS Registry of Registries
 * Single source of truth for all 16 registries + 1 meta-registry
 */
export const NEXUS_REGISTRY_OF_REGISTRIES: Record<string, RegistryMetadata> = {
	// ============ Data Registries ============
	properties: {
		id: ROUTING_REGISTRY_NAMES.PROPERTIES,
		name: "Property Registry",
		category: "data",
		endpoint: RSS_API_PATHS.REGISTRY_PROPERTIES,
		tags: ["schema", "versioning", "lineage", "validation"],
		useCases: [
			"Schema validation for API payloads",
			"Property versioning with semver",
			"Data lineage tracking across transformations",
		],
		realtime: true,
		radianceChannel: "radiance-properties",
		radianceSeverity: "critical",
		healthCheck: async () => {
			try {
				const { PropertyRegistry } = await import("../../properties/registry");
				const registry = new PropertyRegistry();
				const props = registry.query ? registry.query({}) : [];
				registry.close();
				return Array.isArray(props) && props.length >= 0;
			} catch {
				return false;
			}
		},
	},

	"data-sources": {
		id: ROUTING_REGISTRY_NAMES.DATA_SOURCES,
		name: "Data Source Registry",
		category: "data",
		endpoint: RSS_API_PATHS.REGISTRY_DATA_SOURCES,
		tags: ["sources", "rbac", "feature-flags", "pipeline"],
		useCases: [
			"Source registration and discovery",
			"RBAC-based access control per user/role",
			"Feature flag gating for beta sources",
		],
		realtime: true,
		radianceChannel: "radiance-data-sources",
		radianceSeverity: "high",
		healthCheck: async () => {
			try {
				const { DataSourceRegistry } = await import("../../sources/registry");
				const registry = new DataSourceRegistry();
				const sources = registry.query ? registry.query({}) : [];
				registry.close();
				return Array.isArray(sources) && sources.length >= 0;
			} catch {
				return false;
			}
		},
	},

	"sharp-books": {
		id: ROUTING_REGISTRY_NAMES.SHARP_BOOKS,
		name: "Sharp Books Registry",
		category: "data",
		endpoint: RSS_API_PATHS.REGISTRY_SHARP_BOOKS,
		tags: ["bookmakers", "sharp", "tiers", "endpoints"],
		useCases: [
			"Bookmaker discovery by sharpness tier",
			"Sharp signal detection and aggregation",
			"Line movement tracking across books",
		],
		realtime: true,
		radianceChannel: "radiance-sharp",
		radianceSeverity: "high",
		healthCheck: async () => {
			try {
				const { SHARP_BOOKS } = await import("../../orca/sharp-books/registry");
				return Object.keys(SHARP_BOOKS).length > 0;
			} catch {
				return false;
			}
		},
	},

	// ============ Tooling Registries ============
	"mcp-tools": {
		id: ROUTING_REGISTRY_NAMES.MCP_TOOLS,
		name: "MCP Tools Registry",
		category: "tooling",
		endpoint: RSS_API_PATHS.REGISTRY_MCP_TOOLS,
		tags: ["mcp", "tools", "ai", "integration"],
		useCases: [
			"AI tool discovery and execution",
			"MCP server integration",
			"Tool performance monitoring",
		],
		realtime: true,
		radianceChannel: "radiance-mcp",
		radianceSeverity: "warn",
		healthCheck: async () => {
			try {
				const { createBunToolingTools } = await import("../../mcp");
				const tools = createBunToolingTools();
				return Array.isArray(tools) && tools.length > 0;
			} catch {
				return false;
			}
		},
	},

	"css-bundler": {
		id: "css-bundler",
		name: "CSS Bundler Utilities",
		category: "tooling",
		endpoint: "/api/registry/css-bundler",
		tags: ["css", "bundler", "bun", "color"],
		useCases: [
			"CSS bundling with Bun.build",
			"CSS modules with composition",
			"Syntax lowering detection",
		],
		realtime: false,
		radianceChannel: "radiance-tooling",
		radianceSeverity: "info",
		healthCheck: () => true, // Static utilities, always available
	},

	"bun-apis": {
		id: "bun-apis",
		name: "Bun APIs Registry",
		category: "tooling",
		endpoint: "/api/registry/bun-apis",
		tags: ["bun", "apis", "runtime", "serve"],
		useCases: [
			"Bun API discovery and documentation",
			"API compatibility checking",
			"Feature flag tracking for new APIs",
		],
		realtime: false,
		radianceChannel: "radiance-tooling",
		radianceSeverity: "info",
		healthCheck: () => true, // Static documentation, always available
	},

	// ============ Security Registries ============
	"bookmaker-profiles": {
		id: "bookmaker-profiles",
		name: "Bookmaker Profile Registry",
		category: "security",
		endpoint: "/api/registry/bookmaker-profiles",
		tags: ["bookmakers", "endpoints", "forensic", "parameters"],
		useCases: [
			"Endpoint profiling",
			"Parameter validation",
			"Forensic logging",
			"Anomaly detection",
		],
		realtime: true,
		radianceChannel: "radiance-discovery",
		radianceSeverity: "high",
		healthCheck: async () => {
			try {
				const { getEndpointConfigForLogger } = await import("../../logging/bookmaker-profile");
				// Check if registry is accessible
				return typeof getEndpointConfigForLogger === "function";
			} catch {
				return false;
			}
		},
	},

	"security-threats": {
		id: "security-threats",
		name: "Security Threats Registry",
		category: "security",
		endpoint: "/api/security/threats",
		tags: ["security", "threats", "incidents", "monitoring"],
		useCases: [
			"Real-time threat detection",
			"Incident response tracking",
			"Compliance audit logging",
		],
		realtime: true,
		radianceChannel: "radiance-critical",
		radianceSeverity: "critical",
		healthCheck: async () => {
			try {
				const { Database } = await import("bun:sqlite");
				const { existsSync } = await import("fs");
				const dbPath = "./data/security.db";
				return existsSync(dbPath);
			} catch {
				return false;
			}
		},
	},

	// ============ Research Registries ============
	"url-anomaly-patterns": {
		id: "url-anomaly-patterns",
		name: "URL Anomaly Pattern Registry",
		category: "research",
		endpoint: "/api/registry/url-anomaly-patterns",
		tags: ["url", "anomalies", "patterns", "forensic"],
		useCases: [
			"Pattern discovery",
			"False steam detection",
			"URL artifact filtering",
		],
		realtime: true,
		radianceChannel: "radiance-research",
		radianceSeverity: "warn",
		healthCheck: async () => {
			try {
				const { Database } = await import("bun:sqlite");
				const { existsSync } = await import("fs");
				const dbPath = "./data/research.db";
				return existsSync(dbPath);
			} catch {
				return false;
			}
		},
	},

	"tension-patterns": {
		id: "tension-patterns",
		name: "Tension Pattern Registry",
		category: "research",
		endpoint: "/api/registry/tension-patterns",
		tags: ["tension", "arbitrage", "patterns", "nodes"],
		useCases: [
			"Tension event discovery",
			"Cross-market correlation analysis",
			"Arbitrage opportunity detection",
		],
		realtime: true,
		radianceChannel: "radiance-arbitrage",
		radianceSeverity: "high",
		healthCheck: async () => {
			try {
				const { Database } = await import("bun:sqlite");
				const { existsSync } = await import("fs");
				const dbPath = "./data/research.db";
				return existsSync(dbPath);
			} catch {
				return false;
			}
		},
	},

	// ============ Integration Registries ============
	errors: {
		id: "errors",
		name: "Error Registry",
		category: "integration",
		endpoint: "/api/registry/errors",
		tags: ["errors", "codes", "nx-xxx", "references"],
		useCases: [
			"Error code lookup",
			"Error documentation",
			"Error tracking",
		],
		realtime: true,
		radianceChannel: "radiance-critical",
		radianceSeverity: "critical",
		healthCheck: async () => {
			try {
				const { ERROR_REGISTRY } = await import("../../errors");
				return Object.keys(ERROR_REGISTRY).length > 0;
			} catch {
				return false;
			}
		},
	},

	"team-departments": {
		id: ROUTING_REGISTRY_NAMES.TEAM_DEPARTMENTS,
		name: "Team & Departments Registry",
		category: "integration",
		endpoint: RSS_API_PATHS.REGISTRY_TEAM_DEPARTMENTS,
		tags: ["team", "departments", "review", "organization"],
		useCases: [
			"Team structure lookup",
			"Code review assignment",
			"Department discovery",
		],
		realtime: false,
		radianceChannel: "radiance-info",
		radianceSeverity: "info",
		healthCheck: () => true, // Static definitions, always available
	},

	topics: {
		id: "topics",
		name: "Topics & Categories Registry",
		category: "integration",
		endpoint: "/api/registry/topics",
		tags: ["topics", "labels", "categories", "github"],
		useCases: [
			"Topic discovery and documentation",
			"Label management",
			"Category organization",
		],
		realtime: false,
		radianceChannel: "radiance-info",
		radianceSeverity: "info",
		healthCheck: () => true, // Static definitions, always available
	},

	"api-examples": {
		id: "api-examples",
		name: "API Examples Registry",
		category: "integration",
		endpoint: "/api/examples",
		tags: ["examples", "api", "documentation"],
		useCases: [
			"API exploration and testing",
			"Code generation from examples",
			"Documentation generation",
		],
		realtime: false,
		radianceChannel: "radiance-info",
		radianceSeverity: "info",
		healthCheck: () => true, // Static definitions, always available
	},

	"mini-app": {
		id: "mini-app",
		name: "Factory Wager Mini App",
		category: "integration",
		endpoint: RSS_API_PATHS.MINIAPP_INFO,
		tags: ["telegram", "miniapp", "alerts", "arbitrage"],
		useCases: [
			"Real-time covert steam alerts",
			"Arbitrage opportunity notifications",
			"Sports betting market monitoring",
		],
		realtime: true,
		radianceChannel: "radiance-miniapp",
		radianceSeverity: "high",
		healthCheck: async () => {
			try {
				const response = await fetch(TELEGRAM_MINIAPP_URLS.STAGING, {
					signal: AbortSignal.timeout(3000),
				});
				return response.ok;
			} catch {
				return false;
			}
		},
	},

	// ============ CLI Registry ============
	"cli-commands": {
		id: ROUTING_REGISTRY_NAMES.CLI_COMMANDS,
		name: "CLI Commands Registry",
		category: "cli",
		endpoint: RSS_API_PATHS.REGISTRY_CLI_COMMANDS,
		tags: ["cli", "commands", "telegram", "mcp"],
		useCases: [
			"CLI command discovery",
			"Command documentation lookup",
			"Usage examples and cross-references",
		],
		realtime: false,
		radianceChannel: "radiance-info",
		radianceSeverity: "info",
		healthCheck: () => true, // Static definitions, always available
	},

	// ============ Meta-Registry ============
	"registry-of-registries": {
		id: "registry-of-registries",
		name: "Registry of Registries",
		category: "integration",
		endpoint: "/api/registry/registry-of-registries",
		tags: ["meta", "registry", "nexus", "17.14.0"],
		useCases: [
			"Single source of truth for all registries",
			"Registry health monitoring",
			"Radiance event coordination",
		],
		realtime: true,
		radianceChannel: "radiance-registry",
		radianceSeverity: "info",
		healthCheck: () => {
			// Meta-registry is always healthy if this code is running
			return Object.keys(NEXUS_REGISTRY_OF_REGISTRIES).length >= 16;
		},
	},
} as const;

/**
 * Get registry metadata by ID
 */
export function getRegistryMetadata(id: string): RegistryMetadata | undefined {
	return NEXUS_REGISTRY_OF_REGISTRIES[id];
}

/**
 * Get all registries by category
 */
export function getRegistriesByCategory(
	category: RegistryMetadata["category"],
): RegistryMetadata[] {
	return Object.values(NEXUS_REGISTRY_OF_REGISTRIES).filter(
		(reg) => reg.category === category,
	);
}

/**
 * Get all real-time registries
 */
export function getRealtimeRegistries(): RegistryMetadata[] {
	return Object.values(NEXUS_REGISTRY_OF_REGISTRIES).filter((reg) => reg.realtime);
}

/**
 * Get registry radiance channel
 */
export function getRegistryRadianceChannel(id: string): string | undefined {
	return NEXUS_REGISTRY_OF_REGISTRIES[id]?.radianceChannel;
}
