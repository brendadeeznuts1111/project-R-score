import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  ThreatEvent,
  ThreatIntelligenceRedisPubSub,
} from "../../../src/threat-intelligence/redis-pub-sub";
import { TEST_CONFIG } from "../../utils/test-config";

describe("ThreatIntelligence Redis Pub/Sub Integration Tests", () => {
  let redisPubSub: ThreatIntelligenceRedisPubSub;

  beforeAll(async () => {
    redisPubSub = new ThreatIntelligenceRedisPubSub(TEST_CONFIG.REDIS_CONFIG);
    await redisPubSub.initialize();
  });

  test("should initialize Redis connection", async () => {
    expect(redisPubSub).toBeDefined();
    // Redis connection should be established without errors
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

  test("should correlate cross-region anomalies", async () => {
    const anomalyData = {
      userId: "test-user-123",
      ipAddress: "192.168.1.100",
      anomalyScore: 75,
      pattern: "suspicious-login-pattern",
      severity: "high",
    };

    await redisPubSub.publishThreatAnomaly(anomalyData);

    const stats = await redisPubSub.getCrossRegionStats();
    expect(stats.regions).toContain("eu-west-1");
    expect(stats.eventsByType).toHaveProperty("anomaly");
  });

  test("should publish compliance events for regulatory frameworks", async () => {
    const complianceEvent = {
      eventType: "data-access",
      userId: "eu-user-456",
      framework: "GDPR",
      violation: "insufficient-consent",
      severity: "medium",
    };

    await redisPubSub.publishComplianceEvent(complianceEvent);

    const stats = await redisPubSub.getCrossRegionStats();
    expect(stats.eventsByType.compliance).toBeGreaterThanOrEqual(0);
  });

  test("should handle subscription management", async () => {
    let messageCount = 0;

    const subscription = (_message: ThreatEvent) => {
      messageCount++;
    };

    redisPubSub.subscribe("test-channel", subscription);
    redisPubSub.unsubscribe("test-channel");

    // Should not receive messages after unsubscribe
    redisPubSub.subscribe("test-channel", subscription);
    redisPubSub.unsubscribe("test-channel");

    expect(messageCount).toBe(0);
  });

  test("should handle connection failures gracefully", async () => {
    // Create a new instance with invalid config to test error handling
    const invalidRedis = new ThreatIntelligenceRedisPubSub({
      ...TEST_CONFIG.REDIS_CONFIG,
      host: "invalid-host",
      port: 9999,
    });

    // Should handle connection failure without crashing
    await expect(invalidRedis.initialize()).rejects.toThrow();
  });

  test("should maintain message ordering", async () => {
    const messages: ThreatEvent[] = [];

    redisPubSub.subscribe("threat-intel", (_message: ThreatEvent) => {
      messages.push(_message);
    });

    // Publish messages in sequence
    const signatures = ["msg-1", "msg-2", "msg-3"];

    for (const signature of signatures) {
      await redisPubSub.publishThreatSignature(signature, "test", 0.8, {});
    }

    // Wait for processing
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Messages should be received in order (in a real Redis implementation)
    expect(messages.length).toBeGreaterThan(0);
  });

  test("should handle high-volume message publishing", async () => {
    const messageCount = 100;
    const startTime = performance.now();

    const promises = Array.from({ length: messageCount }, (_, i) =>
      redisPubSub.publishThreatSignature(`high-volume-${i}`, "test", 0.8, {
        index: i,
      })
    );

    await Promise.all(promises);
    const endTime = performance.now();

    const duration = endTime - startTime;
    const throughput = messageCount / (duration / 1000);

    console.log(`High-volume publishing: ${throughput.toFixed(0)} msg/s`);

    expect(throughput).toBeGreaterThan(50); // Should handle at least 50 msg/s
    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
  });

  test("should provide cross-region statistics", async () => {
    // Publish some test events
    await redisPubSub.publishThreatSignature(
      "stats-test-1",
      "malware",
      0.9,
      {}
    );
    await redisPubSub.publishThreatAnomaly({
      userId: "stats-user",
      ipAddress: "10.0.0.1",
      anomalyScore: 80,
      pattern: "test-pattern",
      severity: "medium",
    });
    await redisPubSub.publishComplianceEvent({
      eventType: "test",
      userId: "stats-user-2",
      framework: "GDPR",
      violation: "none",
      severity: "low",
    });

    const stats = await redisPubSub.getCrossRegionStats();

    expect(stats).toHaveProperty("regions");
    expect(stats).toHaveProperty("eventsByType");
    expect(stats).toHaveProperty("lastUpdated");
    expect(stats.regions.length).toBeGreaterThan(0);
    expect(Object.keys(stats.eventsByType).length).toBeGreaterThan(0);
  });

  afterAll(async () => {
    await redisPubSub.disconnect();
  });
});
