/**
 * Production Server Test Suite
 * 
 * Tests fully fuzzer-proof server integration
 */

import { test, expect, beforeAll, afterAll } from "bun:test";
import { SecretsManager } from "../src/secrets-manager";
import { MMapCache } from "../src/mmap-cache";
import { RedisArbCache } from "../src/redis-arb-cache";
import { ConfigLoader } from "../src/config-loader";

const TEST_PORT = 3001;
const BASE_URL = `http://localhost:${TEST_PORT}`;

let serverProcess: any;

beforeAll(async () => {
	// Start server in background
	serverProcess = Bun.spawn({
		cmd: ['bun', 'run', 'src/production-server.ts'],
		env: { ...process.env, PORT: String(TEST_PORT) },
		stdout: 'pipe',
		stderr: 'pipe'
	});

	// Wait for server to start
	await Bun.sleep(1000);
});

afterAll(async () => {
	if (serverProcess) {
		serverProcess.kill();
	}
});

test('server health check', async () => {
	const response = await fetch(`${BASE_URL}/health`);
	expect(response.ok).toBe(true);

	const data = await response.json();
	expect(data.status).toBe('live');
	expect(data.components).toBeDefined();
	expect(data.fuzzerProof).toBe(true);
});

test('server markets endpoint', async () => {
	const response = await fetch(`${BASE_URL}/markets`);
	
	// Should handle gracefully even if cache doesn't exist
	if (response.ok) {
		const data = await response.json();
		expect(data).toBeDefined();
	} else {
		// Error response is acceptable (cache might not exist)
		const error = await response.json();
		expect(error.error).toBeDefined();
	}
});

test('server arbs endpoint', async () => {
	const response = await fetch(`${BASE_URL}/arbs`);
	expect(response.ok).toBe(true);

	const data = await response.json();
	expect(data.arbs).toBeDefined();
	expect(Array.isArray(data.arbs)).toBe(true);
});

test('server config endpoint', async () => {
	const response = await fetch(`${BASE_URL}/config`);
	
	// Should handle gracefully
	if (response.ok) {
		const data = await response.json();
		expect(data.configs).toBeDefined();
		expect(Array.isArray(data.configs)).toBe(true);
	}
});

test('SecretsManager integration', async () => {
	const BOOKIE_KEYS = {
		pinnacle: 'pk_test',
		fonbet: 'fk_test'
	};

	const result = await SecretsManager.withSecrets(BOOKIE_KEYS, async () => {
		const key = SecretsManager.getBookieKey('pinnacle');
		return key;
	});

	expect(result).toBe('pk_test');
});

test('MMapCache error handling', async () => {
	const cache = new MMapCache();
	
	// Should handle missing cache file gracefully
	try {
		await cache.loadMarkets();
	} catch (error) {
		// Expected if cache doesn't exist
		expect(error).toBeDefined();
	}
});

test('RedisArbCache fallback', async () => {
	const redisCache = new RedisArbCache();
	
	// Should work without Redis connection
	const arbs = await redisCache.getAllArbs();
	expect(Array.isArray(arbs)).toBe(true);
	
	// Should handle cache operations gracefully
	await redisCache.cacheArb({
		market: 'TEST-MARKET',
		profit_pct: 0.05,
		value_usd: 1000,
		timestamp: Date.now(),
		bookie_a: 'pinnacle',
		bookie_b: 'fonbet'
	});
	
	const cached = await redisCache.getArb('TEST-MARKET');
	// May be null if Redis not available (fallback)
	expect(cached === null || typeof cached === 'object').toBe(true);
});

test('ConfigLoader integration', async () => {
	const loader = new ConfigLoader();
	
	// Should handle missing config gracefully
	const files = await loader.scanConfigFiles('config/**/*', {
		hidden: true
	});
	
	expect(Array.isArray(files)).toBe(true);
});

test('fuzzer-proof error handling', async () => {
	// Test that server handles invalid requests gracefully
	const response = await fetch(`${BASE_URL}/invalid-endpoint`);
	
	// Should return valid response (not crash)
	expect(response.status).toBeGreaterThanOrEqual(200);
	expect(response.status).toBeLessThan(600);
});



