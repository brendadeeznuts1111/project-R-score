#!/usr/bin/env bun
/**
 * Monitoring Utilities Reference Implementation
 * 
 * Utilities for monitoring, metrics collection, performance tracking,
 * and observability in production environments.
 */

import { performance } from "perf_hooks";

console.log("📚 Monitoring Utilities\n");
console.log("=".repeat(70));

// ============================================================================
// Performance Monitor
// ============================================================================

interface PerformanceMetrics {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  
  start(name: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.metrics.push({
        name,
        duration,
        timestamp: Date.now(),
      });
    };
  }
  
  getMetrics(filter?: { name?: string }): PerformanceMetrics[] {
    if (filter?.name) {
      return this.metrics.filter(m => m.name === filter.name);
    }
    return [...this.metrics];
  }
  
  getAverageDuration(name: string): number {
    const metrics = this.metrics.filter(m => m.name === name);
    if (metrics.length === 0) return 0;
    
    const sum = metrics.reduce((acc, m) => acc + m.duration, 0);
    return sum / metrics.length;
  }
  
  clear(): void {
    this.metrics = [];
  }
}

// ============================================================================
// Usage Example
// ============================================================================

console.log("\n📝 Example: Performance Monitor");
console.log("-".repeat(70));

const monitor = new PerformanceMonitor();

console.log(`
const monitor = new PerformanceMonitor();

// Measure operation
const end = monitor.start("operation");
// ... do work ...
end();

// Get metrics
const avgDuration = monitor.getAverageDuration("operation");
console.log(\`Average: \${avgDuration}ms\`);
`);

console.log("\n✅ Monitoring Utilities Complete!");
console.log("\nKey Features:");
console.log("  • Performance tracking");
console.log("  • Metrics collection");
console.log("  • Average calculation");
console.log("  • Filtering and querying");
