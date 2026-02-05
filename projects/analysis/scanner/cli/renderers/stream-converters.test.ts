import {test, expect, describe} from 'bun:test';
import {BUN_CONVERTERS, BUN_SPAWN_CONVERTER_MATRIX, converterByOutput} from './stream-converters';

// ═══════════════════════════════════════════════════════════════
// CATALOG TESTS
// ═══════════════════════════════════════════════════════════════

describe('BUN_CONVERTERS catalog', () => {
	test('has 7 converters', () => {
		expect(BUN_CONVERTERS.length).toBe(7);
	});

	test('no duplicate function names', () => {
		const names = BUN_CONVERTERS.map(c => c.function);
		expect(new Set(names).size).toBe(names.length);
	});

	test('all entries have non-empty fields', () => {
		for (const c of BUN_CONVERTERS) {
			expect(c.function.length).toBeGreaterThan(0);
			expect(c.input).toBe('ReadableStream<Uint8Array>');
			expect(c.output.length).toBeGreaterThan(0);
			expect(c.useCase.length).toBeGreaterThan(0);
		}
	});

	test('all function names start with Bun.readableStreamTo', () => {
		for (const c of BUN_CONVERTERS) {
			expect(c.function.startsWith('Bun.readableStreamTo')).toBe(true);
		}
	});

	test('converterByOutput finds known types', () => {
		expect(converterByOutput('string')?.function).toBe('Bun.readableStreamToText');
		expect(converterByOutput('ArrayBuffer')?.function).toBe('Bun.readableStreamToArrayBuffer');
		expect(converterByOutput('Uint8Array')?.function).toBe('Bun.readableStreamToBytes');
		expect(converterByOutput('Blob')?.function).toBe('Bun.readableStreamToBlob');
		expect(converterByOutput('object')?.function).toBe('Bun.readableStreamToJSON');
		expect(converterByOutput('unknown[]')?.function).toBe('Bun.readableStreamToArray');
		expect(converterByOutput('FormData')?.function).toBe('Bun.readableStreamToFormData');
	});

	test('converterByOutput returns undefined for unknown type', () => {
		expect(converterByOutput('nonsense')).toBeUndefined();
	});
});

describe('BUN_SPAWN_CONVERTER_MATRIX', () => {
	test('all routes reference valid converters', () => {
		const names = new Set(BUN_CONVERTERS.map(c => c.function.replace('Bun.', '')));
		for (const route of BUN_SPAWN_CONVERTER_MATRIX) {
			expect(names.has(route.converter)).toBe(true);
		}
	});

	test('all routes use pipe option', () => {
		for (const route of BUN_SPAWN_CONVERTER_MATRIX) {
			expect(route.spawnOption).toEndWith('"pipe"');
		}
	});
});

// ═══════════════════════════════════════════════════════════════
// RUNTIME CONVERTER TESTS
// ═══════════════════════════════════════════════════════════════

function textStream(...parts: string[]): ReadableStream<Uint8Array> {
	const encoder = new TextEncoder();
	return new ReadableStream({
		start(controller) {
			for (const part of parts) {
				controller.enqueue(encoder.encode(part));
			}
			controller.close();
		},
	});
}

function byteStream(...chunks: Uint8Array[]): ReadableStream<Uint8Array> {
	return new ReadableStream({
		start(controller) {
			for (const chunk of chunks) {
				controller.enqueue(chunk);
			}
			controller.close();
		},
	});
}

describe('readableStreamToText', () => {
	test('concatenates text chunks', async () => {
		const text = await Bun.readableStreamToText(textStream('hello', ' world'));
		expect(text).toBe('hello world');
	});

	test('empty stream returns empty string', async () => {
		const text = await Bun.readableStreamToText(textStream());
		expect(text).toBe('');
	});
});

describe('readableStreamToArrayBuffer', () => {
	test('returns ArrayBuffer with correct bytes', async () => {
		const buffer = await Bun.readableStreamToArrayBuffer(byteStream(new Uint8Array([1, 2, 3])));
		expect(buffer).toBeInstanceOf(ArrayBuffer);
		expect(new Uint8Array(buffer)).toEqual(new Uint8Array([1, 2, 3]));
	});
});

describe('readableStreamToBytes', () => {
	test('returns Uint8Array', async () => {
		const bytes = await Bun.readableStreamToBytes(byteStream(new Uint8Array([10, 20, 30])));
		expect(bytes).toBeInstanceOf(Uint8Array);
		expect(bytes).toEqual(new Uint8Array([10, 20, 30]));
	});
});

describe('readableStreamToJSON', () => {
	test('parses JSON object', async () => {
		const obj = await Bun.readableStreamToJSON(textStream('{"test":true}'));
		expect(obj).toEqual({test: true});
	});

	test('parses JSON array', async () => {
		const arr = await Bun.readableStreamToJSON(textStream('[1,2,3]'));
		expect(arr).toEqual([1, 2, 3]);
	});
});

describe('readableStreamToArray', () => {
	test('collects chunks as array', async () => {
		const chunks = await Bun.readableStreamToArray(
			byteStream(new Uint8Array([1]), new Uint8Array([2]), new Uint8Array([3])),
		);
		expect(chunks.length).toBe(3);
	});

	test('empty stream returns empty array', async () => {
		const chunks = await Bun.readableStreamToArray(byteStream());
		expect(chunks.length).toBe(0);
	});
});

describe('readableStreamToBlob', () => {
	test('returns Blob with correct size', async () => {
		const blob = await Bun.readableStreamToBlob(byteStream(new Uint8Array([1, 2, 3, 4, 5])));
		expect(blob).toBeInstanceOf(Blob);
		expect(blob.size).toBe(5);
	});
});

// ═══════════════════════════════════════════════════════════════
// SPAWN → STREAM → CONVERTER INTEGRATION
// ═══════════════════════════════════════════════════════════════

describe('Spawn → Stream → Converter', () => {
	test('stdout to text', async () => {
		const proc = Bun.spawn(['echo', 'hello'], {stdout: 'pipe'});
		const text = await Bun.readableStreamToText(proc.stdout!);
		expect(text).toContain('hello');
	});

	test('stderr to text', async () => {
		const proc = Bun.spawn(['sh', '-c', 'echo error >&2'], {stderr: 'pipe'});
		const text = await Bun.readableStreamToText(proc.stderr!);
		expect(text).toContain('error');
	});

	test('stdout to bytes', async () => {
		const proc = Bun.spawn(['printf', '\\001\\002\\003'], {stdout: 'pipe'});
		const bytes = await Bun.readableStreamToBytes(proc.stdout!);
		expect(bytes).toBeInstanceOf(Uint8Array);
		expect(bytes.length).toBe(3);
	});

	test('stdout to JSON', async () => {
		const proc = Bun.spawn(['echo', '{"ok":true}'], {stdout: 'pipe'});
		const obj = await Bun.readableStreamToJSON(proc.stdout!);
		expect(obj).toEqual({ok: true});
	});
});
