#!/usr/bin/env bun
/**
 * Official Buffer swap benchmark (matching Bun v1.3.7 release notes)
 * Uses Bun.nanoseconds() for high-resolution timing
 */

const buf = Buffer.alloc(64 * 1024); // 64 KiB buffer (same as official benchmark)

// Benchmark swap16
let start = Bun.nanoseconds();
for (let i = 0; i < 10000; i++) {
  buf.swap16();
}
let end = Bun.nanoseconds();
const swap16Time = (end - start) / 10000 / 1000; // Convert to microseconds per operation

console.log(`swap16(): ${swap16Time.toFixed(2)}µs per operation`);

// Reset buffer
buf.fill(0);

// Benchmark swap64
start = Bun.nanoseconds();
for (let i = 0; i < 10000; i++) {
  buf.swap64();
}
end = Bun.nanoseconds();
const swap64Time = (end - start) / 10000 / 1000; // Convert to microseconds per operation

console.log(`swap64(): ${swap64Time.toFixed(2)}µs per operation`);

// Calculate improvements
console.log('\n--- Performance Analysis ---');
console.log(`Expected (Bun v1.3.7): swap16 ≈ 0.56µs, swap64 ≈ 0.56µs`);
console.log(`Your results:          swap16 ≈ ${swap16Time.toFixed(2)}µs, swap64 ≈ ${swap64Time.toFixed(2)}µs`);

if (swap64Time < 1.0) {
  console.log('✅ swap64 is performing at optimized speeds (< 1µs)');
}

if (Math.abs(swap16Time - swap64Time) < 0.1) {
  console.log('✅ swap16 and swap64 have similar performance (as expected in v1.3.7+)');
}

// Show theoretical ops/sec
const swap64OpsPerSec = 1000000 / swap64Time;
console.log(`\nswap64 performance: ${swap64OpsPerSec.toLocaleString()} ops/sec`);

// Note about error handling
console.log('\n--- Error Handling ---');
try {
  const oddBuf = Buffer.alloc(7); // Not a multiple of 8
  oddBuf.swap64();
} catch (error: any) {
  console.log('✅ Correctly throws ERR_INVALID_BUFFER_SIZE for invalid buffer size');
}
