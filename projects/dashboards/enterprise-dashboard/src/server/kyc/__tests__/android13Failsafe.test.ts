/**
 * Android 13 KYC Failsafe Tests
 * Unit tests for device integrity verification
 */

import { describe, test, expect, mock, beforeEach } from "bun:test";
import { Android13KYCFailsafe } from "../android13Failsafe";

// Mock spawn for ADB commands
const mockSpawn = () => ({
  exited: Promise.resolve(0),
  stdout: {
    getReader: () => ({
      read: () => Promise.resolve({ done: true }),
    }),
  },
});

describe("Android13KYCFailsafe", () => {
  let failsafe: Android13KYCFailsafe;

  beforeEach(() => {
    failsafe = new Android13KYCFailsafe();
  });

  test("device integrity verification returns expected structure", async () => {
    const result = await failsafe.verifyDeviceIntegrity("test-user");

    expect(typeof result.isGenuine).toBe("boolean");
    expect(typeof result.riskScore).toBe("number");
    expect(Array.isArray(result.signatures)).toBe(true);
    expect(Array.isArray(result.logs)).toBe(true);
    expect(result.logs.length).toBeGreaterThan(0);
  });

  test("handles different user IDs", async () => {
    const result1 = await failsafe.verifyDeviceIntegrity("user1");
    const result2 = await failsafe.verifyDeviceIntegrity("user2");

    expect(result1.logs.length).toBeGreaterThan(0);
    expect(result2.logs.length).toBeGreaterThan(0);
    // Logs should contain different trace IDs
    expect(result1.logs[0]).not.toBe(result2.logs[0]);
  });

  test("includes risk assessment in results", async () => {
    const result = await failsafe.verifyDeviceIntegrity("test-user");

    expect(result.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.signatures.length).toBeGreaterThan(0);
  });

  test("risk score is within valid range", async () => {
    const result = await failsafe.verifyDeviceIntegrity("test-user");

    expect(result.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.riskScore).toBeLessThanOrEqual(100);
  });

  test("logs contain trace ID", async () => {
    const result = await failsafe.verifyDeviceIntegrity("test-user");

    expect(result.logs.length).toBeGreaterThan(0);
    // At least one log should contain the trace ID pattern
    const hasTraceId = result.logs.some(log => 
      log.includes("kyc-device") || log.includes("test-user")
    );
    expect(hasTraceId).toBe(true);
  });

  test("handles verification errors gracefully", async () => {
    const originalSpawn = globalThis.spawn;
    globalThis.spawn = mock(() => {
      throw new Error("ADB connection failed");
    }) as any;

    const result = await failsafe.verifyDeviceIntegrity("test-user");

    // Should return non-genuine result on error
    expect(result.isGenuine).toBe(false);
    expect(result.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.riskScore).toBeLessThanOrEqual(100);
    expect(result.signatures.length).toBeGreaterThan(0);

    globalThis.spawn = originalSpawn;
  });
});