import {describe, expect, test} from 'bun:test';
import {validateBunRuntime} from './bun-validator';

describe('validateBunRuntime', () => {
	const result = validateBunRuntime();

	test('valid in Bun environment', () => {
		expect(result.valid).toBe(true);
	});

	test('nominal riskScore when all checks pass', () => {
		expect(result.riskScore).toBe(1.001005);
	});

	test('latencyNs is non-negative and sub-millisecond', () => {
		expect(result.latencyNs).toBeGreaterThanOrEqual(0);
		expect(result.latencyNs).toBeLessThan(1_000_000);
	});
});
