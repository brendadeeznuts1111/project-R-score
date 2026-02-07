// lib/core/hash-benchmark.ts — Bun.hash benchmark suite with before/after comparison
//
// Run: bun run lib/core/hash-benchmark.ts
// Uses Bun.bench when available, falls back to manual timing

const SIZES = [
  { label: '1 KB', bytes: 1024 },
  { label: '64 KB', bytes: 64 * 1024 },
  { label: '256 KB', bytes: 256 * 1024 },
  { label: '1 MB', bytes: 1024 * 1024 },
  { label: '4 MB', bytes: 4 * 1024 * 1024 },
];

// Pre-1.3.9 baseline (software CRC32, no SIMD)
const OLD_CRC32_US_PER_MB = 2644;

const ALGOS = ['crc32', 'adler32', 'wyhash', 'cityHash32', 'cityHash64', 'murmur32v3', 'murmur64v2'] as const;
type Algo = (typeof ALGOS)[number];

interface Result {
  algo: string;
  size: string;
  usPerOp: number;
  usPerMB: number;
  mbPerSec: number;
  speedup?: string;
}

function benchAlgo(algo: Algo, buf: Uint8Array, iterations: number): number {
  const fn = Bun.hash[algo] as (data: Uint8Array) => number | bigint;
  // warmup
  for (let i = 0; i < 10; i++) fn(buf);

  const start = Bun.nanoseconds();
  for (let i = 0; i < iterations; i++) fn(buf);
  return (Bun.nanoseconds() - start) / 1000 / iterations; // µs per op
}

function run() {
  console.log(`Bun.hash Benchmark — Bun ${Bun.version} (${process.arch})\n`);

  const results: Result[] = [];

  for (const { label, bytes } of SIZES) {
    const buf = new Uint8Array(bytes);
    crypto.getRandomValues(buf);
    const iterations = bytes <= 65536 ? 50_000 : bytes <= 262144 ? 10_000 : 2_000;

    for (const algo of ALGOS) {
      const usPerOp = benchAlgo(algo, buf, iterations);
      const mb = bytes / 1048576;
      const usPerMB = usPerOp / mb;
      const mbPerSec = 1_000_000 / usPerMB;

      const row: Result = {
        algo,
        size: label,
        usPerOp: Math.round(usPerOp * 100) / 100,
        usPerMB: Math.round(usPerMB),
        mbPerSec: Math.round(mbPerSec),
      };

      // CRC32 before/after comparison
      if (algo === 'crc32') {
        row.speedup = `${(OLD_CRC32_US_PER_MB / usPerMB).toFixed(1)}x`;
      }

      results.push(row);
    }
  }

  // Print CRC32 comparison table
  console.log('── CRC32 Before / After (hardware-accelerated via zlib) ──\n');
  console.log(
    'Size'.padEnd(10),
    'Before'.padStart(12),
    'After'.padStart(12),
    'Speedup'.padStart(10),
    'Throughput'.padStart(12),
  );
  console.log('─'.repeat(58));

  for (const r of results.filter((r) => r.algo === 'crc32')) {
    const beforeUs = Math.round(OLD_CRC32_US_PER_MB * (SIZES.find((s) => s.label === r.size)!.bytes / 1048576));
    console.log(
      r.size.padEnd(10),
      `${beforeUs} µs`.padStart(12),
      `${r.usPerOp} µs`.padStart(12),
      (r.speedup ?? '').padStart(10),
      `${r.mbPerSec} MB/s`.padStart(12),
    );
  }

  // Print all algorithms comparison
  console.log('\n── All Hash Algorithms ──\n');
  console.log(
    'Algorithm'.padEnd(14),
    'Size'.padEnd(8),
    'µs/op'.padStart(10),
    'µs/MB'.padStart(10),
    'MB/s'.padStart(10),
  );
  console.log('─'.repeat(54));

  for (const r of results) {
    console.log(
      r.algo.padEnd(14),
      r.size.padEnd(8),
      r.usPerOp.toString().padStart(10),
      r.usPerMB.toString().padStart(10),
      r.mbPerSec.toString().padStart(10),
    );
  }
}

run();
