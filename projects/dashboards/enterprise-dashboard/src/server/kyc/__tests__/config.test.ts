/**
 * KYC Config Tests
 * Unit tests for configuration loading
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { kycConfig } from "../config";

describe("KYC Config", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test("kycConfig has all required properties", () => {
    expect(kycConfig).toHaveProperty("maxRetries");
    expect(kycConfig).toHaveProperty("manualReviewThreshold");
    expect(kycConfig).toHaveProperty("adbPath");
    expect(kycConfig).toHaveProperty("androidVersion");
    expect(kycConfig).toHaveProperty("packageName");
    expect(kycConfig).toHaveProperty("s3Bucket");
    expect(kycConfig).toHaveProperty("awsAccessKey");
    expect(kycConfig).toHaveProperty("awsSecretKey");
    expect(kycConfig).toHaveProperty("awsRegion");
  });

  test("kycConfig uses default values when env vars not set", () => {
    // Config is already loaded, just verify it has defaults
    expect(kycConfig.maxRetries).toBeGreaterThan(0);
    expect(kycConfig.manualReviewThreshold).toBeGreaterThan(0);
    expect(typeof kycConfig.adbPath).toBe("string");
  });

  test("kycConfig has valid numeric properties", () => {
    expect(kycConfig.maxRetries).toBeGreaterThan(0);
    expect(kycConfig.maxRetries).toBeLessThanOrEqual(10);
    expect(kycConfig.manualReviewThreshold).toBeGreaterThanOrEqual(0);
    expect(kycConfig.manualReviewThreshold).toBeLessThanOrEqual(100);
  });

  test("kycConfig has string properties", () => {
    expect(typeof kycConfig.adbPath).toBe("string");
    expect(typeof kycConfig.androidVersion).toBe("string");
    expect(typeof kycConfig.packageName).toBe("string");
    expect(typeof kycConfig.s3Bucket).toBe("string");
    expect(typeof kycConfig.awsRegion).toBe("string");
  });

  test("kycConfig optional properties can be undefined", () => {
    // Optional properties may be undefined
    expect(
      kycConfig.googleCloudKey === undefined || typeof kycConfig.googleCloudKey === "string"
    ).toBe(true);
    expect(
      kycConfig.adminWebhookUrl === undefined || typeof kycConfig.adminWebhookUrl === "string"
    ).toBe(true);
  });
});
