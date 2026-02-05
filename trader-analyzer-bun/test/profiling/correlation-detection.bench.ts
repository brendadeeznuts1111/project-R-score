/**
 * @fileoverview Layer 4 Performance Benchmarks
 * @description Performance benchmarks for correlation detection algorithms
 * @module test/profiling/correlation-detection
 * 
 * Usage:
 *   # Run performance benchmarks (50 repeats recommended)
 *   bun run test:bench test/profiling/correlation-detection.bench.ts
 * 
 *   # Run with custom repeats
 *   bun test --repeats=50 test/profiling/correlation-detection.bench.ts
 * 
 *   # Run with verbose output
 *   bun test --repeats=50 --verbose test/profiling/correlation-detection.bench.ts
 * 
 * @see scripts/test-runner.ts
 * @see docs/BUN-TEST-COMMANDS.md
 * @see src/utils/rss-constants.ts TEST_CONFIG
 */

import { describe, expect, test } from "bun:test";
import type {
    CrossSportCorrelation,
    MultiLayerGraph,
} from "../../src/arbitrage/shadow-graph/multi-layer-correlation-graph";
import { createMockSportData } from "../setup";

describe("Layer4 Performance Benchmarks", () => {
	// Generate large dataset for benchmarking using mock factory
	const generateLargeDataset = (size: number) => {
		const sports = [
			"basketball",
			"soccer",
			"tennis",
			"american_football",
			"baseball",
			"hockey",
			"cricket",
			"rugby",
			"golf",
			"boxing",
		];
		const data: ReturnType<typeof createMockSportData>[] = [];

		for (let i = 0; i < size; i++) {
			const timestamp = Date.now() - Math.random() * 86400000;
			const sportData = createMockSportData(sports[i % sports.length], timestamp);
			// Add anomaly flags occasionally
			if (Math.random() > 0.9) {
				sportData.anomalyFlags.push("volume_spike");
			}
			data.push(sportData);
		}

		return data;
	};

	// Create mock graph builder
	const createMockGraph = (data: typeof generateLargeDataset extends (size: number) => infer R ? R : never): MultiLayerGraph => {
		const correlations: CrossSportCorrelation[] = [];
		const sports = new Set(data.map((d) => d.sport));

		// Generate cross-sport correlations
		const sportArray = Array.from(sports);
		for (let i = 0; i < sportArray.length; i++) {
			for (let j = i + 1; j < sportArray.length; j++) {
				correlations.push({
					shared_entity: `shared_${sportArray[i]}_${sportArray[j]}`,
					sport1_market: `${sportArray[i]}_market`,
					sport2_market: `${sportArray[j]}_market`,
					strength: Math.random(),
					latency: Math.floor(Math.random() * 1000),
					last_update: Date.now(),
				});
			}
		}

		return {
			layer1: {
				event_id: "test_event",
				correlations: [],
			},
			layer2: {
				event_id: "test_event",
				correlations: [],
			},
			layer3: {
				event_id_a: "test_event_a",
				event_id_b: "test_event_b",
				correlation_type: "team_futures",
				correlations: [],
			},
			layer4: {
				sport1: sportArray[0] || "basketball",
				sport2: sportArray.slice(1),
				correlations,
			},
			detection_priority: [],
		};
	};

	test("Graph building with 1000 data points", () => {
		const iterations = 20;
		const times: number[] = [];

		for (let i = 0; i < iterations; i++) {
			const start = performance.now();
			const data = generateLargeDataset(1000);
			const graph = createMockGraph(data);
			const end = performance.now();
			times.push(end - start);
			expect(graph.layer4.correlations.length).toBeGreaterThan(0);
		}

		const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
		const minTime = Math.min(...times);
		const maxTime = Math.max(...times);
		console.log(`  ⏱️  Avg: ${avgTime.toFixed(2)}ms, Min: ${minTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms`);
	});

	test("Anomaly detection with 500 correlations", () => {
		const iterations = 10;
		const times: number[] = [];

		for (let i = 0; i < iterations; i++) {
			const start = performance.now();
			const data = generateLargeDataset(100);
			const graph = createMockGraph(data);

			// Create mock correlations for anomaly detection
			const correlations: CrossSportCorrelation[] = [];
			for (let j = 0; j < 500; j++) {
				correlations.push({
					shared_entity: `entity_${j}`,
					sport1_market: "basketball_market",
					sport2_market: "soccer_market",
					strength: Math.random() * 2 - 1,
					latency: Math.floor(Math.random() * 1000),
					last_update: Date.now(),
				});
			}

			// Simulate anomaly detection (checking for high correlation strength)
			const anomalies = correlations.filter(
				(corr) => Math.abs(corr.strength) > 0.75,
			);
			const end = performance.now();
			times.push(end - start);
			expect(anomalies.length).toBeLessThanOrEqual(correlations.length);
		}

		const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
		const minTime = Math.min(...times);
		const maxTime = Math.max(...times);
		console.log(`  ⏱️  Avg: ${avgTime.toFixed(2)}ms, Min: ${minTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms`);
	});

	test("Time-series alignment performance", () => {
		const iterations = 5;
		const times: number[] = [];

		for (let i = 0; i < iterations; i++) {
			const start = performance.now();
			const seriesA: Array<{ timestamp: number; value: number }> = [];
			const seriesB: Array<{ timestamp: number; value: number }> = [];

			for (let j = 0; j < 10000; j++) {
				seriesA.push({
					timestamp: Date.now() - (10000 - j) * 1000,
					value: 1.5 + Math.random() * 0.5,
				});

				seriesB.push({
					timestamp: Date.now() - (10000 - j) * 1000 + Math.random() * 2000,
					value: 2.0 + Math.random() * 0.5,
				});
			}

			// Simple time-series alignment algorithm
			const tolerance = 2000; // 2 seconds
			const aligned: Array<{ a: number; b: number }> = [];

			for (const pointA of seriesA) {
				const matchingB = seriesB.find(
					(pointB) => Math.abs(pointA.timestamp - pointB.timestamp) < tolerance,
				);
				if (matchingB) {
					aligned.push({ a: pointA.value, b: matchingB.value });
				}
			}

			const end = performance.now();
			times.push(end - start);
			expect(aligned.length).toBeGreaterThan(0);
		}

		const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
		const minTime = Math.min(...times);
		const maxTime = Math.max(...times);
		console.log(`  ⏱️  Avg: ${avgTime.toFixed(2)}ms, Min: ${minTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms`);
	});

	test("Multi-layer graph construction", async () => {
		const iterations = 10;
		const times: number[] = [];

		for (let i = 0; i < iterations; i++) {
			const start = performance.now();
			const data = generateLargeDataset(500);
			const graph = createMockGraph(data);

			// Simulate multi-layer graph operations
			const layer1Count = graph.layer1.correlations.length;
			const layer2Count = graph.layer2.correlations.length;
			const layer3Count = graph.layer3.correlations.length;
			const layer4Count = graph.layer4.correlations.length;

			const end = performance.now();
			times.push(end - start);
			expect(layer4Count).toBeGreaterThan(0);
		}

		const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
		const minTime = Math.min(...times);
		const maxTime = Math.max(...times);
		console.log(`  ⏱️  Avg: ${avgTime.toFixed(2)}ms, Min: ${minTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms`);
	});

	test("Cross-sport correlation calculation", () => {
		const iterations = 15;
		const times: number[] = [];

		for (let i = 0; i < iterations; i++) {
			const start = performance.now();
			const sportPairs = [
				["basketball", "soccer"],
				["tennis", "american_football"],
				["baseball", "hockey"],
				["cricket", "rugby"],
				["golf", "boxing"],
			];

			const correlations: CrossSportCorrelation[] = [];
			for (const [sport1, sport2] of sportPairs) {
				for (let j = 0; j < 100; j++) {
					correlations.push({
						shared_entity: `shared_${sport1}_${sport2}_${j}`,
						sport1_market: `${sport1}_market`,
						sport2_market: `${sport2}_market`,
						strength: Math.random(),
						latency: Math.floor(Math.random() * 1000),
						last_update: Date.now(),
					});
				}
			}

			// Calculate average correlation strength
			const avgStrength =
				correlations.reduce((sum, corr) => sum + Math.abs(corr.strength), 0) /
				correlations.length;

			const end = performance.now();
			times.push(end - start);
			expect(avgStrength).toBeGreaterThanOrEqual(0);
			expect(avgStrength).toBeLessThanOrEqual(1);
		}

		const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
		const minTime = Math.min(...times);
		const maxTime = Math.max(...times);
		console.log(`  ⏱️  Avg: ${avgTime.toFixed(2)}ms, Min: ${minTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms`);
	});
});
