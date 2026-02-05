#!/usr/bin/env bun

/**
 * Display CLI constants using Bun.inspect.table
 * Shows BUN_FIX_PROJECTIONS and BUN_R_SCORE_BASELINE in formatted tables
 */

import {BUN_FIX_PROJECTIONS, BUN_R_SCORE_BASELINE} from '../src/cli-constants';

console.log('═══════════════════════════════════════════════════════════════');
console.log('  CLI Constants - Fix Projections Table');
console.log('═══════════════════════════════════════════════════════════════\n');

// Convert the Record to an array for table display
const projectionsArray = Object.entries(BUN_FIX_PROJECTIONS).map(([key, value]) => ({
	key,
	...value,
}));

// Display full table with all properties
console.log('📊 All Fix Projections:\n');
console.log(
	Bun.inspect.table(projectionsArray, ['key', 'flag', 'description', 'mImpact', 'pRatioDelta', 'projectedR', 'tier']),
);

// Display table with performance metrics only
console.log('\n📈 Performance Metrics:\n');
console.log(Bun.inspect.table(projectionsArray, ['flag', 'mImpact', 'pRatioDelta', 'projectedR', 'tier']));

// Display table with deltas
console.log('\n⚡ Impact Deltas:\n');
const deltaData = projectionsArray
	.filter(p => p.latencyDelta || p.consistencyDelta)
	.map(p => ({
		flag: p.flag,
		latencyDelta: p.latencyDelta || '-',
		consistencyDelta: p.consistencyDelta || '-',
	}));
if (deltaData.length > 0) {
	console.log(Bun.inspect.table(deltaData));
} else {
	console.log('No delta data available');
}

// Display baseline constant
console.log('\n🎯 Baseline R-Score:\n');
console.log(
	Bun.inspect.table([
		{
			constant: 'BUN_R_SCORE_BASELINE',
			value: BUN_R_SCORE_BASELINE,
			description: 'Baseline R-Score for dry-run projections',
		},
	]),
);

// Summary statistics
console.log('\n📊 Summary Statistics:\n');
const stats = {
	totalProjections: Object.keys(BUN_FIX_PROJECTIONS).length,
	eliteTier: projectionsArray.filter(p => p.tier === 'Elite').length,
	nativeGradeTier: projectionsArray.filter(p => p.tier === 'Native-Grade').length,
	avgProjectedR: (projectionsArray.reduce((sum, p) => sum + p.projectedR, 0) / projectionsArray.length).toFixed(3),
	maxProjectedR: Math.max(...projectionsArray.map(p => p.projectedR)).toFixed(3),
	minProjectedR: Math.min(...projectionsArray.map(p => p.projectedR)).toFixed(3),
	baselineR: BUN_R_SCORE_BASELINE,
};
console.log(Bun.inspect.table([stats]));

console.log('\n═══════════════════════════════════════════════════════════════\n');
