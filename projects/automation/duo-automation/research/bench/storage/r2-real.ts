#!/usr/bin/env bun
// bench/r2-real.ts - LIVE R2 Uploads (Wrangler + Zstd + Parallel)
import { BunR2AppleManager } from '../../src/storage/r2-apple-manager';
import { BULK_CONFIG } from '../../config/constants';
import { performance } from 'perf_hooks';

// Type definition for test data
interface AppleID {
  email: string;
  success: boolean;
  country: string;
  city: string;
  filename: string;
  batchID: string;
}

const R2_BENCH = {
  UPLOADS: [10, 100, 500],  // Scale tiers
  PARALLEL: true,
  RUNS: 3  // Number of runs to average
} as const;

interface R2BenchResult {
  name: string;
  avg: number;  // ms
  min: number;
  max: number;
  p75: number;
  p99: number;
  throughput: number;  // IDs/s
  savingsAvg: number;  // %
  successCount: number;
}

async function runBenchmarkTier(name: string, uploads: number, parallel: boolean, bucket: string): Promise<R2BenchResult> {
  const times: number[] = [];
  let totalSavings = 0;
  let successCount = 0;

  for (let run = 0; run < R2_BENCH.RUNS; run++) {
    // 1. Generate test data
    const testData: AppleID[] = Array.from({ length: uploads }).map((_, i) => ({
      email: `bench${run}-${String(i + 1).padStart(4, '0')}@icloud.com`,
      success: true,
      country: 'US',
      city: 'NY',
      filename: `bench-${run}-${i + 1}.json`,
      batchID: crypto.randomUUID()
    }));

    // 2. Initialize Manager (Real R2)
    const manager = new BunR2AppleManager({}, bucket);
    await manager.initialize();

    const start = performance.now();
    
    let results: any[];
    if (parallel) {
      // Parallel Mode: Pipeline all uploads
      const promises = testData.map(data => manager.uploadAppleID(data, data.filename));
      results = await Promise.all(promises);
    } else {
      // Serial Mode: One by one
      results = [];
      for (const data of testData) {
        results.push(await manager.uploadAppleID(data, data.filename));
      }
    }

    const timeMs = performance.now() - start;
    times.push(timeMs);

    totalSavings += results.reduce((sum, r) => sum + (r.savings || 0), 0) / results.length;
    successCount += results.filter(r => r.success).length;

    // Cleanup tier data immediately to keep R2 clean
    const cleanupPromises = testData.map(data => manager.deleteFile(`apple-ids/${data.filename}`));
    await Promise.all(cleanupPromises);
  }

  times.sort((a, b) => a - b);
  const avg = times.reduce((a, b) => a + b, 0) / R2_BENCH.RUNS;
  
  return {
    name: `${name} (${uploads} uploads, ${parallel ? 'parallel' : 'serial'})`,
    avg,
    min: times[0],
    max: times[times.length - 1],
    p75: times[Math.floor(times.length * 0.75)] || times[times.length - 1],
    p99: times[Math.floor(times.length * 0.99)] || times[times.length - 1],
    throughput: (uploads / avg) * 1000,
    savingsAvg: totalSavings / R2_BENCH.RUNS,
    successCount: successCount / R2_BENCH.RUNS
  };
}

async function main() {
  const bucket = process.env.S3_BUCKET || 'factory-wager-packages';
  console.log(`\n🚀 LIVE R2 REAL-WORLD BENCHMARK`);
  console.log(`Bucket: ${bucket}`);
  console.log(`Zstd: ACTIVE | Concurrency: UP TO 500`);
  console.log(`--------------------------------------------------\n`);

  const results: R2BenchResult[] = [];

  for (const uploads of R2_BENCH.UPLOADS) {
    console.log(`📡 Starting tier: ${uploads} uploads...`);
    const parallelRes = await runBenchmarkTier('Parallel', uploads, true, bucket);
    results.push(parallelRes);

    if (uploads <= 10) {
      const serialRes = await runBenchmarkTier('Serial', uploads, false, bucket);
      results.push(serialRes);
    }
  }

  // Bonus: Presign Gen Bench (Native S3)
  const manager = new BunR2AppleManager({}, bucket);
  const presignStart = performance.now();
  await manager.getPresignedUrl('bench-test.json', 'PUT');
  const presignTime = performance.now() - presignStart;
  console.log(`\n⚡ Presign Latency: ${presignTime.toFixed(2)}ms`);

  // Final results table
  console.log(`\n📈 MASTER PERFORMANCE MATRIX:`);
  console.table(results.map(r => ({
    Benchmark: r.name,
    'Time (avg)': `${r.avg.toFixed(0)}ms`,
    '(min…max)': `${r.min.toFixed(0)}…${r.max.toFixed(0)}ms`,
    'p75/p99': `${r.p75.toFixed(0)}/${r.p99.toFixed(0)}ms`,
    Throughput: `${r.throughput.toLocaleString(undefined, { maximumFractionDigits: 1 })} IDs/s`,
    Savings: `${r.savingsAvg.toFixed(1)}%`,
    Success: `${r.successCount}/${results.find(x => x === r)?.name.match(/\d+/)?.[0] || '?'}`
  })));

  const maxTier = results.find(r => r.name.includes('500'));
  if (maxTier) {
    console.log(`\n📊 R2 LIVE Summary: 500 parallel → ${maxTier.avg.toFixed(0)}ms (${maxTier.throughput.toLocaleString(undefined, { maximumFractionDigits: 1 })} IDs/s) 🚀`);
  }
}

main().catch(console.error);
