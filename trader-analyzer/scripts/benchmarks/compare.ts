#!/usr/bin/env bun
/**
 * @fileoverview Benchmark Comparison Tool
 * @description Compare two benchmarks and detect regressions
 * @module scripts/benchmarks/compare
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";

interface BenchmarkMetadata {
	id: string;
	name: string;
	profile: {
		durationMs?: number;
		sampleCount?: number;
	};
	analysis?: {
		hotspots?: string[];
		recommendations?: string[];
	};
	createdAt: string;
	gitCommit: string;
}

interface ComparisonResult {
	baseline: BenchmarkMetadata;
	current: BenchmarkMetadata;
	regression: boolean;
	improvement: boolean;
	metrics: {
		duration: {
			baseline: number;
			current: number;
			change: number;
			changePercent: number;
		};
		sampleCount?: {
			baseline: number;
			current: number;
			change: number;
			changePercent: number;
		};
	};
	threshold: number;
}

/**
 * Load benchmark metadata
 */
function loadBenchmark(id: string): BenchmarkMetadata {
	const metadataPath = join("benchmarks", "metadata", `${id}.json`);
	if (!existsSync(metadataPath)) {
		throw new Error(`Benchmark metadata not found: ${metadataPath}`);
	}
	return JSON.parse(readFileSync(metadataPath, "utf-8"));
}

/**
 * Compare two benchmarks
 */
function compareBenchmarks(
	baselineId: string,
	currentId: string,
	threshold: number = 5,
): ComparisonResult {
	const baseline = loadBenchmark(baselineId);
	const current = loadBenchmark(currentId);

	const baselineDuration = baseline.profile.durationMs || 0;
	const currentDuration = current.profile.durationMs || 0;
	const durationChange = currentDuration - baselineDuration;
	const durationChangePercent = baselineDuration > 0
		? (durationChange / baselineDuration) * 100
		: 0;

	const baselineSamples = baseline.profile.sampleCount || 0;
	const currentSamples = current.profile.sampleCount || 0;
	const sampleChange = currentSamples - baselineSamples;
	const sampleChangePercent = baselineSamples > 0
		? (sampleChange / baselineSamples) * 100
		: 0;

	const regression = durationChangePercent > threshold;
	const improvement = durationChangePercent < -threshold;

	return {
		baseline,
		current,
		regression,
		improvement,
		metrics: {
			duration: {
				baseline: baselineDuration,
				current: currentDuration,
				change: durationChange,
				changePercent: durationChangePercent,
			},
			sampleCount: baselineSamples > 0 && currentSamples > 0
				? {
						baseline: baselineSamples,
						current: currentSamples,
						change: sampleChange,
						changeChangePercent: sampleChangePercent,
					}
				: undefined,
		},
		threshold,
	};
}

/**
 * Format comparison report
 */
function formatReport(result: ComparisonResult): string {
	const { baseline, current, metrics, regression, improvement, threshold } = result;

	let report = "\n📊 Benchmark Comparison Report\n";
	report += "=".repeat(50) + "\n\n";
	report += `Baseline: ${baseline.name} (${baseline.id})\n`;
	report += `  Commit: ${baseline.gitCommit}\n`;
	report += `  Created: ${new Date(baseline.createdAt).toLocaleString()}\n\n`;
	report += `Current:  ${current.name} (${current.id})\n`;
	report += `  Commit: ${current.gitCommit}\n`;
	report += `  Created: ${new Date(current.createdAt).toLocaleString()}\n\n`;

	report += "Performance Metrics:\n";
	report += "-".repeat(50) + "\n";
	report += `Duration:\n`;
	report += `  Baseline: ${metrics.duration.baseline.toFixed(2)}ms\n`;
	report += `  Current:  ${metrics.duration.current.toFixed(2)}ms\n`;
	report += `  Change:   ${metrics.duration.change >= 0 ? "+" : ""}${metrics.duration.change.toFixed(2)}ms (${metrics.duration.changePercent >= 0 ? "+" : ""}${metrics.duration.changePercent.toFixed(2)}%)\n\n`;

	if (metrics.sampleCount) {
		report += `Sample Count:\n`;
		report += `  Baseline: ${metrics.sampleCount.baseline}\n`;
		report += `  Current:  ${metrics.sampleCount.current}\n`;
		report += `  Change:   ${metrics.sampleCount.change >= 0 ? "+" : ""}${metrics.sampleCount.change} (${metrics.sampleCount.changePercent >= 0 ? "+" : ""}${metrics.sampleCount.changePercent.toFixed(2)}%)\n\n`;
	}

	report += "Analysis:\n";
	report += "-".repeat(50) + "\n";

	if (improvement) {
		report += `✅ IMPROVEMENT: ${Math.abs(metrics.duration.changePercent).toFixed(2)}% faster (threshold: ${threshold}%)\n`;
	} else if (regression) {
		report += `❌ REGRESSION: ${metrics.duration.changePercent.toFixed(2)}% slower (threshold: ${threshold}%)\n`;
	} else {
		report += `➡️  NO SIGNIFICANT CHANGE: ${metrics.duration.changePercent.toFixed(2)}% difference (threshold: ${threshold}%)\n`;
	}

	if (current.analysis?.hotspots && current.analysis.hotspots.length > 0) {
		report += `\nHotspots in current benchmark:\n`;
		current.analysis.hotspots.forEach((hotspot) => {
			report += `  - ${hotspot}\n`;
		});
	}

	if (current.analysis?.recommendations && current.analysis.recommendations.length > 0) {
		report += `\nRecommendations:\n`;
		current.analysis.recommendations.forEach((rec) => {
			report += `  ${rec}\n`;
		});
	}

	return report;
}

// CLI
const args = process.argv.slice(2);
const baselineIndex = args.indexOf("--baseline");
const currentIndex = args.indexOf("--current");
const thresholdIndex = args.indexOf("--threshold");
const failOnRegressionIndex = args.indexOf("--fail-on-regression");

if (baselineIndex === -1 || currentIndex === -1) {
	console.error("Usage: bun run scripts/benchmarks/compare.ts \\");
	console.error("  --baseline=<id> \\");
	console.error("  --current=<id> \\");
	console.error("  [--threshold=<percent>] (default: 5) \\");
	console.error("  [--fail-on-regression]");
	process.exit(1);
}

const baselineId =
	args[baselineIndex + 1] || args.find((a) => a.startsWith("--baseline="))?.split("=")[1];
const currentId =
	args[currentIndex + 1] || args.find((a) => a.startsWith("--current="))?.split("=")[1];
const thresholdStr =
	thresholdIndex !== -1
		? args[thresholdIndex + 1] || args.find((a) => a.startsWith("--threshold="))?.split("=")[1]
		: undefined;
const threshold = thresholdStr ? parseFloat(thresholdStr) : 5;
const failOnRegression = failOnRegressionIndex !== -1;

if (!baselineId || !currentId) {
	console.error("Error: --baseline and --current are required");
	process.exit(1);
}

try {
	const result = compareBenchmarks(baselineId, currentId, threshold);
	const report = formatReport(result);
	console.log(report);

	if (failOnRegression && result.regression) {
		console.error("\n❌ Regression detected! Failing build.");
		process.exit(1);
	}
} catch (error) {
	console.error("Error comparing benchmarks:", error);
	process.exit(1);
}
