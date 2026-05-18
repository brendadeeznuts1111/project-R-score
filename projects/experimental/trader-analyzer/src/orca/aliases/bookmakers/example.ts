/**
 * @fileoverview Example usage of Bookmaker Canonical UUID System
 * @description Demonstrates UUID generation, caching, and market fetching
 * @module orca/aliases/bookmakers/example
 */

import {
	BookmakerUUIDGenerator,
	generateMarketUUID,
	getBookmakerCache,
	getHeaderManager,
	getMarketFetcher,
	type MarketIdentifier,
} from "./index";

/**
 * Example: Generate deterministic UUIDs for markets
 */
export function exampleUUIDGeneration() {
	console.info("=== UUID Generation Examples ===\n");

	// Generate UUID for a market
	const uuid1 = generateMarketUUID("betfair-12345", "Arsenal", "Chelsea", 0);
	console.info("Market UUID:", uuid1);

	// Same inputs = same UUID (deterministic)
	const uuid2 = generateMarketUUID("betfair-12345", "Arsenal", "Chelsea", 0);
	console.info("Same inputs:", uuid1 === uuid2); // true

	// Different inputs = different UUID
	const uuid3 = generateMarketUUID("betfair-12345", "Arsenal", "Chelsea", 1); // Different period
	console.info("Different period:", uuid1 !== uuid3); // true

	// Using the class directly
	const identifier: MarketIdentifier = {
		bookId: "pinnacle-67890",
		home: "Lakers",
		away: "Celtics",
		period: 0,
	};
	const uuid4 = BookmakerUUIDGenerator.generate(identifier);
	console.info("Class-based UUID:", uuid4);

	// Validate UUID
	const isValid = BookmakerUUIDGenerator.validateUUID(uuid4);
	console.info("Valid UUID:", isValid); // true
}

/**
 * Example: Cache operations
 */
export async function exampleCacheOperations() {
	console.info("\n=== Cache Operations Examples ===\n");

	const cache = getBookmakerCache();

	// Set a value with 5 minute TTL
	await cache.set(
		"test:key1",
		{ data: "test value", timestamp: Date.now() },
		300,
	);
	console.info("Set cache key: test:key1");

	// Get cached value
	const cached = await cache.get<{ data: string; timestamp: number }>(
		"test:key1",
	);
	console.info("Retrieved:", cached);

	// Check if key exists
	const exists = await cache.has("test:key1");
	console.info("Key exists:", exists); // true

	// Get metrics
	const metrics = await cache.getMetrics();
	console.info("Cache metrics:", {
		hits: metrics.totalHits,
		misses: metrics.totalMisses,
		hitRate: metrics.hitRate.toFixed(2),
		size: metrics.cacheSize,
	});

	// Get stats
	const stats = await cache.getStats();
	console.info("Cache stats:", {
		totalEntries: stats.totalEntries,
		totalSizeBytes: stats.totalSizeBytes,
		avgEntrySize: stats.avgEntrySize.toFixed(2),
	});
}

/**
 * Example: Header management
 */
export function exampleHeaderManagement() {
	console.info("\n=== Header Management Examples ===\n");

	const headerManager = getHeaderManager();

	// Get headers for Betfair
	try {
		const betfairHeaders = headerManager.getHeaders("betfair", {
			token: "session-token-123",
		});
		console.info("Betfair headers:", betfairHeaders);
	} catch (error) {
		console.info("Betfair headers error:", error);
	}

	// Validate request parameters
	const isValid = headerManager.validateRequest("betfair", {
		marketId: "1.123456",
		eventId: "12345",
	});
	console.info("Valid Betfair request:", isValid); // true

	const invalid = headerManager.validateRequest("betfair", {
		marketId: "1.123456",
		// Missing eventId
	});
	console.info("Invalid Betfair request:", invalid); // false

	// Get all rules
	const rules = headerManager.getAllRules();
	console.info(
		"Registered exchanges:",
		rules.map((r) => r.exchange),
	);
}

/**
 * Example: Market fetching (with mock data)
 */
export async function exampleMarketFetching() {
	console.info("\n=== Market Fetching Examples ===\n");

	const fetcher = getMarketFetcher();

	// Get available exchanges
	const exchanges = fetcher.getAvailableExchanges();
	console.info("Available exchanges:", exchanges);

	// Note: Actual fetching requires real API implementations
	// This is just demonstrating the structure
	console.info("Market fetcher initialized with cache TTL: 300 seconds");
	console.info(
		"Use fetcher.fetchAndCanonicalize(exchange, params) to fetch markets",
	);
}

/**
 * Run all examples
 */
export async function runAllExamples() {
	exampleUUIDGeneration();
	await exampleCacheOperations();
	exampleHeaderManagement();
	await exampleMarketFetching();
}

// Run if executed directly
if (import.meta.main) {
	runAllExamples().catch(console.error);
}
