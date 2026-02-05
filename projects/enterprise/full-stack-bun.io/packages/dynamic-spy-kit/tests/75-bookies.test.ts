/**
 * 75 Bookies Test Suite
 * 
 * Tests all sportsbooks URLPattern coverage
 */

import { test, expect } from "bun:test";
import { SportsbookRouter } from "../src/sportsbook-router";
import { SPORTSBOOK_BENCHMARK } from "../src/sportsbook-patterns";

test('75 sportsbooks URLPattern - full coverage', () => {
	const router = new SportsbookRouter();

	// Test all bookies in benchmark
	const bookies = Object.keys(SPORTSBOOK_BENCHMARK);
	
	bookies.forEach(bookie => {
		const benchmark = SPORTSBOOK_BENCHMARK[bookie];
		const sampleUrl = `https://${benchmark.hostname}${benchmark.oddsPath}`;
		
		const result = router.testBookie(bookie, sampleUrl);
		
		expect(result).not.toBeNull();
		if (result) {
			expect(result.matches).toBe(true);
			expect(result.vig).toBe(benchmark.vig);
			expect(result.type).toBe(benchmark.type);
		}
	});

	expect(router.getAllBookies().length).toBeGreaterThanOrEqual(bookies.length);
});

test('sharp bookies identification', () => {
	const router = new SportsbookRouter();
	const sharpBookies = router.getSharpBookies();

	expect(sharpBookies.length).toBeGreaterThanOrEqual(3);
	expect(sharpBookies).toContain('pinnacle');
	expect(sharpBookies).toContain('sbobet');
	expect(sharpBookies).toContain('betfair');
});

test('square bookies identification', () => {
	const router = new SportsbookRouter();
	const squareBookies = router.getSquareBookies();

	expect(squareBookies.length).toBeGreaterThanOrEqual(7);
	expect(squareBookies).toContain('bet365');
	expect(squareBookies).toContain('fonbet');
	expect(squareBookies).toContain('betmgm');
});

test('benchmark stats calculation', () => {
	const router = new SportsbookRouter();
	const stats = router.getBenchmarkStats();

	expect(stats.sharpBookies).toBeGreaterThanOrEqual(3);
	expect(stats.squareBookies).toBeGreaterThanOrEqual(7);
	expect(stats.total).toBeGreaterThanOrEqual(10);
	expect(stats.topArbPairs.length).toBeGreaterThan(0);
	expect(stats.heatmap.length).toBeGreaterThan(0);
});

test('leaderboard generation', () => {
	const router = new SportsbookRouter();
	const leaderboard = router.getLeaderboard(10);

	expect(leaderboard.length).toBeGreaterThan(0);
	expect(leaderboard.length).toBeLessThanOrEqual(10);
	expect(leaderboard[0].arbProfit).toBeGreaterThanOrEqual(leaderboard[leaderboard.length - 1]?.arbProfit || 0);
});



