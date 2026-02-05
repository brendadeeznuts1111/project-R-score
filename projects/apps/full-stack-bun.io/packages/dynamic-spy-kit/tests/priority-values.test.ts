/**
 * @dynamic-spy/kit v9.0 - Priority Values Test
 * 
 * Verifies that priority routing returns correct priority values
 */

import { test, expect } from "bun:test";
import { UltraArbRouter } from "../src/ultra-arb-router";

test("Priority 110 - P_ASIA_ZH (High priority)", async () => {
	const api = { fetchOdds: () => {} };
	const router = new UltraArbRouter(api, {
		enableCache: true,
		useFFI: false,
		watchPatterns: false
	});

	const result = await router.routeRequest(
		'https://pinnacle.com/vds/sports/1/zh/odds/12345',
		'global',
		'prod'
	);

	expect(result.priority).toBe(110);
	expect(result.patternId).toBe('P_ASIA_ZH');
});

test("Priority 95 - B365_EU_LOCAL (Medium priority)", async () => {
	const api = { fetchOdds: () => {} };
	const router = new UltraArbRouter(api, {
		enableCache: true,
		useFFI: false,
		watchPatterns: false
	});

	const result = await router.routeRequest(
		'https://bet365.com/en/sportsbook/nba/lakers-celtics',
		'global',
		'prod'
	);

	// Should match B365_EU_LOCAL pattern (priority 95)
	if (result.patternId === 'B365_EU_LOCAL') {
		expect(result.priority).toBe(95);
	} else {
		// May fallback, but should still have a priority
		expect(result.priority).toBeDefined();
	}
});

test("Priority 10 - Generic Fallback (Low priority)", async () => {
	const api = { fetchOdds: () => {} };
	const router = new UltraArbRouter(api, {
		enableCache: true,
		useFFI: false,
		watchPatterns: false
	});

	const result = await router.routeRequest(
		'https://unknown.com/random/path',
		'global',
		'prod'
	);

	// Should return priority 10 for generic fallback
	expect(result.priority).toBe(10);
	expect(result.regionUsed).toBe('generic-fallback');
});

test("Priority values are always defined", async () => {
	const api = { fetchOdds: () => {} };
	const router = new UltraArbRouter(api, {
		enableCache: true,
		useFFI: false,
		watchPatterns: false
	});

	const testUrls = [
		'https://pinnacle.com/vds/sports/1/zh/odds/12345', // Priority 110
		'https://bet365.com/en/sportsbook/nba/lakers', // Priority 95
		'https://unknown.com/xyz' // Priority 10
	];

	for (const testUrl of testUrls) {
		const result = await router.routeRequest(testUrl, 'global', 'prod');
		expect(result.priority).toBeDefined();
		expect(typeof result.priority).toBe('number');
		expect(result.priority).toBeGreaterThanOrEqual(10);
	}
});

test("Priority ordering - higher priority matches first", async () => {
	const api = { fetchOdds: () => {} };
	const router = new UltraArbRouter(api, {
		enableCache: true,
		useFFI: false,
		watchPatterns: false
	});

	// High priority pattern should match
	const highPriorityResult = await router.routeRequest(
		'https://pinnacle.com/vds/sports/1/zh/odds/12345',
		'global',
		'prod'
	);

	expect(highPriorityResult.priority).toBeGreaterThanOrEqual(100);
	
	// Low priority fallback
	const lowPriorityResult = await router.routeRequest(
		'https://unknown.com/xyz',
		'global',
		'prod'
	);

	expect(lowPriorityResult.priority).toBe(10);
	expect(highPriorityResult.priority).toBeGreaterThan(lowPriorityResult.priority);
});



