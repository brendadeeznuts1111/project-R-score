// test/s3Exports-exact.test.ts
import { expect, test } from "bun:test";

// This test implements the exact scenario requested by the user
test("Premium users get custom filenames", async () => {
  const buffer = new TextEncoder().encode("{}");
  
  // Mock feature flag
  globalThis.feature = (flag: string) => flag === "PREMIUM";
  
  // Capture S3 call (mock s3.write)
  let capturedDisposition = "";
  const originalS3 = (globalThis as any).Bun?.s3;
  
  // Create mock S3
  const mockS3 = {
    write: async (_path: string, _data: Uint8Array, opts?: any) => {
      capturedDisposition = opts?.contentDisposition ?? "";
      return Promise.resolve();
    }
  };
  
  // Set up mock
  if (globalThis.Bun) {
    (globalThis as any).Bun.s3 = mockS3;
  } else {
    (globalThis as any).Bun = { s3: mockS3 };
  }
  
  try {
    // Import and test the actual function
    const { uploadUserReport } = await import("../src/utils/s3Exports");
    
    await uploadUserReport("user123", "PRODUCTION", buffer);
    
    expect(capturedDisposition).toContain("PRODUCTION-user-user123-report.json");
    
  } finally {
    // Restore original S3
    if (originalS3 && globalThis.Bun) {
      (globalThis as any).Bun.s3 = originalS3;
    }
    
    // Clean up feature flag
    delete (globalThis as any).feature;
  }
});
