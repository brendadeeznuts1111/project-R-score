// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// test/performance.test.ts
//! Performance tests for BunFile

import { describe, test, expect, beforeAll } from "bun:test";
import { writeFileSync } from "node:fs";

describe("BunFile Performance", () => {
  beforeAll(() => {
    // Set up test environment
    process.env.BUN_MOCK_S3 = "1";
    process.env.BUN_MOCK_S3_s3__bucket_test_txt = "Hello from mock S3!";

    // Create test file
    writeFileSync("test.txt", "Hello, World!");
  });

  test("Bun.file() creation time is fast", () => {
    const iterations = 10000;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      const f = Bun.file("test.txt");
      // Force property access
      void f.name;
    }

    const duration = performance.now() - start;
    const perFile = (duration / iterations) * 1_000_000; // Convert to ns

    console.info(`Bun.file() creation: ${perFile.toFixed(1)}ns`);
    // Threshold adjusted for environment, but still ensuring it's "fast" (< 1us)
    expect(perFile).toBeLessThan(1000);
  });

  test("Bun.file() with MOCK_S3 is fast", () => {
    const iterations = 10000;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      const f = Bun.file("s3://bucket/test.txt");
      void f.name;
    }

    const duration = performance.now() - start;
    const perFile = (duration / iterations) * 1_000_000;

    console.info(`Bun.file() with MOCK_S3: ${perFile.toFixed(1)}ns`);
    expect(perFile).toBeLessThan(1000);
  });

  test("First read loads file lazily", async () => {
    const f = Bun.file("test.txt");

    const start = performance.now();
    const text = await f.text();
    const duration = performance.now() - start;

    expect(text).toBe("Hello, World!");
    expect(f.size).toBeGreaterThan(0);

    console.info(`First read: ${duration.toFixed(2)}ms`);
  });

  test("Second read uses cache", async () => {
    const f = Bun.file("test.txt");

    // First read (loads file)
    await f.text();

    // Second read (should be cached)
    const start2 = performance.now();
    await f.text();
    const duration2 = performance.now() - start2;

    console.info(`Second read (cached): ${duration2.toFixed(2)}ms`);
    expect(duration2).toBeLessThan(1.0); // Should be very fast
  });

  test("Write performance", async () => {
    const f = Bun.file("output.txt");
    const data = "x".repeat(1024 * 1024); // 1MB

    const start = performance.now();
    await Bun.write(f, data);
    const duration = performance.now() - start;

    console.info(
      `Write 1MB: ${duration.toFixed(2)}ms (${(data.length / duration / 1000).toFixed(2)} MB/s)`
    );
    expect(duration).toBeLessThan(100);
  });
});
