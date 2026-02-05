import { beforeEach, describe, expect, mock, test } from "bun:test";
import { createServiceFactory, type FeatureFn } from "../../src/services/ServiceFactory";

beforeEach(() => {
  console.log = mock(() => {}); // Suppress factory logs during tests
});

describe("ServiceFactory - Performance Benchmarks", () => {
  test("service creation performance", () => {
    const iterations = 1000;
    const results: { [key: string]: number[] } = {
      api: [],
      logging: [],
      monitoring: [],
      notification: [],
      cache: [],
      phoneManager: [],
    };

    const factory = createServiceFactory();

    // Benchmark API service creation
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      factory.createApiService();
      const end = performance.now();
      results.api.push(end - start);
    }

    // Benchmark logging service creation
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      factory.createLoggingService();
      const end = performance.now();
      results.logging.push(end - start);
    }

    // Benchmark monitoring service creation
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      factory.createMonitoringService();
      const end = performance.now();
      results.monitoring.push(end - start);
    }

    // Benchmark notification service creation
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      factory.createNotificationService();
      const end = performance.now();
      results.notification.push(end - start);
    }

    // Benchmark cache service creation
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      factory.createCacheService();
      const end = performance.now();
      results.cache.push(end - start);
    }

    // Benchmark phone manager creation
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      factory.createPhoneManager();
      const end = performance.now();
      results.phoneManager.push(end - start);
    }

    // Calculate average times
    const averages = {
      api: results.api.reduce((a, b) => a + b, 0) / results.api.length,
      logging: results.logging.reduce((a, b) => a + b, 0) / results.logging.length,
      monitoring: results.monitoring.reduce((a, b) => a + b, 0) / results.monitoring.length,
      notification: results.notification.reduce((a, b) => a + b, 0) / results.notification.length,
      cache: results.cache.reduce((a, b) => a + b, 0) / results.cache.length,
      phoneManager: results.phoneManager.reduce((a, b) => a + b, 0) / results.phoneManager.length,
    };

    // All services should create quickly (under 1ms average)
    expect(averages.api).toBeLessThan(1);
    expect(averages.logging).toBeLessThan(1);
    expect(averages.monitoring).toBeLessThan(1);
    expect(averages.notification).toBeLessThan(1);
    expect(averages.cache).toBeLessThan(1);
    expect(averages.phoneManager).toBeLessThan(1);
  });

  test("feature flag resolution performance", () => {
    const iterations = 10000;
    const factory = createServiceFactory();

    // Create all services to test feature flag resolution
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();

      factory.createApiService();
      factory.createLoggingService();
      factory.createMonitoringService();
      factory.createNotificationService();
      factory.createCacheService();
      factory.createPhoneManager();

      const end = performance.now();
      const duration = end - start;

      // Each batch of 6 services should create quickly
      expect(duration).toBeLessThan(10);
    }
  });

  test("memory usage benchmark", () => {
    const iterations = 1000;
    const services: any[] = [];

    const factory = createServiceFactory();

    // Create many services to test memory usage
    for (let i = 0; i < iterations; i++) {
      services.push({
        api: factory.createApiService(),
        logging: factory.createLoggingService(),
        monitoring: factory.createMonitoringService(),
      });
    }

    // Should successfully create all services without running out of memory
    expect(services.length).toBe(iterations);
  });

  test("concurrent service creation", () => {
    const iterations = 100;
    const promises: Promise<any>[] = [];

    const factory = createServiceFactory();

    // Create services concurrently
    for (let i = 0; i < iterations; i++) {
      promises.push(Promise.resolve(factory.createApiService()));
      promises.push(Promise.resolve(factory.createLoggingService()));
      promises.push(Promise.resolve(factory.createMonitoringService()));
    }

    // All services should be created successfully
    expect(promises.length).toBe(iterations * 3);
  });

  test("service method execution performance", async () => {
    const iterations = 100;
    const mockFeature: FeatureFn = (flag) => flag === "FEAT_MOCK_API";
    const factory = createServiceFactory(mockFeature);

    const apiService = factory.createApiService();
    const loggingService = factory.createLoggingService();
    const monitoringService = factory.createMonitoringService();
    const cacheService = factory.createCacheService();

    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      // Call various service methods (using mock API)
      await apiService.request("/test");
      loggingService.log("test message");
      monitoringService.trackMetric("test", 100);
      cacheService.set("key", "value");
      cacheService.get("key");
    }

    const end = performance.now();
    const duration = end - start;

    // All method calls should complete quickly
    expect(duration).toBeLessThan(10000);
  });

  test("feature flag switching performance", () => {
    const iterations = 1000;
    const mockFeatures: Record<string, boolean> = {
      FEAT_MOCK_API: true,
      FEAT_EXTENDED_LOGGING: true,
      FEAT_ADVANCED_MONITORING: true,
      FEAT_PREMIUM: true,
      FEAT_CACHE_OPTIMIZED: true,
      FEAT_NOTIFICATIONS: true,
      PHONE_MULTI_ACCOUNT: true,
      PHONE_AUTOMATION_ENABLED: true,
      PHONE_ADVANCED_ANALYTICS: true,
      PHONE_BULK_OPERATIONS: true,
    };

    for (let i = 0; i < iterations; i++) {
      // Toggle some features
      mockFeatures.FEAT_PREMIUM = i % 2 === 0;
      mockFeatures.FEAT_NOTIFICATIONS = i % 3 === 0;

      const start = performance.now();

      const mockFeature: FeatureFn = (flag: string) => mockFeatures[flag] || false;
      const factory = createServiceFactory(mockFeature);

      // Create services with different feature combinations
      factory.createApiService();
      factory.createLoggingService();
      factory.createMonitoringService();

      const end = performance.now();
      const duration = end - start;

      // Feature switching should be fast
      expect(duration).toBeLessThan(5);
    }
  });

  test("bundle size impact simulation", () => {
    const allFeaturesDisabled: FeatureFn = () => false;
    const minimalFactory = createServiceFactory(allFeaturesDisabled);

    const minimalApi = minimalFactory.createApiService();
    const minimalLogging = minimalFactory.createLoggingService();
    const minimalMonitoring = minimalFactory.createMonitoringService();

    // Minimal services should not have feature-specific methods
    expect(minimalApi.simulateError).toBeUndefined();
    expect(minimalLogging.audit).toBeUndefined();
    expect(minimalMonitoring.calculateTrends).toBeUndefined();

    // Create a factory with all features enabled
    const allFeaturesEnabled: FeatureFn = () => true;
    const fullFactory = createServiceFactory(allFeaturesEnabled);

    const fullLogging = fullFactory.createLoggingService();
    const fullMonitoring = fullFactory.createMonitoringService();

    // Full services should have all methods
    expect(fullLogging.audit).toBeDefined();
    expect(fullMonitoring.calculateTrends).toBeDefined();
  });
});
