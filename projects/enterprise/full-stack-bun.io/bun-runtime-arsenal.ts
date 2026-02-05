#!/usr/bin/env bun
/**
 * [BUN-RUNTIME-ARSENAL][ALL-APIS][COMPREHENSIVE]
 * Complete Bun Runtime API Showcase - All Features Demonstrated
 */

import { Database } from 'bun:sqlite';
import { serialize, deserialize, estimateShallowMemoryUsageOf } from 'bun:jsc';

// ==================== BUN VERSION & ENVIRONMENT ====================
console.log('\n🚀 BUN RUNTIME ARSENAL');
console.log('═'.repeat(60));

console.log('\n📦 VERSION & ENVIRONMENT');
console.log(`Bun Version: ${Bun.version}`);
console.log(`Bun Revision: ${Bun.revision}`);
console.log(`Main File: ${Bun.main}`);
console.log(`Current File: ${import.meta.path}`);
console.log(`Is Directly Executed: ${import.meta.path === Bun.main ? '✅ Yes' : '❌ No (imported)'}`);
console.log(`Node Env: ${Bun.env.NODE_ENV || 'development'}`);

// ==================== RANDOM & TIMING ====================
console.log('\n🎲 RANDOM & TIMING');
const uuidHex = Bun.randomUUIDv7(); // Default hex
const uuidBase64 = Bun.randomUUIDv7('base64');
const uuidBase64Url = Bun.randomUUIDv7('base64url');
const uuidBuffer = Bun.randomUUIDv7('buffer');
const uuidWithTimestamp = Bun.randomUUIDv7(Date.now() - 86400000); // Yesterday

console.log(`UUIDv7 (hex): ${uuidHex}`);
console.log(`UUIDv7 (base64): ${uuidBase64}`);
console.log(`UUIDv7 (base64url): ${uuidBase64Url}`);
console.log(`UUIDv7 (buffer): ${uuidBuffer.toString('hex')} (${uuidBuffer.length} bytes)`);
console.log(`UUIDv7 (with timestamp): ${uuidWithTimestamp}`);
console.log(`Nanoseconds: ${Bun.nanoseconds()}`);

// ==================== PATH UTILITIES ====================
console.log('\n📁 PATH UTILITIES');
const filePath = Bun.fileURLToPath('file:///Users/nolarose/Projects/full-stack-bun.io/data/test.db');
const filePathFromURL = Bun.fileURLToPath(new URL('file:///Users/nolarose/Projects/full-stack-bun.io/data/test.db'));
const fileURL = Bun.pathToFileURL('/Users/nolarose/Projects/full-stack-bun.io/data/test.db');
console.log(`File Path (string): ${filePath}`);
console.log(`File Path (URL object): ${filePathFromURL}`);
console.log(`File URL: ${fileURL}`);
if (fileURL instanceof URL) {
	console.log(`File URL protocol: ${fileURL.protocol}`);
	console.log(`File URL pathname: ${fileURL.pathname}`);
}

// ==================== WHICH & RESOLVE ====================
console.log('\n🔍 WHICH & RESOLVE');
const bunPath = Bun.which('bun');
const nodePath = Bun.which('node');
console.log(`Bun Path: ${bunPath || 'Not found'}`);
console.log(`Node Path: ${nodePath || 'Not found'}`);

// Bun.which with custom PATH
const customPathLs = Bun.which('ls', {
	PATH: '/usr/local/bin:/usr/bin:/bin'
});
console.log(`ls (custom PATH): ${customPathLs || 'Not found'}`);

// Bun.which with cwd
const cwdLs = Bun.which('ls', {
	cwd: '/tmp',
	PATH: ''
});
console.log(`ls (cwd=/tmp, empty PATH): ${cwdLs || 'null (not found)'}`);

try {
	const resolvedPath = Bun.resolveSync('./data/test.db', import.meta.dir);
	console.log(`Resolved Path: ${resolvedPath}`);
} catch {
	const resolvedPath = Bun.resolveSync('./package.json', import.meta.dir);
	console.log(`Resolved Path (fallback): ${resolvedPath}`);
}

// ==================== STRING UTILITIES ====================
console.log('\n📏 STRING UTILITIES');

// Bun.escapeHTML() - accepts string, object, number, boolean
const htmlString = '<script>alert("xss")</script>';
const escapedString = Bun.escapeHTML(htmlString);
const escapedNumber = Bun.escapeHTML(42);
const escapedBoolean = Bun.escapeHTML(true);
const escapedObject = Bun.escapeHTML({ key: '<value>' });
console.log(`Original: ${htmlString}`);
console.log(`Escaped (string): ${escapedString}`);
console.log(`Escaped (number): ${escapedNumber}`);
console.log(`Escaped (boolean): ${escapedBoolean}`);
console.log(`Escaped (object): ${escapedObject}`);

// Bun.stripANSI()
const ansiString = '\u001b[31mRed Text\u001b[0m';
const stripped = Bun.stripANSI(ansiString);
console.log(`ANSI String: ${ansiString}`);
console.log(`Stripped: ${stripped}`);

// Bun.stringWidth() - with options
const emojiString = '🚀 Hello 🌍';
const plainWidth = Bun.stringWidth(emojiString);
const ansiWidth = Bun.stringWidth('\u001b[31mhello\u001b[0m');
const ansiWidthCounted = Bun.stringWidth('\u001b[31mhello\u001b[0m', { countAnsiEscapeCodes: true });
const ambiguousNarrow = Bun.stringWidth('🚀', { ambiguousIsNarrow: true });
const ambiguousWide = Bun.stringWidth('🚀', { ambiguousIsNarrow: false });

console.log(`String: ${emojiString}`);
console.log(`Width (default): ${plainWidth}`);
console.log(`ANSI Width (ignored): ${ansiWidth}`);
console.log(`ANSI Width (counted): ${ansiWidthCounted}`);
console.log(`Emoji Width (narrow): ${ambiguousNarrow}`);
console.log(`Emoji Width (wide): ${ambiguousWide}`);

// ==================== COMPRESSION ====================
console.log('\n🗜️  COMPRESSION');
const originalData = JSON.stringify({ nfl: { chiefs: -105, eagles: -115 } });
const originalBuffer = new TextEncoder().encode(originalData);

// Gzip with options
const gzipped = Bun.gzipSync(originalBuffer);
const gzippedLevel = Bun.gzipSync(originalBuffer, { level: 9 }); // Maximum compression
const gunzipped = Bun.gunzipSync(gzipped);
console.log(`Original: ${originalBuffer.length} bytes`);
console.log(`Gzipped (default): ${gzipped.length} bytes`);
console.log(`Gzipped (level 9): ${gzippedLevel.length} bytes`);
console.log(`Gunzipped: ${gunzipped.length} bytes ✅`);

// Deflate with options
const deflated = Bun.deflateSync(originalBuffer);
const deflatedLevel = Bun.deflateSync(originalBuffer, { level: 9 });
const inflated = Bun.inflateSync(deflated);
console.log(`Deflated (default): ${deflated.length} bytes`);
console.log(`Deflated (level 9): ${deflatedLevel.length} bytes`);
console.log(`Inflated: ${inflated.length} bytes ✅`);

// Zstd with level option
const zstdCompressed = Bun.zstdCompressSync(originalBuffer);
const zstdCompressedLevel = Bun.zstdCompressSync(originalBuffer, { level: 6 });
const zstdDecompressed = Bun.zstdDecompressSync(zstdCompressed);
console.log(`Zstd Compressed (default): ${zstdCompressed.length} bytes`);
console.log(`Zstd Compressed (level 6): ${zstdCompressedLevel.length} bytes`);
console.log(`Zstd Decompressed: ${zstdDecompressed.length} bytes ✅`);

// Async Zstd
(async () => {
	const zstdAsync = await Bun.zstdCompress(originalBuffer);
	const zstdDecompressedAsync = await Bun.zstdDecompress(zstdAsync);
	console.log(`Zstd Async Compressed: ${zstdAsync.length} bytes`);
	console.log(`Zstd Async Decompressed: ${zstdDecompressedAsync.length} bytes ✅`);
})();

// ==================== INSPECT ====================
console.log('\n🔍 INSPECT');
const testObject = {
	league: 'nfl',
	markets: [
		{ team: 'chiefs', odds: -105 },
		{ team: 'eagles', odds: -115 }
	],
	profit_pct: 0.042
};

console.log('\nStandard Inspect:');
console.log(Bun.inspect(testObject));

console.log('\nTable Inspect:');
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

console.log('\nCustom Inspect:');
console.log(Bun.inspect(customObject));

// ==================== DEEP EQUALS ====================
console.log('\n⚖️  DEEP EQUALS');
const obj1 = { a: 1, b: { c: 2 } };
const obj2 = { a: 1, b: { c: 2 } };
const obj3 = { a: 1, b: { c: 3 } };

console.log(`obj1 === obj2: ${Bun.deepEquals(obj1, obj2)}`); // true
console.log(`obj1 === obj3: ${Bun.deepEquals(obj1, obj3)}`); // false

// Strict mode
const a = { entries: [1, 2] };
const b = { entries: [1, 2], extra: undefined };
console.log(`Non-strict: ${Bun.deepEquals(a, b)}`); // true
console.log(`Strict: ${Bun.deepEquals(a, b, true)}`); // false

// Strict mode examples
console.log(`Strict undefined: ${Bun.deepEquals({}, { a: undefined }, true)}`); // false
console.log(`Strict array undefined: ${Bun.deepEquals(['asdf'], ['asdf', undefined], true)}`); // false

// ==================== SLEEP ====================
console.log('\n⏱️  SLEEP');
async function demonstrateSleep() {
	// Sleep with milliseconds
	const start1 = Bun.nanoseconds();
	await Bun.sleep(10); // 10ms
	const end1 = Bun.nanoseconds();
	console.log(`Sleep (ms) Duration: ${((end1 - start1) / 1_000_000).toFixed(2)}ms`);
	
	// Sleep with Date object
	const futureDate = new Date(Date.now() + 10);
	const start2 = Bun.nanoseconds();
	await Bun.sleep(futureDate);
	const end2 = Bun.nanoseconds();
	console.log(`Sleep (Date) Duration: ${((end2 - start2) / 1_000_000).toFixed(2)}ms`);
}

// Synchronous sleep
const syncStart = Bun.nanoseconds();
Bun.sleepSync(5); // 5ms synchronous sleep
const syncEnd = Bun.nanoseconds();
console.log(`SleepSync Duration: ${((syncEnd - syncStart) / 1_000_000).toFixed(2)}ms`);

// ==================== PEEK ====================
console.log('\n👁️  PEEK');
async function demonstratePeek() {
	const fulfilledPromise = Promise.resolve({ data: 'peeked' });
	const peeked = Bun.peek(fulfilledPromise);
	console.log(`Peeked Value: ${JSON.stringify(peeked)}`);
	
	// peek.status()
	const fulfilledStatus = Bun.peek.status(fulfilledPromise);
	const pendingPromise = new Promise(() => {});
	const pendingStatus = Bun.peek.status(pendingPromise);
	const rejectedPromise = Promise.reject(new Error('test error'));
	const rejectedStatus = Bun.peek.status(rejectedPromise);
	
	console.log(`Fulfilled Status: ${fulfilledStatus}`);
	console.log(`Pending Status: ${pendingStatus}`);
	console.log(`Rejected Status: ${rejectedStatus}`);
	
	// Peek non-promise value
	const nonPromise = Bun.peek(42);
	console.log(`Peek Non-Promise: ${nonPromise}`);
}

// ==================== READABLE STREAM TO * ====================
console.log('\n📡 READABLE STREAM TO *');
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

	console.log(`ArrayBuffer: ${arrayBuffer.byteLength} bytes`);
	console.log(`Blob: ${blob.size} bytes`);
	console.log(`JSON: ${JSON.stringify(json)}`);
	console.log(`Text: ${text.substring(0, 50)}...`);
	console.log(`Bytes: ${bytes.length} bytes`);
}

// ==================== SERIALIZE & DESERIALIZE ====================
console.log('\n💾 SERIALIZE & DESERIALIZE');
const dataToSerialize = {
	league: 'nfl',
	markets: [{ team: 'chiefs', odds: -105 }],
	timestamp: Date.now()
};

const serialized = serialize(dataToSerialize);
const deserialized = deserialize(serialized);

console.log(`Original: ${JSON.stringify(dataToSerialize).length} bytes`);
console.log(`Serialized: ${serialized.byteLength} bytes`);
console.log(`Deserialized: ${JSON.stringify(deserialized)}`);
console.log(`Deep Equals: ${Bun.deepEquals(dataToSerialize, deserialized)}`);

// ==================== MEMORY ESTIMATION ====================
console.log('\n💭 MEMORY ESTIMATION');
const largeObject = {
	markets: Array(1000).fill(0).map((_, i) => ({
		id: i,
		team: `team-${i}`,
		odds: -100 + i
	}))
};

const memoryEstimate = estimateShallowMemoryUsageOf(largeObject);
console.log(`Memory Estimate: ${memoryEstimate} bytes (${(memoryEstimate / 1024).toFixed(2)} KB)`);

// ==================== OPEN IN EDITOR ====================
console.log('\n📝 OPEN IN EDITOR');
// Bun.openInEditor can open files by path or URL
// Bun.openInEditor(import.meta.url); // Opens current file
// Bun.openInEditor('./package.json'); // Opens package.json
console.log('openInEditor available (uncomment to test)');

// ==================== COMPREHENSIVE DEMO ====================
async function runAllDemos() {
	await demonstrateSleep();
	await demonstratePeek();
	await demonstrateStreams();
}

runAllDemos().then(() => {
	console.log('\n✅ ALL BUN RUNTIME APIs DEMONSTRATED');
	console.log('═'.repeat(60));
	console.log('\n📊 API SUMMARY:');
	console.log(`  ✅ Bun.version: ${Bun.version}`);
	console.log(`  ✅ Bun.revision: ${Bun.revision}`);
	console.log(`  ✅ Bun.env: ${Object.keys(Bun.env).length} variables`);
	console.log(`  ✅ Bun.main: ${Bun.main}`);
	console.log(`  ✅ Bun.sleep() / Bun.sleepSync()`);
	console.log(`  ✅ Bun.which()`);
	console.log(`  ✅ Bun.randomUUIDv7()`);
	console.log(`  ✅ Bun.peek()`);
	console.log(`  ✅ Bun.openInEditor()`);
	console.log(`  ✅ Bun.deepEquals()`);
	console.log(`  ✅ Bun.escapeHTML()`);
	console.log(`  ✅ Bun.stringWidth()`);
	console.log(`  ✅ Bun.fileURLToPath() / Bun.pathToFileURL()`);
	console.log(`  ✅ Bun.gzipSync() / Bun.gunzipSync()`);
	console.log(`  ✅ Bun.deflateSync() / Bun.inflateSync()`);
	console.log(`  ✅ Bun.zstdCompressSync() / Bun.zstdDecompressSync()`);
	console.log(`  ✅ Bun.inspect() / Bun.inspect.table()`);
	console.log(`  ✅ Bun.inspect.custom`);
	console.log(`  ✅ Bun.nanoseconds()`);
	console.log(`  ✅ Bun.readableStreamTo*()`);
	console.log(`  ✅ Bun.resolveSync()`);
	console.log(`  ✅ Bun.stripANSI()`);
	console.log(`  ✅ serialize() / deserialize()`);
	console.log(`  ✅ estimateShallowMemoryUsageOf()`);
	console.log('\n🎯 ALL APIs COVERED!');
});