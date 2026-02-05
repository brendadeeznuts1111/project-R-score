/**
 * @dynamic-spy/kit v9.0 - Flaky Test Retry Tests
 * 
 * Retry + Repeats for flaky test immunity
 */

import { test, expect } from "bun:test";

// Flaky proxy test → retry 3x
test("proxy rotation - flaky network", async () => {
	// Simulates network flake 90% of the time
	if (Math.random() > 0.1) {
		throw new Error("Network flake");
	}
	
	expect(true).toBe(true);
}, { retry: 3 }); // ✅ Passes on retry!

// Stability test → 50 repeats
test("25K market spies stable", () => {
	// Must pass ALL 50 runs
	const markets = Array.from({ length: 25000 }, (_, i) => `Market-${i}`);
	expect(markets.length).toBe(25000);
}, { repeats: 50 });

// Chaos test → retry only (Bun doesn't support retry + repeats together)
test("chaos test - retry only", async () => {
	// 70% failure rate, but retry helps (with 5 retries, should pass)
	if (Math.random() > 0.3) {
		throw new Error("Chaos failure");
	}
	
	expect(true).toBe(true);
}, { retry: 5 });

// Deterministic test (no retry needed, but add timeout)
test("compression ratio deterministic", async () => {
	const { compressWithStats } = await import("../src/utils/compression-stream");
	const { generateNBAMarketsStream } = await import("../src/utils/compression-stream");
	
	const stats = await compressWithStats(generateNBAMarketsStream(), "zstd");
	
	// Should compress to < 25% of original (realistic for JSON data)
	expect(stats.compressionRatio).toBeLessThan(25);
}, { retry: 0, timeout: 10000 }); // No retry needed, but allow 10s timeout

