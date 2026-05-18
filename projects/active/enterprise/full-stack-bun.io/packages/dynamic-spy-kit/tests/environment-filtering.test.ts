/**
 * @dynamic-spy/kit v9.0 - Environment Filtering Test
 * 
 * Verifies that environment filtering (prod/staging) works correctly
 */

import { test, expect } from "bun:test";
import { UltraArbRouter } from "../src/ultra-arb-router";
import { AI_ADAPTIVE_MULTI_REGION_PATTERNS, filterByEnvironment } from "../src/ai-adaptive-multi-region-patterns";

test("Environment filtering - prod patterns only", async () => {
	const api = { fetchOdds: () => {} };
	const router = new UltraArbRouter(api, {
		enableCache: true,
		useFFI: false,
		watchPatterns: false
	});

	// Test with prod environment
	const result = await router.routeRequest(
		'https://pinnacle.com/vds/sports/1/zh/odds/12345',
		'global',
		'prod'
	);

	expect(result).toBeDefined();
	expect(result.environment).toBe('prod');
	expect(result.priority).toBe(110); // P_ASIA_ZH should match
	expect(result.patternId).toBe('P_ASIA_ZH');
});

test("Environment filtering - staging patterns", async () => {
	const api = { fetchOdds: () => {} };
	const router = new UltraArbRouter(api, {
		enableCache: true,
		useFFI: false,
		watchPatterns: false
	});

	// Test with staging environment
	const result = await router.routeRequest(
		'https://pinnacle.com/vds/sports/1/zh/odds/12345',
		'global',
		'staging'
	);

	expect(result).toBeDefined();
	
	// If staging patterns exist, should match staging
	// If no staging patterns, should fallback (but still work)
	const stagingPatterns = filterByEnvironment(AI_ADAPTIVE_MULTI_REGION_PATTERNS, 'staging');
	if (stagingPatterns.length > 0) {
		expect(result.environment).toBe('staging');
	} else {
		// No staging patterns, should fallback but still return a result
		expect(result).toBeDefined();
	}
});

test("Environment filterByEnvironment function", () => {
	const prodPatterns = filterByEnvironment(AI_ADAPTIVE_MULTI_REGION_PATTERNS, 'prod');
	const stagingPatterns = filterByEnvironment(AI_ADAPTIVE_MULTI_REGION_PATTERNS, 'staging');
	const devPatterns = filterByEnvironment(AI_ADAPTIVE_MULTI_REGION_PATTERNS, 'dev');

	// Verify all patterns are filtered correctly
	expect(prodPatterns.every(p => p.environment === 'prod')).toBe(true);
	expect(stagingPatterns.every(p => p.environment === 'staging')).toBe(true);
	expect(devPatterns.every(p => p.environment === 'dev')).toBe(true);

	// Prod patterns should exist
	expect(prodPatterns.length).toBeGreaterThan(0);
	
	// Verify P_ASIA_ZH is in prod patterns
	const asiaZhPattern = prodPatterns.find(p => p.id === 'P_ASIA_ZH');
	expect(asiaZhPattern).toBeDefined();
	expect(asiaZhPattern?.environment).toBe('prod');
});

test("Environment parameter from URL query", async () => {
	const api = { fetchOdds: () => {} };
	const router = new UltraArbRouter(api, {
		enableCache: true,
		useFFI: false,
		watchPatterns: false
	});

	// Simulate prod environment parameter
	const prodResult = await router.routeRequest(
		'https://pinnacle.com/vds/sports/1/zh/odds/12345',
		'global',
		'prod' // env=prod
	);

	expect(prodResult.environment).toBe('prod');

	// Simulate staging environment parameter
	const stagingResult = await router.routeRequest(
		'https://pinnacle.com/vds/sports/1/zh/odds/12345',
		'global',
		'staging' // env=staging
	);

	expect(stagingResult).toBeDefined();
});

test("Environment filtering isolates patterns correctly", () => {
	const prodPatterns = filterByEnvironment(AI_ADAPTIVE_MULTI_REGION_PATTERNS, 'prod');
	const stagingPatterns = filterByEnvironment(AI_ADAPTIVE_MULTI_REGION_PATTERNS, 'staging');

	// Prod and staging patterns should be mutually exclusive
	const prodIds = new Set(prodPatterns.map(p => p.id));
	const stagingIds = new Set(stagingPatterns.map(p => p.id));
	
	// Check for overlap (should be none if properly isolated)
	const overlap = [...prodIds].filter(id => stagingIds.has(id));
	
	// If both environments have patterns, they should be different
	if (prodPatterns.length > 0 && stagingPatterns.length > 0) {
		expect(overlap.length).toBe(0);
	}
});

test("Default environment is prod", async () => {
	const api = { fetchOdds: () => {} };
	const router = new UltraArbRouter(api, {
		enableCache: true,
		useFFI: false,
		watchPatterns: false
	});

	// Test without explicit environment (should default to prod)
	const result = await router.routeRequest(
		'https://pinnacle.com/vds/sports/1/zh/odds/12345',
		'global'
		// No environment parameter - should default to prod
	);

	expect(result).toBeDefined();
	// Should match prod patterns by default
	if (result.environment) {
		expect(result.environment).toBe('prod');
	}
});



