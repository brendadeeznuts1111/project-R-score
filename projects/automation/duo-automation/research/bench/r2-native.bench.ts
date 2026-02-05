/**
 * benchmarks/r2-native.bench.ts
 * High-performance R2 benchmarking using Bun-native performance APIs
 * Zero dependency approach for isolated environments
 * Enhanced with throughput histograms and latency distribution
 */

import { BunR2Manager } from '../utils/bun-r2-manager';
import { mock } from 'bun:test';

// Mock the global fetch to return success for R2 endpoints
const originalFetch = global.fetch;
global.fetch = mock((input: string | Request | URL) => {
  const url = input.toString();
  if (url.includes('r2.cloudflarestorage.com')) {
    return Promise.resolve(new Response(null, { 
      status: 200, 
      headers: { 'etag': 'mock-etag' } 
    }));
  }
  return originalFetch ? originalFetch(input as any) : Promise.reject('No network');
});

function calculateHistogram(data: number[], bins: number = 10) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;
  const binSize = range / bins;
  const histogram = new Array(bins).fill(0);

  data.forEach(val => {
    const binIndex = Math.min(Math.floor((val - min) / binSize), bins - 1);
    histogram[binIndex]++;
  });

  return {
    bins: bins,
    binSize: binSize,
    min: min,
    max: max,
    data: histogram
  };
}

async function runBenchmark() {
  const r2 = new BunR2Manager({
    accountId: 'bench-account',
    accessKeyId: 'bench-id',
    secretAccessKey: 'bench-secret',
    bucket: 'factory-wager-packages'
  });

  const iterations = 500; // Increased for better histogram
  const smallPayload = new Uint8Array(1024); // 1KB

  console.log(`🚀 Starting Enhanced Native R2 Benchmark (${iterations} iterations)...`);

  const results = [];
  const startTotal = performance.now();

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await r2.upload({
      key: `bench/test-${i}.bin`,
      data: smallPayload
    });
    const end = performance.now();
    results.push(end - start);
    
    if (i % 100 === 0) console.log(`  - Progress: ${(i / iterations * 100).toFixed(0)}%`);
  }

  const endTotal = performance.now();
  const totalDuration = endTotal - startTotal;
  const totalMs = results.reduce((a, b) => a + b, 0);
  const avg = totalMs / iterations;
  const min = Math.min(...results);
  const max = Math.max(...results);
  
  // Percentiles
  const sorted = [...results].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(iterations * 0.5)];
  const p90 = sorted[Math.floor(iterations * 0.9)];
  const p99 = sorted[Math.floor(iterations * 0.99)];

  const histogram = calculateHistogram(results, 20);

  console.log('\n📊 Enhanced Benchmark Results (Local Mocked Storage):');
  console.log(`- Average:   ${avg.toFixed(2)}ms`);
  console.log(`- P50:       ${p50.toFixed(2)}ms`);
  console.log(`- P90:       ${p90.toFixed(2)}ms`);
  console.log(`- P99:       ${p99.toFixed(2)}ms`);
  console.log(`- Min:       ${min.toFixed(2)}ms`);
  console.log(`- Max:       ${max.toFixed(2)}ms`);
  console.log(`- Throughput: ${(iterations / (totalDuration / 1000)).toFixed(2)} IDs/s`);

  // Export results
  const report = {
    timestamp: new Date().toISOString(),
    iterations,
    metrics: { 
      avg, 
      p50, 
      p90, 
      p99, 
      min, 
      max, 
      throughput: iterations / (totalDuration / 1000) 
    },
    histogram: histogram
  };
  
  await (Bun as any).write('reports/r2-benchmark.json', JSON.stringify(report, null, 2));
}

runBenchmark().catch(console.error);