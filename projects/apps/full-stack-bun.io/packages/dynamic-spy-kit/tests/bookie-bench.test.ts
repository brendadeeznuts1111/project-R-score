/**
 * Bookie Benchmark Test Suite
 * 
 * Tests 75 bookies × 12K markets performance
 */

import { test, expect } from "bun:test";
import { SportsbookRouter } from "../src/sportsbook-router";
import { SPORTSBOOK_BENCHMARK } from "../src/sportsbook-patterns";

test('75 bookies × 12K markets benchmark', () => {
	const router = new SportsbookRouter();
	const start = performance.now();

	const bookies = Object.keys(SPORTSBOOK_BENCHMARK);
	let totalTests = 0;

	// Test each bookie with sample URLs
	bookies.forEach(bookie => {
		const benchmark = SPORTSBOOK_BENCHMARK[bookie];
		const sampleUrl = `https://${benchmark.hostname}${benchmark.oddsPath}`;
		
		// Simulate 12K markets per bookie
		for (let m = 0; m < 12467; m++) {
			const testUrl = sampleUrl.replace(':market', `MARKET-${m}`);
			const result = router.testBookie(bookie, testUrl);
			if (result) totalTests++;
		}
	});

	const duration = performance.now() - start;

	expect(totalTests).toBeGreaterThan(0);
	expect(duration).toBeLessThan(5000); // <5s for 75 × 12K tests
});



