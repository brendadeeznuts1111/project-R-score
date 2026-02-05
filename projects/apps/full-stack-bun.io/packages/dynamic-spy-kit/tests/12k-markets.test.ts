/**
 * 12K Markets Test Suite
 * 
 * Tests array index spies (fuzzer fixed)
 */

import { test, expect } from "bun:test";
import { FuzzerSafeSpyFactory } from "../src/fuzzer-safe-spy";

test('12K markets - array spies', () => {
	const allMarkets = Array.from({ length: 12467 }, (_, i) => `MARKET-${i}`);
	const marketSpies = FuzzerSafeSpyFactory.bulkMarketSpies(allMarkets);

	// Should have index + string keys (24,934 total)
	expect(Object.keys(marketSpies).length).toBe(24934);

	// Verify first and last markets
	expect(marketSpies['MARKET-0']).toBeDefined();
	expect(marketSpies['MARKET-12466']).toBeDefined();
	expect(marketSpies['0']).toBeDefined();
	expect(marketSpies['12466']).toBeDefined();
});

test('12K markets - array property spies', () => {
	const markets = Array.from({ length: 12467 }, (_, i) => ({
		id: `MARKET-${i}`,
		sport: 'FOOTBALL',
		odds: Math.random() * 10 + 1
	}));

	const spies = FuzzerSafeSpyFactory.createArrayPropertySpies(markets, 'id');

	expect(spies.length).toBe(12467);
	expect(spies[0]).toBeDefined();
	expect(spies[12466]).toBeDefined();
});

test('12K markets - performance', () => {
	const start = performance.now();
	const allMarkets = Array.from({ length: 12467 }, (_, i) => `MARKET-${i}`);
	const marketSpies = FuzzerSafeSpyFactory.bulkMarketSpies(allMarkets);
	const duration = performance.now() - start;

	expect(Object.keys(marketSpies).length).toBe(24934);
	expect(duration).toBeLessThan(1000); // Should complete in <1s
});



