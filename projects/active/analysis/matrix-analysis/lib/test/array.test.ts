import { describe, it, expect } from "bun:test";
import {
  chunk,
  windows,
  unique,
  uniqueBy,
  groupBy,
  partition,
  countBy,
  compact,
  flatten,
  zip,
  interleave,
  sum,
  mean,
  minBy,
  maxBy,
  sortBy,
} from "../src/core/array.ts";

describe("array", () => {
  describe("BN-075: chunk & windows", () => {
    it("should chunk array into groups", () => {
      expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    });

    it("should return empty for size < 1", () => {
      expect(chunk([1, 2], 0)).toEqual([]);
    });

    it("should handle exact divisions", () => {
      expect(chunk([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
    });

    it("should create sliding windows", () => {
      expect(windows([1, 2, 3, 4], 3)).toEqual([[1, 2, 3], [2, 3, 4]]);
    });

    it("should return empty for window > array", () => {
      expect(windows([1, 2], 3)).toEqual([]);
    });
  });

  describe("BN-076: unique & uniqueBy", () => {
    it("should deduplicate primitives", () => {
      expect(unique([1, 2, 2, 3, 1])).toEqual([1, 2, 3]);
    });

    it("should deduplicate strings", () => {
      expect(unique(["a", "b", "a"])).toEqual(["a", "b"]);
    });

    it("should deduplicate by key function", () => {
      const items = [{ id: 1, n: "a" }, { id: 2, n: "b" }, { id: 1, n: "c" }];
      expect(uniqueBy(items, i => i.id)).toEqual([{ id: 1, n: "a" }, { id: 2, n: "b" }]);
    });
  });

  describe("BN-077: groupBy & partition", () => {
    it("should group by key function", () => {
      const items = [{ type: "a", v: 1 }, { type: "b", v: 2 }, { type: "a", v: 3 }];
      const groups = groupBy(items, i => i.type);
      expect(groups.a.length).toBe(2);
      expect(groups.b.length).toBe(1);
    });

    it("should partition by predicate", () => {
      const [evens, odds] = partition([1, 2, 3, 4, 5], n => n % 2 === 0);
      expect(evens).toEqual([2, 4]);
      expect(odds).toEqual([1, 3, 5]);
    });

    it("should count by key", () => {
      const counts = countBy(["a", "b", "a", "c", "b", "a"], x => x);
      expect(counts).toEqual({ a: 3, b: 2, c: 1 });
    });
  });

  describe("BN-078: filter & transform", () => {
    it("should compact falsy values", () => {
      expect(compact([0, 1, null, 2, undefined, 3, false, "", "a"])).toEqual([1, 2, 3, "a"]);
    });

    it("should flatten one level", () => {
      expect(flatten([1, [2, 3], 4, [5]])).toEqual([1, 2, 3, 4, 5]);
    });

    it("should zip two arrays", () => {
      expect(zip([1, 2, 3], ["a", "b", "c"])).toEqual([[1, "a"], [2, "b"], [3, "c"]]);
    });

    it("should zip uneven arrays to shortest", () => {
      expect(zip([1, 2], ["a", "b", "c"])).toEqual([[1, "a"], [2, "b"]]);
    });

    it("should interleave two arrays", () => {
      expect(interleave([1, 3, 5], [2, 4, 6])).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it("should interleave uneven arrays", () => {
      expect(interleave([1, 3], [2, 4, 6])).toEqual([1, 2, 3, 4, 6]);
    });
  });

  describe("BN-079: aggregate & search", () => {
    it("should sum numbers", () => {
      expect(sum([1, 2, 3, 4])).toBe(10);
    });

    it("should return 0 for empty sum", () => {
      expect(sum([])).toBe(0);
    });

    it("should calculate mean", () => {
      expect(mean([2, 4, 6])).toBe(4);
    });

    it("should return 0 for empty mean", () => {
      expect(mean([])).toBe(0);
    });

    it("should find minBy", () => {
      const items = [{ n: "c", v: 3 }, { n: "a", v: 1 }, { n: "b", v: 2 }];
      expect(minBy(items, i => i.v)).toEqual({ n: "a", v: 1 });
    });

    it("should find maxBy", () => {
      const items = [{ n: "c", v: 3 }, { n: "a", v: 1 }, { n: "b", v: 2 }];
      expect(maxBy(items, i => i.v)).toEqual({ n: "c", v: 3 });
    });

    it("should find maxBy when max is not first", () => {
      const items = [{ v: 1 }, { v: 5 }, { v: 3 }];
      expect(maxBy(items, i => i.v)).toEqual({ v: 5 });
    });

    it("should find maxBy with single element", () => {
      expect(maxBy([{ v: 7 }], i => i.v)).toEqual({ v: 7 });
    });

    it("should return null for empty minBy/maxBy", () => {
      expect(minBy([], () => 0)).toBeNull();
      expect(maxBy([], () => 0)).toBeNull();
    });

    it("should sortBy numeric key", () => {
      const items = [{ v: 3 }, { v: 1 }, { v: 2 }];
      expect(sortBy(items, i => i.v)).toEqual([{ v: 1 }, { v: 2 }, { v: 3 }]);
    });

    it("should sortBy string key", () => {
      expect(sortBy(["banana", "apple", "cherry"], s => s)).toEqual(["apple", "banana", "cherry"]);
    });
  });
});
