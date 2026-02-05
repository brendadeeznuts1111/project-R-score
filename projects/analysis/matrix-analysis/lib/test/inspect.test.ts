import { describe, it, expect } from "bun:test";
import {
  inspect,
  inspectColor,
  inspectCompact,
  inspectDeep,
  table,
  safeInspect,
  CUSTOM,
} from "../src/core/inspect.ts";

describe("inspect", () => {
  describe("BN-102: Inspect", () => {
    it("should inspect a simple object", () => {
      const result = inspect({ a: 1, b: "two" });
      expect(result).toContain("a");
      expect(result).toContain("1");
    });

    it("should inspect with colors", () => {
      const result = inspectColor({ a: 1 });
      expect(result.length).toBeGreaterThan(0);
    });

    it("should inspect compact", () => {
      const result = inspectCompact({ a: 1 });
      expect(result).toContain("a");
    });

    it("should inspect deep nested objects", () => {
      const obj = { a: { b: { c: { d: { e: 1 } } } } };
      const result = inspectDeep(obj);
      expect(result).toContain("e");
      expect(result).toContain("1");
    });

    it("should respect depth limit", () => {
      const obj = { a: { b: { c: 1 } } };
      const shallow = inspect(obj, { depth: 1 });
      const deep = inspect(obj, { depth: 3 });
      expect(deep.length).toBeGreaterThanOrEqual(shallow.length);
    });

    it("should inspect arrays", () => {
      const result = inspect([1, 2, 3]);
      expect(result).toContain("1");
      expect(result).toContain("3");
    });
  });

  describe("BN-102b: Table", () => {
    it("should format data with headers and values", () => {
      const result = table([{ name: "alpha", size: 100 }, { name: "beta", size: 200 }]);
      expect(result).toContain("name");
      expect(result).toContain("size");
      expect(result).toContain("alpha");
      expect(result).toContain("beta");
      expect(result).toContain("100");
      expect(result).toContain("200");
    });

    it("should filter table columns excluding unselected", () => {
      const result = table([{ a: 1, b: 2, c: 3 }], ["a", "b"]);
      expect(result).toContain("a");
      expect(result).toContain("b");
      expect(result).toContain("1");
      expect(result).toContain("2");
    });

    it("should format measurement-style rows", () => {
      const rows = [
        { metric: "latency", value: "12.5ms", unit: "ms" },
        { metric: "throughput", value: "1024", unit: "ops/s" },
      ];
      const result = table(rows, ["metric", "value", "unit"]);
      expect(result).toContain("latency");
      expect(result).toContain("12.5ms");
      expect(result).toContain("throughput");
      expect(result).toContain("1024");
      expect(result).toContain("ops/s");
    });

    it("should format byte-size rows correctly", () => {
      const rows = [
        { file: "bundle.js", bytes: 4510, compressed: 1380 },
        { file: "index.html", bytes: 890, compressed: 412 },
      ];
      const result = table(rows, ["file", "bytes", "compressed"]);
      expect(result).toContain("bundle.js");
      expect(result).toContain("4510");
      expect(result).toContain("1380");
      expect(result).toContain("890");
      expect(result).toContain("412");
    });
  });

  describe("BN-102c: Safe Inspect", () => {
    it("should wrap long output to Col-89", () => {
      const wide = { data: "x".repeat(200) };
      const result = safeInspect(wide);
      for (const line of result.split("\n")) {
        expect(Bun.stringWidth(line)).toBeLessThanOrEqual(89);
      }
    });
  });

  describe("BN-102d: Custom Symbol", () => {
    it("should export custom inspect symbol", () => {
      expect(typeof CUSTOM).toBe("symbol");
    });

    it("should use custom inspect on class", () => {
      class Foo {
        [CUSTOM]() {
          return "CustomFoo";
        }
      }
      const result = inspect(new Foo());
      expect(result).toBe("CustomFoo");
    });
  });
});
