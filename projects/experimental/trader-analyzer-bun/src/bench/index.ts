/**
 * @fileoverview NEXUS Performance Benchmarking Suite
 * @description Industrial-grade performance testing and optimization tools
 * @module bench
 */

import { benchmark, createProfiler, type BenchmarkResult } from '../ticks';
import { ArbitrageScanner } from '../arbitrage/scanner';
import { createOrcaNormalizer } from '../orca/normalizer';
import { PolymarketProvider } from '../providers/polymarket';
import { KalshiProvider } from '../providers/kalshi';
import { CCXTProvider } from '../providers/ccxt';
import { getCache } from '../cache';
import { colors, formatBytes, formatDuration } from '../utils';

/**
 * Comprehensive benchmarking suite for NEXUS components
 */
export class NexusBenchmarkSuite {
  private results: Map<string, BenchmarkResult[]> = new Map();

  /**
   * Run full benchmark suite
   */
  async runFullSuite(): Promise<void> {
    console.log(colors.cyan('🚀 Starting NEXUS Performance Benchmark Suite\n'));

    // Core system benchmarks
    await this.benchmarkArbitrageScanner();
    await this.benchmarkOrcaNormalizer();
    await this.benchmarkCacheOperations();
    await this.benchmarkWebSocketPerformance();

    // Provider benchmarks
    await this.benchmarkProviders();

    // Memory and CPU benchmarks
    await this.benchmarkMemoryUsage();
    await this.benchmarkConcurrentOperations();

    this.printResults();
  }

  /**
   * Benchmark arbitrage scanner performance
   */
  private async benchmarkArbitrageScanner(): Promise<void> {
    console.log(colors.yellow('📊 Benchmarking Arbitrage Scanner...'));

    const scanner = new ArbitrageScanner({
      minSpread: 0.001,
      minLiquidity: 100,
      pollInterval: 1000,
    });

    // Benchmark single scan
    const singleScanResult = await benchmark(
      'arbitrage-single-scan',
      async () => {
        await scanner.forceScan();
      },
      5
    );

    // Benchmark concurrent scans
    const concurrentResult = await benchmark(
      'arbitrage-concurrent-scans',
      async () => {
        const promises = Array.from({ length: 10 }, () =>
          scanner.forceScan()
        );
        await Promise.all(promises);
      },
      3
    );

    this.results.set('arbitrage-scanner', [singleScanResult, concurrentResult]);
  }

  /**
   * Benchmark ORCA normalizer performance
   */
  private async benchmarkOrcaNormalizer(): Promise<void> {
    console.log(colors.yellow('🏈 Benchmarking ORCA Normalizer...'));

    const normalizer = createOrcaNormalizer();

    // Sample data for benchmarking
    const sampleInputs = Array.from({ length: 1000 }, (_, i) => ({
      bookmaker: 'draftkings',
      sport: 'basketball',
      league: 'NBA',
      homeTeam: `Los Angeles Lakers`,
      awayTeam: `Golden State Warriors`,
      startTime: new Date(Date.now() + i * 60000).toISOString(),
      marketType: 'moneyline',
      selection: i % 2 === 0 ? 'home' : 'away',
      odds: 1.5 + Math.random() * 2,
    }));

    // Benchmark single normalization
    const singleResult = await benchmark(
      'orca-single-normalize',
      () => {
        try {
          normalizer.normalize(sampleInputs[0]);
        } catch (error) {
          // Handle normalization errors gracefully
          console.warn('ORCA normalization error:', error.message);
        }
      },
      1000
    );

    // Benchmark batch normalization
    const batchResult = await benchmark(
      'orca-batch-normalize',
      () => {
        try {
          normalizer.normalizeBatch(sampleInputs.slice(0, 100));
        } catch (error) {
          // Handle normalization errors gracefully
          console.warn('ORCA batch normalization error:', error.message);
        }
      },
      10
    );

    this.results.set('orca-normalizer', [singleResult, batchResult]);
  }

  /**
   * Benchmark cache operations
   */
  private async benchmarkCacheOperations(): Promise<void> {
    console.log(colors.yellow('💾 Benchmarking Cache Operations...'));

    const cache = getCache();

    // Benchmark cache set/get operations
    const cacheOpsResult = await benchmark(
      'cache-set-get-operations',
      async () => {
        const key = `bench-${Math.random()}`;
        const value = { data: Math.random(), timestamp: Date.now() };

        await cache.set(key, value, 300);
        await cache.get(key);
        await cache.delete(key);
      },
      1000
    );

    // Benchmark cache bulk operations
    const bulkOpsResult = await benchmark(
      'cache-bulk-operations',
      async () => {
        const operations = Array.from({ length: 100 }, (_, i) => ({
          key: `bulk-${i}`,
          value: { data: Math.random() },
          ttl: 300,
        }));

        // Bulk set
        await Promise.all(
          operations.map(op => cache.set(op.key, op.value, op.ttl))
        );

        // Bulk get
        await Promise.all(
          operations.map(op => cache.get(op.key))
        );

        // Bulk delete
        await Promise.all(
          operations.map(op => cache.delete(op.key))
        );
      },
      10
    );

    this.results.set('cache-operations', [cacheOpsResult, bulkOpsResult]);
  }

  /**
   * Benchmark WebSocket performance
   */
  private async benchmarkWebSocketPerformance(): Promise<void> {
    console.log(colors.yellow('🔌 Benchmarking WebSocket Performance...'));

    // This would require setting up test WebSocket connections
    // For now, we'll benchmark message serialization/deserialization
    const sampleMessage = {
      type: 'arbitrage_opportunity',
      timestamp: Date.now(),
      opportunity: {
        id: 'test-opp-123',
        event: {
          category: 'crypto',
          description: 'BTC vs ETH price prediction',
          venue1: 'polymarket',
          venue2: 'kalshi',
        },
        spreadPercent: 2.5,
        isArbitrage: true,
        liquidity: 50000,
        expectedValue: 0.025,
      },
    };

    const serializeResult = await benchmark(
      'websocket-message-serialization',
      () => {
        JSON.stringify(sampleMessage);
      },
      10000
    );

    const deserializeResult = await benchmark(
      'websocket-message-deserialization',
      () => {
        JSON.parse(JSON.stringify(sampleMessage));
      },
      10000
    );

    this.results.set('websocket-performance', [serializeResult, deserializeResult]);
  }

  /**
   * Benchmark provider performance
   */
  private async benchmarkProviders(): Promise<void> {
    console.log(colors.yellow('🌐 Benchmarking Providers...'));

    const polymarket = new PolymarketProvider({});
    const kalshi = new KalshiProvider({});

    // Benchmark Polymarket markets fetch
    const polyResult = await benchmark(
      'polymarket-markets-fetch',
      async () => {
        await polymarket.fetchMarkets(50);
      },
      3
    );

    // Benchmark Kalshi markets fetch
    const kalshiResult = await benchmark(
      'kalshi-markets-fetch',
      async () => {
        await kalshi.fetchMarkets('open', 50);
      },
      3
    );

    this.results.set('providers', [polyResult, kalshiResult]);
  }

  /**
   * Benchmark memory usage patterns
   */
  private async benchmarkMemoryUsage(): Promise<void> {
    console.log(colors.yellow('🧠 Benchmarking Memory Usage...'));

    const profiler = createProfiler();
    profiler.start();

    // Simulate heavy operations
    const operations = Array.from({ length: 100 }, async (_, i) => {
      const scanner = new ArbitrageScanner({
        minSpread: 0.001,
        minLiquidity: 100,
      });

      await scanner.forceScan();

      // Force garbage collection hint
      if (global.gc) {
        global.gc();
      }
    });

    await Promise.all(operations);

    const report = profiler.stop();

    // Create synthetic benchmark result
    const memoryResult: BenchmarkResult = {
      name: 'memory-usage-heavy-operations',
      avgNs: report.avgTickProcessingNs || 0,
      minNs: 0,
      maxNs: 0,
      opsPerSec: 0,
      totalTimeNs: report.duration * 1_000_000,
      iterations: 100,
      memoryStats: {
        avgHeapUsed: report.avgHeapUsed,
        peakHeapUsed: report.peakHeapUsed,
        avgCpuUsage: report.avgCpuUsage,
        peakCpuUsage: report.peakCpuUsage,
      },
    };

    this.results.set('memory-usage', [memoryResult]);
  }

  /**
   * Benchmark concurrent operations
   */
  private async benchmarkConcurrentOperations(): Promise<void> {
    console.log(colors.yellow('⚡ Benchmarking Concurrent Operations...'));

    const concurrentResult = await benchmark(
      'concurrent-arbitrage-scans',
      async () => {
        const scanners = Array.from({ length: 20 }, () =>
          new ArbitrageScanner({
            minSpread: 0.001,
            minLiquidity: 100,
          })
        );

        await Promise.all(
          scanners.map(scanner => scanner.forceScan())
        );
      },
      5
    );

    this.results.set('concurrent-operations', [concurrentResult]);
  }

  /**
   * Print benchmark results in a formatted table
   */
  private printResults(): void {
    console.log(colors.cyan('\n📈 NEXUS Benchmark Results\n'));

    const allResults: Array<{
      component: string;
      benchmark: string;
      avgTime: string;
      opsPerSec: string;
      memory?: string;
    }> = [];

    for (const [component, results] of this.results) {
      for (const result of results) {
        allResults.push({
          component,
          benchmark: result.name,
          avgTime: formatDuration(result.avgNs / 1_000_000),
          opsPerSec: result.opsPerSec.toFixed(0) + ' ops/s',
          memory: result.memoryStats ?
            `${formatBytes(result.memoryStats.avgHeapUsed)} avg heap` : undefined,
        });
      }
    }

    console.log('Component'.padEnd(20), 'Benchmark'.padEnd(30), 'Avg Time'.padEnd(12), 'Ops/sec'.padEnd(12), 'Memory');
    console.log('─'.repeat(90));

    for (const result of allResults) {
      console.log(
        result.component.padEnd(20),
        result.benchmark.padEnd(30),
        result.avgTime.padEnd(12),
        result.opsPerSec.padEnd(12),
        result.memory || ''
      );
    }

    // Performance recommendations
    console.log(colors.yellow('\n💡 Performance Recommendations:'));

    const recommendations = this.generateRecommendations();
    recommendations.forEach(rec => console.log(`  • ${rec}`));

    console.log(colors.green('\n✅ Benchmark suite completed!'));
  }

  /**
   * Generate performance recommendations based on results
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    // Check arbitrage scanner performance
    const arbResults = this.results.get('arbitrage-scanner') || [];
    const avgScanTime = arbResults.find(r => r.name === 'arbitrage-single-scan')?.avgNs || 0;

    if (avgScanTime > 1_000_000_000) { // > 1 second
      recommendations.push('Consider implementing parallel market fetching for arbitrage scanner');
    }

    // Check memory usage
    const memResults = this.results.get('memory-usage') || [];
    const avgHeap = memResults[0]?.memoryStats?.avgHeapUsed || 0;

    if (avgHeap > 100 * 1024 * 1024) { // > 100MB
      recommendations.push('Implement object pooling for frequently created objects');
      recommendations.push('Consider streaming large datasets instead of loading in memory');
    }

    // Check WebSocket performance
    const wsResults = this.results.get('websocket-performance') || [];
    const serializeTime = wsResults.find(r => r.name === 'websocket-message-serialization')?.avgNs || 0;

    if (serializeTime > 10_000) { // > 10μs
      recommendations.push('Consider using MessagePack or similar for WebSocket message serialization');
    }

    // General recommendations
    recommendations.push('Enable Bun\'s --smol mode for production deployments');
    recommendations.push('Consider using Redis clustering for high-throughput scenarios');
    recommendations.push('Implement circuit breakers for external API calls');

    return recommendations;
  }
}

/**
 * Run benchmark suite from CLI
 */
export async function runBenchmarks(): Promise<void> {
  const suite = new NexusBenchmarkSuite();
  await suite.runFullSuite();
}

// CLI entry point
if (import.meta.main) {
  runBenchmarks().catch(console.error);
}