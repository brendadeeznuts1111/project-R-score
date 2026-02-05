import { describe, test, expect, beforeEach } from "bun:test";
import { SCOPING_MATRIX } from "../../data/scopingMatrix.ts";
import { getMatrixRule, getDomainRules, getScopeRules, getPlatformRules, isIntegrationAllowed, getFeatureFlags, getLimits, validateLimits } from "../../utils/matrixMatcher.ts";
import { getScopingMatrix, reloadScopingMatrix, validateScopingMatrix, getMatrixStats } from "../../data/scopingMatrixLoader.ts";
import { createScopeContext, getScopeContext, resetScopeContext, isFeatureEnabled, isIntegrationAllowed as scopeIsIntegrationAllowed, getCurrentLimits, validateCurrentConfig } from "../../config/scope.config.ts";
import { validateMatrixCompliance, validateUsageLimits, getComplianceReport } from "../../utils/matrixValidator.ts";
import { setupTestScope, scopeTestUtils, performanceTestUtils, memoryTestUtils, complianceTestUtils } from "../../test/setup.ts";

// ============================================================================
// Test Setup
// ============================================================================

describe("DuoPlus Scoping Matrix System", () => {
  beforeEach(() => {
    resetScopeContext();
  });

  // ============================================================================
  // Data Structure Tests
  // ============================================================================

  describe("Scoping Matrix Data Structure", () => {
    test("should have valid matrix structure", () => {
      expect(Array.isArray(SCOPING_MATRIX)).toBe(true);
      expect(SCOPING_MATRIX.length).toBeGreaterThan(0);

      SCOPING_MATRIX.forEach((rule, index) => {
        expect(rule.servingDomain).toBeDefined();
        expect(["ENTERPRISE", "DEVELOPMENT", "PERSONAL", "PUBLIC"]).toContain(rule.detectedScope);
        expect(["Windows", "macOS", "Linux", "Android", "iOS", "Other", "Any"]).toContain(rule.platform);
        expect(rule.features).toBeDefined();
        expect(rule.limits).toBeDefined();
        expect(rule.integrations).toBeDefined();
      });
    });

    test("should have Bun.inspect.custom for rich debugging", () => {
      const customInspect = (SCOPING_MATRIX as any)[Symbol.for("Bun.inspect.custom")];
      expect(typeof customInspect).toBe("function");

      const result = customInspect(0, {}, () => {});
      expect(result).toBeDefined();
      expect(typeof result).toBe("object");
      // The inspect function returns a summary object
      expect(Object.keys(result).length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Matrix Matcher Tests
  // ============================================================================

  describe("Matrix Matcher (Bun.match optimization)", () => {
    test("should find enterprise rule for apple.com", () => {
      const rule = getMatrixRule("apple.com", "macOS");
      expect(rule).toBeDefined();
      expect(rule?.detectedScope).toBe("ENTERPRISE");
      expect(rule?.features.advancedAnalytics).toBe(true);
    });

    test("should find development rule for localhost", () => {
      const rule = getMatrixRule("localhost", "Any");
      expect(rule).toBeDefined();
      expect(rule?.detectedScope).toBe("DEVELOPMENT");
      expect(rule?.features.debugTools).toBe(true);
    });

    test("should find personal rule for gmail.com", () => {
      const rule = getMatrixRule("gmail.com", "Any");
      expect(rule).toBeDefined();
      expect(rule?.detectedScope).toBe("PERSONAL");
      expect(rule?.limits.maxDevices).toBe(3);
    });

    test("should fallback to public rule", () => {
      const rule = getMatrixRule("unknown.com", "Any");
      expect(rule).toBeDefined();
      expect(rule?.detectedScope).toBe("PUBLIC");
    });

    test("should get domain rules", () => {
      const rules = getDomainRules("apple.com");
      expect(rules.length).toBeGreaterThan(0);
      expect(rules[0].servingDomain).toBe("apple.com");
    });

    test("should get scope rules", () => {
      const enterpriseRules = getScopeRules("ENTERPRISE");
      expect(enterpriseRules.length).toBeGreaterThan(0);
      enterpriseRules.forEach(rule => {
        expect(rule.detectedScope).toBe("ENTERPRISE");
      });
    });

    test("should get platform rules", () => {
      const macRules = getPlatformRules("macOS");
      expect(macRules.length).toBeGreaterThan(0);
      macRules.forEach(rule => {
        expect(["macOS", "Any"].includes(rule.platform)).toBe(true);
      });
    });

    test("should check integration permissions", () => {
      expect(isIntegrationAllowed("apple.com", "macOS", "twitter")).toBe(true);
      expect(isIntegrationAllowed("gmail.com", "Any", "sms")).toBe(false);
      expect(isIntegrationAllowed("localhost", "Any", "webhook")).toBe(false);
    });

    test("should get feature flags", () => {
      const features = getFeatureFlags("apple.com", "macOS");
      expect(features).toBeDefined();
      expect(features?.advancedAnalytics).toBe(true);
      expect(features?.complianceMode).toBe(true);
    });

    test("should get limits", () => {
      const limits = getLimits("apple.com", "macOS");
      expect(limits).toBeDefined();
      expect(limits?.maxDevices).toBe(1000);
      expect(limits?.apiRateLimit).toBe(10000);
    });

    test("should validate usage limits", () => {
      const result = validateLimits("apple.com", "macOS", {
        devices: 500,
        integrations: 20,
        apiCalls: 5000,
      });
      expect(result.valid).toBe(true);

      const invalidResult = validateLimits("apple.com", "macOS", {
        devices: 2000, // Over limit
        integrations: 20,
        apiCalls: 5000,
      });
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.violations).toContain("Device limit exceeded: 2000/1000");
    });
  });

  // ============================================================================
  // Matrix Loader Tests
  // ============================================================================

  describe("Matrix Loader (zero-copy JSON)", () => {
    test("should load matrix from embedded data", async () => {
      const matrix = await getScopingMatrix();
      expect(Array.isArray(matrix)).toBe(true);
      expect(matrix.length).toBeGreaterThan(0);
    });

    test("should validate matrix structure", () => {
      const result = validateScopingMatrix(SCOPING_MATRIX);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test("should get matrix statistics", async () => {
      const stats = await getMatrixStats();
      expect(stats.totalRules).toBeGreaterThan(0);
      expect(stats.domains).toContain("apple.com");
      expect(stats.scopes).toContain("ENTERPRISE");
      expect(stats.platforms).toContain("Any");
    });

    test("should reload matrix", async () => {
      const original = await getScopingMatrix();
      const reloaded = await reloadScopingMatrix();
      expect(reloaded).toEqual(original);
    });
  });

  // ============================================================================
  // Scope Configuration Tests
  // ============================================================================

  describe("Scope Configuration", () => {
    test("should create scope context for localhost", () => {
      setupTestScope({ HOST: "localhost" });
      const context = getScopeContext();

      expect(context.domain).toBe("localhost");
      expect(context.detectedScope).toBe("DEVELOPMENT");
      expect(context.features.debugTools).toBe(true);
    });

    test("should create scope context for enterprise domain", () => {
      setupTestScope({ HOST: "apple.com" });
      const context = getScopeContext();

      expect(context.domain).toBe("apple.com");
      expect(context.detectedScope).toBe("ENTERPRISE");
      expect(context.features.complianceMode).toBe(true);
    });

    test("should check feature availability", () => {
      setupTestScope({ HOST: "apple.com" });
      expect(isFeatureEnabled("advancedAnalytics")).toBe(true);
      expect(isFeatureEnabled("debugTools")).toBe(false);
    });

    test("should check integration availability", () => {
      setupTestScope({ HOST: "apple.com" });
      expect(scopeIsIntegrationAllowed("twitter")).toBe(true);
      expect(scopeIsIntegrationAllowed("cashapp")).toBe(true);
    });

    test("should get current limits", () => {
      setupTestScope({ HOST: "apple.com" });
      const limits = getCurrentLimits();
      expect(limits?.maxDevices).toBe(1000);
    });

    test("should validate current configuration", () => {
      setupTestScope({ HOST: "apple.com" });
      const result = validateCurrentConfig();
      expect(result.valid).toBe(true);
    });
  });

  // ============================================================================
  // Matrix Validator Tests
  // ============================================================================

  describe("Matrix Validator", () => {
    test("should validate compliance for enterprise scope", () => {
      setupTestScope({ HOST: "apple.com" });
      const result = validateMatrixCompliance();

      expect(result.valid).toBe(true);
      expect(result.violations).toBeUndefined();
    });

    test("should validate compliance for development scope", () => {
      setupTestScope({ HOST: "localhost" });
      const result = validateMatrixCompliance();

      expect(result.valid).toBe(true);
    });

    test("should validate usage limits", () => {
      setupTestScope({ HOST: "apple.com" });
      const result = validateUsageLimits({
        devices: 500,
        integrations: 20,
      });

      expect(result.valid).toBe(true);
    });

    test("should detect usage limit violations", () => {
      setupTestScope({ HOST: "gmail.com" });
      const result = validateUsageLimits({
        devices: 10, // Over personal limit of 3
        integrations: 1,
      });

      expect(result.valid).toBe(false);
      expect(result.violations).toContain("Device limit exceeded: 10/3");
    });

    test("should generate compliance report", async () => {
      setupTestScope({ HOST: "apple.com" });
      const report = await getComplianceReport();

      expect(report.timestamp).toBeDefined();
      expect(report.scope.domain).toBe("apple.com");
      expect(report.validation.valid).toBe(true);
      expect(report.recommendations).toBeDefined();
    });
  });

  // ============================================================================
  // Scope Test Utilities
  // ============================================================================

  describe("Scope Test Utilities", () => {
    test("should test enterprise scope", async () => {
      await scopeTestUtils.testEnterpriseScope(async () => {
        const context = getScopeContext();
        expect(context.detectedScope).toBe("ENTERPRISE");
        expect(context.features.advancedAnalytics).toBe(true);
      });
    });

    test("should test development scope", async () => {
      await scopeTestUtils.testDevelopmentScope(async () => {
        const context = getScopeContext();
        expect(context.detectedScope).toBe("DEVELOPMENT");
        expect(context.features.debugTools).toBe(true);
      });
    });

    test("should test personal scope", async () => {
      await scopeTestUtils.testPersonalScope(async () => {
        const context = getScopeContext();
        expect(context.detectedScope).toBe("PERSONAL");
        expect(context.limits.maxDevices).toBe(3);
      });
    });

    test("should test public scope", async () => {
      await scopeTestUtils.testPublicScope(async () => {
        const context = getScopeContext();
        expect(context.detectedScope).toBe("PUBLIC");
        expect(context.integrations.twitter).toBe(false);
      });
    });
  });

  // ============================================================================
  // Performance Tests
  // ============================================================================

  describe("Performance Tests", () => {
    test("should benchmark matrix lookups", async () => {
      const result = await performanceTestUtils.benchmark(
        "Matrix Lookup",
        () => getMatrixRule("apple.com", "macOS"),
        1000
      );

      expect(result.avg).toBeLessThan(1); // Should be very fast
      expect(result.max).toBeLessThan(10);
    });

    test("should monitor memory usage", async () => {
      const result = await memoryTestUtils.monitorMemory(
        async () => {
          for (let i = 0; i < 100; i++) {
            getMatrixRule("apple.com", "macOS");
          }
        },
        "Matrix lookups"
      );

      expect(result.memoryDelta).toBeLessThan(1000000); // Less than 1MB
    });

    test("should time scope context access", async () => {
      const result = await performanceTestUtils.timeExecution(
        () => getScopeContext(),
        "Scope context access"
      );

      expect(result.duration).toBeLessThan(5); // Should be very fast
    });
  });

  // ============================================================================
  // Compliance Test Utilities
  // ============================================================================

  describe("Compliance Test Utilities", () => {
    test("should assert compliance is valid", () => {
      setupTestScope({ HOST: "apple.com" });

      expect(() => complianceTestUtils.assertComplianceValid()).not.toThrow();
    });

    test("should assert feature is enabled", () => {
      setupTestScope({ HOST: "apple.com" });

      expect(() => complianceTestUtils.assertFeatureEnabled("advancedAnalytics")).not.toThrow();
      expect(() => complianceTestUtils.assertFeatureEnabled("debugTools")).toThrow();
    });

    test("should assert integration is allowed", () => {
      setupTestScope({ HOST: "apple.com" });

      expect(() => complianceTestUtils.assertIntegrationAllowed("twitter")).not.toThrow();
      expect(() => complianceTestUtils.assertIntegrationAllowed("webhook")).not.toThrow();
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe("Integration Tests", () => {
    test("should work end-to-end with enterprise scope", () => {
      setupTestScope({ HOST: "apple.com", PLATFORM_OVERRIDE: "macOS" });

      // Get context
      const context = getScopeContext();
      expect(context.detectedScope).toBe("ENTERPRISE");

      // Check features
      expect(isFeatureEnabled("advancedAnalytics")).toBe(true);
      expect(isFeatureEnabled("complianceMode")).toBe(true);

      // Check integrations
      expect(scopeIsIntegrationAllowed("twitter")).toBe(true);
      expect(scopeIsIntegrationAllowed("cashapp")).toBe(true);

      // Validate compliance
      const compliance = validateMatrixCompliance();
      expect(compliance.valid).toBe(true);

      // Check limits
      const limits = getCurrentLimits();
      expect(limits?.maxDevices).toBe(1000);
    });

    test("should work end-to-end with development scope", () => {
      setupTestScope({ HOST: "localhost", PLATFORM_OVERRIDE: "Linux" });

      const context = getScopeContext();
      expect(context.detectedScope).toBe("DEVELOPMENT");

      expect(isFeatureEnabled("debugTools")).toBe(true);
      expect(scopeIsIntegrationAllowed("twitter")).toBe(true);
      expect(scopeIsIntegrationAllowed("webhook")).toBe(false);

      const compliance = validateMatrixCompliance();
      expect(compliance.valid).toBe(true);
    });

    test("should handle scope transitions", () => {
      // Start with development
      setupTestScope({ HOST: "localhost" });
      expect(getScopeContext().detectedScope).toBe("DEVELOPMENT");

      // Switch to enterprise
      setupTestScope({ HOST: "apple.com" });
      expect(getScopeContext().detectedScope).toBe("ENTERPRISE");

      // Switch to personal
      setupTestScope({ HOST: "gmail.com" });
      expect(getScopeContext().detectedScope).toBe("PERSONAL");
    });
  });
});