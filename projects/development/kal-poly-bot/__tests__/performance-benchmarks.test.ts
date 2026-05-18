import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { DynamicConfigManager } from "../src/config/dynamic-config-manager";
import { enhancedConfigManager } from "../src/enhanced-bun-config";
import { QuantumStandaloneBuilder } from "../src/quantum-standalone-builder";
import { ThreatIntelligenceRedisPubSub } from "../src/threat-intelligence/redis-pub-sub";

describe("Performance Benchmarks - Phase 3 Zero-Trust", () => {
  let configManager: DynamicConfigManager;
  let redisPubSub: ThreatIntelligenceRedisPubSub;
  let quantumBuilder: QuantumStandaloneBuilder;

  beforeAll(async () => {
    configManager = new DynamicConfigManager("eu-west-1");
    redisPubSub = new ThreatIntelligenceRedisPubSub({
      host: "localhost",
      port: 6379,
      channels: {
        threatIntel: "threat:intel",
        signatures: "threat:signatures",
        anomalies: "threat:anomalies",
        compliance: "threat:compliance",
      },
      region: "eu-west-1",
    });
    quantumBuilder = new QuantumStandaloneBuilder();

    await Promise.all([
      configManager.initialize(),
      redisPubSub.initialize(),
      quantumBuilder.initialize(),
    ]);
  });

  describe("Threat Detection Performance", () => {
    test("should detect threats in <50ms", async () => {
      const config = {
        test: "config",
        security: { level: "high" },
      };

      const iterations = 100;
      const latencies: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        await enhancedConfigManager.calculateRiskScore(
          config,
          `test-user-${i}`,
          `192.168.1.${i % 255}`
        );
        const endTime = performance.now();
        latencies.push(endTime - startTime);
      }

      const avgLatency =
        latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const maxLatency = Math.max(...latencies);

      console.info(`🔍 Threat Detection Performance:`);
      console.info(`   Average: ${avgLatency.toFixed(2)}ms`);
      console.info(`   Max: ${maxLatency.toFixed(2)}ms`);
      console.info(
        `   P95: ${latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)].toFixed(2)}ms`
      );

      expect(avgLatency).toBeLessThan(50);
      expect(maxLatency).toBeLessThan(100);
    });

    test("should handle 1000+ concurrent threat detections", async () => {
      const config = { test: "config" };
      const concurrentRequests = 1000;

      const startTime = performance.now();

      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        enhancedConfigManager.calculateRiskScore(
          config,
          `concurrent-user-${i}`,
          `10.0.0.${i % 255}`
        )
      );

      await Promise.all(promises);

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const throughput = concurrentRequests / (totalTime / 1000);

      console.info(`⚡ Concurrent Threat Detection:`);
      console.info(`   Total Time: ${totalTime.toFixed(2)}ms`);
      console.info(`   Throughput: ${throughput.toFixed(0)} requests/second`);

      expect(throughput).toBeGreaterThan(500); // 500+ requests/second
      expect(totalTime).toBeLessThan(5000); // Under 5 seconds
    });
  });

  describe("Compliance Enforcement Performance", () => {
    test("should enforce compliance in <100ms", async () => {
      const config = {
        serve: {
          static: { dir: "./user-data" },
        },
      };

      const iterations = 50;
      const latencies: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        await enhancedConfigManager.checkCompliance(config);
        const endTime = performance.now();
        latencies.push(endTime - startTime);
      }

      const avgLatency =
        latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const maxLatency = Math.max(...latencies);

      console.info(`🛡️ Compliance Enforcement Performance:`);
      console.info(`   Average: ${avgLatency.toFixed(2)}ms`);
      console.info(`   Max: ${maxLatency.toFixed(2)}ms`);

      expect(avgLatency).toBeLessThan(100);
      expect(maxLatency).toBeLessThan(200);
    });

    test("should validate multiple frameworks efficiently", async () => {
      const config = {
        serve: { static: { dir: "./data" } },
        install: { registry: "https://secure-registry.com" },
      };

      const startTime = performance.now();
      const compliance = await enhancedConfigManager.checkCompliance(config);
      const endTime = performance.now();

      const latency = endTime - startTime;

      console.info(`📋 Multi-Framework Compliance:`);
      console.info(`   Latency: ${latency.toFixed(2)}ms`);
      console.info(`   Overall Score: ${compliance.score}%`);
      console.info(
        `   Compliance Status: ${compliance.compliant ? "Pass" : "Fail"}`
      );

      expect(latency).toBeLessThan(150);
      expect(compliance.score).toBeGreaterThan(85);
    });
  });

  describe("Redis Pub/Sub Performance", () => {
    test("should publish threat events in <20ms", async () => {
      const iterations = 50;
      const latencies: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        await redisPubSub.publishThreatSignature(
          `test-signature-${i}`,
          "malware",
          0.85,
          { source: "benchmark-test" }
        );
        const endTime = performance.now();
        latencies.push(endTime - startTime);
      }

      const avgLatency =
        latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const maxLatency = Math.max(...latencies);

      console.info(`📡 Redis Pub/Sub Performance:`);
      console.info(`   Average Publish: ${avgLatency.toFixed(2)}ms`);
      console.info(`   Max Publish: ${maxLatency.toFixed(2)}ms`);

      expect(avgLatency).toBeLessThan(20);
      expect(maxLatency).toBeLessThan(50);
    });

    test("should handle cross-region replication efficiently", async () => {
      const startTime = performance.now();

      // Simulate cross-region threat events
      const events = Array.from({ length: 10 }, (_, i) => ({
        signature: `cross-region-${i}`,
        type: "threat",
        confidence: 0.8,
        metadata: { region: `region-${i}` },
        region: "eu-west-1",
        timestamp: new Date().toISOString(),
        source: "benchmark",
      }));

      const publishPromises = events.map((event) =>
        redisPubSub.publishThreatSignature(
          event.signature,
          event.type,
          event.confidence,
          event.metadata
        )
      );

      await Promise.all(publishPromises);

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      console.info(`🌍 Cross-Region Replication:`);
      console.info(`   Total Time: ${totalTime.toFixed(2)}ms`);
      console.info(`   Events Published: ${events.length}`);
      console.info(
        `   Avg per Event: ${(totalTime / events.length).toFixed(2)}ms`
      );

      expect(totalTime).toBeLessThan(200);
      expect(totalTime / events.length).toBeLessThan(20);
    });
  });

  describe("Quantum Builder Performance", () => {
    test("should generate SBOM in <500ms", async () => {
      const buildConfig = {
        output: "test-binary",
        target: "bun",
        quantumSigning: true,
        regions: ["eu-west-1"],
        complianceFrameworks: ["GDPR"],
      };

      const configPaths = await quantumBuilder.collectAllConfigPaths();

      const startTime = performance.now();
      const sbom = await quantumBuilder.generateSBOM(buildConfig, configPaths);
      const endTime = performance.now();

      const latency = endTime - startTime;

      console.info(`🏗️ SBOM Generation Performance:`);
      console.info(`   Latency: ${latency.toFixed(2)}ms`);
      console.info(`   Components: ${sbom.components.length}`);
      console.info(
        `   Quantum Signed: ${sbom.metadata.component?.signature ? "Yes" : "No"}`
      );

      expect(latency).toBeLessThan(500);
      expect(sbom.components.length).toBeGreaterThan(0);
      expect(sbom.metadata.component?.signature).toBeDefined();
    });

    test("should handle quantum signing efficiently", async () => {
      const _buildConfig = {
        output: "quantum-test",
        target: "bun",
        quantumSigning: true,
        regions: ["eu-west-1", "us-east-1"],
        complianceFrameworks: ["GDPR", "CCPA"],
      };

      const _configPaths = await quantumBuilder.collectAllConfigPaths();

      const startTime = performance.now();
      const stats = await quantumBuilder.getQuantumBuildStats();
      const endTime = performance.now();

      const latency = endTime - startTime;

      console.info(`🔐 Quantum Operations Performance:`);
      console.info(`   Stats Retrieval: ${latency.toFixed(2)}ms`);
      console.info(`   Quantum Ready: ${stats.quantumReadiness}`);
      console.info(`   Total Builds: ${stats.totalBuilds}`);
      console.info(`   Quantum Signed: ${stats.quantumSignedBuilds}`);

      expect(latency).toBeLessThan(50);
      expect(stats.quantumReadiness).toBe(true);
    });
  });

  describe("System Integration Performance", () => {
    test("should handle end-to-end workflow in <2s", async () => {
      const startTime = performance.now();

      // 1. Risk Assessment
      const riskScore = await enhancedConfigManager.calculateRiskScore(
        { test: "config" },
        "integration-user",
        "192.168.1.100"
      );

      // 2. Compliance Check
      const compliance = await enhancedConfigManager.checkCompliance({
        serve: { static: { dir: "./test" } },
      });

      // 3. Threat Intelligence Publishing
      await redisPubSub.publishThreatSignature(
        "integration-signature",
        "test-threat",
        0.75,
        { source: "integration-test" }
      );

      // 4. SBOM Generation
      const buildConfig = {
        output: "integration-binary",
        target: "bun",
        quantumSigning: true,
        regions: ["eu-west-1"],
        complianceFrameworks: ["GDPR"],
      };
      const configPaths = await quantumBuilder.collectAllConfigPaths();
      const sbom = await quantumBuilder.generateSBOM(buildConfig, configPaths);

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      console.info(`🔄 End-to-End Integration Performance:`);
      console.info(`   Total Time: ${totalTime.toFixed(2)}ms`);
      console.info(`   Risk Score: ${riskScore.score} (${riskScore.level})`);
      console.info(
        `   Compliance: ${compliance.score}% (${compliance.compliant ? "Pass" : "Fail"})`
      );
      console.info(`   SBOM Components: ${sbom.components.length}`);

      expect(totalTime).toBeLessThan(2000);
      expect(riskScore.score).toBeGreaterThan(0);
      expect(compliance.score).toBeGreaterThan(0);
      expect(sbom.components.length).toBeGreaterThan(0);
    });
  });

  afterAll(async () => {
    await redisPubSub.disconnect();
  });
});
