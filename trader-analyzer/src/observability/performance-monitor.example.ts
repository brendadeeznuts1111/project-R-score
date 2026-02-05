/**
 * @fileoverview Performance Monitor Usage Examples
 * @description Examples of using PerformanceMonitor for operation tracking
 * @module observability/performance-monitor.example
 */

import {
	performanceMonitor,
	MarketOperationError,
} from "./performance-monitor";

/**
 * Example: Track API calls
 */
async function exampleAPICall() {
	try {
		const result = await performanceMonitor.trackOperation(
			"fetchMarketData",
			async () => {
				// Simulate API call
				const response = await fetch("https://api.example.com/market-data");
				if (!response.ok) {
					throw new Error(`API returned ${response.status}`);
				}
				return await response.json();
			},
		);

		console.log("API call successful:", result);
	} catch (error) {
		if (error instanceof MarketOperationError) {
			console.error(
				`Operation '${error.operationName}' failed:`,
				error.originalError,
			);
		}
		throw error;
	}
}

/**
 * Example: Track database operations
 */
async function exampleDatabaseOperation() {
	const result = await performanceMonitor.trackOperation(
		"queryDatabase",
		async () => {
			// Simulate database query
			await Bun.sleep(50); // Simulate query time
			return { rows: [] };
		},
	);

	return result;
}

/**
 * Example: Get performance statistics
 */
function exampleGetStats() {
	const stats = performanceMonitor.getStats("fetchMarketData");
	if (stats) {
		console.log(`Operation: ${stats.operation}`);
		console.log(`Count: ${stats.count}`);
		console.log(`Mean: ${stats.mean}ms`);
		console.log(`p95: ${stats.p95}ms`);
		console.log(`p99: ${stats.p99}ms`);
		console.log(`Anomalies: ${stats.anomalies}`);
	}
}

/**
 * Example: Get all statistics summary
 */
function exampleGetSummary() {
	const summary = performanceMonitor.getSummary();
	console.log(summary);
}

/**
 * Example: Track multiple operations
 */
async function exampleMultipleOperations() {
	// Track multiple operations in parallel
	const [result1, result2, result3] = await Promise.all([
		performanceMonitor.trackOperation("operation1", async () => {
			await Bun.sleep(10);
			return "result1";
		}),
		performanceMonitor.trackOperation("operation2", async () => {
			await Bun.sleep(20);
			return "result2";
		}),
		performanceMonitor.trackOperation("operation3", async () => {
			await Bun.sleep(30);
			return "result3";
		}),
	]);

	return { result1, result2, result3 };
}

/**
 * Example: Check failure rates
 */
function exampleFailureRates() {
	const operations = ["fetchMarketData", "queryDatabase", "processData"];

	for (const op of operations) {
		const failureRate = performanceMonitor.getFailureRate(op);
		const failures = performanceMonitor.getFailures(op);

		console.log(`${op}:`);
		console.log(`  Failure Rate: ${(failureRate * 100).toFixed(2)}%`);
		console.log(`  Total Failures: ${failures.length}`);
	}
}
