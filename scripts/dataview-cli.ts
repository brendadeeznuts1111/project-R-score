#!/usr/bin/env bun

// @see https://bun.com/docs/runtime/file-io — Bun.write
/**
 * DataView-Enhanced CLI for Connection Pooling v3.20
 *
 * Command-line interface for DataView operations
 * Binary data management, metrics, and stream processing
 */

import { DataViewTelemetryPool } from '../lib/pooling/dataview-telemetry-pool';
import { DataViewStreamProcessor } from '../lib/pooling/dataview-stream-processor';
import { LeadSpecProfile } from './pool-telemetry';

// Define ProfileMetadata interface to match serializer
interface ProfileMetadata {
  sessionId: string;
  member?: string;
  timestamp?: number;
  document?: string;
}

// CLI arguments
const command = process.argv[2];
const subCommand = process.argv[3];
const args = process.argv.slice(2);

// Generate test profiles for batch operations
function generateTestProfiles(
  count: number
): Array<{ profile: LeadSpecProfile; metadata: ProfileMetadata }> {
  const profiles = [];
  for (let i = 0; i < count; i++) {
    profiles.push({
      profile: {
        documentSize: 1024 + Math.floor(Math.random() * 2048),
        parseTime: 10 + Math.random() * 20,
        throughput: 80 + Math.random() * 40,
        complexity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        tableCols: 5 + Math.floor(Math.random() * 20),
        memory: 256 + Math.floor(Math.random() * 1024),
        cryptoSeal: '0x' + Math.random().toString(16).substr(2, 8),
        gfmScore: 80 + Math.random() * 20,
        features: {
          parsing: 80 + Math.random() * 20,
          validation: 75 + Math.random() * 25,
          optimization: 85 + Math.random() * 15,
        },
      },
      metadata: {
        sessionId: crypto.randomUUID(),
        member: `batch-user-${Math.floor(i / 10)}`,
        timestamp: Date.now() + i,
        document: `batch-doc-${i}`,
      },
    });
  }
  return profiles;
}

// Memory-optimized batch handler
async function handleMemoryOptimizedBatch(
  pool: DataViewTelemetryPool,
  count: number
): Promise<void> {
  const profiles = generateTestProfiles(count);
  const startTime = performance.now();

  // Proactive GC control for memory optimization
  if (typeof Bun !== 'undefined' && (Bun as any).gc) {
    (Bun as any).gc(false); // Suggest aggressive collection NOT to run now
  }

  try {
    const results = await pool.batchInsertDataViewProfiles(profiles);
    const endTime = performance.now();
    const duration = endTime - startTime;

    console.info(`✅ Memory-optimized batch insert complete:`);
    console.info(`   📊 Profiles inserted: ${results.length}`);
    console.info(`   ⏱️  Duration: ${duration.toFixed(2)}ms`);
    console.info(
      `   🚀 Throughput: ${((results.length / duration) * 1000).toFixed(0)} profiles/sec`
    );
    console.info(`   💾 Memory efficiency: Zero-copy chunking enabled`);
  } finally {
    // Explicitly suggest cleanup after batch
    if (typeof Bun !== 'undefined' && (Bun as any).gc) {
      (Bun as any).gc(true); // Suggest a more aggressive collection
    }
  }
}

async function main() {
  console.info(`🎯 DataView CLI v3.20 - Binary Data Operations`);
  console.info(`=====================================`);

  const pool = new DataViewTelemetryPool();
  const streamProcessor = new DataViewStreamProcessor();

  try {
    switch (command) {
      case 'dv-insert':
        await handleDataViewInsert(pool, subCommand);
        break;

      case 'dv-query':
        await handleDataViewQuery(pool, subCommand);
        break;

      case 'dv-batch-memory':
        const batchSize = parseInt(subCommand) || 100;
        console.info(`🚀 Running memory-optimized batch insert with ${batchSize} profiles...`);
        await handleMemoryOptimizedBatch(pool, batchSize);
        break;

      case 'dv-batch':
        await handleDataViewBatch(pool, parseInt(subCommand) || 100);
        break;

      case 'dv-metrics':
        await handleDataViewMetrics(pool);
        break;

      case 'dv-export':
        await handleDataViewExport(pool);
        break;

      case 'dv-stream':
        await handleDataViewStream(pool, streamProcessor, subCommand);
        break;

      case 'dv-stats':
        await handleDataViewStats(pool);
        break;

      case 'dv-sync':
        await handleDataViewSync(pool);
        break;

      case 'dv-clean':
        await handleDataViewClean(pool);
        break;

      default:
        showHelp();
    }
  } catch (error) {
    console.error(`❌ Error:`, error);
    process.exit(1);
  } finally {
    await pool.close();
  }
}

async function handleDataViewInsert(pool: DataViewTelemetryPool, profileJson?: string) {
  console.info(`📝 Inserting DataView profile...`);

  const profile: LeadSpecProfile = profileJson
    ? JSON.parse(profileJson)
    : {
        documentSize: 1024,
        parseTime: 15.5,
        throughput: 85.2,
        complexity: 'medium',
        tableCols: 12,
        memory: 512,
        cryptoSeal: '0x' + Math.random().toString(16).substr(2, 8),
        gfmScore: 92.5,
        features: {
          parsing: 95,
          validation: 88,
          optimization: 91,
        },
      };

  const sessionId = crypto.randomUUID();
  const member = subCommand || 'cli-user';
  const document = 'cli-doc';

  const startTime = performance.now();
  const profileId = await pool.insertDataViewProfile(sessionId, profile, member, document);
  const latency = performance.now() - startTime;

  console.info(`✅ DataView profile inserted:`);
  console.info(`   ID: ${profileId}`);
  console.info(`   Session: ${sessionId}`);
  console.info(`   Member: ${member}`);
  console.info(`   Latency: ${latency.toFixed(2)}ms`);
  console.info(`   Profile Size: ${JSON.stringify(profile).length} bytes`);
}

async function handleDataViewQuery(pool: DataViewTelemetryPool, member?: string) {
  console.info(`🔍 Querying DataView sessions...`);

  const startTime = performance.now();
  const sessions = await pool.queryDataViewSessions(member || '*');
  const latency = performance.now() - startTime;

  console.info(`📊 Query Results (${member || 'all'}):`);
  console.info(`   Found: ${sessions.length} sessions`);
  console.info(`   Latency: ${latency.toFixed(2)}ms`);

  if (sessions.length > 0) {
    console.info(`\n📋 Recent Sessions:`);
    sessions.slice(0, 5).forEach((session, i) => {
      console.info(`   ${i + 1}. ${session.id.slice(0, 8)}...`);
      console.info(`      Member: ${session.member}`);
      console.info(`      Session: ${session.sessionId}`);
      console.info(`      Timestamp: ${new Date(session.timestamp).toISOString()}`);
      console.info(`      Data Size: ${session.dataSize} bytes`);
      console.info(`      Features: ${Object.keys(session.profile.features || {}).join(', ')}`);
    });

    if (sessions.length > 5) {
      console.info(`   ... and ${sessions.length - 5} more`);
    }
  }
}

async function handleDataViewBatch(pool: DataViewTelemetryPool, count: number) {
  console.info(`📦 Batch inserting ${count} DataView profiles...`);

  const profiles = [];
  for (let i = 0; i < count; i++) {
    profiles.push({
      profile: {
        documentSize: 1024 + Math.floor(Math.random() * 2048),
        parseTime: 10 + Math.random() * 20,
        throughput: 80 + Math.random() * 40,
        complexity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        tableCols: 5 + Math.floor(Math.random() * 20),
        memory: 256 + Math.floor(Math.random() * 1024),
        cryptoSeal: '0x' + Math.random().toString(16).substr(2, 8),
        gfmScore: 80 + Math.random() * 20,
        features: {
          parsing: 80 + Math.random() * 20,
          validation: 75 + Math.random() * 25,
          optimization: 85 + Math.random() * 15,
        },
      },
      metadata: {
        sessionId: crypto.randomUUID(),
        member: `batch-user-${Math.floor(i / 10)}`,
        timestamp: Date.now() + i,
        document: `batch-doc-${i}`,
      },
    });
  }

  const startTime = performance.now();
  const results = await pool.batchInsertDataViewProfiles(
    profiles.map(p => ({ profile: p.profile, metadata: p.metadata }))
  );
  const latency = performance.now() - startTime;

  console.info(`✅ Batch insert completed:`);
  console.info(`   Inserted: ${results.length} profiles`);
  console.info(`   Latency: ${latency.toFixed(2)}ms`);
  console.info(`   Throughput: ${(results.length / (latency / 1000)).toFixed(0)} profiles/sec`);
  console.info(`   Avg per profile: ${(latency / results.length).toFixed(2)}ms`);
}

async function handleDataViewMetrics(pool: DataViewTelemetryPool) {
  console.info(`📊 DataView Pool Metrics:`);

  const metrics = pool.getDataViewMetrics();

  console.info(`\n🎯 Performance Summary:`);
  console.info(`   Average Latency: ${metrics.performance.avgLatency.toFixed(2)}ms`);
  console.info(`   Throughput: ${metrics.performance.throughput.toFixed(0)} bytes/op`);
  console.info(`   Utilization Rate: ${(metrics.performance.utilizationRate * 100).toFixed(1)}%`);

  console.info(`\n📈 Operations Summary:`);
  console.info(`   Total Operations: ${metrics.summary.operationCount}`);
  console.info(`   Total Data Size: ${(metrics.summary.totalDataSize / 1024).toFixed(1)}KB`);
  console.info(`   Average Pool Size: ${metrics.summary.avgPoolSize.toFixed(1)}`);

  console.info(`\n💾 Buffer Info:`);
  console.info(`   Used Capacity: ${(metrics.bufferInfo.usedCapacity / 1024).toFixed(1)}KB`);
  console.info(`   Total Capacity: ${(metrics.bufferInfo.totalCapacity / 1024).toFixed(1)}KB`);
  console.info(`   Record Count: ${metrics.bufferInfo.recordCount}`);

  if (metrics.recentMetrics.length > 0) {
    console.info(`\n🕐 Recent Operations:`);
    metrics.recentMetrics.slice(0, 5).forEach((metric, i) => {
      console.info(`   ${i + 1}. ${metric.operation}`);
      console.info(`      Latency: ${metric.latency.toFixed(2)}ms`);
      console.info(`      Data Size: ${metric.dataSize} bytes`);
      console.info(`      Timestamp: ${new Date(metric.timestamp).toISOString()}`);
    });
  }
}

async function handleDataViewExport(pool: DataViewTelemetryPool) {
  console.info(`📤 Exporting DataView data...`);

  const startTime = performance.now();
  const exportData = await pool.exportDataViewData();
  const latency = performance.now() - startTime;

  // Write to files
  await Bun.write('dataview-profiles.bin', exportData.profiles);
  await Bun.write('dataview-metrics.bin', exportData.metrics);

  console.info(`✅ Export completed:`);
  console.info(`   Profiles: ${(exportData.profiles.length / 1024).toFixed(1)}KB`);
  console.info(`   Metrics: ${(exportData.metrics.length / 1024).toFixed(1)}KB`);
  console.info(`   Latency: ${latency.toFixed(2)}ms`);
  console.info(`   Files: dataview-profiles.bin, dataview-metrics.bin`);
}

async function handleDataViewStream(pool: DataViewTelemetryPool, streamType?: string) {
  console.info(`🌊 Processing DataView streams...`);

  const streamProcessor = new DataViewStreamProcessor();

  const startTime = performance.now();

  switch (streamType) {
    case 'profiles':
      const profileStream = streamProcessor.createDataViewStream(pool);
      const profileData = await streamProcessor.processStreamToBuffer(profileStream);
      await Bun.write('dataview-stream-profiles.bin', profileData);
      console.info(`✅ Profile stream exported: ${(profileData.length / 1024).toFixed(1)}KB`);
      break;

    case 'metrics':
      const metricsStream = streamProcessor.createMetricsStream(pool);
      const metricsData = await streamProcessor.processStreamToBuffer(metricsStream);
      await Bun.write('dataview-stream-metrics.bin', metricsData);
      console.info(`✅ Metrics stream exported: ${(metricsData.length / 1024).toFixed(1)}KB`);
      break;

    case 'filtered':
      const filterStream = streamProcessor.createDataViewStream(pool);
      const filteredStream = streamProcessor.createMemberFilterStream('cli-user')(filterStream);
      const filteredData = await streamProcessor.processStreamToBuffer(filteredStream);
      await Bun.write('dataview-stream-filtered.bin', filteredData);
      console.info(`✅ Filtered stream exported: ${(filteredData.length / 1024).toFixed(1)}KB`);
      break;

    case 'compressed':
      const compressStream = streamProcessor.createDataViewStream(pool);
      const compressedStream = streamProcessor.createCompressionStream()(compressStream);
      const compressedData = await streamProcessor.processStreamToBuffer(compressedStream);
      await Bun.write('dataview-stream-compressed.bin', compressedData);
      console.info(`✅ Compressed stream exported: ${(compressedData.length / 1024).toFixed(1)}KB`);
      break;

    default:
      console.info(`📋 Available stream types:`);
      console.info(`   profiles  - Export profile data stream`);
      console.info(`   metrics   - Export metrics stream`);
      console.info(`   filtered  - Export filtered stream (cli-user)`);
      console.info(`   compressed - Export compressed stream`);
      return;
  }

  const latency = performance.now() - startTime;
  console.info(`   Latency: ${latency.toFixed(2)}ms`);
}

async function handleDataViewStats(pool: DataViewTelemetryPool) {
  console.info(`📊 DataView Pool Statistics:`);

  const stats = await pool.getDataViewPoolStats();

  console.info(`\n🏊 Pool Information:`);
  console.info(`   Pool Size: ${stats.poolSize}`);
  console.info(`   Profiles Stored: ${stats.profiles}`);
  console.info(`   Total Data Size: ${(stats.totalDataSize / 1024 / 1024).toFixed(2)}MB`);
  console.info(`   Metrics Exports: ${stats.metricsExports}`);
  console.info(`   Average Profile Size: ${(stats.avgProfileSize / 1024).toFixed(1)}KB`);

  console.info(`\n⚡ Performance Metrics:`);
  console.info(`   Average Latency: ${stats.performance.avgLatency.toFixed(2)}ms`);
  console.info(`   Throughput: ${(stats.performance.throughput / 1024).toFixed(1)}KB/sec`);
  console.info(`   Utilization Rate: ${(stats.performance.utilizationRate * 100).toFixed(1)}%`);

  console.info(`\n📈 Operations Summary:`);
  console.info(`   Total Operations: ${stats.summary.operationCount}`);
  console.info(
    `   Total Data Processed: ${(stats.summary.totalDataSize / 1024 / 1024).toFixed(2)}MB`
  );
  console.info(`   Average Pool Utilization: ${stats.summary.avgPoolSize.toFixed(1)}`);
}

async function handleDataViewSync(pool: DataViewTelemetryPool) {
  console.info(`🔄 Syncing DataView metrics...`);

  const startTime = performance.now();
  await pool.syncDataViewMetrics();
  const latency = performance.now() - startTime;

  console.info(`✅ Metrics synchronized to database`);
  console.info(`   Latency: ${latency.toFixed(2)}ms`);
}

async function handleDataViewClean(pool: DataViewTelemetryPool) {
  console.info(`🧹 Cleaning DataView metrics...`);

  pool.clearDataViewMetrics();

  console.info(`✅ DataView metrics cleared`);
  console.info(`   Buffer reset to empty state`);
}

function showHelp() {
  console.info(`\n📖 DataView CLI Commands:`);
  console.info(`========================`);
  console.info(``);
  console.info(`📝 Profile Operations:`);
  console.info(`   dv-insert [member]           Insert a test profile`);
  console.info(`   dv-query [member]            Query profiles by member`);
  console.info(`   dv-batch [count]              Batch insert profiles`);
  console.info(``);
  console.info(`📊 Metrics & Statistics:`);
  console.info(`   dv-metrics                   Show detailed metrics`);
  console.info(`   dv-stats                     Show pool statistics`);
  console.info(`   dv-sync                      Sync metrics to database`);
  console.info(`   dv-clean                     Clear metrics buffer`);
  console.info(``);
  console.info(`📤 Export & Stream:`);
  console.info(`   dv-export                    Export binary data`);
  console.info(`   dv-stream [type]             Process data streams`);
  console.info(`       types: profiles, metrics, filtered, compressed`);
  console.info(``);
  console.info(`🔗 Examples:`);
  console.info(`   bun run dv-cli.ts dv-insert nolarose`);
  console.info(`   bun run dv-cli.ts dv-query nolarose`);
  console.info(`   bun run dv-cli.ts dv-batch 1000`);
  console.info(`   bun run dv-cli.ts dv-metrics`);
  console.info(`   bun run dv-cli.ts dv-stream profiles`);
}

// Run the CLI
if (import.meta.main) {
  main().catch(console.error);
}
