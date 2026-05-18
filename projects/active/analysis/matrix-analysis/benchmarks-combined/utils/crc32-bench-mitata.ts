/**
 * CRC32 Benchmark using Mitata
 * Hardware-accelerated CRC32 performance (20x faster in Bun 1.3.6+)
 * 
 * Based on Bun's benchmark structure: https://github.com/oven-sh/bun/tree/main/bench
 */

import { bench, group, run } from "./utils";

const SIZES = [1024, 10240, 102400, 1024000, 10240000]; // 1KB to 10MB

group("Bun.hash.crc32 (Hardware Accelerated - 20x faster)", () => {
  for (const size of SIZES) {
    const data = new Uint8Array(size);
    crypto.getRandomValues(data);
    
    const sizeLabel = size >= 1024000 
      ? `${(size / 1024 / 1024).toFixed(1)} MB` 
      : `${(size / 1024).toFixed(0)} KB`;
    
    bench(`CRC32 (${sizeLabel})`, () => {
      Bun.hash.crc32(data);
    });
  }
});

await run();
