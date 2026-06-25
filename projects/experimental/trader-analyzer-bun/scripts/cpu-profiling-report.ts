#!/usr/bin/env bun
/**
 * @fileoverview CPU Profiling Report Generator
 * @description Generate regression report comparing latest profile against baseline
 */

import { CPUProfilingRegistry, CPUProfiling } from "../src/utils/cpu-profiling-registry";

const registry = new CPUProfilingRegistry();

async function main() {
	console.info("📊 CPU Profiling Regression Report\n");
	console.info("=" .repeat(60));
	
	const status = await registry.getRegressionStatus();
	
	console.info("\n📋 Status:");
	console.info(`   Has Baseline: ${status.hasBaseline ? "✅ Yes" : "❌ No"}`);
	console.info(`   Has Profiles: ${status.hasProfiles ? "✅ Yes" : "❌ No"}`);
	
	if (!status.hasBaseline) {
		console.info("\n⚠️  No baseline set. Run 'bun run cpu-prof:baseline' first.");
		console.info("   Or use: bunx cpu-prof:baseline");
		return;
	}
	
	if (!status.hasProfiles) {
		console.info("\n⚠️  No profiles found. Run 'bun run cpu-prof:test' first.");
		console.info("   Or use: bunx cpu-prof:test");
		return;
	}
	
	console.info("\n📈 Latest Profile:");
	if (status.latestProfile) {
		console.info(`   Version: ${status.latestProfile.version}`);
		console.info(`   Created: ${status.latestProfile.createdAt}`);
		console.info(`   Git Hash: ${status.latestProfile.gitHash}`);
		console.info(`   Metrics:`);
		console.info(`     - Total Time: ${status.latestProfile.metrics.totalTime}ms`);
		console.info(`     - Function Calls: ${status.latestProfile.metrics.functionCalls}`);
	}
	
	console.info("\n🎯 Baseline:");
	if (status.baseline) {
		console.info(`   Version: ${status.baseline.version}`);
		console.info(`   Created: ${status.baseline.createdAt}`);
		console.info(`   Git Hash: ${status.baseline.gitHash}`);
		console.info(`   Metrics:`);
		console.info(`     - Total Time: ${status.baseline.metrics.totalTime}ms`);
		console.info(`     - Function Calls: ${status.baseline.metrics.functionCalls}`);
	}
	
	if (status.regression) {
		console.info("\n🔍 Regression Analysis:");
		console.info(`   Severity: ${status.regression.severity}`);
		console.info(`   ${status.regression.message}`);
		console.info(`\n   Metrics Comparison:`);
		console.info(`     - Execution Time: ${status.regression.metrics.executionTimeDeltaPercent.toFixed(2)}%`);
		console.info(`     - Function Calls: ${status.regression.metrics.functionCallsDeltaPercent.toFixed(2)}%`);
		
		if (status.regression.hotFunctionShifts && status.regression.hotFunctionShifts.length > 0) {
			console.info(`\n   Hot Function Shifts:`);
			status.regression.hotFunctionShifts.forEach((shift) => {
				const icon = shift.timeDeltaPercent > 0 ? "📈" : "📉";
				console.info(`     ${icon} ${shift.name}: ${shift.timeDeltaPercent.toFixed(2)}%`);
			});
		}
		
		if (status.regression.severity === CPUProfiling.RegressionSeverity.CRITICAL) {
			console.info("\n❌ CRITICAL REGRESSION DETECTED!");
			console.info("   Build should fail in CI/CD.");
			process.exit(1);
		} else if (status.regression.severity === CPUProfiling.RegressionSeverity.WARNING) {
			console.info("\n⚠️  WARNING: Performance degradation detected.");
			console.info("   Review recommended.");
		} else if (status.regression.severity === CPUProfiling.RegressionSeverity.IMPROVEMENT) {
			console.info("\n✅ IMPROVEMENT: Performance improved!");
		}
	}
	
	console.info("\n" + "=".repeat(60));
}

if (import.meta.main) {
	await main();
}
