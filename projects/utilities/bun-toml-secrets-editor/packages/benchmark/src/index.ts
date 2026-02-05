/**
 * @golden/benchmark - Performance Benchmarking
 *
 * Benchmark suite for Golden Template packages
 */

import { TableFormatter } from "@bun-toml/core/table";
import { colorize } from "@bun-toml/core/utils";

// ============================================================================
// Types
// ============================================================================

export interface BenchmarkOptions {
	warmup?: number;
	iterations?: number;
}

export interface BenchmarkResult {
	name: string;
	ops: number;
	mean: number;
	min: number;
	max: number;
	total: number;
}

// ============================================================================
// Benchmark Runner
// ============================================================================

export class Benchmark {
	private results: BenchmarkResult[] = [];

	async run(
		name: string,
		fn: () => void | Promise<void>,
		options: BenchmarkOptions = {},
	): Promise<BenchmarkResult> {
		const { warmup = 100, iterations = 1000 } = options;

		// Warmup
		for (let i = 0; i < warmup; i++) {
			await fn();
		}

		// Run benchmark
		const times: number[] = [];
		const startTotal = performance.now();

		for (let i = 0; i < iterations; i++) {
			const start = performance.now();
			await fn();
			times.push(performance.now() - start);
		}

		const total = performance.now() - startTotal;

		// Calculate stats
		const mean = times.reduce((a, b) => a + b, 0) / times.length;
		const min = Math.min(...times);
		const max = Math.max(...times);
		const ops = Math.round(1000 / mean);

		const result: BenchmarkResult = {
			name,
			ops,
			mean,
			min,
			max,
			total,
		};

		this.results.push(result);
		return result;
	}

	/**
	 * Compare multiple implementations
	 */
	async compare(
		name: string,
		implementations: Record<string, () => void | Promise<void>>,
	): Promise<void> {
		console.log(colorize(`\nBenchmark: ${name}`, "bold"));

		for (const [implName, fn] of Object.entries(implementations)) {
			await this.run(implName, fn);
		}
	}

	/**
	 * Print results as table
	 */
	print(): void {
		if (this.results.length === 0) return;

		const table = new TableFormatter({ useColors: true });

		table.addColumn({ key: "name", header: "Name", width: 25 });
		table.addColumn({
			key: "ops",
			header: "Ops/sec",
			width: 12,
			align: "right",
		});
		table.addColumn({
			key: "mean",
			header: "Mean (ms)",
			width: 12,
			align: "right",
		});
		table.addColumn({
			key: "min",
			header: "Min (ms)",
			width: 12,
			align: "right",
		});
		table.addColumn({
			key: "max",
			header: "Max (ms)",
			width: 12,
			align: "right",
		});

		// Sort by ops (descending)
		const sorted = [...this.results].sort((a, b) => b.ops - a.ops);

		sorted.forEach((r) => {
			table.addRow({
				name: r.name,
				ops: r.ops.toLocaleString(),
				mean: r.mean.toFixed(3),
				min: r.min.toFixed(3),
				max: r.max.toFixed(3),
			});
		});

		console.log(`\n${table.render()}`);
	}

	/**
	 * Get raw results
	 */
	getResults(): BenchmarkResult[] {
		return [...this.results];
	}

	/**
	 * Clear results
	 */
	clear(): void {
		this.results = [];
	}
}

// ============================================================================
// Convenience Functions
// ============================================================================

export async function benchmark(
	name: string,
	fn: () => void | Promise<void>,
	options?: BenchmarkOptions,
): Promise<BenchmarkResult> {
	const b = new Benchmark();
	return b.run(name, fn, options);
}

export function createBenchmark(): Benchmark {
	return new Benchmark();
}
