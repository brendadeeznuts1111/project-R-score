/**
 * @dynamic-spy/kit v9.0 - Priority Routing Response Format Test
 * 
 * Verifies that route responses match the expected JSON format
 */

import { test, expect } from "bun:test";
import { UltraArbRouter } from "../src/ultra-arb-router";

test("Priority 110 response format - P_ASIA_ZH", async () => {
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

	// Verify exact response format
	expect(result).toMatchObject({
		bookie: 'pinnacle',
		confidence: expect.any(Number),
		priority: 110,
		patternId: 'P_ASIA_ZH',
		groups: {
			sportId: '1',
			marketId: '12345'
		},
		environment: 'prod',
		type: 'static',
		matchedPattern: '/vds/sports/:sportId/zh/odds/:marketId'
	});

	// Verify confidence is 1.0 for high-priority exact match
	if (result.priority === 110) {
		expect(result.confidence).toBeGreaterThanOrEqual(0.99);
	}

	// Verify all required fields are present
	expect(result.bookie).toBeDefined();
	expect(result.confidence).toBeDefined();
	expect(result.priority).toBeDefined();
	expect(result.patternId).toBeDefined();
	expect(result.groups).toBeDefined();
	expect(result.environment).toBeDefined();
	expect(result.type).toBeDefined();
	expect(result.matchedPattern).toBeDefined();
});

test("Response includes all required fields", async () => {
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

	// Check all fields from expected format
	const requiredFields = [
		'bookie',
		'confidence',
		'priority',
		'patternId',
		'groups',
		'environment',
		'type',
		'matchedPattern'
	];

	requiredFields.forEach(field => {
		expect(result).toHaveProperty(field);
	});

	// Verify groups structure
	expect(result.groups).toBeInstanceOf(Object);
	expect(result.groups.sportId).toBe('1');
	expect(result.groups.marketId).toBe('12345');
});

test("High priority patterns return confidence 1.0", async () => {
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

	// High priority (>=100) should have high confidence
	if (result.priority && result.priority >= 100) {
		expect(result.confidence).toBeGreaterThanOrEqual(0.99);
		// Exact match with priority 110 should be 1.0
		if (result.priority === 110 && result.patternId === 'P_ASIA_ZH') {
			expect(result.confidence).toBe(1.0);
		}
	}
});

test("Pattern metadata is correct", async () => {
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

	// Verify pattern metadata
	if (result.patternId === 'P_ASIA_ZH') {
		expect(result.priority).toBe(110);
		expect(result.environment).toBe('prod');
		expect(result.type).toBe('static');
		expect(result.matchedPattern).toBe('/vds/sports/:sportId/zh/odds/:marketId');
		expect(result.bookie).toBe('pinnacle');
	}
});

test("Groups extraction matches URLPattern", async () => {
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

	// Verify groups are correctly extracted
	expect(result.groups.sportId).toBe('1');
	expect(result.groups.marketId).toBe('12345');
	
	// Verify matched pattern matches the groups
	expect(result.matchedPattern).toContain(':sportId');
	expect(result.matchedPattern).toContain(':marketId');
});



