#!/usr/bin/env bun
/**
 * @fileoverview MLGS Bun Console (11.2.1.0.0.0.0)
 * @description Interactive Bun console with preloaded MLGS globals and utilities
 * @module scripts/bun-console
 * @version 11.2.1.0.0.0.0
 * @see 11.0.0.0.0.0.0-TERMINAL-ENVIRONMENT.md
 */

import { Database } from "bun:sqlite";
import { HYPER_BUN_VERSION, getVersionString, getFeaturesString } from "../src/version";
import { performance } from "perf_hooks";
import type {
	MultiLayerCorrelationGraph,
	ShadowArbitrageScanner,
	ShadowMarketProber,
	ShadowSteamDetector,
} from "../src/arbitrage/shadow-graph/index";

// 11.2.1.1.0.0.0.0: Database path configuration
// Uses SHADOW_GRAPH_PATHS.RESEARCH_DB constant
const DB_PATH = "./data/research.db";

// 11.2.1.2.0.0.0.0: Global context for MLGS modules (lazy loaded)
const MLGS_CONTEXT = {
	// 11.2.1.2.1.0.0.0.0: Core modules (lazy loaded)
	db: null as Database | null,
	shadowGraph: null as ShadowMarketProber | null,
	steamDetector: null as ShadowSteamDetector | null,
	arbScanner: null as ShadowArbitrageScanner | null,
	multiLayerGraph: null as MultiLayerCorrelationGraph | null,

	// 11.2.1.2.2.0.0.0.0: Performance metrics storage
	perfMetrics: new Map<string, number>(),

	// 11.2.1.2.3.0.0.0.0: Initialize database connection
	async initDb(): Promise<Database> {
		if (!this.db) {
			this.db = new Database(DB_PATH, { create: true });
			// Initialize schema if needed
			const { initializeShadowGraphDatabase } = await import(
				"../src/arbitrage/shadow-graph/shadow-graph-database"
			);
			initializeShadowGraphDatabase(this.db);
		}
		return this.db;
	},

	// 11.2.1.2.4.0.0.0.0: Initialize shadow graph builder
	async initShadowGraph(): Promise<ShadowMarketProber> {
		if (!this.shadowGraph) {
			const { ShadowMarketProber } = await import(
				"../src/arbitrage/shadow-graph/shadow-graph-builder"
			);
			// Create with placeholder implementations
			this.shadowGraph = new ShadowMarketProber(
				async () => [], // scrapeUINodes
				async () => null, // probeAPINode
				async () => ({ success: false, amount: 0 }), // placeTestBet
				async () => ({ success: false, amount: 0 }), // placeAPIBet
				async () => 0, // calculateCorrelationDeviation
				async () => [] // discoverDarkNodes
			);
		}
		return this.shadowGraph;
	},

	// 11.2.1.2.5.0.0.0.0: Initialize steam detector
	async initSteamDetector(): Promise<ShadowSteamDetector> {
		if (!this.steamDetector) {
			const { ShadowSteamDetector } = await import(
				"../src/arbitrage/shadow-graph/hidden-steam-detector"
			);
			this.steamDetector = new ShadowSteamDetector(
				async () => ({ nodes: [], edges: [] }), // buildShadowGraph
				async () => null, // getRecentMovement
				async () => null, // getVisibleResponse
				async () => "unknown", // classifySharpMoney
				async () => false // checkArbitrage
			);
		}
		return this.steamDetector;
	},

	// 11.2.1.2.6.0.0.0.0: Initialize arbitrage scanner
	async initArbScanner(): Promise<ShadowArbitrageScanner> {
		if (!this.arbScanner) {
			const { ShadowArbitrageScanner } = await import(
				"../src/arbitrage/shadow-graph/shadow-arb-scanner"
			);
			this.arbScanner = new ShadowArbitrageScanner(
				async () => ({ nodes: [], edges: [] }), // buildShadowGraph
				async () => 0 // estimateArbWindow
			);
		}
		return this.arbScanner;
	},

	// 11.2.1.2.7.0.0.0.0: Initialize multi-layer graph
	async initMultiLayerGraph(): Promise<MultiLayerCorrelationGraph> {
		if (!this.multiLayerGraph) {
			const { MultiLayerCorrelationGraph } = await import(
				"../src/arbitrage/shadow-graph/multi-layer-correlation-graph"
			);
			const db = await this.initDb();
			this.multiLayerGraph = new MultiLayerCorrelationGraph(db);
		}
		return this.multiLayerGraph;
	},
};

// 11.2.1.3.0.0.0.0: Utility functions
const utils = {
	formatMoney: (amount: number): string => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format(amount);
	},

	formatPercent: (value: number): string => {
		return `${(value * 100).toFixed(2)}%`;
	},

	formatTime: (ms: number): string => {
		if (ms < 1000) return `${ms.toFixed(0)}ms`;
		if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
		return `${(ms / 60000).toFixed(2)}m`;
	},
};

// 11.2.1.4.0.0.0.0: Performance timing utility
async function time<T>(label: string, fn: () => Promise<T>): Promise<T> {
	const start = performance.now();
	try {
		const result = await fn();
		const duration = performance.now() - start;
		MLGS_CONTEXT.perfMetrics.set(label, duration);
		console.info(`⏱️  ${label}: ${utils.formatTime(duration)}`);
		return result;
	} catch (error) {
		const duration = performance.now() - start;
		console.error(`❌ ${label} failed after ${utils.formatTime(duration)}:`, error);
		throw error;
	}
}

// 11.2.1.5.0.0.0.0: Benchmark utility
async function bench<T>(
	label: string,
	iterations: number,
	fn: () => Promise<T>,
): Promise<void> {
	const times: number[] = [];
	for (let i = 0; i < iterations; i++) {
		const start = performance.now();
		await fn();
		times.push(performance.now() - start);
	}

	const avg = times.reduce((a, b) => a + b, 0) / times.length;
	const min = Math.min(...times);
	const max = Math.max(...times);
	const stdDev = Math.sqrt(
		times.map((t) => Math.pow(t - avg, 2)).reduce((a, b) => a + b, 0) /
			times.length,
	);

	console.info(`
📊 Benchmark: ${label}
  Iterations: ${iterations}
  Average: ${utils.formatTime(avg)}
  Min: ${utils.formatTime(min)}
  Max: ${utils.formatTime(max)}
  Std Dev: ${utils.formatTime(stdDev)}
	`);
}

// 11.2.1.6.0.0.0.0: Inspect utility
function inspect(obj: any, depth = 2): any {
	console.dir(obj, { depth, colors: true });
	return obj;
}

// 11.2.1.7.0.0.0.0: Database query helper
async function query(sql: string, params: any[] = []): Promise<any[]> {
	const db = await MLGS_CONTEXT.initDb();
	return db.query(sql, params).all();
}

// 11.2.1.8.0.0.0.0: Research commands
const research = {
	// 11.2.1.8.1.0.0.0.0: List recent research events
	async events(): Promise<void> {
		try {
			const events = await query(`
				SELECT id, name, sport, start_time, status
				FROM events 
				WHERE start_time > unixepoch('now', '-7 days')
				ORDER BY start_time DESC
				LIMIT 10
			`);

			console.info("📅 Recent Research Events:");
			if (events.length === 0) {
				console.info("  No events found.");
			} else {
				events.forEach((event: any) => {
					const date = event.start_time
						? new Date(event.start_time * 1000).toLocaleString()
						: "N/A";
					console.info(
						`  • ${event.id}: ${event.name || "Unnamed"} (${event.sport || "N/A"}) - ${date} [${event.status || "unknown"}]`,
					);
				});
			}
		} catch (error) {
			console.error("Failed to fetch events:", error);
		}
	},

	// 11.2.1.8.2.0.0.0.0: Show recent anomalies
	async anomalies(): Promise<void> {
		try {
			const anomalies = await query(`
				SELECT anomaly_id, layer, type, confidence, detected_at
				FROM layer_anomalies
				WHERE detected_at > unixepoch('now', '-24 hours')
				ORDER BY confidence DESC
				LIMIT 10
			`);

			console.info("🔍 Recent Anomalies:");
			if (anomalies.length === 0) {
				console.info("  No anomalies found.");
			} else {
				anomalies.forEach((anomaly: any) => {
					const date = anomaly.detected_at
						? new Date(anomaly.detected_at * 1000).toLocaleString()
						: "N/A";
					console.info(
						`  • Layer ${anomaly.layer}: ${anomaly.type || "unknown"} (${utils.formatPercent(anomaly.confidence || 0)} conf) - ${date}`,
					);
				});
			}
		} catch (error) {
			console.error("Failed to fetch anomalies:", error);
		}
	},

	// 11.2.1.8.3.0.0.0.0: List hidden edges
	async edges(): Promise<void> {
		try {
			const edges = await query(`
				SELECT edge_id, source_layer, target_layer, confidence, profit_potential
				FROM hidden_edges
				WHERE detected_at > unixepoch('now', '-6 hours')
					AND confidence > 0.7
				ORDER BY profit_potential DESC
				LIMIT 10
			`);

			console.info("🔗 High-Confidence Hidden Edges:");
			if (edges.length === 0) {
				console.info("  No edges found.");
			} else {
				edges.forEach((edge: any) => {
					console.info(
						`  • ${edge.edge_id}: Layer ${edge.source_layer}→${edge.target_layer} (${utils.formatPercent(edge.confidence || 0)} conf, ${utils.formatPercent(edge.profit_potential || 0)} profit)`,
					);
				});
			}
		} catch (error) {
			console.error("Failed to fetch edges:", error);
		}
	},
};

// 11.2.1.9.0.0.0.0: Help command
function help(): void {
	console.info(`
📚 MLGS Console Commands:

  Core MLGS:
    db                    - Database connection (lazy loaded)
    shadowGraph           - Shadow graph builder (lazy loaded)
    steamDetector         - Hidden steam detector (lazy loaded)
    arbScanner            - Arbitrage scanner (lazy loaded)
    multiLayerGraph       - Multi-layer correlation graph (lazy loaded)
    
  Utilities:
    time(label, asyncFn)  - Time async function execution
    bench(label, n, fn)   - Benchmark function n times
    inspect(obj, depth)   - Deep inspect object
    query(sql, params)    - Execute SQL query
    utils                 - Formatting utilities
    
  Research Commands:
    research.events()     - List recent research events
    research.anomalies()  - Show recent anomalies
    research.edges()      - List hidden edges
    
  Environment:
    env                   - Environment variables
    perf                  - Performance metrics
    
  Examples:
    await db.query("SELECT * FROM events LIMIT 5")
    await time("build", async () => await shadowGraph.buildShadowGraph("event-123"))
    research.events()
    query("SELECT COUNT(*) as count FROM shadow_nodes")
	`);
}

// 11.2.1.10.0.0.0.0: Set up globals
(globalThis as any).db = MLGS_CONTEXT.initDb();
(globalThis as any).shadowGraph = MLGS_CONTEXT.initShadowGraph();
(globalThis as any).steamDetector = MLGS_CONTEXT.initSteamDetector();
(globalThis as any).arbScanner = MLGS_CONTEXT.initArbScanner();
(globalThis as any).multiLayerGraph = MLGS_CONTEXT.initMultiLayerGraph();
(globalThis as any).time = time;
(globalThis as any).bench = bench;
(globalThis as any).inspect = inspect;
(globalThis as any).query = query;
(globalThis as any).utils = utils;
(globalThis as any).research = research;
(globalThis as any).help = help;
(globalThis as any).env = {
	NODE_ENV: process.env.NODE_ENV || "development",
	DATABASE_URL: process.env.DATABASE_URL ? "***" : "not set",
	isDevelopment: process.env.NODE_ENV === "development",
	isProduction: process.env.NODE_ENV === "production",
	isTest: process.env.NODE_ENV === "test",
};
(globalThis as any).perf = {
	list: () => {
		console.info("📈 Performance Metrics:");
		if (MLGS_CONTEXT.perfMetrics.size === 0) {
			console.info("No metrics recorded yet.");
		} else {
			Array.from(MLGS_CONTEXT.perfMetrics.entries())
				.sort(([, a], [, b]) => b - a)
				.forEach(([label, duration]) => {
					console.info(`  ${label}: ${utils.formatTime(duration)}`);
				});
		}
	},
	clear: () => {
		MLGS_CONTEXT.perfMetrics.clear();
		console.info("✅ Performance metrics cleared.");
	},
};

// Display version info on startup
console.info(getVersionString());
console.info(`Features: ${getFeaturesString()}`);
console.info('');

// Welcome message
const welcomeMessage = `
┌─────────────────────────────────────────────────────────────┐
│  🚀 NEXUS Trader Analyzer - MLGS Console                  │
│  Version: 0.1.0 | Environment: ${process.env.NODE_ENV || "development"} │
│                                                             │
│  Available context:                                         │
│    • db: Database connection                               │
│    • shadowGraph: Shadow graph builder                     │
│    • steamDetector: Hidden steam detection                 │
│    • arbScanner: Shadow arbitrage scanner                  │
│    • multiLayerGraph: Multi-layer correlation graph        │
│    • utils: Formatting utilities                           │
│    • research: Research commands                           │
│                                                             │
│  Type 'help()' for available commands                       │
│  Type 'mlgs.system.verifyRouterIntegration()' to verify    │
└─────────────────────────────────────────────────────────────┘

`;

console.info(welcomeMessage);

// Add router verification to global context
(globalThis as any).mlgs = {
	system: {
		verifyRouterIntegration: async () => {
			try {
				// Import MarketDataRouter17 dynamically
				const { MarketDataRouter17 } = await import("../src/api/routes/17.16.7-market-patterns");
				const { ProfilingMultiLayerGraphSystem17 } = await import("../src/arbitrage/shadow-graph/profiling/17.16.1-profiling-multilayer-graph.system");
				
				const graphSystem = new ProfilingMultiLayerGraphSystem17();
				const router = new MarketDataRouter17({ graphSystem } as any);
				
				const result = router.verifyRouterIntegration();
				
				console.info("\n🔍 Router Integration Verification:");
				console.info("=" .repeat(50));
				result.details.forEach((detail: string) => {
					console.info(detail);
				});
				console.info("=" .repeat(50));
				console.info(`\n🎯 Status: ${result.status}\n`);
				
				return result;
			} catch (error) {
				console.error("Verification failed:", error);
				throw error;
			}
		}
	},
	proxy: {
		list: async (bookmaker?: string) => {
			try {
				const { Database } = await import("bun:sqlite");
				const { StructuredLogger } = await import("../src/logging/structured-logger");
				const { ProxyConfigService } = await import("../src/clients/proxy-config-service");
				
				const db = new Database("./data/proxy-config.db", { create: true });
				const logger = new StructuredLogger();
				const service = new ProxyConfigService(db, logger);
				
				const proxies = await service.listProxies(bookmaker);
				
				console.info(`\n📋 Proxy Configuration${bookmaker ? ` for ${bookmaker}` : ""}:`);
				console.info("=".repeat(60));
				proxies.forEach((proxy) => {
					console.info(`\n  ID: ${proxy.id}`);
					console.info(`  URL: ${proxy.url}`);
					console.info(`  Type: ${proxy.type}`);
					console.info(`  Enabled: ${proxy.isEnabled ? "✅" : "❌"}`);
					console.info(`  Health Score: ${proxy.healthScore.toFixed(1)}/100`);
					console.info(`  Errors: ${proxy.errorCount} | Successes: ${proxy.successCount}`);
					console.info(`  Bookmakers: ${proxy.bookmakers.join(", ")}`);
					console.info(`  Last Checked: ${new Date(proxy.lastChecked).toISOString()}`);
				});
				console.info("\n" + "=".repeat(60));
				
				service.stop();
				db.close();
				
				return proxies;
			} catch (error) {
				console.error("Failed to list proxies:", error);
				throw error;
			}
		},
		health: async (proxyId?: string) => {
			try {
				const { Database } = await import("bun:sqlite");
				const { StructuredLogger } = await import("../src/logging/structured-logger");
				const { ProxyConfigService } = await import("../src/clients/proxy-config-service");
				
				const db = new Database("./data/proxy-config.db", { create: true });
				const logger = new StructuredLogger();
				const service = new ProxyConfigService(db, logger);
				
				if (proxyId) {
					const metrics = service.getProxyMetrics(proxyId);
					if (metrics) {
						console.info(`\n🏥 Proxy Health: ${proxyId}`);
						console.info("=".repeat(60));
						console.info(`  Health Score: ${metrics.healthScore.toFixed(1)}/100`);
						console.info(`  Errors: ${metrics.errorTotal}`);
						console.info(`  Successes: ${metrics.successTotal}`);
						console.info(`  Avg Latency: ${metrics.latencyAvg.toFixed(2)}ms`);
						console.info(`  Latency Range: ${metrics.latencyMin.toFixed(2)}ms - ${metrics.latencyMax.toFixed(2)}ms`);
						console.info("=".repeat(60));
					} else {
						console.info(`❌ Proxy ${proxyId} not found`);
					}
				} else {
					const proxies = await service.listProxies();
					console.info(`\n🏥 Proxy Health Summary:`);
					console.info("=".repeat(60));
					proxies.forEach((proxy) => {
						const metrics = service.getProxyMetrics(proxy.id);
						const status = proxy.healthScore >= 70 ? "✅" : proxy.healthScore >= 40 ? "⚠️" : "❌";
						console.info(`  ${status} ${proxy.id}: ${proxy.healthScore.toFixed(1)}/100 (${proxy.errorCount} errors, ${proxy.successCount} successes)`);
					});
					console.info("=".repeat(60));
				}
				
				service.stop();
				db.close();
			} catch (error) {
				console.error("Failed to check proxy health:", error);
				throw error;
			}
		}
	}
};

// Note: Bun will automatically enter interactive REPL mode when this script
// is run directly. The globals are already set up above.
// To use: bun run scripts/bun-console.ts
