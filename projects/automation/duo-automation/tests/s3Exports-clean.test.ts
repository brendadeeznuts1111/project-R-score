// test/s3Exports-clean.test.ts
import { test, expect } from "bun:test";
import { uploadUserReport, uploadTenantExport } from "../src/utils/s3Exports";
import { createMockDeps, createPremiumMockDeps, getMockCalls, expectPremiumExport, expectUserReport } from "./utils/mockDeps";

test("Premium users get custom filenames with timestamps", async () => {
  // Arrange: Create premium mock dependencies
  const mockDeps = createPremiumMockDeps();

  // Act: Upload user report
  await uploadUserReport(
    "user123",
    "PRODUCTION", 
    new TextEncoder().encode("{}"),
    mockDeps
  );

  // Assert: Check the S3 call
  const calls = getMockCalls(mockDeps);
  expect(calls).toHaveLength(1);
  
  const { opts } = calls[0];
  expectPremiumExport(opts.contentDisposition, "json");
  expect(opts.contentType).toBe("application/json");
  expect(opts.cacheControl).toBe("max-age=3600");
});

test("Non-premium users get generic filenames", async () => {
  // Arrange: Create standard mock dependencies
  const mockDeps = createMockDeps();

  // Act: Upload user report
  await uploadUserReport(
    "user456",
    "STAGING",
    new TextEncoder().encode("{}"),
    mockDeps
  );

  // Assert: Check the S3 call
  const calls = getMockCalls(mockDeps);
  expect(calls).toHaveLength(1);
  
  const { opts } = calls[0];
  expectUserReport(opts.contentDisposition, "user456", "STAGING");
  expect(opts.cacheControl).toBe("max-age=300");
});

test("Premium tenant export with timestamp", async () => {
  // Arrange: Create premium mock dependencies
  const mockDeps = createPremiumMockDeps();

  // Act: Upload tenant export
  await uploadTenantExport(
    new TextEncoder().encode("id,name\n1,John"),
    true, // isPremium
    mockDeps
  );

  // Assert: Check the S3 call
  const calls = getMockCalls(mockDeps);
  expect(calls).toHaveLength(1);
  
  const { opts } = calls[0];
  expectPremiumExport(opts.contentDisposition, "csv");
  expect(opts.contentType).toBe("text/csv");
});

test("Standard tenant export gets generic attachment", async () => {
  // Arrange: Create standard mock dependencies
  const mockDeps = createMockDeps();

  // Act: Upload tenant export
  await uploadTenantExport(
    new TextEncoder().encode("id,name\n1,Jane"),
    false, // Not premium
    mockDeps
  );

  // Assert: Check the S3 call
  const calls = getMockCalls(mockDeps);
  expect(calls).toHaveLength(1);
  
  const { opts } = calls[0];
  expect(opts.contentDisposition).toBe("attachment");
  expect(opts.contentType).toBe("text/csv");
});

test("Multiple feature flags work correctly", async () => {
  // Arrange: Create mock with multiple feature flags
  const mockDeps = createMockDeps({
    feature: (flag: string) => {
      const flags = {
        "PREMIUM": true,
        "ENTERPRISE": true,
        "ADVANCED_EXPORTS": true,
      };
      return flags[flag as keyof typeof flags] ?? false;
    },
  });

  // Act: Upload user report
  await uploadUserReport(
    "enterprise-user",
    "PRODUCTION",
    new TextEncoder().encode("{}"),
    mockDeps
  );

  // Assert: Should get premium treatment
  const calls = getMockCalls(mockDeps);
  expect(calls).toHaveLength(1);
  
  const { opts } = calls[0];
  expectPremiumExport(opts.contentDisposition, "json");
});

test("Development scope uses no-cache", async () => {
  // Arrange: Create development mock dependencies
  const mockDeps = createMockDeps();

  // Act: Upload user report in development
  await uploadUserReport(
    "dev-user",
    "DEVELOPMENT",
    new TextEncoder().encode("{}"),
    mockDeps
  );

  // Assert: Check cache control
  const calls = getMockCalls(mockDeps);
  expect(calls).toHaveLength(1);
  
  const { opts } = calls[0];
  expect(opts.cacheControl).toBe("no-cache");
  expectUserReport(opts.contentDisposition, "dev-user", "DEVELOPMENT");
});
