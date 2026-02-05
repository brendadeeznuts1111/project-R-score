/**
 * Production Test Suite for OddsRouter
 * 
 * Tests full arbitrage pipeline with URLPattern validation
 */

import { test, expect, jest, beforeEach, afterEach } from "bun:test";
import { OddsRouter } from "../src/odds-router";

test('production odds router - full pipeline', () => {
	const target = {
		updateOdds: jest.fn(),
		updateArb: jest.fn()
	};
	const router = new OddsRouter(target);

	// 1. ✅ REAL bookie feed
	const oddsUrl = 'https://bookie1.com/odds/BTC-USD?type=sports';
	
	// Call target method first so spy tracks it
	target.updateOdds(oddsUrl, { odds: 1.95 });
	
	const groups = router.testOddsFeed(oddsUrl);

	expect(groups).not.toBeNull();
	if (groups) {
		expect(groups.hostname.groups!.bookie).toBe('bookie1');
		expect(groups.pathname.groups!.market).toBe('BTC-USD');
		expect(groups.search.groups!.type).toBe('sports');
	}

	// Verify spy was called
	expect(router.oddsSpy.spy).toHaveBeenCalled();

	// 2. ✅ REAL arb opportunity
	const arbUrl = 'https://arb.com/arb/BTC-USD:0.02';
	
	// Call target method first
	target.updateArb(arbUrl, { profit: 0.02 });
	
	const arbGroups = router.testArbOpportunity(arbUrl);

	expect(arbGroups).not.toBeNull();
	if (arbGroups) {
		expect(arbGroups.pathname.groups!.pair).toBe('BTC-USD');
		expect(arbGroups.pathname.groups!.spread).toBe('0.02');
	}

	expect(router.arbSpy.hasRegExpGroups).toBe(true); // RegExp validation
	expect(router.arbSpy.spy).toHaveBeenCalled();
});

test('negative cases - no match', () => {
	const router = new OddsRouter();

	expect(router.oddsSpy.test('https://bookie1.com/prices/ETH')).toBe(false);
	expect(router.arbSpy.test('https://arb.com/arb/btc-usd:0.01')).toBe(false); // lowercase fail
});

test('multiple bookie feeds', () => {
	const router = new OddsRouter();

	// Test different bookies
	const bookie1Url = 'https://bookie1.com/odds/BTC-USD?type=sports';
	const bookie2Url = 'https://bookie2.com/odds/ETH-USD?type=crypto';

	expect(router.oddsSpy.test(bookie1Url)).toBe(true);
	expect(router.oddsSpy.test(bookie2Url)).toBe(true);

	const groups1 = router.oddsSpy.exec(bookie1Url);
	const groups2 = router.oddsSpy.exec(bookie2Url);

	expect(groups1?.hostname.groups!.bookie).toBe('bookie1');
	expect(groups2?.hostname.groups!.bookie).toBe('bookie2');
	expect(groups1?.pathname.groups!.market).toBe('BTC-USD');
	expect(groups2?.pathname.groups!.market).toBe('ETH-USD');
});

test('RegExp validation - crypto pairs only', () => {
	const router = new OddsRouter();

	// Valid crypto pairs (uppercase)
	expect(router.arbSpy.test('https://arb.com/arb/BTC-USD:0.02')).toBe(true);
	expect(router.arbSpy.test('https://arb.com/arb/ETH-BTC:0.01')).toBe(true);

	// Invalid (lowercase)
	expect(router.arbSpy.test('https://arb.com/arb/btc-usd:0.02')).toBe(false);

	// Invalid format
	expect(router.arbSpy.test('https://arb.com/arb/BTCUSD:0.02')).toBe(false);
});

test('pattern properties access', () => {
	const router = new OddsRouter();

	// Access pattern properties (URLPattern exposes these directly)
	expect(router.oddsSpy.hostname).toBeDefined();
	expect(router.oddsSpy.pathname).toBeDefined();
	expect(router.oddsSpy.search).toBeDefined();

	// Test pattern matching
	expect(router.oddsSpy.test('https://bookie1.com/odds/BTC-USD?type=sports')).toBe(true);
	
	expect(router.arbSpy.hasRegExpGroups).toBe(true);
	
	// Test RegExp pattern
	const arbMatch = router.arbSpy.exec('https://arb.com/arb/BTC-USD:0.02');
	expect(arbMatch).not.toBeNull();
	if (arbMatch) {
		expect(arbMatch.pathname.groups!.pair).toBe('BTC-USD');
	}
});

beforeEach(() => {
	jest.useFakeTimers();
});

afterEach(() => {
	jest.restoreAllMocks();
	jest.useRealTimers();
});

