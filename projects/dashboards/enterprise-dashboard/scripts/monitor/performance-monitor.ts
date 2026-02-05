#!/usr/bin/env bun

/**
 * Performance monitoring and metrics collection
 * Tracks loading performance, bundle sizes, and optimization effectiveness
 */

import { Database } from "bun:sqlite";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

interface PerformanceMetrics {
  timestamp: string;
  bundleSizes: Record<string, number>;
  loadTimes: Record<string, number>;
  cacheHits: number;
  totalRequests: number;
  optimizationScore: number;
}

class PerformanceMonitor {
  private db: Database;
  private metrics: PerformanceMetrics[] = [];

  constructor() {
    this.db = new Database("performance.db");

    // Create performance metrics table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        bundle_sizes TEXT NOT NULL,
        load_times TEXT DEFAULT '{}',
        cache_hits INTEGER DEFAULT 0,
        total_requests INTEGER DEFAULT 0,
        optimization_score REAL DEFAULT 0
      )
    `);
  }

  async measureBundleSizes(): Promise<Record<string, number>> {
    const distDir = join(process.cwd(), "public", "dist");
    const sizes: Record<string, number> = {};

    if (!existsSync(distDir)) {
      console.warn("Dist directory not found");
      return sizes;
    }

    // Use glob to find all JS/CSS files
    const { glob } = await import("glob");
    const files = await glob("**/*.{js,css}", { cwd: distDir });

    for (const file of files) {
      try {
        const filePath = join(distDir, file);
        const stats = await import("fs/promises").then(fs => fs.stat(filePath));
        sizes[file] = stats.size;
      } catch (error) {
        console.warn(`Could not read ${file}:`, error);
      }
    }

    return sizes;
  }

  calculateOptimizationScore(bundleSizes: Record<string, number>): number {
    const totalSize = Object.values(bundleSizes).reduce((sum, size) => sum + size, 0);
    const largestBundle = Math.max(...Object.values(bundleSizes));
    const bundleCount = Object.keys(bundleSizes).length;

    // Score based on:
    // - Total size (lower is better)
    // - Largest bundle size (smaller chunks are better)
    // - Number of bundles (more chunks indicate better splitting)

    const sizeScore = Math.max(0, 100 - (totalSize / 1024 / 1024) * 10); // Penalize >100MB
    const chunkScore = Math.max(0, 100 - (largestBundle / 1024 / 1024) * 50); // Penalize >2MB chunks
    const splitScore = Math.min(100, bundleCount * 5); // Reward more bundles (up to 20)

    return Math.round((sizeScore + chunkScore + splitScore) / 3);
  }

  async recordMetrics(): Promise<void> {
    const bundleSizes = await this.measureBundleSizes();
    const optimizationScore = this.calculateOptimizationScore(bundleSizes);

    const metrics: PerformanceMetrics = {
      timestamp: new Date().toISOString(),
      bundleSizes,
      loadTimes: {}, // Would be populated from actual page loads
      cacheHits: 0,
      totalRequests: 0,
      optimizationScore
    };

    this.db.run(
      `INSERT INTO metrics (timestamp, bundle_sizes, optimization_score)
       VALUES (?, ?, ?)`,
      [metrics.timestamp, JSON.stringify(bundleSizes), optimizationScore]
    );

    this.metrics.push(metrics);
    console.log(`📊 Performance metrics recorded - Score: ${optimizationScore}/100`);
  }

  getLatestMetrics(): PerformanceMetrics | null {
    // Try in-memory first, then database
    if (this.metrics.length > 0) {
      return this.metrics[this.metrics.length - 1];
    }

    // Query database
    const result = this.db.query("SELECT * FROM metrics ORDER BY id DESC LIMIT 1").get() as any;
    if (result) {
      return {
        timestamp: result.timestamp,
        bundleSizes: JSON.parse(result.bundle_sizes),
        loadTimes: JSON.parse(result.load_times || '{}'),
        cacheHits: result.cache_hits || 0,
        totalRequests: result.total_requests || 0,
        optimizationScore: result.optimization_score || 0
      };
    }

    return null;
  }

  generateReport(): string {
    const latest = this.getLatestMetrics();
    if (!latest) return "No metrics available";

    const totalSize = Object.values(latest.bundleSizes).reduce((sum, size) => sum + size, 0);
    const bundleCount = Object.keys(latest.bundleSizes).length;
    const avgSize = totalSize / bundleCount;

    return `
🚀 Performance Report
━━━━━━━━━━━━━━━━━━━━━

📦 Bundle Analysis:
   Total Size: ${(totalSize / 1024 / 1024).toFixed(2)} MB
   Bundle Count: ${bundleCount}
   Average Size: ${(avgSize / 1024).toFixed(1)} KB
   Largest Bundle: ${(Math.max(...Object.values(latest.bundleSizes)) / 1024).toFixed(1)} KB

🏆 Optimization Score: ${latest.optimizationScore}/100

📋 Top Bundles:
${Object.entries(latest.bundleSizes)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 5)
  .map(([name, size]) => `   ${name}: ${(size / 1024).toFixed(1)} KB`)
  .join('\n')}

⏱️  Recorded: ${new Date(latest.timestamp).toLocaleString()}
    `;
  }
}

// CLI interface
async function main() {
  const monitor = new PerformanceMonitor();

  const command = process.argv[2];

  switch (command) {
    case "record":
      await monitor.recordMetrics();
      break;

    case "report":
      console.log(monitor.generateReport());
      break;

    case "watch":
      console.log("📊 Starting performance monitoring...");
      setInterval(() => monitor.recordMetrics(), 30000); // Every 30 seconds
      // Keep process alive
      process.stdin.resume();
      break;

    default:
      console.log(`
Performance Monitor Usage:
  record    - Record current metrics
  report    - Show latest performance report
  watch     - Continuously monitor performance

Example: bun run scripts/performance-monitor.ts record
      `);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}

export { PerformanceMonitor };