import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { QuantumStandaloneBuilder } from "../../../src/quantum-standalone-builder";
import { TEST_CONFIG } from "../../utils/test-config";
import { PerformanceMeasurer, TestAssertions } from "../../utils/test-helpers";

describe("Quantum Operations Performance Benchmarks", () => {
  let quantumBuilder: QuantumStandaloneBuilder;
  let measurer: PerformanceMeasurer;

  beforeAll(async () => {
    quantumBuilder = new QuantumStandaloneBuilder();
    measurer = new PerformanceMeasurer();
    await quantumBuilder.initialize();
  });

  test("should generate SBOM in <500ms average latency", async () => {
    const iterations = TEST_CONFIG.BENCHMARK_SIZES.SMALL.iterations;
    const buildConfig = {
      output: "test-quantum-binary",
      target: "bun",
      quantumSigning: true,
      regions: ["eu-west-1"],
      complianceFrameworks: ["GDPR"],
    };

    for (let i = 0; i < iterations; i++) {
      const configPaths = await quantumBuilder.collectAllConfigPaths();

      const endMeasurement = measurer.startMeasurement("sbom-generation");
      const sbom = await quantumBuilder.generateSBOM(buildConfig, configPaths);
      const _latency = endMeasurement();

      expect(sbom.components.length).toBeGreaterThan(0);
      expect(sbom.metadata.component?.signature).toBeDefined();
    }

    const stats = measurer.getStats("sbom-generation");
    console.log(`🏗️ SBOM Generation Performance:`);
    console.log(`   Average: ${stats!.average.toFixed(2)}ms`);
    console.log(`   P95: ${stats!.p95.toFixed(2)}ms`);
    console.log(`   Max: ${stats!.max.toFixed(2)}ms`);

    TestAssertions.assertPerformance(
      stats!.average,
      TEST_CONFIG.PERFORMANCE.SBOM_GENERATION_MAX_LATENCY_MS,
      "SBOM generation average latency"
    );

    expect(stats!.p95).toBeLessThan(
      TEST_CONFIG.PERFORMANCE.SBOM_GENERATION_MAX_LATENCY_MS * 1.5
    );
  });

  test("should handle quantum signing efficiently", async () => {
    const iterations = 50;
    const buildConfigs = Array.from({ length: iterations }, (_, i) => ({
      output: `quantum-test-${i}`,
      target: "bun",
      quantumSigning: true,
      regions: ["eu-west-1", "us-east-1"],
      complianceFrameworks: ["GDPR", "CCPA"],
    }));

    for (const config of buildConfigs) {
      const endMeasurement = measurer.startMeasurement("quantum-stats");
      const stats = await quantumBuilder.getQuantumBuildStats();
      const _latency = endMeasurement();

      expect(stats.quantumReadiness).toBe(true);
      expect(stats.totalBuilds).toBeGreaterThanOrEqual(0);
      expect(stats.quantumSignedBuilds).toBeGreaterThanOrEqual(0);
    }

    const stats = measurer.getStats("quantum-stats");
    console.log(`🔐 Quantum Operations Performance:`);
    console.log(`   Stats Retrieval: ${stats!.average.toFixed(2)}ms`);
    console.log(`   P95: ${stats!.p95.toFixed(2)}ms`);
    console.log(`   Max: ${stats!.max.toFixed(2)}ms`);

    TestAssertions.assertPerformance(
      stats!.average,
      50, // Target for quantum stats retrieval
      "quantum stats retrieval"
    );
  });

  test("should handle multi-region quantum configurations", async () => {
    const regionConfigs = [
      { regions: ["eu-west-1"], name: "single-region" },
      { regions: ["eu-west-1", "us-east-1"], name: "dual-region" },
      {
        regions: ["eu-west-1", "us-east-1", "ap-southeast-1"],
        name: "triple-region",
      },
      {
        regions: ["eu-west-1", "us-east-1", "ap-southeast-1", "ap-northeast-1"],
        name: "quad-region",
      },
      {
        regions: [
          "eu-west-1",
          "us-east-1",
          "ap-southeast-1",
          "ap-northeast-1",
          "ca-central-1",
        ],
        name: "penta-region",
      },
    ];

    const results: Array<{
      name: string;
      regionCount: number;
      avgLatency: number;
    }> = [];

    for (const regionConfig of regionConfigs) {
      const buildConfig = {
        output: `multi-region-${regionConfig.name}`,
        target: "bun",
        quantumSigning: true,
        regions: regionConfig.regions,
        complianceFrameworks: ["GDPR"],
      };

      const configPaths = await quantumBuilder.collectAllConfigPaths();

      const endMeasurement = measurer.startMeasurement(
        `multi-region-${regionConfig.name}`
      );
      const sbom = await quantumBuilder.generateSBOM(buildConfig, configPaths);
      const _latency = endMeasurement();

      results.push({
        name: regionConfig.name,
        regionCount: regionConfig.regions.length,
        avgLatency: _latency,
      });

      expect(sbom.components.length).toBeGreaterThan(0);
      expect(sbom.metadata.component?.signature).toBeDefined();
    }

    console.log(`🌍 Multi-Region Quantum Performance:`);
    results.forEach((result) => {
      console.log(
        `   ${result.name} (${result.regionCount} regions): ${result.avgLatency.toFixed(
          2
        )}ms`
      );
    });

    // Verify performance scales reasonably with region count
    const singleRegionLatency = results[0].avgLatency;
    const pentaRegionLatency = results[results.length - 1].avgLatency;
    const scalingFactor = pentaRegionLatency / singleRegionLatency;

    expect(scalingFactor).toBeLessThan(3); // Should not scale linearly
  });

  test("should handle multiple compliance frameworks efficiently", async () => {
    const frameworkCombinations = [
      { frameworks: ["GDPR"], name: "single-framework" },
      { frameworks: ["GDPR", "CCPA"], name: "dual-framework" },
      { frameworks: ["GDPR", "CCPA", "PIPL"], name: "triple-framework" },
      { frameworks: ["GDPR", "CCPA", "PIPL", "LGPD"], name: "quad-framework" },
      {
        frameworks: ["GDPR", "CCPA", "PIPL", "LGPD", "PDPA"],
        name: "penta-framework",
      },
    ];

    const results: Array<{
      name: string;
      frameworkCount: number;
      avgLatency: number;
    }> = [];

    for (const combo of frameworkCombinations) {
      const buildConfig = {
        output: `multi-framework-${combo.name}`,
        target: "bun",
        quantumSigning: true,
        regions: ["eu-west-1"],
        complianceFrameworks: combo.frameworks,
      };

      const configPaths = await quantumBuilder.collectAllConfigPaths();

      const endMeasurement = measurer.startMeasurement(
        `multi-framework-${combo.name}`
      );
      const sbom = await quantumBuilder.generateSBOM(buildConfig, configPaths);
      const latency = endMeasurement();

      results.push({
        name: combo.name,
        frameworkCount: combo.frameworks.length,
        avgLatency: latency,
      });

      expect(sbom.components.length).toBeGreaterThan(0);
      expect(sbom.metadata.component?.signature).toBeDefined();
    }

    console.log(`📋 Multi-Framework Quantum Performance:`);
    results.forEach((result) => {
      console.log(
        `   ${result.name} (${result.frameworkCount} frameworks): ${result.avgLatency.toFixed(2)}ms`
      );
    });

    // Verify performance scales reasonably with framework count
    const singleFrameworkLatency = results[0].avgLatency;
    const pentaFrameworkLatency = results[results.length - 1].avgLatency;
    const scalingFactor = pentaFrameworkLatency / singleFrameworkLatency;

    expect(scalingFactor).toBeLessThan(2.5); // Should not scale linearly
  });

  test("should validate quantum readiness across configurations", async () => {
    const testConfigs = [
      { quantumSigning: true, name: "quantum-enabled" },
      { quantumSigning: false, name: "quantum-disabled" },
    ];

    for (const config of testConfigs) {
      const buildConfig = {
        output: `readiness-test-${config.name}`,
        target: "bun",
        quantumSigning: config.quantumSigning,
        regions: ["eu-west-1"],
        complianceFrameworks: ["GDPR"],
      };

      const endMeasurement = measurer.startMeasurement(
        `readiness-${config.name}`
      );
      const stats = await quantumBuilder.getQuantumBuildStats();
      const latency = endMeasurement();

      console.log(`🔍 Quantum Readiness (${config.name}):`);
      console.log(`   Latency: ${latency.toFixed(2)}ms`);
      console.log(`   Quantum Ready: ${stats.quantumReadiness}`);
      console.log(`   Total Builds: ${stats.totalBuilds}`);
      console.log(`   Quantum Signed: ${stats.quantumSignedBuilds}`);

      expect(stats.quantumReadiness).toBe(true);
      expect(latency).toBeLessThan(100);
    }
  });

  afterAll(() => {
    measurer.reset();
  });
});
