#!/usr/bin/env bun
/**
 * @fileoverview SQLite 3.51.1 EXISTS-to-JOIN Optimization Benchmark
 * @description Measures performance improvement from EXISTS-to-JOIN optimization
 * @module bench/sqlite-exists-to-join
 * @version 14.4.7.0.0.0.0
 * @see {@link ../docs/14.4.0.0.0.0.0-BUN-RUNTIME-ENHANCEMENTS.md SQLite 3.51.1 Update}
 */

import { Database } from "bun:sqlite";
import { existsSync, unlinkSync } from "fs";
import { join } from "path";

const dbPath = join(import.meta.dir, "exists-to-join-benchmark.db");

// Clean up old database
if (existsSync(dbPath)) {
	unlinkSync(dbPath);
}

// Create database with test schema
const db = new Database(dbPath, { create: true });
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA synchronous = NORMAL");

// Create tables matching research schema pattern
db.exec(`
  CREATE TABLE tensions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT NOT NULL,
    tension_type TEXT NOT NULL,
    severity INTEGER DEFAULT 0,
    resolved BOOLEAN DEFAULT FALSE,
    detected_at INTEGER DEFAULT (unixepoch()),
    resolved_at INTEGER
  );

  CREATE TABLE nodes (
    node_id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    tension_id INTEGER,
    node_type TEXT,
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE INDEX idx_nodes_event_id ON nodes(event_id);
  CREATE INDEX idx_nodes_tension_id ON nodes(tension_id);
  CREATE INDEX idx_tensions_event_id ON tensions(event_id);
  CREATE INDEX idx_tensions_resolved ON tensions(resolved);
`);

// Insert test data
const insertTension = db.prepare(`
  INSERT INTO tensions (event_id, tension_type, severity, resolved)
  VALUES (?, ?, ?, ?)
`);

const insertNode = db.prepare(`
  INSERT INTO nodes (node_id, event_id, tension_id, node_type)
  VALUES (?, ?, ?, ?)
`);

const insertMany = db.transaction(() => {
	// Create 1000 tensions across 100 events
	for (let eventIdx = 0; eventIdx < 100; eventIdx++) {
		const eventId = `event-${eventIdx}`;
		
		// Create 10 tensions per event
		for (let tensionIdx = 0; tensionIdx < 10; tensionIdx++) {
			const resolved = tensionIdx % 3 === 0; // ~33% resolved
			const tensionId = insertTension.run(
				eventId,
				`tension-type-${tensionIdx % 5}`,
				Math.floor(Math.random() * 10) + 1,
				resolved ? 1 : 0
			).lastInsertRowid;
			
			// Create 5-10 nodes per tension
			const nodeCount = 5 + Math.floor(Math.random() * 6);
			for (let nodeIdx = 0; nodeIdx < nodeCount; nodeIdx++) {
				insertNode.run(
					`node-${eventIdx}-${tensionIdx}-${nodeIdx}`,
					eventId,
					tensionId,
					`node-type-${nodeIdx % 3}`
				);
			}
		}
	}
});

insertMany();
console.log("✅ Inserted test data: 1000 tensions, ~7500 nodes");

// Prepare queries
const queryExists = db.prepare(`
  SELECT t.* FROM tensions t
  WHERE EXISTS (
    SELECT 1 FROM nodes n 
    WHERE n.event_id = t.event_id AND n.tension_id = t.id
  )
  AND t.resolved = FALSE
`);

const queryJoin = db.prepare(`
  SELECT DISTINCT t.* FROM tensions t
  INNER JOIN nodes n ON n.event_id = t.event_id AND n.tension_id = t.id
  WHERE t.resolved = FALSE
`);

// Warm up
queryExists.all();
queryJoin.all();

// Benchmark EXISTS query (benefits from EXISTS-to-JOIN optimization in SQLite 3.51.1)
console.log("\n📊 Benchmarking EXISTS-to-JOIN Optimization\n");
console.log("=" .repeat(60));

const iterations = 100;
const existsTimes: number[] = [];
const joinTimes: number[] = [];

for (let i = 0; i < iterations; i++) {
	// Benchmark EXISTS query
	const startExists = Bun.nanoseconds();
	queryExists.all();
	const durationExists = (Bun.nanoseconds() - startExists) / 1_000_000;
	existsTimes.push(durationExists);
	
	// Benchmark JOIN query (baseline)
	const startJoin = Bun.nanoseconds();
	queryJoin.all();
	const durationJoin = (Bun.nanoseconds() - startJoin) / 1_000_000;
	joinTimes.push(durationJoin);
}

// Calculate statistics
function calculateStats(times: number[]) {
	const sorted = [...times].sort((a, b) => a - b);
	const sum = times.reduce((a, b) => a + b, 0);
	const avg = sum / times.length;
	const min = sorted[0];
	const max = sorted[times.length - 1];
	const p50 = sorted[Math.floor(times.length * 0.5)];
	const p95 = sorted[Math.floor(times.length * 0.95)];
	const p99 = sorted[Math.floor(times.length * 0.99)];
	
	return { avg, min, max, p50, p95, p99 };
}

const existsStats = calculateStats(existsTimes);
const joinStats = calculateStats(joinTimes);

console.log("\n🔍 EXISTS Query (SQLite 3.51.1 optimized):");
console.log(`  Average: ${existsStats.avg.toFixed(3)}ms`);
console.log(`  Min:     ${existsStats.min.toFixed(3)}ms`);
console.log(`  Max:     ${existsStats.max.toFixed(3)}ms`);
console.log(`  P50:     ${existsStats.p50.toFixed(3)}ms`);
console.log(`  P95:     ${existsStats.p95.toFixed(3)}ms`);
console.log(`  P99:     ${existsStats.p99.toFixed(3)}ms`);

console.log("\n🔗 JOIN Query (baseline):");
console.log(`  Average: ${joinStats.avg.toFixed(3)}ms`);
console.log(`  Min:     ${joinStats.min.toFixed(3)}ms`);
console.log(`  Max:     ${joinStats.max.toFixed(3)}ms`);
console.log(`  P50:     ${joinStats.p50.toFixed(3)}ms`);
console.log(`  P95:     ${joinStats.p95.toFixed(3)}ms`);
console.log(`  P99:     ${joinStats.p99.toFixed(3)}ms`);

const improvement = ((joinStats.avg - existsStats.avg) / joinStats.avg) * 100;
console.log(`\n📈 Performance Improvement: ${improvement.toFixed(1)}% faster`);

// Verify expected result from documentation
const targetDuration = 5; // Expected: Duration < 5ms (previously 8-12ms in v3.50)
if (existsStats.p50 < targetDuration) {
	console.log(`\n✅ PASS: P50 duration (${existsStats.p50.toFixed(3)}ms) < ${targetDuration}ms target`);
} else {
	console.log(`\n⚠️  WARNING: P50 duration (${existsStats.p50.toFixed(3)}ms) >= ${targetDuration}ms target`);
}

console.log("\n" + "=".repeat(60));

// Cleanup
db.close();
unlinkSync(dbPath);
if (existsSync(dbPath + "-wal")) unlinkSync(dbPath + "-wal");
if (existsSync(dbPath + "-shm")) unlinkSync(dbPath + "-shm");
console.log("\n✅ Benchmark complete, database cleaned up");



