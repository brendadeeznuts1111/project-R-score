/**
 * [TEST][INSPECT][CORE]{BUN-API}
 * Tests for Bun.inspect() utilities
 */

import { describe, it, expect } from "bun:test";
import {
  inspect,
  inspectWithMetrics,
  inspectForLog,
  inspectForRepl,
  inspectCompact,
  isInspectable,
  getInspectionSize,
} from "./inspect";

describe("[INSPECT][CORE]", () => {
  describe("inspect()", () => {
    it("should format simple values", () => {
      const result = inspect({ a: 1, b: 2 });
      expect(result).toContain("a");
      expect(result).toContain("b");
    });

    it("should respect depth option", () => {
      const deep = { a: { b: { c: { d: 1 } } } };
      const shallow = inspect(deep, { depth: 1 });
      const deep_result = inspect(deep, { depth: 5 });
      expect(shallow.length).toBeLessThan(deep_result.length);
    });

    it("should handle arrays", () => {
      const result = inspect([1, 2, 3]);
      expect(result).toContain("1");
      expect(result).toContain("2");
      expect(result).toContain("3");
    });

    it("should handle null and undefined", () => {
      expect(inspect(null)).toContain("null");
      expect(inspect(undefined)).toContain("undefined");
    });
  });

  describe("inspectWithMetrics()", () => {
    it("should return metrics", () => {
      const result = inspectWithMetrics({ test: true });
      expect(result.value).toBeDefined();
      expect(result.depth).toBe(5);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it("should track colored output", () => {
      const result = inspectWithMetrics({ test: true }, { colors: true });
      expect(result.colored).toBe(true);
    });
  });

  describe("inspectForLog()", () => {
    it("should use sensible defaults", () => {
      const result = inspectForLog({ a: 1, b: [1, 2, 3, 4, 5] });
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("inspectForRepl()", () => {
    it("should use full depth", () => {
      const deep = { a: { b: { c: { d: { e: 1 } } } } };
      const result = inspectForRepl(deep);
      expect(result).toContain("e");
    });
  });

  describe("inspectCompact()", () => {
    it("should produce compact output", () => {
      const result = inspectCompact({ a: 1, b: 2, c: 3 });
      const fullResult = inspect({ a: 1, b: 2, c: 3 });
      expect(result.length).toBeLessThanOrEqual(fullResult.length);
    });
  });

  describe("isInspectable()", () => {
    it("should identify inspectable values", () => {
      expect(isInspectable({})).toBe(true);
      expect(isInspectable([])).toBe(true);
      expect(isInspectable(() => {})).toBe(true);
      expect(isInspectable(null)).toBe(false);
      expect(isInspectable(undefined)).toBe(false);
      expect(isInspectable(42)).toBe(false);
    });
  });

  describe("getInspectionSize()", () => {
    it("should calculate size", () => {
      const size = getInspectionSize({ a: 1 });
      expect(size).toBeGreaterThan(0);
    });
  });
});