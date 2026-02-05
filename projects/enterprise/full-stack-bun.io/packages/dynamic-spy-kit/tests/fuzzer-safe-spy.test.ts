/**
 * Fuzzer-Safe Spy Factory Test Suite
 * 
 * Tests fuzzer-hardened array and bulk market spying
 */

import { test, expect, beforeEach, afterEach } from "bun:test";
import { FuzzerSafeSpyFactory } from "../src/fuzzer-safe-spy";

beforeEach(() => {
	// Clean up any existing spies
});

afterEach(() => {
	// Restore all mocks
});

test('createArraySpies - safe indexed spying', () => {
	const arr = ['market1', 'market2', 'market3'];
	const spies = FuzzerSafeSpyFactory.createArraySpies(arr);

	expect(spies.length).toBe(3);
	expect(spies[0]).toBeDefined();
	expect(spies[1]).toBeDefined();
	expect(spies[2]).toBeDefined();

	// Verify spies have mock structure
	expect(spies[0].mock).toBeDefined();
	expect(spies[1].mock).toBeDefined();
	expect(spies[2].mock).toBeDefined();
	expect(Array.isArray(spies[0].mock.calls)).toBe(true);
});

test('bulkMarketSpies - index + string keys', () => {
	const markets = ['BTC-USD', 'ETH-USD', 'SOL-USD'];
	const marketSpies = FuzzerSafeSpyFactory.bulkMarketSpies(markets);

	// Should have both market names and indices as keys
	expect(Object.keys(marketSpies).length).toBe(6); // 3 markets × 2 keys each

	// Market name keys
	expect(marketSpies['BTC-USD']).toBeDefined();
	expect(marketSpies['ETH-USD']).toBeDefined();
	expect(marketSpies['SOL-USD']).toBeDefined();

	// Index keys
	expect(marketSpies['0']).toBeDefined();
	expect(marketSpies['1']).toBeDefined();
	expect(marketSpies['2']).toBeDefined();

	// Verify spies are created (both keys point to same spy)
	expect(marketSpies['BTC-USD']).toBe(marketSpies['0']);
	expect(marketSpies['ETH-USD']).toBe(marketSpies['1']);
	expect(marketSpies['SOL-USD']).toBe(marketSpies['2']);
});

test('bulkMarketSpies - 12K markets', () => {
	// Generate 12K markets
	const allMarkets = Array.from({ length: 12000 }, (_, i) => `MARKET-${i}`);
	const marketSpies = FuzzerSafeSpyFactory.bulkMarketSpies(allMarkets);

	// Should have index + string keys (24K total)
	expect(Object.keys(marketSpies).length).toBe(24000);

	// Verify first and last markets
	expect(marketSpies['MARKET-0']).toBeDefined();
	expect(marketSpies['MARKET-11999']).toBeDefined();
	expect(marketSpies['0']).toBeDefined();
	expect(marketSpies['11999']).toBeDefined();
});

test('createDynamicKeySpies - object with dynamic keys', () => {
	const obj = {
		'key1': 'value1',
		'key2': 'value2',
		'dynamic-key-123': 'value3'
	};

	const keys: (keyof typeof obj)[] = ['key1', 'key2', 'dynamic-key-123'];
	const spies = FuzzerSafeSpyFactory.createDynamicKeySpies(obj, keys);

	expect(Object.keys(spies).length).toBe(3);
	expect(spies['key1']).toBeDefined();
	expect(spies['key2']).toBeDefined();
	expect(spies['dynamic-key-123']).toBeDefined();
});

test('createNestedPathSpies - nested object paths', () => {
	const obj = {
		a: {
			b: {
				c: 'value1'
			}
		},
		x: {
			y: 'value2'
		}
	};

	const paths = ['a.b.c', 'x.y'];
	const spies = FuzzerSafeSpyFactory.createNestedPathSpies(obj, paths);

	expect(Object.keys(spies).length).toBe(2);
	expect(spies['a.b.c']).toBeDefined();
	expect(spies['x.y']).toBeDefined();
});

test('createArrayPropertySpies - array of objects', () => {
	const arr = [
		{ id: 1, name: 'Item1' },
		{ id: 2, name: 'Item2' },
		{ id: 3, name: 'Item3' }
	];

	const spies = FuzzerSafeSpyFactory.createArrayPropertySpies(arr, 'name');

	expect(spies.length).toBe(3);
	expect(spies[0]).toBeDefined();
	expect(spies[1]).toBeDefined();
	expect(spies[2]).toBeDefined();

	// Verify spies have mock structure
	expect(spies[0].mock).toBeDefined();
	expect(spies[1].mock).toBeDefined();
	expect(spies[2].mock).toBeDefined();
	expect(Array.isArray(spies[0].mock.calls)).toBe(true);
});

test('resetAllSpies - reset all spies in record', () => {
	const markets = ['BTC-USD', 'ETH-USD'];
	const marketSpies = FuzzerSafeSpyFactory.bulkMarketSpies(markets);

	// Verify spies exist
	expect(marketSpies['BTC-USD']).toBeDefined();
	expect(marketSpies['ETH-USD']).toBeDefined();

	// Reset all (should not throw)
	expect(() => {
		FuzzerSafeSpyFactory.resetAllSpies(marketSpies);
	}).not.toThrow();

	// Verify mock structure exists
	expect(marketSpies['BTC-USD'].mock).toBeDefined();
	expect(Array.isArray(marketSpies['BTC-USD'].mock.calls)).toBe(true);
});

test('restoreAllSpies - restore all spies in record', () => {
	const markets = ['BTC-USD', 'ETH-USD'];
	const marketSpies = FuzzerSafeSpyFactory.bulkMarketSpies(markets);

	// Restore should not throw
	expect(() => {
		FuzzerSafeSpyFactory.restoreAllSpies(marketSpies);
	}).not.toThrow();
});

test('fuzzer-safe - invalid keys handled gracefully', () => {
	const obj: Record<string, any> = { valid: 'value' };
	const keys = ['valid', 'invalid-key', 'another-invalid'] as any[];

	// Should not throw, even with invalid keys
	expect(() => {
		const spies = FuzzerSafeSpyFactory.createDynamicKeySpies(obj, keys);
		expect(spies['valid']).toBeDefined();
	}).not.toThrow();
});

test('fuzzer-safe - empty array handled', () => {
	const emptyArr: string[] = [];
	const spies = FuzzerSafeSpyFactory.createArraySpies(emptyArr);

	expect(spies.length).toBe(0);
	expect(Array.isArray(spies)).toBe(true);
});

test('fuzzer-safe - null/undefined paths handled', () => {
	const obj: any = { a: null };
	const paths = ['a.b.c', 'x.y.z'];

	// Should not throw on null paths
	expect(() => {
		const spies = FuzzerSafeSpyFactory.createNestedPathSpies(obj, paths);
		// Some paths may not create spies due to null values
		expect(spies).toBeDefined();
	}).not.toThrow();
});

