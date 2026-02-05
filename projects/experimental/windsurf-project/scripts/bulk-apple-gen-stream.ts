#!/usr/bin/env bun
// scripts/bulk-apple-gen-stream.ts - High-performance streaming generator for R2

import { BunR2AppleManager } from '../src/storage/r2-apple-manager';
import { mockAppleData } from '../utils/urlpattern-r2';

/**
 * High-speed streaming generator and uploader
 */
export async function streamAppleIDsToR2(count: number, shardID: string = 'main') {
  const manager = new BunR2AppleManager();
  await manager.initialize();
  
  const start = performance.now();
  let successes = 0;
  const batchSize = 100;
  
  for (let i = 0; i < count; i += batchSize) {
    const currentBatchSize = Math.min(batchSize, count - i);
    const batch = Array.from({ length: currentBatchSize }, (_, idx) => {
      const index = i + idx;
      const data = mockAppleData(index);
      const filename = `stream-${shardID}-${index}`;
      return { data, filename };
    });

    const uploads = batch.map(item => manager.uploadAppleID(item.data, item.filename));
    const results = await Promise.all(uploads);
    successes += results.filter(r => r.success).length;
  }

  const duration = (performance.now() - start) / 1000;
  const throughput = Math.round(count / duration);
  const sizeMB = (count * 150 / 1024 / 1024).toFixed(2); // Rough estimate

  return {
    total: count,
    successes,
    duration,
    throughput,
    sizeMB
  };
}

// Support CLI execution
if (import.meta.main) {
  const count = parseInt(process.argv[2]) || 1000;
  const result = await streamAppleIDsToR2(count);
  console.log(`✅ ${result.throughput} IDs/s | ${result.successes}/${result.total} stored in ${result.duration.toFixed(1)}s`);
}
