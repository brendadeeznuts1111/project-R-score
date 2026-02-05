#!/usr/bin/env bun
/**
 * @fileoverview HyperTick Main Entry Point
 * @description High-frequency tick data analysis subsystem main server
 * @module tick-analysis/main
 * @version 6.1.1.2.2.8.1.1.2.9.7
 */

import { Database } from 'bun:sqlite';
import { HyperTickRouter } from './api/router';
import { HyperTickCollector } from './collector/collector';
import { HyperTickArchitecture } from './core/arch';
import { HyperTickCorrelationEngine } from './correlation/engine';

const PORT = parseInt(process.env.PORT || '3000');
const DATA_DIR = process.env.BUN_HYPERTICK_DATA_DIR || './data/tickdb';
const DB_PATH = `${DATA_DIR}/tick.db`;

async function main() {
  console.log('🚀 HyperTick v1.3.3 - High-Frequency Analysis Subsystem');
  console.log('========================================================\n');

  // Initialize architecture
  const architecture = new HyperTickArchitecture({
    tickBufferSize: 10000,
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

  // Display architecture metrics
  const metrics = architecture.getArchitectureMetrics();
  console.log('📊 Architecture Metrics:');
  console.log(`   Version: ${metrics.version}`);
  console.log(`   Max Throughput: ${metrics.maxTicksPerSecond.toLocaleString()} ticks/sec`);
  console.log(`   Memory per Tick: ${metrics.estimatedMemoryPerTick} bytes`);
  console.log(`   Bun Runtime: ${metrics.bunRuntime.version}\n`);

  // Initialize database
  const db = new Database(DB_PATH);
  console.log(`💾 Database: ${DB_PATH}\n`);

  // Initialize collector
  const collector = new HyperTickCollector(DB_PATH);
  console.log('✅ Collector initialized\n');

  // Initialize correlation engine
  const engine = new HyperTickCorrelationEngine(db);
  console.log('✅ Correlation engine initialized\n');

  // Initialize API router
  const router = new HyperTickRouter(collector, engine);
  console.log('✅ API router initialized\n');

  // Start server
  const server = Bun.serve({
    port: PORT,
    async fetch(request) {
      return router.handleRequest(request);
    },
  });

  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log('\n📝 API Endpoints:');
  console.log(`   POST   http://localhost:${PORT}/api/v1.3.3/ticks/ingest`);
  console.log(`   GET    http://localhost:${PORT}/api/v1.3.3/ticks/:nodeId/recent`);
  console.log(`   GET    http://localhost:${PORT}/api/v1.3.3/ticks/correlation/:sourceId/:targetId`);
  console.log(`   GET    http://localhost:${PORT}/api/v1.3.3/arbitrage/micro/:marketId`);
  console.log(`   GET    http://localhost:${PORT}/api/v1.3.3/detection/spoofing/:nodeId`);
  console.log(`   GET    http://localhost:${PORT}/api/v1.3.3/system/stats`);
  console.log(`   GET    http://localhost:${PORT}/api/v1.3.3/health?detail=full`);
  console.log('\n💡 Press Ctrl+C to stop\n');

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    collector.close();
    db.close();
    server.stop();
    process.exit(0);
  });

  // Health check endpoint for monitoring
  setInterval(() => {
    const stats = collector.getStatistics();
    if (stats.ticksDropped > stats.ticksReceived * 0.1) {
      console.warn(`⚠️ High drop rate: ${((stats.ticksDropped / stats.ticksReceived) * 100).toFixed(1)}%`);
    }
  }, 60000); // Check every minute
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
