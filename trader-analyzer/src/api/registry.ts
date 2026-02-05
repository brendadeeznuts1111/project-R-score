/**
 * @fileoverview Registry API Endpoints
 * @description Unified registry system with dedicated endpoints for each registry type
 * @module api/registry
 *
 * [REGISTRY.SYSTEM.RG] 📚 Registry System
 * Provides a unified browser for all platform registries including properties,
 * data sources, tools, errors, and more.
 *
 * @see {@link ../docs/ANTI-PATTERNS.md|Anti-Patterns Guide} for coding best practices
 * @see {@link ../docs/NAMING-CONVENTIONS.md|Naming Conventions} for code style guidelines
 */

import { Database } from "bun:sqlite";
import {
	ERROR_REGISTRY,
	type ErrorCategory,
	type ErrorDefinition,
} from "../errors";
import {
	createAnomalyResearchTools,
	createBunShellTools,
	createBunToolingTools,
	createDocsIntegrationTools,
	createResearchTools,
	createSecurityDashboardTools,
} from "../mcp";
import { SHARP_BOOKS } from "../orca/sharp-books/registry";
import { getBookmakerRegistry, type UnifiedBookmaker } from "../orca/bookmakers";
import { PropertyRegistry } from "../properties/registry";
import { UrlAnomalyPatternEngine } from "../research/patterns/url-anomaly-patterns";
import { DataSourceRegistry } from "../sources/registry";
import { RegistryFormatter } from "../utils/registry-formatter";
import {
	RSS_API_PATHS,
	RSS_BENCHMARK_PATHS,
	RSS_COMMANDS_PATHS,
	RSS_TEAM_PATHS,
} from "../utils/rss-constants";

// ═══════════════════════════════════════════════════════════════
// Constants (UPPER_SNAKE_CASE)
// ═══════════════════════════════════════════════════════════════

/** Confidence level thresholds */
const CONFIDENCE_THRESHOLDS = {
	HIGH: 0.7,
	MEDIUM_MIN: 0.4,
	MEDIUM_MAX: 0.7,
} as const;

/** Health check thresholds */
const HEALTH_THRESHOLDS = {
	MAX_RESPONSE_MS: 100,
	MAX_ERROR_RATE: 0.1,
} as const;

/** Time conversion constants */
const SECONDS_PER_HOUR = 3600;
const MS_PER_SECOND = 1000;

/** Decimal precision constants */
const DECIMAL_PRECISION = {
	ANOMALY_RATE: 10000, // 4 decimal places
	CONFIDENCE: 100, // 2 decimal places
} as const;

/**
 * Benchmark configuration with metadata, paths, and performance thresholds
 */
export type BenchmarkConfig = {
	name: string;
	path: string;
	layers: number[] | string[];
	criticalPath: string;
	thresholds: {
		duration: number; // milliseconds
		memory: number; // MB
		cpu: number; // percentage
	};
};

/**
 * Benchmark Registry
 * Centralized registry of benchmark configurations with metadata, paths, and thresholds
 */
export const BENCHMARK_REGISTRY = {
	"market-analysis-baseline": {
		name: "Market Analysis Baseline",
		path: RSS_BENCHMARK_PATHS.MARKET_ANALYSIS_BASELINE,
		layers: [1, 2, 3, 4],
		criticalPath: "layer4.crossSportCorrelation",
		thresholds: {
			duration: 5000,
			memory: 2048,
			cpu: 80,
		},
	},
	"stress-test-1M-nodes": {
		name: "Stress Test (1M Nodes)",
		path: RSS_BENCHMARK_PATHS.STRESS_TEST_1M_NODES,
		layers: ["full-assembly"],
		criticalPath: "fullGraphAssembly.totalTime",
		thresholds: {
			duration: 10000,
			memory: 4096,
			cpu: 95,
		},
	},
	"layer4-correlation-baseline": {
		name: "Layer4 Correlation Detection Baseline",
		path: RSS_BENCHMARK_PATHS.LAYER4_CORRELATION_BASELINE,
		layers: [4],
		criticalPath: "layer4.correlationDetection",
		thresholds: {
			duration: 1000, // 1 second for 100 correlations
			memory: 512, // MB
			cpu: 80, // percentage
		},
	},
} as const;

/**
 * Registry health status
 */
export type RegistryStatus = "healthy" | "degraded" | "offline" | "unknown";

/**
 * Registry type definition
 */
export type RegistryType =
	| "property"
	| "data-source"
	| "tool"
	| "error"
	| "config"
	| "schema"
	| "pattern"
	| "endpoint"
	| "cli-command";

/**
 * Registry item with enhanced metadata
 */
export interface RegistryItem {
	id: string;
	name: string;
	type: string;
	description?: string;
	metadata?: Record<string, unknown>;
	createdAt?: number;
	updatedAt?: number;
}

/**
 * Registry metrics
 */
export interface RegistryMetrics {
	totalItems: number;
	activeItems: number;
	lastUpdated: number;
	queryCount24h: number;
	avgResponseMs: number;
	errorRate: number;
}

/**
 * Registry types in the system
 */
export interface RegistryInfo {
	id: string;
	name: string;
	description: string;
	category:
		| "data"
		| "tooling"
		| "security"
		| "research"
		| "integration"
		| "cli";
	type: RegistryType;
	endpoint: string;
	tags: string[];
	useCases: string[];
	itemCount?: number;
	lastUpdated?: number;
	status: RegistryStatus;
	metrics?: RegistryMetrics;
	schema?: {
		version: string;
		properties: string[];
	};
}

/**
 * Registry overview response
 */
export interface RegistryOverview {
	registries: RegistryInfo[];
	total: number;
	totalItems: number;
	categories: Record<string, number>;
	byType: Record<string, number>;
	byStatus: Record<string, number>;
	summary: {
		healthy: number;
		degraded: number;
		offline: number;
		lastRefresh: number;
	};
}

/**
 * Format registries overview as table (using BunUtilities)
 */
export function formatRegistriesOverview(overview: RegistryOverview): string {
	return RegistryFormatter.formatOverview(overview.registries);
}

/**
 * Format registry items as table (using BunUtilities)
 */
export function formatRegistryItems(items: RegistryItem[]): string {
	return RegistryFormatter.formatItems(items);
}

/**
 * Get all registries overview with enhanced metrics
 */
export async function getRegistriesOverview(): Promise<RegistryOverview> {
	const now = Date.now();

	const registries: RegistryInfo[] = [
		// ============ Data Registries ============
		{
			id: "properties",
			name: "Property Registry",
			description:
				"Property definitions with versioning, lineage tracking, and schema validation",
			category: "data",
			type: "property",
			endpoint: "/api/registry/properties",
			tags: ["schema", "versioning", "lineage", "validation", "types"],
			useCases: [
				"Schema validation for API payloads",
				"Property versioning with semver",
				"Data lineage tracking across transformations",
				"Usage analytics and access control",
				"Type-safe property definitions",
			],
			status: "healthy",
			schema: {
				version: "1.0.0",
				properties: [
					"id",
					"namespace",
					"version",
					"type",
					"schema",
					"metadata",
					"accessControl",
				],
			},
		},
		{
			id: "data-sources",
			name: "Data Source Registry",
			description:
				"Data source definitions with RBAC, feature flags, and pipeline integration",
			category: "data",
			type: "data-source",
			endpoint: "/api/registry/data-sources",
			tags: ["sources", "rbac", "feature-flags", "pipeline", "connectors"],
			useCases: [
				"Source registration and discovery",
				"RBAC-based access control per user/role",
				"Feature flag gating for beta sources",
				"Pipeline stage configuration",
				"Connector health monitoring",
			],
			status: "healthy",
			schema: {
				version: "1.0.0",
				properties: [
					"id",
					"name",
					"namespace",
					"version",
					"type",
					"package",
					"properties",
					"pipeline",
					"accessControl",
				],
			},
		},
		{
			id: "sharp-books",
			name: "Sharp Books Registry",
			description:
				"Sharp bookmaker configurations with tier rankings (S+ to B+), endpoints, and latency benchmarks",
			category: "data",
			type: "config",
			endpoint: "/api/registry/sharp-books",
			tags: ["bookmakers", "sharp", "tiers", "endpoints", "latency", "odds"],
			useCases: [
				"Bookmaker discovery by sharpness tier",
				"Sharp signal detection and aggregation",
				"Line movement tracking across books",
				"Endpoint management and health",
				"Latency benchmarking for arbitrage",
			],
			status: "healthy",
			schema: {
				version: "1.0.0",
				properties: [
					"id",
					"name",
					"sharpTier",
					"endpoints",
					"latencyBenchmark",
					"weight",
					"tags",
					"status",
				],
			},
		},

		// ============ Security Registries ============
		{
			id: "bookmaker-profiles",
			name: "Bookmaker Profile Registry",
			description:
				"Bookmaker endpoint parameter configurations for forensic logging and anomaly detection",
			category: "security",
			type: "endpoint",
			endpoint: "/api/registry/bookmaker-profiles",
			tags: ["bookmakers", "endpoints", "forensic", "parameters", "profiling"],
			useCases: [
				"Endpoint profiling for each bookmaker",
				"Parameter validation and normalization",
				"Forensic logging configuration",
				"Anomaly detection thresholds",
				"Rate limit tracking per endpoint",
			],
			status: "healthy",
			schema: {
				version: "1.0.0",
				properties: [
					"bookmaker",
					"endpoint",
					"parameters",
					"lastProfiled",
					"anomalyThresholds",
				],
			},
		},
		{
			id: "bookmakers",
			name: "Unified Bookmaker Registry",
			description:
				"Unified registry combining sharp book data, geographic information, and profile data",
			category: "data",
			type: "unified",
			endpoint: "/api/registry/bookmakers",
			tags: [
				"bookmakers",
				"sharp",
				"geographic",
				"profiles",
				"tiers",
				"regions",
				"latency",
			],
			useCases: [
				"Complete bookmaker information lookup",
				"Geographic filtering and optimization",
				"Sharp tier analysis",
				"Latency-based bookmaker selection",
				"Regional bookmaker discovery",
				"Combined sharp + geographic queries",
			],
			status: "healthy",
			schema: {
				version: "1.0.0",
				properties: [
					"id",
					"name",
					"sharpTier",
					"endpoints",
					"latencyBenchmark",
					"weight",
					"tags",
					"status",
					"geographic",
					"profile",
				],
			},
		},
		{
			id: "errors",
			name: "Error Registry",
			description:
				"Error code registry with NX-xxx codes, categories, and documentation references",
			category: "integration",
			type: "error",
			endpoint: "/api/registry/errors",
			tags: ["errors", "codes", "nx-xxx", "references", "categories"],
			useCases: [
				"Error code lookup and documentation",
				"Error categorization (AUTH, VALIDATION, etc.)",
				"Recoverable vs non-recoverable errors",
				"API error response generation",
				"Error tracking and analytics",
			],
			status: "healthy",
			schema: {
				version: "1.0.0",
				properties: [
					"code",
					"status",
					"message",
					"category",
					"ref",
					"recoverable",
				],
			},
		},
		{
			id: "security-threats",
			name: "Security Threats Registry",
			description: "Real-time security threat monitoring and incident tracking",
			category: "security",
			type: "pattern",
			endpoint: "/api/security/threats",
			tags: ["security", "threats", "incidents", "monitoring", "compliance"],
			useCases: [
				"Real-time threat detection",
				"Incident response tracking",
				"Compliance audit logging",
				"Security metrics dashboard",
				"Threat pattern analysis",
			],
			status: "healthy",
			schema: {
				version: "1.0.0",
				properties: [
					"threatType",
					"severity",
					"timestamp",
					"source",
					"details",
					"resolved",
				],
			},
		},

		// ============ Tooling Registries ============
		{
			id: "mcp-tools",
			name: "MCP Tools Registry",
			description:
				"Model Context Protocol tools for AI integration (34+ tools across 6 categories)",
			category: "tooling",
			type: "tool",
			endpoint: "/api/registry/mcp-tools",
			tags: ["mcp", "tools", "ai", "integration", "claude", "llm"],
			useCases: [
				"AI tool integration for Claude/LLMs",
				"Tool discovery and metadata",
				"Tool execution and monitoring",
				"MCP server management",
				"Tool invocation statistics",
			],
			status: "healthy",
			schema: {
				version: "1.0.0",
				properties: ["name", "description", "category", "tags", "inputSchema"],
			},
		},
		{
			id: "css-bundler",
			name: "CSS Bundler Utilities",
			description:
				"Bun CSS bundler integration with syntax lowering (nesting, color-mix, relative colors, LAB colors, logical properties, modern selectors, math functions)",
			category: "tooling",
			type: "tool",
			endpoint: "/api/registry/css-bundler",
			tags: [
				"css",
				"bundler",
				"bun",
				"color",
				"syntax-lowering",
				"nesting",
				"color-mix",
				"relative-colors",
				"lab-colors",
				"logical-properties",
				"modern-selectors",
				"math-functions",
			],
			useCases: [
				"CSS bundling with Bun.build",
				"CSS modules with composition",
				"Syntax lowering detection and validation",
				"Color utilities with Bun.color",
				"Golden CSS Template patterns",
				"Modern CSS feature support",
				"RTL/LTR with logical properties",
			],
			status: "healthy",
			schema: {
				version: "1.0.0",
				properties: ["syntax", "targets", "modules", "colors", "minify"],
			},
		},
		{
			id: "bun-apis",
			name: "Bun APIs Registry",
			description:
				"Comprehensive Bun API coverage including Bun.serve, Bun.file, bun:sqlite, and Bun 1.3 features",
			category: "tooling",
			type: "schema",
			endpoint: "/api/registry/bun-apis",
			tags: ["bun", "apis", "runtime", "serve", "sqlite", "file", "1.3"],
			useCases: [
				"Bun API discovery and documentation",
				"API compatibility checking",
				"Feature flag tracking for new APIs",
				"Migration guides for Node.js",
				"Performance benchmarking",
			],
			status: "healthy",
			schema: {
				version: "1.3.3",
				properties: [
					"name",
					"module",
					"signature",
					"description",
					"example",
					"bunVersion",
				],
			},
		},

		// ============ Research Registries ============
		{
			id: "url-anomaly-patterns",
			name: "URL Anomaly Pattern Registry",
			description:
				"URL anomaly patterns discovered from forensic logging for false steam detection",
			category: "research",
			type: "pattern",
			endpoint: "/api/registry/url-anomaly-patterns",
			tags: [
				"url",
				"anomalies",
				"patterns",
				"forensic",
				"steam",
				"false-positives",
			],
			useCases: [
				"Pattern discovery from logs",
				"False steam detection and filtering",
				"URL artifact identification",
				"Research analysis and backtesting",
				"Historical data correction",
			],
			status: "healthy",
			schema: {
				version: "1.0.0",
				properties: [
					"patternId",
					"pattern_name",
					"anomaly_type",
					"affected_bookmakers",
					"confidence",
				],
			},
		},
		{
			id: "tension-patterns",
			name: "Tension Pattern Registry",
			description:
				"Market tension patterns between sub-market nodes for arbitrage detection",
			category: "research",
			type: "pattern",
			endpoint: "/api/registry/tension-patterns",
			tags: ["tension", "arbitrage", "patterns", "nodes", "correlation"],
			useCases: [
				"Tension event discovery",
				"Cross-market correlation analysis",
				"Arbitrage opportunity detection",
				"Pattern backtesting",
				"ML clustering for new patterns",
			],
			status: "healthy",
			schema: {
				version: "1.0.0",
				properties: [
					"patternId",
					"nodeId1",
					"nodeId2",
					"correlation",
					"windowMinutes",
					"confidence",
				],
			},
		},

		// ============ Integration Registries ============
		{
			id: "team-departments",
			name: "Team & Departments Registry",
			description: "Team structure, departments, and code review assignments",
			category: "integration",
			type: "config",
			endpoint: RSS_API_PATHS.REGISTRY_TEAM_DEPARTMENTS,
			tags: ["team", "departments", "review", "organization", "ownership"],
			useCases: [
				"Team structure lookup",
				"Code review assignment",
				"Department discovery",
				"File ownership mapping",
				"PR reviewer suggestions",
			],
			status: "healthy",
			schema: {
				version: "1.0.0",
				properties: ["department", "members", "areas", "reviewers", "color"],
			},
		},
		{
			id: "topics",
			name: "Topics & Categories Registry",
			description:
				"GitHub topics, labels, and categorization system for issues and PRs",
			category: "integration",
			type: "config",
			endpoint: "/api/registry/topics",
			tags: ["topics", "labels", "categories", "github", "organization"],
			useCases: [
				"Topic discovery and documentation",
				"Label management",
				"Category organization",
				"Issue/PR categorization",
				"Automated labeling",
			],
			status: "healthy",
			schema: {
				version: "1.0.0",
				properties: ["topic", "category", "description", "color", "aliases"],
			},
		},
		{
			id: "api-examples",
			name: "API Examples Registry",
			description:
				"Comprehensive API usage examples with request/response samples",
			category: "integration",
			type: "schema",
			endpoint: "/api/examples",
			tags: ["examples", "api", "documentation", "requests", "responses"],
			useCases: [
				"API exploration and testing",
				"Code generation from examples",
				"Documentation generation",
				"SDK development",
				"Integration testing",
			],
			status: "healthy",
			schema: {
				version: "1.0.0",
				properties: [
					"endpoint",
					"method",
					"description",
					"request",
					"response",
					"tags",
				],
			},
		},
		{
			id: "mini-app",
			name: "Factory Wager Mini App",
			description:
				"Telegram Mini App for real-time trading alerts and arbitrage monitoring",
			category: "integration",
			type: "endpoint",
			endpoint: "/api/miniapp/info",
			tags: ["telegram", "miniapp", "alerts", "arbitrage", "real-time"],
			useCases: [
				"Real-time covert steam alerts",
				"Arbitrage opportunity notifications",
				"Sports betting market monitoring",
				"Telegram bot integration",
				"Mobile trading interface",
			],
			status: "healthy",
			schema: {
				version: "1.0.0",
				properties: [
					"status",
					"health",
					"deployment",
					"metrics",
					"config",
					"alerts",
				],
			},
		},
		{
			id: "cli-commands",
			name: "CLI Commands Registry",
			description:
				"Command-line interface tools for system management, data import, and operational control",
			category: "cli",
			type: "cli-command",
			endpoint: "/api/registry/cli-commands",
			tags: [
				"cli",
				"commands",
				"telegram",
				"mcp",
				"dashboard",
				"fetch",
				"security",
				"management",
			],
			useCases: [
				"Telegram supergroup management",
				"MCP tools execution",
				"Live trading dashboard",
				"Trade data import",
				"Security testing",
				"System service management",
				"GitHub integration",
				"Password generation",
			],
			status: "healthy",
			schema: {
				version: "11.0.0.0.0.0.0",
				properties: [
					"command",
					"version",
					"description",
					"usage",
					"options",
					"examples",
				],
			},
		},
		{
			id: "correlation-engine",
			name: "DoD Multi-Layer Correlation Engine",
			description:
				"Multi-layer correlation detection system for hidden edge discovery across sports betting markets",
			category: "research",
			type: "config",
			endpoint: "/api/registry/correlation-engine",
			tags: [
				"correlation",
				"multi-layer",
				"dod",
				"anomaly-detection",
				"propagation",
				"health-check",
			],
			useCases: [
				"Cross-sport correlation analysis",
				"Cross-event correlation detection",
				"Cross-market correlation patterns",
				"Direct latency correlation",
				"Anomaly detection and scoring",
				"Propagation path prediction",
				"Health monitoring for load balancers",
			],
			status: "healthy",
			schema: {
				version: "1.1.1.1.4.5.0",
				properties: [
					"status",
					"timestamp",
					"metrics",
					"dbLatency",
					"layerFailures",
					"activeConnections",
					"lastSuccessfulBuild",
					"failover",
				],
			},
		},
		{
			id: "workspace",
			name: "Developer Workspace Registry",
			description:
				"Developer workspace API key management system for onboarding and interviews with time-sensitive access and rate limiting",
			category: "tooling",
			type: "config",
			endpoint: "/api/workspace/keys",
			tags: [
				"workspace",
				"api-keys",
				"onboarding",
				"interview",
				"rate-limiting",
				"bun-secrets",
				"developer-tools",
			],
			useCases: [
				"New developer onboarding with temporary API access",
				"Interview candidate technical assessments",
				"Trial access for evaluation",
				"Time-sensitive API key management",
				"Rate-limited access control",
				"Secure key storage using Bun.secrets",
			],
			status: "healthy",
			schema: {
				version: "1.0.0",
				properties: [
					"id",
					"email",
					"purpose",
					"createdAt",
					"expiresAt",
					"rateLimitPerHour",
					"requestCount",
					"active",
					"metadata",
				],
			},
		},
		{
			id: "benchmarks",
			name: "Performance Benchmarks Registry",
			description:
				"Performance benchmarking system for tracking CPU profiles, heap snapshots, and regression detection across workspace operations and multi-layer graph system",
			category: "tooling",
			type: "config",
			endpoint: "/api/workspace/benchmarks",
			tags: [
				"benchmarks",
				"performance",
				"profiling",
				"cpu-profile",
				"heap-snapshot",
				"regression-detection",
				"bun-v1.51",
				"developer-tools",
			],
			useCases: [
				"Performance baseline establishment for critical paths",
				"CPU and heap profiling for optimization",
				"Regression detection in CI/CD pipelines",
				"Multi-layer graph system performance tracking",
				"Workspace operation benchmarking",
				"Comparison of benchmark runs over time",
			],
			status: "healthy",
			schema: {
				version: "1.0.0",
				properties: [
					"id",
					"name",
					"description",
					"tags",
					"createdAt",
					"systemInfo",
					"gitInfo",
					"relatedBenchmarks",
					"cpuProfile",
					"heapSnapshot",
					"analysis",
				],
			},
		},
	];

	// Get counts and metrics for each registry
	const metrics = await getRegistryMetrics(registries);

	// Update registries with metrics and health status
	for (let i = 0; i < registries.length; i++) {
		const registryId = registries[i].id;
		registries[i].itemCount = metrics[registryId]?.totalItems ?? 0;
		registries[i].lastUpdated = metrics[registryId]?.lastUpdated ?? now;
		registries[i].metrics = metrics[registryId];
		
		// Update status based on health for correlation-engine
		if (registryId === "correlation-engine" && metrics[registryId]) {
			const { errorRate, avgResponseMs } = metrics[registryId];
			const healthStatus =
				errorRate === 0 && avgResponseMs < HEALTH_THRESHOLDS.MAX_RESPONSE_MS
					? "healthy"
					: errorRate < HEALTH_THRESHOLDS.MAX_ERROR_RATE
						? "degraded"
						: "offline";
			registries[i].status = healthStatus;
		}
	}

	// Calculate category counts
	const categories = registries.reduce(
		(acc, reg) => {
			acc[reg.category] = (acc[reg.category] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>,
	);

	// Calculate type counts
	const byType = registries.reduce(
		(acc, reg) => {
			acc[reg.type] = (acc[reg.type] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>,
	);

	// Calculate status counts
	const byStatus = registries.reduce(
		(acc, reg) => {
			acc[reg.status] = (acc[reg.status] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>,
	);

	// Calculate total items across all registries
	const totalItems = registries.reduce((sum, r) => sum + (r.itemCount || 0), 0);

	return {
		registries,
		total: registries.length,
		totalItems,
		categories,
		byType,
		byStatus,
		summary: {
			healthy: byStatus.healthy || 0,
			degraded: byStatus.degraded || 0,
			offline: byStatus.offline || 0,
			lastRefresh: now,
		},
	};
}

/**
 * Get metrics for each registry
 */
async function getRegistryMetrics(
	registries: RegistryInfo[],
): Promise<Record<string, RegistryMetrics>> {
	const metrics: Record<string, RegistryMetrics> = {};
	const now = Date.now();

	// Property Registry
	try {
		const propRegistry = new PropertyRegistry();
		const props = propRegistry.query ? propRegistry.query({}) : [];
		metrics["properties"] = {
			totalItems: Array.isArray(props) ? props.length : 0,
			activeItems: Array.isArray(props) ? props.length : 0,
			lastUpdated: now,
			queryCount24h: 0,
			avgResponseMs: 5,
			errorRate: 0,
		};
		propRegistry.close();
	} catch {
		metrics["properties"] = createEmptyMetrics(now);
	}

	// Correlation Engine Registry
	try {
		// Try to get database - may not exist in all environments
		let db: Database | null = null;
		try {
			const dbPath = "./data/research.db";
			// Use Bun-native file existence check
			if (await Bun.file(dbPath).exists()) {
				db = new Database(dbPath);
			}
		} catch {
			// Database file doesn't exist or can't be opened
		}

		if (db) {
			const { DoDMultiLayerCorrelationGraph } = await import(
				"../analytics/correlation-engine"
			);
			const engine = new DoDMultiLayerCorrelationGraph(db);
			const health = engine.getHealthStatus();
			
			// Count correlations in database
			let correlationCount = 0;
			try {
				const result = db
					.prepare(
						"SELECT COUNT(*) as count FROM multi_layer_correlations",
					)
					.get() as { count: number } | undefined;
				correlationCount = result?.count || 0;
			} catch {
				// Table may not exist yet
			}

			metrics["correlation-engine"] = {
				totalItems: correlationCount,
				activeItems: correlationCount,
				lastUpdated: health.metrics.lastSuccessfulBuild || now,
				queryCount24h: 0,
				avgResponseMs: health.metrics.dbLatency,
				errorRate: health.metrics.layerFailures > 0 ? 0.1 : 0,
			};
			db.close();
		} else {
			metrics["correlation-engine"] = createEmptyMetrics(now);
		}
	} catch {
		metrics["correlation-engine"] = createEmptyMetrics(now);
	}

	// Data Source Registry
	try {
		const sourceRegistry = new DataSourceRegistry();
		metrics["data-sources"] = {
			totalItems: 5, // Default configured sources
			activeItems: 5,
			lastUpdated: now,
			queryCount24h: 0,
			avgResponseMs: 3,
			errorRate: 0,
		};
		sourceRegistry.close();
	} catch {
		metrics["data-sources"] = createEmptyMetrics(now);
	}

	// Sharp Books Registry
	try {
		const books = Object.keys(SHARP_BOOKS);
		metrics["sharp-books"] = {
			totalItems: books.length,
			activeItems: books.filter((id) => SHARP_BOOKS[id].status === "connected")
				.length,
			lastUpdated: now,
			queryCount24h: 0,
			avgResponseMs: 1,
			errorRate: 0,
		};
	} catch {
		metrics["sharp-books"] = createEmptyMetrics(now);
	}

	// Error Registry
	try {
		const errorCodes = Object.keys(ERROR_REGISTRY);
		const categories = new Set(
			Object.values(ERROR_REGISTRY).map((e) => e.category),
		);
		metrics["errors"] = {
			totalItems: errorCodes.length,
			activeItems: errorCodes.length,
			lastUpdated: now,
			queryCount24h: 0,
			avgResponseMs: 1,
			errorRate: 0,
		};
	} catch {
		metrics["errors"] = createEmptyMetrics(now);
	}

	// MCP Tools Registry
	try {
		const mcpTools = getMCPToolsRegistry();
		metrics["mcp-tools"] = {
			totalItems: mcpTools.tools.length,
			activeItems: mcpTools.tools.length,
			lastUpdated: now,
			queryCount24h: 0,
			avgResponseMs: 10,
			errorRate: 0,
		};
	} catch {
		metrics["mcp-tools"] = createEmptyMetrics(now);
	}

	// Workspace Registry
	try {
		const { DevWorkspaceManager } = await import("../workspace/devworkspace");
		const workspaceManager = new DevWorkspaceManager();
		const workspaceKeys = await workspaceManager.listKeys();
		const now = Date.now();
		const activeKeys = workspaceKeys.filter((k) => k.active && now < k.expiresAt);
		metrics["workspace"] = {
			totalItems: workspaceKeys.length,
			activeItems: activeKeys.length,
			lastUpdated: now,
			queryCount24h: workspaceKeys.reduce((sum, k) => sum + (k.requestCount || 0), 0),
			avgResponseMs: 5,
			errorRate: 0,
		};
	} catch {
		metrics["workspace"] = createEmptyMetrics(now);
	}

	// Benchmarks Registry
	try {
		const benchmarksDir = RSS_BENCHMARK_PATHS.BENCHMARKS_METADATA_DIR;
		let benchmarkCount = 0;
		// Use Bun.Glob for directory scanning (Bun-native API)
		// Wrap in try-catch since scanSync will fail if directory doesn't exist
		try {
			const glob = new Bun.Glob("*.json");
			const files = Array.from(glob.scanSync({ cwd: benchmarksDir, onlyFiles: true }));
			// Count JSON metadata files (exclude schema.json and template.json)
			benchmarkCount = files.filter(
				(f) => !f.includes("schema.json") && !f.includes("template.json"),
			).length;
		} catch {
			// Directory doesn't exist or can't be scanned - benchmarkCount remains 0
		}
		metrics["benchmarks"] = {
			totalItems: benchmarkCount,
			activeItems: benchmarkCount,
			lastUpdated: now,
			queryCount24h: 0,
			avgResponseMs: 2,
			errorRate: 0,
		};
	} catch {
		metrics["benchmarks"] = createEmptyMetrics(now);
	}

	// Set defaults for other registries
	const defaultRegistries = [
		"bookmaker-profiles",
		"security-threats",
		"css-bundler",
		"bun-apis",
		"url-anomaly-patterns",
		"tension-patterns",
		"team-departments",
		"topics",
		"api-examples",
		"mini-app",
		"cli-commands",
		"correlation-engine",
	];

	for (const id of defaultRegistries) {
		if (!metrics[id]) {
			metrics[id] = {
				totalItems:
					id === "api-examples"
						? 50
						: id === "bun-apis"
							? 100
							: id === "topics"
								? 25
								: id === "team-departments"
									? 8
									: id === "mini-app"
										? 4
										: id === "cli-commands"
											? 8
											: 0, // mini-app: 4 endpoints, cli-commands: 8 commands
				activeItems: id === "mini-app" ? 4 : id === "cli-commands" ? 8 : 0,
				lastUpdated: now,
				queryCount24h: 0,
				avgResponseMs: id === "mini-app" ? 50 : 5, // Mini-app calls may be slower
				errorRate: 0,
			};
		}
	}

	return metrics;
}

/**
 * Create empty metrics object
 */
function createEmptyMetrics(timestamp: number): RegistryMetrics {
	return {
		totalItems: 0,
		activeItems: 0,
		lastUpdated: timestamp,
		queryCount24h: 0,
		avgResponseMs: 0,
		errorRate: 0,
	};
}

/**
 * Get MCP tools registry
 */
export function getMCPToolsRegistry(): {
	tools: Array<{
		name: string;
		description: string;
		category: string;
		tags: string[];
		inputSchema?: Record<string, unknown>;
	}>;
	categories: Record<string, number>;
	totalTools: number;
} {
	const db = new Database("./data/research.db", { create: true });

	const bunTools = createBunToolingTools();
	const shellTools = createBunShellTools();
	const docsTools = createDocsIntegrationTools();
	const securityTools = createSecurityDashboardTools();
	const researchTools = createResearchTools(db);
	const anomalyTools = createAnomalyResearchTools(db);

	const allTools = [
		...bunTools.map((t) => ({ ...t, category: "bun-tooling" })),
		...shellTools.map((t) => ({ ...t, category: "bun-shell" })),
		...docsTools.map((t) => ({ ...t, category: "docs-integration" })),
		...securityTools.map((t) => ({ ...t, category: "security" })),
		...researchTools.map((t) => ({ ...t, category: "research" })),
		...anomalyTools.map((t) => ({ ...t, category: "anomaly-research" })),
	];

	const categories = allTools.reduce(
		(acc, tool) => {
			acc[tool.category] = (acc[tool.category] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>,
	);

	db.close();

	return {
		tools: allTools.map((t) => ({
			name: t.name,
			description: t.description,
			category: t.category,
			tags: extractTags(t.description, t.name),
			inputSchema: t.inputSchema,
		})),
		categories,
		totalTools: allTools.length,
	};
}

/**
 * Get error registry with categorized codes
 */
export function getErrorRegistry(): {
	errors: ErrorDefinition[];
	byCategory: Record<ErrorCategory, ErrorDefinition[]>;
	byStatus: Record<number, ErrorDefinition[]>;
	total: number;
	categories: ErrorCategory[];
} {
	const errors = Object.values(ERROR_REGISTRY);

	const byCategory = errors.reduce(
		(acc, err) => {
			if (!acc[err.category]) {
				acc[err.category] = [];
			}
			acc[err.category].push(err);
			return acc;
		},
		{} as Record<ErrorCategory, ErrorDefinition[]>,
	);

	const byStatus = errors.reduce(
		(acc, err) => {
			if (!acc[err.status]) {
				acc[err.status] = [];
			}
			acc[err.status].push(err);
			return acc;
		},
		{} as Record<number, ErrorDefinition[]>,
	);

	return {
		errors,
		byCategory,
		byStatus,
		total: errors.length,
		categories: Object.keys(byCategory) as ErrorCategory[],
	};
}

/**
 * Extract tags from tool description and name
 */
function extractTags(description: string, name: string): string[] {
	const tags: string[] = [];
	const lowerDesc = description.toLowerCase();
	const lowerName = name.toLowerCase();

	if (lowerDesc.includes("security") || lowerName.includes("security"))
		tags.push("security");
	if (lowerDesc.includes("research") || lowerName.includes("research"))
		tags.push("research");
	if (lowerDesc.includes("pattern") || lowerName.includes("pattern"))
		tags.push("patterns");
	if (lowerDesc.includes("anomaly") || lowerName.includes("anomaly"))
		tags.push("anomalies");
	if (lowerDesc.includes("url") || lowerName.includes("url")) tags.push("url");
	if (lowerDesc.includes("forensic") || lowerName.includes("forensic"))
		tags.push("forensic");
	if (lowerDesc.includes("bookmaker") || lowerName.includes("bookmaker"))
		tags.push("bookmakers");
	if (lowerDesc.includes("steam") || lowerName.includes("steam"))
		tags.push("steam");
	if (lowerDesc.includes("bun") || lowerName.includes("bun")) tags.push("bun");
	if (lowerDesc.includes("docs") || lowerName.includes("docs"))
		tags.push("documentation");
	if (lowerDesc.includes("tool") || lowerName.includes("tool"))
		tags.push("tools");

	return [...new Set(tags)];
}

/**
 * Get bookmaker profiles registry
 */
export async function getBookmakerProfilesRegistry(): Promise<{
	profiles: Array<{
		bookmaker: string;
		endpoints: number;
		tags: string[];
		lastProfiled?: number;
	}>;
	total: number;
}> {
	try {
		const db = new Database("./data/security.db", { create: true });

		const profiles = db
			.query(`
			SELECT 
				bookmaker,
				COUNT(DISTINCT endpoint) as endpoint_count,
				last_profiled
			FROM bookmaker_profiles
			GROUP BY bookmaker
		`)
			.all() as Array<{
			bookmaker: string;
			endpoint_count: number;
			last_profiled?: number;
		}>;

		db.close();

		return {
			profiles: profiles.map((p) => ({
				bookmaker: p.bookmaker,
				endpoints: p.endpoint_count,
				tags: ["bookmaker", "profile", "endpoint"],
				lastProfiled: p.last_profiled,
			})),
			total: profiles.length,
		};
	} catch {
		return { profiles: [], total: 0 };
	}
}

/**
 * Get URL anomaly patterns registry with enhanced metrics
 */
export async function getURLAnomalyPatternsRegistry(
	sport: string = "NBA",
	hours: number = 24,
): Promise<{
	registry: string;
	timestamp: string;
	query: {
		sport: string;
		hours: number;
		timeRange: {
			start: string;
			end: string;
		};
	};
	patterns: Array<{
		patternId: string;
		pattern_name: string;
		anomaly_type: string;
		affected_bookmakers: string[];
		url_signature: string;
		confidence_level: number;
		market_impact: {
			avg_line_delta: number;
			frequency_per_hour: number;
			false_steam_probability: number;
		};
		tags: string[];
	}>;
	metrics: {
		total: number;
		by_bookmaker: Record<string, number>;
		by_anomaly_type: Record<string, number>;
		market_impact_summary: {
			avg_line_delta: number;
			total_frequency_per_hour: number;
			avg_false_steam_probability: number;
		};
		confidence_summary: {
			avg_confidence: number;
			high_confidence_count: number; // >= CONFIDENCE_THRESHOLDS.HIGH (0.7)
			medium_confidence_count: number; // CONFIDENCE_THRESHOLDS.MEDIUM_MIN (0.4) - CONFIDENCE_THRESHOLDS.MEDIUM_MAX (0.7)
			low_confidence_count: number; // < CONFIDENCE_THRESHOLDS.MEDIUM_MIN (0.4)
		};
	};
	database_stats: {
		total_anomalies: number;
		total_movements: number;
		anomaly_rate: number; // anomalies / movements
	};
	diagnostics: {
		database_accessible: boolean;
		tables_exist: {
			url_anomaly_audit: boolean;
			line_movement_audit_v2: boolean;
		};
		anomalies_by_sport?: Record<string, number>;
		anomalies_by_bookmaker?: Record<string, number>;
		anomalies_all_time?: number;
		movements_all_time?: number;
		recent_security_threats?: number;
		error?: string;
	};
}> {
	try {
		const db = new Database("./data/research.db", { create: true });
		const engine = new UrlAnomalyPatternEngine(db);

		const cutoffTime = Math.floor(Date.now() / MS_PER_SECOND) - hours * SECONDS_PER_HOUR;

		const patterns = await engine.discoverAnomalyPatterns(sport, hours);

		// Calculate summary metrics
		const byBookmaker: Record<string, number> = {};
		const byAnomalyType: Record<string, number> = {};
		let totalLineDelta = 0;
		let totalFrequencyPerHour = 0;
		let totalFalseSteamProb = 0;
		const confidenceLevels: number[] = [];

		for (const pattern of patterns) {
			// Count by bookmaker
			for (const bookmaker of pattern.affected_bookmakers) {
				byBookmaker[bookmaker] = (byBookmaker[bookmaker] || 0) + 1;
			}

			// Count by anomaly type
			byAnomalyType[pattern.anomaly_type] =
				(byAnomalyType[pattern.anomaly_type] || 0) + 1;

			// Accumulate market impact metrics
			totalLineDelta += pattern.market_impact.avg_line_delta;
			totalFrequencyPerHour += pattern.market_impact.frequency_per_hour;
			totalFalseSteamProb += pattern.market_impact.false_steam_probability;

			// Collect confidence levels
			confidenceLevels.push(pattern.confidence_level);
		}

		// Calculate database statistics with enhanced diagnostics
		let totalAnomalies = 0;
		let totalMovements = 0;
		let diagnosticInfo: {
			database_accessible: boolean;
			tables_exist: {
				url_anomaly_audit: boolean;
				line_movement_audit_v2: boolean;
			};
			anomalies_by_sport?: Record<string, number>;
			anomalies_by_bookmaker?: Record<string, number>;
			anomalies_all_time?: number;
			movements_all_time?: number;
			recent_security_threats?: number;
			error?: string;
		} = {
			database_accessible: true,
			tables_exist: {
				url_anomaly_audit: false,
				line_movement_audit_v2: false,
			},
		};

		try {
			// Check if tables exist
			const tables = db
				.query<{ name: string }, []>(
					`SELECT name FROM sqlite_master WHERE type='table' AND name IN ('url_anomaly_audit', 'line_movement_audit_v2')`,
				)
				.all();

			const tableNames = new Set(tables.map((t) => t.name));
			diagnosticInfo.tables_exist.url_anomaly_audit =
				tableNames.has("url_anomaly_audit");
			diagnosticInfo.tables_exist.line_movement_audit_v2 = tableNames.has(
				"line_movement_audit_v2",
			);

			if (diagnosticInfo.tables_exist.url_anomaly_audit) {
				// Get anomalies for the time window
				const anomalyCount = db
					.query<{ count: number }, [number]>(
						`SELECT COUNT(*) as count FROM url_anomaly_audit WHERE detected_at > ?`,
					)
					.get(cutoffTime);
				totalAnomalies = anomalyCount?.count || 0;

				// Get anomalies by sport (if eventId contains sport info)
				try {
					const anomaliesBySport = db
						.query<{ sport: string; count: number }, [number]>(
							`SELECT 
							CASE 
								WHEN eventId LIKE '%NBA%' THEN 'NBA'
								WHEN eventId LIKE '%NFL%' THEN 'NFL'
								WHEN eventId LIKE '%NHL%' THEN 'NHL'
								WHEN eventId LIKE '%MLB%' THEN 'MLB'
								ELSE 'OTHER'
							END as sport,
							COUNT(*) as count
							FROM url_anomaly_audit
							WHERE detected_at > ?
							GROUP BY sport`,
						)
						.all(cutoffTime) as Array<{ sport: string; count: number }>;

					diagnosticInfo.anomalies_by_sport = {};
					for (const row of anomaliesBySport) {
						diagnosticInfo.anomalies_by_sport[row.sport] = row.count;
					}
				} catch {
					// EventId might not contain sport info
				}

				// Get anomalies by bookmaker
				try {
					const anomaliesByBookmaker = db
						.query<{ bookmaker: string; count: number }, [number]>(
							`SELECT bookmaker, COUNT(*) as count 
						 FROM url_anomaly_audit 
						 WHERE detected_at > ?
						 GROUP BY bookmaker`,
						)
						.all(cutoffTime) as Array<{ bookmaker: string; count: number }>;

					diagnosticInfo.anomalies_by_bookmaker = {};
					for (const row of anomaliesByBookmaker) {
						diagnosticInfo.anomalies_by_bookmaker[row.bookmaker] = row.count;
					}
				} catch {
					// Ignore errors
				}

				// Get all-time anomaly count
				try {
					const allTimeAnomalies = db
						.query<{ count: number }, []>(
							`SELECT COUNT(*) as count FROM url_anomaly_audit`,
						)
						.get();
					diagnosticInfo.anomalies_all_time = allTimeAnomalies?.count || 0;
				} catch {
					// Ignore errors
				}
			}

			if (diagnosticInfo.tables_exist.line_movement_audit_v2) {
				const movementCount = db
					.query<{ count: number }, [number]>(
						`SELECT COUNT(*) as count FROM line_movement_audit_v2 WHERE timestamp > ?`,
					)
					.get(cutoffTime);
				totalMovements = movementCount?.count || 0;

				// Get all-time movement count
				try {
					const allTimeMovements = db
						.query<{ count: number }, []>(
							`SELECT COUNT(*) as count FROM line_movement_audit_v2`,
						)
						.get();
					diagnosticInfo.movements_all_time = allTimeMovements?.count || 0;
				} catch {
					// Ignore errors
				}
			}

			// Check security_audit_log for related threats (if table exists)
			try {
				const securityThreats = db
					.query<{ count: number }, [number]>(
						`SELECT COUNT(*) as count FROM security_audit_log 
					 WHERE threat_level IN ('suspicious', 'malicious') 
					 AND detected_at > ?`,
					)
					.get(cutoffTime);
				diagnosticInfo.recent_security_threats = securityThreats?.count || 0;
			} catch {
				// security_audit_log table might not exist
			}
		} catch (error: unknown) {
			diagnosticInfo.database_accessible = false;
			diagnosticInfo.error =
				error instanceof Error ? error.message : String(error);
			// Note: Using console.warn here as this is a diagnostic function
			// and structured logging may not be initialized in all contexts
			if (process.env.NODE_ENV !== "production") {
				console.warn(`Failed to get database stats: ${diagnosticInfo.error}`);
			}
		}

		const avgLineDelta =
			patterns.length > 0 ? totalLineDelta / patterns.length : 0;
		const avgFalseSteamProb =
			patterns.length > 0 ? totalFalseSteamProb / patterns.length : 0;
		const avgConfidence =
			confidenceLevels.length > 0
				? confidenceLevels.reduce((a, b) => a + b, 0) / confidenceLevels.length
				: 0;

		const highConfidence = confidenceLevels.filter((c) => c >= 0.7).length;
		const mediumConfidence = confidenceLevels.filter(
			(c) => c >= 0.4 && c < 0.7,
		).length;
		const lowConfidence = confidenceLevels.filter((c) => c < 0.4).length;

		const anomalyRate =
			totalMovements > 0 ? totalAnomalies / totalMovements : 0;

		const now = Date.now();
		const startTime = new Date(cutoffTime * MS_PER_SECOND).toISOString();
		const endTime = new Date(now).toISOString();

		db.close();

		return {
			registry: "url-anomaly-patterns",
			timestamp: new Date().toISOString(),
			query: {
				sport,
				hours,
				timeRange: {
					start: startTime,
					end: endTime,
				},
			},
			patterns: patterns.map((p) => ({
				patternId: p.patternId,
				pattern_name: p.pattern_name,
				anomaly_type: p.anomaly_type,
				affected_bookmakers: p.affected_bookmakers,
				url_signature: p.url_signature,
				confidence_level: p.confidence_level,
				market_impact: p.market_impact,
				tags: ["url", "anomaly", p.anomaly_type, "pattern"],
			})),
			metrics: {
				total: patterns.length,
				by_bookmaker: byBookmaker,
				by_anomaly_type: byAnomalyType,
				market_impact_summary: {
				avg_line_delta:
					Math.round(avgLineDelta * DECIMAL_PRECISION.CONFIDENCE) /
					DECIMAL_PRECISION.CONFIDENCE,
				total_frequency_per_hour:
					Math.round(totalFrequencyPerHour * DECIMAL_PRECISION.CONFIDENCE) /
					DECIMAL_PRECISION.CONFIDENCE,
				avg_false_steam_probability:
					Math.round(avgFalseSteamProb * DECIMAL_PRECISION.CONFIDENCE) /
					DECIMAL_PRECISION.CONFIDENCE,
				},
				confidence_summary: {
					avg_confidence:
					Math.round(avgConfidence * DECIMAL_PRECISION.CONFIDENCE) /
					DECIMAL_PRECISION.CONFIDENCE,
					high_confidence_count: highConfidence,
					medium_confidence_count: mediumConfidence,
					low_confidence_count: lowConfidence,
				},
			},
			database_stats: {
				total_anomalies: totalAnomalies,
				total_movements: totalMovements,
				anomaly_rate:
					Math.round(anomalyRate * DECIMAL_PRECISION.ANOMALY_RATE) /
					DECIMAL_PRECISION.ANOMALY_RATE,
			},
			diagnostics: diagnosticInfo,
		};
	} catch (error: unknown) {
		// Return empty structure with error info
		const errorMessage = error instanceof Error ? error.message : String(error);
		return {
			registry: "url-anomaly-patterns",
			timestamp: new Date().toISOString(),
			query: {
				sport,
				hours,
				timeRange: {
					start: new Date(
						Date.now() - hours * SECONDS_PER_HOUR * MS_PER_SECOND,
					).toISOString(),
					end: new Date().toISOString(),
				},
			},
			patterns: [],
			metrics: {
				total: 0,
				by_bookmaker: {},
				by_anomaly_type: {},
				market_impact_summary: {
					avg_line_delta: 0,
					total_frequency_per_hour: 0,
					avg_false_steam_probability: 0,
				},
				confidence_summary: {
					avg_confidence: 0,
					high_confidence_count: 0,
					medium_confidence_count: 0,
					low_confidence_count: 0,
				},
			},
			database_stats: {
				total_anomalies: 0,
				total_movements: 0,
				anomaly_rate: 0,
			},
			diagnostics: {
				database_accessible: false,
				tables_exist: {
					url_anomaly_audit: false,
					line_movement_audit_v2: false,
				},
				error: errorMessage,
			},
		};
	}
}

/**
 * Get sharp books registry with detailed info
 */
/**
 * Get unified bookmaker registry
 * Combines sharp book data, geographic information, and profile data
 */
export function getUnifiedBookmakerRegistry(): {
	bookmakers: UnifiedBookmaker[];
	total: number;
	statistics: {
		total: number;
		byTier: Record<string, number>;
		byRegion: Record<string, number>;
		connected: number;
		withGeographic: number;
	};
} {
	const registry = getBookmakerRegistry();
	const bookmakers = registry.getAll();
	const statistics = registry.getStatistics();

	return {
		bookmakers,
		total: bookmakers.length,
		statistics,
	};
}

export function getSharpBooksRegistry(): {
	books: Array<{
		id: string;
		name: string;
		sharpTier: string;
		weight: number;
		status: string;
		latencyBenchmark: number;
		tags: string[];
		cryptoAccepted: boolean;
		limitsWinners: boolean;
	}>;
	byTier: Record<string, number>;
	total: number;
	connected: number;
} {
	const books = Object.values(SHARP_BOOKS).map((book) => ({
		id: book.id,
		name: book.name,
		sharpTier: book.sharpTier,
		weight: book.weight,
		status: book.status,
		latencyBenchmark: book.latencyBenchmark,
		tags: book.tags as string[],
		cryptoAccepted: book.cryptoAccepted,
		limitsWinners: book.limitsWinners,
	}));

	const byTier = books.reduce(
		(acc, book) => {
			acc[book.sharpTier] = (acc[book.sharpTier] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>,
	);

	return {
		books,
		byTier,
		total: books.length,
		connected: books.filter((b) => b.status === "connected").length,
	};
}

/**
 * Get workspace registry
 * Developer workspace API key management registry
 */
export async function getWorkspaceRegistry(): Promise<{
	items: RegistryItem[];
	total: number;
	active: number;
	expired: number;
	byPurpose: Record<string, number>;
	metadata: {
		secretService: string;
		storageBackend: string;
		indexKey: string;
		keyFormat: string;
		metaFormat: string;
		usageFormat: string;
		lookupFormat: string;
	};
}> {
	try {
		const { DevWorkspaceManager } = await import("../workspace/devworkspace");
		const manager = new DevWorkspaceManager();
		const keys = await manager.listKeys();

		const now = Date.now();
		const active = keys.filter((k) => k.active && now < k.expiresAt).length;
		const expired = keys.filter((k) => !k.active || now >= k.expiresAt).length;

		const byPurpose = keys.reduce(
			(acc, k) => {
				acc[k.purpose] = (acc[k.purpose] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>
		);

		return {
			items: keys.map((key) => ({
				id: key.keyId,
				name: `${key.email} (${key.purpose})`,
				type: "workspace-key",
				description: `API key for ${key.email} - ${key.purpose}`,
				metadata: {
					email: key.email,
					purpose: key.purpose,
					createdAt: key.createdAt,
					expiresAt: key.expiresAt,
					active: key.active,
					rateLimitPerHour: key.rateLimitPerHour,
					requestCount: key.requestCount,
				},
				createdAt: key.createdAt,
				updatedAt: key.lastRequestAt || key.createdAt,
			})),
			total: keys.length,
			active,
			expired,
			byPurpose,
			metadata: {
				secretService: "com.nexus.trader-analyzer.devworkspace",
				storageBackend: "Bun.secrets",
				indexKey: "key-index:all-keys", // New format (legacy: "index:all-keys")
				keyFormat: "api-key:{scope}:{keyId}", // New format (legacy: "key:{keyId}")
				metaFormat: "metadata:{scope}:{keyId}", // New format (legacy: "meta:{keyId}")
				usageFormat: "usage-stats:{scope}:{keyId}", // New format (legacy: "usage:{keyId}")
				lookupFormat: "lookup-index:hash:{apiKeyHash}", // New format (legacy: "lookup:{apiKeyHash}")
			},
		};
	} catch (error: unknown) {
		// Return empty structure on error (workspace may not be initialized)
		return {
			items: [],
			total: 0,
			active: 0,
			expired: 0,
			byPurpose: {},
			metadata: {
				secretService: "com.nexus.trader-analyzer.devworkspace",
				storageBackend: "Bun.secrets",
				indexKey: "key-index:all-keys", // New format (legacy: "index:all-keys")
				keyFormat: "api-key:{scope}:{keyId}", // New format (legacy: "key:{keyId}")
				metaFormat: "metadata:{scope}:{keyId}", // New format (legacy: "meta:{keyId}")
				usageFormat: "usage-stats:{scope}:{keyId}", // New format (legacy: "usage:{keyId}")
				lookupFormat: "lookup-index:hash:{apiKeyHash}", // New format (legacy: "lookup:{apiKeyHash}")
			},
		};
	}
}

/**
 * Get CLI commands registry
 * 11.0.0.0.0.0.0: CLI Commands Registry
 */
export function getCLICommandsRegistry(): {
	commands: Array<{
		id: string;
		name: string;
		version: string;
		description: string;
		usage: string;
		category: string;
		file: string;
		documentation: string;
		tags: string[];
		examples: string[];
		crossReferences: string[];
	}>;
	total: number;
	byCategory: Record<string, number>;
	byVersion: Record<string, number>;
} {
	const commands = [
		{
			id: "telegram",
			name: "Telegram CLI",
			version: "11.1.0.0.0.0.0",
			description: "Telegram supergroup management and alert system CLI",
			usage: "bun run telegram <command> [options]",
			category: "telegram",
			file: "src/cli/telegram.ts",
			documentation: RSS_COMMANDS_PATHS.TELEGRAM,
			tags: ["telegram", "supergroup", "topics", "alerts", "covert-steam"],
			examples: [
				'bun run telegram send "Hello!" --topic 2 --pin',
				"bun run telegram list-topics",
				"bun run telegram history --topic=2 --limit=10",
			],
			crossReferences: ["9.1.1.x.x.x.x", "7.5.2.0.0.0.0", "7.5.4.0.0.0.0"],
		},
		{
			id: "mcp",
			name: "MCP CLI",
			version: "11.2.0.0.0.0.0",
			description: "MCP (Model Context Protocol) tools execution",
			usage: "bun run mcp <command> [options]",
			category: "mcp",
			file: "src/cli/mcp.ts",
			documentation: RSS_COMMANDS_PATHS.MCP,
			tags: ["mcp", "tools", "shell", "documentation", "research"],
			examples: [
				"bun run mcp list",
				"bun run mcp exec tooling-diagnostics",
				'bun run mcp exec shell-execute --command="echo hello"',
			],
			crossReferences: ["7.0.0.0.0.0.0", "7.4.3.x.x.x.x", "7.5.x.x.x.x.x"],
		},
		{
			id: "dashboard",
			name: "Dashboard CLI",
			version: "11.3.0.0.0.0.0",
			description:
				"Live trading dashboard with real-time monitoring and controls",
			usage: "bun run dashboard [options]",
			category: "dashboard",
			file: "src/cli/dashboard.ts",
			documentation: RSS_COMMANDS_PATHS.DASHBOARD,
			tags: ["dashboard", "trading", "monitoring", "real-time", "arbitrage"],
			examples: [
				"bun run dashboard",
				"bun run dashboard --once",
				"bun run dashboard --interval=10000",
			],
			crossReferences: ["6.0.0.0.0.0.0", "7.18.x.x.x.x.x", "11.2.0.0.0.0.0"],
		},
		{
			id: "fetch",
			name: "Fetch CLI",
			version: "11.4.0.0.0.0.0",
			description: "Trade data import and exchange integration CLI",
			usage: "bun run fetch <command> [options]",
			category: "data-import",
			file: "src/cli/fetch.ts",
			documentation: RSS_COMMANDS_PATHS.FETCH,
			tags: ["fetch", "import", "exchange", "trades", "csv", "json"],
			examples: [
				"bun run fetch import bitmex_executions.csv",
				"bun run fetch api binance KEY SECRET BTC/USD",
				"bun run fetch stats --from=2025-01-01",
			],
			crossReferences: ["7.5.2.0.0.0.0", "7.5.4.0.0.0.0", "7.5.5.0.0.0.0"],
		},
		{
			id: "security",
			name: "Security CLI",
			version: "11.5.0.0.0.0.0",
			description: "Security testing, header analysis, and SRI generation",
			usage: "bun security <command> [subcommand] [options]",
			category: "security",
			file: "src/cli/security.ts",
			documentation: RSS_COMMANDS_PATHS.SECURITY,
			tags: ["security", "pentest", "sri", "headers", "testing"],
			examples: [
				"bun security pentest web --target=https://example.com",
				'bun security sri generate --files="dist/*.js"',
				"bun security headers analyze --url=https://example.com",
			],
			crossReferences: ["7.2.x.x.x.x.x", "7.5.2.0.0.0.0", "7.5.4.0.0.0.0"],
		},
		{
			id: "management",
			name: "Management CLI",
			version: "11.6.0.0.0.0.0",
			description: "System service management and monitoring utilities",
			usage: "bun run management <command> [options]",
			category: "system",
			file: "src/cli/management.ts",
			documentation: RSS_COMMANDS_PATHS.MANAGEMENT,
			tags: ["management", "services", "monitoring", "process"],
			examples: [
				"bun run management status api",
				"bun run management start dashboard",
				"bun run management restart api",
			],
			crossReferences: ["7.4.3.x.x.x.x", "7.4.3.4.0.0.0", "11.0.3.0.0.0.0"],
		},
		{
			id: "github",
			name: "GitHub CLI",
			version: "11.7.0.0.0.0.0",
			description: "GitHub integration utilities and automation",
			usage: "bun run github <command> [options]",
			category: "integration",
			file: "src/cli/github.ts",
			documentation: RSS_COMMANDS_PATHS.GITHUB,
			tags: ["github", "integration", "repository", "issues"],
			examples: ["bun run github repo list", "bun run github issue create"],
			crossReferences: ["7.11.x.x.x.x.x", "7.5.x.x.x.x.x"],
		},
		{
			id: "password",
			name: "Password CLI",
			version: "11.8.0.0.0.0.0",
			description: "Password generation and management utilities",
			usage: "bun run password <command> [options]",
			category: "security",
			file: "src/cli/password.ts",
			documentation: RSS_COMMANDS_PATHS.PASSWORD,
			tags: ["password", "security", "generation", "crypto"],
			examples: [
				"bun run password generate",
				"bun run password generate --length=32",
				"bun run password generate --no-symbols",
			],
			crossReferences: ["7.2.x.x.x.x.x", "7.2.1.0.0.0.0"],
		},
		{
			id: "audit",
			name: "Audit CLI",
			version: "11.9.0.0.0.0.0",
			description:
				"Documentation audit, orphan detection, and cross-reference validation",
			usage: "bun run audit <command> [options]",
			category: "development",
			file: "src/cli/audit.ts",
			documentation: RSS_COMMANDS_PATHS.AUDIT,
			tags: [
				"audit",
				"documentation",
				"orphans",
				"validation",
				"workers",
				"spawn",
			],
			examples: [
				"bun run audit orphans",
				"bun run audit undocumented",
				"bun run audit validate",
				"bun run audit report",
				"bun run audit parallel --workers",
				"bun run audit real-time --path=src/",
				"bun run audit watch",
				"bun run audit bun-utilities",
			],
			crossReferences: [
				"9.1.5.7.0.0.0",
				"9.1.5.11.0.0.0",
				"9.1.5.14.0.0.0",
				"9.1.5.1.0.0",
				"7.4.3.0.0.0.0",
			],
		},
	];

	const byCategory = commands.reduce(
		(acc, cmd) => {
			acc[cmd.category] = (acc[cmd.category] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>,
	);

	const byVersion = commands.reduce(
		(acc, cmd) => {
			const majorVersion =
				cmd.version.split(".")[0] + "." + cmd.version.split(".")[1];
			acc[majorVersion] = (acc[majorVersion] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>,
	);

	return {
		commands,
		total: commands.length,
		byCategory,
		byVersion,
	};
}

/**
 * Get team departments registry with members, leads, and API credentials
 * Integrates TEAM.md data with workspace API keys
 * 
 * @see {@link RSS_TEAM_PATHS} Team file paths constants
 * @see {@link RSS_API_PATHS.REGISTRY_TEAM_DEPARTMENTS} Endpoint path constant
 * @see {@link ../workspace/devworkspace.ts DevWorkspaceManager} API key management
 * 
 * @returns Team departments with integrated API credential information
 */
export async function getTeamDepartmentsRegistry(): Promise<{
	departments: Array<{
		id: string;
		name: string;
		lead: string;
		color: string;
		description: string;
		responsibilities: string[];
		keyAreas: string[];
		reviewFocus: string[];
		members: Array<{
			email: string;
			role: "lead" | "member" | "maintainer";
			hasApiKey: boolean;
			apiKeyInfo?: {
				keyId: string;
				purpose: string;
				active: boolean;
				expiresAt: number;
				requestCount: number;
			};
		}>;
	}>;
	total: number;
	byDepartment: Record<string, number>;
	withApiKeys: number;
	withoutApiKeys: number;
}> {
	try {
		const teamFile = Bun.file(RSS_TEAM_PATHS.TEAM_MD);
		if (!(await teamFile.exists())) {
			return {
				departments: [],
				total: 0,
				byDepartment: {},
				withApiKeys: 0,
				withoutApiKeys: 0,
			};
		}

		const content = await teamFile.text();
		
		// Parse TEAM.md structure
		const departments: Array<{
			id: string;
			name: string;
			lead: string;
			color: string;
			description: string;
			responsibilities: string[];
			keyAreas: string[];
			reviewFocus: string[];
		}> = [];

		// Extract department sections
		const departmentSections = content.matchAll(/### (.+?)\n\*\*Lead\*\*: (.+?)\n\*\*Color\*\*: `(.+?)`/g);
		
		for (const match of departmentSections) {
			const name = match[1]?.trim() || "";
			const lead = match[2]?.trim() || "";
			const color = match[3]?.trim() || "";
			
			// Extract section content
			const sectionStart = match.index || 0;
			const nextSectionMatch = content.indexOf("### ", sectionStart + 1);
			const sectionEnd = nextSectionMatch > 0 ? nextSectionMatch : content.length;
			const sectionContent = content.substring(sectionStart, sectionEnd);
			
			// Extract responsibilities
			const responsibilitiesMatch = sectionContent.match(/\*\*Responsibilities\*\*:\n((?:- .+\n?)+)/);
			const responsibilities = responsibilitiesMatch
				? responsibilitiesMatch[1]
						.split("\n")
						.filter((line) => line.trim().startsWith("-"))
						.map((line) => line.replace(/^-\s*/, "").trim())
				: [];
			
			// Extract key areas
			const keyAreasMatch = sectionContent.match(/\*\*Key Areas\*\*:\n((?:- .+\n?)+)/);
			const keyAreas = keyAreasMatch
				? keyAreasMatch[1]
						.split("\n")
						.filter((line) => line.trim().startsWith("-"))
						.map((line) => line.replace(/^-\s*/, "").trim())
				: [];
			
			// Extract review focus
			const reviewFocusMatch = sectionContent.match(/\*\*Review Focus\*\*: (.+)/);
			const reviewFocus = reviewFocusMatch
				? reviewFocusMatch[1]
						.split(",")
						.map((item) => item.trim())
				: [];
			
			// Generate department ID from name
			const id = name
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/^-|-$/g, "");
			
			departments.push({
				id,
				name,
				lead,
				color,
				description: `${name} department responsible for ${responsibilities[0] || "platform functionality"}`,
				responsibilities,
				keyAreas,
				reviewFocus,
			});
		}

		// Get workspace API keys to match with team members
		let workspaceKeys: Array<{
			email: string;
			keyId: string;
			purpose: string;
			active: boolean;
			expiresAt: number;
			requestCount: number;
		}> = [];
		
		try {
			const { DevWorkspaceManager } = await import("../workspace/devworkspace");
			const workspaceManager = new DevWorkspaceManager();
			const keys = await workspaceManager.listKeys();
			workspaceKeys = keys.map((key) => ({
				email: key.email,
				keyId: key.keyId,
				purpose: key.purpose,
				active: key.active,
				expiresAt: key.expiresAt,
				requestCount: key.requestCount || 0,
			}));
		} catch {
			// Workspace manager not available
		}

		// Create email to API key mapping
		const emailToApiKey = new Map(
			workspaceKeys.map((key) => [key.email.toLowerCase(), key]),
		);

		// Enhance departments with member information
		const enhancedDepartments = departments.map((dept) => {
			// Extract members from lead email (if available) or create from lead name
			const members: Array<{
				email: string;
				role: "lead" | "member" | "maintainer";
				hasApiKey: boolean;
				apiKeyInfo?: {
					keyId: string;
					purpose: string;
					active: boolean;
					expiresAt: number;
					requestCount: number;
				};
			}> = [];

			// Add lead as member
			// Try to find lead's email in workspace keys
			const leadEmail = dept.lead.toLowerCase().replace(/\s+/g, ".");
			const leadApiKey = Array.from(emailToApiKey.entries()).find(([email]) =>
				email.includes(leadEmail) || email.includes(dept.lead.toLowerCase()),
			)?.[1];

			if (leadApiKey) {
				members.push({
					email: leadApiKey.email,
					role: "lead",
					hasApiKey: true,
					apiKeyInfo: {
						keyId: leadApiKey.keyId,
						purpose: leadApiKey.purpose,
						active: leadApiKey.active,
						expiresAt: leadApiKey.expiresAt,
						requestCount: leadApiKey.requestCount,
					},
				});
			} else {
				// Lead doesn't have API key yet, but still include them
				members.push({
					email: `${dept.lead.toLowerCase().replace(/\s+/g, ".")}@nexus.trading`,
					role: "lead",
					hasApiKey: false,
				});
			}

			// Add other members who have API keys for this department
			// (In a real implementation, you'd parse actual member list from TEAM.md)
			// For now, we'll include any workspace keys that might be related
			const departmentKeys = workspaceKeys.filter((key) => {
				// Match keys that might be related to this department
				// This is a placeholder - in reality you'd have a mapping
				return key.active;
			});

			for (const key of departmentKeys) {
				// Only add if not already added as lead
				if (!members.some((m) => m.email === key.email)) {
					members.push({
						email: key.email,
						role: "member",
						hasApiKey: true,
						apiKeyInfo: {
							keyId: key.keyId,
							purpose: key.purpose,
							active: key.active,
							expiresAt: key.expiresAt,
							requestCount: key.requestCount,
						},
					});
				}
			}

			return {
				...dept,
				members,
			};
		});

		// Calculate statistics
		const totalMembers = enhancedDepartments.reduce(
			(sum, dept) => sum + dept.members.length,
			0,
		);
		const withApiKeys = enhancedDepartments.reduce(
			(sum, dept) => sum + dept.members.filter((m) => m.hasApiKey).length,
			0,
		);
		const withoutApiKeys = totalMembers - withApiKeys;

		const byDepartment = enhancedDepartments.reduce(
			(acc, dept) => {
				acc[dept.id] = dept.members.length;
				return acc;
			},
			{} as Record<string, number>,
		);

		return {
			departments: enhancedDepartments,
			total: enhancedDepartments.length,
			byDepartment,
			withApiKeys,
			withoutApiKeys,
		};
	} catch (error: unknown) {
		const errorMessage =
			error instanceof Error ? error.message : String(error);
		console.error("Failed to get team departments registry:", errorMessage);
		return {
			departments: [],
			total: 0,
			byDepartment: {},
			withApiKeys: 0,
			withoutApiKeys: 0,
		};
	}
}
