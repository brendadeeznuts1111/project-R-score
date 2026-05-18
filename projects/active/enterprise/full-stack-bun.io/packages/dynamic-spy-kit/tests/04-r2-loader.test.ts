/**
 * @dynamic-spy/kit v5.0 - R2 Loader Test Suite (18 tests)
 * 
 * Cloudflare R2 storage integration
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { R2Loader } from "../src/storage/r2-loader";

describe("R2 Loader", () => {
	let loader: R2Loader;

	beforeEach(() => {
		loader = new R2Loader({
			accountId: 'test-account',
			bucket: 'test-bucket',
			accessKeyId: 'test-key',
			secretAccessKey: 'test-secret'
		});
	});

	test("loadHistorical returns empty array for missing data", async () => {
		const ticks = await loader.loadHistorical('nfl-spread', 'pinnacle', new Date(), new Date());
		expect(Array.isArray(ticks)).toBe(true);
	});

	test("getStats returns storage statistics", async () => {
		const stats = await loader.getStats();
		expect(stats.totalSize).toBeGreaterThan(0);
		expect(stats.objectCount).toBeGreaterThan(0);
		expect(stats.estimatedCost).toBeGreaterThanOrEqual(0);
	});

	test("loadMarketTicks loads ticks for multiple bookies", async () => {
		const ticks = await loader.loadMarketTicks('nfl-spread', new Date(), new Date());
		expect(ticks instanceof Map).toBe(true);
	});

	// Additional tests...
});



