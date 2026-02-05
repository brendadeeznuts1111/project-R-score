#!/usr/bin/env bun
/**
 * @fileoverview SQLite Query Performance Benchmark
 * @description Measures query latency for tick data queries (target: ≤50ms p50)
 * @module scripts/query-benchmark
 */

import { Database } from "bun:sqlite";
import { existsSync } from "fs";
import { join } from "path";

const args = process.argv.slice(2);
const queryTypeMatch = args.find(arg => arg.startsWith("--query="));
const iterationsMatch = args.find(arg => arg.startsWith("--iterations="));

const queryType = queryTypeMatch ? queryTypeMatch.split("=")[1] : "getRecentTicks";
const iterations = iterationsMatch ? parseInt(iterationsMatch.split("=")[1]) : 1000;

// Try multiple possible database paths
const possibleDbPaths = [
	"/var/lib/hyper-bun/tick-data.sqlite",
	"./data/ticks.db",
	"./data/tick-data.sqlite",
	join(import.meta.dir, "../data/ticks.db")
];

function findDatabase(): Database | null {
	for (const dbPath of possibleDbPaths) {
		if (existsSync(dbPath)) {
			try {
				const db = new Database(dbPath);
				// Verify schema exists
				const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('tick_data', 'ticks')").all();
				if (tables.length > 0) {
					return db;
				}
				db.close();
			} catch (e) {
				// Continue to next path
			}
		}
	}
	return null;
}

function createMockDatabase(): Database {
	const db = new Database(":memory:");
	db.exec(`
		CREATE TABLE IF NOT EXISTS tick_data (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			node_id TEXT NOT NULL,
			timestamp_ms INTEGER NOT NULL,
			price REAL NOT NULL,
			volume REAL,
			bookmaker TEXT,
			market_type TEXT,
			created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
		);

		CREATE INDEX IF NOT EXISTS idx_tick_data_node_timestamp ON tick_data(node_id, timestamp_ms);
		CREATE INDEX IF NOT EXISTS idx_tick_data_timestamp ON tick_data(timestamp_ms);
	`);
	
	// Insert sample data using a loop (more reliable than complex SQL)
	const insertStmt = db.prepare(`
		INSERT INTO tick_data (node_id, timestamp_ms, price, volume, bookmaker, market_type)
		VALUES (?, ?, ?, ?, ?, ?)
	`);
	
	const baseTime = Date.now();
	for (let i = 0; i < 1000; i++) {
		insertStmt.run(
			`node-${i % 10}`,
			baseTime - (i * 100),
			100 + (i % 50),
			Math.random() * 1000,
			'test-bookmaker',
			'spread'
		);
	}
	return db;
}

function getRecentTicks(db: Database, nodeId: string, limit: number = 100): any[] {
	const stmt = db.prepare(`
		SELECT * FROM tick_data
		WHERE node_id = ?
		ORDER BY timestamp_ms DESC
		LIMIT ?
	`);
	return stmt.all(nodeId, limit);
}

function calculatePercentile(latencies: number[], percentile: number): number {
	const sorted = [...latencies].sort((a, b) => a - b);
	const index = Math.floor((sorted.length - 1) * percentile / 100);
	return sorted[index] || 0;
}

async function runBenchmark(): Promise<void> {
	const db = findDatabase() || createMockDatabase();
	const nodeIds = ["node-0", "node-1", "node-2", "node-3", "node-4"];

	console.log(`🚀 Starting SQLite query benchmark...`);
	console.log(`   Query type: ${queryType}`);
	console.log(`   Iterations: ${iterations}`);
	console.log("");

	const latencies: number[] = [];

	for (let i = 0; i < iterations; i++) {
		const nodeId = nodeIds[i % nodeIds.length];
		const startTime = Bun.nanoseconds();
		
		try {
			if (queryType === "getRecentTicks") {
				getRecentTicks(db, nodeId, 100);
			} else {
				// Generic query fallback
				const stmt = db.prepare("SELECT COUNT(*) as count FROM tick_data WHERE node_id = ?");
				stmt.get(nodeId);
			}
		} catch (e) {
			console.error(`Query failed: ${e}`);
			continue;
		}

		const endTime = Bun.nanoseconds();
		const latencyMs = Number(endTime - startTime) / 1_000_000;
		latencies.push(latencyMs);
	}

	// Calculate statistics
	const sorted = [...latencies].sort((a, b) => a - b);
	const p50 = calculatePercentile(latencies, 50);
	const p90 = calculatePercentile(latencies, 90);
	const p95 = calculatePercentile(latencies, 95);
	const p99 = calculatePercentile(latencies, 99);
	const min = Math.min(...latencies);
	const max = Math.max(...latencies);
	const mean = latencies.reduce((a, b) => a + b, 0) / latencies.length;

	console.log("📊 Query Benchmark Results:");
	console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
	console.log(`   Total queries: ${iterations}`);
	console.log(`   p50: ${p50.toFixed(2)}ms`);
	console.log(`   p90: ${p90.toFixed(2)}ms`);
	console.log(`   p95: ${p95.toFixed(2)}ms`);
	console.log(`   p99: ${p99.toFixed(2)}ms`);
	console.log(`   min: ${min.toFixed(2)}ms`);
	console.log(`   max: ${max.toFixed(2)}ms`);
	console.log(`   mean: ${mean.toFixed(2)}ms`);
	console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

	if (db.filename !== ":memory:") {
		db.close();
	}
}

runBenchmark().catch(console.error);
