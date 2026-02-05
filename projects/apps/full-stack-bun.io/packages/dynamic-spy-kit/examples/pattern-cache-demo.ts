#!/usr/bin/env bun
/**
 * @dynamic-spy/kit v9.0 - Pattern Cache Demo
 * 
 * Demonstrates the Bun.sqlite-based pattern caching system:
 * - Pattern storage and retrieval
 * - Route caching for fast lookups
 * - Bun.peek() for synchronous cache access
 * - Cache statistics and management
 * 
 * Usage:
 *   bun run examples/pattern-cache-demo.ts
 */

import { PatternCache, RouteCache, patternCache, routeCache } from "../src/utils/pattern-cache";
import { hash } from "bun";

// =============================================================================
// 1. Pattern Storage Demo
// =============================================================================
function demoPatternStorage() {
	console.log("=".repeat(60));
	console.log("1. Pattern Storage (Bun.sqlite)");
	console.log("=".repeat(60));

	// Store patterns
	const patterns = [
		{ id: "FEED_X2", pathname: "/feed/:bookie/:sport/*", hostname: "feed.arbitrage.live", priority: 1350 },
		{ id: "FEED_X3", pathname: "/live/:event/:odds", hostname: "*.feed.arbitrage.live", priority: 1320 },
		{ id: "FEED_X4", pathname: "/api/v3/markets/:marketId/odds", hostname: "api.arbitrage.live", priority: 1300 },
		{ id: "AI_FEED_2", pathname: "/predict/:model/:game", hostname: "ai-odds.stream", priority: 1250 },
		{ id: "AI_FEED_3", pathname: "/ml/:provider/:sport/*", hostname: "*.ai-odds.stream", priority: 1220 },
	];

	console.log(`\n📦 Storing ${patterns.length} patterns...`);

	const startStore = performance.now();
	patternCache.storePatterns(patterns.map(p => ({
		...p,
		patternData: JSON.stringify(p)
	})));
	const storeTime = performance.now() - startStore;

	console.log(`✅ Stored in ${storeTime.toFixed(2)}ms`);

	// Retrieve patterns
	console.log(`\n📋 Retrieving patterns:`);
	for (const p of patterns) {
		const startGet = performance.now();
		const cached = patternCache.getPattern(p.id);
		const getTime = performance.now() - startGet;

		if (cached) {
			console.log(`   ${p.id}: priority=${cached.priority}, time=${getTime.toFixed(4)}ms`);
		}
	}
}

// =============================================================================
// 2. Route Caching Demo
// =============================================================================
function demoRouteCaching() {
	console.log("\n" + "=".repeat(60));
	console.log("2. Route Caching (In-Memory + SQLite)");
	console.log("=".repeat(60));

	// Sample URLs and their matched patterns
	const routeMatches = [
		{
			url: "https://feed.arbitrage.live/feed/pinnacle/nba/lakers-celtics/moneyline",
			patternId: "FEED_X2",
			groups: { bookie: "pinnacle", sport: "nba", "0": "lakers-celtics/moneyline" }
		},
		{
			url: "https://api.arbitrage.live/api/v3/markets/12345/odds",
			patternId: "FEED_X4",
			groups: { marketId: "12345" }
		},
		{
			url: "https://ai-odds.stream/predict/xgb-v3/game-123",
			patternId: "AI_FEED_2",
			groups: { model: "xgb-v3", game: "game-123" }
		}
	];

	console.log(`\n📦 Caching ${routeMatches.length} route matches...`);

	// Cache routes
	for (const match of routeMatches) {
		routeCache.set(match.url, match.patternId, match.groups);
	}

	console.log(`✅ Cached ${routeCache.size} routes`);

	// Retrieve cached routes (simulating hot path)
	console.log(`\n📋 Cache lookups (hot path):`);
	for (const match of routeMatches) {
		const startGet = performance.now();
		const cached = routeCache.get(match.url);
		const getTime = performance.now() - startGet;

		if (cached) {
			console.log(`   ${match.patternId}: ${getTime.toFixed(4)}ms`);
			console.log(`     Groups: ${JSON.stringify(cached.groups)}`);
		}
	}

	// Cache miss
	const missUrl = "https://unknown.com/some/path";
	const startMiss = performance.now();
	const missed = routeCache.get(missUrl);
	const missTime = performance.now() - startMiss;
	console.log(`\n❌ Cache miss for unknown URL: ${missTime.toFixed(4)}ms`);
}

// =============================================================================
// 3. Performance Benchmark
// =============================================================================
function demoBenchmark() {
	console.log("\n" + "=".repeat(60));
	console.log("3. Performance Benchmark");
	console.log("=".repeat(60));

	const localRouteCache = new RouteCache();
	const iterations = 100_000;

	// Populate cache
	console.log(`\n📦 Populating cache with ${iterations.toLocaleString()} routes...`);
	const populateStart = performance.now();
	for (let i = 0; i < iterations; i++) {
		localRouteCache.set(
			`https://example.com/api/route/${i}`,
			`PATTERN_${i % 10}`,
			{ id: `${i}` }
		);
	}
	const populateTime = performance.now() - populateStart;
	console.log(`✅ Populated in ${populateTime.toFixed(2)}ms`);
	console.log(`   Rate: ${((iterations / populateTime) * 1000).toFixed(0)} inserts/sec`);

	// Benchmark lookups
	console.log(`\n🔍 Benchmarking ${iterations.toLocaleString()} lookups...`);
	const lookupStart = performance.now();
	let hits = 0;
	for (let i = 0; i < iterations; i++) {
		const result = localRouteCache.get(`https://example.com/api/route/${i}`);
		if (result) hits++;
	}
	const lookupTime = performance.now() - lookupStart;
	console.log(`✅ Lookups in ${lookupTime.toFixed(2)}ms`);
	console.log(`   Rate: ${((iterations / lookupTime) * 1000).toFixed(0)} lookups/sec`);
	console.log(`   Hit rate: ${((hits / iterations) * 100).toFixed(1)}%`);
}

// =============================================================================
// 4. Cache Statistics
// =============================================================================
function demoCacheStats() {
	console.log("\n" + "=".repeat(60));
	console.log("4. Cache Statistics");
	console.log("=".repeat(60));

	const stats = patternCache.getStats();

	console.log(`\n📊 Pattern Cache Stats:`);
	console.log(`   Patterns in DB: ${stats.patternCount}`);
	console.log(`   Routes in DB: ${stats.routeCacheCount}`);
	console.log(`   In-memory patterns: ${stats.inMemoryPatterns}`);
	console.log(`   In-memory routes: ${stats.inMemoryRoutes}`);
	console.log(`   DB size: ${(stats.dbSizeBytes / 1024).toFixed(2)} KB`);
}

// =============================================================================
// 5. URL Hashing Demo
// =============================================================================
function demoUrlHashing() {
	console.log("\n" + "=".repeat(60));
	console.log("5. URL Hashing with Bun.hash.rapidhash()");
	console.log("=".repeat(60));

	const urls = [
		"https://feed.arbitrage.live/feed/pinnacle/nba/lakers-celtics/moneyline",
		"https://api.arbitrage.live/api/v3/markets/12345/odds",
		"https://ai-odds.stream/predict/xgb-v3/game-123"
	];

	console.log(`\n📋 URL hashes:`);
	for (const url of urls) {
		const h = hash.rapidhash(url);
		console.log(`   ${url.substring(0, 50)}...`);
		console.log(`     Hash: ${h.toString()}`);
	}

	// Collision test
	console.log(`\n🔬 Collision test (10K unique URLs):`);
	const hashes = new Set<bigint>();
	for (let i = 0; i < 10000; i++) {
		hashes.add(hash.rapidhash(`https://example.com/api/route/${i}`));
	}
	console.log(`   Unique hashes: ${hashes.size}/10000`);
	console.log(`   Collision rate: ${((10000 - hashes.size) / 10000 * 100).toFixed(4)}%`);
}

// =============================================================================
// Main
// =============================================================================
async function main() {
	console.log("\n⚡ Pattern Cache Demo - Bun.sqlite + Bun.peek()\n");

	demoPatternStorage();
	demoRouteCaching();
	demoBenchmark();
	demoCacheStats();
	demoUrlHashing();

	console.log("\n" + "=".repeat(60));
	console.log("✅ Demo Complete!");
	console.log("=".repeat(60) + "\n");
}

if (import.meta.main) {
	main().catch(console.error);
}

