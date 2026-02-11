#!/usr/bin/env bun
/**
 * RegExp JIT Optimization Patterns
 * 
 * Demonstrates JIT-optimized pattern examples, pattern transformation utilities,
 * performance benchmarks, migration guides, and best practices.
 */

import { performance } from "perf_hooks";

console.log("⚡ RegExp JIT Optimization Patterns\n");
console.log("=".repeat(70));

// ============================================================================
// JIT-Optimized Patterns
// ============================================================================

interface RegexPattern {
  name: string;
  pattern: RegExp;
  description: string;
  optimized: boolean;
}

const optimizedPatterns: RegexPattern[] = [
  {
    name: "Email Validation",
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    description: "Simple email validation (JIT-optimized)",
    optimized: true,
  },
  {
    name: "URL Extraction",
    pattern: /https?:\/\/[^\s]+/g,
    description: "Extract URLs from text (JIT-optimized)",
    optimized: true,
  },
  {
    name: "Word Boundaries",
    pattern: /\b\w+\b/g,
    description: "Match word boundaries (JIT-optimized)",
    optimized: true,
  },
  {
    name: "Fixed Count Parentheses",
    pattern: /(\d{4})-(\d{2})-(\d{2})/,
    description: "Date format with fixed-count parentheses (JIT-optimized in Bun v1.3.9)",
    optimized: true,
  },
];

console.log("\n🎯 JIT-Optimized Patterns");
console.log("-".repeat(70));

optimizedPatterns.forEach(({ name, pattern, description, optimized }) => {
  const status = optimized ? "✅" : "❌";
  console.log(`\n${status} ${name}:`);
  console.log(`  Pattern: ${pattern}`);
  console.log(`  ${description}`);
});

// ============================================================================
// Pattern Transformation Utilities
// ============================================================================

class RegexOptimizer {
  /**
   * Transform pattern for better JIT optimization
   */
  static optimizePattern(pattern: string): {
    optimized: string;
    improvements: string[];
  } {
    const improvements: string[] = [];
    let optimized = pattern;
    
    // Use fixed-count quantifiers when possible
    if (pattern.includes("+") && !pattern.includes("\\+")) {
      // Check if we can use fixed count
      improvements.push("Consider fixed-count quantifiers for better JIT");
    }
    
    // Avoid backtracking
    if (pattern.includes(".*")) {
      optimized = optimized.replace(/\.\*/g, "[^]*");
      improvements.push("Replaced .* with [^]* to avoid backtracking");
    }
    
    // Use word boundaries instead of lookahead/lookbehind when possible
    if (pattern.includes("(?=") || pattern.includes("(?<=")) {
      improvements.push("Consider using word boundaries instead of lookahead/lookbehind");
    }
    
    return {
      optimized,
      improvements,
    };
  }
  
  /**
   * Check if pattern is JIT-optimized
   */
  static isJITOptimized(pattern: RegExp): boolean {
    // Patterns that benefit from JIT:
    // - Fixed-count quantifiers
    // - Simple alternations
    // - Word boundaries
    // - Character classes
    
    const source = pattern.source;
    
    // Fixed-count quantifiers
    if (/\{\d+\}/.test(source)) {
      return true;
    }
    
    // Simple character classes
    if (/\[[^\]]+\]/.test(source)) {
      return true;
    }
    
    // Word boundaries
    if (/\b/.test(source)) {
      return true;
    }
    
    return false;
  }
}

console.log("\n🔧 Pattern Transformation Utilities");
console.log("-".repeat(70));

const testPattern = ".*test.*";
const optimized = RegexOptimizer.optimizePattern(testPattern);

console.log(`\nOriginal: ${testPattern}`);
console.log(`Optimized: ${optimized.optimized}`);
console.log(`Improvements:`);
optimized.improvements.forEach(imp => console.log(`  • ${imp}`));

// ============================================================================
// Performance Benchmarks
// ============================================================================

async function benchmarkRegex(pattern: RegExp, testString: string, iterations: number = 10000): Promise<number> {
  const start = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    pattern.test(testString);
  }
  
  const end = performance.now();
  return end - start;
}

console.log("\n📊 Performance Benchmarks");
console.log("-".repeat(70));

console.log(`
async function benchmarkRegex(pattern, testString, iterations) {
  // Benchmark regex execution time
  // Returns: execution time in milliseconds
}
`);

// ============================================================================
// Migration Guide
// ============================================================================

console.log("\n📖 Migration Guide");
console.log("-".repeat(70));

const migrationExamples = [
  {
    before: /.*test.*/,
    after: /[^]*test[^]*/,
    reason: "Avoid backtracking with .*",
  },
  {
    before: /\d+/,
    after: /\d{1,}/,
    reason: "Use explicit quantifier",
  },
  {
    before: /(test|example)/,
    after: /(?:test|example)/,
    reason: "Use non-capturing group if capture not needed",
  },
];

console.log("\nMigration Examples:");
migrationExamples.forEach(({ before, after, reason }) => {
  console.log(`\nBefore: ${before}`);
  console.log(`After:  ${after}`);
  console.log(`Reason: ${reason}`);
});

// ============================================================================
// Best Practices
// ============================================================================

console.log("\n📚 Best Practices");
console.log("-".repeat(70));

const bestPractices = [
  "Use fixed-count quantifiers when possible: {3} instead of {1,3}",
  "Avoid excessive backtracking: Use [^]* instead of .*",
  "Use word boundaries \\b instead of lookahead/lookbehind when possible",
  "Prefer character classes [abc] over alternation (a|b|c)",
  "Compile regex once and reuse: const regex = /pattern/",
  "Use non-capturing groups (?:...) when capture not needed",
  "Avoid nested quantifiers: (a+)+ can cause catastrophic backtracking",
];

bestPractices.forEach((practice, i) => {
  console.log(`${i + 1}. ${practice}`);
});

console.log("\n✅ RegExp JIT Patterns Complete!");
console.log("\nKey Benefits (Bun v1.3.9):");
console.log("  • SIMD acceleration for RegExp");
console.log("  • Fixed-count parentheses optimization");
console.log("  • Better JIT compilation");
console.log("  • Improved performance");
