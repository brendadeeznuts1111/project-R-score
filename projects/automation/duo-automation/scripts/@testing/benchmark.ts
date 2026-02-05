#!/usr/bin/env bun
// scripts/benchmark.ts

export class BunBenchmark {
  static async measure<T>(
    name: string,
    operation: () => T | Promise<T>,
    iterations: number = 1000
  ): Promise<BenchmarkResult> {
    const times: number[] = [];
    let result: T;

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      result = await operation();
      const end = performance.now();
      times.push(end - start);
    }

    const sorted = times.sort((a, b) => a - b);
    
    return {
      name,
      iterations,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median: sorted[Math.floor(sorted.length / 2)],
      average: times.reduce((a, b) => a + b, 0) / times.length,
      p95: sorted[Math.floor(sorted.length * 0.95)],
      opsPerSec: 1000 / (times.reduce((a, b) => a + b, 0) / times.length)
    };
  }

  static compareCompression(): void {
    const sampleData = {
      timestamp: Date.now(),
      metrics: Array.from({ length: 1000 }, (_, i) => ({
        id: Bun.randomUUIDv7(),
        value: Math.random() * 100,
        category: ['network', 'security', 'performance'][i % 3]
      }))
    };

    const jsonString = JSON.stringify(sampleData);

    console.log('\n📊 Compression Benchmark');
    console.log('─'.repeat(60));
    console.log(`Original size: ${jsonString.length} bytes`);

    // Test different compression methods
    const tests = [
      { name: 'gzip', fn: () => Bun.gzipSync(jsonString) },
      { name: 'zstd', fn: () => Bun.zstdCompressSync(jsonString) },
      { name: 'deflate', fn: () => Bun.deflateSync(jsonString) }
    ];

    for (const test of tests) {
      const result = test.fn();
      const ratio = jsonString.length / result.length;
      console.log(`${test.name.padEnd(8)}: ${result.length.toString().padStart(6)} bytes (${ratio.toFixed(2)}x compression)`);
    }
  }
}

interface BenchmarkResult {
  name: string;
  iterations: number;
  min: number;
  max: number;
  median: number;
  average: number;
  p95: number;
  opsPerSec: number;
}

// Run benchmarks
if (import.meta.main) {
  console.log('🚀 Starting Bun Native Benchmarks...');
  
  const uuidBench = await BunBenchmark.measure('UUID Generation', () => {
    return Bun.randomUUIDv7();
  }, 10000);
  
  console.log(`\n💎 ${uuidBench.name}:`);
  console.log(`  • Iterations: ${uuidBench.iterations}`);
  console.log(`  • Average:    ${uuidBench.average.toFixed(4)}ms`);
  console.log(`  • P95:        ${uuidBench.p95.toFixed(4)}ms`);
  console.log(`  • Throughput: ${Math.round(uuidBench.opsPerSec).toLocaleString()} IDs/s`);

  BunBenchmark.compareCompression();
}