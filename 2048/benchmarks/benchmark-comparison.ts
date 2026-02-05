#!/usr/bin/env bun
import { optimizedProcessor } from "./workers/crc32-optimized";
import { simdProcessor } from "./workers/crc32-simd-batch";

async function runComparisonBenchmark() {
  console.log("🏁 CRC32 Implementation Comparison");
  console.log("=".repeat(50));

  // Generate test data
  const testSizes = [1024, 4096, 16384, 65536, 262144]; // 1KB to 256KB
  const testDatasets = testSizes.map((size) => {
    const data = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
      data[i] = (i * 1103515245 + 12345) & 0xff;
    }
    return data;
  });

  console.log(
    `\n📊 Testing ${testDatasets.length} datasets (${
      testDatasets.reduce((sum, d) => sum + d.length, 0) / 1024
    }KB total)`
  );

  // Test 1: Direct Bun.hash.crc32 (baseline)
  console.log("\n🔍 1. Direct Bun.hash.crc32:");
  const baselineStart = performance.now();
  const baselineResults = testDatasets.map((data) => Bun.hash.crc32(data));
  const baselineTime = performance.now() - baselineStart;
  console.log(`   Time: ${baselineTime.toFixed(2)}ms`);
  console.log(
    `   Throughput: ${(
      testDatasets.reduce((sum, d) => sum + d.length, 0) /
      baselineTime /
      1024
    ).toFixed(2)} KB/ms`
  );

  // Test 2: SIMD batch processor
  console.log("\n⚡ 2. SIMD batch processor:");
  const simdStart = performance.now();
  const simdResults = await simdProcessor.processBatch(testDatasets);
  const simdTime = performance.now() - simdStart;
  console.log(`   Time: ${simdTime.toFixed(2)}ms`);
  console.log(
    `   Throughput: ${(
      testDatasets.reduce((sum, d) => sum + d.length, 0) /
      simdTime /
      1024
    ).toFixed(2)} KB/ms`
  );

  // Test 3: Optimized processor
  console.log("\n🚀 3. Optimized processor:");
  const optimizedStart = performance.now();
  const optimizedResults = await optimizedProcessor.processBatch(testDatasets);
  const optimizedTime = performance.now() - optimizedStart;
  console.log(`   Time: ${optimizedTime.toFixed(2)}ms`);
  console.log(
    `   Throughput: ${(
      testDatasets.reduce((sum, d) => sum + d.length, 0) /
      optimizedTime /
      1024
    ).toFixed(2)} KB/ms`
  );

  // Test 4: Adaptive processing
  console.log("\n🎯 4. Adaptive processing:");
  const adaptiveStart = performance.now();
  const adaptiveResults = await optimizedProcessor.adaptiveProcess(
    testDatasets
  );
  const adaptiveTime = performance.now() - adaptiveStart;
  console.log(`   Time: ${adaptiveTime.toFixed(2)}ms`);
  console.log(
    `   Throughput: ${(
      testDatasets.reduce((sum, d) => sum + d.length, 0) /
      adaptiveTime /
      1024
    ).toFixed(2)} KB/ms`
  );

  // Verify results
  console.log("\n✅ Results verification:");
  const baselineCorrect = baselineResults;
  const simdCorrect = simdResults.every((crc, i) => crc === baselineCorrect[i]);
  const optimizedCorrect = optimizedResults.every(
    (crc, i) => crc === baselineCorrect[i]
  );
  const adaptiveCorrect = adaptiveResults.every(
    (crc, i) => crc === baselineCorrect[i]
  );

  console.log(`   Baseline: ✅ Reference`);
  console.log(`   SIMD: ${simdCorrect ? "✅" : "❌"} Match`);
  console.log(`   Optimized: ${optimizedCorrect ? "✅" : "❌"} Match`);
  console.log(`   Adaptive: ${adaptiveCorrect ? "✅" : "❌"} Match`);

  // Performance comparison
  console.log("\n📈 Performance comparison:");
  console.log(`   SIMD vs Baseline: ${(baselineTime / simdTime).toFixed(2)}x`);
  console.log(
    `   Optimized vs Baseline: ${(baselineTime / optimizedTime).toFixed(2)}x`
  );
  console.log(
    `   Adaptive vs Baseline: ${(baselineTime / adaptiveTime).toFixed(2)}x`
  );

  // Large dataset test
  console.log("\n🎯 Large dataset test (1000 files):");
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

  console.log(
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

  console.log(`   Time: ${largeTime.toFixed(2)}ms`);
  console.log(
    `   Throughput: ${(
      largeResult.bytesProcessed /
      largeTime /
      1024 /
      1024
    ).toFixed(2)} MB/s`
  );
  console.log(`   Chunks: ${largeResult.chunks}`);
  console.log(
    `   Final CRC32: 0x${largeResult.hash.toString(16).padStart(8, "0")}`
  );

  // Recommendations
  console.log("\n🎯 Recommendations:");

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

  console.log(`   🏆 Fastest method: ${fastestMethod}`);

  if (optimizedCorrect && adaptiveCorrect) {
    console.log("   ✅ Use optimized processor for reliable performance");
  } else if (simdCorrect) {
    console.log("   ⚠️  SIMD works but verify correctness");
  } else {
    console.log("   🐌 Stick with direct Bun.hash.crc32 for correctness");
  }

  if (largeTime < 1000) {
    console.log("   🚀 Excellent performance for large datasets");
  } else if (largeTime < 5000) {
    console.log("   👍 Good performance for large datasets");
  } else {
    console.log("   🐌 Consider further optimization for large datasets");
  }
}

if (import.meta.main) {
  runComparisonBenchmark().catch(console.error);
}
