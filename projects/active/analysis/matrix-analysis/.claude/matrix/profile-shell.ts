#!/usr/bin/env bun
/**
 * Tier-1380 OMEGA: Advanced Shell Performance Profiler
 * Uses Bun's performance APIs for detailed analysis
 */

import { performance } from "perf_hooks";

const CLI = "./matrix/column-standards-all.ts";

// Colors for output
const colors = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	cyan: "\x1b[36m",
	orange: "\x1b[38;5;208m",
};

interface BenchmarkResult {
	name: string;
	times: number[];
	avg: number;
	min: number;
	max: number;
	p95: number;
	stdDev: number;
}

async function runCommand(
	args: string,
): Promise<{ stdout: string; stderr: string; duration: number }> {
	const start = performance.now();

	const proc = Bun.spawn(["bun", CLI, ...args.split(" ")], {
		stdout: "pipe",
		stderr: "pipe",
	});

	const stdout = await new Response(proc.stdout).text();
	const stderr = await new Response(proc.stderr).text();
	await proc.exited;

	const duration = performance.now() - start;

	return { stdout, stderr, duration };
}

async function benchmark(
	name: string,
	args: string,
	iterations: number = 20,
): Promise<BenchmarkResult> {
	const times: number[] = [];

	console.info(`${colors.cyan}Profiling: ${name}${colors.reset}`);
	console.info(`  Command: bun ${CLI} ${args}`);
	console.info(`  Iterations: ${iterations}`);

	// Warmup
	for (let i = 0; i < 3; i++) {
		await runCommand(args);
	}

	// Actual benchmark
	for (let i = 0; i < iterations; i++) {
		const { duration } = await runCommand(args);
		times.push(duration);
		process.stdout.write(".");
	}
	console.info(" Done!");

	// Statistics
	const avg = times.reduce((a, b) => a + b, 0) / times.length;
	const min = Math.min(...times);
	const max = Math.max(...times);
	const sorted = [...times].sort((a, b) => a - b);
	const p95 = sorted[Math.floor(sorted.length * 0.95)];
	const variance = times.reduce((sum, t) => sum + (t - avg) ** 2, 0) / times.length;
	const stdDev = Math.sqrt(variance);

	return { name, times, avg, min, max, p95, stdDev };
}

function formatTime(ms: number): string {
	if (ms < 1) return `${(ms * 1000).toFixed(2)}μs`;
	if (ms < 10) return `${ms.toFixed(2)}ms`;
	return `${ms.toFixed(1)}ms`;
}

function printResult(result: BenchmarkResult) {
	console.info(`  ${colors.bold}Results:${colors.reset}`);
	console.info(`    Average: ${formatTime(result.avg)}`);
	console.info(`    Min/Max: ${formatTime(result.min)} / ${formatTime(result.max)}`);
	console.info(`    P95:     ${formatTime(result.p95)}`);
	console.info(`    StdDev:  ${formatTime(result.stdDev)}`);
	console.info();
}

function analyzeBottlenecks(results: BenchmarkResult[]) {
	console.info(
		`${colors.orange}═══════════════════════════════════════════════════${colors.reset}`,
	);
	console.info(`${colors.bold}${colors.orange}BOTTLENECK ANALYSIS${colors.reset}`);
	console.info(
		`${colors.orange}═══════════════════════════════════════════════════${colors.reset}`,
	);
	console.info();

	// Sort by average time
	const sorted = [...results].sort((a, b) => b.avg - a.avg);

	console.info(`${colors.bold}Ranked by Average Latency:${colors.reset}`);
	sorted.forEach((r, i) => {
		const icon = i === 0 ? "🔴" : i < 3 ? "🟠" : "🟢";
		console.info(`  ${icon} ${r.name.padEnd(30)} ${formatTime(r.avg)}`);
	});
	console.info();

	// Identify patterns
	const slow = sorted.filter((r) => r.avg > 20);
	const variable = sorted.filter((r) => r.stdDev / r.avg > 0.3);

	if (slow.length > 0) {
		console.info(`${colors.red}Slow Operations (>20ms):${colors.reset}`);
		slow.forEach((r) => console.info(`  • ${r.name}: ${formatTime(r.avg)}`));
		console.info();
	}

	if (variable.length > 0) {
		console.info(`${colors.yellow}Variable Operations (CV>30%):${colors.reset}`);
		variable.forEach((r) => console.info(`  • ${r.name}: σ=${formatTime(r.stdDev)}`));
		console.info();
	}

	// Recommendations
	console.info(`${colors.green}Recommendations:${colors.reset}`);
	console.info("  1. Cache column lists to avoid repeated 'pipe names' calls");
	console.info("  2. Use --no-color for scripts (faster than stripping ANSI)");
	console.info("  3. Batch multiple operations instead of individual calls");
	console.info("  4. Consider using --json only when necessary");
	console.info();
}

async function profileMemory() {
	console.info(
		`${colors.orange}═══════════════════════════════════════════════════${colors.reset}`,
	);
	console.info(`${colors.bold}${colors.orange}MEMORY PROFILE${colors.reset}`);
	console.info(
		`${colors.orange}═══════════════════════════════════════════════════${colors.reset}`,
	);
	console.info();

	const initialMemory = process.memoryUsage();

	// Load CLI module
	const { MATRIX_COLUMNS } = await import("./column-standards-index.ts");

	const afterLoad = process.memoryUsage();

	// Access all columns
	const cols = Object.values(MATRIX_COLUMNS);
	const names = cols.map((c) => c.name);
	const afterAccess = process.memoryUsage();

	console.info("Memory Usage:");
	console.info(
		`  Initial:        ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
	);
	console.info(
		`  After import:   ${(afterLoad.heapUsed / 1024 / 1024).toFixed(2)} MB (+${((afterLoad.heapUsed - initialMemory.heapUsed) / 1024).toFixed(2)} KB)`,
	);
	console.info(
		`  After access:   ${(afterAccess.heapUsed / 1024 / 1024).toFixed(2)} MB (+${((afterAccess.heapUsed - afterLoad.heapUsed) / 1024).toFixed(2)} KB)`,
	);
	console.info();

	console.info(`Column definitions loaded: ${cols.length}`);
	console.info(
		`Estimated per-column overhead: ${((afterAccess.heapUsed - afterLoad.heapUsed) / cols.length).toFixed(0)} bytes`,
	);
	console.info();
}

async function profileStartup() {
	console.info(
		`${colors.orange}═══════════════════════════════════════════════════${colors.reset}`,
	);
	console.info(`${colors.bold}${colors.orange}STARTUP TIME PROFILE${colors.reset}`);
	console.info(
		`${colors.orange}═══════════════════════════════════════════════════${colors.reset}`,
	);
	console.info();

	// Measure cold start
	const coldStart = performance.now();
	const proc = Bun.spawn(["bun", CLI, "--help"], {
		stdout: "pipe",
		stderr: "pipe",
	});
	await proc.exited;
	const coldDuration = performance.now() - coldStart;

	console.info(`Cold start (--help): ${formatTime(coldDuration)}`);

	// Measure warm start (Bun runtime already loaded)
	const times: number[] = [];
	for (let i = 0; i < 5; i++) {
		const start = performance.now();
		const p = Bun.spawn(["bun", CLI, "--version"], { stdout: "pipe" });
		await p.exited;
		times.push(performance.now() - start);
	}

	const avgWarm = times.reduce((a, b) => a + b, 0) / times.length;
	console.info(`Warm start (--version): ${formatTime(avgWarm)}`);
	console.info();

	console.info(`${colors.bold}Breakdown:${colors.reset}`);
	console.info(`  Bun runtime startup: ~${formatTime(coldDuration - avgWarm)}`);
	console.info(`  CLI module load: ~${formatTime(avgWarm)}`);
	console.info();
}

async function parallelBenchmark() {
	console.info(
		`${colors.orange}═══════════════════════════════════════════════════${colors.reset}`,
	);
	console.info(`${colors.bold}${colors.orange}PARALLEL EXECUTION TEST${colors.reset}`);
	console.info(
		`${colors.orange}═══════════════════════════════════════════════════${colors.reset}`,
	);
	console.info();

	const cols = ["45", "31", "21", "71"];

	// Sequential
	console.info("Sequential execution:");
	const seqStart = performance.now();
	for (const col of cols) {
		await runCommand(`get ${col}`);
	}
	const seqDuration = performance.now() - seqStart;
	console.info(`  Total: ${formatTime(seqDuration)}`);
	console.info(`  Per call: ${formatTime(seqDuration / cols.length)}`);
	console.info();

	// Parallel
	console.info("Parallel execution (Promise.all):");
	const parStart = performance.now();
	await Promise.all(cols.map((col) => runCommand(`get ${col}`)));
	const parDuration = performance.now() - parStart;
	console.info(`  Total: ${formatTime(parDuration)}`);
	console.info(`  Speedup: ${(seqDuration / parDuration).toFixed(2)}x`);
	console.info();
}

// Main
async function main() {
	console.info(`${colors.bold}${colors.orange}`);
	console.info("╔════════════════════════════════════════════════════╗");
	console.info("║  🔥 Tier-1380 OMEGA: Performance Profiler 🔥      ║");
	console.info("║                                                    ║");
	console.info("║  Bun-native profiling with detailed analytics      ║");
	console.info("╚════════════════════════════════════════════════════╝");
	console.info(`${colors.reset}\n`);

	const results: BenchmarkResult[] = [];

	// Profile startup
	await profileStartup();

	// Memory profile
	await profileMemory();

	// Run benchmarks
	console.info(
		`${colors.orange}═══════════════════════════════════════════════════${colors.reset}`,
	);
	console.info(`${colors.bold}${colors.orange}COMMAND LATENCY BENCHMARKS${colors.reset}`);
	console.info(
		`${colors.orange}═══════════════════════════════════════════════════${colors.reset}`,
	);
	console.info();

	results.push(await benchmark("get 45", "get 45", 15));
	printResult(results[results.length - 1]);

	results.push(await benchmark("get 45 --json", "get 45 --json", 15));
	printResult(results[results.length - 1]);

	results.push(await benchmark("list", "list", 10));
	printResult(results[results.length - 1]);

	results.push(await benchmark("pipe names", "pipe names", 15));
	printResult(results[results.length - 1]);

	results.push(await benchmark("pipe ids", "pipe ids", 15));
	printResult(results[results.length - 1]);

	results.push(await benchmark("search tension", "search tension", 10));
	printResult(results[results.length - 1]);

	results.push(await benchmark("stats", "stats", 10));
	printResult(results[results.length - 1]);

	results.push(await benchmark("matrix", "matrix", 5));
	printResult(results[results.length - 1]);

	// Parallel test
	await parallelBenchmark();

	// Analysis
	analyzeBottlenecks(results);

	console.info(`${colors.green}✅ Profiling complete!${colors.reset}\n`);
}

main().catch(console.error);
