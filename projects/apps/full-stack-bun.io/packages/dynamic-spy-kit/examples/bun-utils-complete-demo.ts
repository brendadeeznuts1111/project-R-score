#!/usr/bin/env bun
/**
 * @dynamic-spy/kit v9.0 - BUN UTILS COMPLETE DEMO 🛠️
 * 
 * All Bun utility functions in one comprehensive demo:
 * - Bun.version / Bun.revision / Bun.env / Bun.main
 * - Bun.sleep() / Bun.sleepSync()
 * - Bun.which()
 * - Bun.randomUUIDv7()
 * - Bun.peek() / Bun.peek.status()
 * - Bun.deepEquals()
 * - Bun.escapeHTML()
 * - Bun.stringWidth()
 * - Bun.fileURLToPath() / Bun.pathToFileURL()
 * - Bun.gzipSync() / Bun.gunzipSync()
 * - Bun.deflateSync() / Bun.inflateSync()
 * - Bun.zstdCompressSync() / Bun.zstdDecompressSync()
 * - Bun.inspect() / Bun.inspect.table()
 * - Bun.nanoseconds()
 * - Bun.readableStreamTo*()
 * - Bun.resolveSync()
 * - Bun.stripANSI()
 * - bun:jsc serialize/deserialize
 * 
 * Usage:
 *   bun run examples/bun-utils-complete-demo.ts
 */

import { peek, hash, gzipSync, gunzipSync, deflateSync, inflateSync } from "bun";
import { serialize, deserialize, estimateShallowMemoryUsageOf } from "bun:jsc";

// =============================================================================
// 1. VERSION & ENVIRONMENT
// =============================================================================
function demoVersionEnv() {
	console.log("=".repeat(60));
	console.log("1. VERSION & ENVIRONMENT");
	console.log("=".repeat(60));

	console.log(`\n📋 Runtime Info:`);
	console.log(`   Bun.version:  ${Bun.version}`);
	console.log(`   Bun.revision: ${Bun.revision.slice(0, 12)}...`);
	console.log(`   Bun.main:     ${Bun.main}`);
	console.log(`   Bun.env.PATH: ${(Bun.env.PATH || "").slice(0, 50)}...`);

	// Check if main entry
	const isMain = import.meta.path === Bun.main;
	console.log(`\n🔍 Entry Point Check:`);
	console.log(`   import.meta.path === Bun.main: ${isMain}`);
}

// =============================================================================
// 2. SLEEP FUNCTIONS
// =============================================================================
async function demoSleep() {
	console.log("\n" + "=".repeat(60));
	console.log("2. SLEEP FUNCTIONS");
	console.log("=".repeat(60));

	// Async sleep
	console.log(`\n⏱️ Bun.sleep(100) - async pause...`);
	const start = performance.now();
	await Bun.sleep(100);
	console.log(`   Slept for ${(performance.now() - start).toFixed(2)}ms`);

	// Sync sleep
	console.log(`\n⏱️ Bun.sleepSync(50) - blocking pause...`);
	const syncStart = performance.now();
	Bun.sleepSync(50);
	console.log(`   Slept for ${(performance.now() - syncStart).toFixed(2)}ms`);

	// Sleep until date
	console.log(`\n⏱️ Bun.sleep(Date) - sleep until specific time...`);
	const futureDate = new Date(Date.now() + 50);
	await Bun.sleep(futureDate);
	console.log(`   Woke up at target time!`);
}

// =============================================================================
// 3. WHICH - FIND EXECUTABLES
// =============================================================================
function demoWhich() {
	console.log("\n" + "=".repeat(60));
	console.log("3. WHICH - FIND EXECUTABLES");
	console.log("=".repeat(60));

	const executables = ["bun", "node", "git", "ls", "curl"];

	console.log(`\n📋 Finding executables:`);
	for (const exe of executables) {
		const path = Bun.which(exe);
		console.log(`   ${exe.padEnd(8)} → ${path || "not found"}`);
	}

	// Custom PATH
	const customBun = Bun.which("bun", {
		PATH: "/usr/local/bin:/opt/homebrew/bin"
	});
	console.log(`\n🔍 Custom PATH search:`);
	console.log(`   bun with custom PATH → ${customBun || "not found"}`);
}

// =============================================================================
// 4. UUID v7 - MONOTONIC & SORTABLE
// =============================================================================
function demoUUIDv7() {
	console.log("\n" + "=".repeat(60));
	console.log("4. UUID v7 - MONOTONIC & SORTABLE");
	console.log("=".repeat(60));

	// Generate UUIDs
	console.log(`\n📋 UUID v7 Generation:`);
	const uuid1 = Bun.randomUUIDv7();
	const uuid2 = Bun.randomUUIDv7();
	const uuid3 = Bun.randomUUIDv7();
	console.log(`   ${uuid1}`);
	console.log(`   ${uuid2}`);
	console.log(`   ${uuid3}`);
	console.log(`   ✅ Monotonically increasing (sortable!)`);

	// Different encodings
	console.log(`\n📋 Encoding Options:`);
	console.log(`   hex:       ${Bun.randomUUIDv7("hex")}`);
	console.log(`   base64:    ${Bun.randomUUIDv7("base64")}`);
	console.log(`   base64url: ${Bun.randomUUIDv7("base64url")}`);

	// Buffer encoding
	const buffer = Bun.randomUUIDv7("buffer");
	console.log(`   buffer:    Uint8Array(${buffer.length}) [${buffer.slice(0, 4).join(", ")}...]`);

	// Custom timestamp
	const customTime = Bun.randomUUIDv7("hex", Date.now() - 86400000);
	console.log(`\n⏱️ Custom timestamp (yesterday):`);
	console.log(`   ${customTime}`);
}

// =============================================================================
// 5. PEEK - SYNCHRONOUS PROMISE INSPECTION
// =============================================================================
async function demoPeek() {
	console.log("\n" + "=".repeat(60));
	console.log("5. PEEK - SYNCHRONOUS PROMISE INSPECTION");
	console.log("=".repeat(60));

	// Resolved promise
	const resolved = Promise.resolve("hello");
	console.log(`\n📋 Resolved Promise:`);
	console.log(`   peek(resolved) = "${peek(resolved)}"`);
	console.log(`   peek.status(resolved) = "${peek.status(resolved)}"`);

	// Pending promise
	const pending = new Promise(() => {});
	console.log(`\n📋 Pending Promise:`);
	console.log(`   peek(pending) === pending: ${peek(pending) === pending}`);
	console.log(`   peek.status(pending) = "${peek.status(pending)}"`);

	// Rejected promise
	const rejected = Promise.reject(new Error("test error"));
	rejected.catch(() => {}); // Handle to avoid unhandled rejection
	console.log(`\n📋 Rejected Promise:`);
	console.log(`   peek.status(rejected) = "${peek.status(rejected)}"`);

	// Non-promise value
	console.log(`\n📋 Non-Promise Value:`);
	console.log(`   peek(42) = ${peek(42)}`);
}

// =============================================================================
// 6. DEEP EQUALS
// =============================================================================
function demoDeepEquals() {
	console.log("\n" + "=".repeat(60));
	console.log("6. DEEP EQUALS");
	console.log("=".repeat(60));

	const obj1 = { a: 1, b: { c: 2 } };
	const obj2 = { a: 1, b: { c: 2 } };
	const obj3 = { a: 1, b: { c: 3 } };

	console.log(`\n📋 Object Comparison:`);
	console.log(`   obj1 = { a: 1, b: { c: 2 } }`);
	console.log(`   obj2 = { a: 1, b: { c: 2 } }`);
	console.log(`   obj3 = { a: 1, b: { c: 3 } }`);
	console.log(`   Bun.deepEquals(obj1, obj2) = ${Bun.deepEquals(obj1, obj2)}`);
	console.log(`   Bun.deepEquals(obj1, obj3) = ${Bun.deepEquals(obj1, obj3)}`);

	// Strict mode
	const a = { entries: [1, 2] };
	const b = { entries: [1, 2], extra: undefined };

	console.log(`\n📋 Strict Mode:`);
	console.log(`   a = { entries: [1, 2] }`);
	console.log(`   b = { entries: [1, 2], extra: undefined }`);
	console.log(`   Bun.deepEquals(a, b) = ${Bun.deepEquals(a, b)}`);
	console.log(`   Bun.deepEquals(a, b, true) = ${Bun.deepEquals(a, b, true)}`);
}

// =============================================================================
// 7. ESCAPE HTML
// =============================================================================
function demoEscapeHTML() {
	console.log("\n" + "=".repeat(60));
	console.log("7. ESCAPE HTML - 480MB/s-20GB/s");
	console.log("=".repeat(60));

	const unsafe = `<script>alert("XSS")</script> & "quotes" 'apostrophe'`;
	const escaped = Bun.escapeHTML(unsafe);

	console.log(`\n📋 HTML Escaping:`);
	console.log(`   Input:  ${unsafe}`);
	console.log(`   Output: ${escaped}`);

	// Benchmark
	const largeInput = "<div>".repeat(10000);
	const start = performance.now();
	for (let i = 0; i < 100; i++) {
		Bun.escapeHTML(largeInput);
	}
	const time = performance.now() - start;
	const throughput = (largeInput.length * 100 / time / 1000).toFixed(2);

	console.log(`\n📊 Benchmark:`);
	console.log(`   100 iterations of 50KB input`);
	console.log(`   Time: ${time.toFixed(2)}ms`);
	console.log(`   Throughput: ${throughput} MB/s`);
}

// =============================================================================
// 8. STRING WIDTH - 6,756x FASTER
// =============================================================================
function demoStringWidth() {
	console.log("\n" + "=".repeat(60));
	console.log("8. STRING WIDTH - 6,756x FASTER THAN NPM");
	console.log("=".repeat(60));

	// Basic examples from docs
	console.log(`\n📋 Basic Usage:`);
	console.log(`   Bun.stringWidth("hello") = ${Bun.stringWidth("hello")}`);
	console.log(`   Bun.stringWidth("\\u001b[31mhello\\u001b[0m") = ${Bun.stringWidth("\u001b[31mhello\u001b[0m")}`);
	console.log(`   Bun.stringWidth("\\u001b[31mhello\\u001b[0m", { countAnsiEscapeCodes: true }) = ${Bun.stringWidth("\u001b[31mhello\u001b[0m", { countAnsiEscapeCodes: true })}`);

	// Comprehensive examples
	const examples = [
		{ str: "hello", desc: "ASCII" },
		{ str: "\u001b[31mhello\u001b[0m", desc: "ANSI Red" },
		{ str: "\u001b[1m\u001b[4mBold\u001b[0m", desc: "ANSI Bold+Underline" },
		{ str: "你好世界", desc: "Chinese (wide)" },
		{ str: "こんにちは", desc: "Japanese (wide)" },
		{ str: "🎉🚀💻", desc: "Emoji" },
		{ str: "hello 你好 🎉", desc: "Mixed" },
		{ str: "├──┬──┤", desc: "Box drawing" }
	];

	console.log(`\n📊 Comprehensive Width Table:`);
	console.log(`   ${"Description".padEnd(20)} ${"String".padEnd(25)} Width  WithANSI`);
	console.log(`   ${"-".repeat(20)} ${"-".repeat(25)} ${"-----"} ${"--------"}`);
	for (const { str, desc } of examples) {
		const width = Bun.stringWidth(str);
		const withAnsi = Bun.stringWidth(str, { countAnsiEscapeCodes: true });
		const displayStr = str.length > 20 ? str.slice(0, 17) + "..." : str;
		console.log(`   ${desc.padEnd(20)} ${displayStr.padEnd(25)} ${width.toString().padStart(5)} ${withAnsi.toString().padStart(8)}`);
	}

	// Ambiguous width option
	console.log(`\n📋 Ambiguous Width (emoji handling):`);
	const ambiguous = "⚡";
	console.log(`   "⚡" ambiguousIsNarrow=true:  ${Bun.stringWidth(ambiguous, { ambiguousIsNarrow: true })}`);
	console.log(`   "⚡" ambiguousIsNarrow=false: ${Bun.stringWidth(ambiguous, { ambiguousIsNarrow: false })}`);

	// Use case: Terminal alignment
	console.log(`\n📋 Use Case - Terminal Alignment:`);
	const items = [
		{ name: "Lakers", score: 108 },
		{ name: "セルティックス", score: 112 },
		{ name: "🏀 Nuggets", score: 99 }
	];
	const maxWidth = Math.max(...items.map(i => Bun.stringWidth(i.name)));
	for (const item of items) {
		const padding = " ".repeat(maxWidth - Bun.stringWidth(item.name));
		console.log(`   ${item.name}${padding} : ${item.score}`);
	}

	// Benchmark
	console.log(`\n📊 Benchmark (6,756x faster than npm/string-width):`);
	const testStr = "hello 你好 🎉 \u001b[31mred\u001b[0m".repeat(100);
	const iterations = 10000;
	const start = performance.now();
	for (let i = 0; i < iterations; i++) {
		Bun.stringWidth(testStr);
	}
	const time = performance.now() - start;
	console.log(`   ${iterations.toLocaleString()} iterations in ${time.toFixed(2)}ms`);
	console.log(`   ${((iterations / time) * 1000).toFixed(0)} ops/sec`);
}

// =============================================================================
// 9. FILE URL CONVERSION
// =============================================================================
function demoFileURL() {
	console.log("\n" + "=".repeat(60));
	console.log("9. FILE URL CONVERSION");
	console.log("=".repeat(60));

	// Path to URL
	const path = "/Users/test/project/file.ts";
	const url = Bun.pathToFileURL(path);
	console.log(`\n📋 Path → URL:`);
	console.log(`   ${path}`);
	console.log(`   → ${url}`);

	// URL to path
	const fileUrl = new URL("file:///Users/test/project/file.ts");
	const backToPath = Bun.fileURLToPath(fileUrl);
	console.log(`\n📋 URL → Path:`);
	console.log(`   ${fileUrl}`);
	console.log(`   → ${backToPath}`);
}

// =============================================================================
// 10. COMPRESSION - GZIP/DEFLATE/ZSTD
// =============================================================================
function demoCompression() {
	console.log("\n" + "=".repeat(60));
	console.log("10. COMPRESSION - GZIP/DEFLATE/ZSTD");
	console.log("=".repeat(60));

	const data = Buffer.from("hello world! ".repeat(1000));
	console.log(`\n📋 Original: ${data.length} bytes`);

	// GZIP
	const gzipped = gzipSync(data);
	const gunzipped = gunzipSync(gzipped);
	console.log(`\n📦 GZIP:`);
	console.log(`   Compressed:   ${gzipped.length} bytes (${((1 - gzipped.length / data.length) * 100).toFixed(1)}% smaller)`);
	console.log(`   Decompressed: ${gunzipped.length} bytes ✅`);

	// DEFLATE
	const deflated = deflateSync(data);
	const inflated = inflateSync(deflated);
	console.log(`\n📦 DEFLATE:`);
	console.log(`   Compressed:   ${deflated.length} bytes (${((1 - deflated.length / data.length) * 100).toFixed(1)}% smaller)`);
	console.log(`   Decompressed: ${inflated.length} bytes ✅`);

	// ZSTD (async versions also available)
	const zstdCompressed = Bun.zstdCompressSync(data);
	const zstdDecompressed = Bun.zstdDecompressSync(zstdCompressed);
	console.log(`\n📦 ZSTD:`);
	console.log(`   Compressed:   ${zstdCompressed.length} bytes (${((1 - zstdCompressed.length / data.length) * 100).toFixed(1)}% smaller)`);
	console.log(`   Decompressed: ${zstdDecompressed.length} bytes ✅`);

	// Compression levels
	console.log(`\n📊 ZSTD Compression Levels:`);
	for (const level of [1, 6, 19]) {
		const compressed = Bun.zstdCompressSync(data, { level });
		console.log(`   Level ${level.toString().padStart(2)}: ${compressed.length} bytes`);
	}
}

// =============================================================================
// 11. INSPECT - CONSOLE.LOG AS STRING
// =============================================================================
function demoInspect() {
	console.log("\n" + "=".repeat(60));
	console.log("11. INSPECT - CONSOLE.LOG AS STRING");
	console.log("=".repeat(60));

	// Basic inspect
	const obj = { foo: "bar", nested: { baz: [1, 2, 3] } };
	console.log(`\n📋 Bun.inspect() - Objects:`);
	console.log(`   ${Bun.inspect(obj)}`);

	// TypedArray examples from docs
	console.log(`\n📋 Bun.inspect() - TypedArrays:`);
	const uint8 = new Uint8Array([1, 2, 3]);
	console.log(`   Uint8Array:   ${Bun.inspect(uint8)}`);
	
	const uint16 = new Uint16Array([256, 512, 1024]);
	console.log(`   Uint16Array:  ${Bun.inspect(uint16)}`);
	
	const float32 = new Float32Array([1.5, 2.75, 3.14159]);
	console.log(`   Float32Array: ${Bun.inspect(float32)}`);
	
	const buffer = Buffer.from("hello");
	console.log(`   Buffer:       ${Bun.inspect(buffer)}`);

	// ArrayBuffer & DataView
	const arrayBuffer = new ArrayBuffer(16);
	const dataView = new DataView(arrayBuffer);
	dataView.setFloat32(0, 1.95);
	dataView.setFloat32(4, 2.05);
	console.log(`\n📋 Bun.inspect() - Binary:`);
	console.log(`   ArrayBuffer: ${Bun.inspect(arrayBuffer)}`);
	console.log(`   DataView:    ${Bun.inspect(dataView)}`);

	// Table formatting - Basic
	console.log(`\n📋 Bun.inspect.table(tabularData):`);
	const tableData = [
		{ a: 1, b: 2, c: 3 },
		{ a: 4, b: 5, c: 6 },
		{ a: 7, b: 8, c: 9 }
	];
	console.log(Bun.inspect.table(tableData));

	// Table with custom properties
	console.log(`\n📋 Bun.inspect.table(data, ["a", "c"]) - Custom columns:`);
	console.log(Bun.inspect.table(tableData, ["a", "c"]));

	// NBA Stats table
	const nbaStats = [
		{ team: "Lakers", wins: 45, losses: 37, pct: 0.549 },
		{ team: "Celtics", wins: 64, losses: 18, pct: 0.780 },
		{ team: "Nuggets", wins: 57, losses: 25, pct: 0.695 },
		{ team: "Heat", wins: 46, losses: 36, pct: 0.561 }
	];

	console.log(`\n📋 Bun.inspect.table() - NBA Stats:`);
	console.log(Bun.inspect.table(nbaStats));

	// Table with colors option
	console.log(`\n📋 Bun.inspect.table(data, { colors: true }):`);
	console.log(Bun.inspect.table(nbaStats, { colors: true }));

	// Market odds table - Basic
	const marketOdds = [
		{ game: "Lakers-Celtics", pinnacle: 1.94, betfair: 1.92, bet365: 1.90 },
		{ game: "Nuggets-Heat", pinnacle: 2.10, betfair: 2.08, bet365: 2.05 },
		{ game: "Warriors-Suns", pinnacle: 1.85, betfair: 1.83, bet365: 1.80 }
	];

	console.log(`\n📋 Market Odds Table (Basic):`);
	console.log(Bun.inspect.table(marketOdds));

	// ==========================================================================
	// COMPREHENSIVE MARKET DATA TABLE
	// Index = 100 × (Prob_FIRST - Prob_LAST) / ((Prob_FIRST + Prob_LAST) / 2)
	// ==========================================================================
	
	// Helper: Calculate movement index
	function calcIndex(probFirst: number, probLast: number): number {
		const avg = (probFirst + probLast) / 2;
		return avg === 0 ? 0 : 100 * (probFirst - probLast) / avg;
	}

	// Helper: Odds to implied probability
	function oddsToProb(odds: number): number {
		return 1 / odds;
	}

	// Helper: Format time ago
	function timeAgo(ms: number): string {
		const secs = Math.floor(ms / 1000);
		if (secs < 60) return `${secs}s`;
		const mins = Math.floor(secs / 60);
		if (mins < 60) return `${mins}m`;
		return `${Math.floor(mins / 60)}h`;
	}

	// Comprehensive market data
	const now = Date.now();
	const comprehensiveMarkets = [
		{
			game: "LAL-BOS",
			market: "ML",
			bookie: "Pinnacle",
			price: 1.94,
			odds: "+94",
			prob: oddsToProb(1.94),
			probFirst: oddsToProb(2.10),  // Opening odds
			probLast: oddsToProb(1.94),   // Current odds
			lastChanged: now - 45000,     // 45s ago
			prevOdds: 1.98,
			changes5m: 3,
			childChanges: 7,
		},
		{
			game: "LAL-BOS",
			market: "ML",
			bookie: "Betfair",
			price: 1.92,
			odds: "+92",
			prob: oddsToProb(1.92),
			probFirst: oddsToProb(2.05),
			probLast: oddsToProb(1.92),
			lastChanged: now - 120000,    // 2m ago
			prevOdds: 1.95,
			changes5m: 2,
			childChanges: 4,
		},
		{
			game: "DEN-MIA",
			market: "Spread",
			bookie: "Pinnacle",
			price: 1.91,
			odds: "-110",
			prob: oddsToProb(1.91),
			probFirst: oddsToProb(1.87),
			probLast: oddsToProb(1.91),
			lastChanged: now - 15000,     // 15s ago
			prevOdds: 1.89,
			changes5m: 5,
			childChanges: 12,
		},
		{
			game: "DEN-MIA",
			market: "Total",
			bookie: "DraftKings",
			price: 1.95,
			odds: "-105",
			prob: oddsToProb(1.95),
			probFirst: oddsToProb(1.90),
			probLast: oddsToProb(1.95),
			lastChanged: now - 180000,    // 3m ago
			prevOdds: 1.93,
			changes5m: 1,
			childChanges: 3,
		},
		{
			game: "GSW-PHX",
			market: "ML",
			bookie: "Bet365",
			price: 2.15,
			odds: "+115",
			prob: oddsToProb(2.15),
			probFirst: oddsToProb(2.30),
			probLast: oddsToProb(2.15),
			lastChanged: now - 300000,    // 5m ago
			prevOdds: 2.20,
			changes5m: 4,
			childChanges: 9,
		}
	];

	// Build display table with all columns
	const displayTable = comprehensiveMarkets.map(m => {
		const delta = m.price - m.prevOdds;
		const index = calcIndex(m.probFirst, m.probLast);
		
		return {
			game: m.game,
			mkt: m.market,
			bookie: m.bookie,
			price: m.price.toFixed(2),
			odds: m.odds,
			prob: (m.prob * 100).toFixed(1) + "%",
			lastChg: timeAgo(now - m.lastChanged),
			delta: (delta >= 0 ? "+" : "") + delta.toFixed(2),
			"5mChg": m.changes5m,
			childChg: m.childChanges,
			index: (index >= 0 ? "+" : "") + index.toFixed(2)
		};
	});

	console.log(`\n📊 Comprehensive Market Data Table:`);
	console.log(`   Formula: Index = 100 × (Prob_FIRST - Prob_LAST) / ((Prob_FIRST + Prob_LAST) / 2)`);
	console.log(Bun.inspect.table(displayTable));

	// Summary stats table
	const summaryStats = [
		{ metric: "Total Markets", value: comprehensiveMarkets.length },
		{ metric: "Avg Changes/5m", value: (comprehensiveMarkets.reduce((a, m) => a + m.changes5m, 0) / comprehensiveMarkets.length).toFixed(1) },
		{ metric: "Total Child Changes", value: comprehensiveMarkets.reduce((a, m) => a + m.childChanges, 0) },
		{ metric: "Avg Index", value: (comprehensiveMarkets.reduce((a, m) => a + calcIndex(m.probFirst, m.probLast), 0) / comprehensiveMarkets.length).toFixed(2) },
		{ metric: "Max |Index|", value: Math.max(...comprehensiveMarkets.map(m => Math.abs(calcIndex(m.probFirst, m.probLast)))).toFixed(2) }
	];

	console.log(`\n📊 Market Summary Stats:`);
	console.log(Bun.inspect.table(summaryStats));

	// Movement alerts table
	const alerts = comprehensiveMarkets
		.filter(m => Math.abs(calcIndex(m.probFirst, m.probLast)) > 3)
		.map(m => ({
			"🚨": calcIndex(m.probFirst, m.probLast) > 0 ? "📈" : "📉",
			game: m.game,
			market: m.market,
			movement: `${(oddsToProb(2.10) * 100).toFixed(1)}% → ${(m.probLast * 100).toFixed(1)}%`,
			index: calcIndex(m.probFirst, m.probLast).toFixed(2),
			signal: calcIndex(m.probFirst, m.probLast) > 5 ? "STRONG" : "MODERATE"
		}));

	if (alerts.length > 0) {
		console.log(`\n🚨 Movement Alerts (|Index| > 3):`);
		console.log(Bun.inspect.table(alerts));
	}

	// Custom inspect symbol
	class Market {
		constructor(public id: string, public odds: number) {}
		[Bun.inspect.custom]() {
			return `Market<${this.id}: ${this.odds.toFixed(2)}>`;
		}
	}

	class ArbitrageOpportunity {
		constructor(
			public game: string,
			public bookie1: { name: string; odds: number },
			public bookie2: { name: string; odds: number },
			public profit: number
		) {}
		[Bun.inspect.custom]() {
			return `🎯 ARB: ${this.game}\n` +
				`   ${this.bookie1.name}: ${this.bookie1.odds}\n` +
				`   ${this.bookie2.name}: ${this.bookie2.odds}\n` +
				`   💰 Profit: ${(this.profit * 100).toFixed(2)}%`;
		}
	}

	const market = new Market("NBA-001", 1.95);
	const arb = new ArbitrageOpportunity(
		"Lakers-Celtics",
		{ name: "Pinnacle", odds: 2.10 },
		{ name: "Bet365", odds: 1.95 },
		0.024
	);

	console.log(`\n📋 Custom [Bun.inspect.custom]:`);
	console.log(`   ${Bun.inspect(market)}`);
	console.log(`\n   ${Bun.inspect(arb)}`);
}

// =============================================================================
// 12. NANOSECONDS - HIGH PRECISION TIMING
// =============================================================================
function demoNanoseconds() {
	console.log("\n" + "=".repeat(60));
	console.log("12. NANOSECONDS - HIGH PRECISION TIMING");
	console.log("=".repeat(60));

	const start = Bun.nanoseconds();

	// Do some work
	let sum = 0;
	for (let i = 0; i < 1000000; i++) {
		sum += i;
	}

	const end = Bun.nanoseconds();
	const durationNs = end - start;
	const durationMs = durationNs / 1_000_000;
	const durationUs = durationNs / 1_000;

	console.log(`\n📋 High-Precision Timing:`);
	console.log(`   Start: ${start.toLocaleString()} ns`);
	console.log(`   End:   ${end.toLocaleString()} ns`);
	console.log(`   Duration: ${durationNs.toLocaleString()} ns`);
	console.log(`            = ${durationUs.toFixed(2)} µs`);
	console.log(`            = ${durationMs.toFixed(4)} ms`);
}

// =============================================================================
// 13. READABLE STREAM UTILITIES
// =============================================================================
async function demoReadableStream() {
	console.log("\n" + "=".repeat(60));
	console.log("13. READABLE STREAM UTILITIES");
	console.log("=".repeat(60));

	// Create a stream
	const data = { markets: 25000, timestamp: Date.now() };
	const blob = new Blob([JSON.stringify(data)]);

	console.log(`\n📋 Stream Conversions:`);

	// To Text
	const text = await Bun.readableStreamToText(blob.stream());
	console.log(`   readableStreamToText: ${text.slice(0, 50)}...`);

	// To JSON
	const json = await Bun.readableStreamToJSON(blob.stream());
	console.log(`   readableStreamToJSON: markets=${json.markets}`);

	// To ArrayBuffer
	const arrayBuffer = await Bun.readableStreamToArrayBuffer(blob.stream());
	console.log(`   readableStreamToArrayBuffer: ${arrayBuffer.byteLength} bytes`);

	// To Bytes (Uint8Array)
	const bytes = await Bun.readableStreamToBytes(blob.stream());
	console.log(`   readableStreamToBytes: Uint8Array(${bytes.length})`);

	// To Blob
	const newBlob = await Bun.readableStreamToBlob(blob.stream());
	console.log(`   readableStreamToBlob: ${newBlob.size} bytes`);

	// To Array (chunks)
	const arr = await Bun.readableStreamToArray(blob.stream());
	console.log(`   readableStreamToArray: ${arr.length} chunks`);
}

// =============================================================================
// 14. RESOLVE SYNC - MODULE RESOLUTION
// =============================================================================
function demoResolveSync() {
	console.log("\n" + "=".repeat(60));
	console.log("14. RESOLVE SYNC - MODULE RESOLUTION");
	console.log("=".repeat(60));

	console.log(`\n📋 Module Resolution:`);

	// Resolve relative to import.meta.dir
	try {
		const selfPath = Bun.resolveSync("./bun-utils-complete-demo.ts", import.meta.dir);
		console.log(`   ./bun-utils-complete-demo.ts → ${selfPath.slice(-50)}`);
	} catch {
		console.log(`   ./bun-utils-complete-demo.ts → (not found)`);
	}

	// Resolve node module
	try {
		const bunPath = Bun.resolveSync("bun", process.cwd());
		console.log(`   bun → ${bunPath}`);
	} catch {
		console.log(`   bun → (built-in)`);
	}
}

// =============================================================================
// 15. STRIP ANSI - 6-57x FASTER
// =============================================================================
function demoStripANSI() {
	console.log("\n" + "=".repeat(60));
	console.log("15. STRIP ANSI - 6-57x FASTER THAN NPM");
	console.log("=".repeat(60));

	const colored = "\u001b[31mRed\u001b[0m \u001b[32mGreen\u001b[0m \u001b[34mBlue\u001b[0m";
	const formatted = "\u001b[1m\u001b[4mBold+Underline\u001b[0m";

	console.log(`\n📋 ANSI Stripping:`);
	console.log(`   Input:  "${colored}"`);
	console.log(`   Output: "${Bun.stripANSI(colored)}"`);
	console.log(`\n   Input:  "${formatted}"`);
	console.log(`   Output: "${Bun.stripANSI(formatted)}"`);

	// Benchmark
	const longAnsi = "\u001b[31mhello\u001b[0m".repeat(1000);
	const start = performance.now();
	for (let i = 0; i < 1000; i++) {
		Bun.stripANSI(longAnsi);
	}
	const time = performance.now() - start;
	console.log(`\n📊 Benchmark: 1000 iterations in ${time.toFixed(2)}ms`);
}

// =============================================================================
// 16. BUN:JSC - SERIALIZE/DESERIALIZE
// =============================================================================
function demoBunJSC() {
	console.log("\n" + "=".repeat(60));
	console.log("16. BUN:JSC - SERIALIZE/DESERIALIZE");
	console.log("=".repeat(60));

	// Serialize
	const obj = { markets: [1, 2, 3], timestamp: Date.now(), nested: { deep: true } };
	const serialized = serialize(obj);
	console.log(`\n📋 Serialize:`);
	console.log(`   Object: ${JSON.stringify(obj).slice(0, 50)}...`);
	console.log(`   Serialized: ArrayBuffer(${serialized.byteLength})`);

	// Deserialize
	const deserialized = deserialize(serialized);
	console.log(`\n📋 Deserialize:`);
	console.log(`   Restored: ${JSON.stringify(deserialized).slice(0, 50)}...`);
	console.log(`   Equal: ${Bun.deepEquals(obj, deserialized)}`);

	// Memory estimation
	console.log(`\n📋 Memory Estimation:`);
	console.log(`   Object: ${estimateShallowMemoryUsageOf(obj)} bytes`);
	console.log(`   Buffer(1MB): ${estimateShallowMemoryUsageOf(Buffer.alloc(1024 * 1024))} bytes`);
	console.log(`   Array(100): ${estimateShallowMemoryUsageOf(new Array(100))} bytes`);
}

// =============================================================================
// 17. OPEN IN EDITOR
// =============================================================================
function demoOpenInEditor() {
	console.log("\n" + "=".repeat(60));
	console.log("17. OPEN IN EDITOR");
	console.log("=".repeat(60));

	console.log(`\n📋 Bun.openInEditor() API:`);
	console.log(`   // Opens current file in default editor`);
	console.log(`   Bun.openInEditor(import.meta.url);`);
	console.log(`\n   // With options`);
	console.log(`   Bun.openInEditor(file, {`);
	console.log(`     editor: "vscode",  // or "subl"`);
	console.log(`     line: 10,`);
	console.log(`     column: 5`);
	console.log(`   });`);
	console.log(`\n   // Configure in bunfig.toml:`);
	console.log(`   [debug]`);
	console.log(`   editor = "code"`);
}

// =============================================================================
// MAIN
// =============================================================================
async function main() {
	console.log("\n⚡ @dynamic-spy/kit v9.0 - BUN UTILS COMPLETE DEMO 🛠️\n");

	demoVersionEnv();
	await demoSleep();
	demoWhich();
	demoUUIDv7();
	await demoPeek();
	demoDeepEquals();
	demoEscapeHTML();
	demoStringWidth();
	demoFileURL();
	demoCompression();
	demoInspect();
	demoNanoseconds();
	await demoReadableStream();
	demoResolveSync();
	demoStripANSI();
	demoBunJSC();
	demoOpenInEditor();

	console.log("\n" + "=".repeat(60));
	console.log("✅ BUN UTILS CHEAT SHEET");
	console.log("=".repeat(60));
	console.log(`
| Utility                  | Speed Boost    | Use Case               |
|--------------------------|----------------|------------------------|
| Bun.randomUUIDv7()       | Monotonic      | Database IDs           |
| Bun.peek()               | Zero await     | Hot path cache         |
| Bun.stringWidth()        | 6,756x faster  | Terminal alignment     |
| Bun.escapeHTML()         | 20 GB/s        | XSS prevention         |
| Bun.stripANSI()          | 57x faster     | Log processing         |
| Bun.zstdCompressSync()   | Best ratio     | Data storage           |
| Bun.nanoseconds()        | Sub-µs         | Precision timing       |
| Bun.inspect.table()      | Built-in       | CLI formatting         |
| serialize/deserialize    | Structured     | IPC/Storage            |

All Bun utilities → Zero dependencies → Industrial speed! 🚀
`);
}

if (import.meta.main) {
	main().catch(console.error);
}

