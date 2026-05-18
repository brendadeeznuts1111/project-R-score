// benchmarks/error-handling-perf.ts — Error handling performance benchmarks

import { ErrorMetricsCollector } from '../lib/core/error-metrics';
import { OptimizedErrorMetricsCollector } from '../lib/core/error-metrics-perf';
import { CircuitBreaker } from '../lib/core/circuit-breaker';
import { crc32, benchmark as crc32Benchmark } from '../lib/core/crc32';

console.info('🚀 Error Handling Performance Benchmarks\n');
console.info('Bun v' + Bun.version + '\n');

// ============================================================================
// Test 1: CRC32 Performance (Hardware Accelerated)
// ============================================================================
console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.info('📊 Test 1: CRC32 Hashing (Hardware Accelerated)');
console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const crcResults = [
  { size: 1, ...crc32Benchmark(1) },
  { size: 10, ...crc32Benchmark(10) },
  { size: 100, ...crc32Benchmark(100) },
  { size: 1024, ...crc32Benchmark(1024) },
  { size: 10240, ...crc32Benchmark(10240) },
];

console.info('Size    | Time (ms) | Throughput   | Ops/sec');
console.info('--------|-----------|--------------|----------');
for (const r of crcResults) {
  console.info(
    `${r.size.toString().padStart(5)}KB | ` +
    `${r.timeMs.toFixed(3).padStart(9)} | ` +
    `${r.throughput.padStart(12)} | ` +
    `${r.opsPerSecond.toLocaleString()}`
  );
}

// ============================================================================
// Test 2: Error Metrics Export Performance
// ============================================================================
console.info('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.info('📊 Test 2: Error Metrics Export (O(n²) vs O(n))');
console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

async function benchmarkMetricsExport() {
  const metrics = new ErrorMetricsCollector();
  const optimized = new OptimizedErrorMetricsCollector();
  
  // Populate with test data
  console.info('Populating 10,000 error metrics...');
  for (let i = 0; i < 10000; i++) {
    const error = new Error(`Test error ${i}`);
    (metrics as any).record(error, { 
      service: `service-${i % 10}`,
      endpoint: `/api/endpoint-${i % 20}`
    });
    (optimized as any).record(error, { 
      service: `service-${i % 10}`,
      endpoint: `/api/endpoint-${i % 20}`
    });
  }
  
  // Benchmark original
  console.info('\nRunning benchmarks...');
  const start1 = performance.now();
  (metrics as any).exportMetrics(60 * 60 * 1000);
  const time1 = performance.now() - start1;
  
  // Benchmark optimized
  const start2 = performance.now();
  optimized.exportMetricsOptimized(60 * 60 * 1000);
  const time2 = performance.now() - start2;
  
  console.info(`\nOriginal (O(n²)):  ${time1.toFixed(2)}ms`);
  console.info(`Optimized (O(n)):  ${time2.toFixed(2)}ms`);
  console.info(`Speedup:           ${(time1 / time2).toFixed(1)}x`);
  
  // Memory usage estimate
  const memBefore = process.memoryUsage();
  (metrics as any).exportMetrics(60 * 60 * 1000);
  const memAfter = process.memoryUsage();
  const memUsed = (memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024;
  console.info(`Memory allocated:  ${memUsed.toFixed(2)} MB (original)`);
  
  metrics.destroy();
  optimized.destroy();
}

await benchmarkMetricsExport();

// ============================================================================
// Test 3: Circuit Breaker Performance
// ============================================================================
console.info('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.info('📊 Test 3: Circuit Breaker Execution');
console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

async function benchmarkCircuitBreaker() {
  const breaker = new CircuitBreaker('perf-test', {
    failureThreshold: 1000,
    resetTimeoutMs: 60000,
    successThreshold: 2,
  });
  
  const iterations = 10000;
  console.info(`Executing ${iterations.toLocaleString()} successful calls...`);
  
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    await breaker.execute(async () => 'success');
  }
  const time = performance.now() - start;
  
  const opsPerSecond = iterations / (time / 1000);
  const avgTime = time / iterations;
  
  console.info(`Total time:      ${time.toFixed(2)}ms`);
  console.info(`Avg per call:    ${avgTime.toFixed(3)}ms`);
  console.info(`Ops/sec:         ${opsPerSecond.toFixed(0)}`);
  console.info(`State:           ${breaker.getState()}`);
  console.info(`Stats:`, breaker.getStats());
  
  breaker.destroy();
}

await benchmarkCircuitBreaker();

// ============================================================================
// Test 4: Error Rate Caching
// ============================================================================
console.info('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.info('📊 Test 4: Error Rate Caching Performance');
console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

function benchmarkErrorRateCaching() {
  const optimized = new OptimizedErrorMetricsCollector();
  
  // Add some errors
  for (let i = 0; i < 1000; i++) {
    (optimized as any).record(new Error(`Error ${i}`), { service: 'test' });
  }
  
  const iterations = 10000;
  console.info(`Calling getCurrentErrorRate ${iterations.toLocaleString()} times...`);
  
  // Cold start (first call)
  const coldStart = performance.now();
  optimized.getCurrentErrorRateCached(5 * 60 * 1000);
  const coldTime = performance.now() - coldStart;
  
  // Cached calls
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    optimized.getCurrentErrorRateCached(5 * 60 * 1000);
  }
  const cachedTime = performance.now() - start;
  
  console.info(`Cold start (calculated): ${coldTime.toFixed(3)}ms`);
  console.info(`Cached calls total:      ${cachedTime.toFixed(3)}ms`);
  console.info(`Cached avg per call:     ${(cachedTime / iterations * 1000).toFixed(3)}µs`);
  console.info(`Speedup:                 ${(coldTime / (cachedTime / iterations)).toFixed(0)}x`);
  
  optimized.destroy();
}

benchmarkErrorRateCaching();

// ============================================================================
// Summary
// ============================================================================
console.info('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.info('✅ All Benchmarks Complete');
console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.info('Key Optimizations:');
console.info('  • CRC32: Hardware-accelerated (PCLMULQDQ/CRC32)');
console.info('  • Error Metrics: O(n) single-pass export (was O(n²))');
console.info('  • Cleanup: In-place filtering (no allocations)');
console.info('  • Error Rate: LRU caching with TTL');
console.info('  • Circuit Breaker: Async queue (no race conditions)');
console.info('');
