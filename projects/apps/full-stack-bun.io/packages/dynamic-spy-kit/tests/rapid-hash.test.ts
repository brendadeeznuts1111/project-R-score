/**
 * @dynamic-spy/kit v9.0 - Rapid Hash Test
 * 
 * Tests Bun.hash.rapidhash() functionality
 */

import { test, expect } from "bun:test";
import { hash } from "bun";
import {
	rapidHash,
	rapidHashString,
	rapidHashNumber,
	RapidHashMap,
	RapidBloomFilter,
	rapidChecksum,
	checksumEqual,
} from "../src/utils/rapid-hash";

test("rapidHash returns BigInt", () => {
	const h = rapidHash("key");
	expect(typeof h).toBe("bigint");
	expect(h).toBeGreaterThan(0n);
});

test("rapidHash is deterministic", () => {
	const h1 = rapidHash("test-key");
	const h2 = rapidHash("test-key");
	expect(h1).toBe(h2);
});

test("rapidHash produces different values for different keys", () => {
	const h1 = rapidHash("key1");
	const h2 = rapidHash("key2");
	expect(h1).not.toBe(h2);
});

test("rapidHashString returns string", () => {
	const h = rapidHashString("key");
	expect(typeof h).toBe("string");
	expect(h.length).toBeGreaterThan(0);
});

test("rapidHashNumber returns number", () => {
	const h = rapidHashNumber("key");
	expect(typeof h).toBe("number");
	expect(h).toBeGreaterThan(0);
});

test("RapidHashMap basic operations", () => {
	const map = new RapidHashMap<string>();

	map.set("key1", "value1");
	map.set("key2", "value2");

	expect(map.get("key1")).toBe("value1");
	expect(map.get("key2")).toBe("value2");
	expect(map.has("key1")).toBe(true);
	expect(map.has("key3")).toBe(false);
	expect(map.size).toBe(2);

	map.delete("key1");
	expect(map.has("key1")).toBe(false);
	expect(map.size).toBe(1);
});

test("RapidHashMap with numeric keys", () => {
	const map = new RapidHashMap<number>();

	map.set(123, 456);
	map.set(789, 101112);

	expect(map.get(123)).toBe(456);
	expect(map.get(789)).toBe(101112);
});

test("RapidBloomFilter basic operations", () => {
	const bloom = new RapidBloomFilter(1000, 3);

	bloom.add("item1");
	bloom.add("item2");

	expect(bloom.mightContain("item1")).toBe(true);
	expect(bloom.mightContain("item2")).toBe(true);
	expect(bloom.mightContain("item3")).toBe(false); // Probably false
});

test("rapidChecksum for strings", () => {
	const data = "test-data";
	const checksum = rapidChecksum(data);
	expect(typeof checksum).toBe("bigint");
	expect(checksum).toBeGreaterThan(0n);
});

test("rapidChecksum is deterministic", () => {
	const data = "test-data";
	const c1 = rapidChecksum(data);
	const c2 = rapidChecksum(data);
	expect(c1).toBe(c2);
});

test("checksumEqual compares correctly", () => {
	const c1 = rapidHash("data1");
	const c2 = rapidHash("data1");
	const c3 = rapidHash("data2");

	expect(checksumEqual(c1, c2)).toBe(true);
	expect(checksumEqual(c1, c3)).toBe(false);
});

test("rapidHash performance - 10K iterations", () => {
	const iterations = 10_000;
	const start = performance.now();

	for (let i = 0; i < iterations; i++) {
		rapidHash(`key-${i}`);
	}

	const duration = performance.now() - start;
	const throughput = (iterations / duration) * 1000;

	expect(duration).toBeLessThan(100); // Should be very fast
	expect(throughput).toBeGreaterThan(50_000); // At least 50K hashes/sec
});



