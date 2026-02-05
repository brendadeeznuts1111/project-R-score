#!/usr/bin/env bun
/**
 * @fileoverview MLGS MultiLayerGraph Tests
 * @description Tests for production-ready sportsbook arbitrage detection
 * @module graphs/MLGSGraph.test
 */

import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { MLGSGraph, type GraphNode, type GraphEdge } from "./MLGSGraph";
import { unlinkSync } from "fs";

describe("MLGSGraph", () => {
	const testDbPath = "./test-mlgs.db";
	let mlgs: MLGSGraph<GraphNode, GraphEdge>;

	beforeEach(() => {
		mlgs = new MLGSGraph(testDbPath);
	});

	afterEach(() => {
		try {
			unlinkSync(testDbPath);
		} catch {
			// Ignore if file doesn't exist
		}
	});

	describe("Layer Definitions", () => {
		test("should define 4 sportsbook layers", () => {
			expect(mlgs.layers).toHaveLength(4);
			expect(mlgs.layers[0].id).toBe("L1_DIRECT");
			expect(mlgs.layers[1].id).toBe("L2_MARKET");
			expect(mlgs.layers[2].id).toBe("L3_EVENT");
			expect(mlgs.layers[3].id).toBe("L4_SPORT");
		});

		test("should have correct L1 arbitrage threshold", () => {
			const l1 = mlgs.layers.find((l) => l.id === "L1_DIRECT");
			expect(l1?.correlationRules[0].value).toBe(2.5);
			expect(l1?.edgeConstraints?.[0].minWeight).toBe(0.025);
		});
	});

	describe("Node Operations", () => {
		test("should add node to graph", async () => {
			const node: GraphNode = {
				id: "test-node-1",
				type: "market",
				data: { bookmaker: "draftkings", line: -110 },
				metadata: { league: "nfl" },
				lastUpdated: Date.now(),
			};

			await mlgs.addNode("L1_DIRECT", node);

			const metrics = mlgs.getGraphMetrics();
			expect(metrics.nodeCount).toBe(1);
		});

		test("should update existing node", async () => {
			const node: GraphNode = {
				id: "test-node-1",
				type: "market",
				data: { bookmaker: "draftkings", line: -110 },
				metadata: { league: "nfl" },
				lastUpdated: Date.now(),
			};

			await mlgs.addNode("L1_DIRECT", node);

			const updatedNode: GraphNode = {
				...node,
				data: { bookmaker: "draftkings", line: -105 },
				lastUpdated: Date.now(),
			};

			await mlgs.addNode("L1_DIRECT", updatedNode);

			const metrics = mlgs.getGraphMetrics();
			expect(metrics.nodeCount).toBe(1); // Still 1, updated
		});
	});

	describe("Edge Operations", () => {
		test("should add edge to graph", async () => {
			const sourceNode: GraphNode = {
				id: "source-node",
				type: "market",
				data: { bookmaker: "draftkings", line: -110 },
				metadata: {},
				lastUpdated: Date.now(),
			};

			const targetNode: GraphNode = {
				id: "target-node",
				type: "market",
				data: { bookmaker: "betfair", line: -105 },
				metadata: {},
				lastUpdated: Date.now(),
			};

			await mlgs.addNode("L1_DIRECT", sourceNode);
			await mlgs.addNode("L1_DIRECT", targetNode);

			const edge: GraphEdge = {
				id: "edge-1",
				source: "source-node",
				target: "target-node",
				type: "arbitrage",
				weight: 0.03, // 3% arb
				confidence: 0.95,
				latency: 100,
				metadata: {},
				detectedAt: Date.now(),
				lastVerified: Date.now(),
			};

			await mlgs.addEdge("L1_DIRECT", edge);

			const metrics = mlgs.getGraphMetrics();
			expect(metrics.edgeCount).toBe(1);
			expect(metrics.liveArbs).toBe(1);
		});
	});

	describe("Hidden Edge Detection", () => {
		test("should find hidden edges above threshold", async () => {
			// Add nodes
			const node1: GraphNode = {
				id: "nba-lakers-injury",
				type: "event",
				data: { sport: "nba", team: "lakers", type: "injury" },
				metadata: {},
				lastUpdated: Date.now(),
			};

			const node2: GraphNode = {
				id: "nfl-chiefs-ou-q4",
				type: "market",
				data: { sport: "nfl", team: "chiefs", market: "over_under" },
				metadata: {},
				lastUpdated: Date.now(),
			};

			await mlgs.addNode("L4_SPORT", node1);
			await mlgs.addNode("L4_SPORT", node2);

			// Add hidden edge
			const edge: GraphEdge = {
				id: "hidden-edge-1",
				source: "nba-lakers-injury",
				target: "nfl-chiefs-ou-q4",
				type: "cross_sport",
				weight: 0.038, // 3.8% arb
				confidence: 0.92,
				latency: 200,
				metadata: {},
				detectedAt: Date.now(),
				lastVerified: Date.now(),
			};

			await mlgs.addEdge("L4_SPORT", edge);

			const hiddenEdges = await mlgs.findHiddenEdges(
				{ minWeight: 0.03, layer: "L4_SPORT" },
				0.9,
			);

			expect(hiddenEdges.length).toBeGreaterThan(0);
			expect(hiddenEdges[0].arbitragePercent).toBeGreaterThan(3);
		});
	});

	describe("Signal Propagation", () => {
		test("should propagate signal across layers", async () => {
			const sourceNode: GraphNode = {
				id: "source-signal",
				type: "signal",
				data: { type: "steam_move" },
				metadata: {},
				lastUpdated: Date.now(),
			};

			await mlgs.addNode("L1_DIRECT", sourceNode);

			const targetNode: GraphNode = {
				id: "target-signal",
				type: "signal",
				data: { type: "propagated" },
				metadata: {},
				lastUpdated: Date.now(),
			};

			await mlgs.addNode("L2_MARKET", targetNode);

			const edge: GraphEdge = {
				id: "prop-edge",
				source: "source-signal",
				target: "target-signal",
				type: "propagation",
				weight: 0.8,
				confidence: 0.9,
				latency: 50,
				metadata: {},
				detectedAt: Date.now(),
				lastVerified: Date.now(),
			};

			await mlgs.addEdge("L2_MARKET", edge);

			const result = await mlgs.propagateSignal(
				sourceNode,
				["L2_MARKET"],
				{ decayRate: 0.95 },
			);

			expect(result.propagatedNodes.length).toBeGreaterThan(0);
			expect(result.confidenceDecay).toBeLessThan(1.0);
		});
	});

	describe("Anomaly Detection", () => {
		test("should detect anomaly patterns", async () => {
			// Add multiple edges with high weights
			for (let i = 0; i < 5; i++) {
				const node1: GraphNode = {
					id: `node-${i}-1`,
					type: "market",
					data: {},
					metadata: {},
					anomalyScore: 0.3,
					lastUpdated: Date.now(),
				};

				const node2: GraphNode = {
					id: `node-${i}-2`,
					type: "market",
					data: {},
					metadata: {},
					anomalyScore: 0.3,
					lastUpdated: Date.now(),
				};

				await mlgs.addNode("L1_DIRECT", node1);
				await mlgs.addNode("L1_DIRECT", node2);

				const edge: GraphEdge = {
					id: `edge-${i}`,
					source: `node-${i}-1`,
					target: `node-${i}-2`,
					type: "arbitrage",
					weight: 0.04,
					confidence: 0.95,
					latency: 100,
					metadata: {},
					detectedAt: Date.now(),
					lastVerified: Date.now(),
				};

				await mlgs.addEdge("L1_DIRECT", edge);
			}

			const patterns = await mlgs.detectAnomalyPatterns();
			expect(patterns.length).toBeGreaterThan(0);
		});
	});

	describe("Graph Metrics", () => {
		test("should return accurate metrics", async () => {
			const node: GraphNode = {
				id: "metric-node",
				type: "market",
				data: {},
				metadata: {},
				lastUpdated: Date.now(),
			};

			await mlgs.addNode("L1_DIRECT", node);

			const metrics = mlgs.getGraphMetrics();
			expect(metrics.nodeCount).toBe(1);
			expect(metrics.edgeCount).toBe(0);
			expect(metrics.scanTimestamp).toBeGreaterThan(0);
		});
	});
});
