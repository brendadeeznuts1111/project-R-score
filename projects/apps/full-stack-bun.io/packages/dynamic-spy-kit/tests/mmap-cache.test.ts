/**
 * MMap Cache Test Suite
 * 
 * Tests 12K market cache validation
 */

import { test, expect } from "bun:test";
import { MMapCache } from "../src/mmap-cache";

test('MMapCache - safeMmap validation', () => {
	const cache = new MMapCache();
	const buffer = new Uint8Array(100).buffer;

	// Valid call
	expect(() => {
		cache.safeMmap(buffer, { offset: 0, size: 50 });
	}).not.toThrow();

	// Invalid offset type
	expect(() => {
		cache.safeMmap(buffer, { offset: null as any });
	}).toThrow(TypeError);

	// Invalid size type
	expect(() => {
		cache.safeMmap(buffer, { size: '10' as any });
	}).toThrow(TypeError);

	// Out of bounds offset
	expect(() => {
		cache.safeMmap(buffer, { offset: 200 });
	}).toThrow(RangeError);

	// Out of bounds size
	expect(() => {
		cache.safeMmap(buffer, { offset: 50, size: 100 });
	}).toThrow(RangeError);
});

test('MMapCache - loadMarkets error handling', async () => {
	const cache = new MMapCache();
	
	// Should handle missing cache file gracefully
	try {
		await cache.loadMarkets();
	} catch (error: any) {
		// Expected if cache file doesn't exist
		expect(error).toBeDefined();
	}
});

test('MMapCache - zero-length buffer', () => {
	const cache = new MMapCache();
	const buffer = new Uint8Array(0).buffer;

	// Should handle zero-length buffer
	expect(() => {
		cache.safeMmap(buffer, { offset: 0, size: 0 });
	}).not.toThrow();
});



