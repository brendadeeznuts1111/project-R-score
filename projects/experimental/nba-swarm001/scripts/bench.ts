/**
 * Performance benchmarks
 */

import { buildGraph } from "../src/core/edge-builder.js";
import { cosineSimilarity } from "../src/core/similarity.js";
import { loadConfig } from "../src/types/config.js";
import { generateMockGames } from "../packages/data/mock-generator.js";
import { TARGET_PAIR_PROCESSING_NS, TARGET_LATENCY_MS } from "../src/constants.js";

/**
 * Benchmark cosine similarity calculation
 */
function benchmarkCosineSimilarity() {
  const vec1 = Array.from({ length: 14 }, () => Math.random()) as any;
  const vec2 = Array.from({ length: 14 }, () => Math.random()) as any;

  const iterations = 10000;
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    cosineSimilarity(vec1, vec2);
  }

  const end = performance.now();
  const durationMs = end - start;
  const avgNs = (durationMs * 1_000_000) / iterations;

  console.info(`Cosine Similarity Benchmark:`);
  console.info(`  Iterations: ${iterations}`);
  console.info(`  Total time: ${durationMs.toFixed(3)}ms`);
  console.info(`  Average per pair: ${avgNs.toFixed(1)}ns`);
  console.info(`  Target: ${TARGET_PAIR_PROCESSING_NS}ns`);
  console.info(`  Status: ${avgNs <= TARGET_PAIR_PROCESSING_NS ? "✅ PASS" : "❌ FAIL"}`);
  console.info();
}

/**
 * Benchmark graph building at different scales
 */
function benchmarkGraphBuilding() {
  const config = loadConfig().edge;
  const scales = [10, 50, 100, 500];

  console.info(`Graph Building Benchmarks:`);
  console.info();

  for (const scale of scales) {
    const games = generateMockGames(scale);
    
    const start = performance.now();
    const graph = buildGraph(games, config);
    const end = performance.now();
    
    const durationMs = end - start;
    const pairCount = (scale * (scale - 1)) / 2;
    const avgPerPairNs = (durationMs * 1_000_000) / pairCount;

    console.info(`  Scale: ${scale} games`);
    console.info(`    Nodes: ${graph.nodes.size}`);
    console.info(`    Edges: ${graph.edges.length}`);
    console.info(`    Duration: ${durationMs.toFixed(3)}ms`);
    console.info(`    Per pair: ${avgPerPairNs.toFixed(1)}ns`);
    console.info(`    Target: <${TARGET_LATENCY_MS * 1000}ms total`);
    console.info(`    Status: ${durationMs < TARGET_LATENCY_MS * 1000 ? "✅ PASS" : "⚠️  OVER"}`);
    console.info();
  }
}

/**
 * Run all benchmarks
 */
function runBenchmarks() {
  console.info("=".repeat(50));
  console.info("NBA Swarm Performance Benchmarks");
  console.info("=".repeat(50));
  console.info();

  benchmarkCosineSimilarity();
  benchmarkGraphBuilding();

  console.info("=".repeat(50));
}

// Run benchmarks if executed directly
if (import.meta.main) {
  runBenchmarks();
}

export { benchmarkCosineSimilarity, benchmarkGraphBuilding, runBenchmarks };

