#!/usr/bin/env bun
/**
 * @fileoverview Profiled Market Analysis Runner
 * @description Run market analysis with CPU profiling enabled
 * @version 1.1.1.1.5.0.0
 * 
 * Run with: bun --cpu-prof --cpu-prof-name=market-analysis.cpuprofile scripts/profiling/run-profiled-analysis.ts
 */

import { ProfilingMultiLayerGraphSystem } from '../../src/graphs/multilayer/profiling/instrumented-system';

// Configuration for profiling runs
const PROFILING_CONFIG = {
  enableProfiling: true,
  profileDir: './profiles',
  profileName: `market_analysis_${Date.now()}.cpuprofile`,
  maxRecursionDepth: 35, // Like Fibonacci(35) for CPU testing
  dataSamples: 10000,
};

// Mock data loader
class MarketDataLoader {
  async loadRecentData(samples: number): Promise<Array<{
    id: string;
    layer: number;
    timestamp: number;
  }>> {
    const data = [];
    for (let i = 0; i < samples; i++) {
      data.push({
        id: `market_${i}`,
        layer: (i % 4) + 1,
        timestamp: Date.now() - i * 1000,
      });
    }
    return data;
  }
}

async function runProfiledAnalysis() {
  console.log('🚀 Starting profiled market analysis...');

  // Load market data
  const loader = new MarketDataLoader();
  const marketData = await loader.loadRecentData(PROFILING_CONFIG.dataSamples);

  // Create profiled system
  const system = new ProfilingMultiLayerGraphSystem({
    data: marketData,
    enableProfiling: PROFILING_CONFIG.enableProfiling,
    profilingConfig: {
      name: PROFILING_CONFIG.profileName,
      dir: PROFILING_CONFIG.profileDir,
    },
  });

  // Run CPU-intensive operations
  console.log('🔍 Analyzing market correlations...');

  // This simulates the Fibonacci pattern from Bun's example
  function analyzeWithRecursion(n: number): number {
    return n < 2 ? n : analyzeWithRecursion(n - 1) + analyzeWithRecursion(n - 2);
  }

  // Use recursive analysis for profiling demonstration
  const complexityScore = analyzeWithRecursion(PROFILING_CONFIG.maxRecursionDepth);
  console.log(`📈 Analysis complexity score: ${complexityScore}`);

  // Build multi-layer graph
  await system.buildGraph();

  console.log('✅ Profiling complete. Open .cpuprofile in Chrome DevTools');
}

// Run if called directly
if (import.meta.main) {
  runProfiledAnalysis().catch(console.error);
}

export { runProfiledAnalysis };
