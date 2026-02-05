/**
 * Complete URLPattern API Test Suite
 * 
 * Tests full URLPattern constructor support with spy integration
 */

import { test, expect } from "bun:test";
import { URLPatternSpyFactory } from "../src/index";

const arbRouter = {
	handleOdds: (url: string, data: any) => {
		return { success: true, url, data };
	},
	handleArb: (url: string, opp: any) => {
		return { success: true, url, opp };
	}
};

// 1. FULL CONSTRUCTOR - String + URLPatternInit
test('complete URLPattern API', () => {
	// String constructor
	const oddsSpy = URLPatternSpyFactory.create(
		arbRouter, 'handleOdds', '/bookies/:bookie/:market'
	);

	// URLPatternInit constructor
	const arbSpy = URLPatternSpyFactory.create(
		arbRouter, 'handleArb', {
			pathname: '/arb/:market/:spread',
			search: '?type=:type'
		}
	);

	// 2. TEST() - Boolean matching
	expect(oddsSpy.test('/bookies/bookie1/BTC-USD')).toBe(true);
	expect(oddsSpy.test('/bookies/bookie1/ETH-USD')).toBe(true);
	expect(oddsSpy.test('/users/123')).toBe(false);

	// 3. EXEC() - Extract groups
	const result = oddsSpy.exec('/bookies/bookie1/BTC-USD');
	expect(result).not.toBeNull();
	if (result) {
		expect(result.pathname.groups).toMatchObject({
			bookie: 'bookie1',
			market: 'BTC-USD'
		});
	}

	// 4. VERIFY() - Spy + Pattern
	// Call the method first
	arbRouter.handleOdds('/bookies/bookie1/BTC-USD', { odds: 1.95 });
	
	// Then verify
	const verifyResult = oddsSpy.verify('/bookies/bookie1/BTC-USD');
	expect(verifyResult).not.toBeNull();
	expect(verifyResult.pathname.groups.bookie).toBe('bookie1');
});

// 5. ALL PATTERN PROPERTIES
test('full pattern properties', () => {
	const proxySpy = URLPatternSpyFactory.create(arbRouter, 'handleOdds', {
		protocol: 'https',
		hostname: 'bookie1.com',
		port: '443',
		pathname: '/odds/:market',
		search: '?version=:v'
	});

	// Access EVERY property
	expect(proxySpy.protocol.value).toBe('https');
	expect(proxySpy.hostname.value).toBe('bookie1.com');
	expect(proxySpy.port.value).toBe('443');
	expect(proxySpy.pathname.value).toBe('/odds/:market');
	expect(proxySpy.search.value).toBe('?version=:v');

	// RegExp groups detection
	expect(proxySpy.hasRegExpGroups).toBe(false);

	// Custom RegExp
	const regexSpy = URLPatternSpyFactory.create(arbRouter, 'handleOdds', {
		pathname: '/odds/:market([A-Z]+-[A-Z]+)'
	});
	expect(regexSpy.hasRegExpGroups).toBe(true);
});

// 6. ROUTER FACTORY - Multiple patterns
test('multi-pattern router', () => {
	const router = URLPatternSpyFactory.createRouter(arbRouter, 'handleOdds', [
		'/bookies/:bookie/:market',
		'/files/odds/*',
		{ pathname: '/api/arb/:id', search: '?profit>0.01' }
	]);

	// Test all routes
	expect(router).toHaveLength(3);
	
	// Test first route
	expect(router[0].test('/bookies/bookie1/BTC-USD')).toBe(true);
	
	// Test second route (wildcard)
	expect(router[1].test('/files/odds/BTC-USD')).toBe(true);
	expect(router[1].test('/files/odds/ETH-USD/data.json')).toBe(true);
	
	// Test third route (with search params)
	expect(router[2].test('/api/arb/123?profit>0.01')).toBe(true);
});

test('URLPatternInit with all properties', () => {
	const fullSpy = URLPatternSpyFactory.create(arbRouter, 'handleOdds', {
		protocol: 'https',
		hostname: 'api.bookie.com',
		port: '443',
		username: 'user',
		password: 'pass',
		pathname: '/odds/:market',
		search: '?version=:v',
		hash: '#section'
	});

	expect(fullSpy.protocol.value).toBe('https');
	expect(fullSpy.hostname.value).toBe('api.bookie.com');
	expect(fullSpy.port.value).toBe('443');
	expect(fullSpy.username.value).toBe('user');
	expect(fullSpy.password.value).toBe('pass');
	expect(fullSpy.pathname.value).toBe('/odds/:market');
	expect(fullSpy.search.value).toBe('?version=:v');
	expect(fullSpy.hash.value).toBe('#section');

	// Test matching
	expect(fullSpy.test('https://user:pass@api.bookie.com:443/odds/BTC-USD?version=1#section')).toBe(true);
});

test('RegExp groups in pathname', () => {
	const regexSpy = URLPatternSpyFactory.create(arbRouter, 'handleOdds', {
		pathname: '/bookies/:bookie([a-z]+)/:market([A-Z]+-[A-Z]+)'
	});

	expect(regexSpy.hasRegExpGroups).toBe(true);
	
	const match = regexSpy.exec('/bookies/bookie1/BTC-USD');
	expect(match).not.toBeNull();
	if (match) {
		expect(match.pathname.groups.bookie).toBe('bookie1');
		expect(match.pathname.groups.market).toBe('BTC-USD');
	}
});

test('verify() throws when spy not called', () => {
	const spy = URLPatternSpyFactory.create(
		arbRouter, 'handleOdds', '/bookies/:bookie/:market'
	);

	// Don't call the method - verify should throw
	expect(() => {
		spy.verify('/bookies/bookie1/BTC-USD');
	}).toThrow();
});

test('verify() succeeds when spy was called', () => {
	const spy = URLPatternSpyFactory.create(
		arbRouter, 'handleOdds', '/bookies/:bookie/:market'
	);

	// Call the method first (this will be tracked by the spy)
	arbRouter.handleOdds('/bookies/bookie1/BTC-USD', { odds: 1.95 });

	// Verify should succeed
	const result = spy.verify('/bookies/bookie1/BTC-USD');
	expect(result).not.toBeNull();
	expect(result.pathname.groups.bookie).toBe('bookie1');
	expect(result.pathname.groups.market).toBe('BTC-USD');
});

test('spy property access', () => {
	const spy = URLPatternSpyFactory.create(
		arbRouter, 'handleOdds', '/bookies/:bookie/:market'
	);

	// Access spy directly
	expect(spy.spy).toBeDefined();
	
	// Call method
	arbRouter.handleOdds('/bookies/bookie1/BTC-USD', { odds: 1.95 });
	
	// Verify spy was called
	expect(spy.spy).toHaveBeenCalled();
	expect(spy.spy.mock.calls.length).toBeGreaterThan(0);
});
