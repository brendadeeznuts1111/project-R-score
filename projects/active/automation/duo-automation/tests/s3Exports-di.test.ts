// test/s3Exports-di.test.ts
import { test, expect, describe } from "bun:test";
import { uploadUserReport, uploadTenantExport, uploadDebugLogs, type Dependencies } from "../src/utils/s3Exports";

describe("S3 Exports - Dependency Injection Pattern", () => {
  test("Premium users get custom filenames with timestamps", async () => {
    // Arrange: Create isolated mock dependencies
    const mockCalls: Array<{ path: string; opts: any }> = [];
    
    const mockDeps: Dependencies = {
      feature: (flag: string) => flag === "PREMIUM",
      s3Write: async (_path: string, _data: Uint8Array, opts?: any) => {
        mockCalls.push({ path: _path, opts });
      },
      env: {},
    };

    // Act
    await uploadUserReport(
      "user123",
      "PRODUCTION",
      new TextEncoder().encode("{}"),
      mockDeps // Inject mocks
    );

    // Assert
    expect(mockCalls.length).toBe(1);
    const { opts } = mockCalls[0];
    
    expect(opts.contentDisposition).toMatch(
      /^attachment; filename="premium-export-\d+\.json"$/
    );
    expect(opts.contentDisposition).toContain("premium-export");
    expect(opts.contentType).toBe("application/json");
    expect(opts.cacheControl).toBe("max-age=3600");
  });

  test("Non-premium users get generic filenames", async () => {
    const mockCalls: Array<{ path: string; opts: any }> = [];
    
    const mockDeps: Dependencies = {
      feature: (_flag: string) => false, // Not premium
      s3Write: async (_path: string, _data: Uint8Array, opts?: any) => {
        mockCalls.push({ path: _path, opts });
      },
      env: {},
    };

    await uploadUserReport(
      "user456",
      "STAGING",
      new TextEncoder().encode("{}"),
      mockDeps
    );

    const { opts } = mockCalls[0];
    expect(opts.contentDisposition).toBe(
      'attachment; filename="STAGING-user-user456-report.json"'
    );
    expect(opts.cacheControl).toBe("max-age=300"); // STAGING cache
  });

  test("Development scope uses no-cache", async () => {
    const mockCalls: Array<{ path: string; opts: any }> = [];
    
    const mockDeps: Dependencies = {
      feature: () => false,
      s3Write: async (_path: string, _data: Uint8Array, opts?: any) => {
        mockCalls.push({ path: _path, opts });
      },
      env: {},
    };

    await uploadUserReport(
      "dev-user",
      "DEVELOPMENT",
      new TextEncoder().encode("{}"),
      mockDeps
    );

    const { opts } = mockCalls[0];
    expect(opts.cacheControl).toBe("no-cache");
    expect(opts.contentDisposition).toContain("DEVELOPMENT-user-dev-user-report.json");
  });

  test("Premium tenant export with feature flag", async () => {
    const mockCalls: Array<{ path: string; opts: any }> = [];
    
    const mockDeps: Dependencies = {
      feature: (flag: string) => flag === "PREMIUM",
      s3Write: async (_path: string, _data: Uint8Array, opts?: any) => {
        mockCalls.push({ path: _path, opts });
      },
      env: {},
    };

    await uploadTenantExport(
      new TextEncoder().encode("id,name\n1,John"),
      true, // isPremium
      mockDeps
    );

    const { opts } = mockCalls[0];
    expect(opts.contentDisposition).toMatch(
      /^attachment; filename="premium-export-\d+\.csv"$/
    );
    expect(opts.contentType).toBe("text/csv");
  });

  test("Standard tenant export gets generic attachment", async () => {
    const mockCalls: Array<{ path: string; opts: any }> = [];
    
    const mockDeps: Dependencies = {
      feature: () => false, // No premium features
      s3Write: async (_path: string, _data: Uint8Array, opts?: any) => {
        mockCalls.push({ path: _path, opts });
      },
      env: {},
    };

    await uploadTenantExport(
      new TextEncoder().encode("id,name\n1,Jane"),
      false, // Not premium
      mockDeps
    );

    const { opts } = mockCalls[0];
    expect(opts.contentDisposition).toBe("attachment");
    expect(opts.contentType).toBe("text/csv");
  });

  test("Debug logs inline in development", async () => {
    const mockCalls: Array<{ path: string; opts: any }> = [];
    
    const mockDeps: Dependencies = {
      feature: () => false,
      s3Write: async (_path: string, _data: Uint8Array, opts?: any) => {
        mockCalls.push({ path: _path, opts });
      },
      env: { SCOPE: "DEVELOPMENT" },
    };

    await uploadDebugLogs(
      new TextEncoder().encode("Debug log content"),
      mockDeps
    );

    const { opts } = mockCalls[0];
    expect(opts.contentDisposition).toBe("inline");
    expect(opts.contentType).toBe("text/plain");
  });

  test("Debug logs as attachment in production", async () => {
    const mockCalls: Array<{ path: string; opts: any }> = [];
    
    const mockDeps: Dependencies = {
      feature: () => false,
      s3Write: async (_path: string, _data: Uint8Array, opts?: any) => {
        mockCalls.push({ path: _path, opts });
      },
      env: { SCOPE: "PRODUCTION" },
    };

    await uploadDebugLogs(
      new TextEncoder().encode("Debug log content"),
      mockDeps
    );

    const { opts } = mockCalls[0];
    expect(opts.contentDisposition).toBe('attachment; filename="debug.log"');
    expect(opts.contentType).toBe("text/plain");
  });

  test("Feature flag integration works correctly", async () => {
    const mockCalls: Array<{ path: string; opts: any }> = [];
    
    // Mock multiple feature flags
    const mockDeps: Dependencies = {
      feature: (flag: string) => {
        const flags: Record<string, boolean> = {
          "PREMIUM": true,
          "ENTERPRISE": true,
          "DEVELOPMENT_TOOLS": false,
        };
        return flags[flag] ?? false;
      },
      s3Write: async (_path: string, _data: Uint8Array, opts?: any) => {
        mockCalls.push({ path: _path, opts });
      },
      env: {},
    };

    await uploadUserReport(
      "enterprise-user",
      "PRODUCTION",
      new TextEncoder().encode("{}"),
      mockDeps
    );

    const { opts } = mockCalls[0];
    expect(opts.contentDisposition).toContain("premium-export");
  });

  test("Handles missing feature flag gracefully", async () => {
    const mockCalls: Array<{ path: string; opts: any }> = [];
    
    const mockDeps: Dependencies = {
      feature: () => false, // Returns false for all flags
      s3Write: async (_path: string, _data: Uint8Array, opts?: any) => {
        mockCalls.push({ path: _path, opts });
      },
      env: {},
    };

    await uploadUserReport(
      "user123",
      "PRODUCTION",
      new TextEncoder().encode("{}"),
      mockDeps
    );

    const { opts } = mockCalls[0];
    expect(opts.contentDisposition).toBe(
      'attachment; filename="PRODUCTION-user-user123-report.json"'
    );
  });

  test("Content-Disposition format validation", async () => {
    const mockCalls: Array<{ path: string; opts: any }> = [];
    
    const mockDeps: Dependencies = {
      feature: (flag: string) => flag === "PREMIUM",
      s3Write: async (_path: string, _data: Uint8Array, opts?: any) => {
        mockCalls.push({ path: _path, opts });
      },
      env: {},
    };

    await uploadUserReport(
      "test-user",
      "PRODUCTION",
      new TextEncoder().encode("{}"),
      mockDeps
    );

    const { opts } = mockCalls[0];
    
    // Should follow the pattern: attachment; filename="..."
    expect(opts.contentDisposition).toMatch(/^attachment; filename="[^"]+"$/);
    
    // Premium exports should include timestamp
    if (opts.contentDisposition.includes("premium-export")) {
      expect(opts.contentDisposition).toMatch(/premium-export-\d+\.json"$/);
    }
  });
});
