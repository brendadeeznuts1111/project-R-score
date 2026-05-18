/**
 * Bun v1.3.9 Markdown Performance Benchmarks
 * 
 * Demonstrates the performance improvements in Bun.Markdown:
 * - 3-15% faster Markdown-to-HTML rendering (SIMD-accelerated HTML escaping)
 * - 28% faster Bun.markdown.react() for small documents
 * - 40% reduction in string object allocations
 * - 6% smaller heap size during rendering
 */

import { performance } from "perf_hooks";

// Test markdown documents of varying sizes
const MARKDOWN_DOCS = {
  small: `# Hello World

This is a **small** markdown document with some *formatting*.

- Item 1
- Item 2
- Item 3

\`\`\`javascript
console.info("Hello");
\`\`\``,

  medium: `# Performance Benchmarks

This document demonstrates the **performance improvements** in Bun v1.3.9.

## Features

1. **SIMD-accelerated HTML escaping**
   - Characters like \`&\`, \`<\`, \`>\`, \`"\` are escaped faster
   - Uses SIMD instructions to scan 16 bytes at a time

2. **Cached HTML tag strings**
   - Frequently-used tags (\`div\`, \`p\`, \`h1\`-\`h6\`) are cached
   - Reduces string allocations by 40%

3. **Optimized React renderer**
   - \`Bun.markdown.react()\` is 28% faster for small documents
   - 7% faster for medium documents
   - 7.4% faster for large documents

## Code Example

\`\`\`typescript
import { Bun } from "bun";

const html = Bun.markdown.html(markdown);
const react = Bun.markdown.react(markdown);
\`\`\`

## Performance Table

| Input Size | Before | After | Improvement |
|------------|--------|-------|-------------|
| Small (121 chars) | 3.20 µs | 2.30 µs | **28% faster** |
| Medium (1,039 chars) | 15.09 µs | 14.02 µs | **7% faster** |
| Large (20,780 chars) | 288.48 µs | 267.14 µs | **7.4% faster** |

## Conclusion

Bun v1.3.9 brings significant performance improvements to markdown rendering!`,

  large: `# Comprehensive Markdown Performance Analysis

This is a **large** markdown document designed to test the performance improvements in Bun v1.3.9.

## Introduction

Markdown rendering performance has been significantly improved in Bun v1.3.9 through several key optimizations:

### SIMD-Accelerated HTML Escaping

The HTML escaping process now uses SIMD (Single Instruction, Multiple Data) instructions to scan for characters that need escaping. This allows scanning 16 bytes at a time, dramatically improving throughput for documents with many special characters.

**Characters Escaped:**
- \`&\` → \`&amp;\`
- \`<\` → \`&lt;\`
- \`>\` → \`&gt;\`
- \`"\` → \`&quot;\`

### Cached HTML Tag Strings

Frequently-used HTML tag strings are now cached to avoid repeated allocations. This includes:
- \`div\`, \`p\`, \`span\`
- \`h1\`, \`h2\`, \`h3\`, \`h4\`, \`h5\`, \`h6\`
- \`ul\`, \`ol\`, \`li\`
- \`code\`, \`pre\`, \`blockquote\`

### React Renderer Optimizations

The \`Bun.markdown.react()\` function has been optimized to reduce allocations and improve rendering speed.

## Performance Benchmarks

### Small Documents (121 characters)

**Before:** 3.20 µs  
**After:** 2.30 µs  
**Improvement:** 28% faster

### Medium Documents (1,039 characters)

**Before:** 15.09 µs  
**After:** 14.02 µs  
**Improvement:** 7% faster

### Large Documents (20,780 characters)

**Before:** 288.48 µs  
**After:** 267.14 µs  
**Improvement:** 7.4% faster

## Memory Improvements

- **String object count:** Reduced by 40%
- **Heap size:** Reduced by 6% for typical renders

## Usage Examples

### Basic HTML Rendering

\`\`\`typescript
import { Bun } from "bun";

const markdown = "# Hello World\\n\\nThis is **bold** text.";
const html = Bun.markdown.html(markdown);
console.info(html);
// Output: <h1>Hello World</h1><p>This is <strong>bold</strong> text.</p>
\`\`\`

### React Component Rendering

\`\`\`typescript
import { Bun } from "bun";
import React from "react";

const markdown = "# Hello World";
const Component = Bun.markdown.react(markdown);
// Component can be rendered in React
\`\`\`

## Real-World Impact

For a typical blog post or documentation page:

- **Rendering time:** Reduced by 7-15%
- **Memory usage:** Reduced by 6%
- **String allocations:** Reduced by 40%

These improvements are especially noticeable when rendering many markdown documents in sequence, such as in a static site generator or documentation site.

## Conclusion

Bun v1.3.9 brings significant performance and memory improvements to markdown rendering, making it faster and more efficient for production use.

**Key Takeaways:**
- SIMD acceleration for HTML escaping
- Cached tag strings reduce allocations
- React renderer optimizations
- Overall 7-28% performance improvement
- 40% reduction in string allocations
- 6% reduction in heap size

Thanks to @billywhizz for the contributions!`.repeat(3), // Make it even larger
};

// Benchmark function
function benchmark(name: string, fn: () => void, iterations: number): number {
  // Warmup
  for (let i = 0; i < 100; i++) {
    fn();
  }
  
  // Force garbage collection if available
  if (globalThis.gc) {
    globalThis.gc();
  }
  
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = performance.now();
  
  return end - start;
}

// Format time
function formatTime(ms: number): string {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(2)} µs`;
  }
  return `${ms.toFixed(3)} ms`;
}

// Main benchmark
async function runBenchmark() {
  console.info("=".repeat(70));
  console.info("Bun v1.3.9 Markdown Performance Benchmarks");
  console.info("=".repeat(70));
  console.info(`Bun version: ${Bun.version}`);
  console.info(`Platform: ${process.platform} ${process.arch}`);
  console.info("");
  
  const ITERATIONS = {
    small: 100_000,
    medium: 10_000,
    large: 1_000,
  };
  
  console.info("📊 Markdown-to-HTML Rendering (Bun.markdown.html)");
  console.info("-".repeat(70));
  
  for (const [size, markdown] of Object.entries(MARKDOWN_DOCS)) {
    const iterations = ITERATIONS[size as keyof typeof ITERATIONS];
    const time = benchmark(
      `toHTML-${size}`,
      () => Bun.markdown.html(markdown),
      iterations
    );
    const avgTime = time / iterations;
    const chars = markdown.length;
    
    console.info(`${size.padEnd(8)} | ${formatTime(avgTime).padEnd(12)} | ${chars.toLocaleString().padStart(6)} chars | ${iterations.toLocaleString()} iterations`);
  }
  
  console.info("");
  console.info("⚛️  React Component Rendering (Bun.markdown.react)");
  console.info("-".repeat(70));
  
  // Note: React rendering is more complex, so fewer iterations
  for (const [size, markdown] of Object.entries(MARKDOWN_DOCS)) {
    const iterations = Math.floor(ITERATIONS[size as keyof typeof ITERATIONS] / 10);
    try {
      const time = benchmark(
        `react-${size}`,
        () => Bun.markdown.react(markdown),
        iterations
      );
      const avgTime = time / iterations;
      const chars = markdown.length;
      
      console.info(`${size.padEnd(8)} | ${formatTime(avgTime).padEnd(12)} | ${chars.toLocaleString().padStart(6)} chars | ${iterations.toLocaleString()} iterations`);
    } catch (e) {
      console.info(`${size.padEnd(8)} | Error: ${e}`);
    }
  }
  
  console.info("");
  console.info("=".repeat(70));
  console.info("EXPECTED IMPROVEMENTS (v1.3.9)");
  console.info("=".repeat(70));
  console.info("• Small documents:   ~28% faster (React renderer)");
  console.info("• Medium documents:  ~7% faster (React renderer)");
  console.info("• Large documents:   ~7.4% faster (React renderer)");
  console.info("• HTML escaping:     3-15% faster (SIMD acceleration)");
  console.info("• String allocations: 40% reduction");
  console.info("• Heap size:         6% reduction");
  console.info("");
  
  // Test HTML escaping performance specifically
  console.info("🔍 HTML Escaping Performance Test");
  console.info("-".repeat(70));
  
  const escapingTest = "This has & < > \" characters that need escaping!".repeat(1000);
  const iterations = 10_000;
  
  const escapeTime = benchmark(
    "html-escape",
    () => Bun.markdown.html(escapingTest),
    iterations
  );
  const avgEscapeTime = escapeTime / iterations;
  
  console.info(`Average time per render: ${formatTime(avgEscapeTime)}`);
  console.info(`Document size: ${escapingTest.length.toLocaleString()} characters`);
  console.info(`Special chars: ${(escapingTest.match(/[&<>"]/g) || []).length.toLocaleString()}`);
  console.info("");
  console.info("Note: SIMD acceleration is most noticeable with many special characters.");
}

runBenchmark().catch(console.error);
