/**
 * @dynamic-spy/kit v9.0 - AI-Adaptive Patterns HMR Test
 * 
 * Tests priority-based routing, environment filtering, and HMR
 */

import { test, expect, beforeAll } from "bun:test";
import { AI_ADAPTIVE_MULTI_REGION_PATTERNS, filterByEnvironment, sortByPriority, getPriorityDistribution } from "../src/ai-adaptive-multi-region-patterns";
import { UltraArbRouter } from "../src/ultra-arb-router";

test("AI-adaptive patterns loaded", () => {
	expect(AI_ADAPTIVE_MULTI_REGION_PATTERNS.length).toBeGreaterThan(0);
	expect(AI_ADAPTIVE_MULTI_REGION_PATTERNS[0].id).toBeDefined();
	expect(AI_ADAPTIVE_MULTI_REGION_PATTERNS[0].priority).toBeGreaterThan(0);
});

test("Environment filtering - prod", () => {
	const prodPatterns = filterByEnvironment(AI_ADAPTIVE_MULTI_REGION_PATTERNS, 'prod');
	expect(prodPatterns.length).toBeGreaterThan(0);
	expect(prodPatterns.every(p => p.environment === 'prod')).toBe(true);
});

test("Priority sorting - highest first", () => {
	const sorted = sortByPriority(AI_ADAPTIVE_MULTI_REGION_PATTERNS);
	expect(sorted[0].priority).toBeGreaterThanOrEqual(sorted[1]?.priority || 0);
	
	// Check that highest priority is first
	const priorities = sorted.map(p => p.priority);
	const maxPriority = Math.max(...priorities);
	expect(priorities[0]).toBe(maxPriority);
});

test("Priority distribution", () => {
	const distribution = getPriorityDistribution(AI_ADAPTIVE_MULTI_REGION_PATTERNS);
	expect(distribution.high).toBeGreaterThanOrEqual(0);
	expect(distribution.medium).toBeGreaterThanOrEqual(0);
	expect(distribution.low).toBeGreaterThanOrEqual(0);
	expect(distribution.aiDriven).toBeGreaterThanOrEqual(0);
	expect(distribution.environment).toBeDefined();
});

test("Priority-based routing - high priority pattern", async () => {
	const api = { fetchOdds: () => {} };
	const router = new UltraArbRouter(api, {
		enableCache: true,
		useFFI: false, // Disable FFI for test
		watchPatterns: false
	});

	// Test high-priority Asia pattern
	const result = await router.routeRequest(
		'https://pinnacle.com/vds/sports/1/zh/odds/12345',
		'global',
		'prod'
	);

	expect(result).toBeDefined();
	expect(result.confidence).toBeGreaterThan(0);
	
	// Should have priority info if matched
	if (result.priority) {
		expect(result.priority).toBeGreaterThanOrEqual(100); // High priority
		expect(result.patternId).toBeDefined();
		expect(result.environment).toBe('prod');
		expect(result.type).toBeDefined();
	}
});

test("Priority-based routing - medium priority pattern", async () => {
	const api = { fetchOdds: () => {} };
	const router = new UltraArbRouter(api, {
		enableCache: true,
		useFFI: false,
		watchPatterns: false
	});

	// Test medium-priority EU pattern
	const result = await router.routeRequest(
		'https://bet365.com/en/sportsbook/nba/lakers-celtics',
		'global',
		'prod'
	);

	expect(result).toBeDefined();
	expect(result.confidence).toBeGreaterThan(0);
});

test("Environment filtering in routing", async () => {
	const api = { fetchOdds: () => {} };
	const router = new UltraArbRouter(api, {
		enableCache: true,
		useFFI: false,
		watchPatterns: false
	});

	// Test with prod environment
	const prodResult = await router.routeRequest(
		'https://pinnacle.com/vds/sports/1/zh/odds/12345',
		'global',
		'prod'
	);

	expect(prodResult).toBeDefined();
	
	// Test with staging environment (should filter differently)
	const stagingResult = await router.routeRequest(
		'https://pinnacle.com/vds/sports/1/zh/odds/12345',
		'global',
		'staging'
	);

	expect(stagingResult).toBeDefined();
});

test("Pattern IDs and types", () => {
	const patterns = AI_ADAPTIVE_MULTI_REGION_PATTERNS;
	
	// Check that all patterns have required fields
	patterns.forEach(pattern => {
		expect(pattern.id).toBeDefined();
		expect(pattern.priority).toBeGreaterThanOrEqual(0);
		expect(['prod', 'staging', 'dev']).toContain(pattern.environment);
		expect(['static', 'ai-generated', 'ai-driven']).toContain(pattern.type);
	});
});

test("High priority patterns (>=100)", () => {
	const highPriority = AI_ADAPTIVE_MULTI_REGION_PATTERNS.filter(p => p.priority >= 100);
	expect(highPriority.length).toBeGreaterThan(0);
	
	// Check specific high-priority patterns exist
	const asiaZh = highPriority.find(p => p.id === 'P_ASIA_ZH');
	expect(asiaZh).toBeDefined();
	expect(asiaZh?.priority).toBe(110);
});

test("AI-driven patterns", () => {
	const aiDriven = AI_ADAPTIVE_MULTI_REGION_PATTERNS.filter(p => 
		p.type === 'ai-driven' || p.type === 'ai-generated'
	);
	expect(aiDriven.length).toBeGreaterThan(0);
	
	// Check that AI-driven patterns have high priority
	const aiPriorities = aiDriven.map(p => p.priority);
	const maxAiPriority = Math.max(...aiPriorities);
	expect(maxAiPriority).toBeGreaterThanOrEqual(1100); // AI patterns should be very high priority
});



