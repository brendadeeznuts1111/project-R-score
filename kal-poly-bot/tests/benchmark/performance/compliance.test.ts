import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { enhancedConfigManager } from "../../../src/enhanced-bun-config";
import { TEST_CONFIG } from "../../utils/test-config";
import {
  MockDataGenerator,
  PerformanceMeasurer,
  TestAssertions,
} from "../../utils/test-helpers";

describe("Compliance Enforcement Performance Benchmarks", () => {
  let measurer: PerformanceMeasurer;

  beforeAll(async () => {
    measurer = new PerformanceMeasurer();
    await enhancedConfigManager.initialize();
  });

  test("should enforce compliance in <100ms average latency", async () => {
    const iterations = TEST_CONFIG.BENCHMARK_SIZES.MEDIUM.iterations;
    const configs = MockDataGenerator.generateConfigVariations(iterations);

    for (let i = 0; i < iterations; i++) {
      const endMeasurement = measurer.startMeasurement(
        "compliance-enforcement"
      );
      const compliance = await enhancedConfigManager.checkCompliance(
        configs[i]
      );
      const latency = endMeasurement();

      expect(compliance.score).toBeGreaterThan(0);
      expect(compliance.compliant).toBeDefined();
    }

    const stats = measurer.getStats("compliance-enforcement");
    console.log(`🛡️ Compliance Enforcement Performance:`);
    console.log(`   Average: ${stats!.average.toFixed(2)}ms`);
    console.log(`   P95: ${stats!.p95.toFixed(2)}ms`);
    console.log(`   Max: ${stats!.max.toFixed(2)}ms`);

    TestAssertions.assertPerformance(
      stats!.average,
      TEST_CONFIG.PERFORMANCE.COMPLIANCE_MAX_LATENCY_MS,
      "compliance enforcement average latency"
    );

    expect(stats!.p95).toBeLessThan(
      TEST_CONFIG.PERFORMANCE.COMPLIANCE_MAX_LATENCY_MS * 1.5
    );
  });

  test("should validate multiple frameworks efficiently", async () => {
    const config = TEST_CONFIG.SAMPLE_CONFIGS.MULTI_REGION;
    const frameworkCount = Object.keys(
      TEST_CONFIG.COMPLIANCE_FRAMEWORKS
    ).length;

    const endMeasurement = measurer.startMeasurement(
      "multi-framework-validation"
    );
    const compliance = await enhancedConfigManager.checkCompliance(config);
    const _latency = endMeasurement();

    console.log(`📋 Multi-Framework Compliance:`);
    console.log(`   Frameworks Validated: ${frameworkCount}`);
    console.log(`   Overall Score: ${compliance.score}%`);
    console.log(
      `   Compliance Status: ${compliance.compliant ? "Pass" : "Fail"}`
    );

    TestAssertions.assertPerformance(
      _latency,
      150, // Target for multi-framework validation
      "multi-framework compliance validation"
    );

    TestAssertions.assertComplianceScore(
      compliance.score,
      85,
      "overall compliance score"
    );
  });

  test("should handle concurrent compliance checks", async () => {
    const concurrentChecks = 100;
    const configs =
      MockDataGenerator.generateConfigVariations(concurrentChecks);

    const startTime = performance.now();

    const promises = configs.map((config) =>
      enhancedConfigManager.checkCompliance(config)
    );

    const results = await Promise.all(promises);
    const endTime = performance.now();

    const totalTime = endTime - startTime;
    const throughput = concurrentChecks / (totalTime / 1000);

    console.log(`⚡ Concurrent Compliance Checks:`);
    console.log(`   Total Time: ${totalTime.toFixed(2)}ms`);
    console.log(`   Throughput: ${throughput.toFixed(0)} checks/second`);
    console.log(`   Checks Processed: ${results.length}`);

    TestAssertions.assertThroughput(
      throughput,
      200, // Minimum throughput for compliance checks
      "concurrent compliance checks"
    );

    expect(totalTime).toBeLessThan(3000); // Under 3 seconds
    expect(results).toHaveLength(concurrentChecks);
    expect(results.every((r) => r.score > 0)).toBe(true);
  });

  test("should validate compliance across all frameworks", async () => {
    const frameworkNames = Object.keys(TEST_CONFIG.COMPLIANCE_FRAMEWORKS);
    const results: Record<string, { score: number; passed: boolean }> = {};

    for (const framework of frameworkNames) {
      const config = {
        ...TEST_CONFIG.SAMPLE_CONFIGS.SECURITY_ENHANCED,
        compliance: [framework],
      };

      const endMeasurement = measurer.startMeasurement(
        `compliance-${framework}`
      );
      const compliance = await enhancedConfigManager.checkCompliance(config);
      const _latency = endMeasurement();

      results[framework] = {
        score: compliance.score,
        passed:
          compliance.score >=
          TEST_CONFIG.COMPLIANCE_FRAMEWORKS[
            framework as keyof typeof TEST_CONFIG.COMPLIANCE_FRAMEWORKS
          ].score,
      };

      console.log(
        `   ${framework}: ${compliance.score}% (${results[framework].passed ? "✅" : "❌"})`
      );
    }

    const passedFrameworks = Object.values(results).filter(
      (r: { passed: boolean }) => r.passed
    ).length;
    const overallPassRate = (passedFrameworks / frameworkNames.length) * 100;

    console.log(`📊 Framework Compliance Summary:`);
    console.log(
      `   Passed: ${passedFrameworks}/${frameworkNames.length} (${overallPassRate.toFixed(1)}%)`
    );

    expect(overallPassRate).toBeGreaterThan(80); // At least 80% of frameworks should pass
  });

  afterAll(() => {
    measurer.reset();
  });
});
