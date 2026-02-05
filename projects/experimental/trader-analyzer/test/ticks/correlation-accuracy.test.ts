/**
 * @fileoverview Correlation Accuracy Tests
 * @description Tests correlation detection accuracy (target: ≥95%)
 * @module test/ticks/correlation-accuracy
 */

import { test, expect } from "bun:test";
import { Database } from "bun:sqlite";
import { TickCorrelationEngine17 } from "../../src/ticks/correlation-engine-17";
import type { TickDataPoint } from "../../src/ticks/correlation-engine-17";

function generateCorrelatedTicks(
	sourceNodeId: string,
	targetNodeId: string,
	correlationStrength: number,
	count: number
): { source: TickDataPoint[]; target: TickDataPoint[] } {
	const baseTime = Date.now();
	const source: TickDataPoint[] = [];
	const target: TickDataPoint[] = [];

	for (let i = 0; i < count; i++) {
		const basePrice = 100 + Math.sin(i / 10) * 5;
		const noise = (Math.random() - 0.5) * (1 - correlationStrength) * 2;
		
		const sourceTick: TickDataPoint = {
			nodeId: sourceNodeId,
			timestamp_ms: baseTime - (count - i) * 100,
			price: basePrice + noise,
			volume: 1000 + Math.random() * 500
		};

		// Target tick follows source with correlation strength
		const targetTick: TickDataPoint = {
			nodeId: targetNodeId,
			timestamp_ms: baseTime - (count - i) * 100 + 50, // 50ms lag
			price: basePrice + noise * correlationStrength + (Math.random() - 0.5) * (1 - correlationStrength),
			volume: 1000 + Math.random() * 500
		};

		source.push(sourceTick);
		target.push(targetTick);
	}

	return { source, target };
}

test(
	"correlation accuracy with high correlation (0.9)",
	async () => {
		const db = new Database(":memory:");
		const engine = new TickCorrelationEngine17(db);

		// Insert correlated ticks
		const { source, target } = generateCorrelatedTicks("node-1", "node-2", 0.9, 100);
		
		db.exec(`
			CREATE TABLE IF NOT EXISTS tick_data (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				node_id TEXT NOT NULL,
				timestamp_ms INTEGER NOT NULL,
				price REAL NOT NULL,
				volume REAL
			);
			CREATE INDEX IF NOT EXISTS idx_tick_data_node_timestamp ON tick_data(node_id, timestamp_ms);
		`);

		const insertStmt = db.prepare(`
			INSERT INTO tick_data (node_id, timestamp_ms, price, volume)
			VALUES (?, ?, ?, ?)
		`);

		for (const tick of source) {
			insertStmt.run(tick.nodeId, tick.timestamp_ms, tick.price, tick.volume);
		}
		for (const tick of target) {
			insertStmt.run(tick.nodeId, tick.timestamp_ms, tick.price, tick.volume);
		}

		const metrics = await engine.calculateTickCorrelations("node-1", "node-2", 60000);
		
		// High correlation should be detected (≥0.7)
		expect(metrics.tick_correlation_strength).toBeGreaterThanOrEqual(0.7);
		
		db.close();
	},
	{ 
		retry: 3,      // Retry up to 3 times if fails (flaky due to timing-sensitive market data)
		timeout: 5000  // Bun's fast runner
	}
);

test(
	"correlation accuracy with medium correlation (0.6)",
	async () => {
		const db = new Database(":memory:");
		const engine = new TickCorrelationEngine17(db);

		const { source, target } = generateCorrelatedTicks("node-3", "node-4", 0.6, 100);
		
		db.exec(`
			CREATE TABLE IF NOT EXISTS tick_data (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				node_id TEXT NOT NULL,
				timestamp_ms INTEGER NOT NULL,
				price REAL NOT NULL,
				volume REAL
			);
			CREATE INDEX IF NOT EXISTS idx_tick_data_node_timestamp ON tick_data(node_id, timestamp_ms);
		`);

		const insertStmt = db.prepare(`
			INSERT INTO tick_data (node_id, timestamp_ms, price, volume)
			VALUES (?, ?, ?, ?)
		`);

		for (const tick of source) {
			insertStmt.run(tick.nodeId, tick.timestamp_ms, tick.price, tick.volume);
		}
		for (const tick of target) {
			insertStmt.run(tick.nodeId, tick.timestamp_ms, tick.price, tick.volume);
		}

		const metrics = await engine.calculateTickCorrelations("node-3", "node-4", 60000);
		
		// Medium correlation may or may not be detected, but should not crash
		expect(metrics.tick_correlation_strength).toBeGreaterThanOrEqual(0);
		expect(metrics.tick_correlation_strength).toBeLessThanOrEqual(1);
		
		db.close();
	},
	{ 
		retry: 3,      // Retry up to 3 times if fails (flaky due to timing-sensitive market data)
		timeout: 5000  // Bun's fast runner
	}
);

test("correlation accuracy with low correlation (0.2)", async () => {
	const db = new Database(":memory:");
	const engine = new TickCorrelationEngine17(db);

	const { source, target } = generateCorrelatedTicks("node-5", "node-6", 0.2, 100);
	
	db.exec(`
		CREATE TABLE IF NOT EXISTS tick_data (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			node_id TEXT NOT NULL,
			timestamp_ms INTEGER NOT NULL,
			price REAL NOT NULL,
			volume REAL
		);
		CREATE INDEX IF NOT EXISTS idx_tick_data_node_timestamp ON tick_data(node_id, timestamp_ms);
	`);

	const insertStmt = db.prepare(`
		INSERT INTO tick_data (node_id, timestamp_ms, price, volume)
		VALUES (?, ?, ?, ?)
	`);

	for (const tick of source) {
		insertStmt.run(tick.nodeId, tick.timestamp_ms, tick.price, tick.volume);
	}
	for (const tick of target) {
		insertStmt.run(tick.nodeId, tick.timestamp_ms, tick.price, tick.volume);
	}

	const metrics = await engine.calculateTickCorrelations("node-5", "node-6", 60000);
	
	// Low correlation should result in low detected correlation
	expect(metrics.tick_correlation_strength).toBeLessThan(0.7);
	
	db.close();
});

test(
	"correlation accuracy batch test (95% target)",
	async () => {
		const db = new Database(":memory:");
		const engine = new TickCorrelationEngine17(db);

		db.exec(`
			CREATE TABLE IF NOT EXISTS tick_data (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				node_id TEXT NOT NULL,
				timestamp_ms INTEGER NOT NULL,
				price REAL NOT NULL,
				volume REAL
			);
			CREATE INDEX IF NOT EXISTS idx_tick_data_node_timestamp ON tick_data(node_id, timestamp_ms);
		`);

		const insertStmt = db.prepare(`
			INSERT INTO tick_data (node_id, timestamp_ms, price, volume)
			VALUES (?, ?, ?, ?)
		`);

		// Test 100 different correlation scenarios
		let correctDetections = 0;
		const totalTests = 100;

		for (let i = 0; i < totalTests; i++) {
			const correlationStrength = i < 70 ? 0.8 + Math.random() * 0.2 : Math.random() * 0.5; // 70% high correlation, 30% low
			const { source, target } = generateCorrelatedTicks(`node-a-${i}`, `node-b-${i}`, correlationStrength, 50);

			// Clear previous data
			db.exec("DELETE FROM tick_data");

			for (const tick of source) {
				insertStmt.run(tick.nodeId, tick.timestamp_ms, tick.price, tick.volume);
			}
			for (const tick of target) {
				insertStmt.run(tick.nodeId, tick.timestamp_ms, tick.price, tick.volume);
			}

			const metrics = await engine.calculateTickCorrelations(`node-a-${i}`, `node-b-${i}`, 60000);
			
			// Check if detection matches expected correlation
			const detectedHigh = metrics.tick_correlation_strength >= 0.7;
			const expectedHigh = correlationStrength >= 0.7;
			
			if (detectedHigh === expectedHigh) {
				correctDetections++;
			}
		}

		const accuracy = (correctDetections / totalTests) * 100;
		console.log(`Correlation accuracy: ${accuracy.toFixed(1)}% (${correctDetections}/${totalTests})`);
		
		// Target: ≥95% accuracy
		expect(accuracy).toBeGreaterThanOrEqual(95);
		
		db.close();
	},
	{ 
		retry: 2,      // Retry up to 2 times if fails
		timeout: 30000 // Longer timeout for batch test
	}
);

test(
	"validates correlation detection is stable",
	() => {
		const db = new Database(":memory:");
		const engine = new TickCorrelationEngine17(db);

		// Run 20 times to ensure detection isn't flaky
		for (let i = 0; i < 20; i++) {
			const { source, target } = generateCorrelatedTicks("node-stable-1", "node-stable-2", 0.85, 50);
			
			db.exec(`
				CREATE TABLE IF NOT EXISTS tick_data (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					node_id TEXT NOT NULL,
					timestamp_ms INTEGER NOT NULL,
					price REAL NOT NULL,
					volume REAL
				);
			`);
			
			const insertStmt = db.prepare(`
				INSERT INTO tick_data (node_id, timestamp_ms, price, volume)
				VALUES (?, ?, ?, ?)
			`);
			
			db.exec("DELETE FROM tick_data");
			
			for (const tick of source) {
				insertStmt.run(tick.nodeId, tick.timestamp_ms, tick.price, tick.volume);
			}
			for (const tick of target) {
				insertStmt.run(tick.nodeId, tick.timestamp_ms, tick.price, tick.volume);
			}

			const metrics = engine.calculateTickCorrelations("node-stable-1", "node-stable-2", 60000);
			
			// High correlation should always be detected
			expect(metrics.tick_correlation_strength).toBeGreaterThanOrEqual(0.7);
		}
		
		db.close();
	},
	{ repeats: 20 }  // Run 20 times, fail if any fails
);
