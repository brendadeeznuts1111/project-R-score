/**
 * Regional Proxy Test Suite
 * 
 * Tests Asia→Europe→US proxy routing
 */

import { test, expect } from "bun:test";
import { PROXY_CONFIG } from "../src/sportsbook-proxies";

test('asia proxy configuration', () => {
	const sbobetProxy = PROXY_CONFIG.sbobet;
	expect(sbobetProxy).toBeDefined();
	expect(sbobetProxy.proxy.url).toContain('asia');
	expect(sbobetProxy.proxy.headers['X-Asia']).toBe('true');
});

test('europe proxy configuration', () => {
	const bet365Proxy = PROXY_CONFIG.bet365;
	expect(bet365Proxy).toBeDefined();
	expect(bet365Proxy.proxy.url).toContain('uk') || bet365Proxy.proxy.url.toContain('eu');
	expect(bet365Proxy.proxy.headers['X-UK']).toBe('true');
});

test('us proxy configuration', () => {
	const betmgmProxy = PROXY_CONFIG.betmgm;
	expect(betmgmProxy).toBeDefined();
	expect(betmgmProxy.proxy.url).toContain('us');
	expect(betmgmProxy.proxy.headers['X-US']).toBe('true');
});

test('russia proxy configuration', () => {
	const fonbetProxy = PROXY_CONFIG.fonbet;
	expect(fonbetProxy).toBeDefined();
	expect(fonbetProxy.proxy.url).toContain('ru');
	expect(fonbetProxy.proxy.headers['X-RU']).toBe('true');
});

test('global proxy configuration', () => {
	const betwayProxy = PROXY_CONFIG.betway;
	expect(betwayProxy).toBeDefined();
	expect(betwayProxy.proxy.headers['X-Global']).toBe('true');
});



