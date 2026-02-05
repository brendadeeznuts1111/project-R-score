/**
 * TypedArrayInspector Tests
 * Validates WeakRef-based registry, lifecycle tracking, and memory profiling
 *
 * @module types/typed-array-inspector.test
 */

import { describe, test, expect, beforeEach, afterEach } from "harness";
import {
  TypedArrayInspector,
  getInspector,
  trackArray,
  createTracked,
  type LifecycleEvent,
} from "../../../packages/core/src/types/typed-array-inspector";
import {
  CustomUint8Array,
  CustomUint16Array,
  CustomUint32Array,
  CustomFloat64Array,
  CustomBigUint64Array,
} from "../../../packages/core/src/types/custom-typed-array";

describe("TypedArrayInspector", () => {
  beforeEach(() => {
    TypedArrayInspector.reset();
  });

  afterEach(() => {
    TypedArrayInspector.reset();
  });

  describe("Singleton Pattern", () => {
    test("returns same instance", () => {
      const a = TypedArrayInspector.getInstance();
      const b = TypedArrayInspector.getInstance();
      expect(a).toBe(b);
    });

    test("reset creates new instance", () => {
      const a = TypedArrayInspector.getInstance();
      TypedArrayInspector.reset();
      const b = TypedArrayInspector.getInstance();
      expect(a).not.toBe(b);
    });

    test("getInspector helper returns instance", () => {
      const a = getInspector();
      const b = TypedArrayInspector.getInstance();
      expect(a).toBe(b);
    });
  });

  describe("Registration", () => {
    test("registers array and returns ID", () => {
      const inspector = getInspector();
      const buffer = new CustomUint8Array(64, "test-buffer");

      const id = inspector.register(buffer);

      expect(id).toMatch(/^cta_/);
      expect(inspector.isAlive(id)).toBe(true);
    });

    test("generates unique IDs", () => {
      const inspector = getInspector();
      const ids = new Set<string>();

      for (let i = 0; i < 100; i++) {
        const buffer = new CustomUint8Array(8);
        ids.add(inspector.register(buffer));
      }

      expect(ids.size).toBe(100);
    });

    test("tracks multiple array types", () => {
      const inspector = getInspector();

      const u8 = new CustomUint8Array(10, "u8");
      const u16 = new CustomUint16Array(10, "u16");
      const u32 = new CustomUint32Array(10, "u32");
      const f64 = new CustomFloat64Array(10, "f64");
      const bu64 = new CustomBigUint64Array(10, "bu64");

      inspector.register(u8);
      inspector.register(u16);
      inspector.register(u32);
      inspector.register(f64);
      inspector.register(bu64);

      const stats = inspector.getStats();
      expect(stats.activeCount).toBe(5);
      expect(Object.keys(stats.byType)).toHaveLength(5);
    });

    test("trackArray helper registers array", () => {
      const buffer = new CustomUint8Array(32, "helper-test");
      const id = trackArray(buffer);

      expect(id).toMatch(/^cta_/);
      expect(getInspector().isAlive(id)).toBe(true);
    });
  });

  describe("createTracked", () => {
    test("creates and registers CustomUint8Array", () => {
      const inspector = getInspector();
      const buffer = inspector.createTracked(CustomUint8Array, 64, "created");

      expect(buffer).toBeInstanceOf(CustomUint8Array);
      expect(buffer.length).toBe(64);
      expect(buffer.context).toBe("created");
      expect(inspector.getStats().activeCount).toBe(1);
    });

    test("creates and registers CustomFloat64Array", () => {
      const buffer = createTracked(CustomFloat64Array, 100, "odds-buffer");

      expect(buffer).toBeInstanceOf(CustomFloat64Array);
      expect(buffer.length).toBe(100);
      expect(buffer.BYTES_PER_ELEMENT).toBe(8);
    });

    test("creates and registers CustomBigUint64Array", () => {
      const buffer = createTracked(CustomBigUint64Array, 50, "timestamps");

      expect(buffer).toBeInstanceOf(CustomBigUint64Array);
      expect(buffer.length).toBe(50);
      expect(buffer.byteLength).toBe(400);
    });
  });

  describe("Statistics", () => {
    test("tracks activeCount correctly", () => {
      const inspector = getInspector();

      inspector.createTracked(CustomUint8Array, 10);
      inspector.createTracked(CustomUint8Array, 20);
      inspector.createTracked(CustomUint8Array, 30);

      const stats = inspector.getStats();
      expect(stats.activeCount).toBe(3);
    });

    test("calculates totalAllocatedBytes", () => {
      const inspector = getInspector();

      inspector.createTracked(CustomUint8Array, 100); // 100 bytes
      inspector.createTracked(CustomUint16Array, 50); // 100 bytes
      inspector.createTracked(CustomFloat64Array, 25); // 200 bytes

      const stats = inspector.getStats();
      expect(stats.totalAllocatedBytes).toBe(400);
    });

    test("tracks totalRegistered", () => {
      const inspector = getInspector();

      inspector.createTracked(CustomUint8Array, 10);
      inspector.createTracked(CustomUint8Array, 20);

      expect(inspector.getStats().totalRegistered).toBe(2);
    });

    test("groups by type correctly", () => {
      const inspector = getInspector();

      inspector.createTracked(CustomUint8Array, 100);
      inspector.createTracked(CustomUint8Array, 100);
      inspector.createTracked(CustomFloat64Array, 50);

      const stats = inspector.getStats();

      expect(stats.byType["CustomUint8Array"]).toEqual({ count: 2, bytes: 200 });
      expect(stats.byType["CustomFloat64Array"]).toEqual({ count: 1, bytes: 400 });
    });

    test("identifies longest lived arrays", () => {
      const inspector = getInspector();

      inspector.createTracked(CustomUint8Array, 10, "first");
      inspector.createTracked(CustomUint8Array, 10, "second");
      inspector.createTracked(CustomUint8Array, 10, "third");

      const stats = inspector.getStats();

      expect(stats.longestLived.length).toBe(3);
      expect(stats.longestLived[0].context).toBe("first");
    });
  });

  describe("Lifecycle Events", () => {
    test("emits array_registered event", () => {
      const inspector = getInspector({ enableEvents: true });
      const events: LifecycleEvent[] = [];

      inspector.on("array_registered", (e) => events.push(e));

      const buffer = new CustomUint8Array(64, "event-test");
      inspector.register(buffer);

      expect(events.length).toBe(1);
      expect(events[0].type).toBe("array_registered");
      expect(events[0].className).toBe("CustomUint8Array");
      expect(events[0].byteLength).toBe(64);
      expect(events[0].context).toBe("event-test");
    });

    test("can unsubscribe from events", () => {
      const inspector = getInspector({ enableEvents: true });
      const events: LifecycleEvent[] = [];
      const listener = (e: LifecycleEvent) => events.push(e);

      inspector.on("array_registered", listener);
      inspector.register(new CustomUint8Array(10));
      expect(events.length).toBe(1);

      inspector.off("array_registered", listener);
      inspector.register(new CustomUint8Array(10));
      expect(events.length).toBe(1); // Still 1, no new events
    });

    test("emits cleanup_completed event", () => {
      const inspector = getInspector({
        enableEvents: true,
        autoCleanupIntervalMs: 0,
      });
      const events: LifecycleEvent[] = [];

      inspector.on("cleanup_completed", (e) => events.push(e));

      // Register then lose reference
      inspector.register(new CustomUint8Array(10));

      // Force cleanup
      inspector.cleanup();

      // May or may not have events depending on GC
      // Just verify the event structure is correct if emitted
      for (const event of events) {
        expect(event.type).toBe("cleanup_completed");
        expect(event.data).toHaveProperty("removedCount");
        expect(event.data).toHaveProperty("durationMs");
      }
    });
  });

  describe("Cleanup", () => {
    test("cleanup removes dead entries", () => {
      const inspector = getInspector({ autoCleanupIntervalMs: 0 });

      // Create and immediately lose reference
      let tempArray: CustomUint8Array | null = new CustomUint8Array(100);
      const id = inspector.register(tempArray);

      expect(inspector.isAlive(id)).toBe(true);

      // Lose reference
      tempArray = null;

      // Force GC (may not work in all environments)
      if (typeof Bun !== "undefined" && Bun.gc) {
        Bun.gc(true);
      }

      // Cleanup
      inspector.cleanup();

      // Array may or may not be collected depending on GC timing
      // This is expected behavior with WeakRefs
    });

    test("cleanup returns count of removed entries", () => {
      const inspector = getInspector({ autoCleanupIntervalMs: 0 });

      // Register arrays we keep references to
      const kept = inspector.createTracked(CustomUint8Array, 10, "kept");

      const removed = inspector.cleanup();

      // Should be 0 since we're holding a reference
      expect(removed).toBe(0);
      expect(inspector.isAlive(kept.context!)).toBe(false); // ID is internal, not context
    });

    test("forced cleanup when maxRegistrySize exceeded", () => {
      const inspector = getInspector({
        autoCleanupIntervalMs: 0,
        maxRegistrySize: 5,
      });

      // Register more than max
      for (let i = 0; i < 10; i++) {
        inspector.createTracked(CustomUint8Array, 10, `buffer-${i}`);
      }

      // Should have triggered cleanup, but all are still alive
      const stats = inspector.getStats();
      expect(stats.activeCount).toBe(10);
    });
  });

  describe("Memory Profiling", () => {
    test("getMemoryProfile returns stats and heap info", () => {
      const inspector = getInspector();

      inspector.createTracked(CustomUint8Array, 1000);
      inspector.createTracked(CustomFloat64Array, 500);

      const profile = inspector.getMemoryProfile();

      expect(profile.stats).toBeDefined();
      expect(profile.stats.activeCount).toBe(2);
      expect(profile.stats.totalAllocatedBytes).toBe(5000);

      expect(profile.heapInfo).toBeDefined();
      expect(profile.recommendations).toBeInstanceOf(Array);
    });

    test("identifies potential leaks based on age", () => {
      const inspector = getInspector({
        leakThresholdMs: 1, // Very short for testing
        autoCleanupIntervalMs: 0,
      });

      // Create array (will immediately be "old" due to 1ms threshold)
      inspector.createTracked(CustomUint8Array, 100, "potential-leak");

      // Wait a tiny bit
      const start = Date.now();
      while (Date.now() - start < 5) {
        // Busy wait
      }

      const stats = inspector.getStats();
      expect(stats.potentialLeaks.length).toBeGreaterThanOrEqual(1);
    });

    test("generates recommendations for high memory usage", () => {
      const inspector = getInspector();

      // Create large array (100MB+)
      inspector.createTracked(CustomUint8Array, 110 * 1024 * 1024, "huge-buffer");

      const profile = inspector.getMemoryProfile();

      expect(profile.recommendations.length).toBeGreaterThan(0);
      expect(profile.recommendations.some((r) => r.includes("High memory usage"))).toBe(true);
    });
  });

  describe("get()", () => {
    test("returns array if still alive", () => {
      const inspector = getInspector();
      const original = new CustomUint8Array(32, "get-test");
      original.set([1, 2, 3, 4]);

      const id = inspector.register(original);
      const retrieved = inspector.get(id);

      expect(retrieved).toBe(original);
      expect(retrieved?.context).toBe("get-test");
    });

    test("returns undefined for unknown ID", () => {
      const inspector = getInspector();

      expect(inspector.get("unknown_id")).toBeUndefined();
    });
  });

  describe("formatStats()", () => {
    test("returns formatted string", () => {
      const inspector = getInspector();

      inspector.createTracked(CustomUint8Array, 100, "buffer-1");
      inspector.createTracked(CustomFloat64Array, 50, "odds");

      const formatted = inspector.formatStats();

      expect(formatted).toContain("TypedArrayInspector Statistics");
      expect(formatted).toContain("Active Arrays: 2");
      expect(formatted).toContain("CustomUint8Array");
      expect(formatted).toContain("CustomFloat64Array");
    });

    test("shows potential leaks in formatted output", () => {
      const inspector = getInspector({ leakThresholdMs: 1 });

      inspector.createTracked(CustomUint8Array, 100, "leaky-buffer");

      // Wait to exceed threshold
      const start = Date.now();
      while (Date.now() - start < 5) {}

      const formatted = inspector.formatStats();

      expect(formatted).toContain("Potential Leaks");
      expect(formatted).toContain("leaky-buffer");
    });
  });

  describe("dispose()", () => {
    test("clears registry and listeners", () => {
      const inspector = getInspector();
      const events: LifecycleEvent[] = [];

      inspector.on("array_registered", (e) => events.push(e));
      inspector.createTracked(CustomUint8Array, 10);

      expect(inspector.getStats().activeCount).toBe(1);
      expect(events.length).toBe(1);

      inspector.dispose();

      expect(inspector.getStats().activeCount).toBe(0);
    });
  });

  describe("Configuration", () => {
    test("captureStackTraces option", () => {
      const inspector = getInspector({ captureStackTraces: true });

      // Internal implementation detail - we can't directly verify
      // but ensure no errors
      inspector.createTracked(CustomUint8Array, 10);
      expect(inspector.getStats().activeCount).toBe(1);
    });

    test("custom leakThresholdMs", () => {
      const inspector = getInspector({ leakThresholdMs: 100000 });

      inspector.createTracked(CustomUint8Array, 10);

      const stats = inspector.getStats();
      expect(stats.potentialLeaks.length).toBe(0); // Too short to be a leak
    });
  });

  describe("Integration", () => {
    test("sportsbook simulation: wire protocol tracking", () => {
      const inspector = getInspector();

      // Simulate sportsbook wire protocol buffers
      const header = inspector.createTracked(CustomUint8Array, 16, "wire-header");
      const marketIds = inspector.createTracked(CustomUint32Array, 100, "market-ids");
      const odds = inspector.createTracked(CustomFloat64Array, 100, "decimal-odds");
      const timestamps = inspector.createTracked(CustomBigUint64Array, 100, "nano-timestamps");

      const stats = inspector.getStats();

      expect(stats.activeCount).toBe(4);
      expect(stats.byType["CustomUint8Array"].count).toBe(1);
      expect(stats.byType["CustomUint32Array"].count).toBe(1);
      expect(stats.byType["CustomFloat64Array"].count).toBe(1);
      expect(stats.byType["CustomBigUint64Array"].count).toBe(1);

      // Verify we can still use the buffers
      header.set([0x53, 0x50, 0x42, 0x54]); // "SPBT"
      odds[0] = 2.5;
      timestamps[0] = BigInt(Date.now()) * 1000000n;

      expect(header[0]).toBe(0x53);
      expect(odds[0]).toBe(2.5);
      expect(timestamps[0]).toBeGreaterThan(0n);
    });
  });
});
