// test/R2AppleManager.test.ts
import { test, expect, describe } from "bun:test";
import { 
  exportAppleReceipt, 
  exportApplePayLogs, 
  exportApplePackage,
  type Dependencies 
} from "../src/utils/R2AppleManager";

/**
 * Create mock dependencies for R2 Apple Manager testing
 */
function createMockDeps(overrides: Partial<Dependencies> = {}): Dependencies {
  const mockCalls: Array<{ key: string; data: Uint8Array; options?: any }> = [];
  
  const mockS3Write = async (key: string, data: Uint8Array, options?: any) => {
    mockCalls.push({ key, data, options });
    return Promise.resolve();
  };

  const mockDeps: Dependencies = {
    feature: () => false,
    s3Write: mockS3Write,
    env: {},
    ...overrides,
  };

  // Attach mock calls array for test inspection
  (mockDeps as any)._mockCalls = mockCalls;
  
  return mockDeps;
}

/**
 * Extract mock calls from dependencies for test assertions
 */
function getMockCalls(deps: Dependencies): Array<{ key: string; data: Uint8Array; options?: any }> {
  return (deps as any)._mockCalls || [];
}

describe("R2 Apple Manager - Dependency Injection", () => {
  test("Premium users get timestamped Apple receipts", async () => {
    // Arrange: Create premium mock dependencies
    const mockDeps = createMockDeps({
      feature: (flag: string) => flag === "PREMIUM",
    });

    // Act: Export Apple receipt
    await exportAppleReceipt(
      "user789", 
      '{"receipt": "data", "transaction_id": "12345"}',
      mockDeps
    );

    // Assert: Check the R2 call
    const calls = getMockCalls(mockDeps);
    expect(calls).toHaveLength(1);
    
    const { key, options, data } = calls[0];
    expect(key).toContain("receipts/user789/premium-apple-receipt-");
    expect(key).toMatch(/premium-apple-receipt-\d+\.json$/);
    expect(options?.contentDisposition).toMatch(
      /^attachment; filename="premium-apple-receipt-\d+\.json"$/
    );
    expect(options?.contentType).toBe("application/json");
    expect(options?.metadata?.isPremium).toBe("true");
    
    // Check the receipt data
    const receiptContent = new TextDecoder().decode(data);
    expect(receiptContent).toContain('"receipt": "data"');
    expect(receiptContent).toContain('"transaction_id": "12345"');
  });

  test("Standard users get generic Apple receipts", async () => {
    // Arrange: Create standard mock dependencies
    const mockDeps = createMockDeps({
      feature: () => false, // No premium features
    });

    // Act: Export Apple receipt
    await exportAppleReceipt(
      "user456", 
      '{"receipt": "data"}',
      mockDeps
    );

    // Assert: Check the R2 call
    const calls = getMockCalls(mockDeps);
    expect(calls).toHaveLength(1);
    
    const { key, options } = calls[0];
    expect(key).toBe("receipts/user456/apple-receipt-user456.json");
    expect(options?.contentDisposition).toBe(
      'attachment; filename="apple-receipt-user456.json"'
    );
    expect(options?.metadata?.isPremium).toBe("false");
  });

  test("Apple Pay logs export with premium features", async () => {
    // Arrange: Create premium mock dependencies
    const mockDeps = createMockDeps({
      feature: (flag: string) => flag === "APPLE_PAY_PREMIUM",
    });

    const transactions = [
      { id: "txn_123", amount: 99.99, currency: "USD", timestamp: "2024-01-15T10:00:00Z" },
      { id: "txn_456", amount: 49.99, currency: "USD", timestamp: "2024-01-15T10:05:00Z" },
    ];

    // Act: Export Apple Pay logs
    await exportApplePayLogs("user123", transactions, mockDeps);

    // Assert: Check the R2 call
    const calls = getMockCalls(mockDeps);
    expect(calls).toHaveLength(1);
    
    const { key, data, options } = calls[0];
    expect(key).toContain("transactions/user123/premium-apple-pay-transactions-");
    expect(key).toMatch(/premium-apple-pay-transactions-\d+\.csv$/);
    expect(options?.contentType).toBe("text/csv");
    expect(options?.metadata?.transactionCount).toBe("2");
    
    // Check CSV content
    const csvContent = new TextDecoder().decode(data);
    expect(csvContent).toContain("id,amount,currency,timestamp");
    expect(csvContent).toContain("txn_123,99.99,USD,2024-01-15T10:00:00Z");
    expect(csvContent).toContain("txn_456,49.99,USD,2024-01-15T10:05:00Z");
  });

  test("Standard Apple Pay logs export", async () => {
    // Arrange: Create standard mock dependencies
    const mockDeps = createMockDeps({
      feature: () => false,
    });

    const transactions = [
      { id: "txn_789", amount: 19.99, currency: "USD", timestamp: "2024-01-15T11:00:00Z" },
    ];

    // Act: Export Apple Pay logs
    await exportApplePayLogs("user789", transactions, mockDeps);

    // Assert: Check the R2 call
    const calls = getMockCalls(mockDeps);
    expect(calls).toHaveLength(1);
    
    const { key } = calls[0];
    expect(key).toBe("transactions/user789/apple-pay-transactions-user789.csv");
  });

  test("Complete Apple package export", async () => {
    // Arrange: Create premium mock dependencies with all required flags
    const mockDeps = createMockDeps({
      feature: (flag: string) => {
        const flags: Record<string, boolean> = {
          "PREMIUM": true,
          "APPLE_PAY_PREMIUM": true,
        };
        return flags[flag] ?? false;
      },
    });

    const packageData = {
      receipt: '{"receipt": "data"}',
      transactions: [
        { id: "txn_pkg", amount: 29.99, currency: "USD", timestamp: "2024-01-15T12:00:00Z" },
      ],
      metadata: { deviceId: "device123", platform: "iOS" },
    };

    // Act: Export complete package
    await exportApplePackage("user999", packageData, mockDeps);

    // Assert: Check all R2 calls
    const calls = getMockCalls(mockDeps);
    expect(calls).toHaveLength(3); // receipt + transactions + metadata
    
    // Check receipt call
    expect(calls[0].key).toContain("receipts/user999/premium-apple-receipt-");
    
    // Check transactions call
    expect(calls[1].key).toContain("transactions/user999/premium-apple-pay-transactions-");
    
    // Check metadata call
    expect(calls[2].key).toContain("metadata/user999/premium-metadata-");
    const metadataContent = new TextDecoder().decode(calls[2].data);
    expect(metadataContent).toContain('"deviceId": "device123"');
    expect(metadataContent).toContain('"platform": "iOS"');
  });

  test("Feature flag integration works correctly", async () => {
    // Arrange: Create mock with multiple feature flags
    const mockDeps = createMockDeps({
      feature: (flag: string) => {
        const flags: Record<string, boolean> = {
          "PREMIUM": true,
          "APPLE_PAY_PREMIUM": true,
          "APPLE_INSIGHTS": false,
        };
        return flags[flag] ?? false;
      },
    });

    // Act: Export Apple receipt
    await exportAppleReceipt(
      "enterprise-user",
      '{"enterprise": true}',
      mockDeps
    );

    // Assert: Should get premium treatment
    const calls = getMockCalls(mockDeps);
    expect(calls).toHaveLength(1);
    
    const { key } = calls[0];
    expect(key).toContain("premium-apple-receipt-");
    expect(calls[0].options?.metadata?.isPremium).toBe("true");
  });

  test("Handles missing feature flag gracefully", async () => {
    // Arrange: Create mock that returns false for all flags
    const mockDeps = createMockDeps({
      feature: () => false,
    });

    // Act: Export Apple receipt
    await exportAppleReceipt(
      "user123",
      '{"receipt": "data"}',
      mockDeps
    );

    // Assert: Should get standard treatment
    const calls = getMockCalls(mockDeps);
    expect(calls).toHaveLength(1);
    
    const { key } = calls[0];
    expect(key).toBe("receipts/user123/apple-receipt-user123.json");
    expect(calls[0].options?.metadata?.isPremium).toBe("false");
  });

  test("Content-Disposition format validation", async () => {
    // Arrange: Create premium mock dependencies
    const mockDeps = createMockDeps({
      feature: (flag: string) => flag === "PREMIUM",
    });

    // Act: Export Apple receipt
    await exportAppleReceipt(
      "test-user",
      '{"test": true}',
      mockDeps
    );

    // Assert: Check content disposition format
    const calls = getMockCalls(mockDeps);
    const { options } = calls[0];
    
    // Should follow the pattern: attachment; filename="..."
    expect(options?.contentDisposition).toMatch(/^attachment; filename="[^"]+"$/);
    
    // Premium exports should include timestamp
    expect(options?.contentDisposition).toMatch(/premium-apple-receipt-\d+\.json"$/);
  });

  test("Environment variables are accessible", async () => {
    // Arrange: Create mock with environment
    const mockDeps = createMockDeps({
      env: { CF_ACCOUNT_ID: "test-account", ENVIRONMENT: "test" },
    });

    // Act: Export Apple receipt
    await exportAppleReceipt(
      "env-user",
      '{"env": "test"}',
      mockDeps
    );

    // Assert: Should work without errors
    const calls = getMockCalls(mockDeps);
    expect(calls).toHaveLength(1);
    expect(calls[0].key).toContain("receipts/env-user/");
  });
});
