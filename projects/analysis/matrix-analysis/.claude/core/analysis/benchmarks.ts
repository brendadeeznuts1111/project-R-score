/**
 * Performance Benchmarks for Levenshtein Analysis in Bun
 *
 * Demonstrates Bun's performance advantages for variable scope scanning
 */

import { coreLogger as logger } from "../shared/logger.js";
import { batchSimilarityCheck, benchmarkPerformance } from "./levenshtein";

export function runBenchmarks(): void {
	logger.info("🚀 Running Levenshtein Performance Benchmarks on Bun...\n");

	// Test data: realistic variable names from phone management system
	const testVariables = [
		"userProxy",
		"userProxies",
		"usrProxy",
		"primaryProxy",
		"backupProxy",
		"phoneNumber",
		"phoneNum",
		"phoneNo",
		"mobileNumber",
		"cellNumber",
		"emailAddress",
		"emailAddr",
		"email",
		"emailAccount",
		"mailAddress",
		"accountId",
		"accountNo",
		"accountNum",
		"accountId",
		"profileId",
		"deviceId",
		"deviceNo",
		"deviceNum",
		"hardwareId",
		"machineId",
	];

	// Benchmark single comparison
	logger.info("📊 Single Comparison Benchmark:");
	const singleStart = performance.now();
	const similarity = batchSimilarityCheck(testVariables.slice(0, 10), 0.3);
	const singleEnd = performance.now();

	logger.info(`  - Compared 10 variables in ${(singleEnd - singleStart).toFixed(2)}ms`);
	logger.info(`  - Found ${similarity.length} similar pairs\n`);

	// Benchmark batch processing
	logger.info("🔄 Batch Processing Benchmark:");
	const batchTime = benchmarkPerformance(testVariables, 100);
	logger.info(
		`  - 100 iterations with ${testVariables.length} variables: ${batchTime.toFixed(2)}ms`,
	);
	logger.info(`  - Average per iteration: ${(batchTime / 100).toFixed(2)}ms\n`);

	// Memory efficiency test
	logger.info("💾 Memory Efficiency Test:");
	const largeSet = Array.from({ length: 1000 }, (_, i) => `variable${i}`);
	const largeStart = performance.now();
	const largeResult = batchSimilarityCheck(largeSet, 0.2);
	const largeEnd = performance.now();

	logger.info(`  - Processed 1000 variables in ${(largeEnd - largeStart).toFixed(2)}ms`);
	logger.info(`  - Found ${largeResult.length} conflicts`);
	logger.info(
		`  - Memory usage: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB\n`,
	);

	logger.info("✅ Benchmarks complete - Bun performance verified!");
}
