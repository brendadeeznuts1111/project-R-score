// stream-converter.test.ts — Bun Native Stream Converter Annihilation Suite
import {test, expect, describe} from 'bun:test';
import {
	BUN_STREAM_MIGRATION_MATRIX,
	BUN_MIGRATION_WEIGHTS,
	calcMigrationR,
	totalComplexityReduction,
	totalMemorySaved,
} from './stream-converters-enhanced';

// ── Helpers ──

const createTestStream = (content: string) =>
	new ReadableStream({
		start(controller) {
			controller.enqueue(new TextEncoder().encode(content));
			controller.close();
		},
	});

const createBinaryStream = (bytes: number[]) =>
	new ReadableStream({
		start(controller) {
			controller.enqueue(new Uint8Array(bytes));
			controller.close();
		},
	});

// ── Core Converters ──

describe('Stream Converters', () => {
	describe('Binary Converters', () => {
		test('readableStreamToArrayBuffer', async () => {
			const stream = createBinaryStream([1, 2, 3, 4, 5]);
			const buffer = await Bun.readableStreamToArrayBuffer(stream);
			expect(new Uint8Array(buffer)).toEqual(new Uint8Array([1, 2, 3, 4, 5]));
		});

		test('readableStreamToBytes', async () => {
			const stream = createBinaryStream([255, 0, 128]);
			const bytes = await Bun.readableStreamToBytes(stream);
			expect(bytes).toBeInstanceOf(Uint8Array);
			expect(bytes).toEqual(new Uint8Array([255, 0, 128]));
		});

		test('readableStreamToBlob', async () => {
			const stream = createTestStream('blob content');
			const blob = await Bun.readableStreamToBlob(stream);
			expect(blob).toBeInstanceOf(Blob);
			expect(blob.size).toBe(12);
			expect(await blob.text()).toBe('blob content');
		});
	});

	describe('Text Converters', () => {
		test('readableStreamToText - basic', async () => {
			const stream = createTestStream('Hello, World!');
			const text = await Bun.readableStreamToText(stream);
			expect(text).toBe('Hello, World!');
		});

		test('readableStreamToText - multi-chunk', async () => {
			const stream = new ReadableStream({
				start(controller) {
					controller.enqueue(new TextEncoder().encode('hello'));
					controller.enqueue(new TextEncoder().encode(' world'));
					controller.close();
				},
			});
			const text = await Bun.readableStreamToText(stream);
			expect(text).toBe('hello world');
		});

		test('readableStreamToText - unicode', async () => {
			const input = '\u{1F389} \u6D4B\u8BD5 \u{1F600}';
			const stream = createTestStream(input);
			const text = await Bun.readableStreamToText(stream);
			expect(text).toBe(input);
			// UTF-16 code units: 🎉(2) + space(1) + 测(1) + 试(1) + space(1) + 😀(2) = 8
			expect(text.length).toBe(8);
		});

		test('readableStreamToJSON', async () => {
			const stream = createTestStream('{"id": 42, "name": "test"}');
			const obj = await Bun.readableStreamToJSON(stream);
			expect(obj).toEqual({id: 42, name: 'test'});
		});

		test('readableStreamToJSON - invalid throws', async () => {
			const stream = createTestStream('invalid json');
			await expect(Bun.readableStreamToJSON(stream)).rejects.toThrow();
		});
	});

	describe('Array Converters', () => {
		test('readableStreamToArray - multi-chunk', async () => {
			const stream = new ReadableStream({
				start(controller) {
					controller.enqueue(new Uint8Array([1]));
					controller.enqueue(new Uint8Array([2, 3]));
					controller.close();
				},
			});
			const chunks = await Bun.readableStreamToArray(stream);
			expect(chunks).toHaveLength(2);
			expect(chunks[0]).toEqual(new Uint8Array([1]));
			expect(chunks[1]).toEqual(new Uint8Array([2, 3]));
		});
	});

	describe('Form Data Converters', () => {
		test('readableStreamToFormData (urlencoded)', async () => {
			const stream = createTestStream('key=value&another=test');
			const form = await Bun.readableStreamToFormData(stream);
			expect(form.get('key')).toBe('value');
			expect(form.get('another')).toBe('test');
		});

		test('readableStreamToFormData (multipart)', async () => {
			const boundary = '----testboundary';
			const body = `--${boundary}\r\nContent-Disposition: form-data; name="file"\r\n\r\ncontent\r\n--${boundary}--`;
			const stream = createTestStream(body);
			const form = await Bun.readableStreamToFormData(stream, boundary);
			expect(form.get('file')).toBe('content');
		});
	});

	describe('Spawn Integration', () => {
		test('proc.stdout to text', async () => {
			const proc = Bun.spawn(['echo', 'hello'], {stdout: 'pipe'});
			const text = await Bun.readableStreamToText(proc.stdout!);
			expect(text.trim()).toBe('hello');
		});

		test('proc.stderr to array', async () => {
			const proc = Bun.spawn(['sh', '-c', 'echo error >&2'], {stderr: 'pipe'});
			const chunks = await Bun.readableStreamToArray(proc.stderr!);
			expect(chunks.length).toBeGreaterThan(0);
			const text = new TextDecoder().decode(chunks[0] as Uint8Array);
			expect(text).toContain('error');
		});

		test('large output streaming (seq 1..1000)', async () => {
			const proc = Bun.spawn(['seq', '1', '1000'], {stdout: 'pipe'});
			const text = await Bun.readableStreamToText(proc.stdout!);
			const lines = text.trim().split('\n');
			expect(lines).toHaveLength(1000);
			expect(lines[999]).toBe('1000');
		});
	});

	describe('Performance', () => {
		test('1MB stream conversion < 50ms', async () => {
			const mb = 1024 * 1024;
			const data = 'x'.repeat(mb);
			const stream = createTestStream(data);

			const start = Bun.nanoseconds();
			const result = await Bun.readableStreamToText(stream);
			const elapsed = (Bun.nanoseconds() - start) / 1e6; // ms

			expect(result.length).toBe(mb);
			expect(elapsed).toBeLessThan(50);
		});
	});
});

// ── Migration Matrix Validation ──

describe('Stream Migration Matrix', () => {
	test('matrix has 8 entries', () => {
		expect(BUN_STREAM_MIGRATION_MATRIX.length).toBe(8);
	});

	test('all rScores are between 0.99 and 1.0', () => {
		for (const entry of BUN_STREAM_MIGRATION_MATRIX) {
			expect(entry.rScore).toBeGreaterThanOrEqual(0.99);
			expect(entry.rScore).toBeLessThanOrEqual(1.0);
		}
	});

	test('all entries reduce complexity', () => {
		for (const entry of BUN_STREAM_MIGRATION_MATRIX) {
			expect(entry.complexityAfter).toBeLessThan(entry.complexityBefore);
			expect(entry.complexityAfter).toBe(1);
		}
	});

	test('total complexity reduction is 37 -> 8', () => {
		const {before, after, reduction} = totalComplexityReduction();
		expect(before).toBe(37);
		expect(after).toBe(8);
		expect(reduction).toBe(29);
	});

	test('total memory saved is 1488 bytes', () => {
		expect(totalMemorySaved()).toBe(1488);
	});

	test('all security tiers are HARD', () => {
		for (const entry of BUN_STREAM_MIGRATION_MATRIX) {
			expect(entry.securityTier).toBe('HARD');
		}
	});

	test('migration weights sum to 1.0', () => {
		const sum =
			BUN_MIGRATION_WEIGHTS.performance +
			BUN_MIGRATION_WEIGHTS.memory +
			BUN_MIGRATION_WEIGHTS.edgeCases +
			BUN_MIGRATION_WEIGHTS.security;
		expect(sum).toBeCloseTo(1.0, 10);
	});

	test('calcMigrationR returns values in [0, 1]', () => {
		for (const entry of BUN_STREAM_MIGRATION_MATRIX) {
			const r = calcMigrationR(entry.metrics);
			expect(r).toBeGreaterThanOrEqual(0);
			expect(r).toBeLessThanOrEqual(1);
		}
	});

	test('each entry has unique id 1-8', () => {
		const ids = BUN_STREAM_MIGRATION_MATRIX.map(e => e.id);
		expect(new Set(ids).size).toBe(8);
		expect(Math.min(...ids)).toBe(1);
		expect(Math.max(...ids)).toBe(8);
	});

	test('8 distinct stream types', () => {
		const types = new Set(BUN_STREAM_MIGRATION_MATRIX.map(e => e.streamType));
		expect(types.size).toBe(8);
	});
});
