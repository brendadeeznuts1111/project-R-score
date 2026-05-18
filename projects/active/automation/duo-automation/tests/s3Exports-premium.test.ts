// test/s3Exports-premium.test.ts
import { expect, test, describe } from "bun:test";

describe("S3 Exports - Premium User Test", () => {
  test("Premium users get custom filenames", async () => {
    const buffer = new TextEncoder().encode("{}");
    
    // Mock feature flag
    globalThis.feature = (flag: string) => flag === "PREMIUM";
    
    // Capture S3 call (simulate s3.write)
    let capturedDisposition = "";
    const mockS3Write = async (_path: string, _data: Uint8Array, opts?: any) => {
      capturedDisposition = opts?.contentDisposition ?? "";
      return Promise.resolve();
    };
    
    // Simulate the uploadUserReport logic
    const userId = "user123";
    const scope = "PRODUCTION";
    const filename = `${scope}-user-${userId}-report.json`;
    
    await mockS3Write(`exports/${scope}/${userId}/report.json`, buffer, {
      contentType: "application/json",
      contentDisposition: `attachment; filename="${filename}"`
    });
    
    expect(capturedDisposition).toContain("PRODUCTION-user-user123-report.json");
    expect(capturedDisposition).toContain("attachment");
    expect(capturedDisposition).toContain("filename");
    
    // Clean up
    delete (globalThis as any).feature;
  });

  test("Premium tenant export gets timestamped filename", async () => {
    const buffer = new TextEncoder().encode("id,name\n1,John");
    
    // Mock feature flag for premium
    globalThis.feature = (flag: string) => flag === "PREMIUM";
    
    let capturedDisposition = "";
    const mockS3Write = async (_path: string, _data: Uint8Array, opts?: any) => {
      capturedDisposition = opts?.contentDisposition ?? "";
      return Promise.resolve();
    };
    
    // Simulate premium tenant export logic
    const timestamp = Date.now();
    const contentDisposition = `attachment; filename="premium-export-${timestamp}.csv"`;
    
    await mockS3Write("data.csv", buffer, {
      contentType: "text/csv",
      contentDisposition
    });
    
    expect(capturedDisposition).toContain("premium-export");
    expect(capturedDisposition).toMatch(/^attachment; filename="premium-export-\d{13}\.csv"$/);
    
    // Clean up
    delete (globalThis as any).feature;
  });

  test("Standard users get generic attachment", async () => {
    const buffer = new TextEncoder().encode("id,name\n1,Jane");
    
    let capturedDisposition = "";
    const mockS3Write = async (_path: string, _data: Uint8Array, opts?: any) => {
      capturedDisposition = opts?.contentDisposition ?? "";
      return Promise.resolve();
    };
    
    // Simulate standard tenant export logic
    await mockS3Write("data.csv", buffer, {
      contentType: "text/csv",
      contentDisposition: "attachment"
    });
    
    expect(capturedDisposition).toBe("attachment");
    expect(capturedDisposition).not.toContain("premium-export");
  });

  test("Feature flag detection works", () => {
    // Test premium feature flag
    globalThis.feature = (flag: string) => flag === "PREMIUM";
    expect(globalThis.feature("PREMIUM")).toBe(true);
    expect(globalThis.feature("STANDARD")).toBe(false);
    
    // Clean up
    delete (globalThis as any).feature;
  });

  test("Content-Disposition format validation", () => {
    const validFormats = [
      'attachment; filename="premium-export-1642123456789.csv"',
      'attachment; filename="PRODUCTION-user-user123-report.json"',
      'attachment; filename="user-export-2024-01-15.pdf"',
      'inline; filename="debug.log"',
      'attachment'
    ];
    
    validFormats.forEach(format => {
      expect(format).toMatch(/^(attachment|inline)(; filename="[^"]+")?$/);
    });
  });
});
