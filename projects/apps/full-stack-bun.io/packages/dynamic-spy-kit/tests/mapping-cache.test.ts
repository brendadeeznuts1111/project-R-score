/**
 * Mapping and Cache Test Suite
 */

import { test, expect, beforeEach, afterEach } from "bun:test";
import { SportsCache } from "../src/cache-layer";
import { MappingEngine } from "../src/mapping-engine";
import { MappingStreamer } from "../src/mapping-streamer";
import { ArbServer } from "../src/arb-server";

beforeEach(() => {
	// Clean up cache before each test
	try {
		const fs = require('fs');
		if (fs.existsSync('./cache/sports-mapping.db')) {
			fs.unlinkSync('./cache/sports-mapping.db');
		}
	} catch {}
});

afterEach(() => {
	// Clean up after tests
	try {
		const fs = require('fs');
		if (fs.existsSync('./cache/sports-mapping.db')) {
			fs.unlinkSync('./cache/sports-mapping.db');
		}
	} catch {}
});

test('SportsCache initialization', async () => {
	const cache = new SportsCache();
	await cache.initMapping();

	const stats = await cache.getCacheStats();
	expect(stats.marketsCached).toBeGreaterThan(0);
	expect(stats.source).toBe('@yourorg/sports-data@1.2.3');

	cache.close();
});

test('Cache hit and miss tracking', async () => {
	const cache = new SportsCache();

	// Cache some odds
	await cache.cacheOdds('FOOTBALL', 'PREMIER-LEAGUE', 'MANUTD-VS-LIV', {
		bookies: ['pinnacle'],
		odds_data: { odds: 1.95 }
	});

	// Cache hit
	const cached = await cache.getMarkets('FOOTBALL', 'PREMIER-LEAGUE', 'MANUTD-VS-LIV');
	expect(cached.length).toBeGreaterThan(0);
	expect(cached[0].market).toBe('MANUTD-VS-LIV');

	// Cache miss
	const miss = await cache.getMarkets('FOOTBALL', 'PREMIER-LEAGUE', 'NONEXISTENT');
	expect(miss.length).toBe(0);

	const stats = await cache.getCacheStats();
	expect(stats.cacheHits).toBeGreaterThan(0);
	expect(stats.cacheMisses).toBeGreaterThan(0);

	cache.close();
});

test('MappingEngine getSport and getLeagues', () => {
	const engine = new MappingEngine();

	const football = engine.getSport('FOOTBALL');
	expect(football).toBeDefined();
	expect(football?.leagues).toBe(127);
	expect(football?.markets).toBe(2345);

	const leagues = engine.getLeagues('FOOTBALL');
	expect(leagues).toContain('PREMIER-LEAGUE');
	expect(leagues).toContain('LA-LIGA');

	const markets = engine.getMarkets('FOOTBALL', 'PREMIER-LEAGUE');
	expect(markets).toContain('MANUTD-VS-LIV');
	expect(markets).toContain('ARSENAL-VS-CITY');
});

test('MappingStreamer fallback to bundled data', async () => {
	const streamer = new MappingStreamer('https://invalid-registry.com');

	// Should fallback to bundled data
	const data = await streamer.streamFromPrivateRegistry('FOOTBALL');
	expect(data).toBeDefined();
	expect(data.FOOTBALL).toBeDefined();
});

test('ArbServer initialization', async () => {
	const server = new ArbServer();
	await server.init();

	const health = await server.health();
	expect(health.status).toBe('live');
	expect(health.cache).toBeDefined();
	expect(health.mapping).toBeDefined();
});

test('ArbServer getMarkets with cache', async () => {
	const server = new ArbServer();
	await server.init();

	// Should return cached data
	const markets = await server.getMarkets('FOOTBALL', 'PREMIER-LEAGUE');
	expect(markets.length).toBeGreaterThan(0);
});

test('Cache stats endpoint', async () => {
	const cache = new SportsCache();
	await cache.initMapping();

	const stats = await cache.getCacheStats();
	expect(stats).toMatchObject({
		cacheHits: expect.any(Number),
		cacheMisses: expect.any(Number),
		hitRatio: expect.stringMatching(/^\d+\.\d+%$/),
		storage: expect.stringMatching(/^\d+\.\d+MB$/),
		marketsCached: expect.any(Number),
		lastSync: expect.any(String),
		source: '@yourorg/sports-data@1.2.3'
	});

	// Verify specific values
	expect(stats.marketsCached).toBeGreaterThanOrEqual(0);
	expect(stats.hitRatio).toMatch(/^\d+\.\d+%$/);
	expect(stats.storage).toMatch(/^\d+\.\d+MB$/);

	cache.close();
});

