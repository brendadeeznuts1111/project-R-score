#!/usr/bin/env bun
// hardware-benchmark.ts — Hardware acceleration check (CRC32 throughput)

export {};

const buffer = new Uint8Array(1 << 20); // 1MB buffer
const iterations = 100;

const startTime = performance.now();

for (let i = 0; i < iterations; i++) {
	Bun.hash.crc32(buffer);
}

const endTime = performance.now();
const duration = endTime - startTime;
const throughput = ((iterations / duration) * 1000).toFixed(0);

console.info(`🚀 Hardware-accelerated CRC32 throughput: ${throughput} MB/s`);
console.info(`⏱️  Duration: ${duration.toFixed(2)}ms for ${iterations} iterations`);
console.info(`📊 Buffer size: ${buffer.length} bytes`);
