#!/usr/bin/env bun
/**
 * @fileoverview CPU Profiling Report Generator
 * @description Generate regression report comparing latest profile against baseline
 */

import { CPUProfilingRegistry, CPUProfiling } from "../src/utils/cpu-profiling-registry";

const registry = new CPUProfilingRegistry();

async function main() {
	console.log("📊 CPU Profiling Regression Report\n");
	console.log("=" .repeat(60));
	
	const status = await registry.getRegressionStatus();
	
	console.log("\n📋 Status:");
	console.log(`   Has Baseline: ${status.hasBaseline ? "✅ Yes" : "❌ No"}`);
	console.log(`   Has Profiles: ${status.hasProfiles ? "✅ Yes" : "❌ No"}`);
	
	if (!status.hasBaseline) {
		console.log("\n⚠️  No baseline set. Run 'bun run cpu-prof:baseline' first.");
		console.log("   Or use: bunx cpu-prof:baseline");
		return;
	}
	
	if (!status.hasProfiles) {
		console.log("\n⚠️  No profiles found. Run 'bun run cpu-prof:test' first.");
		console.log("   Or use: bunx cpu-prof:test");
		return;
	}
	
	console.log("\n📈 Latest Profile:");
	if (status.latestProfile) {
		console.log(`   Version: ${status.latestProfile.version}`);
		console.log(`   Created: ${status.latestProfile.createdAt}`);
		console.log(`   Git Hash: ${status.latestProfile.gitHash}`);
		console.log(`   Metrics:`);
		console.log(`     - Total Time: ${status.latestProfile.metrics.totalTime}ms`);
		console.log(`     - Function Calls: ${status.latestProfile.metrics.functionCalls}`);
	}
	
	console.log("\n🎯 Baseline:");
	if (status.baseline) {
		console.log(`   Version: ${status.baseline.version}`);
		console.log(`   Created: ${status.baseline.createdAt}`);
		console.log(`   Git Hash: ${status.baseline.gitHash}`);
		console.log(`   Metrics:`);
		console.log(`     - Total Time: ${status.baseline.metrics.totalTime}ms`);
		console.log(`     - Function Calls: ${status.baseline.metrics.functionCalls}`);
	}
	
	if (status.regression) {
		console.log("\n🔍 Regression Analysis:");
		console.log(`   Severity: ${status.regression.severity}`);
		console.log(`   ${status.regression.message}`);
		console.log(`\n   Metrics Comparison:`);
		console.log(`     - Execution Time: ${status.regression.metrics.executionTimeDeltaPercent.toFixed(2)}%`);
		console.log(`     - Function Calls: ${status.regression.metrics.functionCallsDeltaPercent.toFixed(2)}%`);
		
		if (status.regression.hotFunctionShifts && status.regression.hotFunctionShifts.length > 0) {
			console.log(`\n   Hot Function Shifts:`);
			status.regression.hotFunctionShifts.forEach((shift) => {
				const icon = shift.timeDeltaPercent > 0 ? "📈" : "📉";
				console.log(`     ${icon} ${shift.name}: ${shift.timeDeltaPercent.toFixed(2)}%`);
			});
		}
		
		if (status.regression.severity === CPUProfiling.RegressionSeverity.CRITICAL) {
			console.log("\n❌ CRITICAL REGRESSION DETECTED!");
			console.log("   Build should fail in CI/CD.");
			process.exit(1);
		} else if (status.regression.severity === CPUProfiling.RegressionSeverity.WARNING) {
			console.log("\n⚠️  WARNING: Performance degradation detected.");
			console.log("   Review recommended.");
		} else if (status.regression.severity === CPUProfiling.RegressionSeverity.IMPROVEMENT) {
			console.log("\n✅ IMPROVEMENT: Performance improved!");
		}
	}
	
	console.log("\n" + "=".repeat(60));
}

if (import.meta.main) {
	await main();
}
