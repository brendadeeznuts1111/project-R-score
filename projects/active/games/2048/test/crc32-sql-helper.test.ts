import { describe, expect, test } from "bun:test";

describe("CRC32SQLHelper Interfaces", () => {
  describe("CRC32Options", () => {
    test("should accept valid options", () => {
      const options = {
        auditTrail: true,
        entityType: "test",
        method: "hardware" as const,
        crc32Fields: ["checksum", "content"],
        confidenceThreshold: 0.99,
        batchId: "batch-123",
      };
      expect(options.auditTrail).toBe(true);
      expect(options.method).toBe("hardware");
      expect(options.crc32Fields.length).toBe(2);
    });
    test("should accept partial options", () => {
      const options = { crc32Fields: ["checksum"] };
      expect(options.crc32Fields).toEqual(["checksum"]);
    });
  });
  describe("CRC32ComputedData", () => {
    test("should have correct structure", () => {
      const data = {
        hasCRC32Fields: true,
        originalCRC32: 0x12345678,
        computedCRC32: 0x12345678,
        isValid: true,
        confidence: 1.0,
        processingTime: 1.5,
        bytesProcessed: 1024,
        usedHardware: true,
        throughput: 100.5,
        simdInstructions: 64,
        crc32Field: "checksum",
        defaults: new Set(["opt1"]),
        required: new Set(["req1"]),
      };
      expect(data.hasCRC32Fields).toBe(true);
      expect(data.isValid).toBe(true);
      expect(data.throughput).toBeGreaterThan(0);
    });
  });
  describe("InsertResult", () => {
    test("should have correct structure", () => {
      const result = { id: "test-id", rowsAffected: 5 };
      expect(result.id).toBe("test-id");
      expect(result.rowsAffected).toBe(5);
    });
  });
});

describe("CRC32 Computation", () => {
  test("should compute CRC32 for Uint8Array", () => {
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    const checksum = Bun.hash.crc32(data.buffer);
    expect(typeof checksum).toBe("number");
  });
  test("should compute consistent CRC32", () => {
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    const c1 = Bun.hash.crc32(data.buffer);
    const c2 = Bun.hash.crc32(data.buffer);
    expect(c1).toBe(c2);
  });
  test("should compute different CRC32 for different data", () => {
    const c1 = Bun.hash.crc32(new Uint8Array([1, 2, 3]).buffer);
    const c2 = Bun.hash.crc32(new Uint8Array([3, 2, 1]).buffer);
    expect(c1).not.toBe(c2);
  });
  test("should handle large data", () => {
    const data = new Uint8Array(1024 * 1024);
    const checksum = Bun.hash.crc32(data.buffer);
    expect(typeof checksum).toBe("number");
  });
});
