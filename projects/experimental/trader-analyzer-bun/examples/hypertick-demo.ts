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
  console.log('🚀 HyperTick Demo\n');

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
  console.log('📊 Architecture Metrics:');
  console.log(`   Version: ${metrics.version}`);
  console.log(`   Max Throughput: ${metrics.maxTicksPerSecond.toLocaleString()} ticks/sec`);
  console.log(`   Memory per Tick: ${metrics.estimatedMemoryPerTick} bytes\n`);

  // Initialize collector
  const collector = new HyperTickCollector(':memory:');
  console.log('✅ Collector initialized\n');

  // Initialize correlation engine
  const db = new Database(':memory:');
  const engine = new HyperTickCorrelationEngine(db);
  console.log('✅ Correlation engine initialized\n');

  // Example 1: Ingest ticks
  console.log('📝 Example 1: Ingesting Ticks');
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
  console.log('✅ Ingested 100 ticks\n');

  // Example 2: Get recent ticks
  console.log('📝 Example 2: Get Recent Ticks');
  const recentTicks = collector.getRecentTicks('NFL-2025-001-SPREAD', 10);
  console.log(`✅ Retrieved ${recentTicks.length} recent ticks\n`);

  // Example 3: Collector statistics
  console.log('📝 Example 3: Collector Statistics');
  const stats = collector.getStatistics();
  console.log(`   Ticks Received: ${stats.ticksReceived}`);
  console.log(`   Ticks Stored: ${stats.ticksStored}`);
  console.log(`   Buffer Utilization: ${(stats.bufferUtilization * 100).toFixed(1)}%\n`);

  // Cleanup
  collector.close();
  db.close();

  console.log('✅ Demo complete!');
  console.log('\n📚 See src/tick-analysis/ for full implementation');
}

main().catch(console.error);
