#!/usr/bin/env bun
/**
 * Tier-1380 OMEGA Benchmark
 * Performance testing for commit flow operations
 */

import { Timer } from "../lib/utils";

interface BenchmarkResult {
	name: string;
	iterations: number;
	totalTime: number;
	avgTime: number;
	throughput: string;
}

async function runBenchmark(
	name: string,
	fn: () => Promise<void>,
	iterations = 100,
): Promise<BenchmarkResult> {
	const timer = new Timer();

	for (let i = 0; i < iterations; i++) {
		await fn();
	}

	const totalTime = timer.elapsed();
	const avgTime = totalTime / iterations;
	const throughput = (1000 / avgTime).toFixed(0);

	return {
		name,
		iterations,
		totalTime,
		avgTime,
		throughput: `${throughput} ops/sec`,
	};
}

async function benchmarkCol89Check(): Promise<BenchmarkResult> {
	const testLines = [
		"const x = 1;", // short
		"a".repeat(100), // long
		"function test() { return true; }", // medium
	];

	return runBenchmark(
		"Col-89 Check",
		() => {
			for (const line of testLines) {
				Bun.stringWidth(line, { countAnsiEscapeCodes: false });
			}
		},
		1000,
	);
}

async function benchmarkHashCalculation(): Promise<BenchmarkResult> {
	const data = "test data for hashing";

	return runBenchmark(
		"Hash (wyhash)",
		() => {
			Bun.hash.wyhash(Buffer.from(data));
		},
		10000,
	);
}

async function benchmarkMessageValidation(): Promise<BenchmarkResult> {
	const message = "[RUNTIME][COMPONENT:CHROME][TIER:1380] Add entropy caching";
	const pattern = /^\[([A-Z]+)\]\[COMPONENT:([A-Z]+)\]\[TIER:(\d+)\] (.+)$/;

	return runBenchmark(
		"Message Validation",
		() => {
			pattern.test(message);
		},
		10000,
	);
}

async function benchmarkColorize(): Promise<BenchmarkResult> {
	const text = "Test message";
	const color = Bun.color("green", "ansi");

	return runBenchmark(
		"Colorize",
		() => {
			`${color}${text}\x1b[0m`;
		},
		5000,
	);
}

async function benchmarkTableRender(): Promise<BenchmarkResult> {
	const data = Array.from({ length: 10 }, (_, i) => ({
		id: i,
		name: `Item ${i}`,
		value: i * 10,
	}));

	return runBenchmark(
		"Table Render",
		() => {
			Bun.inspect.table(data);
		},
		100,
	);
}

// Main
if (import.meta.main) {
	console.log("╔════════════════════════════════════════════════════════╗");
	console.log("║     Tier-1380 OMEGA Benchmark                          ║");
	console.log("╚════════════════════════════════════════════════════════╝");
	console.log();

	const results: BenchmarkResult[] = [];

	console.log("Running benchmarks...\n");

	results.push(await benchmarkCol89Check());
	results.push(await benchmarkHashCalculation());
	results.push(await benchmarkMessageValidation());
	results.push(await benchmarkColorize());
	results.push(await benchmarkTableRender());

	console.log("Results:");
	console.log();
	console.log(
		Bun.inspect.table(results, [
			"name",
			"iterations",
			"totalTime",
			"avgTime",
			"throughput",
		]),
	);

	console.log();
	console.log("System Info:");
	console.log(`  Bun: ${Bun.version}`);
	console.log(`  Platform: ${process.platform}`);
	console.log(`  Arch: ${process.arch}`);
}

export { runBenchmark, benchmarkCol89Check, benchmarkHashCalculation };
