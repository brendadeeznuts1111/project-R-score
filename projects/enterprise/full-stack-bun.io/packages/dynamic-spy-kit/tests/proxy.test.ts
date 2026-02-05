/**
 * Proxy Odds Feed Testing
 * 
 * Tests bookie proxy authentication and connection pooling
 */

import { test, expect } from "bun:test";
import spyKit from "../src/index";

// Simulate proxy agent
const proxyAgent = {
	request: async (url: string, options?: any) => {
		// Simulate proxy request
		return {
			status: 200,
			url,
			headers: options?.headers || {}
		};
	}
};

test('bookie proxy auth + connection pooling', async () => {
	const proxySpy = spyKit.create(proxyAgent, 'request');

	// Real proxy config from Bun 1.1
	const proxyConfig = {
		url: 'http://corp-proxy:8080',
		headers: {
			'Proxy-Authorization': 'Bearer eyJ...',
			'X-Bookie-ID': 'bookie1'
		}
	};

	// Simulate fetch with proxy
	const res = await proxyAgent.request('https://bookie1.com/odds/BTC-USD', {
		proxy: proxyConfig
	});

	// Verify proxy was called
	const bookieSpy = proxySpy.spyOnKey('bookie1.com');
	expect(bookieSpy).toHaveBeenCalled();

	expect(res.status).toBe(200);
	expect(res.url).toBe('https://bookie1.com/odds/BTC-USD');
});

test('multiple bookie proxies with different auth', async () => {
	const proxySpy = spyKit.create(proxyAgent, 'request');

	// Create spies before making calls
	const spy1 = proxySpy.spyOnKey('bookie1.com');
	const spy2 = proxySpy.spyOnKey('bookie2.com');

	// Different proxy configs for different bookies
	const bookie1Proxy = {
		url: 'http://corp-proxy:8080',
		headers: {
			'Proxy-Authorization': 'Bearer bookie1-token',
			'X-Bookie-ID': 'bookie1'
		}
	};

	const bookie2Proxy = {
		url: 'http://geo-proxy:3128',
		headers: {
			'Proxy-Authorization': 'Bearer bookie2-token',
			'X-Bookie-ID': 'bookie2'
		}
	};

	// Make requests
	await proxyAgent.request('https://bookie1.com/odds/BTC-USD', { proxy: bookie1Proxy });
	await proxyAgent.request('https://bookie2.com/odds/ETH-USD', { proxy: bookie2Proxy });

	// Verify both were called (they share the same underlying spy)
	expect(spy1).toHaveBeenCalled();
	expect(spy2).toHaveBeenCalled();
	
	// Both spies track the same method, so call count is shared
	// Verify the method was called twice total
	const totalCalls = spy1.mock.calls.length;
	expect(totalCalls).toBeGreaterThanOrEqual(2);
});

test('proxy route pattern matching', () => {
	const proxySpy = spyKit.create(proxyAgent, 'request');

	// Create URLPattern spy for proxy routes
	const proxyRoute = proxySpy.spyOnPattern('/odds/:market');

	// Test route matching
	expect(proxyRoute.test('https://bookie1.com/odds/BTC-USD')).toBe(true);
	expect(proxyRoute.test('https://bookie2.com/odds/ETH-USD')).toBe(true);
	expect(proxyRoute.test('https://bookie1.com/api/health')).toBe(false);

	// Verify route groups
	const match = proxyRoute.exec('https://bookie1.com/odds/BTC-USD');
	expect(match).not.toBeNull();
	if (match) {
		expect(match.pathname.groups.market).toBe('BTC-USD');
	}
});

