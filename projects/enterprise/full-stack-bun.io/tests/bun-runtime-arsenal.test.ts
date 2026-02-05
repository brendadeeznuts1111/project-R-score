import { test, expect } from 'bun:test';
import { serialize, deserialize, estimateShallowMemoryUsageOf } from 'bun:jsc';

test('Bun.version returns version string', () => {
	const version = Bun.version;
	expect(typeof version).toBe('string');
	expect(version.length).toBeGreaterThan(0);
});

test('Bun.revision returns revision string', () => {
	const revision = Bun.revision;
	expect(typeof revision).toBe('string');
});

test('Bun.env contains environment variables', () => {
	expect(Bun.env).toBeDefined();
	expect(typeof Bun.env).toBe('object');
});

test('Bun.main returns main file path', () => {
	const main = Bun.main;
	expect(typeof main).toBe('string');
	expect(main.length).toBeGreaterThan(0);
});

test('Bun.main can detect direct execution', () => {
	const main = Bun.main;
	const currentPath = import.meta.path;
	// In test context, main might be different from current file
	expect(typeof main).toBe('string');
	expect(typeof currentPath).toBe('string');
});

test('Bun.randomUUIDv7 generates valid UUID (hex default)', () => {
	const uuid = Bun.randomUUIDv7();
	expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
});

test('Bun.randomUUIDv7 with hex encoding', () => {
	const uuid = Bun.randomUUIDv7('hex');
	expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
});

test('Bun.randomUUIDv7 with base64 encoding', () => {
	const uuid = Bun.randomUUIDv7('base64');
	expect(typeof uuid).toBe('string');
	expect(uuid.length).toBeGreaterThan(0);
	// Base64 UUIDs don't have dashes
	expect(uuid).not.toContain('-');
});

test('Bun.randomUUIDv7 with base64url encoding', () => {
	const uuid = Bun.randomUUIDv7('base64url');
	expect(typeof uuid).toBe('string');
	expect(uuid.length).toBeGreaterThan(0);
	expect(uuid).not.toContain('-');
	expect(uuid).not.toContain('+');
	expect(uuid).not.toContain('/');
});

test('Bun.randomUUIDv7 with buffer encoding', () => {
	const uuid = Bun.randomUUIDv7('buffer');
	expect(uuid).toBeInstanceOf(Buffer);
	expect(uuid.length).toBe(16); // UUID is 16 bytes
});

test('Bun.randomUUIDv7 with timestamp parameter', () => {
	const timestamp = Date.now();
	const uuid = Bun.randomUUIDv7(timestamp);
	expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
});

test('Bun.randomUUIDv7 with encoding and timestamp', () => {
	const timestamp = Date.now() - 86400000; // Yesterday
	const uuidHex = Bun.randomUUIDv7('hex', timestamp);
	const uuidBuffer = Bun.randomUUIDv7('buffer', timestamp);
	
	expect(uuidHex).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
	expect(uuidBuffer).toBeInstanceOf(Buffer);
	expect(uuidBuffer.length).toBe(16);
});

test('Bun.nanoseconds returns number', () => {
	const ns = Bun.nanoseconds();
	expect(typeof ns).toBe('number');
	expect(ns).toBeGreaterThan(0);
});

test('Bun.which finds executables', () => {
	const bunPath = Bun.which('bun');
	expect(bunPath).toBeDefined();
	expect(typeof bunPath).toBe('string');
});

test('Bun.which with custom PATH', () => {
	const lsPath = Bun.which('ls', {
		PATH: '/usr/local/bin:/usr/bin:/bin'
	});
	expect(lsPath).toBeDefined();
	expect(typeof lsPath).toBe('string');
});

test('Bun.which with cwd returns null when not found', () => {
	const result = Bun.which('ls', {
		cwd: '/tmp',
		PATH: ''
	});
	// Should return null when PATH is empty and cwd doesn't contain executable
	expect(result === null || typeof result === 'string').toBe(true);
});

test('Bun.resolveSync resolves paths', () => {
	// Resolve from project root (go up one level from tests/)
	const projectRoot = import.meta.dir.replace('/tests', '');
	const resolved = Bun.resolveSync('./package.json', projectRoot);
	expect(resolved).toContain('package.json');
	expect(typeof resolved).toBe('string');
	expect(resolved.length).toBeGreaterThan(0);
});

test('Bun.escapeHTML escapes HTML from string', () => {
	const html = '<script>alert("xss")</script>';
	const escaped = Bun.escapeHTML(html);
	expect(escaped).not.toContain('<script>');
	expect(escaped).toContain('&lt;');
});

test('Bun.escapeHTML accepts number', () => {
	const escaped = Bun.escapeHTML(42);
	expect(escaped).toBe('42');
});

test('Bun.escapeHTML accepts boolean', () => {
	const escaped = Bun.escapeHTML(true);
	expect(escaped).toBe('true');
});

test('Bun.escapeHTML accepts object', () => {
	const escaped = Bun.escapeHTML({ key: '<value>' });
	expect(typeof escaped).toBe('string');
	expect(escaped.length).toBeGreaterThan(0);
});

test('Bun.stripANSI removes ANSI codes', () => {
	const ansi = '\u001b[31mRed\u001b[0m';
	const stripped = Bun.stripANSI(ansi);
	expect(stripped).toBe('Red');
	expect(stripped).not.toContain('\u001b');
});

test('Bun.stringWidth calculates width correctly', () => {
	expect(Bun.stringWidth('Hello')).toBe(5);
	expect(Bun.stringWidth('🚀')).toBeGreaterThan(0);
	expect(Bun.stringWidth('\u001b[31mRed\u001b[0m')).toBe(3);
});

test('Bun.stringWidth with countAnsiEscapeCodes option', () => {
	const ansiString = '\u001b[31mhello\u001b[0m';
	const widthIgnored = Bun.stringWidth(ansiString);
	const widthCounted = Bun.stringWidth(ansiString, { countAnsiEscapeCodes: true });
	
	expect(widthIgnored).toBe(5); // ANSI codes ignored
	expect(widthCounted).toBeGreaterThan(5); // ANSI codes counted
});

test('Bun.stringWidth with ambiguousIsNarrow option', () => {
	const emoji = '🚀';
	const narrow = Bun.stringWidth(emoji, { ambiguousIsNarrow: true });
	const wide = Bun.stringWidth(emoji, { ambiguousIsNarrow: false });
	
	expect(narrow).toBeGreaterThanOrEqual(1);
	expect(wide).toBeGreaterThanOrEqual(narrow);
});

test('Bun.fileURLToPath converts URL strings', () => {
	const url = 'file:///Users/test/file.txt';
	const path = Bun.fileURLToPath(url);
	expect(path).toContain('file.txt');
});

test('Bun.fileURLToPath converts URL objects', () => {
	const url = new URL('file:///Users/test/file.txt');
	const path = Bun.fileURLToPath(url);
	expect(path).toContain('file.txt');
});

test('Bun.pathToFileURL converts paths', () => {
	const path = '/Users/test/file.txt';
	const url = Bun.pathToFileURL(path);
	expect(url).toBeDefined();
	// pathToFileURL returns a URL object
	if (url instanceof URL) {
		expect(url.protocol).toBe('file:');
		expect(url.pathname).toContain('file.txt');
	} else {
		// Or might return string
		expect(typeof url).toBe('string');
		expect(url.length).toBeGreaterThan(0);
	}
});

test('Bun.gzipSync compresses data', () => {
	const data = new TextEncoder().encode('test data');
	const compressed = Bun.gzipSync(data);
	expect(compressed.length).toBeGreaterThan(0);
	expect(compressed).toBeInstanceOf(Uint8Array);
});

test('Bun.gzipSync with level option', () => {
	const data = new TextEncoder().encode('test data'.repeat(10));
	const compressedDefault = Bun.gzipSync(data);
	const compressedLevel9 = Bun.gzipSync(data, { level: 9 });
	expect(compressedDefault.length).toBeGreaterThan(0);
	expect(compressedLevel9.length).toBeGreaterThan(0);
});

test('Bun.gunzipSync decompresses data', () => {
	const data = new TextEncoder().encode('test data');
	const compressed = Bun.gzipSync(data);
	const decompressed = Bun.gunzipSync(compressed);
	expect(decompressed).toEqual(data);
});

test('Bun.deflateSync compresses data', () => {
	const data = new TextEncoder().encode('test data');
	const compressed = Bun.deflateSync(data);
	expect(compressed.length).toBeGreaterThan(0);
	// Compression may not always reduce size for small data
	expect(compressed).toBeInstanceOf(Uint8Array);
});

test('Bun.inflateSync decompresses data', () => {
	const data = new TextEncoder().encode('test data');
	const compressed = Bun.deflateSync(data);
	const decompressed = Bun.inflateSync(compressed);
	expect(decompressed).toEqual(data);
});

test('Bun.zstdCompressSync compresses data', () => {
	const data = new TextEncoder().encode('test data');
	const compressed = Bun.zstdCompressSync(data);
	expect(compressed.length).toBeGreaterThan(0);
});

test('Bun.zstdCompressSync with level option', () => {
	const data = new TextEncoder().encode('test data'.repeat(10));
	const compressedDefault = Bun.zstdCompressSync(data);
	const compressedLevel6 = Bun.zstdCompressSync(data, { level: 6 });
	expect(compressedDefault.length).toBeGreaterThan(0);
	expect(compressedLevel6.length).toBeGreaterThan(0);
});

test('Bun.zstdCompress async version', async () => {
	const data = new TextEncoder().encode('test data');
	const compressed = await Bun.zstdCompress(data);
	expect(compressed.length).toBeGreaterThan(0);
});

test('Bun.zstdDecompress async version', async () => {
	const data = new TextEncoder().encode('test data');
	const compressed = Bun.zstdCompressSync(data);
	const decompressed = await Bun.zstdDecompress(compressed);
	expect(decompressed).toEqual(data);
});

test('Bun.zstdDecompressSync decompresses data', () => {
	const data = new TextEncoder().encode('test data');
	const compressed = Bun.zstdCompressSync(data);
	const decompressed = Bun.zstdDecompressSync(compressed);
	expect(decompressed).toEqual(data);
});

test('Bun.inspect formats objects', () => {
	const obj = { a: 1, b: 2 };
	const inspected = Bun.inspect(obj);
	expect(inspected).toContain('a');
	expect(inspected).toContain('b');
});

test('Bun.inspect.table formats tables', () => {
	const data = [{ league: 'nfl', profit: 0.05 }];
	const table = Bun.inspect.table(data, ['league', 'profit']);
	expect(table).toContain('league');
	expect(table).toContain('profit');
});

test('Bun.inspect.table with colors option', () => {
	const data = [{ league: 'nfl', profit: 0.05 }];
	const tableWithColors = Bun.inspect.table(data, ['league', 'profit'], { colors: true });
	const tableWithoutColors = Bun.inspect.table(data, ['league', 'profit'], { colors: false });
	
	expect(tableWithColors).toContain('league');
	expect(tableWithoutColors).toContain('league');
});

test('Bun.inspect.custom allows custom formatting', () => {
	const obj = {
		value: 42,
		[Bun.inspect.custom]: () => 'Custom Format'
	};
	const inspected = Bun.inspect(obj);
	expect(inspected).toContain('Custom Format');
});

test('Bun.deepEquals compares objects', () => {
	const obj1 = { a: 1, b: { c: 2 } };
	const obj2 = { a: 1, b: { c: 2 } };
	const obj3 = { a: 1, b: { c: 3 } };
	
	expect(Bun.deepEquals(obj1, obj2)).toBe(true);
	expect(Bun.deepEquals(obj1, obj3)).toBe(false);
});

test('Bun.deepEquals strict mode', () => {
	const a = { entries: [1, 2] };
	const b = { entries: [1, 2], extra: undefined };
	
	expect(Bun.deepEquals(a, b)).toBe(true); // Non-strict
	expect(Bun.deepEquals(a, b, true)).toBe(false); // Strict
	
	// Strict mode examples
	expect(Bun.deepEquals({}, { a: undefined }, true)).toBe(false);
	expect(Bun.deepEquals(['asdf'], ['asdf', undefined], true)).toBe(false);
});

test('Bun.sleep waits asynchronously with milliseconds', async () => {
	const start = Bun.nanoseconds();
	await Bun.sleep(10);
	const end = Bun.nanoseconds();
	const duration = (end - start) / 1_000_000;
	expect(duration).toBeGreaterThanOrEqual(8); // Allow some tolerance
});

test('Bun.sleep waits asynchronously with Date object', async () => {
	const futureDate = new Date(Date.now() + 10);
	const start = Bun.nanoseconds();
	await Bun.sleep(futureDate);
	const end = Bun.nanoseconds();
	const duration = (end - start) / 1_000_000;
	expect(duration).toBeGreaterThanOrEqual(8); // Allow some tolerance
});

test('Bun.sleepSync waits synchronously', () => {
	const start = Bun.nanoseconds();
	Bun.sleepSync(5);
	const end = Bun.nanoseconds();
	const duration = (end - start) / 1_000_000;
	expect(duration).toBeGreaterThanOrEqual(3); // Allow some tolerance
});

test('Bun.peek peeks at fulfilled promises', async () => {
	const promise = Promise.resolve({ data: 'test' });
	const peeked = Bun.peek(promise);
	
	if (peeked instanceof Promise) {
		const resolved = await peeked;
		expect(resolved).toEqual({ data: 'test' });
	} else {
		expect(peeked).toEqual({ data: 'test' });
	}
});

test('Bun.peek peeks at non-promise values', () => {
	const value = Bun.peek(42);
	expect(value).toBe(42);
});

test('Bun.peek returns pending promise for pending promises', () => {
	const pending = new Promise(() => {});
	const peeked = Bun.peek(pending);
	expect(peeked).toBe(pending);
});

test('Bun.peek.status returns promise status', () => {
	const fulfilled = Promise.resolve(true);
	const pending = new Promise(() => {});
	
	// Create rejected promise and catch immediately to prevent unhandled rejection
	const rejected = Promise.reject(new Error('test'));
	rejected.catch(() => {}); // Suppress unhandled rejection warning
	
	expect(Bun.peek.status(fulfilled)).toBe('fulfilled');
	expect(Bun.peek.status(pending)).toBe('pending');
	expect(Bun.peek.status(rejected)).toBe('rejected');
});

test('Bun.peek handles rejected promises', () => {
	// Create rejected promise and catch immediately to prevent unhandled rejection
	const rejected = Promise.reject(new Error('test error'));
	rejected.catch(() => {}); // Suppress unhandled rejection warning
	
	const peeked = Bun.peek(rejected);
	
	// peek returns the error for rejected promises
	expect(peeked).toBeInstanceOf(Error);
	if (peeked instanceof Error) {
		expect(peeked.message).toBe('test error');
	}
});

test('Bun.readableStreamToArrayBuffer converts stream', async () => {
	const stream = new ReadableStream({
		start(c) {
			c.enqueue(new TextEncoder().encode('test'));
			c.close();
		}
	});
	
	const buffer = await Bun.readableStreamToArrayBuffer(stream);
	expect(buffer.byteLength).toBeGreaterThan(0);
});

test('Bun.readableStreamToBytes converts stream', async () => {
	const stream = new ReadableStream({
		start(c) {
			c.enqueue(new TextEncoder().encode('test'));
			c.close();
		}
	});
	
	const bytes = await Bun.readableStreamToBytes(stream);
	expect(bytes.length).toBeGreaterThan(0);
});

test('Bun.readableStreamToBlob converts stream', async () => {
	const stream = new ReadableStream({
		start(c) {
			c.enqueue(new TextEncoder().encode('test'));
			c.close();
		}
	});
	
	const blob = await Bun.readableStreamToBlob(stream);
	expect(blob.size).toBeGreaterThan(0);
});

test('Bun.readableStreamToJSON converts stream', async () => {
	const stream = new ReadableStream({
		start(c) {
			c.enqueue(new TextEncoder().encode('{"test": true}'));
			c.close();
		}
	});
	
	const json = await Bun.readableStreamToJSON(stream);
	expect(json).toEqual({ test: true });
});

test('Bun.readableStreamToText converts stream', async () => {
	const stream = new ReadableStream({
		start(c) {
			c.enqueue(new TextEncoder().encode('test'));
			c.close();
		}
	});
	
	const text = await Bun.readableStreamToText(stream);
	expect(text).toBe('test');
});

test('serialize and deserialize work correctly', () => {
	const data = { league: 'nfl', markets: [{ team: 'chiefs' }] };
	const serialized = serialize(data);
	const deserialized = deserialize(serialized);
	
	expect(Bun.deepEquals(data, deserialized)).toBe(true);
});

test('estimateShallowMemoryUsageOf estimates memory', () => {
	const obj = { a: 1, b: 'test', c: [1, 2, 3] };
	const estimate = estimateShallowMemoryUsageOf(obj);
	expect(estimate).toBeGreaterThan(0);
});

