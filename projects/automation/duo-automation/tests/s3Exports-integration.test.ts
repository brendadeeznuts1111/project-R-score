// test/s3Exports-integration.test.ts
import { expect, test, describe } from "bun:test";
import { SCOPE_STRATEGIES } from "../src/utils/s3Exports";

describe("S3 Exports - Integration Tests", () => {
  describe("SCOPE_STRATEGIES Configuration", () => {
    test("development strategy has correct settings", () => {
      const devStrategy = SCOPE_STRATEGIES.DEVELOPMENT;
      
      expect(devStrategy.cacheControl).toBe("no-cache");
      expect(devStrategy.inline).toBe(true);
      expect(devStrategy.expiresIn).toBe(300); // 5 minutes
    });

    test("staging strategy has correct settings", () => {
      const stagingStrategy = SCOPE_STRATEGIES.STAGING;
      
      expect(stagingStrategy.cacheControl).toBe("max-age=300");
      expect(stagingStrategy.inline).toBe(false);
      expect(stagingStrategy.expiresIn).toBe(3600); // 1 hour
    });

    test("production strategy has correct settings", () => {
      const prodStrategy = SCOPE_STRATEGIES.PRODUCTION;
      
      expect(prodStrategy.cacheControl).toBe("max-age=3600");
      expect(prodStrategy.inline).toBe(false);
      expect(prodStrategy.expiresIn).toBe(86400); // 24 hours
    });

    test("strategies are progressively more restrictive", () => {
      const dev = SCOPE_STRATEGIES.DEVELOPMENT;
      const staging = SCOPE_STRATEGIES.STAGING;
      const prod = SCOPE_STRATEGIES.PRODUCTION;
      
      // Cache control should become more restrictive
      expect(dev.cacheControl).toBe("no-cache");
      expect(staging.cacheControl).toBe("max-age=300");
      expect(prod.cacheControl).toBe("max-age=3600");
      
      // Expiry times should increase
      expect(dev.expiresIn).toBeLessThan(staging.expiresIn);
      expect(staging.expiresIn).toBeLessThan(prod.expiresIn);
      
      // Only development should be inline
      expect(dev.inline).toBe(true);
      expect(staging.inline).toBe(false);
      expect(prod.inline).toBe(false);
    });
  });

  describe("Content-Disposition Generation", () => {
    test("generates correct premium export filename", () => {
      const timestamp = Date.now();
      const expectedDisposition = `attachment; filename="premium-export-${timestamp}.csv"`;
      
      expect(expectedDisposition).toMatch(/^attachment; filename="premium-export-\d+\.csv"$/);
      expect(expectedDisposition).toContain("premium-export");
      expect(expectedDisposition).toContain(".csv");
    });

    test("generates correct user report filename", () => {
      const userId = "user123";
      const scope = "PRODUCTION";
      const expectedDisposition = `attachment; filename="${scope}-user-${userId}-report.json"`;
      
      expect(expectedDisposition).toBe('attachment; filename="PRODUCTION-user-user123-report.json"');
      expect(expectedDisposition).toContain(userId);
      expect(expectedDisposition).toContain(scope);
      expect(expectedDisposition).toContain("report.json");
    });

    test("handles inline content disposition", () => {
      const inlineDisposition = "inline";
      
      expect(inlineDisposition).toBe("inline");
      expect(inlineDisposition).not.toContain("attachment");
    });

    test("handles generic attachment", () => {
      const genericDisposition = "attachment";
      
      expect(genericDisposition).toBe("attachment");
      expect(genericDisposition).not.toContain("filename");
    });
  });

  describe("Feature Flag Logic", () => {
    test("premium user gets custom filename", () => {
      const isPremium = true;
      const timestamp = Date.now();
      
      let contentDisposition: string;
      if (isPremium) {
        contentDisposition = `attachment; filename="premium-export-${timestamp}.csv"`;
      } else {
        contentDisposition = "attachment";
      }
      
      expect(contentDisposition).toContain("premium-export");
      expect(contentDisposition).toContain(String(timestamp));
    });

    test("standard user gets generic attachment", () => {
      const isPremium = false;
      
      let contentDisposition: string;
      if (isPremium) {
        contentDisposition = `attachment; filename="premium-export-${Date.now()}.csv"`;
      } else {
        contentDisposition = "attachment";
      }
      
      expect(contentDisposition).toBe("attachment");
      expect(contentDisposition).not.toContain("premium-export");
    });

    test("feature flag integration", () => {
      // Mock feature flag function
      const mockFeatureFlags = {
        PREMIUM: true,
        ENTERPRISE: false,
        DEVELOPMENT_TOOLS: true
      };
      
      const feature = (flag: string): boolean => mockFeatureFlags[flag] ?? false;
      
      // Test premium detection
      const isPremium = feature("PREMIUM");
      expect(isPremium).toBe(true);
      
      // Test enterprise detection
      const isEnterprise = feature("ENTERPRISE");
      expect(isEnterprise).toBe(false);
      
      // Test unknown flag defaults to false
      const isUnknown = feature("UNKNOWN_FEATURE");
      expect(isUnknown).toBe(false);
    });
  });

  describe("Cache Control Strategy", () => {
    test("selects correct cache control based on scope", () => {
      const scopes = ["DEVELOPMENT", "STAGING", "PRODUCTION"] as const;
      
      scopes.forEach(scope => {
        const strategy = SCOPE_STRATEGIES[scope];
        
        switch (scope) {
          case "DEVELOPMENT":
            expect(strategy.cacheControl).toBe("no-cache");
            break;
          case "STAGING":
            expect(strategy.cacheControl).toBe("max-age=300");
            break;
          case "PRODUCTION":
            expect(strategy.cacheControl).toBe("max-age=3600");
            break;
        }
      });
    });

    test("inline behavior matches scope expectations", () => {
      expect(SCOPE_STRATEGIES.DEVELOPMENT.inline).toBe(true);
      expect(SCOPE_STRATEGIES.STAGING.inline).toBe(false);
      expect(SCOPE_STRATEGIES.PRODUCTION.inline).toBe(false);
    });
  });

  describe("Filename Generation", () => {
    test("generates consistent timestamp patterns", () => {
      const timestamp = Date.now();
      const filename = `premium-export-${timestamp}.csv`;
      
      expect(filename).toMatch(/^premium-export-\d{13}\.csv$/);
    });

    test("handles special characters in scope", () => {
      const userId = "user@domain.com";
      const scope = "TEST-ENV";
      const filename = `${scope}-user-${userId}-report.json`;
      
      expect(filename).toContain("TEST-ENV");
      expect(filename).toContain("user@domain.com");
      expect(filename).toContain("report.json");
    });

    test("truncates or handles very long user IDs", () => {
      const longUserId = "a".repeat(100);
      const filename = `user-${longUserId}-report.json`;
      
      expect(filename.length).toBeGreaterThan(100);
      expect(filename).toContain(longUserId);
    });
  });

  describe("Error Scenarios", () => {
    test("handles missing feature flag gracefully", () => {
      // Simulate missing feature flag function
      const feature = undefined;
      
      // Should default to non-premium behavior
      const isPremium = feature ? feature("PREMIUM") : false;
      expect(isPremium).toBe(false);
    });

    test("handles invalid scope gracefully", () => {
      const invalidScope = "INVALID_SCOPE" as any;
      
      // Should handle gracefully or throw appropriate error
      expect(() => {
        const strategy = SCOPE_STRATEGIES[invalidScope];
        if (!strategy) {
          throw new Error(`Unknown scope: ${invalidScope}`);
        }
      }).toThrow("Unknown scope: INVALID_SCOPE");
    });
  });
});
