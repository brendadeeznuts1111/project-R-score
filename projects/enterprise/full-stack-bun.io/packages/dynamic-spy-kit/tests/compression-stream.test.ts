/**
 * @dynamic-spy/kit v9.0 - CompressionStream Tests
 * 
 * 25K markets compression - zstd vs gzip
 */

import { test, expect } from "bun:test";
import {
	generateNBAMarketsStream,
	compressStream,
	decompressStream,
	streamToBuffer,
	compressWithStats,
	benchmarkCompression,
	type CompressionFormat
} from "../src/utils/compression-stream";

test("25K markets compression - zstd vs gzip", async () => {
	const marketsStream = generateNBAMarketsStream();
	const rawBuffer = await streamToBuffer(marketsStream);
	const rawSize = rawBuffer.length;
	
	// zstd compression
	const zstdStream = generateNBAMarketsStream().pipeThrough(new CompressionStream("zstd"));
	const zstdBuffer = await streamToBuffer(zstdStream);
	const zstdSize = zstdBuffer.length;
	const zstdRatio = (zstdSize / rawSize) * 100;
	
	// gzip compression
	const gzipStream = generateNBAMarketsStream().pipeThrough(new CompressionStream("gzip"));
	const gzipBuffer = await streamToBuffer(gzipStream);
	const gzipSize = gzipBuffer.length;
	const gzipRatio = (gzipSize / rawSize) * 100;
	
	console.log(`
📊 25K NBA markets:
Raw:     ${(rawSize / 1024 / 1024).toFixed(2)}MB
zstd:    ${zstdRatio.toFixed(1)}% (${(zstdSize / 1024 / 1024).toFixed(2)}MB) ⚡
gzip:    ${gzipRatio.toFixed(1)}% (${(gzipSize / 1024 / 1024).toFixed(2)}MB)
	`);
	
	// Both should compress significantly (zstd usually better, but not always)
	expect(zstdRatio).toBeLessThan(25); // zstd < 25%
	expect(gzipRatio).toBeLessThan(25); // gzip < 25%
	
	// At least one should compress well
	expect(Math.min(zstdRatio, gzipRatio)).toBeLessThan(25);
});

test("Compress and decompress round-trip", async () => {
	// Get original data
	const originalStream1 = generateNBAMarketsStream();
	const originalBuffer = await streamToBuffer(originalStream1);
	const originalText = new TextDecoder().decode(originalBuffer);
	
	// Create new stream for compression (stream is locked after reading)
	const compressStream = generateNBAMarketsStream();
	const compressed = compressStream.pipeThrough(new CompressionStream("zstd"));
	
	// Decompress
	const decompressed = compressed.pipeThrough(new DecompressionStream("zstd"));
	const decompressedBuffer = await streamToBuffer(decompressed);
	const decompressedText = new TextDecoder().decode(decompressedBuffer);
	
	// Should match original (compare structure, not exact values due to random odds)
	const originalLines = originalText.trim().split('\n');
	const decompressedLines = decompressedText.trim().split('\n');
	
	expect(decompressedLines.length).toBe(originalLines.length);
	
	// Check structure matches (market names should be same)
	const originalMarkets = originalLines.map(l => {
		try {
			return JSON.parse(l).market;
		} catch {
			return null;
		}
	}).filter(Boolean);
	
	const decompressedMarkets = decompressedLines.map(l => {
		try {
			return JSON.parse(l).market;
		} catch {
			return null;
		}
	}).filter(Boolean);
	
	expect(decompressedMarkets.length).toBe(originalMarkets.length);
	expect(decompressedMarkets[0]).toBe(originalMarkets[0]);
});

test("Compression stats calculation", async () => {
	const stats = await compressWithStats(generateNBAMarketsStream(), "zstd");
	
	expect(stats.format).toBe("zstd");
	expect(stats.originalSize).toBeGreaterThan(0);
	expect(stats.compressedSize).toBeGreaterThan(0);
	expect(stats.compressionRatio).toBeLessThan(100);
	expect(stats.savingsMB).toBeGreaterThan(0);
});

test("Benchmark all compression formats", async () => {
	const results = await benchmarkCompression();
	
	expect(results.length).toBeGreaterThanOrEqual(2); // At least zstd and gzip
	expect(results.some(r => r.format === "zstd")).toBe(true);
	expect(results.some(r => r.format === "gzip")).toBe(true);
	
	// Log results
	console.log("\n📊 Compression Benchmark:");
	results.forEach(r => {
		console.log(`  ${r.format}: ${r.compressionRatio.toFixed(1)}% (${(r.compressedSize / 1024 / 1024).toFixed(2)}MB)`);
	});
	
	// All should compress significantly
	results.forEach(r => {
		expect(r.compressionRatio).toBeLessThan(50); // All < 50%
	});
});

test("25K markets stream generation", async () => {
	const stream = generateNBAMarketsStream();
	const buffer = await streamToBuffer(stream);
	const text = new TextDecoder().decode(buffer);
	const lines = text.trim().split('\n');
	
	expect(lines.length).toBe(25000);
	expect(lines[0]).toContain('Lakers-Celtics');
	// Check that NCAA games exist (should start after NBA games)
	const hasNCAA = lines.some(line => line.includes('NCAA-Game-'));
	expect(hasNCAA).toBe(true);
});

