#!/usr/bin/env bun
/**
 * Demo: Enhanced R-Score Framework Formatting
 *
 * Demonstrates the R-Score calculation and formatting utilities
 *
 * Usage:
 *   bun scripts/demo-r-score.ts
 *   bun scripts/demo-r-score.ts --example <1-3>
 */

import {
	calculateRScore,
	calculatePRatio,
	calculateMImpact,
	formatRScore,
	formatRScoreTable,
	formatSpeedup,
	type RScoreParams,
} from '../optimizations/bun-optimizations.ts';

function example1(): void {
	console.log('═══════════════════════════════════════════════════════════');
	console.log('Example 1: High-Performance Optimization (ID 8)');
	console.log('═══════════════════════════════════════════════════════════\n');

	// ID 8 from docs/BUN_CONSTANTS_TABLE.md: 90ns native vs 1850ns userland
	const pRatio = calculatePRatio(90, 1850);
	const mImpact = calculateMImpact(320, 1024);

	const params: RScoreParams = {
		P_ratio: pRatio,
		M_impact: mImpact,
		E_elimination: 1.0,
		S_hardening: 1.0,
		D_ergonomics: 0.95,
	};

	const rScore = calculateRScore(params);

	console.log('Performance Metrics:');
	console.log(`  Native: 90ns, Userland: 1850ns → P_ratio: ${pRatio.toFixed(4)}`);
	console.log(`  Memory saved: 320B / 1024B → M_impact: ${mImpact.toFixed(4)}\n`);

	console.log(formatRScoreTable(params));
	console.log(`\nOverall R-Score: ${formatRScore(rScore)}\n`);
}

function example2(): void {
	console.log('═══════════════════════════════════════════════════════════');
	console.log('Example 2: Speedup Scaling by Payload Size');
	console.log('═══════════════════════════════════════════════════════════\n');

	const sizes = [0.1, 1, 10, 100, 1024, 10240, 102400];

	console.log('Payload Size → Speedup:');
	for (const sizeKB of sizes) {
		console.log(`  ${formatSpeedup(sizeKB)}`);
	}
	console.log('');
}

function example3(): void {
	console.log('═══════════════════════════════════════════════════════════');
	console.log('Example 3: R-Score Threshold Comparison');
	console.log('═══════════════════════════════════════════════════════════\n');

	const examples: Array<{name: string; params: RScoreParams}> = [
		{
			name: 'Excellent (High-throughput)',
			params: {P_ratio: 0.35, M_impact: 0.95, E_elimination: 1.0, S_hardening: 1.0, D_ergonomics: 0.95},
		},
		{
			name: 'Good (Production)',
			params: {P_ratio: 0.5, M_impact: 0.85, E_elimination: 0.95, S_hardening: 0.95, D_ergonomics: 0.9},
		},
		{
			name: 'Acceptable (Standard)',
			params: {P_ratio: 0.7, M_impact: 0.75, E_elimination: 0.85, S_hardening: 0.85, D_ergonomics: 0.8},
		},
		{
			name: 'Poor (Needs Optimization)',
			params: {P_ratio: 0.9, M_impact: 0.6, E_elimination: 0.7, S_hardening: 0.7, D_ergonomics: 0.65},
		},
	];

	for (const example of examples) {
		const rScore = calculateRScore(example.params);
		console.log(`${example.name}:`);
		console.log(`  ${formatRScore(rScore)}`);
		console.log('');
	}
}

function main(): void {
	const args = process.argv.slice(2);
	const exampleArg = args.find(arg => arg.startsWith('--example='));
	const exampleNum = exampleArg ? parseInt(exampleArg.split('=')[1] || '0', 10) : 0;

	if (exampleNum === 1) {
		example1();
	} else if (exampleNum === 2) {
		example2();
	} else if (exampleNum === 3) {
		example3();
	} else {
		// Run all examples
		example1();
		console.log('\n');
		example2();
		console.log('\n');
		example3();
	}
}

if (import.meta.main) {
	main();
}
