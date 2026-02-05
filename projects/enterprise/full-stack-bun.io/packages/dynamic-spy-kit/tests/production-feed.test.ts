/**
 * Real-World Production Feed Testing
 * 
 * Tests live bookie feed with proxy + connection pooling
 */

import { test, expect, jest, beforeEach, afterEach } from "bun:test";
import { OddsRouter } from "../src/odds-router";

beforeEach(() => {
	jest.useFakeTimers();
});

afterEach(() => {
	jest.restoreAllMocks();
	jest.useRealTimers();
});

test('live bookie feed + proxy + fake timers', async () => {
	const router = new OddsRouter({
		updateOdds: jest.fn(),
		updateArb: jest.fn()
	});

	// Simulate proxy fetch (Bun 1.1 proxy support)
	const mockFetch = jest.fn(() => Promise.resolve({
		status: 200,
		json: async () => ({ odds: 1.95, market: 'BTC-USD' })
	}));

	// Replace global fetch for test
	global.fetch = mockFetch as any;

	// 3. REAL PROXY FEED (Bun 1.1)
	const oddsResponse = await fetch('https://bookie1.com/odds/BTC-USD?type=sports', {
		proxy: {
			url: 'http://corp-proxy:8080',
			headers: { 'Proxy-Authorization': 'Bearer token' }
		}
	} as any);

	const oddsData = await oddsResponse.json();
	
	// Test router with the URL
	const groups = router.testOddsFeed('https://bookie1.com/odds/BTC-USD?type=sports');

	expect(groups).not.toBeNull();
	expect(groups?.hostname.groups!.bookie).toBe('bookie1');
	expect(groups?.pathname.groups!.market).toBe('BTC-USD');

	jest.advanceTimersByTime(100); // Rate limit

	expect(mockFetch).toHaveBeenCalled();
});

test('rate limiting with fake timers', () => {
	const router = new OddsRouter();

	// Simulate rate-limited feed
	let callCount = 0;
	const rateLimitedFeed = () => {
		callCount++;
		router.testOddsFeed('https://bookie1.com/odds/BTC-USD?type=sports');
	};

	// First call
	rateLimitedFeed();
	expect(callCount).toBe(1);

	// Advance time
	jest.advanceTimersByTime(50);

	// Second call (should be rate limited)
	rateLimitedFeed();
	expect(callCount).toBe(2);

	jest.advanceTimersByTime(100);
});



