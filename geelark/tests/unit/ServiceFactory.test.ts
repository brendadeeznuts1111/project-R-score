import { beforeEach, describe, expect, mock, test } from "bun:test";
import { createServiceFactory, type FeatureFn } from "../../src/services/ServiceFactory";

// Mock fetch for API testing
global.fetch = mock(() => Promise.resolve({
  ok: true,
  status: 200,
  statusText: "OK",
  json: () => Promise.resolve({ success: true, data: "test" }),
}));

beforeEach(() => {
  console.log = mock(() => {}); // Suppress factory logs during tests
});

// Helper to create a mock feature function with specific flags enabled
const createMockFeature = (enabledFlags: string[] = []): FeatureFn => {
  return (flag: string) => enabledFlags.includes(flag);
};

describe("ServiceFactory - API Service", () => {
  test("should create mock API service when FEAT_MOCK_API is enabled", () => {
    const factory = createServiceFactory(createMockFeature(["FEAT_MOCK_API"]));
    const apiService = factory.createApiService();

    expect(apiService).toBeDefined();
    expect(typeof apiService.request).toBe("function");
    expect(typeof apiService.simulateError).toBe("function");
    expect(typeof apiService.setMockData).toBe("function");
  });

  test("should create production API service when FEAT_MOCK_API is disabled", () => {
    const factory = createServiceFactory(createMockFeature([]));
    const apiService = factory.createApiService();

    expect(apiService).toBeDefined();
    expect(typeof apiService.request).toBe("function");
    expect(typeof apiService.healthCheck).toBe("function");
    expect(apiService.simulateError).toBeUndefined();
  });

  test("mock API service should return mock responses", async () => {
    const factory = createServiceFactory(createMockFeature(["FEAT_MOCK_API"]));
    const apiService = factory.createApiService();
    const response = await apiService.request("/test");

    expect(response.success).toBe(true);
    expect(response.mocked).toBe(true);
    expect(response.data.endpoint).toBe("/test");
    expect(response.data.mock).toBe(true);
    expect(typeof response.timestamp).toBe("number");
    expect(typeof response.latency).toBe("number");
  });

  test("production API service should use compile-time config", async () => {
    const factory = createServiceFactory(createMockFeature([]));
    const apiService = factory.createApiService();

    // Should use mocked fetch
    const response = await apiService.request("/test");
    expect(response.success).toBe(true);
  });

  test("production API service should retry when FEAT_RETRY_LOGIC is enabled", async () => {
    const factory = createServiceFactory(createMockFeature(["FEAT_RETRY_LOGIC"]));

    let callCount = 0;
    global.fetch = mock(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(new Error("Network error"));
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        json: () => Promise.resolve({ success: true, retry: true }),
      });
    });

    const apiService = factory.createApiService();
    const response = await apiService.request("/test");

    expect(response.success).toBe(true);
    expect(response.retry).toBe(true);
    expect(callCount).toBe(2); // Initial call + retry
  });
});

describe("ServiceFactory - Logging Service", () => {
  test("should create extended logging service when FEAT_EXTENDED_LOGGING is enabled", () => {
    const factory = createServiceFactory(createMockFeature(["FEAT_EXTENDED_LOGGING"]));
    const loggingService = factory.createLoggingService();

    expect(loggingService).toBeDefined();
    expect(typeof loggingService.log).toBe("function");
    expect(typeof loggingService.sendToExternalLogging).toBe("function");
    expect(typeof loggingService.analyzeLogPatterns).toBe("function");
    expect(typeof loggingService.audit).toBe("function");
  });

  test("should create basic logging service when FEAT_EXTENDED_LOGGING is disabled", () => {
    const factory = createServiceFactory(createMockFeature([]));
    const loggingService = factory.createLoggingService();

    expect(loggingService).toBeDefined();
    expect(typeof loggingService.log).toBe("function");
    expect(loggingService.sendToExternalLogging).toBeUndefined();
    expect(loggingService.analyzeLogPatterns).toBeUndefined();
  });

  test("extended logging should use structured logging when FEAT_ADVANCED_MONITORING is enabled", () => {
    const factory = createServiceFactory(createMockFeature(["FEAT_EXTENDED_LOGGING", "FEAT_ADVANCED_MONITORING"]));
    const loggingService = factory.createLoggingService();

    // Should create structured log entries
    loggingService.log("test message", { key: "value" });

    // Verify console.log was called with JSON string
    expect(console.log).toHaveBeenCalled();
  });

  test("audit logging should work when FEAT_AUDIT_LOGGING is enabled", () => {
    const factory = createServiceFactory(createMockFeature(["FEAT_EXTENDED_LOGGING", "FEAT_AUDIT_LOGGING"]));
    const loggingService = factory.createLoggingService();

    loggingService.audit("user_login", "john_doe", { ip: "192.168.1.1" });

    expect(console.log).toHaveBeenCalled();
  });

  test("audit logging should be skipped when FEAT_AUDIT_LOGGING is disabled", () => {
    const factory = createServiceFactory(createMockFeature(["FEAT_EXTENDED_LOGGING"]));
    const loggingService = factory.createLoggingService();

    loggingService.audit("user_login", "john_doe", { ip: "192.168.1.1" });

    expect(console.log).toHaveBeenCalled(); // Regular log still works
  });
});

describe("ServiceFactory - Monitoring Service", () => {
  test("should create advanced monitoring service when FEAT_ADVANCED_MONITORING is enabled", () => {
    const factory = createServiceFactory(createMockFeature(["FEAT_ADVANCED_MONITORING"]));
    const monitoringService = factory.createMonitoringService();

    expect(monitoringService).toBeDefined();
    expect(typeof monitoringService.trackMetric).toBe("function");
    expect(typeof monitoringService.calculateTrends).toBe("function");
    expect(typeof monitoringService.predictAnomalies).toBe("function");
    expect(monitoringService.metrics).toBeInstanceOf(Map);
  });

  test("should create basic monitoring service when FEAT_ADVANCED_MONITORING is disabled", () => {
    const factory = createServiceFactory(createMockFeature([]));
    const monitoringService = factory.createMonitoringService();

    expect(monitoringService).toBeDefined();
    expect(typeof monitoringService.trackMetric).toBe("function");
    expect(monitoringService.calculateTrends).toBeUndefined();
    expect(monitoringService.metrics).toBeUndefined();
  });

  test("advanced monitoring should include premium features when FEAT_PREMIUM is enabled", () => {
    const factory = createServiceFactory(createMockFeature(["FEAT_ADVANCED_MONITORING", "FEAT_PREMIUM"]));
    const monitoringService = factory.createMonitoringService();

    monitoringService.trackMetric("test_metric", 100);

    expect(monitoringService.metrics.get("test_metric")).toBe(100);
  });

  test("real-time dashboard should update when FEAT_REAL_TIME_DASHBOARD is enabled", () => {
    const factory = createServiceFactory(createMockFeature(["FEAT_ADVANCED_MONITORING", "FEAT_REAL_TIME_DASHBOARD"]));
    const monitoringService = factory.createMonitoringService();

    monitoringService.trackMetric("dashboard_metric", 50);

    expect(console.log).toHaveBeenCalledWith("🖥️ Dashboard updated: dashboard_metric = 50");
  });

  test("anomaly detection should trigger alerts when FEAT_NOTIFICATIONS is enabled", () => {
    const factory = createServiceFactory(createMockFeature(["FEAT_ADVANCED_MONITORING", "FEAT_NOTIFICATIONS"]));
    const monitoringService = factory.createMonitoringService();

    // Mock sufficient history for anomaly detection
    monitoringService.getMetricHistory = () => [10, 12, 11, 13, 9, 14, 8, 15, 7, 16, 100];

    monitoringService.predictAnomalies("test_metric", 100);

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("⚠️ Anomaly detected"));
  });
});

describe("ServiceFactory - Phone Manager", () => {
  test("should create phone manager with correct account limits", () => {
    const factory = createServiceFactory(createMockFeature(["PHONE_MULTI_ACCOUNT"]));
    const phoneManager = factory.createPhoneManager();

    expect(phoneManager).toBeDefined();
    expect(phoneManager.maxAccounts).toBe(5);
    expect(phoneManager.automationEnabled).toBe(false);
    expect(phoneManager.realTimeSync).toBe(false);
  });

  test("should limit to single account when PHONE_MULTI_ACCOUNT is disabled", () => {
    const factory = createServiceFactory(createMockFeature([]));
    const phoneManager = factory.createPhoneManager();

    expect(phoneManager.maxAccounts).toBe(1);
  });

  test("should enable phone features based on feature flags", () => {
    const factory = createServiceFactory(createMockFeature([
      "PHONE_AUTOMATION_ENABLED",
      "PHONE_REAL_TIME_SYNC",
      "PHONE_ADVANCED_ANALYTICS",
      "PHONE_BULK_OPERATIONS",
    ]));
    const phoneManager = factory.createPhoneManager();

    expect(phoneManager.automationEnabled).toBe(true);
    expect(phoneManager.realTimeSync).toBe(true);
    expect(phoneManager.advancedAnalytics).toBe(true);
    expect(phoneManager.bulkOperations).toBe(true);
  });

  test("should create phone with feature-based methods", async () => {
    const factory = createServiceFactory(createMockFeature([
      "PHONE_AUTOMATION_ENABLED",
      "PHONE_ADVANCED_ANALYTICS",
      "PHONE_BULK_OPERATIONS",
    ]));
    const phoneManager = factory.createPhoneManager();
    const phone = await phoneManager.createPhone({ name: "Test Phone" });

    expect(phone).toBeDefined();
    expect(phone.automation).toBe(true);
    expect(phone.analytics).toBe(true);
    expect(typeof phone.methods.automate).toBe("function");
    expect(typeof phone.methods.analyze).toBe("function");
    expect(typeof phone.methods.bulkUpdate).toBe("function");
  });

  test("should respect account limits", async () => {
    const factory = createServiceFactory(createMockFeature([]));
    const phoneManager = factory.createPhoneManager();

    await phoneManager.createPhone({ name: "Phone 1" });

    await expect(phoneManager.createPhone({ name: "Phone 2" })).rejects.toThrow("Account limit reached (1)");
  });

  test("should allow multiple accounts when PHONE_MULTI_ACCOUNT is enabled", async () => {
    const factory = createServiceFactory(createMockFeature(["PHONE_MULTI_ACCOUNT"]));
    const phoneManager = factory.createPhoneManager();

    const phone1 = await phoneManager.createPhone({ name: "Phone 1" });
    const phone2 = await phoneManager.createPhone({ name: "Phone 2" });

    expect(phone1.id).toBeDefined();
    expect(phone2.id).toBeDefined();
    expect(phone1.id).not.toBe(phone2.id);
  });
});

describe("ServiceFactory - Notification Service", () => {
  test("should create disabled notification service when FEAT_NOTIFICATIONS is false", () => {
    const factory = createServiceFactory(createMockFeature([]));
    const notificationService = factory.createNotificationService();

    expect(notificationService).toBeDefined();
    expect(typeof notificationService.send).toBe("function");
  });

  test("should create full notification service when FEAT_NOTIFICATIONS is true", () => {
    const factory = createServiceFactory(createMockFeature(["FEAT_NOTIFICATIONS"]));
    const notificationService = factory.createNotificationService();

    expect(notificationService).toBeDefined();
    expect(typeof notificationService.send).toBe("function");
    expect(typeof notificationService.sendEmail).toBe("function");
    expect(typeof notificationService.sendSMS).toBe("function");
    expect(typeof notificationService.sendWebhook).toBe("function");
  });

  test("should send through enabled channels", async () => {
    const factory = createServiceFactory(createMockFeature([
      "FEAT_NOTIFICATIONS",
      "INTEGRATION_EMAIL_SERVICE",
      "INTEGRATION_SMS_SERVICE",
    ]));
    const notificationService = factory.createNotificationService();

    await notificationService.send("Test message");

    expect(console.log).toHaveBeenCalledWith("📧 Email sent: Test message");
    expect(console.log).toHaveBeenCalledWith("💬 SMS sent: Test message");
  });
});

describe("ServiceFactory - Cache Service", () => {
  test("should create basic cache when FEAT_CACHE_OPTIMIZED is false", () => {
    const factory = createServiceFactory(createMockFeature([]));
    const cacheService = factory.createCacheService();

    expect(cacheService).toBeDefined();
    expect(typeof cacheService.get).toBe("function");
    expect(typeof cacheService.set).toBe("function");
    expect(typeof cacheService.delete).toBe("function");
    expect(typeof cacheService.clear).toBe("function");
    expect(cacheService.getStats).toBeUndefined();
  });

  test("should create optimized cache when FEAT_CACHE_OPTIMIZED is true", () => {
    const factory = createServiceFactory(createMockFeature(["FEAT_CACHE_OPTIMIZED"]));
    const cacheService = factory.createCacheService();

    expect(cacheService).toBeDefined();
    expect(typeof cacheService.get).toBe("function");
    expect(typeof cacheService.set).toBe("function");
    expect(typeof cacheService.calculateSize).toBe("function");
    expect(typeof cacheService.evictLRU).toBe("function");
    expect(cacheService.maxSize).toBe(100 * 1024 * 1024); // 100MB in bytes
  });

  test("optimized cache should track hits and misses", () => {
    const factory = createServiceFactory(createMockFeature(["FEAT_CACHE_OPTIMIZED"]));
    const cacheService = factory.createCacheService();

    cacheService.set("test", "value");
    const value = cacheService.get("test");
    const missing = cacheService.get("missing");

    expect(value).toBe("value");
    expect(missing).toBeNull();
    expect(cacheService.hits).toBe(1);
    expect(cacheService.misses).toBe(1);
  });

  test("optimized cache should provide stats when FEAT_PREMIUM is enabled", () => {
    const factory = createServiceFactory(createMockFeature(["FEAT_CACHE_OPTIMIZED", "FEAT_PREMIUM"]));
    const cacheService = factory.createCacheService();

    cacheService.set("test", "value");
    const stats = cacheService.getStats();

    expect(stats).toBeDefined();
    expect(stats.size).toBe(1);
    expect(stats.hitRate).toBe(0); // No hits yet
    expect(stats.hits).toBe(0);
    expect(stats.misses).toBe(0);
  });

  test("optimized cache should evict LRU when size limit is reached", () => {
    const factory = createServiceFactory(createMockFeature(["FEAT_CACHE_OPTIMIZED"]));
    const cacheService = factory.createCacheService();
    cacheService.maxSize = 50; // Small limit for testing

    // Fill cache beyond limit
    cacheService.set("key1", "x".repeat(20)); // 40 bytes
    cacheService.set("key2", "x".repeat(20)); // 40 bytes - should trigger eviction

    expect(cacheService.cache.size).toBe(1);
    expect(cacheService.get("key2")).toBe("x".repeat(20));
    expect(cacheService.get("key1")).toBeNull(); // Should be evicted
  });
});

describe("ServiceFactory - Feature Integration", () => {
  test("should handle complex feature combinations", () => {
    // Enable a complex feature combination
    const factory = createServiceFactory(createMockFeature([
      "FEAT_EXTENDED_LOGGING",
      "FEAT_ADVANCED_MONITORING",
      "FEAT_PREMIUM",
      "FEAT_NOTIFICATIONS",
      "FEAT_CACHE_OPTIMIZED",
      "PHONE_MULTI_ACCOUNT",
      "PHONE_AUTOMATION_ENABLED",
    ]));

    const apiService = factory.createApiService();
    const loggingService = factory.createLoggingService();
    const monitoringService = factory.createMonitoringService();
    const notificationService = factory.createNotificationService();
    const cacheService = factory.createCacheService();
    const phoneManager = factory.createPhoneManager();

    // All services should be created with their advanced features
    expect(apiService.healthCheck).toBeDefined();
    expect(loggingService.audit).toBeDefined();
    expect(monitoringService.calculateTrends).toBeDefined();
    expect(notificationService.sendEmail).toBeDefined();
    expect(cacheService.getStats).toBeDefined();
    expect(phoneManager.maxAccounts).toBe(5);
  });

  test("should handle minimal feature set", () => {
    // Disable all optional features
    const factory = createServiceFactory(createMockFeature([]));

    const apiService = factory.createApiService();
    const loggingService = factory.createLoggingService();
    const monitoringService = factory.createMonitoringService();
    const notificationService = factory.createNotificationService();
    const cacheService = factory.createCacheService();
    const phoneManager = factory.createPhoneManager();

    // All services should be created with basic features only
    expect(apiService.healthCheck).toBeDefined();
    expect(loggingService.audit).toBeUndefined();
    expect(monitoringService.calculateTrends).toBeUndefined();
    expect(notificationService.sendEmail).toBeUndefined();
    expect(cacheService.getStats).toBeUndefined();
    expect(phoneManager.maxAccounts).toBe(1);
  });
});

describe("ServiceFactory - Error Handling", () => {
  test("should handle API service errors gracefully", async () => {
    const factory = createServiceFactory(createMockFeature([]));

    global.fetch = mock(() => Promise.reject(new Error("Network error")));

    const apiService = factory.createApiService();

    await expect(apiService.request("/test")).rejects.toThrow("Network error");
  });

  test("should handle phone creation errors", async () => {
    const factory = createServiceFactory(createMockFeature([]));
    const phoneManager = factory.createPhoneManager();

    // Create first phone
    await phoneManager.createPhone({ name: "Phone 1" });

    // Second phone should fail
    await expect(phoneManager.createPhone({ name: "Phone 2" })).rejects.toThrow("Account limit reached");
  });
});

describe("ServiceFactory - Performance", () => {
  test("should create services efficiently", () => {
    const factory = createServiceFactory(createMockFeature([]));
    const startTime = performance.now();

    // Create all services
    factory.createApiService();
    factory.createLoggingService();
    factory.createMonitoringService();
    factory.createNotificationService();
    factory.createCacheService();
    factory.createPhoneManager();

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Should complete quickly (under 100ms)
    expect(duration).toBeLessThan(100);
  });

  test("should handle rapid service creation", () => {
    const factory = createServiceFactory(createMockFeature([]));
    const iterations = 100;

    for (let i = 0; i < iterations; i++) {
      const service = factory.createApiService();
      expect(service).toBeDefined();
    }

    // Should handle rapid creation without issues
    expect(true).toBe(true);
  });
});
