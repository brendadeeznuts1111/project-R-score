/**
 * @dynamic-spy/kit v9.0 - URLPattern All Properties Test
 * 
 * Tests ALL 8 URLPattern properties extraction
 */

import { test, expect } from "bun:test";
import { URLPatternSpyFactory } from "../src/core/urlpattern-spy";

test("Extract ALL 8 URLPattern properties", () => {
	const api = {
		fetchSecureOdds: () => {}
	};

	// Create spy with ALL 8 properties
	const completeSpy = URLPatternSpyFactory.create(api, 'fetchSecureOdds', {
		protocol: 'https:',
		username: 'vip',
		password: 'secret123',
		hostname: 'secure.pinnacle.com',
		port: '8443',
		pathname: '/secure/vip/odds/:market',
		search: '?token=:token&expires=:expires',
		hash: '#authenticated'
	});

	const testUrl = 'https://vip:secret123@secure.pinnacle.com:8443/secure/vip/odds/BTC-USD?token=abc123&expires=3600#authenticated';

	// Test pattern matching
	expect(completeSpy.test(testUrl)).toBe(true);

	// Extract ALL properties
	const result = completeSpy.exec(testUrl);
	expect(result).not.toBeNull();

	if (result) {
		// Verify ALL 8 properties
		expect(result.protocol.value).toBe('https:');
		expect(result.username.value).toBe('vip');
		expect(result.password.value).toBe('secret123');
		expect(result.hostname.value).toBe('secure.pinnacle.com');
		expect(result.port.value).toBe('8443');
		expect(result.pathname.value).toBe('/secure/vip/odds/BTC-USD');
		expect(result.search.value).toBe('?token=abc123&expires=3600');
		expect(result.hash.value).toBe('#authenticated');

		// Verify named groups
		expect(result.pathname.groups.market).toBe('BTC-USD');
		expect(result.search.groups.token).toBe('abc123');
		expect(result.search.groups.expires).toBe('3600');
	}
});

test("Pattern properties access", () => {
	const api = { fetchOdds: () => {} };
	const spy = URLPatternSpyFactory.create(api, 'fetchOdds', {
		protocol: 'https:',
		hostname: 'bookie.com',
		pathname: '/odds/:market'
	});

	// Access pattern properties directly
	expect(spy.protocol.value).toBe('https:');
	expect(spy.hostname.value).toBe('bookie.com');
	expect(spy.pathname.value).toBe('/odds/:market');
	expect(spy.username.value).toBe(''); // Not specified
	expect(spy.password.value).toBe(''); // Not specified
	expect(spy.port.value).toBe(''); // Not specified
	expect(spy.search.value).toBe(''); // Not specified
	expect(spy.hash.value).toBe(''); // Not specified
});

test("Partial pattern (pathname only)", () => {
	const api = { fetchOdds: () => {} };
	const spy = URLPatternSpyFactory.create(api, 'fetchOdds', {
		pathname: '/odds/:market'
	});

	const result = spy.exec('https://bookie.com/odds/BTC-USD');
	expect(result).not.toBeNull();
	
	if (result) {
		expect(result.pathname.value).toBe('/odds/BTC-USD');
		expect(result.pathname.groups.market).toBe('BTC-USD');
		expect(result.hostname.value).toBe('bookie.com'); // From URL
	}
});

test("Wildcard hostname pattern", () => {
	const api = { fetchOdds: () => {} };
	const spy = URLPatternSpyFactory.create(api, 'fetchOdds', {
		hostname: '*.pinnacle.com',
		pathname: '/odds/:market'
	});

	expect(spy.test('https://secure.pinnacle.com/odds/BTC-USD')).toBe(true);
	expect(spy.test('https://api.pinnacle.com/odds/BTC-USD')).toBe(true);
	expect(spy.test('https://other.com/odds/BTC-USD')).toBe(false);
});

test("Search parameters with groups", () => {
	const api = { fetchOdds: () => {} };
	const spy = URLPatternSpyFactory.create(api, 'fetchOdds', {
		pathname: '/odds/:market',
		search: '?token=:token&expires=:expires'
	});

	const result = spy.exec('https://bookie.com/odds/BTC-USD?token=abc123&expires=3600');
	expect(result).not.toBeNull();
	
	if (result) {
		expect(result.search.groups.token).toBe('abc123');
		expect(result.search.groups.expires).toBe('3600');
	}
});

test("Hash fragment pattern", () => {
	const api = { fetchOdds: () => {} };
	const spy = URLPatternSpyFactory.create(api, 'fetchOdds', {
		pathname: '/odds/:market',
		hash: '#authenticated'
	});

	const result = spy.exec('https://bookie.com/odds/BTC-USD#authenticated');
	expect(result).not.toBeNull();
	
	if (result) {
		expect(result.hash.value).toBe('#authenticated');
	}
});



