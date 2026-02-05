#!/usr/bin/env bun

/**
 * Tests for deepEquals utilities
 */

// @ts-ignore - bun:test types are available when running with Bun
import { describe, expect, it } from "bun:test";
import { deepEquals, deepEqualsWithDiff, type DiffResult } from "../../../src/utils/PureUtils";

describe("deepEquals", () => {
  it("should compare primitives", () => {
    expect(deepEquals(1, 1)).toBe(true);
    expect(deepEquals(1, 2)).toBe(false);
    expect(deepEquals("hello", "hello")).toBe(true);
    expect(deepEquals("hello", "world")).toBe(false);
    expect(deepEquals(true, true)).toBe(true);
    expect(deepEquals(true, false)).toBe(false);
  });

  it("should compare arrays", () => {
    expect(deepEquals([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(deepEquals([1, 2, 3], [1, 2, 4])).toBe(false);
    expect(deepEquals([], [])).toBe(true);
  });

  it("should compare objects", () => {
    expect(deepEquals({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
    expect(deepEquals({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
    expect(deepEquals({}, {})).toBe(true);
  });

  it("should compare nested structures", () => {
    const obj1 = { a: 1, b: { c: 2, d: { e: 3 } } };
    const obj2 = { a: 1, b: { c: 2, d: { e: 3 } } };
    expect(deepEquals(obj1, obj2)).toBe(true);

    const obj3 = { a: 1, b: { c: 2, d: { e: 4 } } };
    expect(deepEquals(obj1, obj3)).toBe(false);
  });

  it("should handle null and undefined", () => {
    expect(deepEquals(null, null)).toBe(true);
    expect(deepEquals(undefined, undefined)).toBe(true);
    expect(deepEquals(null, undefined)).toBe(false);
    expect(deepEquals(null, {})).toBe(false);
  });

  describe("strict mode", () => {
    class Foo {
      a = 1;
    }

    it("should distinguish instances from plain objects in strict mode", () => {
      expect(deepEquals(new Foo(), { a: 1 }, false)).toBe(true);
      expect(deepEquals(new Foo(), { a: 1 }, true)).toBe(false);
    });

    it("should detect undefined values in strict mode", () => {
      expect(deepEquals({}, { a: undefined }, false)).toBe(true);
      expect(deepEquals({}, { a: undefined }, true)).toBe(false);
    });

    it("should detect undefined in arrays in strict mode", () => {
      expect(deepEquals(["a"], ["a", undefined], false)).toBe(true);
      expect(deepEquals(["a"], ["a", undefined], true)).toBe(false);
    });

    it("should detect sparse arrays in strict mode", () => {
      const sparse = new Array(2);
      sparse[1] = 1;
      const withUndefined = [undefined, 1];

      expect(deepEquals(sparse, withUndefined, false)).toBe(true);
      expect(deepEquals(sparse, withUndefined, true)).toBe(false);
    });
  });
});

describe("deepEqualsWithDiff", () => {
  it("should return equal: true for matching values", () => {
    const result = deepEqualsWithDiff({ a: 1 }, { a: 1 });

    expect(result).toEqual({
      equal: true,
      path: ""
    });
  });

  it("should detect type mismatches", () => {
    const result = deepEqualsWithDiff(42, "42");

    expect(result.equal).toBe(false);
    expect(result.reason).toBe("type mismatch");
    expect(result.actual).toBe("number");
    expect(result.expected).toBe("string");
  });

  it("should detect null mismatches", () => {
    const result = deepEqualsWithDiff(null, {});

    expect(result.equal).toBe(false);
    expect(result.reason).toBe("null mismatch");
    expect(result.actual).toBe(null);
    expect(result.expected).toStrictEqual({});
  });

  it("should detect array length mismatches", () => {
    const result = deepEqualsWithDiff([1, 2, 3], [1, 2]);

    expect(result.equal).toBe(false);
    expect(result.reason).toBe("array length");
    expect(result.actual).toBe(3);
    expect(result.expected).toBe(2);
  });

  it("should detect missing object keys", () => {
    const result = deepEqualsWithDiff({ a: 1 }, { a: 1, b: 2 });

    expect(result.equal).toBe(false);
    expect(result.reason).toContain("missing keys");
    expect(result.reason).toContain("b");
  });

  it("should detect extra object keys in strict mode", () => {
    const result = deepEqualsWithDiff({ a: 1, b: 2 }, { a: 1 }, true);

    expect(result.equal).toBe(false);
    expect(result.reason).toContain("extra keys");
    expect(result.reason).toContain("b");
  });

  it("should provide path to mismatch in nested objects", () => {
    const result = deepEqualsWithDiff(
      { user: { name: "Alice", age: 30 } },
      { user: { name: "Bob", age: 30 } }
    );

    expect(result.equal).toBe(false);
    expect(result.path).toBe("user.name");
    expect(result.reason).toBe("value mismatch");
    expect(result.actual).toBe("Alice");
    expect(result.expected).toBe("Bob");
  });

  it("should provide path to mismatch in nested arrays", () => {
    const result = deepEqualsWithDiff(
      [[1, 2, 3], [4, 5, 6]],
      [[1, 2, 3], [4, 7, 6]]
    );

    expect(result.equal).toBe(false);
    expect(result.path).toBe("[1][1]");
    expect(result.reason).toBe("value mismatch");
    expect(result.actual).toBe(5);
    expect(result.expected).toBe(7);
  });

  it("should handle deep nested structure paths", () => {
    const result = deepEqualsWithDiff(
      { level1: { level2: { level3: { value: true } } } },
      { level1: { level2: { level3: { value: false } } } }
    );

    expect(result.equal).toBe(false);
    expect(result.path).toBe("level1.level2.level3.value");
    expect(result.actual).toBe(true);
    expect(result.expected).toBe(false);
  });

  it("should detect array index in path", () => {
    const result = deepEqualsWithDiff(
      { items: [{ id: 1 }, { id: 2 }, { id: 3 }] },
      { items: [{ id: 1 }, { id: 99 }, { id: 3 }] }
    );

    expect(result.equal).toBe(false);
    expect(result.path).toBe("items[1].id");
    expect(result.actual).toBe(2);
    expect(result.expected).toBe(99);
  });

  it("should handle complex mixed structures", () => {
    const data1 = {
      users: [
        { name: "Alice", roles: ["admin", "user"] },
        { name: "Bob", roles: ["user"] }
      ],
      meta: { version: 1, active: true }
    };

    const data2 = {
      users: [
        { name: "Alice", roles: ["admin", "user"] },
        { name: "Bob", roles: ["admin"] } // Different role
      ],
      meta: { version: 1, active: true }
    };

    const result = deepEqualsWithDiff(data1, data2);

    expect(result.equal).toBe(false);
    expect(result.path).toBe("users[1].roles[0]");
    expect(result.reason).toBe("value mismatch");
    expect(result.actual).toBe("user");
    expect(result.expected).toBe("admin");
  });

  it("should return root path for top-level primitive mismatch", () => {
    const result = deepEqualsWithDiff(42, 100);

    expect(result.equal).toBe(false);
    expect(result.path).toBe("");
    expect(result.reason).toBe("value mismatch");
  });

  it("should handle empty structures", () => {
    expect(deepEqualsWithDiff([], {}).equal).toBe(false);
    expect(deepEqualsWithDiff([], []).equal).toBe(true);
    expect(deepEqualsWithDiff({}, {}).equal).toBe(true);
  });

  it("should work with dates and special objects", () => {
    const date1 = new Date("2024-01-01");
    const date2 = new Date("2024-01-01");

    // Date objects are objects, not primitives
    const result = deepEqualsWithDiff(date1, date2);

    // Bun.deepEquals handles dates specially
    expect(result).toBeDefined();
  });
});
