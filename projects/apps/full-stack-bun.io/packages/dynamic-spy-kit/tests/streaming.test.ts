/**
 * Streaming Engine Test Suite
 */

import { test, expect, beforeEach, afterEach } from "bun:test";
import { LiveStreamingEngine } from "../src/streaming-engine";
import { BunStreamer } from "../src/bun-streamer";
import { AdvancedCache } from "../src/advanced-cache";

beforeEach(() => {
	// Clean up cache
	try {
		const fs = require('fs');
		if (fs.existsSync('./cache/arb.db')) {
			fs.unlinkSync('./cache/arb.db');
		}
	} catch {}
});

afterEach(() => {
	// Clean up
	try {
		const cache = new AdvancedCache();
		cache.close();
		const fs = require('fs');
		if (fs.existsSync('./cache/arb.db')) {
			fs.unlinkSync('./cache/arb.db');
		}
	} catch {}
});

test('LiveStreamingEngine initialization', () => {
	const engine = new LiveStreamingEngine();

	expect(engine).toBeDefined();
	const stats = engine.getStats();
	expect(stats).toMatchObject({
		connected: expect.any(Boolean),
		liveUpdates: expect.any(Number),
		marketsPerSec: expect.any(Number)
	});
});

test('BunStreamer processes markets', async () => {
	const cache = new AdvancedCache();
	const streamer = new BunStreamer(cache);

	// Mock market data
	const mockMarket = {
		sport: 'FOOTBALL',
		league: 'PREMIER-LEAGUE',
		market: 'MANUTD-VS-LIV',
		odds: {
			bookies: ['pinnacle'],
			odds_data: { odds: 1.95 }
		}
	};

	// Process market
	await (streamer as any).processMarket(mockMarket);

	// Verify cached
	const cached = await cache.getOdds('FOOTBALL', 'PREMIER-LEAGUE', 'MANUTD-VS-LIV');
	expect(cached).not.toBeNull();
	expect(cached?.market).toBe('MANUTD-VS-LIV');

	cache.close();
});

test('AdvancedCache heatmap', async () => {
	const cache = new AdvancedCache();

	// Cache markets with heat levels
	await cache.cacheOdds('FOOTBALL', 'PREMIER-LEAGUE', 'MANUTD-VS-LIV', {}, 0.042, 9);
	await cache.cacheOdds('BASKETBALL', 'NBA', 'LAKERS-VS-WARRIORS', {}, 0.058, 8);
	await cache.cacheOdds('BASEBALL', 'MLB', 'YANKEES-VS-RED-SOX', {}, 0.035, 7);

	const heatmap = await cache.getHeatmap(10);
	expect(heatmap.length).toBeGreaterThan(0);
	expect(heatmap[0].heat_level).toBeGreaterThanOrEqual(heatmap[heatmap.length - 1]?.heat_level || 0);

	cache.close();
});

test('AdvancedCache metrics', async () => {
	const cache = new AdvancedCache();

	// Cache some markets
	await cache.cacheOdds('FOOTBALL', 'PREMIER-LEAGUE', 'MANUTD-VS-LIV', {}, 0.042, 9);

	// Get metrics
	const metrics = await cache.getMetrics();
	expect(metrics).toMatchObject({
		hits: expect.any(Number),
		misses: expect.any(Number),
		ratio: expect.stringMatching(/^\d+\.\d+%$/),
		size: expect.stringMatching(/^\d+\.\d+MB$/)
	});

	cache.close();
});

test('AdvancedCache cleanup', async () => {
	const cache = new AdvancedCache();

	// Cache a market
	await cache.cacheOdds('FOOTBALL', 'PREMIER-LEAGUE', 'MANUTD-VS-LIV', {}, 0.042, 9);

	// Cleanup (should not remove recent markets)
	await cache.cleanupOldMarkets();

	// Market should still exist
	const cached = await cache.getOdds('FOOTBALL', 'PREMIER-LEAGUE', 'MANUTD-VS-LIV');
	expect(cached).not.toBeNull();

	cache.close();
});



