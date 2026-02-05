#!/usr/bin/env bun
/**
 * @fileoverview Tick Ingestion Throughput Benchmark
 * @description Measures tick ingestion rate (target: 50k ticks/sec)
 * @module bench/ticks
 */

import { Database } from "bun:sqlite";
import { TickDataCollector17 } from "../src/ticks/collector-17";
import { existsSync, unlinkSync } from "fs";
import { join } from "path";

const TEST_DB_PATH = join(import.meta.dir, "ticks-bench.db");

// Parse command line arguments
const args = process.argv.slice(2);
const durationMatch = args.find(arg => arg.startsWith("--duration="));
const rateMatch = args.find(arg => arg.startsWith("--rate="));

const durationMs = durationMatch 
	? parseDuration(durationMatch.split("=")[1]) 
	: 10000; // Default 10 seconds

const targetRate = rateMatch 
	? parseInt(rateMatch.split("=")[1]) 
	: 50000; // Default 50k ticks/sec

function parseDuration(duration: string): number {
	const match = duration.match(/^(\d+)(s|ms)$/);
	if (!match) return 10000;
	const value = parseInt(match[1]);
	const unit = match[2];
	return unit === "s" ? value * 1000 : value;
}

function createTestDatabase(): Database {
	// Clean up existing test DB
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
	db.exec(`
		PRAGMA journal_mode = WAL;
		PRAGMA synchronous = NORMAL;
		PRAGMA cache_size = -64000;
	`);
	return db;
}

function generateTick(nodeId: string, timestamp: number): any {
	return {
		nodeId,
		timestamp,
		mid: 100 + Math.random() * 10,
		volume: Math.random() * 1000,
		bookmaker: "test-bookmaker",
		marketType: "spread"
	};
}

async function runBenchmark(): Promise<void> {
	const db = createTestDatabase();
	const collector = new TickDataCollector17(db);

	const startTime = Date.now();
	const endTime = startTime + durationMs;
	let tickCount = 0;
	const nodeIds = ["node-1", "node-2", "node-3", "node-4", "node-5"];

	console.log(`🚀 Starting tick ingestion benchmark...`);
	console.log(`   Duration: ${durationMs}ms`);
	console.log(`   Target rate: ${targetRate} ticks/sec`);
	console.log("");

	// Calculate interval between ticks to achieve target rate
	const intervalMs = 1000 / targetRate;
	let lastTickTime = startTime;

	while (Date.now() < endTime) {
		const now = Date.now();
		const nodeId = nodeIds[tickCount % nodeIds.length];
		
		collector.addTick(generateTick(nodeId, now));
		tickCount++;

		// Rate limiting: wait if we're ahead of schedule
		const expectedTime = startTime + (tickCount * intervalMs);
		if (now < expectedTime) {
			const waitTime = expectedTime - now;
			if (waitTime > 0) {
				await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, 10)));
			}
		}
	}

	const actualDuration = Date.now() - startTime;
	const stats = collector.getStats();
	const actualRate = (stats.totalTicksIngested / actualDuration) * 1000;
	const totalIngested = stats.totalTicksIngested;

	console.log("📊 Benchmark Results:");
	console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
	console.log(`   Total ticks ingested: ${totalIngested.toLocaleString()}`);
	console.log(`   Actual duration: ${actualDuration}ms`);
	console.log(`   Ingestion rate: ${Math.round(actualRate).toLocaleString()} ticks/sec`);
	console.log(`   Target rate: ${targetRate.toLocaleString()} ticks/sec`);
	console.log(`   Performance: ${((actualRate / targetRate) * 100).toFixed(1)}%`);
	console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

	// Cleanup
	db.close();
	if (existsSync(TEST_DB_PATH)) {
		unlinkSync(TEST_DB_PATH);
	}
	if (existsSync(TEST_DB_PATH + "-wal")) {
		unlinkSync(TEST_DB_PATH + "-wal");
	}
	if (existsSync(TEST_DB_PATH + "-shm")) {
		unlinkSync(TEST_DB_PATH + "-shm");
	}
}

runBenchmark().catch(console.error);
