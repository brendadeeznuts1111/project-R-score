#!/usr/bin/env bun
/**
 * @fileoverview HyperTick Demo
 * @description Demonstrates high-frequency tick data analysis subsystem
 * @version 6.1.1.2.2.8.1.1.2.9
 * 
 * Run: bun run examples/hypertick-demo.ts
 */

import { Database } from 'bun:sqlite';
import { HyperTickCollector } from '../src/tick-analysis/collector/collector';
import { HyperTickArchitecture } from '../src/tick-analysis/core/arch';
import { HyperTickCorrelationEngine } from '../src/tick-analysis/correlation/engine';

async function main() {
  console.info('🚀 HyperTick Demo\n');

  // Initialize architecture
  const architecture = new HyperTickArchitecture({
    tickBufferSize: 1000,
    flushIntervalMs: 100,
    maxTickLatencyMs: 1000,
    correlationWindowMs: 30000,
    precision: 'micro',
    timestampResolution: 'ms',
    jitterThreshold: 0.1,
    staleThresholdMs: 5000,
    volumeThresholdUsd: 10000,
    walMode: true,
    synchronous: 1,
    cacheSizePages: 20000,
  });

  const metrics = architecture.getArchitectureMetrics();
  console.info('📊 Architecture Metrics:');
  console.info(`   Version: ${metrics.version}`);
  console.info(`   Max Throughput: ${metrics.maxTicksPerSecond.toLocaleString()} ticks/sec`);
  console.info(`   Memory per Tick: ${metrics.estimatedMemoryPerTick} bytes\n`);

  // Initialize collector
  const collector = new HyperTickCollector(':memory:');
  console.info('✅ Collector initialized\n');

  // Initialize correlation engine
  const db = new Database(':memory:');
  const engine = new HyperTickCorrelationEngine(db);
  console.info('✅ Correlation engine initialized\n');

  // Example 1: Ingest ticks
  console.info('📝 Example 1: Ingesting Ticks');
  for (let i = 0; i < 100; i++) {
    await collector.ingestTick({
      n: `NFL-2025-001-SPREAD`,
      b: 'DRAFTKINGS',
      m: 'NFL-2025-001-SPREAD',
      p: (-7.5 + (Math.random() - 0.5) * 0.5).toFixed(1),
      o: -110,
      t: Date.now() - 30000 + i * 10,
      v: Math.random() * 5000,
      c: 1,
    });
  }
  console.info('✅ Ingested 100 ticks\n');

  // Example 2: Get recent ticks
  console.info('📝 Example 2: Get Recent Ticks');
  const recentTicks = collector.getRecentTicks('NFL-2025-001-SPREAD', 10);
  console.info(`✅ Retrieved ${recentTicks.length} recent ticks\n`);

  // Example 3: Collector statistics
  console.info('📝 Example 3: Collector Statistics');
  const stats = collector.getStatistics();
  console.info(`   Ticks Received: ${stats.ticksReceived}`);
  console.info(`   Ticks Stored: ${stats.ticksStored}`);
  console.info(`   Buffer Utilization: ${(stats.bufferUtilization * 100).toFixed(1)}%\n`);

  // Cleanup
  collector.close();
  db.close();

  console.info('✅ Demo complete!');
  console.info('\n📚 See src/tick-analysis/ for full implementation');
}

main().catch(console.error);
