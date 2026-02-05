#!/usr/bin/env bun
/**
 * Benchmark Buffer swap methods
 */

const benchmarkBuf = Buffer.alloc(64 * 1024); // 64 KiB

// Benchmark swap16
console.time('swap16()');
for (let i = 0; i < 10000; i++) {
  benchmarkBuf.swap16();
}
console.timeEnd('swap16()');

// Benchmark swap64
console.time('swap64()');
for (let i = 0; i < 10000; i++) {
  benchmarkBuf.swap64();
}
console.timeEnd('swap64()');

// Show operations per second
const iterations = 100000;
const start = performance.now();

for (let i = 0; i < iterations; i++) {
  benchmarkBuf.swap64();
}

const end = performance.now();
const opsPerSec = (iterations / (end - start)) * 1000;

console.log(`\nswap64() performance: ${opsPerSec.toLocaleString()} ops/sec`);
