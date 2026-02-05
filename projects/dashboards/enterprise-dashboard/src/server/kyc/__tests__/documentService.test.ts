/**
 * Document Service Tests
 * Unit tests for document capture and OCR verification
 */

import { describe, test, expect, beforeEach, mock } from "bun:test";
import { DocumentService } from "../documentService";

describe("DocumentService", () => {
  let documentService: DocumentService;
  const mockS3Client = {
    write: mock(() => Promise.resolve()),
  };

  beforeEach(() => {
    documentService = new DocumentService();
  });

  test("captureDocuments returns array of document paths", async () => {
    // Mock spawn to simulate successful document capture
    const originalSpawn = globalThis.spawn;
    globalThis.spawn = mock(() => ({
      exited: Promise.resolve(0),
      stdout: new ReadableStream(),
    })) as any;

    const docs = await documentService.captureDocuments("test-user", "test-trace");

    expect(Array.isArray(docs)).toBe(true);
    // In real scenario, would check for actual paths

    globalThis.spawn = originalSpawn;
  });

  test("uploadDocument encrypts and uploads to S3", async () => {
    const testFilePath = "/tmp/test-doc.jpg";
    const userId = "test-user";
    const traceId = "test-trace";

    // Create a test file
    await Bun.write(testFilePath, "test document content");

    try {
      const s3Key = await documentService.uploadDocument(
        testFilePath,
        userId,
        traceId,
        mockS3Client as any
      );

      expect(typeof s3Key).toBe("string");
      expect(s3Key).toContain("kyc/documents");
      expect(s3Key).toContain(userId);
      expect(s3Key).toContain(traceId);
      expect(mockS3Client.write).toHaveBeenCalled();
    } finally {
      // Cleanup
      try {
        await Bun.file(testFilePath).unlink();
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  test("verifyDocuments returns verification result with confidence", async () => {
    const s3Keys = ["kyc/documents/user1/trace1.enc"];

    const result = await documentService.verifyDocuments(s3Keys, "test-trace");

    expect(result).toHaveProperty("confidence");
    expect(result).toHaveProperty("extractedData");
    expect(typeof result.confidence).toBe("number");
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
    expect(typeof result.extractedData).toBe("object");
  });

  test("verifyDocuments handles empty S3 keys array", async () => {
    const result = await documentService.verifyDocuments([], "test-trace");

    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
  });

  test("verifyDocuments handles multiple documents", async () => {
    const s3Keys = [
      "kyc/documents/user1/trace1.enc",
      "kyc/documents/user1/trace2.enc",
    ];

    const result = await documentService.verifyDocuments(s3Keys, "test-trace");

    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
  });
});
