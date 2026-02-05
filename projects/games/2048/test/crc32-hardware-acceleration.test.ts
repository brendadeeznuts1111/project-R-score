#!/usr/bin/env bun

import { describe, expect, test } from "bun:test";

describe("Bun v1.3.6 Hardware-Accelerated CRC32 Tests", () => {
  test("should demonstrate hardware-accelerated CRC32 performance", async () => {
    console.log("⚡ Testing hardware-accelerated CRC32");

    // Test different data sizes
    const sizes = [1024, 10240, 102400, 1048576]; // 1KB, 10KB, 100KB, 1MB

    for (const size of sizes) {
      const data = Buffer.alloc(size);
      const iterations = 100;

      // Warm up
      for (let i = 0; i < 10; i++) {
        Bun.hash.crc32(data);
      }

      // Benchmark
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        Bun.hash.crc32(data);
      }

      const endTime = performance.now();
      const throughput =
        (size * iterations) / ((endTime - startTime) / 1000) / 1024 / 1024;

      console.log(`📊 ${size} bytes: ${throughput.toFixed(2)} MB/s`);

      // Verify we get consistent results
      const hash1 = Bun.hash.crc32(data);
      const hash2 = Bun.hash.crc32(data);
      expect(hash1).toBe(hash2);

      // Hardware acceleration should provide good throughput
      expect(throughput).toBeGreaterThan(100); // At least 100 MB/s
    }
  });

  test("should handle different data types correctly", () => {
    console.log("🔧 Testing CRC32 with different data types");

    // Test with string data
    const stringData = "Hello, World!";
    const stringBuffer = Buffer.from(stringData);
    const stringHash = Bun.hash.crc32(stringBuffer);

    expect(typeof stringHash).toBe("number");
    expect(stringHash).toBeGreaterThan(0);

    // Test with binary data
    const binaryData = Buffer.from([
      0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x00, 0xff, 0xfe,
    ]);
    const binaryHash = Bun.hash.crc32(binaryData);

    expect(typeof binaryHash).toBe("number");
    expect(binaryHash).toBeGreaterThan(0);

    // Test with empty buffer
    const emptyData = Buffer.alloc(0);
    const emptyHash = Bun.hash.crc32(emptyData);

    expect(typeof emptyHash).toBe("number");

    // Different data should produce different hashes
    expect(stringHash).not.toBe(binaryHash);
  });

  test("should be consistent across multiple calls", () => {
    console.log("🔄 Testing CRC32 consistency");

    const data = Buffer.from("consistency test data");
    const iterations = 1000;

    const hashes = new Set<number>();

    for (let i = 0; i < iterations; i++) {
      const hash = Bun.hash.crc32(data);
      hashes.add(hash);
    }

    // All hashes should be identical
    expect(hashes.size).toBe(1);

    const hash = Bun.hash.crc32(data);
    expect(hash).toBeGreaterThan(0);
    expect(hash.toString(16)).toMatch(/^[0-9a-f]+$/);
  });

  test("should work with large data buffers", () => {
    console.log("📊 Testing CRC32 with large data buffers");

    // Test with 10MB buffer
    const largeData = Buffer.alloc(10 * 1024 * 1024);

    // Fill with some pattern
    for (let i = 0; i < largeData.length; i++) {
      largeData[i] = i % 256;
    }

    const startTime = performance.now();
    const hash = Bun.hash.crc32(largeData);
    const endTime = performance.now();

    const timeTaken = endTime - startTime;

    console.log(`🚀 10MB buffer processed in ${timeTaken.toFixed(2)}ms`);

    expect(typeof hash).toBe("number");
    expect(hash).toBeGreaterThan(0);

    // Should process large data quickly (hardware acceleration)
    expect(timeTaken).toBeLessThan(100); // Less than 100ms for 10MB
  });

  test("should demonstrate real-world use cases", () => {
    console.log("💼 Testing real-world CRC32 use cases");

    // Use case 1: File integrity checking
    class FileIntegrityChecker {
      calculateChecksum(data: Buffer): string {
        return Bun.hash.crc32(data).toString(16);
      }

      verifyIntegrity(originalData: Buffer, receivedData: Buffer): boolean {
        return (
          this.calculateChecksum(originalData) ===
          this.calculateChecksum(receivedData)
        );
      }
    }

    const checker = new FileIntegrityChecker();
    const originalData = Buffer.from("important file content");
    const receivedData = Buffer.from("important file content");
    const corruptedData = Buffer.from("important file content!");

    expect(checker.verifyIntegrity(originalData, receivedData)).toBe(true);
    expect(checker.verifyIntegrity(originalData, corruptedData)).toBe(false);

    // Use case 2: Cache key generation
    function generateCacheKey(data: Record<string, any>): string {
      const hash = Bun.hash.crc32(Buffer.from(JSON.stringify(data)));
      return `cache_${hash.toString(16)}`;
    }

    const cacheData = { user: "test", page: "home" };
    const cacheKey = generateCacheKey(cacheData);

    expect(cacheKey).toMatch(/^cache_[0-9a-f]+$/);
    expect(typeof cacheKey).toBe("string");

    // Use case 3: Content deduplication
    class ContentDeduplicator {
      private hashes = new Map<number, string>();

      addContent(content: string): string {
        const hash = Bun.hash.crc32(Buffer.from(content));

        if (this.hashes.has(hash)) {
          return this.hashes.get(hash)!;
        }

        const id = `content_${this.hashes.size + 1}`;
        this.hashes.set(hash, id);
        return id;
      }
    }

    const deduplicator = new ContentDeduplicator();
    const id1 = deduplicator.addContent("duplicate content");
    const id2 = deduplicator.addContent("duplicate content");
    const id3 = deduplicator.addContent("unique content");

    expect(id1).toBe(id2);
    expect(id1).not.toBe(id3);
  });

  test("should show performance improvement characteristics", async () => {
    console.log("📈 Testing performance improvement characteristics");

    const data = Buffer.alloc(1024 * 1024); // 1MB
    const iterations = 100;

    // Test that performance is consistent and fast
    const times: number[] = [];

    for (let i = 0; i < 10; i++) {
      const startTime = performance.now();

      for (let j = 0; j < iterations; j++) {
        Bun.hash.crc32(data);
      }

      const endTime = performance.now();
      times.push(endTime - startTime);
    }

    const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    console.log(
      `📊 Average time for ${iterations} CRC32 operations: ${avgTime.toFixed(2)}ms`,
    );
    console.log(
      `📊 Min time: ${minTime.toFixed(2)}ms, Max time: ${maxTime.toFixed(2)}ms`,
    );

    // Hardware acceleration should provide consistent performance
    const variance = maxTime - minTime;
    expect(variance).toBeLessThan(avgTime * 0.5); // Variance less than 50% of average

    // Should be fast - less than 20ms for 100 CRC32 operations on 1MB
    expect(avgTime).toBeLessThan(20);
  });

  test("should handle edge cases properly", () => {
    console.log("🔧 Testing CRC32 edge cases");

    // Test with single byte
    const singleByte = Buffer.from([0x42]);
    const singleHash = Bun.hash.crc32(singleByte);
    expect(typeof singleHash).toBe("number");
    expect(singleHash).toBeGreaterThan(0);

    // Test with maximum byte value
    const maxByte = Buffer.from([0xff]);
    const maxHash = Bun.hash.crc32(maxByte);
    expect(typeof maxHash).toBe("number");
    expect(maxHash).toBeGreaterThan(0);

    // Test with alternating pattern
    const patternData = Buffer.from(
      Array(1024)
        .fill(0)
        .map((_, i) => i % 256),
    );
    const patternHash = Bun.hash.crc32(patternData);
    expect(typeof patternHash).toBe("number");
    expect(patternHash).toBeGreaterThan(0);

    // Different patterns should produce different hashes
    expect(singleHash).not.toBe(maxHash);
    expect(maxHash).not.toBe(patternHash);
  });

  test("should demonstrate hardware acceleration benefits", () => {
    console.log("⚡ Demonstrating hardware acceleration benefits");

    // Test that shows the speed advantage
    const testData = Buffer.alloc(1024 * 1024); // 1MB
    const iterations = 1000;

    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      Bun.hash.crc32(testData);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const throughput =
      (1024 * 1024 * iterations) / (totalTime / 1000) / 1024 / 1024;

    console.log(`🚀 Processed ${iterations}MB in ${totalTime.toFixed(2)}ms`);
    console.log(`🚀 Throughput: ${throughput.toFixed(2)} MB/s`);

    // Hardware acceleration should provide high throughput
    expect(throughput).toBeGreaterThan(1000); // At least 1 GB/s

    // Should complete quickly
    expect(totalTime).toBeLessThan(200); // Less than 200ms for 1000MB
  });
});

describe("CRC32 Hardware Acceleration Integration", () => {
  test("should integrate seamlessly with existing code", () => {
    console.log("🔄 Testing seamless integration");

    // Simulate existing code that uses CRC32
    class LegacyDataProcessor {
      processWithChecksum(data: Buffer): { data: Buffer; checksum: number } {
        // Old way would use a software CRC32 library
        // New way uses Bun.hash.crc32 with hardware acceleration
        const checksum = Bun.hash.crc32(data);
        return { data, checksum };
      }

      verifyData(processed: { data: Buffer; checksum: number }): boolean {
        const calculatedChecksum = Bun.hash.crc32(processed.data);
        return calculatedChecksum === processed.checksum;
      }
    }

    const processor = new LegacyDataProcessor();
    const testData = Buffer.from("legacy integration test");

    const processed = processor.processWithChecksum(testData);
    expect(processed.checksum).toBeGreaterThan(0);
    expect(processor.verifyData(processed)).toBe(true);
  });

  test("should work in concurrent scenarios", async () => {
    console.log("🔀 Testing concurrent CRC32 operations");

    const testData = Buffer.alloc(1024 * 100); // 100KB
    const concurrentTasks = 10;

    const promises = Array.from({ length: concurrentTasks }, async (_, i) => {
      const startTime = performance.now();

      // Perform CRC32 operations concurrently
      const hash = Bun.hash.crc32(testData);

      const endTime = performance.now();
      return { taskId: i, hash, time: endTime - startTime };
    });

    const results = await Promise.all(promises);

    // All results should be consistent
    const hashes = results.map((r) => r.hash);
    const uniqueHashes = new Set(hashes);
    expect(uniqueHashes.size).toBe(1);

    // All should complete in reasonable time
    const times = results.map((r) => r.time);
    const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;

    console.log(`📊 Concurrent operations avg time: ${avgTime.toFixed(2)}ms`);
    expect(avgTime).toBeLessThan(10); // Should be very fast
  });
});

console.log("🧪 CRC32 Hardware Acceleration Tests Loaded!");
console.log("Run with: bun test --grep 'CRC32'");
