#!/usr/bin/env bun
/**
 * Tests for CRC32 hardware acceleration validator
 */

import { describe, expect, it } from "bun:test";
import {
	CRC32ChangeCache,
	contentFingerprint,
	generateCRC32,
	generateCRC32Sync,
} from "../lib/crc32-validator";

describe("CRC32 Generation", () => {
	it("should generate CRC32 for string", async () => {
		const result = await generateCRC32("Hello, World!");
		expect(result.hex).toMatch(/^[0-9a-f]{8}$/);
		expect(result.unsigned).toBeGreaterThanOrEqual(0);
		expect(result.unsigned).toBeLessThanOrEqual(0xffffffff);
	});

	it("should generate same CRC32 for same content", async () => {
		const content = "Test content for CRC32";
		const result1 = await generateCRC32(content);
		const result2 = await generateCRC32(content);
		expect(result1.hex).toBe(result2.hex);
		expect(result1.unsigned).toBe(result2.unsigned);
	});

	it("should generate different CRC32 for different content", async () => {
		const result1 = await generateCRC32("Content A");
		const result2 = await generateCRC32("Content B");
		expect(result1.hex).not.toBe(result2.hex);
	});

	it("should be fast (< 1ms for small content)", async () => {
		const result = await generateCRC32("Small test");
		expect(result.latencyMs).toBeLessThan(1);
	});
});

describe("CRC32 Sync", () => {
	it("should generate CRC32 synchronously", () => {
		const result = generateCRC32Sync("Sync test");
		expect(result.hex).toMatch(/^[0-9a-f]{8}$/);
		expect(result.latencyMs).toBeLessThan(1);
	});
});

describe("Content Fingerprint", () => {
	it("should generate consistent fingerprints", () => {
		const fp1 = contentFingerprint("Test");
		const fp2 = contentFingerprint("Test");
		expect(fp1).toBe(fp2);
		expect(fp1).toMatch(/^[0-9a-f]{8}$/);
	});

	it("should generate different fingerprints for different content", () => {
		const fp1 = contentFingerprint("A");
		const fp2 = contentFingerprint("B");
		expect(fp1).not.toBe(fp2);
	});
});

describe("CRC32 Change Cache", () => {
	it("should detect dirty files", async () => {
		const cache = new CRC32ChangeCache();

		// First check should be dirty (not in cache)
		const testFile = `/tmp/crc-test-${Date.now()}.txt`;
		await Bun.write(testFile, "Initial content");

		const isDirty1 = await cache.isDirty(testFile);
		expect(isDirty1).toBe(true); // First time is always dirty

		// Mark as clean
		cache.markClean(testFile, "Initial content");

		// Check again - should be clean
		const isDirty2 = await cache.isDirty(testFile);
		expect(isDirty2).toBe(false);

		// Modify file
		await Bun.write(testFile, "Modified content");

		// Should be dirty again
		const isDirty3 = await cache.isDirty(testFile);
		expect(isDirty3).toBe(true);

		// Cleanup
		await Bun.$`rm -f ${testFile}`;
	});

	it("should track cache stats", () => {
		const cache = new CRC32ChangeCache();
		cache.markClean("file1.txt", "content");
		cache.markClean("file2.txt", "content");

		const stats = cache.getStats();
		expect(stats.size).toBe(2);
		expect(stats.entries).toContain("file1.txt");
		expect(stats.entries).toContain("file2.txt");
	});
});
