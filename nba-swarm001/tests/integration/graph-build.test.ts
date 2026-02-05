/**
 * Integration tests for graph building
 */

import { describe, test, expect } from "bun:test";
import { buildGraph } from "../../../src/core/edge-builder.js";
import { loadConfig } from "../../../src/types/config.js";
import { generateMockGames, generateNBAScenario } from "../../../packages/data/mock-generator.js";

describe("Graph Build Integration", () => {
  test("should build graph with 100 games", () => {
    const games = generateMockGames(100);
    const config = loadConfig().edge;
    
    const start = performance.now();
    const graph = buildGraph(games, config);
    const duration = performance.now() - start;
    
    expect(graph.nodes.size).toBe(100);
    expect(graph.edges.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(1000); // Should complete in <1s
  });

  test("should build graph with 500 games", () => {
    const games = generateMockGames(500);
    const config = loadConfig().edge;
    
    const start = performance.now();
    const graph = buildGraph(games, config);
    const duration = performance.now() - start;
    
    expect(graph.nodes.size).toBe(500);
    expect(duration).toBeLessThan(5000); // Should complete in <5s
  });

  test("should detect swarm pattern", () => {
    const games = generateNBAScenario("swarm");
    const config = loadConfig().edge;
    config.minSimilarityThreshold = 0.7;
    
    const graph = buildGraph(games, config);
    
    // Swarm games should be highly connected
    expect(graph.edges.length).toBeGreaterThan(0);
    
    // Check average degree
    expect(graph.metadata.averageDegree).toBeGreaterThan(0);
  });

  test("should handle isolated game", () => {
    const games = generateNBAScenario("isolated");
    const config = loadConfig().edge;
    config.minSimilarityThreshold = 0.7;
    
    const graph = buildGraph(games, config);
    
    // Isolated game should have no edges with high threshold
    expect(graph.nodes.size).toBe(1);
    expect(graph.edges.length).toBe(0);
  });

  test("graph metadata should be accurate", () => {
    const games = generateMockGames(50);
    const config = loadConfig().edge;
    
    const graph = buildGraph(games, config);
    
    expect(graph.metadata.nodeCount).toBe(50);
    expect(graph.metadata.edgeCount).toBe(graph.edges.length);
    expect(graph.metadata.generatedAt).toBeGreaterThan(0);
    expect(graph.metadata.config).toBeDefined();
    
    // Average degree should be calculated correctly
    const expectedDegree = graph.edges.length > 0 
      ? (2 * graph.edges.length) / graph.nodes.size 
      : 0;
    expect(graph.metadata.averageDegree).toBeCloseTo(expectedDegree, 5);
  });
});

