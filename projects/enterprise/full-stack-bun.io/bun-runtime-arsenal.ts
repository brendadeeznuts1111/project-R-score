#!/usr/bin/env bun
/**
 * [BUN-RUNTIME-ARSENAL][ALL-APIS][COMPREHENSIVE]
 * Complete Bun Runtime API Showcase - All Features Demonstrated
 */

import { Database } from 'bun:sqlite';
import { serialize, deserialize, estimateShallowMemoryUsageOf } from 'bun:jsc';

// ==================== BUN VERSION & ENVIRONMENT ====================
console.info('\n🚀 BUN RUNTIME ARSENAL');
console.info('═'.repeat(60));

console.info('\n📦 VERSION & ENVIRONMENT');
console.info(`Bun Version: ${Bun.version}`);
console.info(`Bun Revision: ${Bun.revision}`);
console.info(`Main File: ${Bun.main}`);
console.info(`Current File: ${import.meta.path}`);
console.info(`Is Directly Executed: ${import.meta.path === Bun.main ? '✅ Yes' : '❌ No (imported)'}`);
console.info(`Node Env: ${Bun.env.NODE_ENV || 'development'}`);

// ==================== RANDOM & TIMING ====================
console.info('\n🎲 RANDOM & TIMING');
const uuidHex = Bun.randomUUIDv7(); // Default hex
const uuidBase64 = Bun.randomUUIDv7('base64');
const uuidBase64Url = Bun.randomUUIDv7('base64url');
const uuidBuffer = Bun.randomUUIDv7('buffer');
const uuidWithTimestamp = Bun.randomUUIDv7(Date.now() - 86400000); // Yesterday

console.info(`UUIDv7 (hex): ${uuidHex}`);
console.info(`UUIDv7 (base64): ${uuidBase64}`);
console.info(`UUIDv7 (base64url): ${uuidBase64Url}`);
console.info(`UUIDv7 (buffer): ${uuidBuffer.toString('hex')} (${uuidBuffer.length} bytes)`);
console.info(`UUIDv7 (with timestamp): ${uuidWithTimestamp}`);
console.info(`Nanoseconds: ${Bun.nanoseconds()}`);

// ==================== PATH UTILITIES ====================
console.info('\n📁 PATH UTILITIES');
const filePath = Bun.fileURLToPath('file:///Users/nolarose/Projects/full-stack-bun.io/data/test.db');
const filePathFromURL = Bun.fileURLToPath(new URL('file:///Users/nolarose/Projects/full-stack-bun.io/data/test.db'));
const fileURL = Bun.pathToFileURL('/Users/nolarose/Projects/full-stack-bun.io/data/test.db');
console.info(`File Path (string): ${filePath}`);
console.info(`File Path (URL object): ${filePathFromURL}`);
console.info(`File URL: ${fileURL}`);
if (fileURL instanceof URL) {
	console.info(`File URL protocol: ${fileURL.protocol}`);
	console.info(`File URL pathname: ${fileURL.pathname}`);
}

// ==================== WHICH & RESOLVE ====================
console.info('\n🔍 WHICH & RESOLVE');
const bunPath = Bun.which('bun');
const nodePath = Bun.which('node');
console.info(`Bun Path: ${bunPath || 'Not found'}`);
console.info(`Node Path: ${nodePath || 'Not found'}`);

// Bun.which with custom PATH
const customPathLs = Bun.which('ls', {
	PATH: '/usr/local/bin:/usr/bin:/bin'
});
console.info(`ls (custom PATH): ${customPathLs || 'Not found'}`);

// Bun.which with cwd
const cwdLs = Bun.which('ls', {
	cwd: '/tmp',
	PATH: ''
});
console.info(`ls (cwd=/tmp, empty PATH): ${cwdLs || 'null (not found)'}`);

try {
	const resolvedPath = Bun.resolveSync('./data/test.db', import.meta.dir);
	console.info(`Resolved Path: ${resolvedPath}`);
} catch {
	const resolvedPath = Bun.resolveSync('./package.json', import.meta.dir);
	console.info(`Resolved Path (fallback): ${resolvedPath}`);
}

// ==================== STRING UTILITIES ====================
console.info('\n📏 STRING UTILITIES');

// Bun.escapeHTML() - accepts string, object, number, boolean
const htmlString = '<script>alert("xss")</script>';
const escapedString = Bun.escapeHTML(htmlString);
const escapedNumber = Bun.escapeHTML(42);
const escapedBoolean = Bun.escapeHTML(true);
const escapedObject = Bun.escapeHTML({ key: '<value>' });
console.info(`Original: ${htmlString}`);
console.info(`Escaped (string): ${escapedString}`);
console.info(`Escaped (number): ${escapedNumber}`);
console.info(`Escaped (boolean): ${escapedBoolean}`);
console.info(`Escaped (object): ${escapedObject}`);

// Bun.stripANSI()
const ansiString = '\u001b[31mRed Text\u001b[0m';
const stripped = Bun.stripANSI(ansiString);
console.info(`ANSI String: ${ansiString}`);
console.info(`Stripped: ${stripped}`);

// Bun.stringWidth() - with options
const emojiString = '🚀 Hello 🌍';
const plainWidth = Bun.stringWidth(emojiString);
const ansiWidth = Bun.stringWidth('\u001b[31mhello\u001b[0m');
const ansiWidthCounted = Bun.stringWidth('\u001b[31mhello\u001b[0m', { countAnsiEscapeCodes: true });
const ambiguousNarrow = Bun.stringWidth('🚀', { ambiguousIsNarrow: true });
const ambiguousWide = Bun.stringWidth('🚀', { ambiguousIsNarrow: false });

console.info(`String: ${emojiString}`);
console.info(`Width (default): ${plainWidth}`);
console.info(`ANSI Width (ignored): ${ansiWidth}`);
console.info(`ANSI Width (counted): ${ansiWidthCounted}`);
console.info(`Emoji Width (narrow): ${ambiguousNarrow}`);
console.info(`Emoji Width (wide): ${ambiguousWide}`);

// ==================== COMPRESSION ====================
console.info('\n🗜️  COMPRESSION');
const originalData = JSON.stringify({ nfl: { chiefs: -105, eagles: -115 } });
const originalBuffer = new TextEncoder().encode(originalData);

// Gzip with options
const gzipped = Bun.gzipSync(originalBuffer);
const gzippedLevel = Bun.gzipSync(originalBuffer, { level: 9 }); // Maximum compression
const gunzipped = Bun.gunzipSync(gzipped);
console.info(`Original: ${originalBuffer.length} bytes`);
console.info(`Gzipped (default): ${gzipped.length} bytes`);
console.info(`Gzipped (level 9): ${gzippedLevel.length} bytes`);
console.info(`Gunzipped: ${gunzipped.length} bytes ✅`);

// Deflate with options
const deflated = Bun.deflateSync(originalBuffer);
const deflatedLevel = Bun.deflateSync(originalBuffer, { level: 9 });
const inflated = Bun.inflateSync(deflated);
console.info(`Deflated (default): ${deflated.length} bytes`);
console.info(`Deflated (level 9): ${deflatedLevel.length} bytes`);
console.info(`Inflated: ${inflated.length} bytes ✅`);

// Zstd with level option
const zstdCompressed = Bun.zstdCompressSync(originalBuffer);
const zstdCompressedLevel = Bun.zstdCompressSync(originalBuffer, { level: 6 });
const zstdDecompressed = Bun.zstdDecompressSync(zstdCompressed);
console.info(`Zstd Compressed (default): ${zstdCompressed.length} bytes`);
console.info(`Zstd Compressed (level 6): ${zstdCompressedLevel.length} bytes`);
console.info(`Zstd Decompressed: ${zstdDecompressed.length} bytes ✅`);

// Async Zstd
(async () => {
	const zstdAsync = await Bun.zstdCompress(originalBuffer);
	const zstdDecompressedAsync = await Bun.zstdDecompress(zstdAsync);
	console.info(`Zstd Async Compressed: ${zstdAsync.length} bytes`);
	console.info(`Zstd Async Decompressed: ${zstdDecompressedAsync.length} bytes ✅`);
})();

// ==================== INSPECT ====================
console.info('\n🔍 INSPECT');
const testObject = {
	league: 'nfl',
	markets: [
		{ team: 'chiefs', odds: -105 },
		{ team: 'eagles', odds: -115 }
	],
	profit_pct: 0.042
};

console.info('\nStandard Inspect:');
console.info(Bun.inspect(testObject));

console.info('\nTable Inspect:');
Bun.inspect.table([testObject], ['league', 'profit_pct']);

// Custom inspect
const customObject = {
	markets: 47,
	avg_profit: 0.042,
	[Bun.inspect.custom]: () => {
		return `ArbitrageData {
  markets: 47,
  avg_profit: 4.2%,
  value: $1.25M
}`;
	}
};

console.info('\nCustom Inspect:');
console.info(Bun.inspect(customObject));

// ==================== DEEP EQUALS ====================
console.info('\n⚖️  DEEP EQUALS');
const obj1 = { a: 1, b: { c: 2 } };
const obj2 = { a: 1, b: { c: 2 } };
const obj3 = { a: 1, b: { c: 3 } };

console.info(`obj1 === obj2: ${Bun.deepEquals(obj1, obj2)}`); // true
console.info(`obj1 === obj3: ${Bun.deepEquals(obj1, obj3)}`); // false

// Strict mode
const a = { entries: [1, 2] };
const b = { entries: [1, 2], extra: undefined };
console.info(`Non-strict: ${Bun.deepEquals(a, b)}`); // true
console.info(`Strict: ${Bun.deepEquals(a, b, true)}`); // false

// Strict mode examples
console.info(`Strict undefined: ${Bun.deepEquals({}, { a: undefined }, true)}`); // false
console.info(`Strict array undefined: ${Bun.deepEquals(['asdf'], ['asdf', undefined], true)}`); // false

// ==================== SLEEP ====================
console.info('\n⏱️  SLEEP');
async function demonstrateSleep() {
	// Sleep with milliseconds
	const start1 = Bun.nanoseconds();
	await Bun.sleep(10); // 10ms
	const end1 = Bun.nanoseconds();
	console.info(`Sleep (ms) Duration: ${((end1 - start1) / 1_000_000).toFixed(2)}ms`);
	
	// Sleep with Date object
	const futureDate = new Date(Date.now() + 10);
	const start2 = Bun.nanoseconds();
	await Bun.sleep(futureDate);
	const end2 = Bun.nanoseconds();
	console.info(`Sleep (Date) Duration: ${((end2 - start2) / 1_000_000).toFixed(2)}ms`);
}

// Synchronous sleep
const syncStart = Bun.nanoseconds();
Bun.sleepSync(5); // 5ms synchronous sleep
const syncEnd = Bun.nanoseconds();
console.info(`SleepSync Duration: ${((syncEnd - syncStart) / 1_000_000).toFixed(2)}ms`);

// ==================== PEEK ====================
console.info('\n👁️  PEEK');
async function demonstratePeek() {
	const fulfilledPromise = Promise.resolve({ data: 'peeked' });
	const peeked = Bun.peek(fulfilledPromise);
	console.info(`Peeked Value: ${JSON.stringify(peeked)}`);
	
	// peek.status()
	const fulfilledStatus = Bun.peek.status(fulfilledPromise);
	const pendingPromise = new Promise(() => {});
	const pendingStatus = Bun.peek.status(pendingPromise);
	const rejectedPromise = Promise.reject(new Error('test error'));
	const rejectedStatus = Bun.peek.status(rejectedPromise);
	
	console.info(`Fulfilled Status: ${fulfilledStatus}`);
	console.info(`Pending Status: ${pendingStatus}`);
	console.info(`Rejected Status: ${rejectedStatus}`);
	
	// Peek non-promise value
	const nonPromise = Bun.peek(42);
	console.info(`Peek Non-Promise: ${nonPromise}`);
}

// ==================== READABLE STREAM TO * ====================
console.info('\n📡 READABLE STREAM TO *');
async function demonstrateStreams() {
	const testData = { nfl: { chiefs: -105 } };
	const stream1 = new ReadableStream({
		start(c) {
			c.enqueue(new TextEncoder().encode(JSON.stringify(testData)));
			c.close();
		}
	});
	const stream2 = new ReadableStream({
		start(c) {
			c.enqueue(new TextEncoder().encode(JSON.stringify(testData)));
			c.close();
		}
	});
	const stream3 = new ReadableStream({
		start(c) {
			c.enqueue(new TextEncoder().encode(JSON.stringify(testData)));
			c.close();
		}
	});
	const stream4 = new ReadableStream({
		start(c) {
			c.enqueue(new TextEncoder().encode(JSON.stringify(testData)));
			c.close();
		}
	});
	const stream5 = new ReadableStream({
		start(c) {
			c.enqueue(new TextEncoder().encode(JSON.stringify(testData)));
			c.close();
		}
	});

	const [arrayBuffer, blob, json, text, bytes] = await Promise.all([
		Bun.readableStreamToArrayBuffer(stream1),
		Bun.readableStreamToBlob(stream2),
		Bun.readableStreamToJSON(stream3),
		Bun.readableStreamToText(stream4),
		Bun.readableStreamToBytes(stream5)
	]);

	console.info(`ArrayBuffer: ${arrayBuffer.byteLength} bytes`);
	console.info(`Blob: ${blob.size} bytes`);
	console.info(`JSON: ${JSON.stringify(json)}`);
	console.info(`Text: ${text.substring(0, 50)}...`);
	console.info(`Bytes: ${bytes.length} bytes`);
}

// ==================== SERIALIZE & DESERIALIZE ====================
console.info('\n💾 SERIALIZE & DESERIALIZE');
const dataToSerialize = {
	league: 'nfl',
	markets: [{ team: 'chiefs', odds: -105 }],
	timestamp: Date.now()
};

const serialized = serialize(dataToSerialize);
const deserialized = deserialize(serialized);

console.info(`Original: ${JSON.stringify(dataToSerialize).length} bytes`);
console.info(`Serialized: ${serialized.byteLength} bytes`);
console.info(`Deserialized: ${JSON.stringify(deserialized)}`);
console.info(`Deep Equals: ${Bun.deepEquals(dataToSerialize, deserialized)}`);

// ==================== MEMORY ESTIMATION ====================
console.info('\n💭 MEMORY ESTIMATION');
const largeObject = {
	markets: Array(1000).fill(0).map((_, i) => ({
		id: i,
		team: `team-${i}`,
		odds: -100 + i
	}))
};

const memoryEstimate = estimateShallowMemoryUsageOf(largeObject);
console.info(`Memory Estimate: ${memoryEstimate} bytes (${(memoryEstimate / 1024).toFixed(2)} KB)`);

// ==================== OPEN IN EDITOR ====================
console.info('\n📝 OPEN IN EDITOR');
// Bun.openInEditor can open files by path or URL
// Bun.openInEditor(import.meta.url); // Opens current file
// Bun.openInEditor('./package.json'); // Opens package.json
console.info('openInEditor available (uncomment to test)');

// ==================== COMPREHENSIVE DEMO ====================
async function runAllDemos() {
	await demonstrateSleep();
	await demonstratePeek();
	await demonstrateStreams();
}

runAllDemos().then(() => {
	console.info('\n✅ ALL BUN RUNTIME APIs DEMONSTRATED');
	console.info('═'.repeat(60));
	console.info('\n📊 API SUMMARY:');
	console.info(`  ✅ Bun.version: ${Bun.version}`);
	console.info(`  ✅ Bun.revision: ${Bun.revision}`);
	console.info(`  ✅ Bun.env: ${Object.keys(Bun.env).length} variables`);
	console.info(`  ✅ Bun.main: ${Bun.main}`);
	console.info(`  ✅ Bun.sleep() / Bun.sleepSync()`);
	console.info(`  ✅ Bun.which()`);
	console.info(`  ✅ Bun.randomUUIDv7()`);
	console.info(`  ✅ Bun.peek()`);
	console.info(`  ✅ Bun.openInEditor()`);
	console.info(`  ✅ Bun.deepEquals()`);
	console.info(`  ✅ Bun.escapeHTML()`);
	console.info(`  ✅ Bun.stringWidth()`);
	console.info(`  ✅ Bun.fileURLToPath() / Bun.pathToFileURL()`);
	console.info(`  ✅ Bun.gzipSync() / Bun.gunzipSync()`);
	console.info(`  ✅ Bun.deflateSync() / Bun.inflateSync()`);
	console.info(`  ✅ Bun.zstdCompressSync() / Bun.zstdDecompressSync()`);
	console.info(`  ✅ Bun.inspect() / Bun.inspect.table()`);
	console.info(`  ✅ Bun.inspect.custom`);
	console.info(`  ✅ Bun.nanoseconds()`);
	console.info(`  ✅ Bun.readableStreamTo*()`);
	console.info(`  ✅ Bun.resolveSync()`);
	console.info(`  ✅ Bun.stripANSI()`);
	console.info(`  ✅ serialize() / deserialize()`);
	console.info(`  ✅ estimateShallowMemoryUsageOf()`);
	console.info('\n🎯 ALL APIs COVERED!');
});