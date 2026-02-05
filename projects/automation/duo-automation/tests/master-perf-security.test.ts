import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { MasterPerfTracker } from "../src/storage/r2-apple-manager.ts";

describe("MasterPerf Security & Validation", () => {
  let tracker: MasterPerfTracker;

  beforeEach(() => {
    process.env.DASHBOARD_SCOPE = "ENTERPRISE";
    tracker = new MasterPerfTracker();
  });

  afterEach(() => {
    tracker.clearMetrics();
    delete process.env.DASHBOARD_SCOPE;
  });

  test("✅ metrics cannot leak cross-scope data", async () => {
    process.env.DASHBOARD_SCOPE = "ENTERPRISE";
    tracker = new MasterPerfTracker();
    
    await expect(
      tracker.addPerformanceMetric({
        category: "SECURITY",
        type: "firewall",
        topic: "Rule enforcement",
        value: 95,
        properties: { scope: "DEVELOPMENT" }, // Wrong scope
        locations: 1,
        impact: "high",
        agentId: "agent-123"
      } as any)
    ).rejects.toThrow("Metric scope mismatch");
  });

  test("✅ properties are sanitized", async () => {
    const id = await tracker.addPerformanceMetric({
      category: "SECURITY",
      type: "injection_test",
      topic: "Test",
      value: 100,
      properties: {
        malicious: "test\r\n<script>alert('xss')</script>",
        path: "../../../etc/passwd",
        normal: "safe value"
      },
      locations: 1,
      impact: "medium",
      agentId: "agent-123"
    } as any);

    const metrics = tracker.getMetrics();
    const metric = metrics.find(m => m.id === id);
    
    expect(metric).toBeDefined();
    expect(metric!.properties.malicious).not.toContain("<script>");
    expect(metric!.properties.path).not.toContain("..");
    expect(metric!.properties.normal).toBe("safe value");
  });

  test("✅ rate limiting works per scope", async () => {
    process.env.DASHBOARD_SCOPE = "DEVELOPMENT";
    tracker = new MasterPerfTracker();
    
    // Add 100 metrics (should work)
    for (let i = 0; i < 100; i++) {
      await tracker.addPerformanceMetric({
        category: "DEBUG",
        type: "test",
        topic: `Test ${i}`,
        value: i,
        properties: {},
        locations: 1,
        impact: "low"
      } as any);
    }
    
    // 101st should fail
    await expect(
      tracker.addPerformanceMetric({
        category: "DEBUG",
        type: "test",
        topic: "Test 101",
        value: 101,
        properties: {},
        locations: 1,
        impact: "low"
      } as any)
    ).rejects.toThrow("Rate limit exceeded");
  });

  test("✅ category validation by scope", async () => {
    process.env.DASHBOARD_SCOPE = "ENTERPRISE";
    tracker = new MasterPerfTracker();
    
    // Should work
    await expect(tracker.addPerformanceMetric({
      category: "SECURITY",
      type: "test",
      topic: "Test",
      value: 100,
      properties: {},
      locations: 1,
      impact: "high",
      agentId: "agent-123"
    } as any)).resolves.toBeDefined();
    
    // Should fail (DEBUG not allowed in ENTERPRISE)
    await expect(
      tracker.addPerformanceMetric({
        category: "DEBUG",
        type: "test",
        topic: "Test",
        value: 100,
        properties: {},
        locations: 1,
        impact: "low"
      } as any)
    ).rejects.toThrow("Category DEBUG not allowed in scope ENTERPRISE");
  });

  test("✅ agent ID required for ENTERPRISE scope", async () => {
    process.env.DASHBOARD_SCOPE = "ENTERPRISE";
    tracker = new MasterPerfTracker();
    
    await expect(
      tracker.addPerformanceMetric({
        category: "SECURITY",
        type: "test",
        topic: "Test",
        value: 100,
        properties: {},
        locations: 1,
        impact: "high"
        // Missing agentId
      } as any)
    ).rejects.toThrow("Agent ID required for scope ENTERPRISE");
    
    // Should work with agentId
    await expect(tracker.addPerformanceMetric({
      category: "SECURITY",
      type: "test",
      topic: "Test",
      value: 100,
      properties: {},
      locations: 1,
      impact: "high",
      agentId: "agent-123"
    } as any)).resolves.toBeDefined();
  });
});
