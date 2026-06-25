#!/usr/bin/env bun
import { optimizedProcessor } from "./workers/crc32-optimized";
import { simdProcessor } from "./workers/crc32-simd-batch";

async function runComparisonBenchmark() {
  console.info("🏁 CRC32 Implementation Comparison");
  console.info("=".repeat(50));

  // Generate test data
  const testSizes = [1024, 4096, 16384, 65536, 262144]; // 1KB to 256KB
  const testDatasets = testSizes.map((size) => {
    const data = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
      data[i] = (i * 1103515245 + 12345) & 0xff;
    }
    return data;
  });

  console.info(
    `\n📊 Testing ${testDatasets.length} datasets (${
      testDatasets.reduce((sum, d) => sum + d.length, 0) / 1024
    }KB total)`
  );

  // Test 1: Direct Bun.hash.crc32 (baseline)
  console.info("\n🔍 1. Direct Bun.hash.crc32:");
  const baselineStart = performance.now();
  const baselineResults = testDatasets.map((data) => Bun.hash.crc32(data));
  const baselineTime = performance.now() - baselineStart;
  console.info(`   Time: ${baselineTime.toFixed(2)}ms`);
  console.info(
    `   Throughput: ${(
      testDatasets.reduce((sum, d) => sum + d.length, 0) /
      baselineTime /
      1024
    ).toFixed(2)} KB/ms`
  );

  // Test 2: SIMD batch processor
  console.info("\n⚡ 2. SIMD batch processor:");
  const simdStart = performance.now();
  const simdResults = await simdProcessor.processBatch(testDatasets);
  const simdTime = performance.now() - simdStart;
  console.info(`   Time: ${simdTime.toFixed(2)}ms`);
  console.info(
    `   Throughput: ${(
      testDatasets.reduce((sum, d) => sum + d.length, 0) /
      simdTime /
      1024
    ).toFixed(2)} KB/ms`
  );

  // Test 3: Optimized processor
  console.info("\n🚀 3. Optimized processor:");
  const optimizedStart = performance.now();
  const optimizedResults = await optimizedProcessor.processBatch(testDatasets);
  const optimizedTime = performance.now() - optimizedStart;
  console.info(`   Time: ${optimizedTime.toFixed(2)}ms`);
  console.info(
    `   Throughput: ${(
      testDatasets.reduce((sum, d) => sum + d.length, 0) /
      optimizedTime /
      1024
    ).toFixed(2)} KB/ms`
  );

  // Test 4: Adaptive processing
  console.info("\n🎯 4. Adaptive processing:");
  const adaptiveStart = performance.now();
  const adaptiveResults = await optimizedProcessor.adaptiveProcess(
    testDatasets
  );
  const adaptiveTime = performance.now() - adaptiveStart;
  console.info(`   Time: ${adaptiveTime.toFixed(2)}ms`);
  console.info(
    `   Throughput: ${(
      testDatasets.reduce((sum, d) => sum + d.length, 0) /
      adaptiveTime /
      1024
    ).toFixed(2)} KB/ms`
  );

  // Verify results
  console.info("\n✅ Results verification:");
  const baselineCorrect = baselineResults;
  const simdCorrect = simdResults.every((crc, i) => crc === baselineCorrect[i]);
  const optimizedCorrect = optimizedResults.every(
    (crc, i) => crc === baselineCorrect[i]
  );
  const adaptiveCorrect = adaptiveResults.every(
    (crc, i) => crc === baselineCorrect[i]
  );

  console.info(`   Baseline: ✅ Reference`);
  console.info(`   SIMD: ${simdCorrect ? "✅" : "❌"} Match`);
  console.info(`   Optimized: ${optimizedCorrect ? "✅" : "❌"} Match`);
  console.info(`   Adaptive: ${adaptiveCorrect ? "✅" : "❌"} Match`);

  // Performance comparison
  console.info("\n📈 Performance comparison:");
  console.info(`   SIMD vs Baseline: ${(baselineTime / simdTime).toFixed(2)}x`);
  console.info(
    `   Optimized vs Baseline: ${(baselineTime / optimizedTime).toFixed(2)}x`
  );
  console.info(
    `   Adaptive vs Baseline: ${(baselineTime / adaptiveTime).toFixed(2)}x`
  );

  // Large dataset test
  console.info("\n🎯 Large dataset test (1000 files):");
  const largeDatasets = Array(1000)
    .fill(null)
    .map((_, i) => {
      const size = 1024 + (i % 100) * 100; // 1KB to 11KB
      const data = new Uint8Array(size);
      for (let j = 0; j < size; j++) {
        data[j] = ((i + j) * 1103515245 + 12345) & 0xff;
      }
      return data;
    });

  console.info(
    `   Total size: ${(
      largeDatasets.reduce((sum, d) => sum + d.length, 0) /
      1024 /
      1024
    ).toFixed(2)}MB`
  );

  // Test optimized processor on large dataset
  const largeStart = performance.now();
  const largeResult = await optimizedProcessor.processLargeDataset(
    largeDatasets
  );
  const largeTime = performance.now() - largeStart;

  console.info(`   Time: ${largeTime.toFixed(2)}ms`);
  console.info(
    `   Throughput: ${(
      largeResult.bytesProcessed /
      largeTime /
      1024 /
      1024
    ).toFixed(2)} MB/s`
  );
  console.info(`   Chunks: ${largeResult.chunks}`);
  console.info(
    `   Final CRC32: 0x${largeResult.hash.toString(16).padStart(8, "0")}`
  );

  // Recommendations
  console.info("\n🎯 Recommendations:");

  const fastestTime = Math.min(
    baselineTime,
    simdTime,
    optimizedTime,
    adaptiveTime
  );
  const fastestMethod =
    fastestTime === baselineTime
      ? "Direct"
      : fastestTime === simdTime
      ? "SIMD"
      : fastestTime === optimizedTime
      ? "Optimized"
      : "Adaptive";

  console.info(`   🏆 Fastest method: ${fastestMethod}`);

  if (optimizedCorrect && adaptiveCorrect) {
    console.info("   ✅ Use optimized processor for reliable performance");
  } else if (simdCorrect) {
    console.info("   ⚠️  SIMD works but verify correctness");
  } else {
    console.info("   🐌 Stick with direct Bun.hash.crc32 for correctness");
  }

  if (largeTime < 1000) {
    console.info("   🚀 Excellent performance for large datasets");
  } else if (largeTime < 5000) {
    console.info("   👍 Good performance for large datasets");
  } else {
    console.info("   🐌 Consider further optimization for large datasets");
  }
}

if (import.meta.main) {
  runComparisonBenchmark().catch(console.error);
}
