/**
 * Secrets Manager Test Suite
 * 
 * Tests AsyncLocalStorage-safe secrets management
 */

import { test, expect, beforeEach } from "bun:test";
import { SecretsManager } from "../src/secrets-manager";

beforeEach(() => {
	// Clear context before each test
	SecretsManager.clearContextKeys();
});

test('withSecrets - run function with bookie keys', async () => {
	const result = await SecretsManager.withSecrets(
		{
			pinnacle: 'pk_live_xxx',
			fonbet: 'api_ru_xxx',
			bet365: 'aff_arb001'
		},
		async () => {
			const pinnacleKey = SecretsManager.getBookieKey('pinnacle');
			return pinnacleKey;
		}
	);

	expect(result).toBe('pk_live_xxx');
});

test('getBookieKey - safe access from context', async () => {
	await SecretsManager.withSecrets(
		{
			pinnacle: 'pk_live_xxx',
			fonbet: 'api_ru_xxx'
		},
		async () => {
			const pinnacleKey = SecretsManager.getBookieKey('pinnacle');
			const fonbetKey = SecretsManager.getBookieKey('fonbet');
			const missingKey = SecretsManager.getBookieKey('nonexistent');

			expect(pinnacleKey).toBe('pk_live_xxx');
			expect(fonbetKey).toBe('api_ru_xxx');
			expect(missingKey).toBeUndefined();
		}
	);
});

test('getBookieKey - safe access outside context', () => {
	// Should not crash if called outside async context
	const key = SecretsManager.getBookieKey('pinnacle');
	expect(key).toBeUndefined();
});

test('getAllBookieKeys - get all keys from context', async () => {
	await SecretsManager.withSecrets(
		{
			pinnacle: 'pk_live_xxx',
			fonbet: 'api_ru_xxx',
			bet365: 'aff_arb001'
		},
		async () => {
			const allKeys = SecretsManager.getAllBookieKeys();

			expect(allKeys.pinnacle).toBe('pk_live_xxx');
			expect(allKeys.fonbet).toBe('api_ru_xxx');
			expect(allKeys.bet365).toBe('aff_arb001');
		}
	);
});

test('hasBookieKey - check key existence', async () => {
	await SecretsManager.withSecrets(
		{
			pinnacle: 'pk_live_xxx'
		},
		async () => {
			expect(SecretsManager.hasBookieKey('pinnacle')).toBe(true);
			expect(SecretsManager.hasBookieKey('nonexistent')).toBe(false);
		}
	);
});

test('setBookieKey - set key in context', async () => {
	await SecretsManager.withSecrets(
		{
			pinnacle: 'pk_live_xxx'
		},
		async () => {
			SecretsManager.setBookieKey('bet365', 'aff_arb001');
			
			expect(SecretsManager.getBookieKey('bet365')).toBe('aff_arb001');
			expect(SecretsManager.getBookieKey('pinnacle')).toBe('pk_live_xxx');
		}
	);
});

test('clearContextKeys - clear all context keys', async () => {
	await SecretsManager.withSecrets(
		{
			pinnacle: 'pk_live_xxx',
			fonbet: 'api_ru_xxx'
		},
		async () => {
			expect(SecretsManager.getBookieKey('pinnacle')).toBe('pk_live_xxx');
			
			SecretsManager.clearContextKeys();
			
			expect(SecretsManager.getBookieKey('pinnacle')).toBeUndefined();
			expect(SecretsManager.getBookieKey('fonbet')).toBeUndefined();
		}
	);
});

test('getKeysCount - count available keys', async () => {
	await SecretsManager.withSecrets(
		{
			pinnacle: 'pk_live_xxx',
			fonbet: 'api_ru_xxx',
			bet365: 'aff_arb001'
		},
		async () => {
			const count = SecretsManager.getKeysCount();
			expect(count).toBeGreaterThanOrEqual(3);
		}
	);
});

test('production usage - 75 bookies', async () => {
	// Simulate 75 bookies
	const bookieKeys: Record<string, string> = {};
	for (let i = 0; i < 75; i++) {
		bookieKeys[`bookie${i}`] = `key_${i}`;
	}

	await SecretsManager.withSecrets(bookieKeys, async () => {
		// Access keys safely
		const key0 = SecretsManager.getBookieKey('bookie0');
		const key74 = SecretsManager.getBookieKey('bookie74');
		const allKeys = SecretsManager.getAllBookieKeys();

		expect(key0).toBe('key_0');
		expect(key74).toBe('key_74');
		expect(Object.keys(allKeys).length).toBeGreaterThanOrEqual(75);
	});
});

test('context isolation - keys not leaked between contexts', async () => {
	// First context
	await SecretsManager.withSecrets(
		{ pinnacle: 'key1' },
		async () => {
			expect(SecretsManager.getBookieKey('pinnacle')).toBe('key1');
		}
	);

	// Second context (should not have first context's keys)
	await SecretsManager.withSecrets(
		{ fonbet: 'key2' },
		async () => {
			expect(SecretsManager.getBookieKey('fonbet')).toBe('key2');
			expect(SecretsManager.getBookieKey('pinnacle')).toBeUndefined();
		}
	);
});

test('nested contexts - inner context inherits outer', async () => {
	await SecretsManager.withSecrets(
		{ pinnacle: 'outer_key' },
		async () => {
			expect(SecretsManager.getBookieKey('pinnacle')).toBe('outer_key');

			// Nested context
			await SecretsManager.withSecrets(
				{ fonbet: 'inner_key' },
				async () => {
					// Inner context should have both
					expect(SecretsManager.getBookieKey('pinnacle')).toBe('outer_key');
					expect(SecretsManager.getBookieKey('fonbet')).toBe('inner_key');
				}
			);

			// Back to outer context
			expect(SecretsManager.getBookieKey('pinnacle')).toBe('outer_key');
			expect(SecretsManager.getBookieKey('fonbet')).toBeUndefined();
		}
	);
});



