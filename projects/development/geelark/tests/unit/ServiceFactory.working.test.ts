import { beforeEach, describe, expect, mock, test } from "bun:test";
import { createServiceFactory } from "../../src/services/ServiceFactory";

// Mock fetch for API testing
const mockResponse = {
  ok: true,
  status: 200,
  statusText: "OK",
  json: () => Promise.resolve({ success: true, data: "test" }),
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
  blob: () => Promise.resolve(new Blob()),
  formData: () => Promise.resolve(new FormData()),
  text: () => Promise.resolve("test"),
  bytes: () => Promise.resolve(new Uint8Array()),
  preconnect: () => Promise.resolve(),
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => {},
  abort: () => {},
  clone: () => mockResponse,
  body: null,
  bodyUsed: false,
  headers: new Headers(),
  redirected: false,
  trailer: Promise.resolve(new Headers()),
  type: "basic" as ResponseType,
  url: "",
} as unknown as Response;

// Create a complete fetch mock
const mockFetch = Object.assign(
  mock(() => Promise.resolve(mockResponse)),
  {
    preconnect: () => Promise.resolve(),
  }
);

global.fetch = mockFetch as typeof fetch;

// Mock console to suppress logs during tests
beforeEach(() => {
  console.log = mock(() => {});
});

describe("ServiceFactory - Basic Functionality", () => {
  test("should create all service types", () => {
    const factory = createServiceFactory();

    // Test that all factory methods exist and return objects
    const apiService = factory.createApiService();
    const loggingService = factory.createLoggingService();
    const monitoringService = factory.createMonitoringService();
    const notificationService = factory.createNotificationService();
    const cacheService = factory.createCacheService();
    const phoneManager = factory.createPhoneManager();

    // All services should be defined
    expect(apiService).toBeDefined();
    expect(loggingService).toBeDefined();
    expect(monitoringService).toBeDefined();
    expect(notificationService).toBeDefined();
    expect(cacheService).toBeDefined();
    expect(phoneManager).toBeDefined();

    // All services should have basic methods
    expect(typeof apiService.request).toBe("function");
    expect(typeof loggingService.log).toBe("function");
    expect(typeof monitoringService.trackMetric).toBe("function");
    expect(typeof notificationService.send).toBe("function");
    expect(typeof cacheService.get).toBe("function");
    expect(typeof phoneManager.createPhone).toBe("function");
  });

  test("API service should make requests", async () => {
    const factory = createServiceFactory();
    const apiService = factory.createApiService();
    const response = await apiService.request("/test");

    expect(response.success).toBe(true);
    expect(response.data).toBe("test");
  });

  test("logging service should log messages", () => {
    const factory = createServiceFactory();
    const loggingService = factory.createLoggingService();
    loggingService.log("test message");

    expect(console.log).toHaveBeenCalled();
  });

  test("monitoring service should track metrics", () => {
    const factory = createServiceFactory();
    const monitoringService = factory.createMonitoringService();
    monitoringService.trackMetric("test_metric", 100);

    expect(console.log).toHaveBeenCalled();
  });

  test("notification service should send notifications", async () => {
    const factory = createServiceFactory();
    const notificationService = factory.createNotificationService();
    await notificationService.send("test notification");

    expect(console.log).toHaveBeenCalled();
  });

  test("cache service should store and retrieve values", () => {
    const factory = createServiceFactory();
    const cacheService = factory.createCacheService();
    cacheService.set("test_key", "test_value");
    const value = cacheService.get("test_key");

    expect(value).toBe("test_value");
  });

  test("phone manager should create phones", async () => {
    const factory = createServiceFactory();
    const phoneManager = factory.createPhoneManager();
    const phone = await phoneManager.createPhone({ name: "Test Phone" });

    expect(phone).toBeDefined();
    expect(phone.name).toBe("Test Phone");
    expect(phone.id).toBeDefined();
  });

  test("phone manager should enforce account limits", async () => {
    const factory = createServiceFactory();
    const phoneManager = factory.createPhoneManager();

    // Create first phone
    await phoneManager.createPhone({ name: "Phone 1" });

    // Second phone should fail due to account limit
    await expect(phoneManager.createPhone({ name: "Phone 2" })).rejects.toThrow("Account limit reached");
  });
});

describe("ServiceFactory - Service Methods", () => {
  test("API service should have health check", () => {
    const factory = createServiceFactory();
    const apiService = factory.createApiService();
    expect(typeof apiService.healthCheck).toBe("function");
  });

  test("phone manager should have method factory", () => {
    const factory = createServiceFactory();
    const phoneManager = factory.createPhoneManager();
    expect(typeof phoneManager.getPhoneMethods).toBe("function");
  });

  test("cache service should have clear method", () => {
    const factory = createServiceFactory();
    const cacheService = factory.createCacheService();
    expect(typeof cacheService.clear).toBe("function");
  });

  test("monitoring service should handle metric tracking", () => {
    const factory = createServiceFactory();
    const monitoringService = factory.createMonitoringService();

    // Track multiple metrics
    monitoringService.trackMetric("cpu_usage", 75.5);
    monitoringService.trackMetric("memory_usage", 1024);
    monitoringService.trackMetric("response_time", 150);

    // Should not throw errors
    expect(true).toBe(true);
  });

  test("notification service should handle async sending", async () => {
    const factory = createServiceFactory();
    const notificationService = factory.createNotificationService();

    // Should not throw errors
    await expect(notificationService.send("Async test message")).resolves.toBeUndefined();
  });
});

describe("ServiceFactory - Error Handling", () => {
  test("API service should handle fetch errors", async () => {
    // Mock fetch to reject
    const errorFetch = Object.assign(
      mock(() => Promise.reject(new Error("Network error"))),
      {
        preconnect: () => Promise.resolve(),
      }
    );
    global.fetch = errorFetch as typeof fetch;

    const factory = createServiceFactory();
    const apiService = factory.createApiService();

    await expect(apiService.request("/error-test")).rejects.toThrow("Network error");
  });

  test("cache service should handle missing keys", () => {
    const factory = createServiceFactory();
    const cacheService = factory.createCacheService();
    const value = cacheService.get("nonexistent_key");

    expect(value).toBeNull();
  });

  test("phone manager should validate phone creation", async () => {
    const factory = createServiceFactory();
    const phoneManager = factory.createPhoneManager();

    // Should create phone with valid config
    const phone = await phoneManager.createPhone({
      name: "Valid Phone",
      number: "+1234567890"
    });

    expect(phone).toBeDefined();
    expect(phone.name).toBe("Valid Phone");
  });
});

describe("ServiceFactory - Performance", () => {
  test("should create services quickly", () => {
    const factory = createServiceFactory();
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

    // Should complete in reasonable time
    expect(duration).toBeLessThan(100);
  });

  test("should handle multiple service creations", () => {
    const factory = createServiceFactory();
    const iterations = 10;

    for (let i = 0; i < iterations; i++) {
      const service = factory.createApiService();
      expect(service).toBeDefined();
    }
  });

  test("should handle concurrent service creation", async () => {
    const factory = createServiceFactory();
    const promises = [
      Promise.resolve(factory.createApiService()),
      Promise.resolve(factory.createLoggingService()),
      Promise.resolve(factory.createMonitoringService()),
    ];

    const results = await Promise.all(promises);

    expect(results).toHaveLength(3);
    results.forEach(service => {
      expect(service).toBeDefined();
    });
  });
});

describe("ServiceFactory - Integration", () => {
  test("should work with service combinations", async () => {
    const factory = createServiceFactory();

    // Reset fetch mock for this test
    const integrationMockResponse = {
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve({ success: true, data: "test" }),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      blob: () => Promise.resolve(new Blob()),
      formData: () => Promise.resolve(new FormData()),
      text: () => Promise.resolve("test"),
      bytes: () => Promise.resolve(new Uint8Array()),
      preconnect: () => Promise.resolve(),
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
      abort: () => {},
      clone: () => ({} as Response),
      body: null,
      bodyUsed: false,
      headers: new Headers(),
      redirected: false,
      trailer: Promise.resolve(new Headers()),
      type: "basic" as ResponseType,
      url: "",
    } as unknown as Response;

    const integrationFetch = Object.assign(
      mock(() => Promise.resolve(integrationMockResponse)),
      {
        preconnect: () => Promise.resolve(),
      }
    );
    global.fetch = integrationFetch as typeof fetch;

    const apiService = factory.createApiService();
    const loggingService = factory.createLoggingService();
    const cacheService = factory.createCacheService();

    // Make API call
    const response = await apiService.request("/api/test");

    // Log the response
    loggingService.log("API call completed", { success: response.success });

    // Cache the response
    cacheService.set("api_response", JSON.stringify(response));

    // Retrieve from cache
    const cachedResponse = cacheService.get("api_response");
    const parsedResponse = JSON.parse(cachedResponse);

    expect(parsedResponse.success).toBe(true);
    expect(console.log).toHaveBeenCalled();
  });

  test("should handle phone manager with other services", async () => {
    const factory = createServiceFactory();
    const phoneManager = factory.createPhoneManager();
    const loggingService = factory.createLoggingService();

    // Create phone
    const phone = await phoneManager.createPhone({
      name: "Integration Phone",
      number: "+1234567890"
    });

    // Log phone creation
    loggingService.log("Phone created", { phoneId: phone.id });

    expect(phone).toBeDefined();
    expect(phone.id).toBeDefined();
    expect(console.log).toHaveBeenCalled();
  });

  test("should maintain service isolation", () => {
    const factory = createServiceFactory();
    const loggingService1 = factory.createLoggingService();
    const loggingService2 = factory.createLoggingService();
    const monitoringService1 = factory.createMonitoringService();
    const monitoringService2 = factory.createMonitoringService();

    // Services should be independent
    loggingService1.log("Service 1 message");
    loggingService2.log("Service 2 message");

    // Both should work independently
    expect(loggingService1).toBeDefined();
    expect(loggingService2).toBeDefined();
    expect(monitoringService1).toBeDefined();
    expect(monitoringService2).toBeDefined();
  });
});
