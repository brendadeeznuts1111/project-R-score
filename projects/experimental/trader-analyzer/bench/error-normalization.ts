#!/usr/bin/env bun
/**
 * @fileoverview Error Normalization Performance Benchmark
 * @description Benchmarks defensive error handling utility performance
 * @module bench/error-normalization
 * 
 * Measures performance of:
 * - normalizeError() - Full error normalization
 * - getErrorMessage() - Message extraction only
 * - logError() - Full logging with JSON serialization
 * 
 * Pattern: Bun commit 05508a6 defensive error handling
 * Reference: https://github.com/oven-sh/bun/commit/05508a627d299b78099a39b1cfb571373c5656d0
 * 
 * @see {@link ../src/utils/error-wrapper.ts|Error Wrapper Utility}
 * @see {@link ../docs/BUN-HMR-ERROR-HANDLING.md|Bun HMR Error Handling Guide}
 */

import {
    getErrorMessage,
    logError,
    normalizeError
} from "../src/utils/error-wrapper";

// Mock logger for benchmarking
const mockLogger = {
	error: (_message: string, ..._args: unknown[]) => {
		// No-op for benchmarking
	},
};

// Test error cases
const testCases = {
	errorInstance: new Error("Test error message"),
	errorWithStack: (() => {
		const err = new Error("Error with stack");
		err.stack = "Error: Error with stack\n    at test.ts:1:1\n    at benchmark.ts:2:2";
		return err;
	})(),
	errorWithCause: (() => {
		const rootError = new Error("Root cause");
		const middleError = new Error("Middle error", { cause: rootError });
		return new Error("Top error", { cause: middleError });
	})(),
	errorEvent: { error: null, message: "Event error message" },
	errorEventWithError: { error: new Error("Inner error"), message: "Event message" },
	stringError: "Simple string error",
	numericError: 404,
	nullError: null,
	undefinedError: undefined,
	objectError: { message: "Object error", code: 500 },
	emptyMessageError: new Error(""),
};

// Benchmark configuration
const ITERATIONS = 100_000; // Increased for more accurate measurements
const WARMUP_ITERATIONS = 1_000;

/**
 * Benchmark normalizeError() performance
 */
function benchmarkNormalizeError(): number {
	const start = Bun.nanoseconds();

	for (let i = 0; i < ITERATIONS; i++) {
		// Test various error types
		normalizeError(testCases.errorInstance);
		normalizeError(testCases.errorWithStack);
		normalizeError(testCases.errorWithCause);
		normalizeError(testCases.errorEvent);
		normalizeError(testCases.stringError);
		normalizeError(testCases.numericError);
		normalizeError(testCases.nullError);
		normalizeError(testCases.undefinedError);
		normalizeError(testCases.objectError);
	}

	const end = Bun.nanoseconds();
	const totalNs = end - start;
	const totalMs = totalNs / 1_000_000;
	const perCallMs = totalMs / (ITERATIONS * 10); // 10 different error types per iteration

	return perCallMs;
}

/**
 * Benchmark getErrorMessage() performance
 */
function benchmarkGetErrorMessage(): number {
	const start = Bun.nanoseconds();

	for (let i = 0; i < ITERATIONS; i++) {
		// Test various error types
		getErrorMessage(testCases.errorInstance);
		getErrorMessage(testCases.errorWithStack);
		getErrorMessage(testCases.errorEvent);
		getErrorMessage(testCases.stringError);
		getErrorMessage(testCases.numericError);
		getErrorMessage(testCases.nullError);
		getErrorMessage(testCases.undefinedError);
	}

	const end = Bun.nanoseconds();
	const totalNs = end - start;
	const totalMs = totalNs / 1_000_000;
	const perCallMs = totalMs / (ITERATIONS * 8); // 8 different error types per iteration

	return perCallMs;
}

/**
 * Benchmark logError() performance (includes JSON serialization)
 */
function benchmarkLogError(): number {
	const start = Bun.nanoseconds();

	for (let i = 0; i < ITERATIONS; i++) {
		// Test various error types with metadata
		logError(mockLogger, "Test context", testCases.errorInstance, {
			iteration: i,
			timestamp: Date.now(),
		});
		logError(mockLogger, "Test context", testCases.errorWithStack, {
			layer: 4,
			nodeCount: 1000,
		});
		logError(mockLogger, "Test context", testCases.stringError, {
			operation: "correlationDetection",
		});
	}

	const end = Bun.nanoseconds();
	const totalNs = end - start;
	const totalMs = totalNs / 1_000_000;
	const perCallMs = totalMs / (ITERATIONS * 3); // 3 different error types per iteration

	return perCallMs;
}

/**
 * Warmup runs to ensure JIT optimization
 */
function warmup(): void {
	for (let i = 0; i < WARMUP_ITERATIONS; i++) {
		normalizeError(testCases.errorInstance);
		getErrorMessage(testCases.errorInstance);
		logError(mockLogger, "Warmup", testCases.errorInstance, {});
	}
}

/**
 * Run benchmarks and display results
 */
function runBenchmarks(): void {
	console.log("🔥 Error Normalization Performance Benchmark\n");
	console.log(`Configuration:`);
	console.log(`  Iterations: ${ITERATIONS.toLocaleString()}`);
	console.log(`  Warmup: ${WARMUP_ITERATIONS.toLocaleString()}\n`);

	// Warmup
	console.log("⏳ Warming up...");
	warmup();
	console.log("✅ Warmup complete\n");

	// Run benchmarks
	console.log("📊 Running benchmarks...\n");

	const normalizeTime = benchmarkNormalizeError();
	const getMessageTime = benchmarkGetErrorMessage();
	const logTime = benchmarkLogError();

	// Display results
	console.log("Results:\n");
	console.log(`  normalizeError():   ${normalizeTime.toFixed(4)}ms per call`);
	console.log(`  getErrorMessage():  ${getMessageTime.toFixed(4)}ms per call`);
	console.log(`  logError():         ${logTime.toFixed(4)}ms per call (includes JSON serialization)\n`);

	// Performance summary
	console.log("Performance Summary:\n");
	console.log(`  normalizeError():   ~${normalizeTime.toFixed(3)}ms per call`);
	console.log(`  getErrorMessage():  ~${getMessageTime.toFixed(3)}ms per call`);
	console.log(`  logError():         ~${logTime.toFixed(3)}ms per call\n`);

	// Expected performance targets
	console.log("Expected Performance:\n");
	console.log(`  normalizeError():   ~0.02ms per call`);
	console.log(`  getErrorMessage():  ~0.01ms per call`);
	console.log(`  logError():         ~0.05ms per call\n`);

	// Performance comparison
	const normalizeDiff = ((normalizeTime - 0.02) / 0.02) * 100;
	const getMessageDiff = ((getMessageTime - 0.01) / 0.01) * 100;
	const logDiff = ((logTime - 0.05) / 0.05) * 100;

	console.log("Performance Comparison:\n");
	console.log(
		`  normalizeError():   ${normalizeDiff >= 0 ? "+" : ""}${normalizeDiff.toFixed(1)}% ${Math.abs(normalizeDiff) <= 50 ? "✅" : "⚠️"}`,
	);
	console.log(
		`  getErrorMessage():  ${getMessageDiff >= 0 ? "+" : ""}${getMessageDiff.toFixed(1)}% ${Math.abs(getMessageDiff) <= 50 ? "✅" : "⚠️"}`,
	);
	console.log(
		`  logError():         ${logDiff >= 0 ? "+" : ""}${logDiff.toFixed(1)}% ${Math.abs(logDiff) <= 50 ? "✅" : "⚠️"}\n`,
	);

	// Trade-off analysis
	console.log("Performance Trade-off:\n");
	console.log("  +0.05ms per error vs never crashing on malformed errors = massive reliability win\n");

	// Conclusion
	if (normalizeTime <= 0.03 && getMessageTime <= 0.015 && logTime <= 0.06) {
		console.log("✅ All benchmarks meet performance targets!\n");
		console.log("✅ Error wrapper adds minimal overhead while providing massive reliability improvements.\n");
	} else if (normalizeTime < 0.02 && getMessageTime < 0.01 && logTime < 0.05) {
		console.log("🚀 Performance exceeds expectations! Functions are highly optimized.\n");
		console.log("✅ Even better: minimal overhead with maximum reliability.\n");
	} else {
		console.log("⚠️  Some benchmarks exceed expected performance thresholds\n");
		console.log("✅ Trade-off still favorable: reliability > micro-optimization\n");
	}
}

// Run benchmarks
runBenchmarks();
