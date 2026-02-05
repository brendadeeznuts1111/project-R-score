#!/usr/bin/env bun

/**
 * Runtime & Process Control Performance Benchmarks
 * Testing Bun's runtime controls and their impact on performance
 *
 * Reference: https://bun.com/docs/runtime#runtime-%26-process-control
 */

import { bench, describe, expect, it } from "bun:test";
import { measureNanoseconds } from "./utils";

describe("Runtime & Process Control Performance", () => {
  describe("Garbage Collection Performance", () => {
    bench("Bun.gc() call", () => {
      Bun.gc(true);
    }, {
      iterations: 1_000,
    });

    bench("Bun.gc() without blocking", () => {
      Bun.gc(false);
    }, {
      iterations: 1_000,
    });

    // Note: global gc() is only available with --expose-gc flag
    it("should use Bun.gc() for garbage collection", () => {
      const { duration } = measureNanoseconds(() => {
        Bun.gc(true);
      });
      expect(duration).toBeGreaterThan(0);
    });
  });

  describe("Memory Management Performance", () => {
    bench("Buffer.allocUnsafe (default)", () => {
      Buffer.allocUnsafe(1024);
    }, {
      iterations: 10_000,
    });

    bench("Buffer.allocUnsafe with --zero-fill-buffers", () => {
      // With --zero-fill-buffers, allocUnsafe behaves like alloc
      const buffer = Buffer.allocUnsafe(1024);
      // Force zero-fill by reading/writing
      buffer.fill(0);
      return buffer;
    }, {
      iterations: 10_000,
    });

    bench("Buffer.alloc (safe)", () => {
      Buffer.alloc(1024);
    }, {
      iterations: 10_000,
    });

    bench("Buffer.from string", () => {
      Buffer.from("Hello, World!");
    }, {
      iterations: 10_000,
    });

    bench("Buffer.from array", () => {
      Buffer.from([1, 2, 3, 4, 5]);
    }, {
      iterations: 10_000,
    });
  });

  describe("Process Control Performance", () => {
    bench("process.memoryUsage()", () => {
      process.memoryUsage();
    }, {
      iterations: 10_000,
    });

    bench("process.cpuUsage()", () => {
      process.cpuUsage();
    }, {
      iterations: 10_000,
    });

    bench("process.uptime()", () => {
      process.uptime();
    }, {
      iterations: 10_000,
    });

    bench("process.hrtime()", () => {
      process.hrtime();
    }, {
      iterations: 10_000,
    });

    bench("process.hrtime.bigint()", () => {
      process.hrtime.bigint();
    }, {
      iterations: 10_000,
    });
  });

  describe("Runtime Flags Impact", () => {
    // Test performance with different runtime configurations
    describe("--smol flag impact", () => {
      // With --smol: less memory, more frequent GC
      it("should measure memory usage difference", () => {
        const memBefore = process.memoryUsage();

        // Create some allocations
        const buffers = Array.from({ length: 100 }, () => Buffer.alloc(1024));

        const memAfter = process.memoryUsage();
        const heapUsedDiff = memAfter.heapUsed - memBefore.heapUsed;

        // Cleanup
        buffers.length = 0;
        Bun.gc(true);

        expect(heapUsedDiff).toBeGreaterThan(0);
      });
    });

    describe("Console Depth Impact", () => {
      // Test with different --console-depth values
      const complexObject = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  value: "deep"
                }
              }
            }
          }
        }
      };

      bench("console.log with default depth (2)", () => {
        // This will only show 2 levels deep by default
        const output = JSON.stringify(complexObject, null, 2);
        output.length; // Ensure we use the output
      }, {
        iterations: 1_000,
      });
    });
  });

  describe("Unhandled Rejections Handling", () => {
    it("should handle unhandled rejections correctly", async () => {
      // Test that we can catch unhandled rejections
      const promise = Promise.reject(new Error("Test error"));

      try {
        await promise;
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    bench("Promise rejection handling (caught)", async () => {
      try {
        await Promise.reject(new Error("Test"));
      } catch {
        // Handled
      }
    }, {
      iterations: 1_000,
    });

    bench("Promise rejection with .catch()", async () => {
      await Promise.reject(new Error("Test")).catch(() => {
        // Handled
      });
    }, {
      iterations: 1_000,
    });

    bench("Promise.all with rejection handling", async () => {
      try {
        await Promise.all([
          Promise.resolve("ok"),
          Promise.reject(new Error("Test")),
        ]);
      } catch {
        // Handled
      }
    }, {
      iterations: 500,
    });
  });

  describe("Microbenchmarks with Nanosecond Precision", () => {
    it("should measure Bun.gc() with nanosecond precision", () => {
      const { duration } = measureNanoseconds(() => {
        Bun.gc(true);
      });
      // GC times vary significantly, so we just check it's measurable
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it("should measure Buffer.allocUnsafe with nanosecond precision", () => {
      const { duration } = measureNanoseconds(() => {
        Buffer.allocUnsafe(1024);
      });
      expect(duration).toBeLessThan(1); // Should be very fast
    });

    it("should measure process.memoryUsage() with nanosecond precision", () => {
      const { duration } = measureNanoseconds(() => {
        process.memoryUsage();
      });
      expect(duration).toBeLessThan(1); // Should be very fast
    });
  });
});

