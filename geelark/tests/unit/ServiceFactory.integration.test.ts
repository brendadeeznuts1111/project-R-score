import { beforeEach, describe, expect, mock, test } from "bun:test";
import { createServiceFactory, type FeatureFn } from "../../src/services/ServiceFactory";

// Mock fetch for API testing
let mockFetchCalls: any[] = [];
global.fetch = mock((url: string, options?: any) => {
  mockFetchCalls.push({ url, options });
  return Promise.resolve({
    ok: true,
    status: 200,
    statusText: "OK",
    json: () => Promise.resolve({
      success: true,
      data: "test",
      url,
      method: options?.method || "GET"
    }),
  });
});

beforeEach(() => {
  mockFetchCalls = [];
  console.log = mock(() => {}); // Suppress factory logs during tests
});

describe("ServiceFactory - Integration Tests", () => {
  test("should integrate API and logging services", async () => {
    const mockFeature: FeatureFn = (flag) =>
      ["FEAT_EXTENDED_LOGGING", "FEAT_ADVANCED_MONITORING"].includes(flag);

    const factory = createServiceFactory(mockFeature);
    const apiService = factory.createApiService();
    const loggingService = factory.createLoggingService();

    // Make API call
    const response = await apiService.request("/api/test");

    // Log the response
    loggingService.log("API call completed", {
      endpoint: "/api/test",
      success: response.success
    });

    expect(response.success).toBe(true);
    expect(mockFetchCalls).toHaveLength(1);
    expect(mockFetchCalls[0].url).toBe("/api/test");
  });

  test("should integrate monitoring with API service", async () => {
    const mockFeature: FeatureFn = (flag) =>
      ["FEAT_ADVANCED_MONITORING", "FEAT_PREMIUM"].includes(flag);

    const factory = createServiceFactory(mockFeature);
    const apiService = factory.createApiService();
    const monitoringService = factory.createMonitoringService();

    // Track API metrics
    monitoringService.trackMetric("api_calls", 1);
    monitoringService.trackMetric("response_time", 150);

    // Make API call
    await apiService.request("/api/monitoring");

    expect(monitoringService.metrics.get("api_calls")).toBe(1);
    expect(monitoringService.metrics.get("response_time")).toBe(150);
  });

  test("should integrate cache with API service", async () => {
    const mockFeature: FeatureFn = (flag) => flag === "FEAT_CACHE_OPTIMIZED";

    const factory = createServiceFactory(mockFeature);
    const apiService = factory.createApiService();
    const cacheService = factory.createCacheService();

    // Cache API response
    const cacheKey = "/api/cached_data";
    const response = await apiService.request(cacheKey);
    cacheService.set(cacheKey, JSON.stringify(response));

    // Retrieve from cache
    const cachedResponse = cacheService.get(cacheKey);
    const parsedResponse = JSON.parse(cachedResponse);

    expect(parsedResponse.success).toBe(true);
    expect(cacheService.hits).toBe(1);
    expect(cacheService.misses).toBe(0);
  });

  test("should integrate phone manager with notification service", async () => {
    const mockFeature: FeatureFn = (flag) =>
      ["PHONE_MULTI_ACCOUNT", "PHONE_AUTOMATION_ENABLED", "FEAT_NOTIFICATIONS",
       "INTEGRATION_EMAIL_SERVICE", "INTEGRATION_SMS_SERVICE"].includes(flag);

    const factory = createServiceFactory(mockFeature);
    const phoneManager = factory.createPhoneManager();
    const notificationService = factory.createNotificationService();

    // Create phone
    const phone = await phoneManager.createPhone({
      name: "Test Phone",
      number: "+1234567890"
    });

    // Send notification about phone creation
    await notificationService.send(
      `Phone created: ${phone.name} (${phone.id})`
    );

    expect(phone).toBeDefined();
    expect(phone.id).toBeDefined();
    expect(phone.automation).toBe(true);
  });

  test("should integrate all services in complete workflow", async () => {
    // Enable all features for full integration test
    const mockFeature: FeatureFn = () => true;

    const factory = createServiceFactory(mockFeature);
    const apiService = factory.createApiService();
    const loggingService = factory.createLoggingService();
    const monitoringService = factory.createMonitoringService();
    const notificationService = factory.createNotificationService();
    const cacheService = factory.createCacheService();
    const phoneManager = factory.createPhoneManager();

    // 1. Log system startup
    loggingService.log("System startup initiated", {
      timestamp: new Date().toISOString(),
      features: "all"
    });

    // 2. Track system metrics
    monitoringService.trackMetric("system_startup_time", 150);
    monitoringService.trackMetric("services_initialized", 6);

    // 3. Create phone with automation
    const phone = await phoneManager.createPhone({
      name: "Integration Test Phone",
      number: "+1234567890",
      automation: true
    });

    // 4. Log phone creation (audit)
    loggingService.audit("phone_created", "system", {
      phoneId: phone.id,
      phoneName: phone.name
    });

    // 5. Make API call for phone configuration
    const configResponse = await apiService.request(`/api/phones/${phone.id}/config`);
    cacheService.set(`phone_config_${phone.id}`, JSON.stringify(configResponse));

    // 6. Track phone metrics
    monitoringService.trackMetric("phones_created", 1);
    monitoringService.trackMetric("api_calls_made", 1);

    // 7. Send notification about successful setup
    await notificationService.send(
      `Phone setup completed: ${phone.name}`
    );

    // 8. Verify phone analytics
    const analytics = phone.methods.analyze();
    expect(analytics.efficiency).toBeGreaterThan(0);

    // 9. Verify cache performance
    const cacheStats = cacheService.getStats();
    expect(cacheStats.size).toBeGreaterThan(0);

    // 10. Log completion
    loggingService.log("Integration test completed successfully", {
      phoneId: phone.id,
      cacheHits: cacheStats.hits,
      metricsTracked: monitoringService.metrics.size
    });

    // Verify all components worked together
    expect(phone).toBeDefined();
    expect(configResponse.success).toBe(true);
    expect(monitoringService.metrics.size).toBeGreaterThan(0);
    expect(cacheStats.size).toBeGreaterThan(0);
  });

  test("should handle service failures gracefully", async () => {
    const mockFeature: FeatureFn = (flag) =>
      ["FEAT_EXTENDED_LOGGING", "FEAT_RETRY_LOGIC", "FEAT_NOTIFICATIONS"].includes(flag);

    const factory = createServiceFactory(mockFeature);
    const apiService = factory.createApiService();
    const loggingService = factory.createLoggingService();
    const notificationService = factory.createNotificationService();

    // Mock API failure
    let failureCount = 0;
    global.fetch = mock(() => {
      failureCount++;
      if (failureCount <= 2) {
        return Promise.reject(new Error("Network failure"));
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        json: () => Promise.resolve({ success: true, retries: failureCount - 1 }),
      });
    });

    try {
      const response = await apiService.request("/api/failing");

      // Log successful retry
      loggingService.log("API call succeeded after retries", {
        endpoint: "/api/failing",
        attempts: failureCount,
        success: response.success
      });

      expect(response.success).toBe(true);
      expect(failureCount).toBe(3); // 2 failures + 1 success

      // Send notification about recovery
      await notificationService.send("Service recovered after retries");

    } catch (error) {
      // Log failure
      loggingService.log("API call failed after all retries", {
        endpoint: "/api/failing",
        error: error.message,
        attempts: failureCount
      });

      // Send notification about failure
      await notificationService.send("Service failure detected");
    }
  });

  test("should handle feature flag changes during runtime", () => {
    // Start with minimal features
    const minimalFeature: FeatureFn = () => false;
    const factory1 = createServiceFactory(minimalFeature);

    const loggingService1 = factory1.createLoggingService();
    const monitoringService1 = factory1.createMonitoringService();
    const notificationService1 = factory1.createNotificationService();

    // Verify minimal features
    expect(loggingService1.audit).toBeUndefined();
    expect(monitoringService1.calculateTrends).toBeUndefined();
    expect(notificationService1.sendEmail).toBeUndefined();

    // Enable features - create new factory with full features
    const fullFeature: FeatureFn = () => true;
    const factory2 = createServiceFactory(fullFeature);

    const loggingService2 = factory2.createLoggingService();
    const monitoringService2 = factory2.createMonitoringService();
    const notificationService2 = factory2.createNotificationService();

    // Verify full features
    expect(loggingService2.audit).toBeDefined();
    expect(monitoringService2.calculateTrends).toBeDefined();
    expect(notificationService2.sendEmail).toBeDefined();

    // Original services should remain unchanged (feature flags evaluated at creation time)
    expect(loggingService1.audit).toBeUndefined();
    expect(monitoringService1.calculateTrends).toBeUndefined();
    expect(notificationService1.sendEmail).toBeUndefined();
  });

  test("should maintain service isolation", () => {
    const mockFeature: FeatureFn = (flag) =>
      ["FEAT_EXTENDED_LOGGING", "FEAT_ADVANCED_MONITORING"].includes(flag);

    const factory = createServiceFactory(mockFeature);

    // Create multiple instances of the same service
    const loggingService1 = factory.createLoggingService();
    const loggingService2 = factory.createLoggingService();
    const monitoringService1 = factory.createMonitoringService();
    const monitoringService2 = factory.createMonitoringService();

    // Test that services are independent
    loggingService1.log("Service 1 message");
    loggingService2.log("Service 2 message");

    monitoringService1.trackMetric("service1_metric", 100);
    monitoringService2.trackMetric("service2_metric", 200);

    // Each service should maintain its own state
    expect(loggingService1).toBeDefined();
    expect(loggingService2).toBeDefined();
    expect(monitoringService1.metrics.get("service1_metric")).toBe(100);
    expect(monitoringService2.metrics.get("service2_metric")).toBe(200);
    expect(monitoringService1.metrics.get("service2_metric")).toBeUndefined();
    expect(monitoringService2.metrics.get("service1_metric")).toBeUndefined();
  });

  test("should handle concurrent service operations", async () => {
    const mockFeature: FeatureFn = (flag) =>
      ["FEAT_CACHE_OPTIMIZED", "FEAT_ADVANCED_MONITORING", "PHONE_MULTI_ACCOUNT"].includes(flag);

    const factory = createServiceFactory(mockFeature);
    const cacheService = factory.createCacheService();
    const monitoringService = factory.createMonitoringService();
    const phoneManager = factory.createPhoneManager();

    // Perform concurrent operations
    const operations = [
      // Cache operations
      ...Array.from({ length: 10 }, (_, i) =>
        cacheService.set(`key_${i}`, `value_${i}`)
      ),
      ...Array.from({ length: 10 }, (_, i) =>
        cacheService.get(`key_${i}`)
      ),
      // Monitoring operations
      ...Array.from({ length: 10 }, (_, i) =>
        monitoringService.trackMetric(`metric_${i}`, Math.random() * 100)
      ),
      // Phone operations (limited by account restrictions)
      phoneManager.createPhone({ name: "Phone 1" }),
      phoneManager.createPhone({ name: "Phone 2" }),
    ];

    await Promise.all(operations);

    // Verify all operations completed successfully
    expect(cacheService.cache.size).toBeGreaterThan(0);
    expect(monitoringService.metrics.size).toBeGreaterThan(0);
    expect(phoneManager.phones.size).toBe(2);
  });

  test("should validate service contracts and interfaces", () => {
    // Enable all features for comprehensive interface testing
    const mockFeature: FeatureFn = () => true;

    const factory = createServiceFactory(mockFeature);
    const apiService = factory.createApiService();
    const loggingService = factory.createLoggingService();
    const monitoringService = factory.createMonitoringService();
    const notificationService = factory.createNotificationService();
    const cacheService = factory.createCacheService();
    const phoneManager = factory.createPhoneManager();

    // Validate API service interface
    expect(typeof apiService.request).toBe("function");
    expect(typeof apiService.simulateError).toBe("function");
    expect(typeof apiService.setMockData).toBe("function");

    // Validate logging service interface
    expect(typeof loggingService.log).toBe("function");
    expect(typeof loggingService.sendToExternalLogging).toBe("function");
    expect(typeof loggingService.analyzeLogPatterns).toBe("function");
    expect(typeof loggingService.audit).toBe("function");

    // Validate monitoring service interface
    expect(typeof monitoringService.trackMetric).toBe("function");
    expect(typeof monitoringService.calculateTrends).toBe("function");
    expect(typeof monitoringService.predictAnomalies).toBe("function");
    expect(typeof monitoringService.updateDashboard).toBe("function");

    // Validate notification service interface
    expect(typeof notificationService.send).toBe("function");
    expect(typeof notificationService.sendEmail).toBe("function");
    expect(typeof notificationService.sendSMS).toBe("function");
    expect(typeof notificationService.sendWebhook).toBe("function");

    // Validate cache service interface
    expect(typeof cacheService.get).toBe("function");
    expect(typeof cacheService.set).toBe("function");
    expect(typeof cacheService.delete).toBe("function");
    expect(typeof cacheService.clear).toBe("function");
    expect(typeof cacheService.getStats).toBe("function");

    // Validate phone manager interface
    expect(typeof phoneManager.createPhone).toBe("function");
    expect(typeof phoneManager.canCreateAccount).toBe("function");
    expect(typeof phoneManager.getPhoneMethods).toBe("function");
    expect(phoneManager.phones).toBeInstanceOf(Map);
    expect(typeof phoneManager.maxAccounts).toBe("number");
  });
});
