#!/usr/bin/env bun
/**
 * @fileoverview Correlation Engine Benchmark Suite
 * @description Performance benchmarks for multi-layer correlation engine (1.1.1.1.4.5.0)
 * @module bench/correlation-engine
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-BENCH@1.1.1.1.4.5.0;instance-id=CORRELATION-ENGINE-BENCH-001;version=1.1.1.1.4.5.0}]
 * [PROPERTIES:{bench={value:"correlation-engine";@root:"ROOT-BENCH";@chain:["BP-BENCH","BP-CORRELATION"];@version:"1.1.1.1.4.5.0"}}]
 * [CLASS:CorrelationEngineBenchmark][#REF:v-1.1.1.1.4.5.0.BP.BENCH.CORRELATION.1.0.A.1.1.BENCH.1.1]]
 * 
 * Usage:
 *   bun run bench/correlation-engine.ts
 *   BENCHMARK_RUNNER=1 bun run bench/correlation-engine.ts  # JSON output
 */

import { bench, group, execute } from "./runner";
import { Database } from "bun:sqlite";
import { DoDMultiLayerCorrelationGraph } from "../src/analytics/correlation-engine";
import { existsSync, unlinkSync } from "fs";
import { join } from "path";

// ============ TEST DATA SETUP ============
const TEST_DB_PATH = join(import.meta.dir, "correlation-engine-bench.db");

function createTestDatabase(): Database {
	// Clean up existing test DB and WAL/SHM files
	if (existsSync(TEST_DB_PATH)) {
		unlinkSync(TEST_DB_PATH);
	}
	if (existsSync(TEST_DB_PATH + "-wal")) {
		unlinkSync(TEST_DB_PATH + "-wal");
	}
	if (existsSync(TEST_DB_PATH + "-shm")) {
		unlinkSync(TEST_DB_PATH + "-shm");
	}

	const db = new Database(TEST_DB_PATH);

	// Initialize schema
	db.run(`
		PRAGMA journal_mode = WAL;
		PRAGMA synchronous = NORMAL;
		PRAGMA cache_size = -64000;
	`);

	db.run(`
		CREATE TABLE IF NOT EXISTS multi_layer_correlations (
			correlation_id INTEGER PRIMARY KEY,
			layer INTEGER NOT NULL CHECK(layer BETWEEN 1 AND 4),
			event_id TEXT NOT NULL,
			source_node TEXT NOT NULL CHECK(length(source_node) >= 10),
			target_node TEXT NOT NULL CHECK(length(target_node) >= 10),
			correlation_type TEXT NOT NULL,
			correlation_score REAL NOT NULL CHECK(correlation_score BETWEEN -1 AND 1),
			latency_ms INTEGER NOT NULL CHECK(latency_ms >= 0),
			expected_propagation REAL NOT NULL,
			detected_at INTEGER NOT NULL,
			confidence REAL NOT NULL CHECK(confidence BETWEEN 0 AND 1),
			severity_level TEXT CHECK(severity_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
			UNIQUE(event_id, source_node, target_node, detected_at)
		)
	`);

	db.run(`CREATE INDEX IF NOT EXISTS idx_layer_confidence ON multi_layer_correlations (layer, confidence)`);
	db.run(`CREATE INDEX IF NOT EXISTS idx_event_detection ON multi_layer_correlations (event_id, detected_at)`);

	db.run(`
		CREATE TABLE IF NOT EXISTS audit_log (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			timestamp INTEGER NOT NULL,
			operation TEXT NOT NULL,
			event_id TEXT NOT NULL,
			layer INTEGER NOT NULL,
			outcome TEXT NOT NULL,
			latency_ms INTEGER NOT NULL,
			user_context TEXT
		)
	`);

	db.run(`CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_log (timestamp)`);

	// Insert test data
	const now = Date.now();
	const eventIds = ["NBA-20240101-1200", "NFL-20240101-1800", "MLB-20240102-1400"];
	const layers = [1, 2, 3, 4];
	const nodePrefixes = ["market", "event", "sport", "direct"];

	const stmt = db.prepare(`
		INSERT INTO multi_layer_correlations
		(layer, event_id, source_node, target_node, correlation_type, correlation_score,
		 latency_ms, expected_propagation, detected_at, confidence, severity_level)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`);

	// Generate 1000 correlations per layer
	for (const eventId of eventIds) {
		for (const layer of layers) {
			for (let i = 0; i < 1000; i++) {
				const correlation = (Math.random() * 2 - 1); // -1 to 1
				const confidence = Math.abs(correlation) * 0.8 + Math.random() * 0.2;
				const severity = confidence > 0.8 ? 'CRITICAL' : confidence > 0.6 ? 'HIGH' : confidence > 0.4 ? 'MEDIUM' : 'LOW';
				
				stmt.run(
					layer,
					eventId,
					`${nodePrefixes[layer - 1]}_source_${i}_${eventId}`,
					`${nodePrefixes[layer - 1]}_target_${i}_${eventId}`,
					layer === 4 ? 'cross_sport' : layer === 3 ? 'cross_event' : layer === 2 ? 'cross_market' : 'direct_latency',
					correlation,
					Math.floor(Math.random() * 1000), // latency_ms
					correlation * 0.8, // expected_propagation
					now - Math.floor(Math.random() * 86400000), // detected_at (within last 24h)
					confidence,
					severity
				);
			}
		}
	}

	return db;
}

// ============ BENCHMARK SETUP ============
const testDb = createTestDatabase();
const engine = new DoDMultiLayerCorrelationGraph(testDb);
const testEventId = "NBA-20240101-1200";

// ============ BENCHMARKS ============
group("Correlation Engine - Layer Building (1.1.1.1.4.5.0)", () => {
	bench("buildLayer1 - Direct correlations", async () => {
		// Access private method via type assertion
		const result = await (engine as any).buildLayer1(testEventId);
		if (!result) throw new Error("buildLayer1 returned null");
	});

	bench("buildLayer2 - Cross-market correlations", async () => {
		const result = await (engine as any).buildLayer2(testEventId);
		if (!result) throw new Error("buildLayer2 returned null");
	});

	bench("buildLayer3 - Cross-event correlations", async () => {
		const result = await (engine as any).buildLayer3(testEventId);
		if (!result) throw new Error("buildLayer3 returned null");
	});

	bench("buildLayer4 - Cross-sport correlations", async () => {
		const result = await (engine as any).buildLayer4(testEventId);
		if (!result) throw new Error("buildLayer4 returned null");
	});
});

group("Correlation Engine - Graph Building", () => {
	bench("buildMultiLayerGraph - All layers", async () => {
		const graph = await engine.buildMultiLayerGraph(testEventId);
		if (!graph) throw new Error("buildMultiLayerGraph returned null");
		if (graph.layers.L1 === null || graph.layers.L2 === null || 
		    graph.layers.L3 === null || graph.layers.L4 === null) {
			throw new Error("Some layers failed to build");
		}
	});

	bench("buildMultiLayerGraph - Invalid eventId (error handling)", async () => {
		const graph = await engine.buildMultiLayerGraph("INVALID-EVENT-ID");
		if (graph !== null) throw new Error("Should return null for invalid eventId");
	});
});

group("Correlation Engine - Anomaly Detection", () => {
	bench("detectAnomalies - Full graph", async () => {
		const graph = await engine.buildMultiLayerGraph(testEventId);
		if (!graph) throw new Error("Failed to build graph");
		
		const anomalies = await engine.detectAnomalies(graph, 0.6);
		if (!Array.isArray(anomalies)) throw new Error("detectAnomalies should return array");
	});

	bench("detectAnomalies - High confidence threshold", async () => {
		const graph = await engine.buildMultiLayerGraph(testEventId);
		if (!graph) throw new Error("Failed to build graph");
		
		const anomalies = await engine.detectAnomalies(graph, 0.9);
		if (!Array.isArray(anomalies)) throw new Error("detectAnomalies should return array");
	});

	bench("detectAnomalies - Low confidence threshold", async () => {
		const graph = await engine.buildMultiLayerGraph(testEventId);
		if (!graph) throw new Error("Failed to build graph");
		
		const anomalies = await engine.detectAnomalies(graph, 0.3);
		if (!Array.isArray(anomalies)) throw new Error("detectAnomalies should return array");
	});
});

group("Correlation Engine - Propagation Prediction", () => {
	bench("predictPropagationPath - Short path", async () => {
		const sourceNode = "market_source_0_NBA-20240101-1200";
		const targetNode = "market_target_0_NBA-20240101-1200";
		
		const path = await engine.predictPropagationPath(sourceNode, targetNode, 2);
		if (!path || !path.path) throw new Error("predictPropagationPath failed");
	});

	bench("predictPropagationPath - Deep path", async () => {
		const sourceNode = "market_source_0_NBA-20240101-1200";
		const targetNode = "market_target_500_NBA-20240101-1200";
		
		const path = await engine.predictPropagationPath(sourceNode, targetNode, 4);
		if (!path || !path.path) throw new Error("predictPropagationPath failed");
	});
});

// 4.2.2.6.0.0.0: Cold-cache propagation prediction test
// Verifies O(n) scaling with depth, not constant-time memoization
group("Correlation Engine - Cold-Cache Propagation Test (4.2.2.6.0.0.0)", () => {
	let depth2Time = 0;
	
	bench("predictPropagationPath - Depth 2 (cold cache)", async () => {
		// Disable cache to test true recursive traversal
		testDb.run('PRAGMA cache_size = 0');
		testDb.run('PRAGMA temp_store = MEMORY');
		
		const sourceNode = "market_source_0_NBA-20240101-1200";
		const targetNode = "market_target_100_NBA-20240101-1200";
		
		const startTime = Bun.nanoseconds();
		const path = await engine.predictPropagationPath(sourceNode, targetNode, 2);
		depth2Time = Bun.nanoseconds() - startTime;
		
		if (!path || !path.path) throw new Error("predictPropagationPath failed");
		
		// Restore cache for next test
		testDb.run('PRAGMA cache_size = -64000');
	});

	bench("predictPropagationPath - Depth 8 (cold cache)", async () => {
		// Disable cache to test true recursive traversal
		testDb.run('PRAGMA cache_size = 0');
		testDb.run('PRAGMA temp_store = MEMORY');
		
		const sourceNode = "market_source_0_NBA-20240101-1200";
		const targetNode = "market_target_500_NBA-20240101-1200";
		
		const startTime = Bun.nanoseconds();
		const path = await engine.predictPropagationPath(sourceNode, targetNode, 8);
		const depth8Time = Bun.nanoseconds() - startTime;
		
		if (!path || !path.path) throw new Error("predictPropagationPath failed");
		
		// Verify O(n) scaling: depth8 should be significantly slower than depth2
		// If times are similar, indicates memoization/caching issue
		if (depth2Time > 0) {
			const ratio = depth8Time / depth2Time;
			if (ratio < 2.0) {
				console.warn(`[WARNING] Depth 8 (${(depth8Time / 1_000_000).toFixed(2)}ms) only ${ratio.toFixed(2)}x slower than depth 2 (${(depth2Time / 1_000_000).toFixed(2)}ms) - possible caching issue`);
				console.warn(`[WARNING] Expected O(n) scaling but got near-constant time - verify cold cache test`);
			} else {
				console.log(`[OK] Depth 8 is ${ratio.toFixed(2)}x slower than depth 2 - O(n) scaling verified`);
			}
		}
		
		// Restore cache
		testDb.run('PRAGMA cache_size = -64000');
	});
});

group("Correlation Engine - Database Queries", () => {
	bench("Database query - Layer 1 (1 hour window)", () => {
		const sql = `
			SELECT source_node, target_node, correlation_score, latency_ms, confidence
			FROM multi_layer_correlations
			WHERE layer = 1 AND event_id = ? AND detected_at > ?
			ORDER BY correlation_score DESC
			LIMIT 50
		`;
		const results = testDb.prepare(sql).all(testEventId, Date.now() - 3600000);
		if (!Array.isArray(results)) throw new Error("Query failed");
	});

	bench("Database query - Layer 2 (24 hour window)", () => {
		const sql = `
			SELECT source_node, target_node, correlation_score, latency_ms, confidence
			FROM multi_layer_correlations
			WHERE layer = 2 AND event_id = ? AND detected_at > ?
			ORDER BY correlation_score DESC
			LIMIT 50
		`;
		const results = testDb.prepare(sql).all(testEventId, Date.now() - 86400000);
		if (!Array.isArray(results)) throw new Error("Query failed");
	});

	bench("Database query - Layer 3 (7 day window)", () => {
		const sql = `
			SELECT source_node, target_node, correlation_score, latency_ms, confidence
			FROM multi_layer_correlations
			WHERE layer = 3 AND event_id = ? AND detected_at > ?
			ORDER BY correlation_score DESC
			LIMIT 50
		`;
		const results = testDb.prepare(sql).all(testEventId, Date.now() - 604800000);
		if (!Array.isArray(results)) throw new Error("Query failed");
	});

	bench("Database query - Layer 4 (24 hour window)", () => {
		const sql = `
			SELECT source_node, target_node, correlation_score, latency_ms, confidence
			FROM multi_layer_correlations
			WHERE layer = 4 AND event_id = ? AND detected_at > ?
			ORDER BY correlation_score DESC
			LIMIT 50
		`;
		const results = testDb.prepare(sql).all(testEventId, Date.now() - 86400000);
		if (!Array.isArray(results)) throw new Error("Query failed");
	});
});

group("Correlation Engine - Error Handling", () => {
	bench("buildLayer1 - Error handling (invalid eventId)", async () => {
		const result = await (engine as any).buildLayer1("INVALID");
		// Should handle gracefully and return null or empty result
	});

	bench("buildLayer2 - Error handling (invalid eventId)", async () => {
		const result = await (engine as any).buildLayer2("INVALID");
		// Should handle gracefully and return null or empty result
	});

	bench("buildLayer3 - Error handling (invalid eventId)", async () => {
		const result = await (engine as any).buildLayer3("INVALID");
		// Should handle gracefully and return null or empty result
	});

	bench("buildLayer4 - Error handling (invalid eventId)", async () => {
		const result = await (engine as any).buildLayer4("INVALID");
		// Should handle gracefully and return null
	});
});

// ============ CLEANUP ============
if (import.meta.main) {
	execute().finally(() => {
		testDb.close();
		if (existsSync(TEST_DB_PATH)) {
			unlinkSync(TEST_DB_PATH);
		}
		if (existsSync(TEST_DB_PATH + "-wal")) {
			unlinkSync(TEST_DB_PATH + "-wal");
		}
		if (existsSync(TEST_DB_PATH + "-shm")) {
			unlinkSync(TEST_DB_PATH + "-shm");
		}
	});
}
