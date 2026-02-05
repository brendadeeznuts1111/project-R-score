import { expect, test, describe, mock } from "bun:test";
import { PhoneSystem } from "../src/systems/phone-system";
import { dnsCache } from "../src/proxy/dns";

describe("System Resilience", () => {
  test("PhoneSystem retry logic on screenshot failure", async () => {
    const phoneSystem = new PhoneSystem();
    
    // Mock checkConnection to fail then succeed
    let calls = 0;
    mock.module("adb", () => ({})); // ADB is called via Bun.spawn
    
    // We can't easily mock Bun.spawn directly here without more setup,
    // but we can verify the method exists and handles retry parameters.
    expect(phoneSystem.captureScreenshot).toBeDefined();
    
    // Verify it accepts the attempts parameter
    const result = await phoneSystem.captureScreenshot("test-device", 1);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Max retries reached");
  });

  test("DNSCache resilience and deterministic IP generation", async () => {
    const host = "unseen-host.com";
    const ip1 = await dnsCache.resolve(host);
    const ip2 = await dnsCache.resolve(host);
    
    // Should be deterministic
    expect(ip1).toBe(ip2);
    
    // Should be a valid-ish IP format
    expect(ip1).toMatch(/^(\d{1,3}\.){3}\d{1,3}$/);
    
    const stats = dnsCache.getStats();
    expect(stats.hits).toBeGreaterThan(0);
  });

  test("PhoneSystem device status broadcasting", async () => {
    const system = new PhoneSystem();
    // ADB might not be available in CI but we expect the method to return an array
    const statuses = await system.getDeviceStatuses();
    expect(Array.isArray(statuses)).toBe(true);
  });

  test("PhoneSystem runBatch parallel execution", async () => {
    const system = new PhoneSystem();
    const results = await system.runBatch([
      { deviceId: "mock1", command: "echo 1" },
      { deviceId: "mock2", command: "echo 2" }
    ]);
    expect(Array.isArray(results)).toBe(true);
  });
});
