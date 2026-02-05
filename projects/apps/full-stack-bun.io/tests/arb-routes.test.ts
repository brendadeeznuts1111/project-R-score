import { test, expect, jest, beforeEach, afterEach } from "bun:test";
import { createDynamicSpy } from "../src/utils/spyFactory";

// Mock spy kit API (matching @dynamic-spy/kit interface)
const spyKit = {
	create: <T extends Record<string, any>>(target: T, method: keyof T) => {
		return createDynamicSpy(target, method);
	}
};

// Simulate server with route handlers
const server = {
	updateOdds: (path: string, odds: any) => {
		// Simulate odds update logic
		return { success: true, path, odds };
	},
	updateArb: (path: string, opp: any) => {
		// Simulate arbitrage opportunity update
		return { success: true, path, opp };
	}
};

// Simulate odds feed fetch function
let rateLimitDelay = 0;
const fetchOdds = async (path: string, odds: any) => {
	// Simulate rate limiting
	if (rateLimitDelay > 0) {
		await new Promise(resolve => setTimeout(resolve, rateLimitDelay));
	}
	return server.updateOdds(path, odds);
};

// Simulate arbitrage feed function
const fetchArb = async (path: string, opp: any) => {
	return server.updateArb(path, opp);
};

beforeEach(() => {
	jest.useFakeTimers();
	rateLimitDelay = 0;
});

afterEach(() => {
	jest.restoreAllMocks();
	jest.useRealTimers();
});

test('API routes + spies + fake timers', () => {
	const oddsSpy = spyKit.create(server, 'updateOdds');
	const arbSpy = spyKit.create(server, 'updateArb');

	// Create spies for specific routes
	const btcOddsSpy = oddsSpy.spyOnKey('/bookie1/BTC-USD');
	const ethOddsSpy = oddsSpy.spyOnKey('/bookie2/ETH-USD');
	const arbSpy1 = arbSpy.spyOnKey('/arb/nfl-q4-spread');

	// Simulate odds feed updates
	fetchOdds('/bookie1/BTC-USD', { odds: 1.95 });
	fetchOdds('/bookie2/ETH-USD', { odds: 2.15 });
	fetchArb('/arb/nfl-q4-spread', { profit_pct: 0.042, execute: true });

	// Verify route hits
	expect(btcOddsSpy).toHaveBeenCalledWith('/bookie1/BTC-USD', { odds: 1.95 });
	expect(ethOddsSpy).toHaveBeenCalledWith('/bookie2/ETH-USD', { odds: 2.15 });
	expect(arbSpy1).toHaveBeenCalledWith('/arb/nfl-q4-spread', expect.objectContaining({
		profit_pct: 0.042,
		execute: true
	}));

	// Advance timers for rate limiting simulation
	jest.advanceTimersByTime(100); // Rate limit delay
});

test('Rate limiting with fake timers', async () => {
	rateLimitDelay = 50; // 50ms rate limit

	const oddsSpy = spyKit.create(server, 'updateOdds');
	const btcSpy = oddsSpy.spyOnKey('/bookie1/BTC-USD');

	// Start async fetch
	const fetchPromise = fetchOdds('/bookie1/BTC-USD', { odds: 1.95 });

	// Verify not called immediately
	expect(btcSpy).not.toHaveBeenCalled();

	// Advance timers by 25ms (halfway)
	jest.advanceTimersByTime(25);
	expect(btcSpy).not.toHaveBeenCalled();

	// Advance timers by remaining 25ms
	jest.advanceTimersByTime(25);
	
	// Wait for promise to resolve
	await fetchPromise;

	// Now should be called
	expect(btcSpy).toHaveBeenCalledWith('/bookie1/BTC-USD', { odds: 1.95 });
	expect(btcSpy).toHaveBeenCalledTimes(1);
});

test('Multiple route updates with sequence verification', () => {
	const oddsSpy = spyKit.create(server, 'updateOdds');
	const spy = jest.spyOn(server, 'updateOdds');

	// Simulate multiple route updates
	fetchOdds('/bookie1/BTC-USD', { odds: 1.95 });
	fetchOdds('/bookie2/ETH-USD', { odds: 2.15 });
	fetchOdds('/bookie3/BNB-USD', { odds: 3.25 });

	// Verify call sequence
	expect(spy).toHaveBeenNthCalledWith(1, '/bookie1/BTC-USD', { odds: 1.95 });
	expect(spy).toHaveBeenNthCalledWith(2, '/bookie2/ETH-USD', { odds: 2.15 });
	expect(spy).toHaveBeenNthCalledWith(3, '/bookie3/BNB-USD', { odds: 3.25 });
	expect(spy).toHaveBeenCalledTimes(3);

	// Advance timers
	jest.advanceTimersByTime(100);
});

test('Arbitrage route updates with profit thresholds', () => {
	const arbSpy = spyKit.create(server, 'updateArb');
	const spy = jest.spyOn(server, 'updateArb');

	// Simulate arbitrage opportunities
	fetchArb('/arb/nfl-q4-spread', { profit_pct: 0.042, value_usd: 50000, execute: true });
	fetchArb('/arb/nba-q2-total', { profit_pct: 0.058, value_usd: 75000, execute: true });
	fetchArb('/arb/mlb-inning7', { profit_pct: 0.025, value_usd: 25000, execute: false });

	// Verify high-value arbs
	expect(spy).toHaveBeenCalledWith('/arb/nfl-q4-spread', expect.objectContaining({
		profit_pct: 0.042,
		execute: true
	}));

	expect(spy).toHaveBeenCalledWith('/arb/nba-q2-total', expect.objectContaining({
		profit_pct: 0.058,
		execute: true
	}));

	expect(spy).toHaveBeenCalledWith('/arb/mlb-inning7', expect.objectContaining({
		profit_pct: 0.025,
		execute: false
	}));

	expect(spy).toHaveBeenCalledTimes(3);

	jest.advanceTimersByTime(100);
});

test('Route rate limiting with multiple requests', async () => {
	rateLimitDelay = 100; // 100ms rate limit

	const oddsSpy = spyKit.create(server, 'updateOdds');
	const spy = jest.spyOn(server, 'updateOdds');

	// Start multiple fetches
	const fetch1 = fetchOdds('/bookie1/BTC-USD', { odds: 1.95 });
	const fetch2 = fetchOdds('/bookie2/ETH-USD', { odds: 2.15 });
	const fetch3 = fetchOdds('/bookie3/BNB-USD', { odds: 3.25 });

	// Advance timers to trigger all rate limits
	jest.advanceTimersByTime(100);

	// Wait for all promises
	await Promise.all([fetch1, fetch2, fetch3]);

	// Verify all calls completed
	expect(spy).toHaveBeenCalledTimes(3);
	expect(spy).toHaveBeenCalledWith('/bookie1/BTC-USD', { odds: 1.95 });
	expect(spy).toHaveBeenCalledWith('/bookie2/ETH-USD', { odds: 2.15 });
	expect(spy).toHaveBeenCalledWith('/bookie3/BNB-USD', { odds: 3.25 });
});

test('Route spy cleanup and isolation', () => {
	const oddsSpy1 = spyKit.create(server, 'updateOdds');
	const btcSpy1 = oddsSpy1.spyOnKey('/bookie1/BTC-USD');

	// First call
	fetchOdds('/bookie1/BTC-USD', { odds: 1.95 });
	expect(btcSpy1).toHaveBeenCalledWith('/bookie1/BTC-USD', { odds: 1.95 });
	expect(btcSpy1).toHaveBeenCalledTimes(1);

	// Clear spy manager
	oddsSpy1.clear();

	// Create a new spy manager after clearing
	const oddsSpy2 = spyKit.create(server, 'updateOdds');
	const btcSpy2 = oddsSpy2.spyOnKey('/bookie1/BTC-USD');

	// Second call - new spy should track it
	fetchOdds('/bookie1/BTC-USD', { odds: 2.05 });
	
	// New spy should track the call
	expect(btcSpy2).toHaveBeenCalledWith('/bookie1/BTC-USD', { odds: 2.05 });
	expect(btcSpy2).toHaveBeenCalledTimes(1);

	// Verify server method still works
	const result = server.updateOdds('/bookie1/BTC-USD', { odds: 2.15 });
	expect(result.success).toBe(true);

	jest.advanceTimersByTime(100);
});

test('Route updates with URLPattern matching', () => {
	const oddsSpy = spyKit.create(server, 'updateOdds');
	const spy = jest.spyOn(server, 'updateOdds');

	// Simulate routes matching URLPattern
	const routes = [
		'/bookie1/BTC-USD',
		'/bookie2/ETH-USD',
		'/bookie3/BNB-USD',
		'/bookie1/BTC-EUR',
		'/bookie2/ETH-EUR'
	];

	routes.forEach((route, index) => {
		fetchOdds(route, { odds: 1.95 + index * 0.1 });
	});

	// Verify all routes were called
	expect(spy).toHaveBeenCalledTimes(5);

	// Verify specific route patterns
	expect(spy).toHaveBeenCalledWith('/bookie1/BTC-USD', expect.any(Object));
	expect(spy).toHaveBeenCalledWith('/bookie2/ETH-USD', expect.any(Object));
	expect(spy).toHaveBeenCalledWith('/bookie1/BTC-EUR', expect.any(Object));

	jest.advanceTimersByTime(100);
});

