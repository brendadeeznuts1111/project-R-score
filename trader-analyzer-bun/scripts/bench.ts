#!/usr/bin/env bun
/**
 * @fileoverview NEXUS Benchmark Script
 * @description Comprehensive benchmarks using NEXUS utils (box, colors, table, timing)
 * 
 * @module scripts/bench
 */

import { nanoseconds } from "bun";
import { getInspectableCacheManager } from "../src/cache";
import {
	box,
	colors,
	printTable,
	formatBytes,
	formatDuration,
	formatPercent,
	timing,
	runtime,
	type TableColumn,
} from "../src/utils/bun";

const PORT = process.env.PORT || "3000";
const BASE_URL = `http://localhost:${PORT}`;

// Benchmark configuration
const CACHE_OPS = 1000;
const HTTP_OPS = 20;
const MEMORY_TEST_ENTRIES = 10_000;

// Performance targets (in milliseconds)
const TARGETS = {
	cacheGet: 0.5,
	cacheSet: 1.0,
	httpHealth: 10,
	httpOrcaStats: 20,
	httpArbitrageStatus: 30,
	memory10kEntries: 100 * 1024 * 1024, // 100MB in bytes
	compressionRatio: 0.5, // 50% compression
} as const;

interface BenchResult {
	name: string;
	avg: number;
	p50: number;
	p95: number;
	p99: number;
	min: number;
	max: number;
	ops: number;
	opsPerSecond: number; // Operations per second
	status: "pass" | "fail" | "warn";
	target?: number;
	unit?: string;
}

interface CompressionResult {
	exchange: string;
	originalSize: number;
	compressedSize: number;
	ratio: number;
	status: "pass" | "fail" | "warn";
}

// Statistics calculation
function calcStats(times: number[]): Omit<BenchResult, "name" | "status" | "target" | "unit"> {
	const sorted = [...times].sort((a, b) => a - b);
	const sum = times.reduce((a, b) => a + b, 0);
	return {
		avg: sum / times.length,
		p50: sorted[Math.floor(sorted.length * 0.5)] ?? 0,
		p95: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
		p99: sorted[Math.floor(sorted.length * 0.99)] ?? 0,
		min: sorted[0] ?? 0,
		max: sorted[sorted.length - 1] ?? 0,
		ops: times.length,
		opsPerSecond: (sum / 1_000_000_000) > 0 ? times.length / (sum / 1_000_000_000) : 0,
	};
}

function nsToMs(ns: number): string {
	return (ns / 1_000_000).toFixed(3);
}

function statusColor(status: "pass" | "fail" | "warn"): (s: string) => string {
	return status === "pass" ? colors.green : status === "fail" ? colors.red : colors.yellow;
}

function checkStatus(avgMs: number, target: number): "pass" | "fail" | "warn" {
	if (avgMs < target) return "pass";
	if (avgMs < target * 2) return "warn";
	return "fail";
}

// Banner
console.log(
	box(
		`
${colors.cyan("NEXUS")} ${colors.gray("Benchmark Suite")}

${colors.green("Runtime")}    Bun ${runtime.version}
${colors.green("Target")}     ${BASE_URL}
${colors.green("Cache Ops")}  ${CACHE_OPS.toLocaleString()}
${colors.green("HTTP Ops")}   ${HTTP_OPS}
${colors.green("Memory Test")} ${MEMORY_TEST_ENTRIES.toLocaleString()} entries
`.trim(),
		"NEXUS Bench",
	),
);

const results: BenchResult[] = [];
const compressionResults: CompressionResult[] = [];

// Performance monitoring available via timing utilities

// ============ Cache Benchmarks ============
console.log("\n" + box("Cache Operations", "Cache Benchmarks"));

const cache = getInspectableCacheManager("./data/bench-cache.db");

// Warmup (following Bun's benchmark pattern: warmup ~10% of iterations)
const warmupIterations = Math.max(10, Math.floor(CACHE_OPS / 10));
console.log(colors.gray(`  Warming up cache (${warmupIterations} iterations)...`));
for (let i = 0; i < warmupIterations; i++) {
	await cache.set(`warmup-${i}`, "polymarket", `uuid-${i}`, { warmup: true });
}

// SET benchmark
console.log(colors.gray(`  Running ${CACHE_OPS.toLocaleString()} SET operations...`));
const setTimes: number[] = [];
for (let i = 0; i < CACHE_OPS; i++) {
	const start = nanoseconds();
	await cache.set(
		`bench-key-${i}`,
		"polymarket",
		`uuid-${i}`,
		{ data: "x".repeat(500), index: i, timestamp: Date.now() },
	);
	setTimes.push(nanoseconds() - start);
}

const setStats = calcStats(setTimes);
const setAvgMs = setStats.avg / 1_000_000;
const setStatus = checkStatus(setAvgMs, TARGETS.cacheSet);
results.push({
	name: "Cache SET",
	...setStats,
	status: setStatus,
	target: TARGETS.cacheSet,
	unit: "ms",
});
const setOpsPerSec = setStats.opsPerSecond >= 1000 
	? `${(setStats.opsPerSecond / 1000).toFixed(1)}k ops/s`
	: `${setStats.opsPerSecond.toFixed(0)} ops/s`;
console.log(
	`  ${statusColor(setStatus)("SET")}  avg=${nsToMs(setStats.avg)}ms  p99=${nsToMs(setStats.p99)}ms  ${setOpsPerSec}  target=<${TARGETS.cacheSet}ms`,
);

// GET benchmark (memory + db)
console.log(colors.gray(`  Running ${CACHE_OPS.toLocaleString()} GET operations...`));
const getTimes: number[] = [];
for (let i = 0; i < CACHE_OPS; i++) {
	const start = nanoseconds();
	await cache.get(`bench-key-${i}`, "polymarket");
	getTimes.push(nanoseconds() - start);
}

const getStats = calcStats(getTimes);
const getAvgMs = getStats.avg / 1_000_000;
const getStatus = checkStatus(getAvgMs, TARGETS.cacheGet);
results.push({
	name: "Cache GET",
	...getStats,
	status: getStatus,
	target: TARGETS.cacheGet,
	unit: "ms",
});
const getOpsPerSec = getStats.opsPerSecond >= 1000 
	? `${(getStats.opsPerSecond / 1000).toFixed(1)}k ops/s`
	: `${getStats.opsPerSecond.toFixed(0)} ops/s`;
console.log(
	`  ${statusColor(getStatus)("GET")}  avg=${nsToMs(getStats.avg)}ms  p99=${nsToMs(getStats.p99)}ms  ${getOpsPerSec}  target=<${TARGETS.cacheGet}ms`,
);

// Cache stats
const cacheStats = cache.getStats();
console.log(`\n  ${colors.gray("Cache Statistics:")}`);
console.log(`    ${colors.gray("Entries:")} ${cacheStats.total.toLocaleString()}`);
console.log(`    ${colors.gray("Memory:")} ${cacheStats.memory.toLocaleString()}`);
console.log(
	`    ${colors.gray("Size:")} ${formatBytes(cacheStats.totalSize)} -> ${formatBytes(cacheStats.compressedSize)}`,
);
console.log(`    ${colors.gray("Compression:")} ${formatPercent(cacheStats.compressionRatio)}`);
console.log(`    ${colors.gray("Hit Rate:")} ${formatPercent(cacheStats.hitRate)}`);

// Compression ratio check
const compressionRatio = cacheStats.compressionRatio;
const compressionStatus = compressionRatio > TARGETS.compressionRatio ? "pass" : compressionRatio > TARGETS.compressionRatio * 0.8 ? "warn" : "fail";
compressionResults.push({
	exchange: "polymarket",
	originalSize: cacheStats.totalSize,
	compressedSize: cacheStats.compressedSize,
	ratio: compressionRatio,
	status: compressionStatus,
});

// ============ HTTP Benchmarks ============
console.log("\n" + box("HTTP Endpoints", "HTTP Benchmarks"));

async function benchEndpoint(path: string, target: number): Promise<BenchResult> {
	const times: number[] = [];
	let errors = 0;

	for (let i = 0; i < HTTP_OPS; i++) {
		const start = nanoseconds();
		try {
			const response = await fetch(`${BASE_URL}${path}`, {
				signal: AbortSignal.timeout(5000),
			});
			if (!response.ok) {
				errors++;
			}
		} catch (error) {
			errors++;
			// Use timeout as worst case
			times.push(5_000_000_000); // 5s in nanoseconds
			continue;
		}
		times.push(nanoseconds() - start);
	}

	const stats = calcStats(times);
	const avgMs = stats.avg / 1_000_000;
	const status = checkStatus(avgMs, target);

	if (errors > 0) {
		console.log(
			`  ${colors.yellow(`⚠️  ${path} - ${errors} errors out of ${HTTP_OPS} requests`)}`,
		);
	}

	return { name: `HTTP ${path}`, ...stats, status, target, unit: "ms" };
}

const endpoints = [
	{ path: "/api/health", target: TARGETS.httpHealth },
	{ path: "/api/orca/stats", target: TARGETS.httpOrcaStats },
	{ path: "/api/arbitrage/status", target: TARGETS.httpArbitrageStatus },
];

for (const { path, target } of endpoints) {
	const result = await benchEndpoint(path, target);
	results.push(result);
	console.log(
		`  ${statusColor(result.status)(path.padEnd(30))} avg=${nsToMs(result.avg)}ms  p99=${nsToMs(result.p99)}ms  target=<${target}ms`,
	);
}

// ============ Memory Benchmarks ============
console.log("\n" + box("Memory Usage", "Memory Benchmarks"));

async function getMemoryFromAPI(): Promise<{ heapUsed: number; heapTotal: number; rss: number } | null> {
	try {
		const response = await fetch(`${BASE_URL}/api/debug/memory`, {
			signal: AbortSignal.timeout(5000),
		});
		if (response.ok) {
			const data = await response.json();
			return {
				heapUsed: data.heapUsed || 0,
				heapTotal: data.heapTotal || 0,
				rss: data.rss || 0,
			};
		}
	} catch {
		// API endpoint might not be available
	}
	return null;
}

// Get baseline memory
const baselineMemory = await getMemoryFromAPI();
if (baselineMemory) {
	console.log(`  ${colors.gray("Baseline (from API):")}`);
	console.log(`    ${colors.gray("Heap Used:")} ${formatBytes(baselineMemory.heapUsed)}`);
	console.log(`    ${colors.gray("Heap Total:")} ${formatBytes(baselineMemory.heapTotal)}`);
	console.log(`    ${colors.gray("RSS:")} ${formatBytes(baselineMemory.rss)}`);
} else {
	console.log(`  ${colors.yellow("⚠️  /api/debug/memory endpoint not available, using runtime memory")}`);
}

// Fill cache with test entries
console.log(colors.gray(`  Filling cache with ${MEMORY_TEST_ENTRIES.toLocaleString()} entries...`));
const memoryStart = nanoseconds();
for (let i = 0; i < MEMORY_TEST_ENTRIES; i++) {
	await cache.set(
		`memory-test-${i}`,
		"polymarket",
		`uuid-mem-${i}`,
		{ data: "x".repeat(1000), index: i, timestamp: Date.now() },
	);
}
const memoryFillTime = nanoseconds() - memoryStart;

// Get memory after fill
const afterMemory = await getMemoryFromAPI();
const runtimeMemory = runtime.memoryFormatted();

console.log(`\n  ${colors.gray("After cache fill:")}`);
if (afterMemory) {
	console.log(`    ${colors.gray("Heap Used:")} ${formatBytes(afterMemory.heapUsed)}`);
	console.log(`    ${colors.gray("Heap Total:")} ${formatBytes(afterMemory.heapTotal)}`);
	console.log(`    ${colors.gray("RSS:")} ${formatBytes(afterMemory.rss)}`);
	
	const memoryDelta = afterMemory.heapUsed - (baselineMemory?.heapUsed || 0);
	const memoryStatus = memoryDelta < TARGETS.memory10kEntries ? "pass" : memoryDelta < TARGETS.memory10kEntries * 1.5 ? "warn" : "fail";
	
	results.push({
		name: "Memory (10k entries)",
		avg: memoryDelta,
		p50: memoryDelta,
		p95: memoryDelta,
		p99: memoryDelta,
		min: memoryDelta,
		max: memoryDelta,
		ops: 1,
		opsPerSecond: 0, // Not applicable for memory benchmarks
		status: memoryStatus,
		target: TARGETS.memory10kEntries,
		unit: "bytes",
	});
	
	console.log(`    ${colors.gray("Delta:")} ${formatBytes(memoryDelta)}  ${statusColor(memoryStatus)(memoryStatus.toUpperCase())}`);
} else {
	console.log(`    ${colors.gray("Heap Used:")} ${runtimeMemory.heapUsed}`);
	console.log(`    ${colors.gray("Heap Total:")} ${runtimeMemory.heapTotal}`);
	console.log(`    ${colors.gray("RSS:")} ${runtimeMemory.rss}`);
}

console.log(`  ${colors.gray("Fill time:")} ${formatDuration(memoryFillTime / 1_000_000)}`);

// ============ Compression by Exchange ============
console.log("\n" + box("Compression Ratios", "Compression Analysis"));

// Test compression for different exchanges
const exchanges = ["polymarket", "kalshi", "deribit"];
const testData = { data: "x".repeat(2000), nested: { deep: { value: 42 } } };

for (const exchange of exchanges) {
	const testKey = `compression-test-${exchange}`;
	await cache.set(testKey, exchange, `uuid-comp-${exchange}`, testData);
	
	const entry = await cache.get(testKey, exchange);
	if (entry) {
		const stats = cache.getStats();
		const exchangeStats = cache.getStats(); // This gets overall stats, but we can check individual entries
		
		// Get entry from DB to check compression
		const stmt = cache["db"].prepare(`
			SELECT size, compressed_size FROM cache_entries WHERE key = ? AND exchange = ?
		`);
		const row = stmt.get(testKey, exchange) as {
			size: number;
			compressed_size: number | null;
		} | null;
		
		if (row) {
			const originalSize = row.size;
			const compressedSize = row.compressed_size || originalSize;
			const ratio = compressedSize / originalSize;
			const compStatus = ratio < TARGETS.compressionRatio ? "pass" : ratio < TARGETS.compressionRatio * 1.2 ? "warn" : "fail";
			
			compressionResults.push({
				exchange,
				originalSize,
				compressedSize,
				ratio,
				status: compStatus,
			});
			
			console.log(
				`  ${exchange.padEnd(15)} ${formatBytes(originalSize)} -> ${formatBytes(compressedSize)}  ${formatPercent(ratio)}  ${statusColor(compStatus)(compStatus.toUpperCase())}`,
			);
		}
	}
}

cache.close();

// ============ Results Summary ============
console.log("\n" + box("Results Summary", "Benchmark Results"));

// Results formatted with printTable below

const tableColumns: TableColumn<BenchResult>[] = [
	{ key: "name", header: "Benchmark", width: 25 },
	{
		key: (r) => {
			const value = r.unit === "bytes" ? formatBytes(r.avg) : nsToMs(r.avg);
			return value;
		},
		header: "Avg",
		width: 12,
		align: "right",
	},
	{
		key: (r) => (r.unit === "bytes" ? formatBytes(r.p99) : nsToMs(r.p99)),
		header: "P99",
		width: 12,
		align: "right",
	},
	{
		key: (r) => {
			if (r.unit === "bytes") return "-";
			// Format ops/sec: show as "X.Xk ops/s" or "X ops/s"
			const ops = r.opsPerSecond;
			if (ops >= 1000) return `${(ops / 1000).toFixed(1)}k ops/s`;
			return `${ops.toFixed(0)} ops/s`;
		},
		header: "Ops/sec",
		width: 14,
		align: "right",
	},
	{
		key: (r) => (r.target ? (r.unit === "bytes" ? formatBytes(r.target) : `${r.target}${r.unit || "ms"}`) : "-"),
		header: "Target",
		width: 12,
		align: "right",
	},
	{
		key: (r) =>
			r.status === "pass"
				? colors.green("PASS")
				: r.status === "fail"
					? colors.red("FAIL")
					: colors.yellow("WARN"),
		header: "Status",
		width: 8,
		align: "center",
	},
];

	// Use BunUtilities for table formatting (alternative to printTable)
	printTable(results, tableColumns);
	
	// Also available via BunUtilities:
	// console.log(BunUtilities.formatTable(results.map(r => ({
	//   Benchmark: r.name,
	//   Avg: `${nsToMs(r.avg)}ms`,
	//   P99: `${nsToMs(r.p99)}ms`,
	//   Target: r.target ? `${r.target}${r.unit || 'ms'}` : '-',
	//   Status: r.status === 'pass' ? '✅ PASS' : r.status === 'fail' ? '❌ FAIL' : '⚠️ WARN'
	// }))));

// Compression results table
if (compressionResults.length > 0) {
	console.log("\n" + colors.cyan("Compression Ratios by Exchange"));
	console.log(colors.gray("─".repeat(70)));
	
	const compTableColumns: TableColumn<CompressionResult>[] = [
		{ key: "exchange", header: "Exchange", width: 15 },
		{
			key: (r) => formatBytes(r.originalSize),
			header: "Original",
			width: 12,
			align: "right",
		},
		{
			key: (r) => formatBytes(r.compressedSize),
			header: "Compressed",
			width: 12,
			align: "right",
		},
		{
			key: (r) => formatPercent(r.ratio),
			header: "Ratio",
			width: 12,
			align: "right",
		},
		{
			key: (r) =>
				r.status === "pass"
					? colors.green("PASS")
					: r.status === "fail"
						? colors.red("FAIL")
						: colors.yellow("WARN"),
			header: "Status",
			width: 8,
			align: "center",
		},
	];
	
	printTable(compressionResults, compTableColumns);
}

// Final status
const passed = results.filter((r) => r.status === "pass").length;
const warned = results.filter((r) => r.status === "warn").length;
const failed = results.filter((r) => r.status === "fail").length;

const compPassed = compressionResults.filter((r) => r.status === "pass").length;
const compWarned = compressionResults.filter((r) => r.status === "warn").length;
const compFailed = compressionResults.filter((r) => r.status === "fail").length;

console.log(
	`\n${colors.green(`${passed} passed`)}  ${colors.yellow(`${warned} warned`)}  ${colors.red(`${failed} failed`)}`,
);

if (compressionResults.length > 0) {
	console.log(
		`Compression: ${colors.green(`${compPassed} passed`)}  ${colors.yellow(`${compWarned} warned`)}  ${colors.red(`${compFailed} failed`)}`,
	);
}

// Cleanup - Using Bun's native file APIs
try {
	await Bun.file("./data/bench-cache.db").delete();
	await Bun.file("./data/bench-cache.db-wal").delete();
	await Bun.file("./data/bench-cache.db-shm").delete();
} catch {
	// Ignore cleanup errors
}

// Exit with appropriate code
process.exit(failed > 0 || compFailed > 0 ? 1 : 0);
