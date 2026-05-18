// runtime-optimizations.test.ts — tests for JSC/Bun runtime optimization helpers

import {describe, test, expect} from 'bun:test';
import {
	batchedExists,
	createRuntimeNode,
	RiskAccumulator,
	scanRuntimeGenerator,
	checksumCrc32,
	createZstdCompressionStream,
	gcHint,
	BUN_MAX_SAFE_SIZE,
} from './runtime-optimizations';

describe('runtime-optimizations', () => {
	test('batchedExists returns booleans for paths', async () => {
		const results = await batchedExists(['package.json', 'nonexistent-xyz-123']);
		expect(Array.isArray(results)).toBe(true);
		expect(results.length).toBe(2);
		expect(results[0]).toBe(true);
		expect(results[1]).toBe(false);
	});

	test('createRuntimeNode has stable shape (children null, parent null)', () => {
		const node = createRuntimeNode('/a/b', 'b', 'file', 100, 0, 0);
		expect(node.path).toBe('/a/b');
		expect(node.name).toBe('b');
		expect(node.type).toBe('file');
		expect(node.size).toBe(100);
		expect(node.children).toBe(null);
		expect(node.parent).toBe(null);
	});

	test('RiskAccumulator accumulates and totals', () => {
		const acc = new RiskAccumulator(4);
		acc.accumulate(1.0);
		acc.accumulate(0.5);
		expect(acc.total()).toBe(1.5);
		acc.reset();
		expect(acc.total()).toBe(0);
	});

	test('scanRuntimeGenerator yields nodes for current dir', async () => {
		let count = 0;
		for await (const node of scanRuntimeGenerator('.', 0)) {
			count++;
			expect(node.path).toBeDefined();
			expect(node.name).toBeDefined();
			if (count >= 5) break;
		}
		expect(count).toBeGreaterThan(0);
	});

	test('checksumCrc32 returns number', () => {
		const buf = new TextEncoder().encode('hello');
		const crc = checksumCrc32(buf);
		expect(typeof crc).toBe('number');
		expect(checksumCrc32(buf)).toBe(crc);
	});

	test('createZstdCompressionStream returns CompressionStream', () => {
		const stream = createZstdCompressionStream();
		expect(stream).toBeDefined();
		expect(stream.readable).toBeDefined();
		expect(stream.writable).toBeDefined();
	});

	test('gcHint does not throw', () => {
		gcHint();
	});

	test('BUN_MAX_SAFE_SIZE is Number.MAX_SAFE_INTEGER', () => {
		expect(BUN_MAX_SAFE_SIZE).toBe(Number.MAX_SAFE_INTEGER);
	});
});
