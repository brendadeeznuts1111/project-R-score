#!/usr/bin/env bun
/**
 * @dynamic-spy/kit v9.0 - Bun Native Tooling Demo
 * 
 * Demonstrates all Bun native APIs used in the enhanced system:
 * - Bun.peek() - Synchronous promise peeking
 * - Bun.sqlite - Pattern and route caching
 * - Bun.readableStreamTo* - Streaming
 * - Bun.gzipSync()/gunzipSync() - Compression
 * - Bun.hash.rapidhash() - Fast hashing (2x faster)
 * - Bun.semver - Version checking
 * - Bun.main - Entry point detection
 * - Bun.argv - CLI argument parsing
 * - Bun.spawn() - Subprocess execution
 * 
 * Usage:
 *   bun run examples/bun-native-tooling-demo.ts
 *   bun run examples/bun-native-tooling-demo.ts --benchmark
 */

import { hash, peek, gzipSync, gunzipSync, semver, spawn } from "bun";
import { Database } from "bun:sqlite";

// =============================================================================
// 1. Bun.hash.rapidhash() - 2x faster than city/metro
// =============================================================================
function demoRapidHash() {
	console.log("=".repeat(60));
	console.log("1. Bun.hash.rapidhash() - Ultra-fast 64-bit hashing");
	console.log("=".repeat(60));

	// One-liner summary:
	const h = hash.rapidhash("key"); // 9166712279701818032n — 2× faster than city/metro, 64-bit non-crypto

	console.log(`\nOne-line summary:`);
	console.log(`  const h = hash.rapidhash("key"); // ${h}n`);
	console.log(`\nUse as high-speed key for hash maps, bloom filters, or checksums.`);

	// Benchmark
	const iterations = 1_000_000;
	const start = performance.now();
	for (let i = 0; i < iterations; i++) {
		hash.rapidhash(`key-${i}`);
	}
	const duration = performance.now() - start;

	console.log(`\n📊 Benchmark: ${iterations.toLocaleString()} hashes in ${duration.toFixed(2)}ms`);
	console.log(`   Throughput: ${((iterations / duration) * 1000).toFixed(0)} hashes/sec`);
}

// =============================================================================
// 2. Bun.peek() - Synchronous promise peeking
// =============================================================================
async function demoPeek() {
	console.log("\n" + "=".repeat(60));
	console.log("2. Bun.peek() - Synchronous promise peeking");
	console.log("=".repeat(60));

	// Create a promise
	const promise = new Promise<string>((resolve) => {
		setTimeout(() => resolve("Hello from promise!"), 100);
	});

	// Peek before resolution
	const beforePeek = peek(promise);
	console.log(`\nBefore resolution: peek(promise) === promise? ${beforePeek === promise}`);

	// Wait for resolution
	await promise;

	// Peek after resolution
	const afterPeek = peek(promise);
	console.log(`After resolution: peek(promise) = "${afterPeek}"`);

	console.log(`\n💡 Use case: Fast cache lookups in hot paths without await overhead`);
}

// =============================================================================
// 3. Bun.sqlite - Pattern and route caching
// =============================================================================
function demoSqlite() {
	console.log("\n" + "=".repeat(60));
	console.log("3. Bun.sqlite - Pattern and route caching");
	console.log("=".repeat(60));

	// Create in-memory database
	const db = new Database(":memory:");

	// Create schema
	db.exec(`
		CREATE TABLE patterns (
			id TEXT PRIMARY KEY,
			pathname TEXT NOT NULL,
			hostname TEXT,
			priority INTEGER DEFAULT 50,
			hash TEXT NOT NULL
		);
		CREATE INDEX idx_priority ON patterns(priority DESC);
	`);

	// Insert patterns
	const insert = db.prepare(`
		INSERT INTO patterns (id, pathname, hostname, priority, hash)
		VALUES (?, ?, ?, ?, ?)
	`);

	const patterns = [
		{ id: "FEED_X2", pathname: "/feed/:bookie/:sport/*", hostname: "feed.arbitrage.live", priority: 1350 },
		{ id: "FEED_X3", pathname: "/live/:event/:odds", hostname: "*.feed.arbitrage.live", priority: 1320 },
		{ id: "FEED_X4", pathname: "/api/v3/markets/:marketId/odds", hostname: "api.arbitrage.live", priority: 1300 },
	];

	const insertMany = db.transaction((patterns: typeof patterns[0][]) => {
		for (const p of patterns) {
			const h = hash.rapidhash(`${p.id}:${p.pathname}`).toString();
			insert.run(p.id, p.pathname, p.hostname, p.priority, h);
		}
	});

	const start = performance.now();
	insertMany(patterns);
	const insertTime = performance.now() - start;

	console.log(`\n✅ Inserted ${patterns.length} patterns in ${insertTime.toFixed(2)}ms`);

	// Query patterns
	const queryStart = performance.now();
	const results = db.prepare(`SELECT * FROM patterns ORDER BY priority DESC`).all();
	const queryTime = performance.now() - queryStart;

	console.log(`✅ Queried ${results.length} patterns in ${queryTime.toFixed(4)}ms`);
	console.log(`\n📋 Patterns by priority:`);
	for (const r of results as any[]) {
		console.log(`   ${r.id}: priority=${r.priority}, pathname=${r.pathname}`);
	}

	db.close();
}

// =============================================================================
// 4. Bun.gzipSync()/gunzipSync() - Compression
// =============================================================================
function demoCompression() {
	console.log("\n" + "=".repeat(60));
	console.log("4. Bun.gzipSync()/gunzipSync() - Compression");
	console.log("=".repeat(60));

	// Sample JSON data
	const data = JSON.stringify({
		patterns: Array.from({ length: 100 }, (_, i) => ({
			id: `PATTERN_${i}`,
			pathname: `/api/v${i % 3 + 1}/markets/:id`,
			priority: 1000 + i
		}))
	});

	const originalSize = new TextEncoder().encode(data).length;

	// Compress
	const compressStart = performance.now();
	const compressed = gzipSync(new TextEncoder().encode(data));
	const compressTime = performance.now() - compressStart;

	const compressedSize = compressed.length;
	const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);

	console.log(`\n📊 Compression results:`);
	console.log(`   Original: ${originalSize.toLocaleString()} bytes`);
	console.log(`   Compressed: ${compressedSize.toLocaleString()} bytes`);
	console.log(`   Ratio: ${ratio}% smaller`);
	console.log(`   Time: ${compressTime.toFixed(2)}ms`);

	// Decompress
	const decompressStart = performance.now();
	const decompressed = gunzipSync(compressed);
	const decompressTime = performance.now() - decompressStart;

	const decompressedData = new TextDecoder().decode(decompressed);
	const isValid = decompressedData === data;

	console.log(`\n✅ Decompressed in ${decompressTime.toFixed(2)}ms (valid: ${isValid})`);
}

// =============================================================================
// 5. Bun.semver - Version checking
// =============================================================================
function demoSemver() {
	console.log("\n" + "=".repeat(60));
	console.log("5. Bun.semver - Version checking");
	console.log("=".repeat(60));

	const versions = [
		{ version: "1.0.0", range: ">=1.0.0" },
		{ version: "2.4.1", range: ">=2.0.0" },
		{ version: "1.5.0", range: ">=2.0.0" },
		{ version: "3.0.0-beta.1", range: ">=2.0.0" },
	];

	console.log(`\n📋 Version compatibility checks:`);
	for (const { version, range } of versions) {
		const satisfies = semver.satisfies(version, range);
		const status = satisfies ? "✅" : "❌";
		console.log(`   ${status} ${version} satisfies "${range}": ${satisfies}`);
	}

	// Order comparison
	const order = semver.order("1.0.0", "2.0.0");
	console.log(`\n📊 semver.order("1.0.0", "2.0.0") = ${order} (negative = first is older)`);
}

// =============================================================================
// 6. Bun.main & Bun.argv - Entry point and CLI
// =============================================================================
function demoMainAndArgv() {
	console.log("\n" + "=".repeat(60));
	console.log("6. Bun.main & Bun.argv - Entry point detection & CLI");
	console.log("=".repeat(60));

	const isMainEntry = Bun.main === import.meta.path;
	const args = Bun.argv.slice(2);

	console.log(`\n📋 Entry point detection:`);
	console.log(`   Bun.main: ${Bun.main}`);
	console.log(`   import.meta.path: ${import.meta.path}`);
	console.log(`   Is main entry: ${isMainEntry}`);

	console.log(`\n📋 CLI arguments (Bun.argv):`);
	console.log(`   Full argv: ${JSON.stringify(Bun.argv)}`);
	console.log(`   User args: ${JSON.stringify(args)}`);

	// Parse flags
	const hasBenchmark = args.includes("--benchmark");
	const hasVerbose = args.includes("--verbose") || args.includes("-v");
	console.log(`\n📋 Parsed flags:`);
	console.log(`   --benchmark: ${hasBenchmark}`);
	console.log(`   --verbose: ${hasVerbose}`);
}

// =============================================================================
// 7. Bun.spawn() - Subprocess execution
// =============================================================================
async function demoSpawn() {
	console.log("\n" + "=".repeat(60));
	console.log("7. Bun.spawn() - Subprocess execution");
	console.log("=".repeat(60));

	// Run a simple command
	const proc = spawn({
		cmd: ["echo", "Hello from Bun.spawn()!"],
		stdout: "pipe"
	});

	const output = await Bun.readableStreamToText(proc.stdout);
	await proc.exited;

	console.log(`\n📋 Subprocess output: ${output.trim()}`);

	// Run bun version
	const bunProc = spawn({
		cmd: ["bun", "--version"],
		stdout: "pipe"
	});

	const bunVersion = await Bun.readableStreamToText(bunProc.stdout);
	await bunProc.exited;

	console.log(`📋 Bun version (via spawn): ${bunVersion.trim()}`);
}

// =============================================================================
// 8. Bun.readableStreamTo* - Streaming
// =============================================================================
async function demoStreaming() {
	console.log("\n" + "=".repeat(60));
	console.log("8. Bun.readableStreamTo* - Streaming");
	console.log("=".repeat(60));

	// Create a stream from a large string
	const largeData = "x".repeat(1024 * 1024); // 1MB
	const blob = new Blob([largeData]);
	const stream = blob.stream();

	const start = performance.now();
	const text = await Bun.readableStreamToText(stream);
	const duration = performance.now() - start;

	console.log(`\n📊 Streamed 1MB in ${duration.toFixed(2)}ms`);
	console.log(`   Data length: ${text.length.toLocaleString()} chars`);
	console.log(`   Throughput: ${((text.length / duration) * 1000 / 1024 / 1024).toFixed(2)} MB/s`);

	// ArrayBuffer streaming
	const blob2 = new Blob([new Uint8Array(1024 * 100)]); // 100KB
	const stream2 = blob2.stream();

	const abStart = performance.now();
	const arrayBuffer = await Bun.readableStreamToArrayBuffer(stream2);
	const abDuration = performance.now() - abStart;

	console.log(`\n📊 Streamed 100KB to ArrayBuffer in ${abDuration.toFixed(2)}ms`);
	console.log(`   Buffer size: ${arrayBuffer.byteLength.toLocaleString()} bytes`);
}

// =============================================================================
// 9. Comprehensive Benchmark
// =============================================================================
async function runBenchmark() {
	console.log("\n" + "=".repeat(60));
	console.log("🏁 COMPREHENSIVE BENCHMARK");
	console.log("=".repeat(60));

	const results: { name: string; ops: number; time: number }[] = [];

	// Rapid hash benchmark
	const hashIterations = 1_000_000;
	const hashStart = performance.now();
	for (let i = 0; i < hashIterations; i++) {
		hash.rapidhash(`key-${i}`);
	}
	const hashTime = performance.now() - hashStart;
	results.push({ name: "rapidhash", ops: hashIterations, time: hashTime });

	// SQLite benchmark
	const db = new Database(":memory:");
	db.exec(`CREATE TABLE bench (id INTEGER PRIMARY KEY, data TEXT)`);
	const insert = db.prepare(`INSERT INTO bench (data) VALUES (?)`);
	
	const sqliteIterations = 10_000;
	const sqliteStart = performance.now();
	const insertMany = db.transaction(() => {
		for (let i = 0; i < sqliteIterations; i++) {
			insert.run(`data-${i}`);
		}
	});
	insertMany();
	const sqliteTime = performance.now() - sqliteStart;
	results.push({ name: "sqlite inserts", ops: sqliteIterations, time: sqliteTime });
	db.close();

	// Compression benchmark
	const compressData = new TextEncoder().encode("x".repeat(10000));
	const compressIterations = 1000;
	const compressStart = performance.now();
	for (let i = 0; i < compressIterations; i++) {
		gzipSync(compressData);
	}
	const compressTime = performance.now() - compressStart;
	results.push({ name: "gzipSync", ops: compressIterations, time: compressTime });

	// Print results
	console.log("\n📊 Benchmark Results:\n");
	console.log("Operation".padEnd(20) + "Ops".padStart(12) + "Time (ms)".padStart(12) + "Ops/sec".padStart(15));
	console.log("-".repeat(59));
	
	for (const r of results) {
		const opsPerSec = Math.floor((r.ops / r.time) * 1000);
		console.log(
			r.name.padEnd(20) +
			r.ops.toLocaleString().padStart(12) +
			r.time.toFixed(2).padStart(12) +
			opsPerSec.toLocaleString().padStart(15)
		);
	}
}

// =============================================================================
// Main
// =============================================================================
async function main() {
	console.log("\n⚡ Bun Native Tooling Demo - @dynamic-spy/kit v9.0\n");
	console.log(`Bun version: ${Bun.version}`);
	console.log(`Platform: ${process.platform} ${process.arch}`);

	const args = Bun.argv.slice(2);
	const runBench = args.includes("--benchmark");

	// Run demos
	demoRapidHash();
	await demoPeek();
	demoSqlite();
	demoCompression();
	demoSemver();
	demoMainAndArgv();
	await demoSpawn();
	await demoStreaming();

	if (runBench) {
		await runBenchmark();
	}

	console.log("\n" + "=".repeat(60));
	console.log("✅ All demos complete!");
	console.log("=".repeat(60) + "\n");
}

if (import.meta.main) {
	main().catch(console.error);
}

