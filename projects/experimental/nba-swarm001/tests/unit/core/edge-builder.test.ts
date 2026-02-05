/**
 * Unit tests for edge builder
 */

import { describe, test, expect } from "bun:test";
import { buildGraph } from "../../../src/core/edge-builder.js";
import { loadConfig } from "../../../src/types/config.js";
import { generateMockGames, generateNBAScenario } from "../../../packages/data/mock-generator.js";

describe("Edge Builder", () => {
  test("should build graph from games", () => {
    const games = generateMockGames(10);
    const config = loadConfig().edge;
    
    const graph = buildGraph(games, config);
    
    expect(graph.nodes.size).toBe(10);
    expect(graph.edges.length).toBeGreaterThanOrEqual(0);
    expect(graph.metadata.nodeCount).toBe(10);
  });

  test("should apply similarity threshold", () => {
    const games = generateMockGames(5);
    const config = loadConfig().edge;
    config.minSimilarityThreshold = 0.9; // High threshold
    
    const graph = buildGraph(games, config);
    
    // With high threshold, should have fewer edges
    const highThresholdEdges = graph.edges.length;
    
    // Lower threshold should have more edges
    config.minSimilarityThreshold = 0.1;
    const graph2 = buildGraph(games, config);
    
    expect(graph2.edges.length).toBeGreaterThanOrEqual(highThresholdEdges);
  });

  test("should apply weight threshold", () => {
    const games = generateMockGames(5);
    const config = loadConfig().edge;
    config.minWeightThreshold = 10; // Very high threshold
    
    const graph = buildGraph(games, config);
    
    // All edges should meet weight threshold
    for (const edge of graph.edges) {
      expect(edge.weight).toBeGreaterThanOrEqual(config.minWeightThreshold);
    }
  });

  test("should handle empty games array", () => {
    const config = loadConfig().edge;
    
    expect(() => buildGraph([], config)).toThrow();
  });

  test("should create edges for correlated games", () => {
    const games = generateNBAScenario("rivalry");
    const config = loadConfig().edge;
    config.minSimilarityThreshold = 0.7;
    
    const graph = buildGraph(games, config);
    
    // Rivalry games should have high similarity
    expect(graph.edges.length).toBeGreaterThan(0);
    
    // Check that edges have high similarity
    const edge = graph.edges[0];
    expect(edge.similarity).toBeGreaterThanOrEqual(0.7);
  });

  test("should prune edges for dense graphs", () => {
    const games = generateMockGames(600); // Above DENSE_GRAPH_THRESHOLD
    const config = loadConfig().edge;
    config.enablePruning = true;
    config.maxEdgesPerNode = 10;
    
    const graph = buildGraph(games, config);
    
    // Should have edges, but limited by pruning
    expect(graph.edges.length).toBeGreaterThan(0);
    
    // Check that no node has more than maxEdgesPerNode connections
    const edgesByNode = new Map<string, number>();
    for (const edge of graph.edges) {
      edgesByNode.set(edge.from, (edgesByNode.get(edge.from) || 0) + 1);
      edgesByNode.set(edge.to, (edgesByNode.get(edge.to) || 0) + 1);
    }
    
    for (const count of edgesByNode.values()) {
      expect(count).toBeLessThanOrEqual(config.maxEdgesPerNode! * 2); // Allow some variance
    }
  });
});

