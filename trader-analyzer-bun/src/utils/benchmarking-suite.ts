/**
 * @fileoverview Benchmarking Suite
 * @description Performance benchmarking utilities
 * @module utils/benchmarking-suite
 */

import { PerformanceMonitor } from './performance-monitor';

/**
 * Benchmark Utilities
 * 
 * Provides utilities for comparing function performance.
 */
export class Benchmark {
	/**
	 * Compare multiple functions
	 */
	static compare<T>(
		functions: Array<{ name: string; fn: () => T }>,
		iterations: number = 1000
	): Array<{ name: string; avgTime: number; totalTime: number }> {
		const results: Array<{ name: string; avgTime: number; totalTime: number }> = [];

		for (const { name, fn } of functions) {
			const start = Bun.nanoseconds();
			
			for (let i = 0; i < iterations; i++) {
				fn();
			}
			
			const end = Bun.nanoseconds();
			const totalTime = Number(end - start) / 1_000_000; // Convert to ms
			const avgTime = totalTime / iterations;

			results.push({ name, avgTime, totalTime });
		}

		return results.sort((a, b) => a.avgTime - b.avgTime);
	}

	/**
	 * Create a new benchmark instance
	 */
	constructor(private name: string = 'Benchmark') {}

	/**
	 * Run benchmark
	 */
	run<T>(fn: () => T, iterations: number = 1000): {
		avgTime: number;
		totalTime: number;
		iterations: number;
	} {
		const start = Bun.nanoseconds();
		
		for (let i = 0; i < iterations; i++) {
			fn();
		}
		
		const end = Bun.nanoseconds();
		const totalTime = Number(end - start) / 1_000_000; // Convert to ms
		const avgTime = totalTime / iterations;

		return { avgTime, totalTime, iterations };
	}
}

/**
 * Compare multiple operations with detailed performance metrics
 * 
 * @param operations - Object mapping operation names to their functions
 * @param iterations - Number of iterations to run (default: 10000)
 * @returns Formatted table string showing performance comparison
 */
export async function compareOperations(
	operations: Record<string, () => void | Promise<void>>,
	iterations: number = 10000,
): Promise<void> {
	const results: Array<{
		operation: string;
		iterations: number;
		totalTime: string;
		avgPerOp: string;
		opsPerSecond: string;
	}> = [];

	for (const [name, fn] of Object.entries(operations)) {
		const isAsync = fn.constructor.name === 'AsyncFunction';
		
		// Warmup
		if (isAsync) {
			for (let i = 0; i < 100; i++) {
				await fn();
			}
		} else {
			for (let i = 0; i < 100; i++) {
				fn();
			}
		}

		// Measure
		const start = Bun.nanoseconds();
		
		if (isAsync) {
			for (let i = 0; i < iterations; i++) {
				await fn();
			}
		} else {
			for (let i = 0; i < iterations; i++) {
				fn();
			}
		}
		
		const end = Bun.nanoseconds();
		const totalNs = end - start;
		const avgNs = Number(totalNs) / iterations;

		results.push({
			operation: name,
			iterations,
			totalTime: `${(Number(totalNs) / 1_000_000_000).toFixed(3)}s`,
			avgPerOp: `${(avgNs / 1000).toFixed(2)}µs`,
			opsPerSecond: Math.round(1_000_000_000 / avgNs).toLocaleString(),
		});
	}

	results.sort((a, b) => parseFloat(a.avgPerOp) - parseFloat(b.avgPerOp));

	console.log(
		Bun.inspect.table(results, {
			title: 'Operation Performance Comparison',
			colors: true,
		}),
	);
}

// Re-export PerformanceMonitor
export { PerformanceMonitor } from './performance-monitor';
