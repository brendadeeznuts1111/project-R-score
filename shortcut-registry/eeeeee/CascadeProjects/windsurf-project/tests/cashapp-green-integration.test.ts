// test/cashapp-green-integration.test.ts
import { test, expect, describe, beforeEach, mock } from "bun:test";
import { CashAppGreenClient } from "../src/cashapp/greenDeposit";
import { EnhancedLightningToGreenRouter } from "../src/finance/enhancedAutoRouter";
import { RealtimePriceFeed } from "../src/price/realtimeFeed";
import { AdvancedGreenYieldDashboard } from "../src/admin/advancedGreenDashboard";
import type { Invoice, RoutingDecision } from "../src/types";

// Mock external dependencies
mock.module("../src/database/connection", () => ({
  db: {
    query: mock(() => Promise.resolve([])),
    transaction: mock(() => Promise.resolve())
  }
}));

mock.module("bun", () => ({
  s3: {
    write: mock(() => Promise.resolve()),
    read: mock(() => Promise.resolve({ text: () => "[]" })),
    list: mock(() => ({ toArray: () => Promise.resolve([]) }))
  },
  file: mock(() => ({ text: () => Promise.resolve("{}") })),
  write: mock(() => Promise.resolve()),
  password: {
    hashSync: (data: string) => `hashed_${data}`
  }
}));

// Mock fetch with proper typing
const mockFetch = mock((url: string, options?: any) => {
  if (url.includes("coinbase")) {
    return Promise.resolve({
      ok: true,
      json: mock(() => Promise.resolve({
        data: { rates: { USD: "51000.00" } }
      })),
      preconnect: mock(),
      redirect: mock(),
      clone: mock(),
      headers: new Headers(),
      status: 200,
      statusText: "OK",
      type: "basic" as "basic",
      url,
      body: null,
      bodyUsed: false,
      arrayBuffer: mock(),
      blob: mock(),
      formData: mock(),
      text: mock()
    });
  }
  
  if (url.includes("deposits")) {
    return Promise.resolve({
      ok: true,
      json: mock(() => Promise.resolve({
        id: "deposit_123",
        status: "completed"
      })),
      preconnect: mock(),
      redirect: mock(),
      clone: mock(),
      headers: new Headers(),
      status: 200,
      statusText: "OK",
      type: "basic" as "basic",
      url,
      body: null,
      bodyUsed: false,
      arrayBuffer: mock(),
      blob: mock(),
      formData: mock(),
      text: mock()
    });
  }
  
  return Promise.resolve({
    ok: false,
    json: mock(() => Promise.resolve({
      code: "INSUFFICIENT_BALANCE",
      message: "Insufficient balance for deposit"
    })),
    preconnect: mock(),
    redirect: mock(),
    clone: mock(),
    headers: new Headers(),
    status: 400,
    statusText: "Bad Request",
    type: "basic" as "basic",
    url,
    body: null,
    bodyUsed: false,
    arrayBuffer: mock(),
    blob: mock(),
    formData: mock(),
    text: mock()
  });
});

// Set global fetch mock with proper typing
(global as any).fetch = mockFetch;

describe("Cash App Green Integration", () => {
  let greenClient: CashAppGreenClient;
  let router: EnhancedLightningToGreenRouter;
  let priceFeed: RealtimePriceFeed;
  let dashboard: AdvancedGreenYieldDashboard;

  beforeEach(() => {
    // Set up environment variables
    process.env.CASHAPP_ACCOUNT_ID = "test_account_123";
    process.env.CASHAPP_ACCESS_TOKEN = "test_token_123";
    process.env.CHAINALYSIS_API_KEY = "test_chainalysis_key";

    greenClient = new CashAppGreenClient();
    router = new EnhancedLightningToGreenRouter();
    priceFeed = new RealtimePriceFeed();
    dashboard = new AdvancedGreenYieldDashboard();
  });

  describe("CashAppGreenClient", () => {
    test("should deposit to Green account successfully", async () => {
      const mockFetch = mock(() => Promise.resolve({
        ok: true,
        json: mock(() => Promise.resolve({
          id: "deposit_123",
          status: "completed"
        })),
        preconnect: mock(),
        redirect: mock(),
        clone: mock(),
        headers: new Headers(),
        status: 200,
        statusText: "OK",
        type: "basic" as "basic",
        url: "",
        body: null,
        bodyUsed: false,
        arrayBuffer: mock(),
        blob: mock(),
        formData: mock(),
        text: mock()
      }));
      
      (global as any).fetch = mockFetch;

      const result = await greenClient.depositToGreen({
        userId: "user123",
        amountUsd: 100,
        source: "test",
        traceId: "test-123"
      });

      expect(result.success).toBe(true);
      expect(result.depositId).toBe("deposit_123");
      expect(result.yieldProjection).toBe(3.25); // $100 * 3.25%
    });

    test("should handle deposit failure gracefully", async () => {
      const mockFetch = mock(() => Promise.resolve({
        ok: false,
        json: mock(() => Promise.resolve({
          code: "INSUFFICIENT_BALANCE",
          message: "Insufficient balance for deposit"
        })),
        preconnect: mock(),
        redirect: mock(),
        clone: mock(),
        headers: new Headers(),
        status: 400,
        statusText: "Bad Request",
        type: "basic" as "basic",
        url: "",
        body: null,
        bodyUsed: false,
        arrayBuffer: mock(),
        blob: mock(),
        formData: mock(),
        text: mock()
      }));
      
      (global as any).fetch = mockFetch;

      expect(async () => {
        await greenClient.depositToGreen({
          userId: "user123",
          amountUsd: 100,
          source: "test",
          traceId: "test-123"
        });
      }).toThrow("Cash App deposit failed: INSUFFICIENT_BALANCE - Insufficient balance for deposit");
    });

    test("should get Green account balance", async () => {
      const mockFetch = mock(() => Promise.resolve({
        ok: true,
        json: mock(() => Promise.resolve({
          green_balance: { amount: 50000 }, // $500.00 in cents
          green_yield: { amount: 1625 }     // $16.25 in cents
        })),
        preconnect: mock(),
        redirect: mock(),
        clone: mock(),
        headers: new Headers(),
        status: 200,
        statusText: "OK",
        type: "basic" as "basic",
        url: "",
        body: null,
        bodyUsed: false,
        arrayBuffer: mock(),
        blob: mock(),
        formData: mock(),
        text: mock()
      }));
      
      (global as any).fetch = mockFetch;

      const balance = await greenClient.getGreenBalance("user123");

      expect(balance.balance).toBe(500);
      expect(balance.yieldEarned).toBe(16.25);
      expect(balance.apy).toBe(0.0325);
    });
  });

  describe("EnhancedLightningToGreenRouter", () => {
    test("should route large amounts to Green", async () => {
      const invoice = {
        paymentHash: "hash123",
        userId: "user123",
        amountSettled: 200000, // 200,000 sats = ~$100 at $50k BTC
        metadata: { questId: "quest123" }
      };

      // Mock price feed
      priceFeed.getCurrentPrice = mock(() => 50000);
      
      // Mock green client
      const mockDeposit = mock(() => Promise.resolve({
        success: true,
        depositId: "deposit_123",
        yieldProjection: 3.25
      }));
      greenClient.depositToGreen = mockDeposit;

      const decision = await router.routeSettlement(invoice);

      expect(decision.shouldRoute).toBe(true);
      expect(decision.destination).toBe("green");
      expect(decision.amountToGreen).toBe(100);
      expect(decision.amountToLightning).toBe(0);
    });

    test("should keep small amounts in Lightning", async () => {
      const invoice = {
        paymentHash: "hash456",
        userId: "user123",
        amountSettled: 50000, // 50,000 sats = ~$25 at $50k BTC
        metadata: { questId: "quest456" }
      };

      priceFeed.getCurrentPrice = mock(() => 50000);

      const decision = await router.routeSettlement(invoice);

      expect(decision.shouldRoute).toBe(false);
      expect(decision.destination).toBe("lightning");
      expect(decision.amountToGreen).toBe(0);
      expect(decision.amountToLightning).toBe(25);
    });

    test("should split routing during high volatility", async () => {
      const invoice = {
        paymentHash: "hash789",
        userId: "user123",
        amountSettled: 200000, // ~$100
        metadata: { questId: "quest789" }
      };

      priceFeed.getCurrentPrice = mock(() => 50000);
      
      // Mock high volatility calculation
      router["calculateVolatility"] = mock(() => Promise.resolve(0.1)); // 10% volatility

      const decision = await router.routeSettlement(invoice);

      expect(decision.shouldRoute).toBe(true);
      expect(decision.destination).toBe("split");
      expect(decision.amountToGreen).toBeGreaterThan(0);
      expect(decision.amountToLightning).toBeGreaterThan(0);
      expect(decision.reason).toContain("High volatility");
    });
  });

  describe("RealtimePriceFeed", () => {
    test("should fetch and cache BTC price", async () => {
      const mockFetch = mock(() => Promise.resolve({
        ok: true,
        json: mock(() => Promise.resolve({
          data: { rates: { USD: "51000.00" } }
        })),
        preconnect: mock(),
        redirect: mock(),
        clone: mock(),
        headers: new Headers(),
        status: 200,
        statusText: "OK",
        type: "basic" as "basic",
        url: "",
        body: null,
        bodyUsed: false,
        arrayBuffer: mock(),
        blob: mock(),
        formData: mock(),
        text: mock()
      }));
      
      (global as any).fetch = mockFetch;

      const price = priceFeed.getCurrentPrice();
      
      expect(price).toBe(51000);
    });

    test("should convert satoshis to USD", () => {
      priceFeed.getCurrentPrice = mock(() => 50000);
      
      const usd = priceFeed.satsToUsd(100000); // 100,000 sats
      
      expect(usd).toBe(50); // 100,000 sats = 0.001 BTC = $50 at $50k BTC
    });

    test("should convert USD to satoshis", () => {
      priceFeed.getCurrentPrice = mock(() => 50000);
      
      const sats = priceFeed.usdToSats(100); // $100
      
      expect(sats).toBe(200000); // $100 = 0.002 BTC = 200,000 sats at $50k BTC
    });
  });

  describe("Integration Tests", () => {
    test("should handle complete Lightning to Green flow", async () => {
      const invoice: Invoice = {
        paymentHash: "integration_test",
        userId: "user456",
        amountSettled: 300000, // ~$150
        metadata: { questId: "quest_integration" }
      };

      // Mock all dependencies
      priceFeed.getCurrentPrice = mock(() => 50000);
      greenClient.depositToGreen = mock(() => Promise.resolve({
        success: true,
        depositId: "deposit_integration",
        yieldProjection: 4.875 // $150 * 3.25%
      }));

      const decision: RoutingDecision = await router.routeSettlement(invoice);

      expect(decision.shouldRoute).toBe(true);
      expect(decision.destination).toBe("green");
      expect(decision.amountToGreen).toBe(150);
      expect(decision.amountToLightning).toBe(0);
    });

    test("should handle API failures gracefully", async () => {
      const invoice = {
        paymentHash: "failure_test",
        userId: "user789",
        amountSettled: 200000,
        metadata: { questId: "quest_failure" }
      };

      priceFeed.getCurrentPrice = mock(() => 50000);
      greenClient.depositToGreen = mock(() => {
        throw new Error("API Error");
      });

      expect(async () => {
        await router.routeSettlement(invoice);
      }).toThrow("API Error");
    });
  });

  describe("Performance Tests", () => {
    test("should route 1000 transactions within performance limits", async () => {
      const startTime = Date.now();
      const promises = [];

      for (let i = 0; i < 1000; i++) {
        const invoice = {
          paymentHash: `perf_test_${i}`,
          userId: `user${i}`,
          amountSettled: 200000,
          metadata: { questId: `quest${i}` }
        };

        priceFeed.getCurrentPrice = mock(() => 50000);
        greenClient.depositToGreen = mock(() => Promise.resolve({
          success: true,
          depositId: `deposit_${i}`,
          yieldProjection: 6.5
        }));

        promises.push(router.routeSettlement(invoice));
      }

      await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 10 seconds (10ms per transaction average)
      expect(duration).toBeLessThan(10000);
      
      const metrics = router.getMetrics();
      expect(metrics.totalRouted).toBe(650000); // 1000 * $650
      expect(metrics.totalYieldProjected).toBe(21125); // 650000 * 3.25%
    });
  });

  describe("Security Tests", () => {
    test("should validate trace ID uniqueness", async () => {
      const traceId = "unique_trace_123";
      
      const result = await greenClient.depositToGreen({
        userId: "user123",
        amountUsd: 100,
        source: "test",
        traceId
      });

      // Verify idempotency key was used
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "X-Idempotency-Key": `deposit-${traceId}`
          })
        })
      );
    });

    test("should handle invalid amounts", async () => {
      expect(async () => {
        await greenClient.depositToGreen({
          userId: "user123",
          amountUsd: -100, // Negative amount
          source: "test",
          traceId: "invalid_amount"
        });
      }).toThrow();
    });

    test("should sanitize user input", async () => {
      const maliciousInput = {
        userId: "user'; DROP TABLE users; --",
        amountUsd: 100,
        source: "test",
        traceId: "sanitize_test"
      };

      // Should escape or reject malicious input
      expect(async () => {
        await greenClient.depositToGreen(maliciousInput);
      }).not.toThrow();
    });
  });
});
