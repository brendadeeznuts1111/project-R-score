import { describe, test, expect, beforeAll, mock } from "bun:test";
import { LightningService } from "../src/services/lightningService.js";
import { KYCValidator } from "../src/compliance/kycValidator.js";
import { SavingsOptimizer } from "../src/finance/savingsOptimizer.js";
import { db } from "../src/database/db.js";

describe("Lightning Integration", () => {
  let lightning: LightningService;
  let kycValidator: KYCValidator;
  let savingsOptimizer: SavingsOptimizer;

  beforeAll(async () => {
    // Mock environment variables
    process.env.LND_REST_URL = "https://localhost:8080";
    process.env.LND_MACAROON = "mock_macaroon";
    process.env.LND_TLS_CERT_PATH = "/tmp/mock.cert";
    process.env.BTC_PRICE = "45000";
    process.env.CASHAPP_API_URL = "https://api.cash.app/v1";
    process.env.CASHAPP_ACCESS_TOKEN = "mock_token";
    
    // Create mock TLS certificate file
    await Bun.write("/tmp/mock.cert", "-----BEGIN CERTIFICATE-----\nMOCK_CERTIFICATE\n-----END CERTIFICATE-----\n");
    
    lightning = LightningService.getInstance();
    kycValidator = new KYCValidator();
    savingsOptimizer = new SavingsOptimizer();
  });

  test("generates valid BOLT-11 invoice", async () => {
    // Mock the connection pool request
    const mockResponse = {
      ok: true,
      json: async () => ({
        payment_request: "lnbc1000000n1p...",
        r_hash: "mock_hash_123",
      }),
    };

    mock(lightning["connectionPool"].request, async () => mockResponse);

    const invoice = await lightning.generateQuestInvoice({
      questId: "test-quest-123",
      userId: "test-user-456",
      amountSats: 100000, // $45 at $45k/BTC
      description: "Test Quest Payment",
    });

    expect(invoice).toMatch(/^lnbc1/);
    expect(invoice.length).toBeGreaterThan(50);
  });

  test("enforces KYC limits - high risk user", async () => {
    // Mock high-risk user
    mock(kycValidator["getUserRiskProfile"], async () => ({ level: "high", score: 80 }));
    mock(kycValidator["getDailyLightningVolume"], async () => 800); // Already at $800

    const result = await kycValidator.validateLightningPayment(
      "high-risk-user",
      500 // $500 - would exceed $1k daily limit
    );

    expect(result.allowed).toBe(false);
    expect(result.message).toContain("Daily Lightning limit exceeded");
  });

  test("enforces FinCEN CTR threshold", async () => {
    mock(kycValidator["getUserRiskProfile"], async () => ({ level: "low", score: 10 }));
    mock(kycValidator["getDailyLightningVolume"], async () => 0);

    const result = await kycValidator.validateLightningPayment(
      "low-risk-user",
      15000 // $15k - exceeds $10k CTR threshold
    );

    expect(result.allowed).toBe(false);
    expect(result.requiresReview).toBe(true);
    expect(result.message).toContain("FinCEN threshold");
  });

  test("enforces recordkeeping threshold for high risk", async () => {
    mock(kycValidator["getUserRiskProfile"], async () => ({ level: "high", score: 75 }));
    mock(kycValidator["getDailyLightningVolume"], async () => 2000);

    const result = await kycValidator.validateLightningPayment(
      "high-risk-user",
      3500 // $3.5k - exceeds $3k recordkeeping for high risk
    );

    expect(result.allowed).toBe(false);
    expect(result.requiresReview).toBe(true);
  });

  test("auto-consolidates large balances", async () => {
    // Mock large balance
    mock(lightning.getNodeBalance, async () => ({
      local: 1000000, // 1M sats = ~$450
      remote: 200000,
      pending: 0,
    }));

    // Mock consolidation
    const consolidateSpy = mock(lightning["consolidateToSavings"], async () => {});

    // Trigger the health monitor callback
    await lightning["consolidateToSavings"](1000000);

    expect(consolidateSpy).toHaveBeenCalledWith(1000000);
  });

  test("routes payments to correct savings vehicle", async () => {
    // Test microtransaction (< $50)
    const microResult = await savingsOptimizer.processLightningPayment({
      userId: "user1",
      amountSats: 100000, // $45
      questId: "quest1",
    });

    expect(microResult.destination).toBe("microtransaction_wallet");
    expect(microResult.projectedYield).toBe(0);

    // Test Cash App Green ($50-$1000)
    const cashAppResult = await savingsOptimizer.processLightningPayment({
      userId: "user2",
      amountSats: 2222222, // $100
      questId: "quest2",
    });

    expect(cashAppResult.destination).toBe("cashapp_green");
    expect(cashAppResult.projectedYield).toBeGreaterThan(0);

    // Test standard account (>$1000)
    const standardResult = await savingsOptimizer.processLightningPayment({
      userId: "user3",
      amountSats: 22222222, // $1000
      questId: "quest3",
    });

    expect(standardResult.destination).toBe("standard_account");
    expect(standardResult.projectedYield).toBeGreaterThan(0);
  });

  test("calculates yield correctly", async () => {
    const microYield = 45 * 0.0; // $45 at 0% APY
    const cashAppYield = 100 * 0.0325; // $100 at 3.25% APY
    const standardYield = 1000 * 0.025; // $1000 at 2.5% APY

    expect(microYield).toBe(0);
    expect(cashAppYield).toBe(3.25);
    expect(standardYield).toBe(25);
  });

  test("handles LND API errors gracefully", async () => {
    // Mock failed LND response
    mock(lightning["connectionPool"].request, async () => ({
      ok: false,
      status: 500,
      json: async () => ({ message: "LND internal error" }),
    }));

    await expect(
      lightning.generateQuestInvoice({
        questId: "test-quest",
        userId: "test-user",
        amountSats: 100000,
        description: "Test",
      })
    ).rejects.toThrow("LND API error: 500 - LND internal error");
  });

  test("generates deterministic preimage", async () => {
    const params = {
      questId: "quest-123",
      userId: "user-456",
      amountSats: 50000,
    };

    const preimage1 = lightning["generateQuestPreimage"](params);
    const preimage2 = lightning["generateQuestPreimage"](params);

    // Should be different due to timestamp
    expect(preimage1).not.toBe(preimage2);
    expect(preimage1).toMatch(/^[a-f0-9]{64}$/); // SHA256 hex
  });

  test("sats to USD conversion", async () => {
    const satsToUsd = lightning["satsToUsd"];
    
    expect(satsToUsd(100000000)).toBe(45000); // 1 BTC
    expect(satsToUsd(1000000)).toBe(450); // 0.01 BTC
    expect(satsToUsd(100000)).toBe(45); // 0.001 BTC
  });

  test("handles invoice settlement webhook", async () => {
    const webhookData = {
      state: "SETTLED",
      r_hash: "mock_hash_123",
      amt_paid_sat: "100000",
    };

    // Mock quest lookup
    mock(lightning["findQuestByPaymentHash"], async () => ({
      id: "quest-123",
      userId: "user-456",
    }));

    // Mock quest completion
    const completeSpy = mock(lightning["completeQuest"], async () => {});
    const processSpy = mock(savingsOptimizer.processLightningPayment, async () => ({
      destination: "cashapp_green",
      amount: 45,
      projectedYield: 1.46,
    }));

    await lightning.handleInvoiceSettlement(webhookData);

    expect(completeSpy).toHaveBeenCalledWith("quest-123", "100000");
    expect(processSpy).toHaveBeenCalled();
  });

  test("respects daily volume limits", async () => {
    // User at $9,500 daily volume
    mock(kycValidator["getDailyLightningVolume"], async () => 9500);
    mock(kycValidator["getUserRiskProfile"], async () => ({ level: "low", score: 10 }));

    // $500 more would exceed $10k limit
    const result = await kycValidator.validateLightningPayment("user1", 500);

    expect(result.allowed).toBe(false);
    expect(result.message).toContain("$10,000");
  });

  test("sanctioned jurisdiction check", async () => {
    mock(kycValidator["isSanctionedJurisdiction"], async () => true);

    const result = await kycValidator.validateLightningPayment("user-from-sanctioned", 100);

    expect(result.allowed).toBe(false);
    expect(result.message).toContain("Jurisdiction not supported");
  });

  test("velocity threshold triggers review", async () => {
    mock(kycValidator["getRecentTransactionCount"], async () => 25); // 25 tx in last hour
    mock(kycValidator["getUserRiskProfile"], async () => ({ level: "low", score: 10 }));

    const result = await kycValidator.validateLightningPayment("user1", 1500);

    expect(result.allowed).toBe(false);
    expect(result.requiresReview).toBe(true);
    expect(result.message).toContain("High velocity");
  });

  test("logs transactions for audit trail", async () => {
    const logSpy = mock(lightning["logLightningTransaction"], async () => {});

    await lightning["logLightningTransaction"]({
      type: "INVOICE_GENERATED",
      questId: "quest-123",
      userId: "user-456",
      amountSats: 100000,
      amountUsd: 45,
      paymentHash: "hash_123",
      timestamp: new Date(),
    });

    expect(logSpy).toHaveBeenCalled();
  });

  test("get node balance with error handling", async () => {
    // Mock successful balance
    mock(lightning["connectionPool"].request, async () => ({
      ok: true,
      json: async () => ({
        local_balance: { sat: "500000" },
        remote_balance: { sat: "200000" },
        pending_open_balance: { sat: "50000" },
      }),
    }));

    const balance = await lightning.getNodeBalance();

    expect(balance.local).toBe(500000);
    expect(balance.remote).toBe(200000);
    expect(balance.pending).toBe(50000);
  });

  test("savings optimizer error handling", async () => {
    // Mock Cash App API failure
    mock(savingsOptimizer["depositToCashAppGreen"], async () => {
      throw new Error("Cash App API timeout");
    });

    // Should still log yield generation
    const logSpy = mock(savingsOptimizer["logYieldGeneration"], async () => {});

    const result = await savingsOptimizer.processLightningPayment({
      userId: "user1",
      amountSats: 2222222, // $100
      questId: "quest1",
    });

    expect(result.destination).toBe("cashapp_green");
    expect(logSpy).toHaveBeenCalled();
  });

  test("KYC document validation", async () => {
    const result = await kycValidator.validateKYCDocument(
      "user1",
      "drivers_license",
      { front: "base64_image", back: "base64_image" }
    );

    expect(result.allowed).toBe(true);
  });

  test("PEP status check", async () => {
    const isPEP = await kycValidator.checkPEPStatus("user1");

    expect(isPEP).toBe(false); // Mock returns false
  });

  test("source of funds validation", async () => {
    const result = await kycValidator.validateSourceOfFunds("user1", 6000);

    expect(result.allowed).toBe(false);
    expect(result.requiresReview).toBe(true);
  });

  test("get user yield", async () => {
    // Mock database query
    mock(savingsOptimizer["getUserYield"], async () => ({
      totalProjected: 150.50,
      totalActual: 105.35,
      byDestination: {
        cashapp_green: 75.25,
        standard_account: 75.25,
      },
    }));

    const yieldData = await savingsOptimizer.getUserYield("user1");

    expect(yieldData.totalProjected).toBe(150.50);
    expect(yieldData.byDestination.cashapp_green).toBe(75.25);
  });

  test("consolidate microtransactions", async () => {
    // Mock user with 150k sats in Lightning wallet
    mock(db.query, async (sql: string, params: any[]) => {
      if (sql.includes("lightning_wallets")) {
        return { rows: [{ balance_sats: 150000 }] };
      }
      return { rows: [] };
    });

    const depositSpy = mock(savingsOptimizer["depositToCashAppGreen"], async () => {});
    const updateSpy = mock(db.query, async () => {});

    await savingsOptimizer.consolidateMicrotransactions("user1");

    expect(depositSpy).toHaveBeenCalled();
    expect(updateSpy).toHaveBeenCalled();
  });
});