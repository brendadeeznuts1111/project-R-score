import { describe, test, expect } from "bun:test";

describe("Unicode Fixed-Count Regex JIT Optimization", () => {
  const pattern = /(?:▵⟂){3}/;

  test("exact match", () => {
    expect(pattern.test("▵⟂▵⟂▵⟂")).toBe(true);
  });

  test("insufficient repetitions", () => {
    expect(pattern.test("▵⟂▵⟂")).toBe(false);
  });

  test("excess characters", () => {
    expect(pattern.test("▵⟂▵⟂▵⟂▵⟂")).toBe(true); // partial match
  });

  test("interrupted sequence", () => {
    expect(pattern.test("▵⟂▵▲▵⟂")).toBe(false);
  });

  test("empty string", () => {
    expect(pattern.test("")).toBe(false);
  });

  test("performance benchmark", () => {
    const longString = "▵⟂".repeat(15000); // 30k repetitions
    const start = performance.now();
    const result = pattern.test(longString);
    const end = performance.now();

    expect(result).toBe(true);
    expect(end - start).toBeLessThan(5); // Should be < 5ms with JIT
  });
});
