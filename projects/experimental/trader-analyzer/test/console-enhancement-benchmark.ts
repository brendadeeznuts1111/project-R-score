/**
 * Console Enhancement Performance Benchmark
 *
 * Measures the performance impact of enhanced logging on Hyper-Bun operations.
 */

import { HyperBunMarketIntelligence } from '../src/hyper-bun/market-intelligence-engine';
import { PerformanceMonitor } from '../src/hyper-bun/performance-monitor';
import { MarketDataInspectors, HyperBunLogger, configureGlobalConsole } from '../src/hyper-bun/console-enhancement';

async function benchmarkConsoleEnhancements() {
  console.info('🚀 Starting Console Enhancement Performance Benchmark\n');

  // Configure enhanced console
  configureGlobalConsole();

  const performanceMonitor = new PerformanceMonitor();
  const logger = new HyperBunLogger('Benchmark');

  // Test data for inspectors
  const testAnalysisResult = {
    nodeId: 'benchmark-node',
    accessible: true,
    analysis: {
      marketHealth: { riskLevel: 'low' },
      recommendations: [{ type: 'trend_following', confidence: 0.8 }]
    }
  };

  const testPerformanceStats = {
    totalOperations: 1000,
    healthScore: 95,
    statistics: { mean: 50, p95: 75 },
    anomalyCount: 5
  };

  const testHealthReport = {
    overallStatus: 'healthy',
    timestamp: Date.now(),
    performance: { averageHealthScore: 92, totalOperations: 1500, totalAnomalies: 3 },
    connectivity: [
      { bookmaker: 'betfair', connected: true },
      { bookmaker: 'pinnacle', connected: false, error: 'timeout' }
    ]
  };

  console.info('📊 Benchmarking console enhancement performance...\n');

  // Benchmark 1: MarketDataInspectors performance
  console.info('1️⃣ Testing MarketDataInspectors performance:');

  const inspectorResults = await performanceMonitor.trackOperation(
    'inspector-benchmark',
    async () => {
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        MarketDataInspectors.analysisResult(testAnalysisResult);
        MarketDataInspectors.performanceStats(testPerformanceStats);
        MarketDataInspectors.healthReport(testHealthReport);
      }

      return iterations;
    }
  );

  console.info(`   ✅ Processed ${inspectorResults} inspector calls`);
  const inspectorStats = performanceMonitor.getOperationStats('inspector-benchmark');
  if (inspectorStats) {
    console.info(`   📈 Average time per inspector call: ${(inspectorStats.statistics.mean / 3).toFixed(3)}ms`);
    console.info(`   📈 Total time for 3000 calls: ${inspectorStats.statistics.mean.toFixed(2)}ms\n`);
  }

  // Benchmark 2: Logger performance
  console.info('2️⃣ Testing HyperBunLogger performance:');

  const loggerResults = await performanceMonitor.trackOperation(
    'logger-benchmark',
    async () => {
      const iterations = 1000;

      // Disable actual console output for performance testing
      const originalConsole = { ...console };
      console.log = () => {};
      console.warn = () => {};
      console.error = () => {};

      try {
        for (let i = 0; i < iterations; i++) {
          logger.info(`Test message ${i}`);
          logger.success(`Success message ${i}`);
          logger.warn(`Warning message ${i}`);
          logger.error(`Error message ${i}`);
        }
      } finally {
        // Restore console
        Object.assign(console, originalConsole);
      }

      return iterations;
    }
  );

  console.info(`   ✅ Processed ${loggerResults} logger calls`);
  const loggerStats = performanceMonitor.getOperationStats('logger-benchmark');
  if (loggerStats) {
    console.info(`   📈 Average time per logger call: ${(loggerStats.statistics.mean / 4).toFixed(3)}ms`);
    console.info(`   📈 Total time for 4000 calls: ${loggerStats.statistics.mean.toFixed(2)}ms\n`);
  }

  // Benchmark 3: Full Hyper-Bun operation with enhanced logging
  console.info('3️⃣ Testing full Hyper-Bun operation with enhanced logging:');

  const fullOperationResults = await performanceMonitor.trackOperation(
    'full-operation-benchmark',
    async () => {
      // Create a temporary in-memory engine for testing
      const engine = new HyperBunMarketIntelligence(':memory:');

      // Run multiple analysis operations
      const operations: Promise<any>[] = [];
      for (let i = 0; i < 10; i++) {
        operations.push(engine.analyzeMarketNode(`benchmark-node-${i}`, 'betfair'));
      }

      const results = await Promise.all(operations);
      await engine.shutdown();

      return results.length;
    }
  );

  console.info(`   ✅ Completed ${fullOperationResults} full market analyses`);
  const fullStats = performanceMonitor.getOperationStats('full-operation-benchmark');
  if (fullStats) {
    console.info(`   📈 Average time per full operation: ${fullStats.statistics.mean.toFixed(2)}ms`);
    console.info(`   📈 Total time for 10 operations: ${fullStats.statistics.mean.toFixed(2)}ms\n`);
  }

  // Summary
  console.info('📋 Performance Benchmark Summary:');
  console.info('=====================================');

  const allStats = performanceMonitor.getSystemSummary();
  console.info(`Total Operations: ${allStats.totalOperations}`);
  console.info(`Average Health Score: ${allStats.averageHealthScore.toFixed(1)}/100`);
  console.info(`Total Anomalies: ${allStats.totalAnomalies}`);

  console.info('\n🎯 Performance Impact Assessment:');
  if (allStats.averageHealthScore >= 95) {
    console.info('   ✅ Excellent: Console enhancements have minimal performance impact');
  } else if (allStats.averageHealthScore >= 85) {
    console.info('   ⚠️ Good: Console enhancements have acceptable performance impact');
  } else {
    console.info('   ❌ Needs optimization: Console enhancements significantly impact performance');
  }

  console.info('\n🏁 Console Enhancement Performance Benchmark Complete');
}

// CLI runner
if (import.meta.main) {
  benchmarkConsoleEnhancements().catch(console.error);
}