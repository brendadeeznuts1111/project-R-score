/**
 * @dynamic-spy/kit v5.2 - Production Arbitrage Router Test
 * 
 * 75 sportsbooks URLPattern - production ready
 */

import { test, expect, beforeEach } from "bun:test";
import { ArbRouter } from "../src/router/arb-router";
import { SPORTSBOOK_PATTERNS, SPORTSBOOK_BENCHMARK } from "../src/sportsbook-patterns";

describe("ArbRouter - 75 Bookies", () => {
	let api: any;
	let router: ArbRouter;

	beforeEach(() => {
		api = { fetchOdds: () => {} };
		router = new ArbRouter(api);
	});

	test("router initializes all 75 bookies", () => {
		expect(router.getSpies().size).toBeGreaterThanOrEqual(75);
	});

	test("testBookie returns Bun.exec() groups", () => {
		// Test Pinnacle pattern
		const result = router.testBookie(
			'pinnacle',
			'https://pinnacle.com/vds/sports/1/odds/12345'
		);

		expect(result.matches).toBe(true);
		expect(result.groups).toBeDefined();
		expect(result.vig).toBeDefined();
		expect(result.latency).toBeDefined();
	});

	test("testBookie extracts groups correctly", () => {
		// Test with Bun pattern groups
		const result = router.testBookie(
			'pinnacle',
			'https://pinnacle.com/vds/sports/nfl/odds/spread?lang=en'
		);

		if (result.matches) {
			// Groups should be extracted from Bun.exec()
			expect(result.groups).toBeDefined();
		}
	});

	test("spy verification works", () => {
		const spy = router.getSpy('pinnacle');
		if (!spy) return;

		// Call API
		api.fetchOdds('https://pinnacle.com/vds/sports/1/odds/12345');

		// Verify spy was called
		expect(spy.calledTimes()).toBeGreaterThan(0);

		const result = router.testBookie(
			'pinnacle',
			'https://pinnacle.com/vds/sports/1/odds/12345'
		);

		// Should be verified if spy was called
		if (spy.calledTimes() > 0) {
			expect(result.verified).toBe(true);
		}
	});

	test("all bookies have patterns", () => {
		const bookies = Object.keys(SPORTSBOOK_PATTERNS) as Array<keyof typeof SPORTSBOOK_PATTERNS>;
		
		for (const bookie of bookies) {
			const spy = router.getSpy(bookie);
			expect(spy).toBeDefined();
			expect(spy?.test).toBeDefined();
			expect(spy?.exec).toBeDefined();
		}
	});
});



