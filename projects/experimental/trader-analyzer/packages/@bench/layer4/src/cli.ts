#!/usr/bin/env bun

import {
	iterateProperty,
	runPropertyBenchmark,
	saveBenchmarkResults,
	getBaselineBenchmark,
	checkRegressions,
	type PropertyConfig,
	type BenchmarkConfig,
	type BenchmarkResult,
} from "@bench/core";
import { Layer4AnomalyDetection } from "@graph/layer4";

interface PropertyConfig {
	name: string;
	values: number[];
	current: number;
}

// Fast property iteration for @graph/layer4
const PROPERTIES: PropertyConfig[] = [
	{
		name: "threshold",
		values: [0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9],
		current: 0.75,
	},
	{
		name: "zScoreThreshold",
		values: [1.5, 1.75, 2.0, 2.25, 2.5],
		current: 2.0,
	},
	{
		name: "patternThreshold",
		values: [0.55, 0.6, 0.65, 0.7, 0.75],
		current: 0.65,
	},
	{
		name: "decayRate",
		values: [0.1, 0.15, 0.2, 0.25, 0.3, 0.35],
		current: 0.25,
	},
];

// Mock data generators (replace with actual implementations)
function generateMockGraph() {
	return {
		nodes: Array.from({ length: 100 }, (_, i) => ({
			id: `node-${i}`,
			data: { value: Math.random() },
		})),
		edges: Array.from({ length: 200 }, () => ({
			source: `node-${Math.floor(Math.random() * 100)}`,
			target: `node-${Math.floor(Math.random() * 100)}`,
			weight: Math.random(),
		})),
	};
}

function generateMockCorrelations() {
	return Array.from({ length: 50 }, () => ({
		source: `node-${Math.floor(Math.random() * 100)}`,
		target: `node-${Math.floor(Math.random() * 100)}`,
		strength: Math.random(),
		timestamp: Date.now(),
	}));
}

// Fast iteration: Test each property value independently
async function benchmarkProperty(
	property: PropertyConfig,
): Promise<{ value: number; duration: number; anomalyCount: number; avgConfidence: number }> {
	const start = performance.now();

	// Create detector with modified property
	const config: Record<string, number> = {
		threshold: 0.75,
		zScoreThreshold: 2.0,
		patternThreshold: 0.65,
		minCorrelationThreshold: 0.3,
		decayRate: 0.25,
	};

	config[property.name] = property.values[0]; // Use first value for this iteration

	const detector = new Layer4AnomalyDetection(config);
	const graph = generateMockGraph();
	const correlations = generateMockCorrelations();

	const anomalies = detector.detectAnomalies(correlations, graph);

	const duration = performance.now() - start;
	const avgConfidence =
		anomalies.length > 0
			? anomalies.reduce((s, a) => s + a.confidenceScore, 0) / anomalies.length
			: 0;

	return {
		value: property.values[0],
		duration,
		anomalyCount: anomalies.length,
		avgConfidence,
	};
}

// Run all property iterations
async function runPropertyBenchmark() {
	console.log("🚀 Starting Layer4 Property Iteration Benchmark\n");

	const packageJson = await Bun.file("../../package.json").json();
	const config: BenchmarkConfig = {
		package: "@graph/layer4",
		version: packageJson.version || "1.0.0",
		properties: PROPERTIES,
		thresholds: {
			performance: 100,
			memory: 50,
			regression: 0.05,
		},
	};

	const allResults = [];

	for (const prop of PROPERTIES) {
		console.log(`📊 Iterating ${prop.name} (${prop.values.length} values)`);

		const results = [];
		for (const value of prop.values) {
			const start = performance.now();

			const detectorConfig: Record<string, number> = {
				threshold: 0.75,
				zScoreThreshold: 2.0,
				patternThreshold: 0.65,
				minCorrelationThreshold: 0.3,
				decayRate: 0.25,
			};
			detectorConfig[prop.name] = value;

			const detector = new Layer4AnomalyDetection(detectorConfig);
			const graph = generateMockGraph();
			const correlations = generateMockCorrelations();
			const anomalies = detector.detectAnomalies(correlations, graph);

			const duration = performance.now() - start;
			const avgConfidence =
				anomalies.length > 0
					? anomalies.reduce((s, a) => s + a.confidenceScore, 0) / anomalies.length
					: 0;

			results.push({
				value,
				duration,
				anomalyCount: anomalies.length,
				avgConfidence,
			});
		}

		const bestResult = results.reduce((best, r) =>
			r.duration < best.duration ? r : best,
		);

		allResults.push({
			property: prop.name,
			bestValue: bestResult.value,
			results,
			recommendation: `Recommended value: ${bestResult.value}`,
		});

		console.log(`✅ ${prop.name}: best value = ${bestResult.value}\n`);
	}

	// Save to private registry metadata
	const benchmarkResult: BenchmarkResult = {
		package: config.package,
		version: config.version,
		timestamp: Date.now(),
		results: allResults,
		metadata: {
			environment: process.env.NODE_ENV || "development",
			nodeVersion: process.version,
			bunVersion: Bun.version,
			os: process.platform,
			arch: process.arch,
		},
		environment: {
			NODE_ENV: process.env.NODE_ENV || "development",
			nodeVersion: process.version,
			bunVersion: Bun.version,
			os: process.platform,
			arch: process.arch,
		},
	};

	try {
		await saveBenchmarkResults(benchmarkResult);
		console.log("✅ Benchmark results saved to registry");
	} catch (error) {
		console.error("❌ Failed to save benchmark results:", error);
	}

	// Check for regressions
	try {
		const baseline = await getBaselineBenchmark(config.package, config.version);
		if (baseline) {
			const regressions = checkRegressions(
				benchmarkResult,
				baseline,
				config.thresholds,
			);
			if (regressions.length > 0) {
				console.warn("⚠️ Performance regressions detected:");
				for (const regression of regressions) {
					console.warn(`  - ${regression.property}: ${regression.recommendation}`);
				}
			} else {
				console.log("✅ No regressions detected");
			}
		}
	} catch (error) {
		console.warn("⚠️ Could not check for regressions:", error);
	}
}

// CLI: bun run @bench/layer4 --property=threshold --values=0.5,0.6,0.7,0.8
if (process.argv[2] === "--property") {
	const propName = process.argv[3];
	const values = process.argv[5]?.split(",").map(Number) || [];

	const prop = PROPERTIES.find((p) => p.name === propName);
	if (!prop) {
		console.error(`Unknown property: ${propName}`);
		process.exit(1);
	}

	if (values.length > 0) {
		prop.values = values;
	}

	iterateProperty(prop, async (value) => {
		const start = performance.now();
		const detectorConfig: Record<string, number> = {
			threshold: 0.75,
			zScoreThreshold: 2.0,
			patternThreshold: 0.65,
			minCorrelationThreshold: 0.3,
			decayRate: 0.25,
		};
		detectorConfig[prop.name] = value;

		const detector = new Layer4AnomalyDetection(detectorConfig);
		const graph = generateMockGraph();
		const correlations = generateMockCorrelations();
		const anomalies = detector.detectAnomalies(correlations, graph);

		const duration = performance.now() - start;
		const avgConfidence =
			anomalies.length > 0
				? anomalies.reduce((s, a) => s + a.confidenceScore, 0) / anomalies.length
				: 0;

		return {
			value,
			duration,
			anomalyCount: anomalies.length,
			avgConfidence,
		};
	}).then((result) => {
		console.log("Property iteration complete:", result);
	});
} else {
	// Default: Run all properties
	runPropertyBenchmark();
}
