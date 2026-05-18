#!/usr/bin/env bun
import { hardwareDetector } from "./utils/hardware-detector";
import { batchCRC32, simdProcessor } from "./workers/crc32-simd-batch";

async function runSIMDBenchmark() {
  console.info("🚀 Enhanced CRC32 Architecture v2.0 - SIMD Benchmark");
  console.info("=".repeat(60));

  // Detect hardware capabilities
  console.info("\n🔧 Detecting hardware capabilities...");
  const capabilities = await hardwareDetector.detectCapabilities();
  console.info(hardwareDetector.generateReport(capabilities));

  // Run hardware benchmark
  console.info("\n📊 Running hardware benchmark...");
  const benchmark = await hardwareDetector.benchmark();
  console.info(`Throughput: ${benchmark.throughput} MB/s`);
  console.info(`Latency: ${benchmark.latency} ms`);
  console.info(`Efficiency: ${benchmark.efficiency} MB/s per core`);

  // Test SIMD batch processing
  console.info("\n🧪 Testing SIMD batch processing...");
  const metrics = simdProcessor.getMetrics();
  console.info(`Vector size: ${metrics.vectorSize}`);
  console.info(`Batch size: ${metrics.batchSize}`);
  console.info(`Throughput estimate: ${metrics.throughputEstimate}`);

  // Generate test data
  const testSizes = [1024, 16384, 65536, 262144, 1048576]; // 1KB to 1MB
  const testDatasets = testSizes.map((size) => {
    const data = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
      data[i] = (i * 1103515245 + 12345) & 0xff;
    }
    return data;
  });

  console.info("\n📈 Processing test datasets...");

  // Individual CRC32 (baseline)
  console.info("\n🔍 Baseline (individual CRC32):");
  const baselineStart = performance.now();
  const baselineResults = testDatasets.map((data) => Bun.hash.crc32(data));
  const baselineTime = performance.now() - baselineStart;
  console.info(`Time: ${baselineTime.toFixed(2)}ms`);
  console.info(
    `Throughput: ${(
      testDatasets.reduce((sum, d) => sum + d.length, 0) /
      baselineTime /
      1024
    ).toFixed(2)} KB/ms`
  );

  // SIMD batch processing
  console.info("\n⚡ SIMD batch processing:");
  const simdStart = performance.now();
  const simdResults = await batchCRC32(testDatasets);
  const simdTime = performance.now() - simdStart;
  console.info(`Time: ${simdTime.toFixed(2)}ms`);
  console.info(
    `Throughput: ${(
      testDatasets.reduce((sum, d) => sum + d.length, 0) /
      simdTime /
      1024
    ).toFixed(2)} KB/ms`
  );

  // Verify results
  const resultsMatch = baselineResults.every(
    (crc, i) => crc === simdResults[i]
  );
  console.info(`✅ Results match: ${resultsMatch ? "YES" : "NO"}`);

  // Performance improvement
  const improvement = baselineTime / simdTime;
  console.info(`🚀 Performance improvement: ${improvement.toFixed(2)}x`);

  // Large dataset test
  console.info("\n🎯 Large dataset test (100 files):");
  const largeDatasets = Array(100)
    .fill(null)
    .map((_, i) => {
      const size = 1024 + (i % 10) * 1024; // 1KB to 10KB
      const data = new Uint8Array(size);
      for (let j = 0; j < size; j++) {
        data[j] = ((i + j) * 1103515245 + 12345) & 0xff;
      }
      return data;
    });

  const largeStart = performance.now();
  const largeResult = await simdProcessor.processLargeDataset(largeDatasets);
  const largeTime = performance.now() - largeStart;

  console.info(`Files processed: ${largeDatasets.length}`);
  console.info(
    `Total bytes: ${(largeResult.bytesProcessed / 1024).toFixed(2)} KB`
  );
  console.info(`Time: ${largeTime.toFixed(2)}ms`);
  console.info(
    `Throughput: ${(largeResult.bytesProcessed / largeTime / 1024).toFixed(
      2
    )} KB/ms`
  );
  console.info(`Chunks: ${largeResult.chunks}`);
  console.info(
    `Final CRC32: 0x${largeResult.hash.toString(16).padStart(8, "0")}`
  );

  console.info("\n✅ SIMD benchmark complete!");
  console.info("\n🎯 Recommendations:");

  if (capabilities.simd && capabilities.crc32) {
    console.info("  🚀 Use SIMD batch processing for maximum performance");
  } else if (capabilities.crc32) {
    console.info("  ⚡ Hardware CRC32 available - good performance");
  } else {
    console.info("  🐌 Software CRC32 only - consider hardware upgrade");
  }

  if (largeTime < 100) {
    console.info("  ⚡ Excellent performance for large datasets");
  } else if (largeTime < 500) {
    console.info("  👍 Good performance for large datasets");
  } else {
    console.info("  🐌 Consider optimization for large datasets");
  }
}

if (import.meta.main) {
  runSIMDBenchmark().catch(console.error);
}
