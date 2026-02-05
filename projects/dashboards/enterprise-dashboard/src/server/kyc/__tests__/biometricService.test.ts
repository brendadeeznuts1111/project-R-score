/**
 * Biometric Service Tests
 * Unit tests for biometric verification
 */

import { describe, test, expect, beforeEach, mock } from "bun:test";
import { BiometricService } from "../biometricService";

describe("BiometricService", () => {
  let biometricService: BiometricService;

  beforeEach(() => {
    biometricService = new BiometricService();
  });

  test("verifyBiometric returns result with passed flag and liveness score", async () => {
    // Mock spawn to simulate biometric verification
    const originalSpawn = globalThis.spawn;
    globalThis.spawn = mock(() => ({
      exited: Promise.resolve(0),
      stdout: new ReadableStream(),
    })) as any;

    const result = await biometricService.verifyBiometric("test-user", "test-trace");

    expect(result).toHaveProperty("passed");
    expect(result).toHaveProperty("livenessScore");
    expect(typeof result.passed).toBe("boolean");
    expect(typeof result.livenessScore).toBe("number");
    expect(result.livenessScore).toBeGreaterThanOrEqual(0);
    expect(result.livenessScore).toBeLessThanOrEqual(100);

    globalThis.spawn = originalSpawn;
  });

  test("verifyBiometric handles different user IDs", async () => {
    const originalSpawn = globalThis.spawn;
    globalThis.spawn = mock(() => ({
      exited: Promise.resolve(0),
      stdout: new ReadableStream(),
    })) as any;

    const result1 = await biometricService.verifyBiometric("user1", "trace1");
    const result2 = await biometricService.verifyBiometric("user2", "trace2");

    expect(typeof result1.passed).toBe("boolean");
    expect(typeof result2.passed).toBe("boolean");
    expect(typeof result1.livenessScore).toBe("number");
    expect(typeof result2.livenessScore).toBe("number");

    globalThis.spawn = originalSpawn;
  });

  test("verifyBiometric handles verification failures gracefully", async () => {
    const originalSpawn = globalThis.spawn;
    globalThis.spawn = mock(() => {
      throw new Error("Biometric verification failed");
    }) as any;

    const result = await biometricService.verifyBiometric("test-user", "test-trace");

    // Should return failed result, not throw
    expect(result.passed).toBe(false);
    expect(result.livenessScore).toBeGreaterThanOrEqual(0);
    expect(result.livenessScore).toBeLessThanOrEqual(100);

    globalThis.spawn = originalSpawn;
  });
});
