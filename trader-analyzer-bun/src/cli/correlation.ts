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
		console.log("Correlation Engine Health:");
		console.log(`Status: ${health.status}`);
		console.log(`DB Latency: ${health.metrics.dbLatency}ms`);
		console.log(`Layer Failures: ${health.metrics.layerFailures}`);
		console.log(`Active Connections: ${health.metrics.activeConnections}`);
		console.log(`Last Build: ${new Date(health.metrics.lastSuccessfulBuild).toISOString()}`);
		if (health.failover) {
			console.log("⚠️  FAILOVER ACTIVE");
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

		console.log("Correlation Graph Built:");
		console.log(`Event: ${graph.eventId}`);
		console.log(`Layers: L4=${!!graph.layers.L4}, L3=${!!graph.layers.L3}, L2=${!!graph.layers.L2}, L1=${!!graph.layers.L1}`);
		console.log(`Build Time: ${graph.metrics.buildLatency.toFixed(2)}ms`);
		console.log(`Success Rate: ${(graph.metrics.layerSuccessRate * 100).toFixed(1)}%`);
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
		console.log(`Anomalies Detected: ${anomalies.length}`);

		for (const anomaly of anomalies.slice(0, 10)) {
			console.log(`- ${anomaly.severity}: ${anomaly.source} -> ${anomaly.target} (${anomaly.confidence.toFixed(3)})`);
		}

		if (anomalies.length > 10) {
			console.log(`... and ${anomalies.length - 10} more`);
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

		console.log("Propagation Path:");
		console.log(`Total Latency: ${path.totalLatency}ms`);
		console.log(`Final Impact: ${path.finalImpact.toFixed(4)}`);
		console.log(`Confidence: ${(path.confidence * 100).toFixed(1)}%`);

		console.log("\nPath:");
		for (const step of path.path) {
			console.log(`  ${step.source} -> ${step.target} (${step.impact.toFixed(3)})`);
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

		console.log(`Analyzing cross-market correlations for markets: ${markets.join(', ')}`);
		console.log(`Time window: ${timeWindow / 1000 / 60} minutes`);

		const correlations = await engine.analyzeCrossMarketCorrelations(markets, timeWindow);

		console.log(`\nFound ${correlations.length} correlation pairs:`);
		for (const corr of correlations) {
			console.log(`\n${corr.sourceMarket} ↔ ${corr.targetMarket}`);
			console.log(`  Strength: ${corr.correlationStrength.toFixed(4)}`);
			console.log(`  Confidence: ${(corr.confidence * 100).toFixed(1)}%`);
			console.log(`  Shared Entities: ${corr.sharedEntities.join(', ')}`);
			console.log(`  Arbitrage Opportunities: ${corr.arbitrageOpportunities.length}`);
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
		console.log(`Updated market data: ${market}:${symbol} = $${price} (${volume} volume)`);
	} catch (error) {
		console.error("Market data update failed:", error);
		process.exit(1);
	}
}

function showHelp() {
	console.log("Correlation Engine CLI");
	console.log("");
	console.log("Commands:");
	console.log("  health                          Check correlation engine health");
	console.log("  graph <eventId>                 Build correlation graph for event");
	console.log("  anomalies <eventId>             Detect anomalies for event");
	console.log("  propagate <source> <target>     Predict propagation path");
	console.log("  cross-market [markets] [window] Analyze cross-market correlations");
	console.log("  market-data <market> <symbol> <price> <volume> Update market data");
	console.log("");
	console.log("Examples:");
	console.log("  bun run correlation health");
	console.log("  bun run correlation graph NFL-20241206-1234");
	console.log("  bun run correlation anomalies NFL-20241206-1234");
	console.log("  bun run correlation propagate 'Team A' 'Team B'");
	console.log("  bun run correlation cross-market CRYPTO,SPORTS 3600000");
	console.log("  bun run correlation market-data CRYPTO BTC 45000 1000");
}

main().catch(console.error);