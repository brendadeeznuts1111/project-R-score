/**
 * Full Arbitrage Pipeline Test Suite
 * 
 * Demonstrates complete arbitrage system testing with:
 * - URLPattern routing
 * - Fake timers
 * - Dynamic spies
 * - Proxy testing
 */

import { test, expect, jest, beforeEach, afterEach } from "bun:test";
import spyKit from "../src/index";

// Simulate arbitrage system
const arbSystem = {
	updateOdds: (path: string, odds: any) => {
		return { success: true, path, odds };
	},
	updateArb: (path: string, opp: any) => {
		return { success: true, path, opp };
	},
	cacheOdds: (key: string, data: any) => {
		return { cached: true, key, data };
	}
};

// Simulate odds feed fetch
const fetchOddsViaProxy = async (url: string) => {
	return arbSystem.updateOdds(url, { odds: 1.95 });
};

beforeEach(() => {
	jest.useFakeTimers();
});

afterEach(() => {
	jest.restoreAllMocks();
	jest.useRealTimers();
});

test('full arbitrage pipeline + fake timers + URL routing', () => {
	const oddsSpy = spyKit.create(arbSystem, 'updateOdds');
	const arbSpy = spyKit.create(arbSystem, 'updateArb');
	const cacheSpy = spyKit.create(arbSystem, 'cacheOdds');

	// 1. Route-based odds spy with URLPattern
	const oddsRoute = oddsSpy.spyOnPattern('/bookies/:bookie/:market');

	// 2. Dynamic key spies
	oddsSpy.spyOnKey('bookie1:BTC-USD');
	arbSpy.spyOnKey('BTC-USD:1.95-1.98');

	// 3. Simulate odds feed
	fetchOddsViaProxy('/bookies/bookie1/BTC-USD');

	// 4. Verify route + key + args
	expect(oddsRoute.test('/bookies/bookie1/BTC-USD')).toBe(true);
	
	const groups = oddsRoute.exec('/bookies/bookie1/BTC-USD');
	expect(groups).not.toBeNull();
	if (groups) {
		expect(groups.pathname.groups.bookie).toBe('bookie1');
		expect(groups.pathname.groups.market).toBe('BTC-USD');
	}

	// Verify spy was called (all spies share the same underlying spy)
	const btcSpy = oddsSpy.spyOnKey('bookie1:BTC-USD');
	expect(btcSpy).toHaveBeenCalled();

	// 5. Advance time for expiry logic
	jest.advanceTimersByTime(5000);

	// Simulate cache expiry
	const expiredSpy = cacheSpy.spyOnKey('BTC-USD:expired');
	arbSystem.cacheOdds('BTC-USD:expired', { expired: true });

	expect(expiredSpy).toHaveBeenCalled();
});

test('multiple bookie routes with URLPattern', () => {
	const oddsSpy = spyKit.create(arbSystem, 'updateOdds');

	// Create pattern spies for different routes
	const bookieRoute = oddsSpy.spyOnPattern('/bookies/:bookie/:market');
	const exchangeRoute = oddsSpy.spyOnPattern('/exchanges/:exchange/:pair');

	// Test routes
	fetchOddsViaProxy('/bookies/bookie1/BTC-USD');
	fetchOddsViaProxy('/exchanges/binance/BTC-USDT');

	// Verify pattern matching
	expect(bookieRoute.test('/bookies/bookie1/BTC-USD')).toBe(true);
	expect(exchangeRoute.test('/exchanges/binance/BTC-USDT')).toBe(true);

	// Verify route groups
	const bookieGroups = bookieRoute.exec('/bookies/bookie1/BTC-USD');
	expect(bookieGroups?.pathname.groups.bookie).toBe('bookie1');
	expect(bookieGroups?.pathname.groups.market).toBe('BTC-USD');

	const exchangeGroups = exchangeRoute.exec('/exchanges/binance/BTC-USDT');
	expect(exchangeGroups?.pathname.groups.exchange).toBe('binance');
	expect(exchangeGroups?.pathname.groups.pair).toBe('BTC-USDT');
});

test('arbitrage opportunity detection with timers', () => {
	const arbSpy = spyKit.create(arbSystem, 'updateArb');

	// Create spies for different arbitrage opportunities
	const nflArb = arbSpy.spyOnKey('nfl-q4-spread');
	const nbaArb = arbSpy.spyOnKey('nba-q2-total');

	// Simulate arbitrage detection
	arbSystem.updateArb('nfl-q4-spread', {
		profit_pct: 0.042,
		value_usd: 50000,
		execute: true
	});

	arbSystem.updateArb('nba-q2-total', {
		profit_pct: 0.058,
		value_usd: 75000,
		execute: true
	});

	// Verify calls
	expect(nflArb).toHaveBeenCalled();
	expect(nbaArb).toHaveBeenCalled();

	// Advance timers for execution delay
	jest.advanceTimersByTime(1000);

	// Verify call counts (spies share underlying spy, so check individual spies)
	expect(nflArb).toHaveBeenCalledTimes(1);
	expect(nbaArb).toHaveBeenCalledTimes(1);
});

test('cache expiry with fake timers', () => {
	const cacheSpy = spyKit.create(arbSystem, 'cacheOdds');

	// Create spy before caching
	const btcSpy = cacheSpy.spyOnKey('BTC-USD');
	
	// Cache some odds
	arbSystem.cacheOdds('BTC-USD', { odds: 1.95 });
	expect(btcSpy).toHaveBeenCalledTimes(1);

	// Advance time to expiry
	jest.advanceTimersByTime(60000); // 60 seconds

	// Expire cache
	const expiredSpy = cacheSpy.spyOnKey('BTC-USD:expired');
	arbSystem.cacheOdds('BTC-USD:expired', { expired: true });
	expect(expiredSpy).toHaveBeenCalledTimes(1);
});

test('route sequence verification', () => {
	const oddsSpy = spyKit.create(arbSystem, 'updateOdds');
	const spy = jest.spyOn(arbSystem, 'updateOdds');

	// Simulate sequence of route updates
	fetchOddsViaProxy('/bookies/bookie1/BTC-USD');
	fetchOddsViaProxy('/bookies/bookie2/ETH-USD');
	fetchOddsViaProxy('/bookies/bookie3/BNB-USD');

	// Verify sequence
	expect(spy).toHaveBeenNthCalledWith(1, '/bookies/bookie1/BTC-USD', expect.any(Object));
	expect(spy).toHaveBeenNthCalledWith(2, '/bookies/bookie2/ETH-USD', expect.any(Object));
	expect(spy).toHaveBeenNthCalledWith(3, '/bookies/bookie3/BNB-USD', expect.any(Object));
	expect(spy).toHaveBeenCalledTimes(3);

	jest.advanceTimersByTime(100);
});

