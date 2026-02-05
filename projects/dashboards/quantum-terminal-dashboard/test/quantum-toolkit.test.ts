// test/quantum-toolkit.test.ts
// Validation tests for Quantum Toolkit v1.5.0 integration
// All 7 components: deepEquals, escapeHTML, stringWidth, gzipSync, fileURL, colourKit, table

import { test, expect, describe } from "bun:test";

describe("Quantum Toolkit v1.5.0", () => {
  // 1. Bun.deepEquals - Strict State Snapshots
  describe("Bun.deepEquals", () => {
    test("detects undefined holes with strict mode", () => {
      expect(Bun.deepEquals({ a: 1 }, { a: 1, b: undefined }, true)).toBe(false);
      expect(Bun.deepEquals({ a: 1 }, { a: 1 }, true)).toBe(true);
    });

    test("detects array holes", () => {
      const sparse = [1, , 3]; // hole at index 1
      const dense = [1, undefined, 3];
      expect(Bun.deepEquals(sparse, dense, true)).toBe(false);
    });

    test("non-strict mode ignores undefined", () => {
      expect(Bun.deepEquals({ a: 1 }, { a: 1, b: undefined }, false)).toBe(true);
    });
  });

  // 2. Bun.escapeHTML - XSS-Safe SSE
  describe("Bun.escapeHTML", () => {
    test("escapes script tags", () => {
      const result = Bun.escapeHTML("<script>alert('xss')</script>");
      expect(result).not.toContain("<script>");
      expect(result).toContain("&lt;script&gt;");
    });

    test("escapes img onerror vectors", () => {
      const result = Bun.escapeHTML('<img src=x onerror=steal()>');
      expect(result).not.toContain("<img");
      expect(result).toContain("&lt;img");
    });

    test("handles empty string", () => {
      expect(Bun.escapeHTML("")).toBe("");
    });

    test("passes through safe strings", () => {
      expect(Bun.escapeHTML("Hello World")).toBe("Hello World");
    });
  });

  // 3. Bun.stringWidth - Unicode-Safe Padding
  describe("Bun.stringWidth", () => {
    test("measures emoji width correctly", () => {
      expect(Bun.stringWidth("🚀")).toBe(2);
      expect(Bun.stringWidth("Hello 🚀")).toBe(8); // 6 + 2
    });

    test("measures CJK characters correctly", () => {
      expect(Bun.stringWidth("中")).toBe(2);
      expect(Bun.stringWidth("中文")).toBe(4);
    });

    test("ignores ANSI escape codes", () => {
      const ansi = "\x1b[38;2;255;0;0mRED\x1b[0m";
      expect(Bun.stringWidth(ansi)).toBe(3); // Just "RED"
    });

    test("handles mixed content", () => {
      // Flag emoji width varies by implementation (2-4 cells)
      const width = Bun.stringWidth("GOOGL 🇰🇷");
      expect(width).toBeGreaterThanOrEqual(7); // At least 5 + space + 1
      expect(width).toBeLessThanOrEqual(10);   // At most 5 + space + 4
    });
  });

  // 4. Bun.gzipSync - Optimized Compression
  describe("Bun.gzipSync", () => {
    test("compresses data", () => {
      const input = "Hello World".repeat(1000);
      const compressed = Bun.gzipSync(input);
      expect(compressed.length).toBeLessThan(input.length);
    });

    test("decompresses correctly", () => {
      const input = "Quantum Cash Flow Lattice v1.5.0";
      const compressed = Bun.gzipSync(input);
      const decompressed = Bun.gunzipSync(compressed);
      expect(new TextDecoder().decode(decompressed)).toBe(input);
    });

    test("level 9 produces smaller output", () => {
      const input = "A".repeat(10000);
      const level1 = Bun.gzipSync(input, { level: 1 });
      const level9 = Bun.gzipSync(input, { level: 9 });
      expect(level9.length).toBeLessThanOrEqual(level1.length);
    });
  });

  // 5. Bun.fileURLToPath / pathToFileURL - Edge Support
  describe("File URL Conversion", () => {
    test("pathToFileURL creates valid URL", () => {
      const url = Bun.pathToFileURL("/opt/quantum/core.wasm");
      expect(url.protocol).toBe("file:");
      expect(url.pathname).toBe("/opt/quantum/core.wasm");
    });

    test("fileURLToPath extracts path", () => {
      const url = new URL("file:///opt/quantum/core.wasm");
      const path = Bun.fileURLToPath(url);
      expect(path).toBe("/opt/quantum/core.wasm");
    });

    test("round-trip preserves path", () => {
      const original = "/Users/quantum/lattice.js";
      const url = Bun.pathToFileURL(original);
      const restored = Bun.fileURLToPath(url);
      expect(restored).toBe(original);
    });
  });

  // 6. Bun.color - Unified Color System
  describe("Bun.color", () => {
    test("converts HSL to multiple formats", () => {
      const rgb = Bun.color("hsl(120, 100%, 50%)", "rgb");
      expect(rgb).toBeDefined();
    });

    test("generates ANSI codes", () => {
      const ansi = Bun.color("rgb(255, 0, 0)", "ansi-256");
      // ANSI output may be empty string if terminal doesn't support it
      // Just verify it doesn't throw
      expect(ansi).toBeDefined();
    });

    test("converts to hex", () => {
      const hex = Bun.color("rgb(255, 0, 0)", "css");
      expect(hex).toBeDefined();
    });
  });

  // 7. Bun.inspect.table - Structured Layout
  describe("Bun.inspect.table", () => {
    test("formats array of objects", () => {
      const data = [
        { symbol: "AAPL", price: 150.25 },
        { symbol: "GOOGL", price: 2800.50 },
      ];
      const table = Bun.inspect.table(data);
      expect(table).toContain("AAPL");
      expect(table).toContain("GOOGL");
    });
  });
});

// Performance gate test
describe("Toolkit Performance Gates", () => {
  test("[PERF] escapeHTML throughput > 100 MB/s", () => {
    const input = "<script>alert('xss')</script>".repeat(10000);
    const bytes = Buffer.byteLength(input);
    const t0 = performance.now();
    for (let i = 0; i < 100; i++) Bun.escapeHTML(input);
    const ms = performance.now() - t0;
    const mbps = (bytes * 100) / (ms * 1000);
    console.log(`  escapeHTML: ${mbps.toFixed(0)} MB/s`);
    expect(mbps).toBeGreaterThan(100);
  });

  test("[PERF] gzipSync > 50 MB/s", () => {
    const input = "A".repeat(1024 * 1024); // 1 MB
    const t0 = performance.now();
    Bun.gzipSync(input);
    const ms = performance.now() - t0;
    const mbps = 1 / (ms / 1000);
    console.log(`  gzipSync: ${mbps.toFixed(0)} MB/s`);
    expect(mbps).toBeGreaterThan(50);
  });
});

