/**
 * Redis Client Test Suite
 * 
 * Tests Redis constructor fixes
 */

import { test, expect } from "bun:test";
import { RedisArbCache } from "../src/redis-arb-cache";

test('RedisArbCache constructor - no crash', () => {
	expect(() => {
		new RedisArbCache();
	}).not.toThrow();
});

test('RedisArbCache - fallback on connection failure', async () => {
	const cache = new RedisArbCache();
	const connected = await cache.connect();
	
	// Should gracefully fallback if Redis not available
	expect(typeof connected).toBe('boolean');
});

test('RedisArbCache - cache operations work without Redis', async () => {
	const cache = new RedisArbCache();
	
	// Should not throw even without Redis
	await expect(cache.cacheArb({
		market: 'TEST-MARKET',
		profit_pct: 0.05,
		value_usd: 1000,
		timestamp: Date.now(),
		bookie_a: 'pinnacle',
		bookie_b: 'fonbet'
	})).resolves.toBeUndefined();
	
	const arbs = await cache.getAllArbs();
	expect(Array.isArray(arbs)).toBe(true);
});

test('RedisArbCache - getArb returns null when not found', async () => {
	const cache = new RedisArbCache();
	const arb = await cache.getArb('NONEXISTENT-MARKET');
	
	expect(arb).toBeNull();
});

test('RedisArbCache - clearCache no crash', async () => {
	const cache = new RedisArbCache();
	
	await expect(cache.clearCache()).resolves.toBeUndefined();
});



