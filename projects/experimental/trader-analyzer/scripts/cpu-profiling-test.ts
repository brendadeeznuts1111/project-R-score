#!/usr/bin/env bun
/**
 * @fileoverview CPU Profiling Test Script
 * @description Automated CPU profiling test execution with versioning and baseline management
 * 
 * @module scripts/cpu-profiling-test
 * @version v1.0.0
 * 
 * @usage
 * Run via Bun package scripts:
 *   bun run cpu-prof:test      # Run profiling test
 *   bun run cpu-prof:baseline  # Create baseline
 *   bun run cpu-prof:compare   # Compare against baseline
 * 
 * Or run directly:
 *   bun scripts/cpu-profiling-test.ts --test
 *   bun scripts/cpu-profiling-test.ts --baseline
 */

import { $ } from "bun";
import { join } from "path";
import {
	CPUProfilingRegistry,
	CPUProfiling,
	PROFILES_VERSIONS_DIR,
	PROFILES_BASELINE_DIR,
} from "../src/utils/cpu-profiling-registry";

// Create registry instance
const registry = new CPUProfilingRegistry();

// ═══════════════════════════════════════════════════════════════
// Test Suites
// ═══════════════════════════════════════════════════════════════

/**
 * Synchronous CPU work simulation
 */
function syncWork(): void {
	let sum = 0;
	for (let i = 0; i < 10_000_000; i++) {
		sum += Math.sqrt(i) * Math.sin(i);
	}
}

/**
 * Async operation profiling
 */
async function asyncWork(): Promise<void> {
	const promises = Array.from({ length: 100 }, async () => {
		await Bun.sleep(Math.random() * 10);
		return Math.random() * 1000;
	});
	await Promise.all(promises);
}

/**
 * HTTP request handling simulation
 */
async function httpSimulation(): Promise<void> {
	const requests = Array.from({ length: 50 }, async () => {
		// Simulate HTTP request processing
		const data = { id: Math.random(), timestamp: Date.now() };
		const json = JSON.stringify(data);
		const parsed = JSON.parse(json);
		return parsed;
	});
	await Promise.all(requests);
}

/**
 * Mixed workload profiling
 */
async function mixedWorkload(): Promise<void> {
	// Sync work
	syncWork();
	
	// Async work
	await asyncWork();
	
	// HTTP simulation
	await httpSimulation();
	
	// More sync work
	syncWork();
}

/**
 * Memory allocation patterns
 */
function memoryAllocation(): void {
	const arrays: number[][] = [];
	for (let i = 0; i < 1000; i++) {
		arrays.push(new Array(1000).fill(0).map(() => Math.random()));
	}
	// Process arrays
	arrays.forEach((arr) => {
		arr.sort();
		arr.reverse();
	});
}

/**
 * Run all test suites
 */
async function runTestSuites(): Promise<void> {
	console.info("Running CPU profiling test suites...");
	
	console.info("  - Synchronous CPU work");
	syncWork();
	
	console.info("  - Async operations");
	await asyncWork();
	
	console.info("  - HTTP request simulation");
	await httpSimulation();
	
	console.info("  - Mixed workload");
	await mixedWorkload();
	
	console.info("  - Memory allocation patterns");
	memoryAllocation();
	
	console.info("Test suites completed");
}

// ═══════════════════════════════════════════════════════════════
// Profile Generation
// ═══════════════════════════════════════════════════════════════

/**
 * Generate profile filename
 */
function generateProfileFilename(): string {
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
	return `cpu-test-${timestamp}.cpuprofile`;
}

/**
 * Run profiling test with Bun --cpu-prof flag
 */
async function runProfilingTest(outputPath: string): Promise<void> {
	const scriptPath = join(import.meta.dir, "cpu-profiling-test-runner.ts");
	
	// Create a temporary runner script that runs the test suites directly
	const runnerScript = `
// Synchronous CPU work simulation
function syncWork() {
	let sum = 0;
	for (let i = 0; i < 10_000_000; i++) {
		sum += Math.sqrt(i) * Math.sin(i);
	}
}

// Async operation profiling
async function asyncWork() {
	const promises = Array.from({ length: 100 }, async () => {
		await Bun.sleep(Math.random() * 10);
		return Math.random() * 1000;
	});
	await Promise.all(promises);
}

// HTTP request handling simulation
async function httpSimulation() {
	const requests = Array.from({ length: 50 }, async () => {
		const data = { id: Math.random(), timestamp: Date.now() };
		const json = JSON.stringify(data);
		const parsed = JSON.parse(json);
		return parsed;
	});
	await Promise.all(requests);
}

// Mixed workload profiling
async function mixedWorkload() {
	syncWork();
	await asyncWork();
	await httpSimulation();
	syncWork();
}

// Memory allocation patterns
function memoryAllocation() {
	const arrays = [];
	for (let i = 0; i < 1000; i++) {
		arrays.push(new Array(1000).fill(0).map(() => Math.random()));
	}
	arrays.forEach((arr) => {
		arr.sort();
		arr.reverse();
	});
}

// Run all test suites
async function runTestSuites() {
	syncWork();
	await asyncWork();
	await httpSimulation();
	await mixedWorkload();
	memoryAllocation();
}

await runTestSuites();
`;
	
	await Bun.write(scriptPath, runnerScript);
	
	try {
		// Run with CPU profiling enabled
		await $`bun --cpu-prof=${outputPath} ${scriptPath}`.quiet();
	} finally {
		// Clean up runner script
		try {
			await Bun.file(scriptPath).unlink();
		} catch {
			// Ignore cleanup errors
		}
	}
}

// ═══════════════════════════════════════════════════════════════
// CLI Interface
// ═══════════════════════════════════════════════════════════════

async function main() {
	const args = process.argv.slice(2);
	const command = args[0];
	
	try {
		switch (command) {
			case "--baseline":
			case "baseline": {
				console.info("Creating baseline profile...");
				const filename = generateProfileFilename();
				const outputPath = join(PROFILES_BASELINE_DIR, filename);
				
				await runProfilingTest(outputPath);
				
				const entry = await registry.registerProfile(outputPath);
				await registry.setBaseline(entry.id, false);
				
				console.info(`✅ Baseline created: ${entry.version}`);
				console.info(`   File: ${outputPath}`);
				console.info(`   ID: ${entry.id}`);
				break;
			}
			
			case "--compare":
			case "compare": {
				console.info("Comparing against baseline...");
				const baseline = await registry.getBaseline();
				
				if (!baseline) {
					console.error("❌ No baseline set. Run with --baseline first.");
					process.exit(1);
				}
				
				const filename = generateProfileFilename();
				const outputPath = join(PROFILES_VERSIONS_DIR, filename);
				
				await runProfilingTest(outputPath);
				
				const current = await registry.registerProfile(outputPath);
				const comparison = await registry.compareProfiles(current, baseline);
				
				console.info(`\n📊 Comparison Results:`);
				console.info(`   Current: ${current.version}`);
				console.info(`   Baseline: ${baseline.version}`);
				console.info(`   Severity: ${comparison.severity}`);
				console.info(`   ${comparison.message}`);
				console.info(`\n   Execution Time: ${comparison.metrics.executionTimeDeltaPercent.toFixed(2)}%`);
				console.info(`   Function Calls: ${comparison.metrics.functionCallsDeltaPercent.toFixed(2)}%`);
				
				if (comparison.hotFunctionShifts && comparison.hotFunctionShifts.length > 0) {
					console.info(`\n   Hot Function Shifts:`);
					comparison.hotFunctionShifts.forEach((shift) => {
						console.info(`     - ${shift.name}: ${shift.timeDeltaPercent.toFixed(2)}%`);
					});
				}
				
				if (comparison.severity === CPUProfiling.RegressionSeverity.CRITICAL) {
					console.error("\n❌ Critical regression detected!");
					process.exit(1);
				}
				break;
			}
			
			case "--freeze":
			case "freeze": {
				console.info("Freezing baseline...");
				const version = args[1];
				await registry.freezeBaseline(version);
				console.info("✅ Baseline frozen");
				break;
			}
			
			case "--list":
			case "list": {
				const profiles = await registry.listProfiles();
				console.info(`\n📋 Profiles (${profiles.length}):\n`);
				profiles.forEach((profile) => {
					console.info(`   ${profile.version}`);
					console.info(`   ID: ${profile.id}`);
					console.info(`   Created: ${profile.createdAt}`);
					console.info(`   Git Hash: ${profile.gitHash}`);
					console.info(`   Metrics: ${profile.metrics.totalTime}ms, ${profile.metrics.functionCalls} calls`);
					console.info("");
				});
				break;
			}
			
			case "--status":
			case "status": {
				const status = await registry.getRegressionStatus();
				console.info("\n📊 Regression Status:\n");
				console.info(`   Has Baseline: ${status.hasBaseline ? "✅" : "❌"}`);
				console.info(`   Has Profiles: ${status.hasProfiles ? "✅" : "❌"}`);
				
				if (status.latestProfile) {
					console.info(`   Latest: ${status.latestProfile.version}`);
				}
				
				if (status.baseline) {
					console.info(`   Baseline: ${status.baseline.version}`);
				}
				
				if (status.regression) {
					console.info(`\n   Regression: ${status.regression.severity}`);
					console.info(`   ${status.regression.message}`);
				}
				break;
			}
			
			case "--test":
			case "test":
			default: {
				console.info("Running CPU profiling test...");
				const filename = generateProfileFilename();
				const outputPath = join(PROFILES_VERSIONS_DIR, filename);
				
				await runProfilingTest(outputPath);
				
				const entry = await registry.registerProfile(outputPath);
				
				console.info(`✅ Profile created: ${entry.version}`);
				console.info(`   File: ${outputPath}`);
				console.info(`   ID: ${entry.id}`);
				console.info(`   Metrics: ${entry.metrics.totalTime}ms, ${entry.metrics.functionCalls} calls`);
				
				// Check against baseline if exists
				const baseline = await registry.getBaseline();
				if (baseline) {
					const comparison = await registry.compareProfiles(entry, baseline);
					console.info(`\n📊 Comparison:`);
					console.info(`   ${comparison.message}`);
					
					if (comparison.severity === CPUProfiling.RegressionSeverity.CRITICAL) {
						console.error("\n❌ Critical regression detected!");
						process.exit(1);
					}
				}
				break;
			}
		}
	} catch (error) {
		console.error("❌ Error:", error instanceof Error ? error.message : String(error));
		process.exit(1);
	}
}

// Run if executed directly
if (import.meta.main) {
	await main();
}

// Export for use as module
export { runTestSuites };
