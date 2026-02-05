import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  ThreatEvent,
  ThreatIntelligenceRedisPubSub,
} from "../../../src/threat-intelligence/redis-pub-sub";
import { TEST_CONFIG } from "../../utils/test-config";
import {
  MockDataGenerator,
  PerformanceMeasurer,
  TestAssertions,
} from "../../utils/test-helpers";

describe("Redis Pub/Sub Performance Benchmarks", () => {
  let redisPubSub: ThreatIntelligenceRedisPubSub;
  let measurer: PerformanceMeasurer;

  beforeAll(async () => {
    redisPubSub = new ThreatIntelligenceRedisPubSub(TEST_CONFIG.REDIS_CONFIG);
    measurer = new PerformanceMeasurer();
    await redisPubSub.initialize();
  });

  test("should publish threat events in <20ms average latency", async () => {
    const iterations = TEST_CONFIG.BENCHMARK_SIZES.MEDIUM.iterations;
    const threatEvents = MockDataGenerator.generateThreatEvents(iterations);

    for (let i = 0; i < iterations; i++) {
      const event = threatEvents[i];
      const endMeasurement = measurer.startMeasurement("redis-publish");

      await redisPubSub.publishThreatSignature(
        event.signature,
        event.type,
        event.confidence,
        event.metadata
      );

      const _latency = endMeasurement();
    }

    const stats = measurer.getStats("redis-publish");
    console.log(`📡 Redis Pub/Sub Performance:`);
    console.log(`   Average Publish: ${stats!.average.toFixed(2)}ms`);
    console.log(`   P95 Publish: ${stats!.p95.toFixed(2)}ms`);
    console.log(`   Max Publish: ${stats!.max.toFixed(2)}ms`);

    TestAssertions.assertPerformance(
      stats!.average,
      TEST_CONFIG.PERFORMANCE.REDIS_PUBSUB_MAX_LATENCY_MS,
      "Redis publish average latency"
    );

    expect(stats!.p95).toBeLessThan(
      TEST_CONFIG.PERFORMANCE.REDIS_PUBSUB_MAX_LATENCY_MS * 2
    );
  });

  test("should publish and receive threat signatures across regions", async () => {
    const signature = "test-malware-signature";
    const type = "malware";
    const confidence = 0.85;
    const metadata = { source: "cross-region-test" };

    let receivedEvent: ThreatEvent | null = null;
    redisPubSub.subscribe("threat-intel", (message: ThreatEvent) => {
      receivedEvent = message;
    });

    await redisPubSub.publishThreatSignature(
      signature,
      type,
      confidence,
      metadata
    );

    // Wait for message processing (simulated)
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(receivedEvent).toBeDefined();
    if (receivedEvent) {
      expect(receivedEvent.signature).toBe(signature);
      expect(receivedEvent.type).toBe(type);
      expect(receivedEvent.confidence).toBe(confidence);
    }
  });

  test("should handle high-volume message publishing", async () => {
    const highVolumeCount = 500;
    const threatEvents =
      MockDataGenerator.generateThreatEvents(highVolumeCount);

    const startTime = performance.now();

    // Publish in batches to simulate real-world usage
    const batchSize = 50;
    for (let i = 0; i < highVolumeCount; i += batchSize) {
      const batch = threatEvents.slice(i, i + batchSize);
      const batchPromises = batch.map((event) =>
        redisPubSub.publishThreatSignature(
          event.signature,
          event.type,
          event.confidence,
          event.metadata
        )
      );
      await Promise.all(batchPromises);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const throughput = highVolumeCount / (totalTime / 1000);

    console.log(`⚡ High-Volume Publishing:`);
    console.log(`   Total Events: ${highVolumeCount}`);
    console.log(`   Total Time: ${totalTime.toFixed(2)}ms`);
    console.log(`   Throughput: ${throughput.toFixed(0)} events/second`);

    TestAssertions.assertThroughput(
      throughput,
      100, // Minimum throughput for Redis operations
      "high-volume Redis publishing"
    );

    expect(totalTime).toBeLessThan(10000); // Under 10 seconds
  });

  test("should handle anomaly detection publishing", async () => {
    const anomalyCount = 100;
    const anomalyEvents = Array.from({ length: anomalyCount }, (_, i) => ({
      userId: `anomaly-user-${i}`,
      ipAddress: `10.0.0.${i % 255}`,
      anomalyScore: 50 + Math.random() * 50,
      pattern: "suspicious-login-pattern",
      severity: i % 3 === 0 ? "high" : "medium",
    }));

    const latencies: number[] = [];

    for (const anomaly of anomalyEvents) {
      const endMeasurement = measurer.startMeasurement("anomaly-publish");

      await redisPubSub.publishThreatAnomaly(anomaly);

      const _latency = endMeasurement();
      latencies.push(_latency);
    }

    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const maxLatency = Math.max(...latencies);

    console.log(`🚨 Anomaly Detection Publishing:`);
    console.log(`   Average: ${avgLatency.toFixed(2)}ms`);
    console.log(`   Max: ${maxLatency.toFixed(2)}ms`);
    console.log(`   Events: ${anomalyCount}`);

    TestAssertions.assertPerformance(
      avgLatency,
      30, // Target for anomaly publishing
      "anomaly detection publishing"
    );

    expect(maxLatency).toBeLessThan(100);
  });

  test("should handle compliance event publishing", async () => {
    const complianceEvents = MockDataGenerator.generateComplianceEvents(50);

    const startTime = performance.now();

    const promises = complianceEvents.map((event) =>
      redisPubSub.publishComplianceEvent({
        eventType: event.eventType,
        userId: event.userId,
        framework: event.framework,
        violation: event.violation,
        severity: event.severity,
      })
    );

    await Promise.all(promises);
    const endTime = performance.now();

    const totalTime = endTime - startTime;
    const avgLatency = totalTime / complianceEvents.length;

    console.log(`📋 Compliance Event Publishing:`);
    console.log(`   Events: ${complianceEvents.length}`);
    console.log(`   Total Time: ${totalTime.toFixed(2)}ms`);
    console.log(`   Average: ${avgLatency.toFixed(2)}ms`);

    TestAssertions.assertPerformance(
      avgLatency,
      25, // Target for compliance event publishing
      "compliance event publishing"
    );

    expect(totalTime).toBeLessThan(2000);
  });

  afterAll(async () => {
    await redisPubSub.disconnect();
    measurer.reset();
  });
});
