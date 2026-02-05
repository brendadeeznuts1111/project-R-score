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
	console.log("Running CPU profiling test suites...");
	
	console.log("  - Synchronous CPU work");
	syncWork();
	
	console.log("  - Async operations");
	await asyncWork();
	
	console.log("  - HTTP request simulation");
	await httpSimulation();
	
	console.log("  - Mixed workload");
	await mixedWorkload();
	
	console.log("  - Memory allocation patterns");
	memoryAllocation();
	
	console.log("Test suites completed");
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
				console.log("Creating baseline profile...");
				const filename = generateProfileFilename();
				const outputPath = join(PROFILES_BASELINE_DIR, filename);
				
				await runProfilingTest(outputPath);
				
				const entry = await registry.registerProfile(outputPath);
				await registry.setBaseline(entry.id, false);
				
				console.log(`✅ Baseline created: ${entry.version}`);
				console.log(`   File: ${outputPath}`);
				console.log(`   ID: ${entry.id}`);
				break;
			}
			
			case "--compare":
			case "compare": {
				console.log("Comparing against baseline...");
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
				
				console.log(`\n📊 Comparison Results:`);
				console.log(`   Current: ${current.version}`);
				console.log(`   Baseline: ${baseline.version}`);
				console.log(`   Severity: ${comparison.severity}`);
				console.log(`   ${comparison.message}`);
				console.log(`\n   Execution Time: ${comparison.metrics.executionTimeDeltaPercent.toFixed(2)}%`);
				console.log(`   Function Calls: ${comparison.metrics.functionCallsDeltaPercent.toFixed(2)}%`);
				
				if (comparison.hotFunctionShifts && comparison.hotFunctionShifts.length > 0) {
					console.log(`\n   Hot Function Shifts:`);
					comparison.hotFunctionShifts.forEach((shift) => {
						console.log(`     - ${shift.name}: ${shift.timeDeltaPercent.toFixed(2)}%`);
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
				console.log("Freezing baseline...");
				const version = args[1];
				await registry.freezeBaseline(version);
				console.log("✅ Baseline frozen");
				break;
			}
			
			case "--list":
			case "list": {
				const profiles = await registry.listProfiles();
				console.log(`\n📋 Profiles (${profiles.length}):\n`);
				profiles.forEach((profile) => {
					console.log(`   ${profile.version}`);
					console.log(`   ID: ${profile.id}`);
					console.log(`   Created: ${profile.createdAt}`);
					console.log(`   Git Hash: ${profile.gitHash}`);
					console.log(`   Metrics: ${profile.metrics.totalTime}ms, ${profile.metrics.functionCalls} calls`);
					console.log("");
				});
				break;
			}
			
			case "--status":
			case "status": {
				const status = await registry.getRegressionStatus();
				console.log("\n📊 Regression Status:\n");
				console.log(`   Has Baseline: ${status.hasBaseline ? "✅" : "❌"}`);
				console.log(`   Has Profiles: ${status.hasProfiles ? "✅" : "❌"}`);
				
				if (status.latestProfile) {
					console.log(`   Latest: ${status.latestProfile.version}`);
				}
				
				if (status.baseline) {
					console.log(`   Baseline: ${status.baseline.version}`);
				}
				
				if (status.regression) {
					console.log(`\n   Regression: ${status.regression.severity}`);
					console.log(`   ${status.regression.message}`);
				}
				break;
			}
			
			case "--test":
			case "test":
			default: {
				console.log("Running CPU profiling test...");
				const filename = generateProfileFilename();
				const outputPath = join(PROFILES_VERSIONS_DIR, filename);
				
				await runProfilingTest(outputPath);
				
				const entry = await registry.registerProfile(outputPath);
				
				console.log(`✅ Profile created: ${entry.version}`);
				console.log(`   File: ${outputPath}`);
				console.log(`   ID: ${entry.id}`);
				console.log(`   Metrics: ${entry.metrics.totalTime}ms, ${entry.metrics.functionCalls} calls`);
				
				// Check against baseline if exists
				const baseline = await registry.getBaseline();
				if (baseline) {
					const comparison = await registry.compareProfiles(entry, baseline);
					console.log(`\n📊 Comparison:`);
					console.log(`   ${comparison.message}`);
					
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
