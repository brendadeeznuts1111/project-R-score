// benchmarks/error-handling-perf.ts — Error handling performance benchmarks

import { ErrorMetricsCollector } from '../lib/core/error-metrics';
import { OptimizedErrorMetricsCollector } from '../lib/core/error-metrics-perf';
import { CircuitBreaker } from '../lib/core/circuit-breaker';
import { crc32, benchmark as crc32Benchmark } from '../lib/core/crc32';

console.log('🚀 Error Handling Performance Benchmarks\n');
console.log('Bun v' + Bun.version + '\n');

// ============================================================================
// Test 1: CRC32 Performance (Hardware Accelerated)
// ============================================================================
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 Test 1: CRC32 Hashing (Hardware Accelerated)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const crcResults = [
  { size: 1, ...crc32Benchmark(1) },
  { size: 10, ...crc32Benchmark(10) },
  { size: 100, ...crc32Benchmark(100) },
  { size: 1024, ...crc32Benchmark(1024) },
  { size: 10240, ...crc32Benchmark(10240) },
];

console.log('Size    | Time (ms) | Throughput   | Ops/sec');
console.log('--------|-----------|--------------|----------');
for (const r of crcResults) {
  console.log(
    `${r.size.toString().padStart(5)}KB | ` +
    `${r.timeMs.toFixed(3).padStart(9)} | ` +
    `${r.throughput.padStart(12)} | ` +
    `${r.opsPerSecond.toLocaleString()}`
  );
}

// ============================================================================
// Test 2: Error Metrics Export Performance
// ============================================================================
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 Test 2: Error Metrics Export (O(n²) vs O(n))');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

async function benchmarkMetricsExport() {
  const metrics = new ErrorMetricsCollector();
  const optimized = new OptimizedErrorMetricsCollector();
  
  // Populate with test data
  console.log('Populating 10,000 error metrics...');
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
  console.log('\nRunning benchmarks...');
  const start1 = performance.now();
  (metrics as any).exportMetrics(60 * 60 * 1000);
  const time1 = performance.now() - start1;
  
  // Benchmark optimized
  const start2 = performance.now();
  optimized.exportMetricsOptimized(60 * 60 * 1000);
  const time2 = performance.now() - start2;
  
  console.log(`\nOriginal (O(n²)):  ${time1.toFixed(2)}ms`);
  console.log(`Optimized (O(n)):  ${time2.toFixed(2)}ms`);
  console.log(`Speedup:           ${(time1 / time2).toFixed(1)}x`);
  
  // Memory usage estimate
  const memBefore = process.memoryUsage();
  (metrics as any).exportMetrics(60 * 60 * 1000);
  const memAfter = process.memoryUsage();
  const memUsed = (memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024;
  console.log(`Memory allocated:  ${memUsed.toFixed(2)} MB (original)`);
  
  metrics.destroy();
  optimized.destroy();
}

await benchmarkMetricsExport();

// ============================================================================
// Test 3: Circuit Breaker Performance
// ============================================================================
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 Test 3: Circuit Breaker Execution');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

async function benchmarkCircuitBreaker() {
  const breaker = new CircuitBreaker('perf-test', {
    failureThreshold: 1000,
    resetTimeoutMs: 60000,
    successThreshold: 2,
  });
  
  const iterations = 10000;
  console.log(`Executing ${iterations.toLocaleString()} successful calls...`);
  
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    await breaker.execute(async () => 'success');
  }
  const time = performance.now() - start;
  
  const opsPerSecond = iterations / (time / 1000);
  const avgTime = time / iterations;
  
  console.log(`Total time:      ${time.toFixed(2)}ms`);
  console.log(`Avg per call:    ${avgTime.toFixed(3)}ms`);
  console.log(`Ops/sec:         ${opsPerSecond.toFixed(0)}`);
  console.log(`State:           ${breaker.getState()}`);
  console.log(`Stats:`, breaker.getStats());
  
  breaker.destroy();
}

await benchmarkCircuitBreaker();

// ============================================================================
// Test 4: Error Rate Caching
// ============================================================================
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 Test 4: Error Rate Caching Performance');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

function benchmarkErrorRateCaching() {
  const optimized = new OptimizedErrorMetricsCollector();
  
  // Add some errors
  for (let i = 0; i < 1000; i++) {
    (optimized as any).record(new Error(`Error ${i}`), { service: 'test' });
  }
  
  const iterations = 10000;
  console.log(`Calling getCurrentErrorRate ${iterations.toLocaleString()} times...`);
  
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
  
  console.log(`Cold start (calculated): ${coldTime.toFixed(3)}ms`);
  console.log(`Cached calls total:      ${cachedTime.toFixed(3)}ms`);
  console.log(`Cached avg per call:     ${(cachedTime / iterations * 1000).toFixed(3)}µs`);
  console.log(`Speedup:                 ${(coldTime / (cachedTime / iterations)).toFixed(0)}x`);
  
  optimized.destroy();
}

benchmarkErrorRateCaching();

// ============================================================================
// Summary
// ============================================================================
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ All Benchmarks Complete');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('Key Optimizations:');
console.log('  • CRC32: Hardware-accelerated (PCLMULQDQ/CRC32)');
console.log('  • Error Metrics: O(n) single-pass export (was O(n²))');
console.log('  • Cleanup: In-place filtering (no allocations)');
console.log('  • Error Rate: LRU caching with TTL');
console.log('  • Circuit Breaker: Async queue (no race conditions)');
console.log('');
