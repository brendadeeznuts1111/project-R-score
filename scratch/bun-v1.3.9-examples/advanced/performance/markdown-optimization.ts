#!/usr/bin/env bun
/**
 * Markdown Optimization Patterns
 * 
 * Demonstrates rendering optimization strategies, caching patterns,
 * React integration, performance tuning, and memory optimization.
 */

import { performance } from "perf_hooks";

console.log("📝 Markdown Optimization Patterns\n");
console.log("=".repeat(70));

// ============================================================================
// Rendering Optimization Strategies
// ============================================================================

interface MarkdownCache {
  content: string;
  html: string;
  timestamp: number;
}

class OptimizedMarkdownRenderer {
  private cache = new Map<string, MarkdownCache>();
  private cacheTTL: number = 3600000; // 1 hour
  
  /**
   * Render markdown with caching
   */
  async render(content: string, useCache: boolean = true): Promise<string> {
    if (useCache) {
      const cached = this.cache.get(content);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        return cached.html;
      }
    }
    
    const start = performance.now();
    const html = Bun.markdown.html(content);
    const duration = performance.now() - start;
    
    if (useCache) {
      this.cache.set(content, {
        content,
        html,
        timestamp: Date.now(),
      });
    }
    
    return html;
  }
  
  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
  
  /**
   * Get cache stats
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
  } {
    return {
      size: this.cache.size,
      hitRate: 0, // Would track hits/misses in real implementation
    };
  }
}

console.log("\n⚡ Rendering Optimization Strategies");
console.log("-".repeat(70));

const renderer = new OptimizedMarkdownRenderer();

console.log(`
class OptimizedMarkdownRenderer {
  async render(content, useCache) {
    // Render with caching for better performance
  }
  
  clearCache() {
    // Clear cache when needed
  }
}
`);

// ============================================================================
// Caching Patterns
// ============================================================================

console.log("\n💾 Caching Patterns");
console.log("-".repeat(70));

const cachingStrategies = [
  {
    strategy: "Content-based caching",
    description: "Cache by markdown content hash",
    benefit: "Avoid re-rendering identical content",
  },
  {
    strategy: "Time-based caching",
    description: "Cache with TTL",
    benefit: "Balance freshness and performance",
  },
  {
    strategy: "LRU cache",
    description: "Evict least recently used entries",
    benefit: "Limit memory usage",
  },
  {
    strategy: "Incremental rendering",
    description: "Only re-render changed sections",
    benefit: "Faster updates for large documents",
  },
];

cachingStrategies.forEach(strategy => {
  console.log(`\n${strategy.strategy}:`);
  console.log(`  ${strategy.description}`);
  console.log(`  Benefit: ${strategy.benefit}`);
});

// ============================================================================
// React Integration
// ============================================================================

console.log("\n⚛️  React Integration");
console.log("-".repeat(70));

console.log(`
// Using Bun.markdown.react() for React components

import { Bun } from "bun";

function MarkdownComponent({ content }: { content: string }) {
  // Bun v1.3.9: Faster markdown.react()
  const components = Bun.markdown.react(content);
  
  return <div>{components}</div>;
}

// Benefits:
// • Faster rendering (Bun v1.3.9 optimization)
// • Direct React component output
// • Better performance than toHTML + dangerouslySetInnerHTML
`);

// ============================================================================
// Performance Tuning
// ============================================================================

console.log("\n🎯 Performance Tuning");
console.log("-".repeat(70));

const performanceTips = [
  {
    tip: "Use caching for repeated content",
    impact: "High",
    example: "Cache rendered markdown by content hash",
  },
  {
    tip: "Batch rendering operations",
    impact: "Medium",
    example: "Render multiple markdown blocks together",
  },
  {
    tip: "Use Bun.markdown.react() for React",
    impact: "High",
    example: "Direct React component output",
  },
  {
    tip: "Lazy load markdown content",
    impact: "Medium",
    example: "Load and render on demand",
  },
];

performanceTips.forEach(({ tip, impact, example }) => {
  const emoji = impact === "High" ? "🔥" : "⚡";
  console.log(`\n${emoji} ${tip}:`);
  console.log(`  Impact: ${impact}`);
  console.log(`  Example: ${example}`);
});

// ============================================================================
// Memory Optimization
// ============================================================================

console.log("\n💾 Memory Optimization");
console.log("-".repeat(70));

console.log(`
Memory optimization strategies:

• Limit cache size: Use LRU cache with max size
• Clear cache periodically: Remove old entries
• Use streaming for large documents: Process in chunks
• Avoid storing raw markdown: Only cache rendered HTML
• Use weak references: Allow garbage collection when possible
`);

console.log("\n✅ Markdown Optimization Complete!");
console.log("\nKey Benefits (Bun v1.3.9):");
console.log("  • Faster Markdown.toHTML rendering");
console.log("  • Faster Bun.markdown.react()");
console.log("  • SIMD acceleration");
console.log("  • Better caching support");
