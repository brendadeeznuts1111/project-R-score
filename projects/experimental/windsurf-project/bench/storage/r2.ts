#!/usr/bin/env bun
// bench/r2.ts
import { BunR2AppleManager } from '../../src/storage/r2-apple-manager';
import { performance } from 'perf_hooks';

async function runBenchmark() {
  const bucketName = process.env.S3_BUCKET || 'apple-ids-bucket';
  const manager = new BunR2AppleManager({}, bucketName);

  console.info(`\n📊 UNIFIED R2 BENCHMARK - BUCKET: ${bucketName}`);
  console.info(`--------------------------------------------------`);

  try {
    await manager.initialize();
  } catch (e) {
    console.error('Failed to initialize manager:', e);
    process.exit(1);
  }

  const payloads = [
    { name: 'Micro (1KB)', size: 1024 },
    { name: 'Medium (100KB)', size: 100 * 1024 },
    { name: 'Large (1MB)', size: 1024 * 1024 }
  ];

  const results: any[] = [];

  for (const p of payloads) {
    console.info(`\n🚀 Testing Payload: ${p.name}`);
    
    // Generate random JSON-like data
    const data = {
      id: crypto.randomUUID(),
      content: 'x'.repeat(p.size),
      timestamp: new Date().toISOString(),
      metadata: {
        type: 'benchmark',
        source: 'bun-native'
      }
    };
    const filename = `bench-${p.name.replace(/[^a-z0-9]/gi, '').toLowerCase()}-${Date.now()}.json`;
    const key = `apple-ids/${filename}`;

    // 1. Write Benchmark
    const startWrite = performance.now();
    const uploadRes = await manager.uploadAppleID(data, filename);
    const endWrite = performance.now();
    const writeTime = endWrite - startWrite;

    // 2. Exists Benchmark
    const startExists = performance.now();
    const exists = await manager.fileExists(key);
    const endExists = performance.now();
    const existsTime = endExists - startExists;

    // 3. Read Benchmark
    const startRead = performance.now();
    const readBack = await manager.readAsJson(key);
    const endRead = performance.now();
    const readTime = endRead - startRead;

    // 4. Delete Benchmark
    const startDelete = performance.now();
    await manager.deleteFile(key);
    const endDelete = performance.now();
    const deleteTime = endDelete - startDelete;

    results.push({
      Payload: p.name,
      'Write (ms)': writeTime.toFixed(2),
      'Read (ms)': readTime.toFixed(1),
      'Exists (ms)': existsTime.toFixed(1),
      'Delete (ms)': deleteTime.toFixed(1),
      'Savings %': uploadRes.savings,
      'Provider': uploadRes.provider
    });
    
    console.info(`   ✅ Finished ${p.name}`);
  }

  console.info(`\n📈 SUMMARY RESULTS:`);
  console.table(results);

  // Concurrency Stress Test
  console.info(`\n🔥 Concurrency Stress Test: 10 Parallel Uploads...`);
  const batchSize = 10;
  const batchData = Array.from({ length: batchSize }).map((_, i) => ({
    id: i,
    timestamp: Date.now(),
    payload: 'concurrency-test'
  }));

  const startBatch = performance.now();
  const batchResults = await manager.bulkUploadAppleIDs(batchData, `bench-batch-${Date.now()}-`);
  const endBatch = performance.now();
  
  const successCount = batchResults.filter(r => r.success).length;
  console.info(`   ✅ Batch completed in ${(endBatch - startBatch).toFixed(2)}ms`);
  console.info(`   ✅ Success rate: ${successCount}/${batchSize}`);

  // Lifecycle Audit
  console.info(`\n🧪 Running Comprehensive Lifecycle Audit...`);
  const auditSuccess = await manager.performLifecycleAudit();
  console.info(auditSuccess ? '   ✅ AUDIT PASSED' : '   ❌ AUDIT FAILED');

  console.info(`\n--------------------------------------------------`);
  console.info(`✅ BENCHMARK COMPLETE\n`);
}

runBenchmark().catch(console.error);
