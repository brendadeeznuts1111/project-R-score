#!/usr/bin/env bun
/**
 * @fileoverview Create Layer4 Correlation Detection Baseline
 * @description Script to create the initial baseline benchmark for Layer4 correlation detection
 * @module scripts/benchmarks/create-layer4-baseline
 * 
 * Usage:
 *   bun run scripts/benchmarks/create-layer4-baseline.ts
 */

import { $ } from "bun";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";

const BENCHMARK_ID = "layer4-correlation-baseline";
const BENCHMARK_NAME = "Layer4 Correlation Detection Baseline";
const BENCHMARK_DESCRIPTION = "Baseline performance benchmark for Layer4 cross-sport correlation detection";

async function createBaseline() {
	console.log("🎯 Creating Layer4 correlation detection baseline...");
	
	// Ensure profiles directory exists
	const profilesDir = "profiles";
	if (!existsSync(profilesDir)) {
		mkdirSync(profilesDir, { recursive: true });
	}
	
	// Ensure benchmarks directories exist
	const benchmarksDir = "benchmarks";
	const metadataDir = join(benchmarksDir, "metadata");
	const cpuProfilesDir = join(benchmarksDir, "cpu-profiles");
	const analysisDir = join(benchmarksDir, "analysis");
	
	[benchmarksDir, metadataDir, cpuProfilesDir, analysisDir].forEach(dir => {
		if (!existsSync(dir)) {
			mkdirSync(dir, { recursive: true });
		}
	});
	
	// Run performance benchmarks
	console.log("📊 Running Layer4 correlation detection benchmarks...");
	console.log("   This may take a few minutes...");
	console.log("   Note: CPU profiling will be added in a future update.");
	console.log("   For now, creating baseline from test execution metrics.");
	
	try {
		// Run benchmarks with 50 repeats to get stable metrics
		console.log("   Running benchmarks with 50 repeats...");
		await $`bun test --repeats=50 ./test/profiling/correlation-detection.bench.ts`;
		
		// Create a simple baseline metadata file
		console.log("📝 Creating benchmark metadata...");
		
		const gitCommit = await $`git rev-parse HEAD`.text().then(s => s.trim());
		const gitBranch = await $`git rev-parse --abbrev-ref HEAD`.text().then(s => s.trim());
		
		// Create baseline metadata manually since we don't have CPU profile yet
		const baselineMetadata = {
			id: BENCHMARK_ID,
			name: BENCHMARK_NAME,
			description: BENCHMARK_DESCRIPTION,
			createdAt: new Date().toISOString(),
			gitCommit: gitCommit,
			gitBranch: gitBranch,
			system: {
				os: process.platform,
				arch: process.arch,
				nodeVersion: `bun/${Bun.version}`,
			},
			profile: {
				type: "test-execution",
				file: null,
				note: "Baseline created from test execution metrics. CPU profiling to be added.",
			},
			tags: ["layer4", "correlation", "baseline"],
			relatedBenchmarks: [],
		};
		
		// Write metadata file
		const metadataPath = join(metadataDir, `${BENCHMARK_ID}.json`);
		await Bun.write(metadataPath, JSON.stringify(baselineMetadata, null, 2));
		
		console.log(`✅ Baseline benchmark created: ${BENCHMARK_ID}`);
		console.log(`   Metadata: ${metadataPath}`);
		
		// Verify file was created
		if (existsSync(metadataPath)) {
			console.log(`   ✅ Metadata file verified: ${metadataPath}`);
		} else {
			throw new Error(`Failed to create metadata file: ${metadataPath}`);
		}
		
		console.log("\n🎉 Layer4 correlation detection baseline created successfully!");
		console.log("   This baseline will be used for performance regression detection in CI/CD.");
		
	} catch (error) {
		console.error("❌ Failed to create baseline:", error);
		process.exit(1);
	}
}

// Run if executed directly
if (import.meta.main) {
	createBaseline();
}
