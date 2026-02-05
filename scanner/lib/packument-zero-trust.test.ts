import {describe, expect, test} from 'bun:test';
import {ZeroTrustPackumentResolver} from './packument-zero-trust';
import {BunInfoResponseSchema} from '../scan';

const resolver = new ZeroTrustPackumentResolver();

describe('ZeroTrustPackumentResolver', () => {
	describe('input validation', () => {
		test("resolve('') throws", async () => {
			await expect(resolver.resolve('')).rejects.toThrow();
		});

		test("resolve('   ') throws for whitespace-only", async () => {
			await expect(resolver.resolve('   ')).rejects.toThrow();
		});

		test("safeResolve('') returns SPAWN_FAILED error", async () => {
			const result = await resolver.safeResolve('');
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.code).toBe('SPAWN_FAILED');
			}
		});
	});

	describe('integration', () => {
		test("resolve('zod') returns NpmPackument with name === 'zod'", async () => {
			const p = await resolver.resolve('zod');
			expect(p.name).toBe('zod');
		}, 20_000);

		test("resolve('nonexistent-pkg-zzz') throws (NON_ZERO_EXIT)", async () => {
			await expect(resolver.resolve('nonexistent-pkg-zzz')).rejects.toThrow();
		}, 20_000);

		test("safeResolve('nonexistent-pkg-zzz') returns NON_ZERO_EXIT", async () => {
			const result = await resolver.safeResolve('nonexistent-pkg-zzz');
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.code).toBe('NON_ZERO_EXIT');
			}
		}, 20_000);

		test('validated data passes BunInfoResponseSchema re-parse', async () => {
			const p = await resolver.resolve('zod');
			const re = BunInfoResponseSchema.safeParse(p);
			expect(re.success).toBe(true);
		}, 20_000);
	});
});
