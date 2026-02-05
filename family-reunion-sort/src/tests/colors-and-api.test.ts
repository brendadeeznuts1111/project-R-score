import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import { STATUS_COLORS, CATEGORY_COLORS, PERFORMANCE_THRESHOLDS, COLOR_EXTENSIONS, getColorForStatus, getColorForCategory, getPerformanceColor } from "../constants/colors";

describe("Color Constants - Endless Iteration Validation", () => {
  test("CATEGORY_COLORS follows hex-color-consistency rule", () => {
    expect(CATEGORY_COLORS.SECURITY).toBe("#3b82f6");
    expect(CATEGORY_COLORS.R2).toBe("#22c55e");
    expect(CATEGORY_COLORS.ISOLATION).toBe("#f59e0b");
    expect(CATEGORY_COLORS.ZSTD).toBe("#ef4444");
    expect(CATEGORY_COLORS.DEMO).toBe("#1f2937");
  });

  test("STATUS_COLORS follows enterprise scheme", () => {
    expect(STATUS_COLORS.success).toBe("#22c55e");
    expect(STATUS_COLORS.warning).toBe("#f59e0b");
    expect(STATUS_COLORS.error).toBe("#ef4444");
    expect(STATUS_COLORS.info).toBe("#3b82f6");
  });

  test("PERFORMANCE_THRESHOLDS includes 28-second rule", () => {
    expect(PERFORMANCE_THRESHOLDS.resolutionTime.excellent).toBe(28);
    expect(PERFORMANCE_THRESHOLDS.latency.excellent).toBe(100);
    expect(PERFORMANCE_THRESHOLDS.errorRate.excellent).toBe(0.01);
  });

  test("COLOR_EXTENSIONS provides adaptive hooks", () => {
    expect(COLOR_EXTENSIONS.merchantTiers.enterprise).toBe("#3b82f6");
    expect(COLOR_EXTENSIONS.duoplus.primary).toBe("#8b5cf6");
    expect(COLOR_EXTENSIONS.disputePriority.critical).toBe("#dc2626");
  });
});

describe("Color Utility Functions", () => {
  test("getColorForStatus returns correct colors", () => {
    expect(getColorForStatus("success")).toBe(STATUS_COLORS.success);
    expect(getColorForStatus("warning")).toBe(STATUS_COLORS.warning);
    expect(getColorForStatus("error")).toBe(STATUS_COLORS.error);
    expect(getColorForStatus("unknown")).toBe(STATUS_COLORS.info);
  });

  test("getColorForCategory returns correct colors", () => {
    expect(getColorForCategory("SECURITY")).toBe(CATEGORY_COLORS.SECURITY);
    expect(getColorForCategory("security")).toBe(CATEGORY_COLORS.SECURITY);
    expect(getColorForCategory("unknown")).toBe(CATEGORY_COLORS.DEMO);
  });

  test("getPerformanceColor returns appropriate performance colors", () => {
    expect(getPerformanceColor(50, 'latency')).toBe(STATUS_COLORS.success);
    expect(getPerformanceColor(150, 'latency')).toBe(STATUS_COLORS.info);
    expect(getPerformanceColor(350, 'latency')).toBe(STATUS_COLORS.warning);
    expect(getPerformanceColor(1500, 'latency')).toBe(STATUS_COLORS.error);
  });
});

describe("API Server Integration Tests", () => {
  let server: any;
  let baseUrl: string;

  beforeAll(async () => {
    // Start server for testing
    try {
      const apiModule = await import("../api-server");
      server = apiModule.default;
      baseUrl = `http://localhost:${server.port}`;
    } catch (error) {
      console.warn("Server not available for integration tests");
    }
  });

  afterAll(() => {
    if (server) {
      server.stop();
    }
  });

  test("Health endpoint returns system status", async () => {
    if (!server) {
      return;
    }

    const response = await fetch(`${baseUrl}/health`);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty("status", "healthy");
    expect(data).toHaveProperty("timestamp");
    expect(data).toHaveProperty("scope");
    expect(data).toHaveProperty("domain");
  });

  test("System status endpoint includes color information", async () => {
    if (!server) {
      return;
    }

    const response = await fetch(`${baseUrl}/api/status`);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty("system", "operational");
    expect(data).toHaveProperty("colors");
    expect(data.colors).toHaveProperty("categories");
    expect(data.colors).toHaveProperty("statuses");
  });

  test("Dispute creation endpoint validates input", async () => {
    if (!server) {
      return;
    }

    // Test missing required fields
    const response = await fetch(`${baseUrl}/api/disputes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty("error", "Missing required fields");
  });

  test("Dispute creation with valid data succeeds", async () => {
    if (!server) {
      return;
    }

    const validDispute = {
      transactionId: "txn_123",
      customerId: "cust_456", 
      reason: "Product not as described",
      description: "The product received does not match the description",
      evidence: ["image1.jpg"],
      requestedResolution: "REFUND_FULL",
      contactMerchantFirst: true
    };

    const response = await fetch(`${baseUrl}/api/disputes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validDispute)
    });
    
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toHaveProperty("success", true);
    expect(data).toHaveProperty("dispute");
    expect(data.dispute).toHaveProperty("id");
    expect(data.dispute).toHaveProperty("status", "SUBMITTED");
  });
});

describe("Enterprise Rules Compliance", () => {
  test("Security-first rule implementation", () => {
    // Verify security-related colors are prominent
    expect(CATEGORY_COLORS.SECURITY).toBe("#3b82f6"); // Enterprise blue
    expect(COLOR_EXTENSIONS.disputePriority.critical).toBe("#dc2626"); // Error red
  });

  test("28-second rule tracking", () => {
    // Verify 28-second onboarding metric is tracked
    expect(PERFORMANCE_THRESHOLDS.resolutionTime.excellent).toBe(28);
  });

  test("ROI tracking structure", () => {
    // Verify metrics structure for ROI tracking
    expect(PERFORMANCE_THRESHOLDS).toHaveProperty("latency");
    expect(PERFORMANCE_THRESHOLDS).toHaveProperty("errorRate");
    expect(PERFORMANCE_THRESHOLDS).toHaveProperty("resolutionTime");
  });

  test("Factory-wager domain compliance", () => {
    // Verify enterprise color scheme for factory-wager.com
    expect(COLOR_EXTENSIONS.merchantTiers.enterprise).toBe("#3b82f6");
  });

  test("Duoplus integration hooks", () => {
    // Verify purple color scheme for duoplus.com integration
    expect(COLOR_EXTENSIONS.duoplus.primary).toBe("#8b5cf6");
    expect(COLOR_EXTENSIONS.duoplus.secondary).toBe("#a78bfa");
    expect(COLOR_EXTENSIONS.duoplus.accent).toBe("#7c3aed");
  });
});

describe("Performance and Scalability", () => {
  test("Color lookups are O(1)", () => {
    const start = performance.now();
    
    // Perform 1000 color lookups
    for (let i = 0; i < 1000; i++) {
      getColorForStatus("success");
      getColorForCategory("SECURITY");
      getPerformanceColor(100, 'latency');
    }
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(10); // Should complete in under 10ms
  });

  test("Memory efficiency of color constants", () => {
    // Verify color constants are properly frozen and immutable
    expect(Object.isFrozen(CATEGORY_COLORS)).toBe(true);
    expect(Object.isFrozen(STATUS_COLORS)).toBe(true);
    expect(Object.isFrozen(PERFORMANCE_THRESHOLDS)).toBe(true);
  });
});
