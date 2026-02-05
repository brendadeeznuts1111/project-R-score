/**
 * CashApp Integration v2.0 - Comprehensive Test Suite
 */

import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { CashAppIntegrationV2 } from "../src/cashapp/cashapp-integration-v2.js";
import { CashAppRateLimiter } from "../src/cashapp/rate-limiter.js";
import { CashAppCircuitBreaker } from "../src/cashapp/circuit-breaker.js";
import { RiskFactorV2 } from "../src/cashapp/types.js";

describe("CashAppIntegrationV2", () => {
  let integration: CashAppIntegrationV2;
  const mockConfig: any = {
    apiKey: "test_key",
    apiSecret: "test_secret",
    environment: "sandbox",
    cacheTTL: 60
  };

  beforeEach(() => {
    integration = new CashAppIntegrationV2(mockConfig);
  });

  afterEach(async () => {
    await integration.cleanup();
  });

  describe("Risk Assessment", () => {
    it("should assign HIGH risk for suspended accounts", async () => {
      const profile: any = {
        verificationStatus: "suspended",
        fraudFlags: [],
        transactionVolume30d: 0,
        phone: "+15550000000",
        confidence: 1.0
      };

      const assessment = await integration.assessRiskV2(profile);
      expect(assessment.riskLevel).toBe("HIGH");
      expect(assessment.recommendation).toBe("BLOCK_AND_REPORT");
    });

    it("should assign LOW risk for verified accounts with normal volume", async () => {
      const profile: any = {
        verificationStatus: "verified",
        linkedBank: "Chase",
        fraudFlags: [],
        transactionVolume30d: 50000, // $500
        phone: "+15551111111",
        confidence: 1.0
      };

      const assessment = await integration.assessRiskV2(profile);
      expect(assessment.riskLevel).toBe("NONE");
      expect(assessment.recommendation).toBe("ALLOW");
    });

    it("should detect extreme transaction volume", async () => {
      const profile: any = {
        verificationStatus: "verified",
        fraudFlags: [],
        transactionVolume30d: 1500000, // $15,000
        phone: "+15552222222",
        confidence: 1.0
      };

      const assessment = await integration.assessRiskV2(profile);
      expect(assessment.factors).toContain(RiskFactorV2.EXTREME_TRANSACTION_VOLUME);
    });
  });

  describe("API Integration (Mocked)", () => {
    it("should handle profile resolution with mocked API", async () => {
      const testPhone = "+15553333333";
      
      const mockProfile: any = {
        cashtag: "$testuser",
        displayName: "Test User",
        verificationStatus: "verified",
        phone: testPhone,
        confidence: 1.0,
        transactionVolume30d: 1000,
        fraudFlags: []
      };

      // Mock internal methods to avoid Redis/Fetch during tests
      (integration as any).fetchFromApi = async () => mockProfile;
      (integration as any).getFromCache = async () => null;
      (integration as any).cacheProfile = async () => {};
      (integration as any).rateLimiter.consume = async () => ({ allowed: true });

      const result = await integration.resolve(testPhone);
      expect(result?.cashtag).toBe("$testuser");
    });
  });
});

describe("CashAppCircuitBreaker", () => {
  it("should open when failure threshold is reached", async () => {
    const breaker = new CashAppCircuitBreaker({
      failureThreshold: 2,
      resetTimeout: 100,
      halfOpenMaxAttempts: 1
    });

    const failingFunc = async () => { throw new Error("API Down"); };

    await breaker.execute(failingFunc);
    await breaker.execute(failingFunc);

    const res = await breaker.execute(async () => "success");
    expect(res.success).toBe(false);
    expect(res.error?.message).toContain("Circuit breaker is open");
  });
});
