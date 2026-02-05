#!/usr/bin/env bun

import { feature } from "bun:bundle";
import { describe, expectTypeOf, it } from "bun:test";

describe("Advanced expectTypeOf Examples", () => {
  it("should test data structure types", () => {
    interface CodeInsight {
      file: string;
      line: number;
      insight: string;
      severity: "info" | "warning" | "error";
    }

    interface SystemStats {
      healthScore: number;
      uptime: number;
      memoryUsage: number;
      errorCount: number;
    }

    interface AnalysisData {
      stats: SystemStats;
      files: CodeInsight[];
      timestamp: Date;
    }

    // Mock data structure
    const data: AnalysisData = {
      stats: {
        healthScore: 95,
        uptime: 3600,
        memoryUsage: 65,
        errorCount: 2,
      },
      files: [
        {
          file: "src/index.ts",
          line: 42,
          insight: "Potential optimization opportunity",
          severity: "info",
        },
        {
          file: "src/utils.ts",
          line: 15,
          insight: "Unused import detected",
          severity: "warning",
        },
      ],
      timestamp: new Date(),
    };

    // Test the specific examples you provided
    expectTypeOf(data.stats.healthScore).toBeNumber();
    expectTypeOf(data.files).toBeArray();
    expectTypeOf(data.files[0]).toMatchTypeOf<CodeInsight>();
  });

  it("should test feature flag types", () => {
    // Test that feature flags return booleans in conditional contexts
    if (feature("DEV_UI")) {
      const devUI = {
        enabled: true,
        debugMode: true,
        inspector: () => "inspector active",
      };
      expectTypeOf(devUI.enabled).toBeBoolean();
      expectTypeOf(devUI.debugMode).toBeBoolean();
      expectTypeOf(devUI.inspector).toBeFunction();
    }
  });

  it("should test HTTP response types", () => {
    interface APIResponse<T> {
      data: T;
      status: number;
      headers: Headers;
      timestamp: string;
    }

    // Mock response
    const res: APIResponse<{ message: string }> = {
      data: { message: "Success" },
      status: 200,
      headers: new Headers({
        "content-type": "application/json",
        "x-request-id": "req-123",
      }),
      timestamp: new Date().toISOString(),
    };

    // Test the specific examples you provided
    expectTypeOf(res.headers.get("content-type")).toBeString();
    expectTypeOf(res.headers.get("x-request-id")).toBeString();

    // Additional header type tests
    expectTypeOf(res.headers.get("non-existent")).toBeString();
    expectTypeOf(res.headers.get("content-type")).toBeString();
  });

  it("should test complex nested types with features", () => {
    interface PremiumAnalytics {
      advancedMetrics: {
        cpuUsage: number;
        memoryPressure: number;
        responseTime: number;
      };
      alerts: Array<{
        level: "info" | "warning" | "critical";
        message: string;
        timestamp: Date;
      }>;
    }

    interface BasicAnalytics {
      basicMetrics: {
        uptime: number;
        errorCount: number;
      };
    }

    let analytics: BasicAnalytics;

    if (feature("FEAT_PREMIUM")) {
      analytics = {
        basicMetrics: {
          uptime: 3600,
          errorCount: 2,
        },
        advancedMetrics: {
          cpuUsage: 45,
          memoryPressure: 0.3,
          responseTime: 120,
        },
        alerts: [
          {
            level: "info",
            message: "System running normally",
            timestamp: new Date(),
          },
        ],
      } as BasicAnalytics & PremiumAnalytics;

      // Type tests for premium features
      expectTypeOf(analytics.advancedMetrics.cpuUsage).toBeNumber();
      expectTypeOf(analytics.advancedMetrics).toMatchObjectType<{
        cpuUsage: number;
        memoryPressure: number;
        responseTime: number;
      }>();
      expectTypeOf(analytics.alerts).toBeArray();
      expectTypeOf(analytics.alerts[0]).toMatchObjectType<{
        level: "info" | "warning" | "critical";
        message: string;
        timestamp: Date;
      }>();
    } else {
      analytics = {
        basicMetrics: {
          uptime: 3600,
          errorCount: 2,
        },
      };
    }

    // Basic type tests (always available)
    expectTypeOf(analytics.basicMetrics.uptime).toBeNumber();
    expectTypeOf(analytics.basicMetrics.errorCount).toBeNumber();
  });

  it("should test function return types", () => {
    type DataProcessor = (input: unknown) => {
      processed: boolean;
      result?: string;
      error?: string;
    };

    const processData: DataProcessor = (input) => {
      if (typeof input === "string") {
        return { processed: true, result: input.toUpperCase() };
      } else if (input === null) {
        return { processed: false, error: "Null input not allowed" };
      } else {
        return { processed: false };
      }
    };

    const result1 = processData("hello");
    const result2 = processData(null);
    const result3 = processData(42);

    expectTypeOf(processData).toBeFunction();
    expectTypeOf(result1.processed).toBeBoolean();
    expectTypeOf(result1.result).toBeString();
    expectTypeOf(result2.error).toBeString();
    expectTypeOf(result3.processed).toBeBoolean();
  });

  it("should test generic type constraints", () => {
    interface ConfigurableService<T extends Record<string, any>> {
      config: T;
      initialize: () => Promise<void>;
      getStatus: () => "running" | "stopped" | "error";
    }

    type DatabaseConfig = {
      host: string;
      port: number;
      ssl: boolean;
    };

    type CacheConfig = {
      ttl: number;
      maxSize: number;
      strategy: "lru" | "fifo";
    };

    // Mock services
    const dbService: ConfigurableService<DatabaseConfig> = {
      config: {
        host: "localhost",
        port: 5432,
        ssl: true,
      },
      initialize: async () => {},
      getStatus: () => "running",
    };

    const cacheService: ConfigurableService<CacheConfig> = {
      config: {
        ttl: 3600,
        maxSize: 1000,
        strategy: "lru",
      },
      initialize: async () => {},
      getStatus: () => "running",
    };

    // Type tests
    expectTypeOf(dbService.config.host).toBeString();
    expectTypeOf(dbService.config.port).toBeNumber();
    expectTypeOf(dbService.config.ssl).toBeBoolean();
    expectTypeOf(dbService.initialize).toBeFunction();
    expectTypeOf(dbService.getStatus()).toEqualTypeOf<
      "running" | "stopped" | "error"
    >();

    expectTypeOf(cacheService.config.ttl).toBeNumber();
    expectTypeOf(cacheService.config.maxSize).toBeNumber();
    expectTypeOf(cacheService.config.strategy).toEqualTypeOf<"lru" | "fifo">();
  });
});
