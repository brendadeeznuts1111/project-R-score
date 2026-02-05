#!/usr/bin/env bun

/**
 * Demo: Nanosecond Precision Progress Tracking
 * Shows how Bun.nanoseconds() enhances our ProgressIndicator
 */

import {
	PerformanceMonitor,
	ProgressUtils,
} from "../../src/utils/progress-indicator";

async function main() {
	console.log("🔬 Nanosecond Precision Progress Demo");
	console.log("=====================================");

	// Demo 1: Basic progress with nanosecond timing
	console.log("\n1️⃣ Basic Progress with Enhanced Timing:");
	const progress = ProgressUtils.timed("Processing data", 5);

	// Simulate work with precise timing
	for (let i = 0; i <= 50; i++) {
		progress.update(i * 2);
		await new Promise((resolve) => setTimeout(resolve, 100));
	}

	progress.complete("Data processing complete");
	console.log(`⏱️  Elapsed: ${progress.elapsedMs.toFixed(2)}ms`);

	// Demo 2: Performance monitoring with nanosecond precision
	console.log("\n2️⃣ Performance Monitoring Demo:");
	const monitor = new PerformanceMonitor();

	// Simulate operations
	for (let i = 0; i < 1000; i++) {
		// Simulate some work
		await new Promise((resolve) => setTimeout(resolve, 1));
		monitor.recordOperation();
	}

	const summary = monitor.getSummary();
	console.log(`📊 Performance Summary:`);
	console.log(`   Operations: ${summary.operations}`);
	console.log(`   Elapsed: ${summary.elapsedMs.toFixed(2)}ms`);
	console.log(`   Rate: ${summary.opsPerSecond.toFixed(0)} ops/sec`);

	// Demo 3: File transfer with precise rate calculation
	console.log("\n3️⃣ File Transfer with Precise Rate:");
	const fileProgress = ProgressUtils.fileTransfer(
		1024 * 1024,
		"large-file.bin",
	); // 1MB

	// Simulate file transfer with varying speeds
	let transferred = 0;
	const chunkSize = 1024; // 1KB chunks

	while (transferred < 1024 * 1024) {
		transferred += chunkSize;
		fileProgress.update(transferred);

		// Simulate network latency
		await new Promise((resolve) => setTimeout(resolve, Math.random() * 10));
	}

	fileProgress.complete("File transfer complete");
	console.log(
		`⚡ Transfer completed in ${fileProgress.elapsedMs.toFixed(2)}ms`,
	);

	// Demo 4: Batch operations with timing
	console.log("\n4️⃣ Batch Operations with Timing:");
	const batchProgress = ProgressUtils.batchOperation(100, "Processing items");

	const batchMonitor = new PerformanceMonitor();

	for (let i = 0; i < 100; i++) {
		// Simulate processing time
		await new Promise((resolve) => setTimeout(resolve, Math.random() * 50));

		batchProgress.update(i + 1);
		batchMonitor.recordOperation();
	}

	batchProgress.complete("Batch processing complete");

	const batchSummary = batchMonitor.getSummary();
	console.log(`📈 Batch Performance:`);
	console.log(`   Items processed: ${batchSummary.operations}`);
	console.log(`   Total time: ${batchSummary.elapsedMs.toFixed(2)}ms`);
	console.log(
		`   Average per item: ${(batchSummary.elapsedMs / batchSummary.operations).toFixed(2)}ms`,
	);

	// Demo 5: High-resolution timing comparison
	console.log("\n5️⃣ Timing Precision Comparison:");
	console.log("Comparing Date.now() vs Bun.nanoseconds():");

	const iterations = 10000;

	// Test Date.now() precision
	const dateStart = Date.now();
	for (let i = 0; i < iterations; i++) {
		// Simulate minimal work
		Math.random();
	}
	const dateEnd = Date.now();
	const dateElapsed = dateEnd - dateStart;

	// Test Bun.nanoseconds() precision
	const bunStart = Bun.nanoseconds();
	for (let i = 0; i < iterations; i++) {
		// Simulate minimal work
		Math.random();
	}
	const bunEnd = Bun.nanoseconds();
	const bunElapsed = (bunEnd - bunStart) / 1_000_000; // Convert to ms

	console.log(`📊 Precision Comparison (${iterations} iterations):`);
	console.log(`   Date.now():     ${dateElapsed.toFixed(2)}ms`);
	console.log(`   Bun.nanoseconds(): ${bunElapsed.toFixed(4)}ms`);
	console.log(
		`   Precision gain: ${(dateElapsed / bunElapsed - 1).toFixed(1)}x more precise`,
	);

	console.log("\n🎉 Nanosecond Precision Demo Complete!");
	console.log("=====================================");
	console.log("✅ Enhanced ProgressIndicator with Bun.nanoseconds()");
	console.log("✅ PerformanceMonitor for high-precision metrics");
	console.log("✅ Improved ETA and rate calculations");
	console.log("✅ Better timing accuracy for CLI operations");
}

// Run the demo
main().catch(console.error);
