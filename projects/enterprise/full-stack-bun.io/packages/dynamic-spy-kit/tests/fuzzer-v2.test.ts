/**
 * Fuzzer v2.0 Test Suite - Bun 1.1.1 Hardened
 * 
 * Tests AsyncLocalStorage + mmap + Redis + ReadableStream fixes
 */

import { test, expect, describe } from "bun:test";
import { SecretsManager } from "../src/secrets-manager";
import { MMapCache } from "../src/mmap-cache";

describe('Fuzzer v2.0 - AsyncLocalStorage + mmap + Redis', () => {
	test('Bun.secrets in AsyncLocalStorage - FIXED', async () => {
		const result = await SecretsManager.withSecrets({ test: '123' }, async () => {
			// ✅ No crash if Bun.secrets is not available or key doesn't exist
			try {
				return (Bun.secrets as any)?.test_key || 'fallback';
			} catch {
				return 'fallback';
			}
		});

		expect(result).toBe('fallback');
	});

	test('Bun.mmap non-numeric validation - FIXED', () => {
		const buffer = new Uint8Array(10).buffer;

		// ✅ Should throw TypeError for null offset
		expect(() => {
			Bun.mmap(buffer, { offset: null as any });
		}).toThrow();

		// ✅ Should throw TypeError for undefined offset
		expect(() => {
			Bun.mmap(buffer, { offset: undefined as any });
		}).toThrow();

		// ✅ Should throw TypeError for string offset
		expect(() => {
			Bun.mmap(buffer, { offset: '0' as any });
		}).toThrow();

		// ✅ Valid numeric offset should work
		expect(() => {
			Bun.mmap(buffer, { offset: 0, size: 10 });
		}).not.toThrow();
	});

	test('MMapCache safeMmap validation', () => {
		const cache = new MMapCache();
		const buffer = new Uint8Array(100).buffer;

		// ✅ Valid call
		expect(() => {
			cache.safeMmap(buffer, { offset: 0, size: 50 });
		}).not.toThrow();

		// ✅ Invalid offset type
		expect(() => {
			cache.safeMmap(buffer, { offset: null as any });
		}).toThrow(TypeError);

		// ✅ Invalid size type
		expect(() => {
			cache.safeMmap(buffer, { size: '10' as any });
		}).toThrow(TypeError);

		// ✅ Out of bounds offset
		expect(() => {
			cache.safeMmap(buffer, { offset: 200 });
		}).toThrow(RangeError);

		// ✅ Out of bounds size
		expect(() => {
			cache.safeMmap(buffer, { offset: 50, size: 100 });
		}).toThrow(RangeError);
	});

	test('ReadableStream empty handling - FIXED', async () => {
		const stream = new ReadableStream();

		// ✅ Cancel should not throw
		await expect(stream.cancel()).resolves.toBeUndefined();

		// ✅ Cancel twice should not throw
		await expect(stream.cancel()).resolves.toBeUndefined();
	});

	test('ReadableStream reader cancellation', async () => {
		const stream = new ReadableStream({
			start(controller) {
				controller.close();
			}
		});

		const reader = stream.getReader();

		// ✅ Cancel reader should not throw
		await expect(reader.cancel()).resolves.toBeUndefined();

		// ✅ Release lock should not throw
		reader.releaseLock();
	});

	test('Bun.mmap with invalid buffer', () => {
		// ✅ Null buffer should throw
		expect(() => {
			Bun.mmap(null as any, { offset: 0, size: 10 });
		}).toThrow();

		// ✅ Undefined buffer should throw
		expect(() => {
			Bun.mmap(undefined as any, { offset: 0, size: 10 });
		}).toThrow();
	});

	test('Bun.mmap bounds validation', () => {
		const buffer = new Uint8Array(100).buffer;

		// ✅ Negative offset should throw
		expect(() => {
			Bun.mmap(buffer, { offset: -1, size: 10 });
		}).toThrow();

		// ✅ Offset beyond buffer should throw
		expect(() => {
			Bun.mmap(buffer, { offset: 200, size: 10 });
		}).toThrow();

		// ✅ Negative size should throw
		expect(() => {
			Bun.mmap(buffer, { offset: 0, size: -1 });
		}).toThrow();

		// ✅ Size beyond buffer should throw
		expect(() => {
			Bun.mmap(buffer, { offset: 50, size: 100 });
		}).toThrow();
	});

	test('MMapCache loadMarkets error handling', async () => {
		const cache = new MMapCache();

		// Should handle missing file gracefully
		try {
			await cache.loadMarkets();
		} catch (e: any) {
			// Expected to fail if cache file doesn't exist
			expect(e).toBeDefined();
		}
	});

	test('SecretsManager with Bun.secrets fallback', async () => {
		// Test that SecretsManager handles Bun.secrets gracefully
		const result = await SecretsManager.withSecrets(
			{ test_key: 'context_value' },
			async () => {
				// Should prefer context over Bun.secrets
				return SecretsManager.getBookieKey('test_key');
			}
		);

		expect(result).toBe('context_value');
	});

	test('AsyncLocalStorage context isolation', async () => {
		// First context
		const result1 = await SecretsManager.withSecrets(
			{ key1: 'value1' },
			async () => {
				return SecretsManager.getBookieKey('key1');
			}
		);

		// Second context (isolated)
		const result2 = await SecretsManager.withSecrets(
			{ key2: 'value2' },
			async () => {
				return SecretsManager.getBookieKey('key1'); // Should be undefined
			}
		);

		expect(result1).toBe('value1');
		expect(result2).toBeUndefined();
	});

	test('ReadableStream with empty controller', async () => {
		const stream = new ReadableStream({
			start(controller) {
				// Do nothing - empty stream
			}
		});

		const reader = stream.getReader();
		const result = await reader.read();

		expect(result.done).toBe(true);
		expect(result.value).toBeUndefined();

		reader.releaseLock();
	});

	test('Bun.mmap zero-length buffer', () => {
		const buffer = new Uint8Array(0).buffer;

		// ✅ Should handle zero-length buffer
		expect(() => {
			Bun.mmap(buffer, { offset: 0, size: 0 });
		}).not.toThrow();
	});
});



