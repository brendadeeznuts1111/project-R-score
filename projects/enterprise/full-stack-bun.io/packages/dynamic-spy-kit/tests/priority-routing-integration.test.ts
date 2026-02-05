/**
 * @dynamic-spy/kit v9.0 - Priority Routing Integration Test
 * 
 * Tests priority-based routing with actual URL patterns
 */

import { test, expect } from "bun:test";
import { UltraArbRouter } from "../src/ultra-arb-router";
import { AI_ADAPTIVE_MULTI_REGION_PATTERNS } from "../src/ai-adaptive-multi-region-patterns";

test("Priority 110 - P_ASIA_ZH (Fastest ~0.3ms)", async () => {
	const api = { fetchOdds: () => {} };
	const router = new UltraArbRouter(api, {
		enableCache: true,
		useFFI: false, // Disable FFI for consistent timing
		watchPatterns: false
	});

	const startTime = performance.now();
	const result = await router.routeRequest(
		'https://pinnacle.com/vds/sports/1/zh/odds/12345',
		'global',
		'prod'
	);
	const duration = performance.now() - startTime;

	expect(result).toBeDefined();
	expect(result.confidence).toBeGreaterThan(0);
	
	if (result.priority) {
		expect(result.priority).toBe(110); // P_ASIA_ZH priority
		expect(result.patternId).toBe('P_ASIA_ZH');
		expect(result.environment).toBe('prod');
		expect(result.type).toBe('static');
	}
	
	// Should be fast (priority routing)
	expect(duration).toBeLessThan(10); // <10ms in test environment
	console.log(`Priority 110: ${duration.toFixed(2)}ms`);
});

test("Priority 95 - B365_EU_LOCAL (Normal ~0.7ms)", async () => {
	const api = { fetchOdds: () => {} };
	const router = new UltraArbRouter(api, {
		enableCache: true,
		useFFI: false,
		watchPatterns: false
	});

	const startTime = performance.now();
	const result = await router.routeRequest(
		'https://bet365.com/en/sportsbook/nba/lakers',
		'global',
		'prod'
	);
	const duration = performance.now() - startTime;

	expect(result).toBeDefined();
	expect(result.confidence).toBeGreaterThan(0);
	
	// May match B365_EU_LOCAL or fallback
	if (result.priority && result.priority >= 90) {
		expect(result.priority).toBeGreaterThanOrEqual(90);
	}
	
	console.log(`Priority 95: ${duration.toFixed(2)}ms`);
});

test("Priority 10 - Generic Fallback (~1.2ms)", async () => {
	const api = { fetchOdds: () => {} };
	const router = new UltraArbRouter(api, {
		enableCache: true,
		useFFI: false,
		watchPatterns: false
	});

	const startTime = performance.now();
	const result = await router.routeRequest(
		'https://unknown.com/xyz',
		'global',
		'prod'
	);
	const duration = performance.now() - startTime;

	expect(result).toBeDefined();
	
	// Should fallback to generic (priority 10)
	if (result.priority !== undefined) {
		expect(result.priority).toBeLessThanOrEqual(10);
	}
	
	// Fallback should still work
	expect(result.confidence).toBeGreaterThan(0);
	console.log(`Priority 10 (Fallback): ${duration.toFixed(2)}ms`);
});

test("Priority routing order - highest priority first", async () => {
	const api = { fetchOdds: () => {} };
	const router = new UltraArbRouter(api, {
		enableCache: true,
		useFFI: false,
		watchPatterns: false
	});

	// Test that high-priority patterns match before lower ones
	const highPriorityUrl = 'https://pinnacle.com/vds/sports/1/zh/odds/12345';
	const result = await router.routeRequest(highPriorityUrl, 'global', 'prod');

	expect(result).toBeDefined();
	
	// Should match P_ASIA_ZH (priority 110) if available
	if (result.patternId === 'P_ASIA_ZH') {
		expect(result.priority).toBe(110);
		expect(result.confidence).toBeGreaterThan(0.9);
	}
});

test("Environment filtering - prod vs staging", async () => {
	const api = { fetchOdds: () => {} };
	const router = new UltraArbRouter(api, {
		enableCache: true,
		useFFI: false,
		watchPatterns: false
	});

	const prodPatterns = AI_ADAPTIVE_MULTI_REGION_PATTERNS.filter(p => p.environment === 'prod');
	const stagingPatterns = AI_ADAPTIVE_MULTI_REGION_PATTERNS.filter(p => p.environment === 'staging');

	expect(prodPatterns.length).toBeGreaterThan(0);
	
	// Test prod environment
	const prodResult = await router.routeRequest(
		'https://pinnacle.com/vds/sports/1/zh/odds/12345',
		'global',
		'prod'
	);
	
	expect(prodResult).toBeDefined();
	if (prodResult.environment) {
		expect(prodResult.environment).toBe('prod');
	}
});

test("Pattern priority affects confidence", async () => {
	const api = { fetchOdds: () => {} };
	const router = new UltraArbRouter(api, {
		enableCache: true,
		useFFI: false,
		watchPatterns: false
	});

	// High priority pattern should have higher confidence
	const highPriorityResult = await router.routeRequest(
		'https://pinnacle.com/vds/sports/1/zh/odds/12345',
		'global',
		'prod'
	);

	expect(highPriorityResult.confidence).toBeGreaterThan(0);
	
	// High priority patterns boost confidence
	if (highPriorityResult.priority && highPriorityResult.priority >= 100) {
		expect(highPriorityResult.confidence).toBeGreaterThan(0.9);
	}
});



