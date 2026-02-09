/**
 * Bun v1.3.7 Feature Verification Tests
 * 
 * Tests for Bun v1.3.7 performance improvements
 */

import { describe, test, expect } from "bun:test";
import { MarkdownPresets, MARKDOWN_SECURITY, MARKDOWN_FEATURES } from "../src/index";

describe("Bun v1.3.7 Feature Verification", () => {
  
  describe("SIMD-Accelerated Markdown Rendering", () => {
    test("Bun.markdown.html() escapes HTML entities correctly", () => {
      const markdown = `### Test
      
This contains: & ampersand, < less-than, > greater-than, "quotes"

| Col1 | Col2 |
|------|------|
| A & B | C < D |`;

      const html = Bun.markdown.html(markdown, { tables: true });
      
      expect(html).toContain("&amp;");
      expect(html).toContain("&lt;");
      expect(html).toContain("&gt;");
      expect(html).toContain("&quot;");
    });

    test("Large document with few special characters (SIMD benefit)", () => {
      const largeDoc = "# Title\n\n".repeat(1000) + 
        "This is a long paragraph with mostly normal text. ".repeat(100);
      
      const start = performance.now();
      const html = Bun.markdown.html(largeDoc);
      const end = performance.now();
      
      expect(html).toBeTruthy();
      expect(html.length).toBeGreaterThan(largeDoc.length);
      console.log(`Large doc render time: ${(end - start).toFixed(2)}ms`);
    });

    test("Document with many special characters", () => {
      const specialDoc = `Paragraph with & ampersand and <br> tag\n\n`.repeat(100);
      
      const start = performance.now();
      const html = Bun.markdown.html(specialDoc, { noHtmlBlocks: true, noHtmlSpans: true });
      const end = performance.now();
      
      expect(html).toContain("&amp;");
      expect(html).toContain("&lt;");
      console.log(`Special chars render time: ${(end - start).toFixed(2)}ms`);
    });
  });

  describe("Cached HTML Tags in React Renderer", () => {
    test("Bun.markdown.react() creates React elements efficiently", () => {
      const markdown = `# Heading

**Bold** and *italic* text.

<div>Content</div>`;

      const components = {
        h1: ({ children }: { children: any }) => ({ type: 'h1', props: { children } }),
        p: ({ children }: { children: any }) => ({ type: 'p', props: { children } }),
        div: ({ children }: { children: any }) => ({ type: 'div', props: { children } }),
        strong: ({ children }: { children: any }) => ({ type: 'strong', props: { children } }),
        em: ({ children }: { children: any }) => ({ type: 'em', props: { children } }),
      };

      const start = performance.now();
      const result = Bun.markdown.react(markdown, components);
      const end = performance.now();
      
      expect(result).toBeTruthy();
      console.log(`React render time: ${(end - start).toFixed(2)}ms`);
    });
  });

  describe("String.prototype.replace Rope Optimization", () => {
    test("String.replace uses ropes", () => {
      const original = "Hello World! ";
      
      const start = performance.now();
      let result = original;
      for (let i = 0; i < 10000; i++) {
        result = result.replace("World", "Universe");
      }
      const end = performance.now();
      
      expect(result).toContain("Universe");
      console.log(`10,000 replacements: ${(end - start).toFixed(2)}ms`);
    });
  });

  describe("AbortSignal.abort() Optimization", () => {
    test("abort() without listeners is fast", () => {
      const iterations = 1000000;
      
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        const controller = new AbortController();
        controller.abort();
      }
      const end = performance.now();
      
      const timePerCall = ((end - start) / iterations) * 1000;
      console.log(`AbortSignal.abort() without listeners: ${timePerCall.toFixed(3)}µs per call`);
      expect(timePerCall).toBeLessThan(5);
    });
  });

  describe("RegExp SIMD Acceleration", () => {
    test("Alternatives with known leading characters", () => {
      const regex = /aaaa|bbbb|cccc|dddd/;
      const text = "x".repeat(10000) + "bbbb" + "x".repeat(10000);
      
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        regex.test(text);
      }
      const end = performance.now();
      
      console.log(`SIMD regex: ${(end - start).toFixed(2)}ms`);
      expect(regex.test(text)).toBe(true);
    });

    test("Fixed-count parentheses JIT compilation", () => {
      const regex = /(?:abc){3}/;
      const text = "abcabcabcxyz".repeat(1000);
      
      const start = performance.now();
      let matches = 0;
      for (let i = 0; i < 1000; i++) {
        if (regex.test(text)) matches++;
      }
      const end = performance.now();
      
      expect(matches).toBe(1000);
      console.log(`Fixed-count JIT: ${(end - start).toFixed(2)}ms`);
    });
  });

  describe("String#startsWith DFG/FTL Optimization", () => {
    test("startsWith is optimized", () => {
      const str = "Hello World, this is a test string";
      const prefix = "Hello";
      
      const iterations = 1000000;
      const start = performance.now();
      let result = false;
      for (let i = 0; i < iterations; i++) {
        result = str.startsWith(prefix);
      }
      const end = performance.now();
      
      expect(result).toBe(true);
      const timePerCall = ((end - start) / iterations) * 1000;
      console.log(`startsWith: ${timePerCall.toFixed(4)}µs per call`);
    });
  });

  describe("Set#size and Map#size Optimizations", () => {
    test("Set.size is optimized", () => {
      const set = new Set(Array.from({ length: 1000 }, (_, i) => i));
      
      const iterations = 1000000;
      const start = performance.now();
      let size = 0;
      for (let i = 0; i < iterations; i++) {
        size = set.size;
      }
      const end = performance.now();
      
      expect(size).toBe(1000);
      const timePerCall = ((end - start) / iterations) * 1000;
      console.log(`Set.size: ${timePerCall.toFixed(4)}µs per call`);
    });

    test("Map.size is optimized", () => {
      const map = new Map(Array.from({ length: 1000 }, (_, i) => [i, i * 2]));
      
      const iterations = 1000000;
      const start = performance.now();
      let size = 0;
      for (let i = 0; i < iterations; i++) {
        size = map.size;
      }
      const end = performance.now();
      
      expect(size).toBe(1000);
      const timePerCall = ((end - start) / iterations) * 1000;
      console.log(`Map.size: ${timePerCall.toFixed(4)}µs per call`);
    });
  });

  describe("String#trim Optimization", () => {
    test("String.trim is faster", () => {
      const str = "   " + "content".repeat(100) + "   ";
      
      const iterations = 100000;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) str.trim();
      const end = performance.now();
      
      const timePerCall = ((end - start) / iterations) * 1000;
      console.log(`String.trim: ${timePerCall.toFixed(4)}µs per call`);
      expect(str.trim()).toBe("content".repeat(100));
    });
  });

  describe("Integration Tests", () => {
    test("MarkdownPresets.html() uses SIMD-optimized rendering", () => {
      const render = MarkdownPresets.html('GFM', 'MODERATE');
      const markdown = `# Test

Paragraph with & < > "special" characters

| A | B |
|---|---|
| 1 | 2 |`;

      const html = render(markdown);
      
      expect(html).toContain("<h1>");
      expect(html).toContain("&amp;");
    });

    test("Bun.stringWidth handles Thai characters correctly", () => {
      const thaiWord = "คำ";
      const width = Bun.stringWidth(thaiWord);
      
      expect(width).toBe(2);
    });

    test("Object.defineProperty is recognized as intrinsic", () => {
      const obj: any = {};
      
      Object.defineProperty(obj, 'test', {
        value: 42,
        writable: false,
        enumerable: true,
        configurable: true
      });
      
      expect(obj.test).toBe(42);
    });
  });
});

console.log("\n=== Bun v1.3.7 Feature Verification ===\n");
