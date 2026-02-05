import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { enhancedConfigManager } from "../../../src/enhanced-bun-config";
import { TEST_CONFIG } from "../../utils/test-config";
import {
  MockDataGenerator,
  PerformanceMeasurer,
  TestAssertions,
} from "../../utils/test-helpers";

describe("Threat Detection Performance Benchmarks", () => {
  let measurer: PerformanceMeasurer;

  beforeAll(async () => {
    measurer = new PerformanceMeasurer();
    await enhancedConfigManager.initialize();
  });

  test("should detect threats in <50ms average latency", async () => {
    const iterations = TEST_CONFIG.BENCHMARK_SIZES.MEDIUM.iterations;
    const latencies: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const config = TEST_CONFIG.SAMPLE_CONFIGS.SECURITY_ENHANCED;
      const userContext = TEST_CONFIG.MOCK_DATA.generateUserContext(i);

      const endMeasurement = measurer.startMeasurement("threat-detection");
      const result = await enhancedConfigManager.calculateRiskScore(
        config,
        userContext.userId,
        userContext.ipAddress
      );
      const latency = endMeasurement();

      latencies.push(latency);
      expect(result.score).toBeGreaterThan(0);
    }

    const stats = measurer.getStats("threat-detection");
    console.log(`🔍 Threat Detection Performance:`);
    console.log(`   Average: ${stats!.average.toFixed(2)}ms`);
    console.log(`   P95: ${stats!.p95.toFixed(2)}ms`);
    console.log(`   Max: ${stats!.max.toFixed(2)}ms`);

    TestAssertions.assertPerformance(
      stats!.average,
      TEST_CONFIG.PERFORMANCE.THREAT_DETECTION_MAX_LATENCY_MS,
      "threat detection average latency"
    );

    expect(stats!.p95).toBeLessThan(
      TEST_CONFIG.PERFORMANCE.THREAT_DETECTION_MAX_LATENCY_MS * 1.5
    );
  });

  test("should handle 1000+ concurrent threat detections", async () => {
    const concurrentRequests =
      TEST_CONFIG.PERFORMANCE.MIN_THROUGHPUT_REQUESTS_PER_SECOND;
    const configs =
      MockDataGenerator.generateConfigVariations(concurrentRequests);
    const userContexts =
      MockDataGenerator.generateUserContexts(concurrentRequests);

    const startTime = performance.now();

    const promises = Array.from({ length: concurrentRequests }, (_, i) =>
      enhancedConfigManager.calculateRiskScore(
        configs[i],
        userContexts[i].userId,
        userContexts[i].ipAddress
      )
    );

    const results = await Promise.all(promises);
    const endTime = performance.now();

    const totalTime = endTime - startTime;
    const throughput = concurrentRequests / (totalTime / 1000);

    console.log(`⚡ Concurrent Threat Detection:`);
    console.log(`   Total Time: ${totalTime.toFixed(2)}ms`);
    console.log(`   Throughput: ${throughput.toFixed(0)} requests/second`);
    console.log(`   Requests Processed: ${results.length}`);

    TestAssertions.assertThroughput(
      throughput,
      TEST_CONFIG.PERFORMANCE.MIN_THROUGHPUT_REQUESTS_PER_SECOND,
      "concurrent threat detection"
    );

    expect(totalTime).toBeLessThan(5000); // Under 5 seconds
    expect(results).toHaveLength(concurrentRequests);
    expect(results.every((r) => r.score > 0)).toBe(true);
  });

  test("should maintain performance under load", async () => {
    const loadTestSizes = [100, 500, 1000];
    const performanceResults: Array<{
      size: number;
      avgLatency: number;
      throughput: number;
    }> = [];

    for (const size of loadTestSizes) {
      const configs = MockDataGenerator.generateConfigVariations(size);
      const userContexts = MockDataGenerator.generateUserContexts(size);

      const startTime = performance.now();

      const promises = Array.from({ length: size }, (_, i) =>
        enhancedConfigManager.calculateRiskScore(
          configs[i],
          userContexts[i].userId,
          userContexts[i].ipAddress
        )
      );

      await Promise.all(promises);
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      const avgLatency = totalTime / size;
      const throughput = size / (totalTime / 1000);

      performanceResults.push({ size, avgLatency, throughput });
    }

    console.log(`📈 Load Performance Scaling:`);
    performanceResults.forEach((result) => {
      console.log(
        `   ${result.size} requests: ${result.avgLatency.toFixed(2)}ms avg, ${result.throughput.toFixed(0)} req/s`
      );
    });

    // Verify performance doesn't degrade significantly under load
    const firstResult = performanceResults[0];
    const lastResult = performanceResults[performanceResults.length - 1];

    const latencyIncrease =
      (lastResult.avgLatency - firstResult.avgLatency) / firstResult.avgLatency;
    expect(latencyIncrease).toBeLessThan(0.5); // Less than 50% degradation
  });

  afterAll(() => {
    measurer.reset();
  });
});
