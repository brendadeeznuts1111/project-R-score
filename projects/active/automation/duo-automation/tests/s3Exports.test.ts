// test/s3Exports.test.ts
import { expect, test, describe, beforeEach, afterEach } from "bun:test";

// Mock S3 before importing the utilities
let capturedDisposition = "";
let mockS3Calls: Array<{path: string, data: Uint8Array, options?: any}> = [];

const mockS3 = {
  write: async (path: string, data: Uint8Array, options?: any) => {
    capturedDisposition = options?.contentDisposition ?? "";
    mockS3Calls.push({ path, data, options });
    return Promise.resolve();
  }
};

// Mock Bun.s3
const originalBun = globalThis.Bun;
globalThis.Bun = {
  ...originalBun,
  s3: mockS3
} as any;

// Now import the utilities after mocking
import { uploadUserReport, uploadTenantExport } from "../src/utils/s3Exports";

describe("S3 Exports - Premium Features", () => {
  beforeEach(() => {
    // Reset captures
    capturedDisposition = "";
    mockS3Calls = [];
    
    // Mock feature flags
    globalThis.feature = (flag: string) => flag === "PREMIUM";
  });

  afterEach(() => {
    // Clean up
    delete (globalThis as any).feature;
  });

  test("Premium users get custom filenames", async () => {
    const buffer = new TextEncoder().encode("{}");
    
    await uploadUserReport("user123", "PRODUCTION", buffer);
    
    expect(capturedDisposition).toContain("PRODUCTION-user-user123-report.json");
    expect(capturedDisposition).toContain("attachment");
    expect(capturedDisposition).toContain("filename");
  });

  test("Premium tenant export gets custom filename", async () => {
    const buffer = new TextEncoder().encode("id,name\n1,John");
    
    await uploadTenantExport(buffer, true);
    
    expect(capturedDisposition).toContain("premium-export");
    expect(capturedDisposition).toMatch(/^attachment; filename="premium-export-\d+\.csv"$/);
  });

  test("Standard users get generic attachment", async () => {
    const buffer = new TextEncoder().encode("id,name\n1,Jane");
    
    await uploadTenantExport(buffer, false);
    
    expect(capturedDisposition).toBe("attachment");
    expect(capturedDisposition).not.toContain("premium-export");
  });

  test("Feature flag integration works", async () => {
    // Test with premium feature flag
    globalThis.feature = (flag: string) => flag === "PREMIUM";
    
    const buffer = new TextEncoder().encode("test data");
    await uploadTenantExport(buffer, true);
    
    expect(capturedDisposition).toContain("premium-export");
  });

  test("User report includes scope and user ID", async () => {
    const buffer = new TextEncoder().encode('{"report": "data"}');
    
    await uploadUserReport("user456", "STAGING", buffer);
    
    expect(capturedDisposition).toBe('attachment; filename="STAGING-user-user456-report.json"');
  });

  test("Development scope uses no-cache", async () => {
    const buffer = new TextEncoder().encode('{"debug": true}');
    
    await uploadUserReport("dev-user", "DEVELOPMENT", buffer);
    
    expect(capturedDisposition).toContain("DEVELOPMENT-user-dev-user-report.json");
    expect(mockS3Calls[0].options?.cacheControl).toBe("no-cache");
  });

  test("Production scope uses max-age cache", async () => {
    const buffer = new TextEncoder().encode('{"prod": true}');
    
    await uploadUserReport("prod-user", "PRODUCTION", buffer);
    
    expect(mockS3Calls[0].options?.cacheControl).toBe("max-age=3600");
  });

  test("Content-Disposition format is valid", async () => {
    const buffer = new TextEncoder().encode("{}");
    
    await uploadUserReport("test", "PRODUCTION", buffer);
    
    // Should follow the pattern: attachment; filename="..."
    expect(capturedDisposition).toMatch(/^attachment; filename="[^"]+"$/);
  });
});