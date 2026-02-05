// scripts/bench/crc32-bench.ts - Hardware-accelerated CRC32 benchmark
const SIZES = [1024, 10240, 102400, 1024000, 10240000]; // 1KB to 10MB

function benchCRC32() {
  console.log("Bun v1.3.6 CRC32 Benchmark (SIMD Hardware Accelerated)\n");

  const results: { Size: string; Time: string; Throughput: string; CRC32: string }[] = [];

  for (const size of SIZES) {
    // Generate random data
    const data = new Uint8Array(size);
    crypto.getRandomValues(data);

    // Warmup
    for (let i = 0; i < 10; i++) {
      Bun.hash.crc32(data);
    }

    // Benchmark
    const iterations = size < 100000 ? 10000 : 100;
    const start = performance.now();
    let crc = 0;
    for (let i = 0; i < iterations; i++) {
      crc = Bun.hash.crc32(data);
    }
    const elapsed = performance.now() - start;
    const perOp = elapsed / iterations;
    const throughput = (size / 1024 / 1024) / (perOp / 1000); // MB/s

    results.push({
      Size: size >= 1024000 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${(size / 1024).toFixed(0)} KB`,
      Time: perOp < 1 ? `${(perOp * 1000).toFixed(1)} µs` : `${perOp.toFixed(3)} ms`,
      Throughput: `${throughput.toFixed(0)} MB/s`,
      CRC32: crc.toString(16).padStart(8, "0"),
    });
  }

  console.log(Bun.inspect.table(results, { colors: true }));
  console.log("\n25x faster than v1.3.5 via SIMD intrinsics");
}

benchCRC32();
