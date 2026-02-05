/**
 * [TEST][DEEPEQUALS][UTILITY]{BUN-API}
 * Tests for Bun.deepEquals() utilities
 */

import { describe, it, expect } from "bun:test";
import {
  deepEquals,
  deepEqualsWithMetrics,
  findDifferences,
  assertDeepEquals,
} from "./deepEquals";

describe("[UTILITY][DEEPEQUALS]", () => {
  describe("deepEquals()", () => {
    it("should compare equal objects", () => {
      expect(deepEquals({ a: 1 }, { a: 1 })).toBe(true);
    });

    it("should detect different objects", () => {
      expect(deepEquals({ a: 1 }, { a: 2 })).toBe(false);
    });

    it("should compare arrays", () => {
      expect(deepEquals([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(deepEquals([1, 2, 3], [1, 2, 4])).toBe(false);
    });

    it("should handle nested structures", () => {
      const obj1 = { a: { b: { c: 1 } } };
      const obj2 = { a: { b: { c: 1 } } };
      expect(deepEquals(obj1, obj2)).toBe(true);
    });

    it("should handle primitives", () => {
      expect(deepEquals(42, 42)).toBe(true);
      expect(deepEquals("test", "test")).toBe(true);
      expect(deepEquals(true, true)).toBe(true);
    });

    it("should handle NaN and Infinity", () => {
      expect(deepEquals(NaN, NaN)).toBe(true);
      expect(deepEquals(Infinity, Infinity)).toBe(true);
    });
  });

  describe("deepEqualsWithMetrics()", () => {
    it("should return metrics", () => {
      const result = deepEqualsWithMetrics({ a: 1 }, { a: 1 });
      expect(result.equal).toBe(true);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe("findDifferences()", () => {
    it("should find no differences for equal objects", () => {
      const result = findDifferences({ a: 1 }, { a: 1 });
      expect(result.equal).toBe(true);
      expect(result.differences).toBeUndefined();
    });

    it("should find differences", () => {
      const result = findDifferences({ a: 1, b: 2 }, { a: 1, b: 3 });
      expect(result.equal).toBe(false);
      expect(result.differences).toBeDefined();
      expect(result.differences?.length).toBeGreaterThan(0);
    });

    it("should detect missing keys", () => {
      const result = findDifferences({ a: 1, b: 2 }, { a: 1 });
      expect(result.equal).toBe(false);
      expect(result.differences).toBeDefined();
    });
  });

  describe("assertDeepEquals()", () => {
    it("should pass for equal values", () => {
      expect(() => assertDeepEquals({ a: 1 }, { a: 1 })).not.toThrow();
    });

    it("should throw for different values", () => {
      expect(() => assertDeepEquals({ a: 1 }, { a: 2 })).toThrow();
    });

    it("should include custom message", () => {
      expect(() =>
        assertDeepEquals({ a: 1 }, { a: 2 }, "Custom error message")
      ).toThrow("Custom error message");
    });
  });
});

