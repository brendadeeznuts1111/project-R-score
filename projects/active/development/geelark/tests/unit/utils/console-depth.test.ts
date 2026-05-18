#!/usr/bin/env bun

import { describe, expect, test } from "bun:test";
import { inspect } from "bun";

describe("--console-depth edge cases", () => {
  test("depth truncation behavior", () => {
    const deep = {
      insights: {
        files: [{ name: "deep", nested: { a: { b: { c: { d: 42 } } } } }],
        stats: { health: 85, meta: { timestamp: Date.now(), env: process.env } }
      }
    };

    // Shallow (depth=2) - should truncate nested objects
    const shallow = inspect(deep, { depth: 2 });
    expect(shallow).not.toContain("timestamp");  // Truncated at depth 2
    expect(shallow).toContain("health"); // Should show level 2

    // Deep (depth=10)
    const deepInspect = inspect(deep, { depth: 10 });
    expect(deepInspect).toContain("timestamp");
    expect(deepInspect).toContain("env");
  });

  test("very deep nesting with different depths", () => {
    const veryDeep = {
      level1: {
        level2: {
          level3: {
            level4: {
              level5: {
                level6: {
                  level7: {
                    level8: {
                      level9: {
                        level10: { value: "found" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    };

    // Depth 2 should truncate before level10
    const depth2 = inspect(veryDeep, { depth: 2 });
    expect(depth2).not.toContain("level10");
    expect(depth2).not.toContain("found");

    // Depth 10 should show everything
    const depth10 = inspect(veryDeep, { depth: 10 });
    expect(depth10).toContain("level10");
    expect(depth10).toContain("found");
  });

  test("arrays with deep nesting", () => {
    const deepArray = [
      {
        items: [
          {
            nested: {
              deeply: {
                hidden: { secret: "value" }
              }
            }
          }
        ]
      }
    ];

    // Shallow depth should truncate arrays too
    const shallow = inspect(deepArray, { depth: 2 });
    expect(shallow).not.toContain("secret");
    expect(shallow).not.toContain("value");

    // Deep depth should show array contents
    const deep = inspect(deepArray, { depth: 6 });
    expect(deep).toContain("secret");
    expect(deep).toContain("value");
  });

  test("circular references don't break depth limits", () => {
    const circular: any = { name: "root" };
    circular.self = circular;
    circular.nested = {
      deep: {
        deeper: {
          circular: circular
        }
      }
    };

    // Should handle circular refs even with depth limit
    const result = inspect(circular, { depth: 3 });
    expect(result).toContain("root");
    expect(result).toContain("circular"); // Should detect circular reference
  });

  test("depth 0 shows only top level", () => {
    const obj = {
      level1: {
        level2: { value: "hidden" }
      },
      topLevel: "visible"
    };

    const depth0 = inspect(obj, { depth: 0 });
    expect(depth0).toContain("topLevel");
    expect(depth0).toContain("visible");
    expect(depth0).not.toContain("level2");
    expect(depth0).not.toContain("hidden");
  });

  test("default depth behavior", () => {
    const obj = {
      a: {
        b: {
          c: { value: "should be truncated" }
        }
      }
    };

    // Bun's default inspect shows all levels (no default depth limit)
    const defaultInspect = inspect(obj);
    expect(defaultInspect).toContain("should be truncated");

    // But explicit depth=2 should truncate
    const depth2 = inspect(obj, { depth: 2 });
    expect(depth2).not.toContain("should be truncated");
  });
});
