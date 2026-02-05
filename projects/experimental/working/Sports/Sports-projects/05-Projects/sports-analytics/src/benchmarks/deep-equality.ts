/**
 * T3-Lattice Deep Equality Benchmark
 * Compares different methods for checking equality of Lattice data structures
 */

import { bench, run } from "mitata";
import { expect } from "bun:test";

// Prepare complex data structures
const baseData = {
  marketId: "market_123",
  timestamp: Date.now(),
  odds: Object.fromEntries(Array.from({ length: 100 }, (_, i) => [i.toString(), Math.random()])),
  regime: "▵⟂⥂",
  metadata: {
    version: "3.3.0",
    region: "us-east-1",
    tags: ["live", "high-priority", "optimized"],
    nested: {
      a: 1,
      b: [1, 2, 3],
      c: { d: "e" }
    }
  }
};

const identicalData = JSON.parse(JSON.stringify(baseData));
const slightlyDifferentData = JSON.parse(JSON.stringify(baseData));
slightlyDifferentData.metadata.nested.c.d = "f";

console.log("🧬 T3-Lattice Deep Equality Benchmarks");
console.log("=======================================");

bench("JSON.stringify comparison", () => {
  return JSON.stringify(baseData) === JSON.stringify(identicalData);
});

bench("bun:test expect().toEqual() (simulated)", () => {
  try {
    expect(baseData).toEqual(identicalData);
    return true;
  } catch {
    return false;
  }
});

// Simple recursive deep equal for comparison
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!keysB.includes(key) || !deepEqual(a[key], b[key])) return false;
  }
  return true;
}

bench("Custom recursive deepEqual", () => {
  return deepEqual(baseData, identicalData);
});

await run();
