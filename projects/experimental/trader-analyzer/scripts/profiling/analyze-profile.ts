#!/usr/bin/env bun
/**
 * @fileoverview CPU Profile Analyzer
 * @description Analyze CPU profiles from multi-layer system
 * @module scripts/profiling/analyze-profile
 *
 * @see {@link ../../docs/ANTI-PATTERNS.md|Anti-Patterns Guide} for coding best practices
 * @see {@link ../../docs/NAMING-CONVENTIONS.md|Naming Conventions} for code style guidelines
 */

import { readFileSync, writeFileSync } from "fs";

/**
 * CPU Profile structure (Chrome DevTools format)
 */
interface CPUProfile {
	nodes: Array<{
		callFrame: {
			functionName: string;
			url: string;
			lineNumber: number;
			columnNumber: number;
		};
		hitCount: number;
		children: number[];
	}>;
	startTime: number;
	endTime: number;
	samples: number[];
	timeDeltas: number[];
}

/**
 * Profile analysis result
 */
interface ProfileAnalysis {
	totalDuration: number;
	sampleCount: number;
	hotspots: Array<{ function: string; timeMs: number }>;
	layerPerformance: LayerPerformance;
	recommendations: string[];
}

/**
 * Layer performance breakdown
 */
interface LayerPerformance {
	layer1: number;
	layer2: number;
	layer3: number;
	layer4: number;
	crossLayer: number;
}

/**
 * Profile Analyzer for CPU profiles
 */
export class ProfileAnalyzer {
	constructor(private profilePath: string) {}

	/**
	 * Analyze profile
	 */
	async analyze(): Promise<ProfileAnalysis> {
		const profileData = this.loadProfile();
		const analysis = this.analyzeProfile(profileData);
		this.generateReport(analysis);
		return analysis;
	}

	/**
	 * Load profile from file
	 */
	private loadProfile(): CPUProfile {
		try {
			const content = readFileSync(this.profilePath, "utf-8");
			return JSON.parse(content) as CPUProfile;
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			throw new Error(`Failed to load profile: ${errorMessage}`);
		}
	}

	/**
	 * Analyze profile data
	 */
	private analyzeProfile(profile: CPUProfile): ProfileAnalysis {
		const analysis: ProfileAnalysis = {
			totalDuration: profile.endTime - profile.startTime,
			sampleCount: profile.samples.length,
			hotspots: [],
			layerPerformance: {
				layer1: 0,
				layer2: 0,
				layer3: 0,
				layer4: 0,
				crossLayer: 0,
			},
			recommendations: [],
		};

		// Analyze function hotspots
		const functionTimes = new Map<string, number>();

		profile.nodes.forEach((node) => {
			if (node.callFrame.functionName) {
				const functionName = node.callFrame.functionName;
				const isMultiLayerFunction = this.isMultiLayerFunction(functionName);

				if (isMultiLayerFunction) {
					const timeSpent = this.calculateFunctionTime(node, profile);
					functionTimes.set(
						functionName,
						(functionTimes.get(functionName) || 0) + timeSpent,
					);
				}
			}
		});

		// Convert to hotspots array
		analysis.hotspots = Array.from(functionTimes.entries())
			.map(([name, time]) => ({ function: name, timeMs: time }))
			.sort((a, b) => b.timeMs - a.timeMs)
			.slice(0, 10); // Top 10 hotspots

		// Analyze layer performance
		analysis.layerPerformance = this.analyzeLayerPerformance(profile);

		// Generate recommendations
		analysis.recommendations = this.generateRecommendations(analysis);

		return analysis;
	}

	/**
	 * Check if function is multi-layer related
	 */
	private isMultiLayerFunction(functionName: string): boolean {
		const multiLayerFunctions = [
			"computeRecursiveCorrelations",
			"detectHiddenEdges",
			"buildLayer",
			"calculateCrossLayerMetrics",
			"detectAnomalies",
			"propagateSignal",
			"mergeGraphs",
			"calculateConfidence",
		];

		return multiLayerFunctions.some((fn) => functionName.includes(fn));
	}

	/**
	 * Calculate function time (simplified)
	 */
	private calculateFunctionTime(
		node: CPUProfile["nodes"][0],
		profile: CPUProfile,
	): number {
		// Simplified calculation - in production would use actual sample times
		return node.hitCount * 0.1; // Estimate 0.1ms per hit
	}

	/**
	 * Analyze layer performance
	 */
	private analyzeLayerPerformance(profile: CPUProfile): LayerPerformance {
		const layerTimes: LayerPerformance = {
			layer1: 0,
			layer2: 0,
			layer3: 0,
			layer4: 0,
			crossLayer: 0,
		};

		profile.nodes.forEach((node) => {
			const functionName = node.callFrame.functionName || "";
			const timeSpent = this.calculateFunctionTime(node, profile);

			if (functionName.includes("Layer1") || functionName.includes("DirectCorrelation")) {
				layerTimes.layer1 += timeSpent;
			} else if (
				functionName.includes("Layer2") ||
				functionName.includes("CrossMarket")
			) {
				layerTimes.layer2 += timeSpent;
			} else if (
				functionName.includes("Layer3") ||
				functionName.includes("CrossEvent")
			) {
				layerTimes.layer3 += timeSpent;
			} else if (
				functionName.includes("Layer4") ||
				functionName.includes("CrossSport")
			) {
				layerTimes.layer4 += timeSpent;
			} else if (
				functionName.includes("CrossLayer") ||
				functionName.includes("MultiLayer")
			) {
				layerTimes.crossLayer += timeSpent;
			}
		});

		return layerTimes;
	}

	/**
	 * Generate optimization recommendations
	 */
	private generateRecommendations(analysis: ProfileAnalysis): string[] {
		const recommendations: string[] = [];

		// Check for recursive function bottlenecks
		const recursiveHotspots = analysis.hotspots.filter(
			(h) => h.function.includes("Recursive") || h.function.includes("recursive"),
		);

		if (recursiveHotspots.length > 0) {
			const worst = recursiveHotspots[0];
			recommendations.push(
				`🚨 Optimize recursive function ${worst.function} (${worst.timeMs.toFixed(2)}ms) - ` +
					`consider memoization or iterative approach`,
			);
		}

		// Check layer performance balance
		const layerTimes = Object.values(analysis.layerPerformance);
		const avgLayerTime =
			layerTimes.reduce((a, b) => a + b, 0) / layerTimes.length;

		Object.entries(analysis.layerPerformance).forEach(([layer, time]) => {
			if (time > avgLayerTime * 2) {
				recommendations.push(
					`⚖️  Layer ${layer} is taking ${time.toFixed(2)}ms (${(time / avgLayerTime).toFixed(1)}x average) - ` +
						`consider optimization or parallelization`,
				);
			}
		});

		// Check for memory issues
		if (analysis.totalDuration > 10000) {
			// 10 seconds
			recommendations.push(
				`⏱️  Total execution time ${(analysis.totalDuration / 1000).toFixed(2)}s is high - ` +
					`consider batching or streaming data processing`,
			);
		}

		return recommendations;
	}

	/**
	 * Generate analysis report
	 */
	private generateReport(analysis: ProfileAnalysis): void {
		const reportPath = this.profilePath.replace(".cpuprofile", "_analysis.json");

		const report = {
			metadata: {
				analyzedAt: new Date().toISOString(),
				profile: this.profilePath,
				system: "MultiLayerMarketAnalysis",
			},
			summary: {
				totalDurationMs: analysis.totalDuration,
				sampleCount: analysis.sampleCount,
				hotspotsCount: analysis.hotspots.length,
			},
			hotspots: analysis.hotspots,
			layerPerformance: analysis.layerPerformance,
			recommendations: analysis.recommendations,
		};

		writeFileSync(reportPath, JSON.stringify(report, null, 2));
		console.log(`📊 Analysis report saved to: ${reportPath}`);

		// Print summary
		console.log("\n🔥 Performance Hotspots:");
		analysis.hotspots.forEach((hotspot, i) => {
			console.log(`  ${i + 1}. ${hotspot.function}: ${hotspot.timeMs.toFixed(2)}ms`);
		});

		console.log("\n🏗️  Layer Performance:");
		Object.entries(analysis.layerPerformance).forEach(([layer, time]) => {
			console.log(`  ${layer}: ${time.toFixed(2)}ms`);
		});

		console.log("\n💡 Recommendations:");
		analysis.recommendations.forEach((rec, i) => {
			console.log(`  ${i + 1}. ${rec}`);
		});
	}
}

// Run if called directly
if (import.meta.main) {
	const profilePath = process.argv[2];
	if (!profilePath) {
		console.error("Usage: bun run scripts/profiling/analyze-profile.ts <path-to-cpuprofile>");
		process.exit(1);
	}

	const analyzer = new ProfileAnalyzer(profilePath);
	analyzer.analyze().catch((error: unknown) => {
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error("Analysis failed:", errorMessage);
		process.exit(1);
	});
}
