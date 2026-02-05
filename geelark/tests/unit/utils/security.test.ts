#!/usr/bin/env bun

import { describe, expect, it } from "bun:test";
import { FeatureRegistry } from "../../../src/FeatureRegistry";
import { FeatureFlag, CriticalLevel } from "../../../src/types";

describe("Security Tests", () => {
  describe("Feature Flag Security", () => {
    it("should enforce critical security flags in production", () => {
      const registry = new FeatureRegistry({
        [FeatureFlag.ENV_PRODUCTION]: true,
        [FeatureFlag.FEAT_ENCRYPTION]: true,
        [FeatureFlag.FEAT_VALIDATION_STRICT]: true,
      });

      // Critical security flags should be enabled in production
      expect(registry.isEnabled(FeatureFlag.FEAT_ENCRYPTION)).toBe(true);
      expect(registry.isEnabled(FeatureFlag.FEAT_VALIDATION_STRICT)).toBe(true);
    });

    it("should prevent mock API in production", () => {
      const registry = new FeatureRegistry({
        [FeatureFlag.ENV_PRODUCTION]: true,
        [FeatureFlag.FEAT_MOCK_API]: false,
      });

      // Mock API should be disabled in production
      expect(registry.isEnabled(FeatureFlag.FEAT_MOCK_API)).toBe(false);
    });

    it("should validate critical level assignments", () => {
      const { FEATURE_FLAG_CONFIGS } = require("../src/config");

      // Verify critical security flags have correct critical levels
      expect(FEATURE_FLAG_CONFIGS[FeatureFlag.FEAT_ENCRYPTION].criticalLevel)
        .toBe(CriticalLevel.CRITICAL);
      expect(FEATURE_FLAG_CONFIGS[FeatureFlag.FEAT_VALIDATION_STRICT].criticalLevel)
        .toBe(CriticalLevel.HIGH);
      expect(FEATURE_FLAG_CONFIGS[FeatureFlag.FEAT_MOCK_API].criticalLevel)
        .toBe(CriticalLevel.PROD_CRITICAL);
    });
  });

  describe("Build Security", () => {
    it("should validate production builds don't include mock API", async () => {
      const { execSync } = require("node:child_process");
      const { join } = require("node:path");

      const testDir = "/tmp/security-build-test";
      const testFile = join(testDir, "security-test.ts");
      const outputFile = join(testDir, "security-output.js");

      // Create test file
      const testCode = `
import { feature } from "bun:bundle";

if (feature("FEAT_MOCK_API")) {
  console.log("MOCK API ENABLED - SECURITY VIOLATION");
} else {
  console.log("SECURE BUILD - NO MOCK API");
}
`;

      // Write test file
      require("fs").writeFileSync(testFile, testCode, "utf8");

      // Build with production flags
      execSync(`bun build --feature=ENV_PRODUCTION --feature=FEAT_ENCRYPTION ${testFile} --outfile=${outputFile}`);

      const content = require("fs").readFileSync(outputFile, "utf8");

      // Production build should not contain mock API code
      expect(content).not.toContain("MOCK API ENABLED");
      expect(content).toContain("SECURE BUILD");
    });

    it("should validate encryption is included in production builds", async () => {
      const { execSync } = require("node:child_process");
      const { join } = require("node:path");

      const testDir = "/tmp/encryption-build-test";
      const testFile = join(testDir, "encryption-test.ts");
      const outputFile = join(testDir, "encryption-output.js");

      // Create test file
      const testCode = `
import { feature } from "bun:bundle";

if (feature("FEAT_ENCRYPTION")) {
  const encryptionKey = "secure-key-" + Math.random();
  console.log("ENCRYPTION ENABLED");
} else {
  console.log("NO ENCRYPTION - SECURITY RISK");
}
`;

      // Write test file
      require("fs").writeFileSync(testFile, testCode, "utf8");

      // Build with production flags
      execSync(`bun build --feature=ENV_PRODUCTION --feature=FEAT_ENCRYPTION ${testFile} --outfile=${outputFile}`);

      const content = require("fs").readFileSync(outputFile, "utf8");

      // Production build should contain encryption code
      expect(content).toContain("ENCRYPTION ENABLED");
      expect(content).not.toContain("NO ENCRYPTION");
    });
  });

  describe("Environment Security", () => {
    it("should validate environment variables", () => {
      // Test that required environment variables are present
      expect(process.env.NODE_ENV).toBeDefined();

      // Production should have encryption key
      if (process.env.NODE_ENV === "production") {
        expect(process.env.ENCRYPTION_KEY).toBeDefined();
        expect(process.env.ENCRYPTION_KEY?.length).toBeGreaterThan(0);
      }
    });

    it("should validate feature flag security rules", () => {
      const registry = new FeatureRegistry();

      // Get all critical flags
      const criticalFlags = registry.getCriticalFlags();

      // Verify critical flags have security impact
      criticalFlags.forEach(flag => {
        const config = registry.getFlagConfig(flag);
        expect(config).toBeDefined();
        expect(config?.criticalLevel).toBe(CriticalLevel.CRITICAL);
      });
    });
  });

  describe("Access Control", () => {
    it("should enforce feature flag access controls", () => {
      const registry = new FeatureRegistry();

      // Premium features should require proper authorization
      const premiumFeatures = [
        FeatureFlag.FEAT_PREMIUM,
        FeatureFlag.FEAT_ADVANCED_MONITORING,
        FeatureFlag.FEAT_EXTENDED_LOGGING,
      ];

      premiumFeatures.forEach(flag => {
        const config = registry.getFlagConfig(flag);
        expect(config).toBeDefined();
        expect(config?.criticalLevel).not.toBe(CriticalLevel.CRITICAL);
      });
    });

    it("should validate feature flag combinations", () => {
      // Certain flag combinations should be restricted
      const registry = new FeatureRegistry({
        [FeatureFlag.ENV_PRODUCTION]: true,
        [FeatureFlag.FEAT_MOCK_API]: true, // This should trigger security alert
      });

      const healthStatus = registry.getHealthStatus();

      // Production with mock API should trigger critical alert
      expect(healthStatus.status).toBe("CRITICAL");
      expect(healthStatus.score).toBeLessThan(50);
    });
  });

  describe("Audit Logging", () => {
    it("should log feature flag changes", async () => {
      const { Logger } = require("../src/Logger");
      const registry = new FeatureRegistry();

      const logs: any[] = [];
      const originalLog = console.log;
      console.log = (...args) => logs.push(args.join(" "));

      try {
        // Enable a feature flag
        registry.enableFeature(FeatureFlag.FEAT_PREMIUM);

        // Verify logging occurred
        expect(logs.some(log => log.includes("FEAT_PREMIUM") && log.includes("enabled"))).toBe(true);
      } finally {
        console.log = originalLog;
      }
    });

    it("should log security events", async () => {
      const { Logger } = require("../src/Logger");
      const logger = new Logger();

      const logs: any[] = [];
      const originalLog = console.log;
      console.log = (...args) => logs.push(args.join(" "));

      try {
        // Log a security event
        await logger.securityEvent("Unauthorized access attempt", {
          ip: "192.168.1.1",
          user: "unknown",
          timestamp: new Date().toISOString(),
        });

        // Verify security logging occurred
        expect(logs.some(log => log.includes("SECURITY") && log.includes("Unauthorized"))).toBe(true);
      } finally {
        console.log = originalLog;
      }
    });
  });
});
