/**
 * Performance Regression Tests for Bun v1.3.7
 * 
 * These tests ensure performance doesn't degrade below
 * expected thresholds for optimized features.
 */

import { describe, test, expect } from "bun:test";

describe("Performance Regression Tests", () => {
  
  test("Markdown rendering maintains performance", () => {
    const markdown = "# Title\n\n".repeat(100) + "**Bold** text. ".repeat(50);
    const iterations = 1000;
    
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      Bun.markdown.html(markdown, { tables: true });
    }
    const end = performance.now();
    
    const opsPerSec = (iterations / (end - start)) * 1000;
    console.log(`Markdown render: ${opsPerSec.toFixed(0)} ops/sec`);
    
    // Should maintain at least 20K ops/sec for large docs
    expect(opsPerSec).toBeGreaterThan(20000);
  });

  test("String.startsWith maintains intrinsic performance", () => {
    const str = "Hello World, this is a test";
    const iterations = 10000000;
    
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      str.startsWith("Hello");
    }
    const end = performance.now();
    
    const timePerOp = ((end - start) / iterations) * 1000000000; // nanoseconds
    console.log(`startsWith: ${timePerOp.toFixed(2)} ns/op`);
    
    // Should be sub-1000 nanoseconds (1 microsecond) with DFG/FTL
    expect(timePerOp).toBeLessThan(1000);
  });

  test("Set.size maintains intrinsic performance", () => {
    const set = new Set(Array.from({ length: 100 }, (_, i) => i));
    const iterations = 10000000;
    
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      set.size;
    }
    const end = performance.now();
    
    const timePerOp = ((end - start) / iterations) * 1000000000;
    console.log(`Set.size: ${timePerOp.toFixed(2)} ns/op`);
    
    // Should be sub-1000 nanoseconds (1 microsecond)
    expect(timePerOp).toBeLessThan(1000);
  });

  test("Map.size maintains intrinsic performance", () => {
    const map = new Map(Array.from({ length: 100 }, (_, i) => [i, i]));
    const iterations = 10000000;
    
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      map.size;
    }
    const end = performance.now();
    
    const timePerOp = ((end - start) / iterations) * 1000000000;
    console.log(`Map.size: ${timePerOp.toFixed(2)} ns/op`);
    
    // Should be sub-1000 nanoseconds (1 microsecond)
    expect(timePerOp).toBeLessThan(1000);
  });

  test("RegExp fixed-count maintains JIT performance", () => {
    const regex = /(?:abc){3}/;
    const text = "abcabcabcxyz".repeat(100);
    const iterations = 10000;
    
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      regex.test(text);
    }
    const end = performance.now();
    
    const opsPerSec = (iterations / (end - start)) * 1000;
    console.log(`RegExp fixed-count: ${opsPerSec.toFixed(0)} ops/sec`);
    
    // Should maintain at least 50M ops/sec with JIT
    expect(opsPerSec).toBeGreaterThan(50000000);
  });

  test("AbortSignal.abort() maintains no-listener optimization", () => {
    const iterations = 1000000;
    
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      const controller = new AbortController();
      controller.abort();
    }
    const end = performance.now();
    
    const timePerOp = ((end - start) / iterations) * 1000000; // microseconds
    console.log(`AbortSignal.abort(): ${timePerOp.toFixed(2)} µs/op`);
    
    // Should be sub-1000 microseconds with optimization
    expect(timePerOp).toBeLessThan(1000);
  });

  test("String.trim maintains direct pointer performance", () => {
    const str = "   " + "content".repeat(10) + "   ";
    const iterations = 1000000;
    
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      str.trim();
    }
    const end = performance.now();
    
    const opsPerSec = (iterations / (end - start)) * 1000;
    console.log(`String.trim: ${(opsPerSec / 1000000).toFixed(1)}M ops/sec`);
    
    // Should maintain at least 40M ops/sec
    expect(opsPerSec).toBeGreaterThan(40000000);
  });

  test("Thai stringWidth correctness", () => {
    // Thai SARA AA and SARA AM should have width 1 (not 0)
    const thaiTests = [
      { text: "คำ", expected: 2 },
      { text: "มา", expected: 2 },
      { text: "กา", expected: 2 },
    ];

    for (const { text, expected } of thaiTests) {
      const width = Bun.stringWidth(text);
      expect(width).toBe(expected);
    }
  });
});

console.log("\n🛡️ Performance Regression Tests\n");
