#!/usr/bin/env bun

/**
 * Correlation Engine CLI
 *
 * Usage:
 *   bun run correlation health              - Check correlation engine health
 *   bun run correlation graph <eventId>     - Build correlation graph for event
 *   bun run correlation anomalies <eventId> - Detect anomalies for event
 *   bun run correlation propagate <source> <target> - Predict propagation path
 */

import { DoDMultiLayerCorrelationGraph, healthCheck } from "../analytics/correlation-engine";
import { CrossMarketCorrelationEngine } from "../analytics/cross-market-correlation";
import { Database } from "bun:sqlite";

const args = process.argv.slice(2);
const command = args[0];

async function main() {
	switch (command) {
		case "health":
			await showHealth();
			break;
		case "graph":
			await buildGraph();
			break;
		case "anomalies":
			await detectAnomalies();
			break;
		case "propagate":
			await predictPropagation();
			break;
		case "cross-market":
			await analyzeCrossMarket();
			break;
		case "market-data":
			await updateMarketData();
			break;
		default:
			showHelp();
			break;
	}
}

async function showHealth() {
	try {
		const db = new Database(process.env.DATABASE_PATH || "./markets.db");
		const health = healthCheck(db, new Set());
		console.info("Correlation Engine Health:");
		console.info(`Status: ${health.status}`);
		console.info(`DB Latency: ${health.metrics.dbLatency}ms`);
		console.info(`Layer Failures: ${health.metrics.layerFailures}`);
		console.info(`Active Connections: ${health.metrics.activeConnections}`);
		console.info(`Last Build: ${new Date(health.metrics.lastSuccessfulBuild).toISOString()}`);
		if (health.failover) {
			console.info("⚠️  FAILOVER ACTIVE");
		}
	} catch (error) {
		console.error("Health check failed:", error);
		process.exit(1);
	}
}

async function buildGraph() {
	const eventId = args[1];
	if (!eventId) {
		console.error("Usage: bun run correlation graph <eventId>");
		process.exit(1);
	}

	try {
		const db = new Database(process.env.DATABASE_PATH || "./markets.db");
		const engine = new DoDMultiLayerCorrelationGraph(db);
		const graph = await engine.buildMultiLayerGraph(eventId);

		if (!graph) {
			console.error("Failed to build graph for event:", eventId);
			process.exit(1);
		}

		console.info("Correlation Graph Built:");
		console.info(`Event: ${graph.eventId}`);
		console.info(`Layers: L4=${!!graph.layers.L4}, L3=${!!graph.layers.L3}, L2=${!!graph.layers.L2}, L1=${!!graph.layers.L1}`);
		console.info(`Build Time: ${graph.metrics.buildLatency.toFixed(2)}ms`);
		console.info(`Success Rate: ${(graph.metrics.layerSuccessRate * 100).toFixed(1)}%`);
	} catch (error) {
		console.error("Graph build failed:", error);
		process.exit(1);
	}
}

async function detectAnomalies() {
	const eventId = args[1];
	if (!eventId) {
		console.error("Usage: bun run correlation anomalies <eventId>");
		process.exit(1);
	}

	try {
		const db = new Database(process.env.DATABASE_PATH || "./markets.db");
		const engine = new DoDMultiLayerCorrelationGraph(db);
		const graph = await engine.buildMultiLayerGraph(eventId);

		if (!graph) {
			console.error("Failed to build graph for event:", eventId);
			process.exit(1);
		}

		const anomalies = await engine.detectAnomalies(graph);
		console.info(`Anomalies Detected: ${anomalies.length}`);

		for (const anomaly of anomalies.slice(0, 10)) {
			console.info(`- ${anomaly.severity}: ${anomaly.source} -> ${anomaly.target} (${anomaly.confidence.toFixed(3)})`);
		}

		if (anomalies.length > 10) {
			console.info(`... and ${anomalies.length - 10} more`);
		}
	} catch (error) {
		console.error("Anomaly detection failed:", error);
		process.exit(1);
	}
}

async function predictPropagation() {
	const sourceNode = args[1];
	const targetNode = args[2];
	if (!sourceNode || !targetNode) {
		console.error("Usage: bun run correlation propagate <source> <target>");
		process.exit(1);
	}

	try {
		const db = new Database(process.env.DATABASE_PATH || "./markets.db");
		const engine = new DoDMultiLayerCorrelationGraph(db);
		const path = await engine.predictPropagationPath(sourceNode, targetNode);

		console.info("Propagation Path:");
		console.info(`Total Latency: ${path.totalLatency}ms`);
		console.info(`Final Impact: ${path.finalImpact.toFixed(4)}`);
		console.info(`Confidence: ${(path.confidence * 100).toFixed(1)}%`);

		console.info("\nPath:");
		for (const step of path.path) {
			console.info(`  ${step.source} -> ${step.target} (${step.impact.toFixed(3)})`);
		}
	} catch (error) {
		console.error("Propagation prediction failed:", error);
		process.exit(1);
	}
}

async function analyzeCrossMarket() {
	const markets = args[1]?.split(",") || ['CRYPTO', 'SPORTS', 'PREDICTION'];
	const timeWindow = parseInt(args[2] || "3600000");

	try {
		const db = new Database(process.env.DATABASE_PATH || "./markets.db");
		const engine = new CrossMarketCorrelationEngine(db);

		console.info(`Analyzing cross-market correlations for markets: ${markets.join(', ')}`);
		console.info(`Time window: ${timeWindow / 1000 / 60} minutes`);

		const correlations = await engine.analyzeCrossMarketCorrelations(markets, timeWindow);

		console.info(`\nFound ${correlations.length} correlation pairs:`);
		for (const corr of correlations) {
			console.info(`\n${corr.sourceMarket} ↔ ${corr.targetMarket}`);
			console.info(`  Strength: ${corr.correlationStrength.toFixed(4)}`);
			console.info(`  Confidence: ${(corr.confidence * 100).toFixed(1)}%`);
			console.info(`  Shared Entities: ${corr.sharedEntities.join(', ')}`);
			console.info(`  Arbitrage Opportunities: ${corr.arbitrageOpportunities.length}`);
		}
	} catch (error) {
		console.error("Cross-market analysis failed:", error);
		process.exit(1);
	}
}

async function updateMarketData() {
	const market = args[1];
	const symbol = args[2];
	const price = parseFloat(args[3]);
	const volume = parseFloat(args[4]);

	if (!market || !symbol || isNaN(price) || isNaN(volume)) {
		console.error("Usage: bun run correlation market-data <market> <symbol> <price> <volume>");
		process.exit(1);
	}

	try {
		const db = new Database(process.env.DATABASE_PATH || "./markets.db");
		const engine = new CrossMarketCorrelationEngine(db);

		await engine.updateMarketData(market, symbol, price, volume);
		console.info(`Updated market data: ${market}:${symbol} = $${price} (${volume} volume)`);
	} catch (error) {
		console.error("Market data update failed:", error);
		process.exit(1);
	}
}

function showHelp() {
	console.info("Correlation Engine CLI");
	console.info("");
	console.info("Commands:");
	console.info("  health                          Check correlation engine health");
	console.info("  graph <eventId>                 Build correlation graph for event");
	console.info("  anomalies <eventId>             Detect anomalies for event");
	console.info("  propagate <source> <target>     Predict propagation path");
	console.info("  cross-market [markets] [window] Analyze cross-market correlations");
	console.info("  market-data <market> <symbol> <price> <volume> Update market data");
	console.info("");
	console.info("Examples:");
	console.info("  bun run correlation health");
	console.info("  bun run correlation graph NFL-20241206-1234");
	console.info("  bun run correlation anomalies NFL-20241206-1234");
	console.info("  bun run correlation propagate 'Team A' 'Team B'");
	console.info("  bun run correlation cross-market CRYPTO,SPORTS 3600000");
	console.info("  bun run correlation market-data CRYPTO BTC 45000 1000");
}

main().catch(console.error);