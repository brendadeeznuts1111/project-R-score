#!/usr/bin/env bun

// scripts/benchmark.ts - Bun performance testing
import { $ } from 'bun';
import { performance } from 'perf_hooks';
import { apiTracker } from '../packages/odds-core/src/monitoring/api-tracker.js';

// Type declarations for Bun globals
declare const Bun: {
  nanoseconds(): number;
  randomUUIDv7(encoding?: 'hex' | 'base64' | 'base64url', timestamp?: number): string;
  randomUUIDv7(encoding: 'buffer', timestamp?: number): Buffer;
  gzipSync(data: Uint8Array | Buffer): Uint8Array;
  gunzipSync(data: Uint8Array | Buffer): Uint8Array;
  deflateSync(data: Uint8Array | Buffer): Uint8Array;
  inflateSync(data: Uint8Array | Buffer): Uint8Array;
  zstdCompressSync(data: Uint8Array | Buffer, options?: { level?: number }): Uint8Array;
  deepEquals(a: any, b: any): boolean;
  serve<T>(options: {
    port?: number;
    development?: boolean;
    fetch(req: Request, server: any): Response | void;
    websocket?: {
      open(ws: any): void;
      message(ws: any, message: any): void;
      close(ws: any, code: number, reason: string): void;
    };
  }): {
    port: number;
    stop(): void;
    publish(topic: string, data: string, compress?: boolean): void;
    clients: Set<any>;
  };
};

interface BenchmarkResult {
  name: string;
  duration: number;
  success: boolean;
  error?: string;
  metrics?: any;
}

class BunBenchmarker {
  private results: BenchmarkResult[] = [];

  async runAllBenchmarks(): Promise<void> {
    console.log('🏎️  Benchmarking Odds Protocol with Bun...\n');

    const benchmarks = [
      {
        name: 'Package Installation',
        command: 'bun install --dry-run',
        description: 'Test dependency resolution speed'
      },
      {
        name: 'TypeScript Compilation',
        command: 'bun run typecheck',
        description: 'Test TypeScript compilation speed'
      },
      {
        name: 'Test Execution',
        command: 'bun test --run --silent',
        description: 'Test runner performance'
      },
      {
        name: 'Build Performance',
        command: 'bun run build:clean',
        description: 'Build system performance'
      },
      {
        name: 'Bundle Size',
        command: 'bun build ./packages/odds-core/src/index.ts --outdir ./dist/benchmark --target node --minify',
        description: 'Bundle optimization test'
      }
    ];

    for (const benchmark of benchmarks) {
      const result = await this.runBenchmark(benchmark.name, benchmark.command, benchmark.description);
      this.results.push(result);
    }

    // Run custom performance benchmarks
    await this.runCustomBenchmarks();

    this.printSummary();
  }

  async runBenchmark(name: string, command: string, description: string): Promise<BenchmarkResult> {
    console.log(`🔥 Running: ${name}`);
    console.log(`   ${description}`);

    const start = performance.now();
    const startMemory = process.memoryUsage();

    try {
      const result = await $`${command}`.nothrow();
      const duration = performance.now() - start;
      const endMemory = process.memoryUsage();

      if (result.success) {
        console.log(`   ✅ Completed in ${duration.toFixed(2)}ms`);
        console.log(`   📊 Memory: +${((endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024).toFixed(2)} MB`);
        
        return {
          name,
          duration,
          success: true,
          metrics: {
            memoryDelta: endMemory.heapUsed - startMemory.heapUsed,
            peakMemory: endMemory.heapUsed
          }
        };
      } else {
        console.log(`   ❌ Failed after ${duration.toFixed(2)}ms`);
        console.log(`   📝 Error: ${result.stderr?.toString()}`);
        
        return {
          name,
          duration,
          success: false,
          error: result.stderr?.toString()
        };
      }
    } catch (error) {
      const duration = performance.now() - start;
      console.log(`   💥 Exception after ${duration.toFixed(2)}ms: ${error}`);
      
      return {
        name,
        duration,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async runCustomBenchmarks(): Promise<void> {
    console.log('\n🔬 Running custom performance benchmarks...');

    // JSON parsing performance
    await this.benchmarkJsonParsing();

    // Memory allocation performance
    await this.benchmarkMemoryAllocation();

    // Async operation performance
    await this.benchmarkAsyncOperations();

    // WebSocket message throughput
    await this.benchmarkWebSocketThroughput();

    // NEW: Bun utilities benchmarks
    await this.benchmarkBunUtilities();

    // Compression performance
    await this.benchmarkCompression();

    // UUID generation performance
    await this.benchmarkUUIDGeneration();
  }

  async benchmarkJsonParsing(): Promise<void> {
    console.log('\n📄 JSON Parsing Performance:');
    
    const testData = Array.from({ length: 10000 }, (_, i) => ({
      id: i,
      symbol: `SYMBOL${i}`,
      price: Math.random() * 1000,
      timestamp: Date.now()
    }));

    const jsonString = JSON.stringify(testData);

    // Test Bun's JSON parsing
    const iterations = 1000;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      JSON.parse(jsonString);
    }

    const duration = performance.now() - start;
    const opsPerSecond = (iterations / duration) * 1000;

    console.log(`   ✅ ${iterations} JSON parses in ${duration.toFixed(2)}ms`);
    console.log(`   📈 ${opsPerSecond.toFixed(0)} ops/sec`);

    this.results.push({
      name: 'JSON Parsing',
      duration,
      success: true,
      metrics: { opsPerSecond, iterations }
    });
  }

  async benchmarkMemoryAllocation(): Promise<void> {
    console.log('\n💾 Memory Allocation Performance:');

    const start = performance.now();
    const startMemory = process.memoryUsage().heapUsed;

    // Allocate and deallocate memory
    const arrays: number[][] = [];
    for (let i = 0; i < 1000; i++) {
      arrays.push(new Array(10000).fill(0).map(() => Math.random()));
    }

    const peakMemory = process.memoryUsage().heapUsed;
    const allocationDuration = performance.now() - start;

    // Clear arrays
    arrays.length = 0;

    // Force GC if available
    if (global.gc) {
      global.gc();
    }

    const endMemory = process.memoryUsage().heapUsed;
    const totalDuration = performance.now() - start;

    console.log(`   📊 Allocation: ${allocationDuration.toFixed(2)}ms`);
    console.log(`   💾 Peak memory: +${((peakMemory - startMemory) / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   🧹 Cleanup: ${(totalDuration - allocationDuration).toFixed(2)}ms`);

    this.results.push({
      name: 'Memory Allocation',
      duration: totalDuration,
      success: true,
      metrics: {
        allocationDuration,
        peakMemoryDelta: peakMemory - startMemory,
        finalMemoryDelta: endMemory - startMemory
      }
    });
  }

  async benchmarkAsyncOperations(): Promise<void> {
    console.log('\n⚡ Async Operations Performance:');

    const concurrency = 100;
    const delayMs = 10;

    const start = performance.now();

    // Test concurrent async operations
    const promises = Array.from({ length: concurrency }, async (_, i) => {
      await apiTracker.track('Bun.sleep', () => Bun.sleep(delayMs));
      return i;
    });

    await Promise.all(promises);

    const duration = performance.now() - start;
    const expectedDuration = delayMs; // Should complete in ~10ms due to concurrency

    console.log(`   ✅ ${concurrency} concurrent async ops in ${duration.toFixed(2)}ms`);
    console.log(`   📈 Efficiency: ${(expectedDuration / duration * 100).toFixed(1)}%`);

    this.results.push({
      name: 'Async Operations',
      duration,
      success: true,
      metrics: { concurrency, delayMs, efficiency: expectedDuration / duration }
    });
  }

  async benchmarkWebSocketThroughput(): Promise<void> {
    console.log('\n🌐 WebSocket Throughput Performance:');

    const targetMessageCount = 10000;
    const messageSize = 1024; // 1KB messages
    let messageCount = 0;

    // Create test server
    const server = await apiTracker.track('Bun.serve', () => Bun.serve({
      port: 0, // Random port
      fetch(req: Request, server: any) {
        if (req.url.endsWith('/ws') && server.upgrade(req)) {
          return;
        }
        return new Response('Upgrade failed', { status: 500 });
      },
      websocket: {
        open(ws: any) {
          ws.send(JSON.stringify({ type: 'connected' }));
        },
        message(ws: any, message: any) {
          messageCount++;
        },
        close(ws: any, code: number, reason: string) {
          // Handle close
        }
      }
    }));

    const start = performance.now();

    try {
      // Create client connection
      const ws = new WebSocket(`ws://localhost:${server.port}`);
      
      await new Promise((resolve, reject) => {
        ws.onopen = resolve;
        ws.onerror = reject;
        setTimeout(reject, 5000);
      });

      let receivedCount = 0;
      
      ws.onmessage = () => {
        receivedCount++;
        if (receivedCount === messageCount) {
          ws.close();
        }
      };

      // Send messages
      const testData = 'x'.repeat(messageSize);
      for (let i = 0; i < messageCount; i++) {
        ws.send(testData);
      }

      // Wait for completion
      await new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (receivedCount === messageCount || ws.readyState === WebSocket.CLOSED) {
            clearInterval(checkInterval);
            resolve(undefined);
          }
        }, 10);
        
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve(undefined);
        }, 10000); // 10 second timeout
      });

      const duration = performance.now() - start;
      const throughput = (messageCount / duration) * 1000; // messages per second
      const dataRate = (throughput * messageSize) / 1024 / 1024; // MB/s

console.log(`   ✅ ${messageCount} messages in ${duration.toFixed(2)}ms`);
      console.log(`   📈 ${throughput.toFixed(0)} msg/sec`);
      console.log(`   💾 ${dataRate.toFixed(2)} MB/sec`);

      this.results.push({
        name: 'WebSocket Throughput',
        duration,
        success: true,
        metrics: { messageCount, throughput, dataRate }
      });

    } catch (error) {
      console.log(`   ❌ WebSocket benchmark failed: ${error}`);
      
      this.results.push({
        name: 'WebSocket Throughput',
        duration: 0,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      server.stop();
    }
  }

  async benchmarkBunUtilities(): Promise<void> {
    console.log('\n🛠️  Bun Utilities Performance:');

    // Test nanosecond precision timing
    const start = performance.now();
    const startNanos = await apiTracker.track('Bun.nanoseconds', () => Bun.nanoseconds());
    
    // Simulate some work
    let sum = 0;
    for (let i = 0; i < 1000000; i++) {
      sum += Math.random();
    }
    
    const duration = performance.now() - start;
    const nanos = await apiTracker.track('Bun.nanoseconds', () => Bun.nanoseconds()) - startNanos;

    console.log(`   ⏱️  Timing: ${duration.toFixed(2)}ms (${nanos}ns precision)`);

    // Test UUID v7 generation
    const uuidStart = performance.now();
    const uuids = Array.from({ length: 10000 }, () => Bun.randomUUIDv7());
    const uuidDuration = performance.now() - uuidStart;

    console.log(`   🆔 UUID v7: 10000 generated in ${uuidDuration.toFixed(2)}ms`);
    console.log(`   📈 ${(10000 / uuidDuration * 1000).toFixed(0)} UUIDs/sec`);

    // Test deep equals
    const deepEqualsStart = performance.now();
    const testObjects = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      data: { nested: { value: i * 2 }, array: [1, 2, 3] }
    }));
    
    for (let i = 0; i < 1000; i++) {
      await apiTracker.track('Bun.deepEquals', () => Bun.deepEquals(testObjects[i], testObjects[i]));
    }
    
    const deepEqualsDuration = performance.now() - deepEqualsStart;
    console.log(`   🔍 Deep Equals: 1000 comparisons in ${deepEqualsDuration.toFixed(2)}ms`);

    this.results.push({
      name: 'Bun Utilities',
      duration: duration + uuidDuration + deepEqualsDuration,
      success: true,
      metrics: {
        nanosecondTiming: nanos,
        uuidGenerationRate: 10000 / uuidDuration * 1000,
        deepEqualsRate: 1000 / deepEqualsDuration * 1000
      }
    });
  }

  async benchmarkCompression(): Promise<void> {
    console.log('\n🗜️  Compression Performance:');

    const testData = JSON.stringify(Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      symbol: `SYMBOL${i}`,
      price: Math.random() * 1000,
      exchange: 'NYSE',
      side: 'buy',
      timestamp: Date.now()
    })));

    const buffer = Buffer.from(testData);
    const originalSize = buffer.length;

    // Test Gzip compression
    const gzipStart = performance.now();
    const gzipCompressed = await apiTracker.track('Bun.gzipSync', () => Bun.gzipSync(buffer));
    const gzipDuration = performance.now() - gzipStart;
    
    // Test Deflate compression
    const deflateStart = performance.now();
    const deflateCompressed = await apiTracker.track('Bun.deflateSync', () => Bun.deflateSync(buffer));
    const deflateDuration = performance.now() - deflateStart;
    
    // Test ZSTD compression
    const zstdStart = performance.now();
    const zstdCompressed = await apiTracker.track('Bun.zstdCompressSync', () => Bun.zstdCompressSync(buffer));
    const zstdDuration = performance.now() - zstdStart;

    console.log(`   📦 Original: ${(originalSize / 1024).toFixed(2)} KB`);
    console.log(`   🗜️  Gzip: ${(gzipCompressed.length / 1024).toFixed(2)} KB (${((gzipCompressed.length / originalSize) * 100).toFixed(1)}%) in ${gzipDuration.toFixed(2)}ms`);
    console.log(`   🗜️  Deflate: ${(deflateCompressed.length / 1024).toFixed(2)} KB (${((deflateCompressed.length / originalSize) * 100).toFixed(1)}%) in ${deflateDuration.toFixed(2)}ms`);
    console.log(`   🗜️  ZSTD: ${(zstdCompressed.length / 1024).toFixed(2)} KB (${((zstdCompressed.length / originalSize) * 100).toFixed(1)}%) in ${zstdDuration.toFixed(2)}ms`);

    this.results.push({
      name: 'Compression',
      duration: gzipDuration + deflateDuration + zstdDuration,
      success: true,
      metrics: {
        originalSize,
        gzipSize: gzipCompressed.length,
        gzipRatio: gzipCompressed.length / originalSize,
        deflateSize: deflateCompressed.length,
        deflateRatio: deflateCompressed.length / originalSize,
        zstdSize: zstdCompressed.length,
        zstdRatio: zstdCompressed.length / originalSize
      }
    });
  }

  async benchmarkUUIDGeneration(): Promise<void> {
    console.log('\n🆔 UUID Generation Performance:');

    const iterations = 100000;

    // Test UUID v7 vs crypto.randomUUID
    const v7Start = performance.now();
    const v7UUIDs = Array.from({ length: iterations }, () => Bun.randomUUIDv7());
    const v7Duration = performance.now() - v7Start;

    const cryptoStart = performance.now();
    const cryptoUUIDs = Array.from({ length: iterations }, () => crypto.randomUUID());
    const cryptoDuration = performance.now() - cryptoStart;

    console.log(`   🆔 UUID v7: ${iterations} in ${v7Duration.toFixed(2)}ms (${(iterations / v7Duration * 1000).toFixed(0)} ops/sec)`);
    console.log(`   🔐 Crypto UUID: ${iterations} in ${cryptoDuration.toFixed(2)}ms (${(iterations / cryptoDuration * 1000).toFixed(0)} ops/sec)`);
    console.log(`   📈 v7 is ${(cryptoDuration / v7Duration).toFixed(2)}x faster`);

    // Test different encodings
    const hexStart = performance.now();
    const hexUUIDs = Array.from({ length: 10000 }, () => Bun.randomUUIDv7('hex'));
    const hexDuration = performance.now() - hexStart;

    const base64Start = performance.now();
    const base64UUIDs = Array.from({ length: 10000 }, () => Bun.randomUUIDv7('base64'));
    const base64Duration = performance.now() - base64Start;

    const bufferStart = performance.now();
    const bufferUUIDs = Array.from({ length: 10000 }, () => Bun.randomUUIDv7('buffer'));
    const bufferDuration = performance.now() - bufferStart;

    console.log(`   🔤 Hex encoding: ${hexDuration.toFixed(2)}ms`);
    console.log(`   📋 Base64 encoding: ${base64Duration.toFixed(2)}ms`);
    console.log(`   📦 Buffer encoding: ${bufferDuration.toFixed(2)}ms`);

    this.results.push({
      name: 'UUID Generation',
      duration: v7Duration + cryptoDuration,
      success: true,
      metrics: {
        v7Rate: iterations / v7Duration * 1000,
        cryptoRate: iterations / cryptoDuration * 1000,
        speedup: cryptoDuration / v7Duration,
        hexRate: 10000 / hexDuration * 1000,
        base64Rate: 10000 / base64Duration * 1000,
        bufferRate: 10000 / bufferDuration * 1000
      }
    });
  }

  printSummary(): void {
    console.log('\n📊 Benchmark Summary:');
    console.log('═'.repeat(60));

    const successful = this.results.filter(r => r.success);
    const failed = this.results.filter(r => !r.success);

    this.results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const duration = result.duration.toFixed(2);
      console.log(`${status} ${result.name.padEnd(25)} ${duration.padStart(10)}ms`);
      
      if (result.metrics) {
        Object.entries(result.metrics).forEach(([key, value]) => {
          if (typeof value === 'number') {
            const formatted = value > 1000 ? (value / 1000).toFixed(2) + 'k' : value.toFixed(2);
            console.log(`    └─ ${key}: ${formatted}`);
          }
        });
      }
      
      if (result.error) {
        console.log(`    └─ Error: ${result.error.substring(0, 50)}...`);
      }
    });

    console.log('═'.repeat(60));
    console.log(`Total: ${this.results.length} benchmarks`);
    console.log(`Successful: ${successful.length}`);
    console.log(`Failed: ${failed.length}`);

    if (successful.length > 0) {
      const avgDuration = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
      console.log(`Average duration: ${avgDuration.toFixed(2)}ms`);
    }

    // Export results to JSON
    await apiTracker.track('Bun.write', () => Bun.write('./benchmark-results.json', JSON.stringify({
      timestamp: new Date().toISOString(),
      results: this.results,
      summary: {
        total: this.results.length,
        successful: successful.length,
        failed: failed.length,
        averageDuration: successful.length > 0 
          ? successful.reduce((sum, r) => sum + r.duration, 0) / successful.length 
          : 0
      }
    }, null, 2)));

    console.log('\n💾 Results saved to benchmark-results.json');
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const benchmarker = new BunBenchmarker();

  if (command === 'json') {
    await benchmarker.runCustomBenchmarks();
  } else {
    await benchmarker.runAllBenchmarks();
  }
}

if (import.meta.main) {
  main().catch(error => {
    console.error('Benchmark script failed:', error);
    process.exit(1);
  });
}

export { BunBenchmarker };
