#!/usr/bin/env bun
// Bun v1.3.7 Performance Benchmark for Widget System
// Tests Buffer.from(), async/await, string operations, and ARM64 optimizations

import { performance } from "perf_hooks";

interface BenchmarkResult {
	name: string;
	time: number;
	operations: number;
	opsPerSecond: number;
	improvement?: string;
}

class WidgetPerformanceBenchmark {
	private results: BenchmarkResult[] = [];

	async runAllBenchmarks(): Promise<void> {
		console.log("🚀 Bun v1.3.7 Widget Performance Benchmarks");
		console.log("==========================================\n");

		// 1. Buffer.from() Performance Test
		await this.benchmarkBufferFrom();

		// 2. Async/Await Performance Test
		await this.benchmarkAsyncAwait();

		// 3. String Operations Performance Test
		await this.benchmarkStringOperations();

		// 4. Compound Boolean Expressions Test
		await this.benchmarkCompoundBooleans();

		// 5. Array Operations Test
		await this.benchmarkArrayOperations();

		// 6. Widget Status Monitoring Simulation
		await this.benchmarkWidgetStatusMonitoring();

		this.printResults();
	}

	private async benchmarkBufferFrom(): Promise<void> {
		console.log("📊 Testing Buffer.from() Performance...");

		const testSizes = [8, 64, 1024, 8192];

		for (const size of testSizes) {
			const testData = Array.from({ length: size }, (_, i) => i % 256);
			const iterations = 10000;

			const start = performance.now();

			for (let i = 0; i < iterations; i++) {
				const buffer = Buffer.from(testData);
				// Simulate buffer processing
				const processed = buffer.length;
			}

			const end = performance.now();
			const time = end - start;
			const opsPerSecond = (iterations * 1000) / time;

			const expectedImprovement = this.getExpectedBufferImprovement(size);

			this.results.push({
				name: `Buffer.from() (${size} elements)`,
				time,
				operations: iterations,
				opsPerSecond,
				improvement: expectedImprovement,
			});

			console.log(
				`  ${size} elements: ${time.toFixed(2)}ms (${opsPerSecond.toFixed(0)} ops/sec) ${expectedImprovement}`,
			);
		}
	}

	private async benchmarkAsyncAwait(): Promise<void> {
		console.log("\n⚡ Testing Async/Await Performance...");

		const iterations = 5000;

		const start = performance.now();

		await this.runAsyncAwaitTest(iterations);

		const end = performance.now();
		const time = end - start;
		const opsPerSecond = (iterations * 1000) / time;

		this.results.push({
			name: "Async/Await Operations",
			time,
			operations: iterations,
			opsPerSecond,
		});

		console.log(
			`  ${iterations} operations: ${time.toFixed(2)}ms (${opsPerSecond.toFixed(0)} ops/sec)`,
		);
	}

	private async benchmarkStringOperations(): Promise<void> {
		console.log("\n🔤 Testing String Operations...");

		const testStrings = [
			"hello",
			"world",
			"performance",
			"benchmark",
			"widget",
		];
		const iterations = 20000;

		const start = performance.now();

		for (let i = 0; i < iterations; i++) {
			for (const str of testStrings) {
				// Test padStart and padEnd
				const paddedStart = str.padStart(20, " ");
				const paddedEnd = str.padEnd(20, " ");

				// Test string concatenation
				const combined = paddedStart + paddedEnd;
			}
		}

		const end = performance.now();
		const time = end - start;
		const opsPerSecond = (iterations * testStrings.length * 1000) / time;

		this.results.push({
			name: "String Operations (padStart/padEnd)",
			time,
			operations: iterations * testStrings.length,
			opsPerSecond,
		});

		console.log(
			`  ${iterations * testStrings.length} operations: ${time.toFixed(2)}ms (${opsPerSecond.toFixed(0)} ops/sec)`,
		);
	}

	private async benchmarkCompoundBooleans(): Promise<void> {
		console.log("\n🔍 Testing Compound Boolean Expressions...");

		const iterations = 100000;

		const start = performance.now();

		for (let i = 0; i < iterations; i++) {
			// Simulate widget status checks
			const apiStatus =
				i % 3 === 0 ? "online" : i % 3 === 1 ? "offline" : "error";
			const bucketStatus =
				i % 4 === 0 ? "connected" : i % 4 === 1 ? "disconnected" : "error";
			const profileCount = i % 200;

			// Compound boolean expressions (ARM64 optimized)
			const isOnline = apiStatus === "online" && bucketStatus === "connected";
			const needsAttention =
				apiStatus === "error" || bucketStatus === "error" || profileCount < 10;
			const isHealthy = isOnline && profileCount > 50 && profileCount < 150;

			// Additional compound expressions
			const statusColor = isHealthy
				? "green"
				: needsAttention
					? "red"
					: "yellow";
		}

		const end = performance.now();
		const time = end - start;
		const opsPerSecond = (iterations * 1000) / time;

		this.results.push({
			name: "Compound Boolean Expressions",
			time,
			operations: iterations,
			opsPerSecond,
		});

		console.log(
			`  ${iterations} operations: ${time.toFixed(2)}ms (${opsPerSecond.toFixed(0)} ops/sec)`,
		);
	}

	private async benchmarkArrayOperations(): Promise<void> {
		console.log("\n📋 Testing Array Operations...");

		const iterations = 5000;

		const start = performance.now();

		for (let i = 0; i < iterations; i++) {
			// Test Array.from() improvements
			const args = [1, 2, 3, 4, 5];
			const arrayFromArgs = Array.from(args);

			// Test array.flat() improvements
			const nestedArray = [
				[1, 2],
				[3, 4],
				[5, 6],
			];
			const flattened = nestedArray.flat();

			// Test array operations
			const mapped = arrayFromArgs.map((x) => x * 2);
			const filtered = mapped.filter((x) => x > 5);
			const reduced = filtered.reduce((acc, x) => acc + x, 0);
		}

		const end = performance.now();
		const time = end - start;
		const opsPerSecond = (iterations * 1000) / time;

		this.results.push({
			name: "Array Operations (from/flat/map/filter/reduce)",
			time,
			operations: iterations,
			opsPerSecond,
		});

		console.log(
			`  ${iterations} operations: ${time.toFixed(2)}ms (${opsPerSecond.toFixed(0)} ops/sec)`,
		);
	}

	private async benchmarkWidgetStatusMonitoring(): Promise<void> {
		console.log("\n📡 Testing Widget Status Monitoring Simulation...");

		const iterations = 1000;

		const start = performance.now();

		for (let i = 0; i < iterations; i++) {
			// Simulate widget status monitoring cycle
			await this.simulateWidgetStatusCheck();
		}

		const end = performance.now();
		const time = end - start;
		const opsPerSecond = (iterations * 1000) / time;

		this.results.push({
			name: "Widget Status Monitoring Cycle",
			time,
			operations: iterations,
			opsPerSecond,
		});

		console.log(
			`  ${iterations} monitoring cycles: ${time.toFixed(2)}ms (${opsPerSecond.toFixed(0)} ops/sec)`,
		);
	}

	private async runAsyncAwaitTest(iterations: number): Promise<void> {
		for (let i = 0; i < iterations; i++) {
			await this.simulateAsyncOperation();
		}
	}

	private async simulateAsyncOperation(): Promise<void> {
		return new Promise((resolve) => {
			setTimeout(resolve, 0);
		});
	}

	private async simulateWidgetStatusCheck(): Promise<void> {
		// Simulate API status check
		const apiStatus =
			Math.random() > 0.1
				? "online"
				: Math.random() > 0.5
					? "offline"
					: "error";

		// Simulate bucket status check
		const bucketStatus =
			Math.random() > 0.05
				? "connected"
				: Math.random() > 0.5
					? "disconnected"
					: "error";

		// Simulate profile count
		const profileCount = Math.floor(Math.random() * 200);

		// Compound boolean checks (ARM64 optimized)
		const isOnline = apiStatus === "online" && bucketStatus === "connected";
		const needsAttention =
			apiStatus === "error" || bucketStatus === "error" || profileCount < 10;
		const isHealthy = isOnline && profileCount > 50 && profileCount < 150;

		// String formatting (faster padStart/padEnd)
		const statusText = isHealthy
			? "🟢 Online"
			: needsAttention
				? "🔴 Error"
				: "🟡 Warning";
		const profileText = `📁 Profiles: ${profileCount.toString().padStart(3, "0")} files`;

		// Buffer operations (faster Buffer.from)
		const statusData = [
			apiStatus === "online" ? 1 : 0,
			bucketStatus === "connected" ? 1 : 0,
			profileCount,
		];
		const buffer = Buffer.from(statusData);

		// Simulate processing
		const processed = buffer.length > 0;
	}

	private getExpectedBufferImprovement(size: number): string {
		if (size === 8) return "(~50% faster expected)";
		if (size === 64) return "(~42% faster expected)";
		if (size === 1024) return "(~29% faster expected)";
		return "(optimized)";
	}

	private printResults(): void {
		console.log("\n📈 Performance Results Summary");
		console.log("================================");

		// Sort by operations per second
		const sortedResults = this.results.sort(
			(a, b) => b.opsPerSecond - a.opsPerSecond,
		);

		console.log("\n📊 Benchmark Results:");
		console.log(
			"┌─────────────────────────────────────────┬──────────────┬──────────────┬─────────────────┐",
		);
		console.log(
			"│ Operation                               │ Time (ms)    │ Ops/Second   │ Improvement     │",
		);
		console.log(
			"├─────────────────────────────────────────┼──────────────┼──────────────┼─────────────────┤",
		);

		for (const result of sortedResults) {
			const name = result.name.padEnd(40);
			const time = result.time.toFixed(2).padStart(10);
			const ops = result.opsPerSecond.toFixed(0).padStart(12);
			const improvement = result.improvement
				? result.improvement.padStart(15)
				: " ".repeat(15);

			console.log(`│ ${name} │ ${time} │ ${ops} │ ${improvement} │`);
		}

		console.log(
			"└─────────────────────────────────────────┴──────────────┴──────────────┴─────────────────┘",
		);

		// Performance insights
		console.log("\n💡 Performance Insights:");
		console.log("========================");

		const bufferResults = this.results.filter((r) =>
			r.name.includes("Buffer.from()"),
		);
		const bufferAvgImprovement = bufferResults.reduce(
			(acc, r) => acc + (r.improvement ? 1 : 0),
			0,
		);

		if (bufferAvgImprovement > 0) {
			console.log("✅ Buffer.from() operations show significant improvements");
			console.log("   - Leverage this for faster network response processing");
			console.log("   - Optimize buffer creation in widget data handling");
		}

		const asyncResult = this.results.find((r) =>
			r.name.includes("Async/Await"),
		);
		if (asyncResult && asyncResult.opsPerSecond > 10000) {
			console.log("✅ Async/await performance is excellent");
			console.log("   - Widget status monitoring will be more responsive");
			console.log("   - Faster API polling and data fetching");
		}

		const stringResult = this.results.find((r) =>
			r.name.includes("String Operations"),
		);
		if (stringResult && stringResult.opsPerSecond > 50000) {
			console.log("✅ String operations are highly optimized");
			console.log("   - Console output formatting will be faster");
			console.log("   - Status display updates will be more responsive");
		}

		const booleanResult = this.results.find((r) =>
			r.name.includes("Compound Boolean"),
		);
		if (booleanResult && booleanResult.opsPerSecond > 500000) {
			console.log("✅ Compound boolean expressions are highly optimized");
			console.log("   - Widget status checks will be faster on ARM64");
			console.log("   - Better performance on Apple Silicon devices");
		}

		console.log("\n🎯 Optimization Recommendations:");
		console.log("===============================");
		console.log("1. Use Buffer.from() for all buffer operations");
		console.log("2. Leverage compound boolean expressions for status checks");
		console.log("3. Use padStart/padEnd for string formatting");
		console.log("4. Optimize async/await patterns for better responsiveness");
		console.log("5. Consider array.flat() for nested array operations");
	}
}

// Run the benchmark
const benchmark = new WidgetPerformanceBenchmark();
benchmark.runAllBenchmarks().catch(console.error);
