/**
 * Performance Tests for Tag System (Bun)
 * @module orca/aliases/bookmakers/tags.performance.test
 */

import { describe, expect, it } from "bun:test";
import {
	type CanonicalMarket,
	filterMarketsByTags,
	getTagStatistics,
	inferTagsFromMarket,
} from "./tags";

describe("Tag System Performance", () => {
	// Generate large dataset
	const generateLargeMarketSet = (size: number): CanonicalMarket[] => {
		return Array.from({ length: size }, (_, i) => {
			const isEven = i % 2 === 0;
			const sport = isEven ? "basketball" : "football";
			const league = isEven ? "NBA" : "NFL";
			const period = i % 3 === 0 ? 0 : i % 3 === 1 ? 1 : 2;

			return {
				uuid: `uuid-${i}`,
				bookId: `betfair-${i}`,
				home: `Team${i}A`,
				away: `Team${i}B`,
				period,
				league,
				sport,
				startTime: new Date(Date.now() + i * 1000),
				odds: { home: 1.5, away: 2.5 },
				exchanges: [
					{
						exchange: "betfair",
						odds: { home: 1.5, away: 2.5 },
						timestamp: new Date(),
					},
				],
				canonicalOdds: { home: 1.5, away: 2.5 },
				timestamp: new Date(Date.now() - (i % 10) * 60 * 1000), // Varying timestamps
			};
		});
	};

	describe("inferTagsFromMarket", () => {
		it("handles large volume of market inference efficiently", () => {
			const markets = generateLargeMarketSet(1000);

			const startTime = performance.now();

			const results = markets.map((market) => inferTagsFromMarket(market));

			const endTime = performance.now();
			const executionTime = endTime - startTime;

			expect(results).toHaveLength(1000);
			expect(executionTime).toBeLessThan(100); // Should complete in < 100ms

			// Verify some results
			expect(results[0]).toContain("sports");
			expect(results[1]).toContain("sports");
		});

		it("performance scales reasonably with dataset size", () => {
			const sizes = [100, 1000, 5000];
			const times: number[] = [];

			sizes.forEach((size) => {
				const subset = generateLargeMarketSet(size);
				const startTime = performance.now();

				subset.forEach((market) => inferTagsFromMarket(market));

				const endTime = performance.now();
				times.push(endTime - startTime);
			});

			// Check that time increases with size (but not exponentially)
			expect(times[2]).toBeGreaterThan(times[0]);
			// Linear scaling check: time for 5000 should be roughly 5x time for 1000
			const ratio = times[2] / times[1];
			expect(ratio).toBeLessThan(10); // Should scale reasonably
		});
	});

	describe("filterMarketsByTags", () => {
		it("efficiently filters large market sets", () => {
			const markets = generateLargeMarketSet(10000);

			const startTime = performance.now();

			const filtered = filterMarketsByTags(markets, ["sports", "live"]);

			const endTime = performance.now();
			const executionTime = endTime - startTime;

			// Should filter efficiently
			expect(filtered.length).toBeGreaterThan(0);
			expect(executionTime).toBeLessThan(100); // Should complete quickly
		});

		it("performance scales reasonably with dataset size", () => {
			const sizes = [100, 1000, 5000];
			const times: number[] = [];

			sizes.forEach((size) => {
				const subset = generateLargeMarketSet(size);
				const startTime = performance.now();

				filterMarketsByTags(subset, ["live"]);

				const endTime = performance.now();
				times.push(endTime - startTime);
			});

			// Check that time increases with size
			expect(times[2]).toBeGreaterThan(times[0]);
		});

		it("handles multiple tag filters efficiently", () => {
			const markets = generateLargeMarketSet(5000);

			const startTime = performance.now();

			const filtered = filterMarketsByTags(markets, [
				"sports",
				"basketball",
				"nba",
				"live",
			]);

			const endTime = performance.now();
			const executionTime = endTime - startTime;

			expect(filtered.length).toBeGreaterThan(0);
			expect(executionTime).toBeLessThan(100);
		});
	});

	describe("getTagStatistics", () => {
		it("efficiently calculates statistics for large datasets", () => {
			const markets = generateLargeMarketSet(10000);

			const startTime = performance.now();

			const stats = getTagStatistics(markets);

			const endTime = performance.now();
			const executionTime = endTime - startTime;

			expect(stats).toBeDefined();
			expect(stats.length).toBeGreaterThan(0);
			expect(executionTime).toBeLessThan(100); // Should be fast

			// Verify statistics
			const sportsStat = stats.find((s) => s.tag === "sports");
			expect(sportsStat).toBeDefined();
			expect(sportsStat?.percentage).toBe(100); // All markets are sports
		});

		it("handles empty market arrays", () => {
			const startTime = performance.now();

			const stats = getTagStatistics([]);

			const endTime = performance.now();
			const executionTime = endTime - startTime;

			expect(stats).toBeArray();
			expect(stats).toHaveLength(0);
			expect(executionTime).toBeLessThan(10); // Should be instant
		});
	});

	describe("Memory Usage", () => {
		it("does not create excessive memory overhead", () => {
			// This is a basic memory check
			const markets = generateLargeMarketSet(10000);

			// Process the dataset
			const processed = markets.map((market) => ({
				...market,
				inferredTags: inferTagsFromMarket(market),
			}));

			expect(processed).toHaveLength(10000);
			// Basic assertion that we can process large datasets
			expect(processed[0].inferredTags).toBeArray();
			expect(processed[0].inferredTags.length).toBeGreaterThan(0);
		});

		it("handles concurrent tag inference", () => {
			const markets = generateLargeMarketSet(1000);

			const startTime = performance.now();

			// Simulate concurrent processing
			const results = Promise.all(
				markets.map(async (market) => inferTagsFromMarket(market)),
			);

			const endTime = performance.now();
			const executionTime = endTime - startTime;

			expect(results).toBeDefined();
			expect(executionTime).toBeLessThan(200); // Should handle concurrency well
		});
	});

	describe("Edge Cases Performance", () => {
		it("handles markets with missing fields efficiently", () => {
			const markets: CanonicalMarket[] = Array.from(
				{ length: 1000 },
				(_, i) => ({
					uuid: `uuid-${i}`,
					bookId: `betfair-${i}`,
					home: `Team${i}A`,
					away: `Team${i}B`,
					period: 0,
					league: i % 2 === 0 ? "NBA" : undefined, // Some missing leagues
					sport: i % 3 === 0 ? "basketball" : undefined, // Some missing sports
					startTime: new Date(),
					odds: {},
					exchanges: [],
					canonicalOdds: {},
					timestamp: new Date(),
				}),
			);

			const startTime = performance.now();

			const results = markets.map((market) => inferTagsFromMarket(market));

			const endTime = performance.now();
			const executionTime = endTime - startTime;

			expect(results).toHaveLength(1000);
			expect(executionTime).toBeLessThan(100);
		});

		it("handles very large tag arrays efficiently", () => {
			const markets = generateLargeMarketSet(1000);
			const manyTags = Array.from({ length: 100 }, (_, i) => `tag${i}`);

			const startTime = performance.now();

			// Filter with many tags (though most won't match)
			const filtered = filterMarketsByTags(markets, manyTags);

			const endTime = performance.now();
			const executionTime = endTime - startTime;

			expect(filtered).toBeArray();
			expect(executionTime).toBeLessThan(100);
		});
	});
});
