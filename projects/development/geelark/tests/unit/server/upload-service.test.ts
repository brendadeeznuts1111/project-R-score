/**
 * Upload Service Unit Tests
 *
 * Tests for UploadService with feature flag validation,
 * Bun File API patterns, and upload strategies.
 */

import { describe, test, expect, mock, beforeEach } from "bun:test";
import { UploadService, createUploadServiceFromEnv, loadUploadConfig } from "../../../src/server/UploadService.js";

// Mock feature function
const mockFeature = mock((flag: string, defaultValue: boolean) => {
  // Default to all features enabled for testing
  return true;
});

// Mock bun:feature module
globalThis.feature = mockFeature as any;

describe("UploadService", () => {
  let uploadService: UploadService;

  beforeEach(() => {
    // Reset mocks
    mockFeature.mockClear();

    // Create test instance
    uploadService = new UploadService({
      provider: "local",
      accessKeyId: "test-key",
      secretAccessKey: "test-secret",
      bucket: "test-bucket",
      localDir: "./test-uploads",
    });
  });

  describe("Constructor", () => {
    test("should initialize with local provider", () => {
      expect(uploadService).toBeDefined();
    });

    test("should initialize with S3 provider when feature enabled", () => {
      mockFeature.mockImplementation((flag: string) => {
        if (flag === "FEAT_CLOUD_UPLOAD") return true;
        return false;
      });

      const s3Service = new UploadService({
        provider: "s3",
        accessKeyId: "test-key",
        secretAccessKey: "test-secret",
        bucket: "test-bucket",
        region: "us-east-1",
      });

      expect(s3Service).toBeDefined();
    });
  });

  describe("Simple Upload", () => {
    test("should upload small file successfully", async () => {
      const testFile = new Blob(["test content"], { type: "text/plain" });
      const result = await uploadService.initiateUpload(testFile, {
        filename: "test.txt",
        contentType: "text/plain",
      });

      expect(result).toBeDefined();
      expect(result.uploadId).toBeDefined();
      expect(result.filename).toBe("test.txt");
      expect(result.success).toBe(true);
    });

    test("should track upload progress", async () => {
      const testFile = new Blob(["test content"], { type: "text/plain" });
      const result = await uploadService.initiateUpload(testFile, {
        filename: "test.txt",
        contentType: "text/plain",
      });

      const progress = uploadService.getProgress(result.uploadId);
      expect(progress).toBeDefined();
      expect(progress?.status).toBe("completed");
      expect(progress?.progress).toBe(100);
    });

    test("should handle file with custom metadata", async () => {
      mockFeature.mockImplementation((flag: string) => {
        if (flag === "FEAT_CUSTOM_METADATA") return true;
        if (flag === "FEAT_CLOUD_UPLOAD") return false;
        return false;
      });

      const testFile = new Blob(["test"], { type: "text/plain" });
      const result = await uploadService.initiateUpload(testFile, {
        filename: "test.txt",
        contentType: "text/plain",
        metadata: {
          "custom-key": "custom-value",
          "uploaded-by": "test-user",
        },
      });

      expect(result.success).toBe(true);
    });
  });

  describe("Upload Cancellation", () => {
    test("should cancel active upload", async () => {
      const testFile = new Blob(["test"], { type: "text/plain" });
      const result = await uploadService.initiateUpload(testFile, {
        filename: "test.txt",
        contentType: "text/plain",
      });

      const cancelled = uploadService.cancelUpload(result.uploadId);
      expect(cancelled).toBe(true);

      const progress = uploadService.getProgress(result.uploadId);
      expect(progress?.status).toBe("cancelled");
    });
  });
});
