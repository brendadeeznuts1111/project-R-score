#!/usr/bin/env bun

/**
 * 🧠 Fire22 Memory Profiler
 *
 * Advanced memory profiling using Bun's JSC module
 * - Heap statistics monitoring
 * - Memory leak detection
 * - Object allocation tracking
 * - Heap snapshot generation
 */

import { heapStats, generateHeapSnapshot } from 'bun:jsc';
import { $ } from 'bun';

interface MemorySnapshot {
  timestamp: number;
  heapSize: number;
  heapCapacity: number;
  extraMemorySize: number;
  objectCount: number;
  protectedObjectCount: number;
}

interface MemoryLeak {
  type: string;
  count: number;
  growth: number;
  growthRate: number;
  suspicious: boolean;
}

interface MemoryReport {
  startTime: number;
  endTime: number;
  duration: number;
  initialMemory: MemorySnapshot;
  finalMemory: MemorySnapshot;
  peakMemory: MemorySnapshot;
  leaks: MemoryLeak[];
  snapshots: MemorySnapshot[];
  gcRuns: number;
}

export class MemoryProfiler {
  private snapshots: MemorySnapshot[] = [];
  private objectTypeCounts: Map<string, number[]> = new Map();
  private gcRuns: number = 0;
  private startTime: number = 0;
  private peakMemory: MemorySnapshot | null = null;
  private monitoring: boolean = false;
  private monitorInterval: Timer | null = null;

  constructor(private name: string = 'Memory Profile') {}

  /**
   * Start memory monitoring
   */
  startMonitoring(intervalMs: number = 100): void {
    if (this.monitoring) {
      console.warn('⚠️  Monitoring already in progress');
      return;
    }

    console.info(`🧠 Starting memory monitoring: ${this.name}`);
    this.monitoring = true;
    this.startTime = Date.now();
    this.snapshots = [];
    this.gcRuns = 0;

    // Take initial snapshot
    this.takeSnapshot();

    // Set up periodic monitoring
    this.monitorInterval = setInterval(() => {
      this.takeSnapshot();
    }, intervalMs);
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring(): MemoryReport {
    if (!this.monitoring) {
      throw new Error('No monitoring in progress');
    }

    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

    this.monitoring = false;
    const endTime = Date.now();

    // Take final snapshot
    this.takeSnapshot();

    // Detect potential leaks
    const leaks = this.detectLeaks();

    const report: MemoryReport = {
      startTime: this.startTime,
      endTime,
      duration: endTime - this.startTime,
      initialMemory: this.snapshots[0],
      finalMemory: this.snapshots[this.snapshots.length - 1],
      peakMemory: this.peakMemory!,
      leaks,
      snapshots: this.snapshots,
      gcRuns: this.gcRuns,
    };

    console.info('✅ Memory monitoring stopped');
    this.printReport(report);

    return report;
  }

  /**
   * Take a memory snapshot
   */
  private takeSnapshot(): MemorySnapshot {
    const stats = heapStats();

    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      heapSize: stats.heapSize,
      heapCapacity: stats.heapCapacity,
      extraMemorySize: stats.extraMemorySize,
      objectCount: stats.objectCount,
      protectedObjectCount: stats.protectedObjectCount,
    };

    this.snapshots.push(snapshot);

    // Track object types
    if (stats.objectTypeCounts) {
      for (const [type, count] of Object.entries(stats.objectTypeCounts)) {
        if (!this.objectTypeCounts.has(type)) {
          this.objectTypeCounts.set(type, []);
        }
        this.objectTypeCounts.get(type)!.push(count as number);
      }
    }

    // Update peak memory
    if (!this.peakMemory || snapshot.heapSize > this.peakMemory.heapSize) {
      this.peakMemory = snapshot;
    }

    return snapshot;
  }

  /**
   * Force garbage collection
   */
  forceGC(synchronous: boolean = true): void {
    console.info('🗑️  Forcing garbage collection...');
    Bun.gc(synchronous);
    this.gcRuns++;
    console.info('✅ Garbage collection complete');
  }

  /**
   * Detect potential memory leaks
   */
  private detectLeaks(): MemoryLeak[] {
    const leaks: MemoryLeak[] = [];

    for (const [type, counts] of this.objectTypeCounts.entries()) {
      if (counts.length < 3) continue;

      const initial = counts[0];
      const final = counts[counts.length - 1];
      const growth = final - initial;
      const growthRate = growth / initial;

      // Detect suspicious growth patterns
      const suspicious = growthRate > 0.5 && growth > 100;

      if (growth > 0) {
        leaks.push({
          type,
          count: final,
          growth,
          growthRate,
          suspicious,
        });
      }
    }

    // Sort by growth rate
    return leaks.sort((a, b) => b.growthRate - a.growthRate);
  }

  /**
   * Generate heap snapshot file
   */
  async generateHeapSnapshot(filename?: string): Promise<string> {
    const name = filename || `heap-${Date.now()}.json`;

    console.info('📸 Generating heap snapshot...');
    const snapshot = generateHeapSnapshot();

    await Bun.write(name, JSON.stringify(snapshot, null, 2));
    console.info(`✅ Heap snapshot saved to: ${name}`);

    return name;
  }

  /**
   * Profile a specific function
   */
  async profileFunction<T>(
    name: string,
    fn: () => T | Promise<T>,
    options: { gc?: boolean } = {}
  ): Promise<{ result: T; memory: MemoryReport }> {
    console.info(`\n🎯 Profiling function: ${name}`);

    // Optional GC before profiling
    if (options.gc) {
      this.forceGC();
    }

    this.startMonitoring(10);

    try {
      const result = await fn();

      // Optional GC after function
      if (options.gc) {
        this.forceGC();
      }

      const memory = this.stopMonitoring();

      return { result, memory };
    } catch (error) {
      this.stopMonitoring();
      throw error;
    }
  }

  /**
   * Compare memory usage of different implementations
   */
  async compareMemory(
    name: string,
    implementations: Record<string, () => any | Promise<any>>,
    options: { gc?: boolean; iterations?: number } = {}
  ): Promise<void> {
    const { gc = true, iterations = 1 } = options;

    console.info(`\n⚔️  Memory Comparison: ${name}`);
    console.info('='.repeat(50));

    const results: Record<string, MemoryReport[]> = {};

    for (const [implName, fn] of Object.entries(implementations)) {
      results[implName] = [];

      for (let i = 0; i < iterations; i++) {
        if (gc) this.forceGC();

        const { memory } = await this.profileFunction(`${implName} (iteration ${i + 1})`, fn, {
          gc: false,
        });

        results[implName].push(memory);
      }
    }

    // Calculate averages and compare
    console.info('\n📊 Comparison Results:');

    const summaries = Object.entries(results).map(([name, reports]) => {
      const avgHeapGrowth =
        reports.reduce((sum, r) => sum + (r.finalMemory.heapSize - r.initialMemory.heapSize), 0) /
        reports.length;

      const avgObjectGrowth =
        reports.reduce(
          (sum, r) => sum + (r.finalMemory.objectCount - r.initialMemory.objectCount),
          0
        ) / reports.length;

      return { name, avgHeapGrowth, avgObjectGrowth };
    });

    // Find most efficient
    const mostEfficient = summaries.reduce((prev, current) =>
      prev.avgHeapGrowth < current.avgHeapGrowth ? prev : current
    );

    summaries.forEach(summary => {
      const ratio = summary.avgHeapGrowth / mostEfficient.avgHeapGrowth;
      const status =
        summary === mostEfficient ? '🏆 MOST EFFICIENT' : `${ratio.toFixed(2)}x more memory`;

      console.info(`\n   ${summary.name}:`);
      console.info(`      Heap Growth: ${this.formatBytes(summary.avgHeapGrowth)} ${status}`);
      console.info(`      Object Growth: ${summary.avgObjectGrowth.toLocaleString()} objects`);
    });
  }

  /**
   * Monitor memory during load test
   */
  async monitorLoad(
    name: string,
    duration: number,
    fn: () => Promise<void>
  ): Promise<MemoryReport> {
    console.info(`\n🚀 Load Test Memory Monitoring: ${name}`);
    console.info(`   Duration: ${duration}ms`);

    this.startMonitoring(100);

    const endTime = Date.now() + duration;
    let iterations = 0;

    while (Date.now() < endTime) {
      await fn();
      iterations++;

      // Periodic GC to prevent OOM
      if (iterations % 1000 === 0) {
        this.forceGC(false);
      }
    }

    const report = this.stopMonitoring();

    console.info(`\n   Iterations completed: ${iterations.toLocaleString()}`);
    console.info(
      `   Average iteration memory: ${this.formatBytes(report.finalMemory.heapSize / iterations)}`
    );

    return report;
  }

  /**
   * Print memory report
   */
  private printReport(report: MemoryReport): void {
    console.info('\n📊 Memory Report');
    console.info('='.repeat(50));

    const heapGrowth = report.finalMemory.heapSize - report.initialMemory.heapSize;
    const objectGrowth = report.finalMemory.objectCount - report.initialMemory.objectCount;

    console.info(`Duration: ${(report.duration / 1000).toFixed(2)}s`);
    console.info(`GC Runs: ${report.gcRuns}`);
    console.info('\nMemory Usage:');
    console.info(`   Initial Heap: ${this.formatBytes(report.initialMemory.heapSize)}`);
    console.info(`   Final Heap: ${this.formatBytes(report.finalMemory.heapSize)}`);
    console.info(`   Peak Heap: ${this.formatBytes(report.peakMemory.heapSize)}`);
    console.info(
      `   Heap Growth: ${this.formatBytes(heapGrowth)} (${heapGrowth > 0 ? '📈' : '📉'})`
    );
    console.info('\nObject Count:');
    console.info(`   Initial: ${report.initialMemory.objectCount.toLocaleString()}`);
    console.info(`   Final: ${report.finalMemory.objectCount.toLocaleString()}`);
    console.info(`   Growth: ${objectGrowth.toLocaleString()} objects`);

    if (report.leaks.length > 0) {
      console.info('\n⚠️  Potential Memory Leaks:');
      report.leaks.slice(0, 5).forEach(leak => {
        if (leak.suspicious) {
          console.info(
            `   🔴 ${leak.type}: +${leak.growth} objects (${(leak.growthRate * 100).toFixed(1)}% growth)`
          );
        } else {
          console.info(`   🟡 ${leak.type}: +${leak.growth} objects`);
        }
      });
    } else {
      console.info('\n✅ No memory leaks detected');
    }
  }

  /**
   * Format bytes to human-readable format
   */
  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = Math.abs(bytes);
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    const formatted = size.toFixed(2);
    return `${bytes < 0 ? '-' : ''}${formatted} ${units[unitIndex]}`;
  }

  /**
   * Export report as JSON
   */
  exportReport(report: MemoryReport, filename: string): Promise<void> {
    return Bun.write(filename, JSON.stringify(report, null, 2));
  }

  /**
   * Analyze heap snapshot
   */
  async analyzeSnapshot(snapshotPath: string): Promise<void> {
    console.info(`\n🔍 Analyzing heap snapshot: ${snapshotPath}`);

    const snapshot = await Bun.file(snapshotPath).json();

    // Analyze nodes
    const nodeTypes = new Map<string, number>();
    const nodeSizes = new Map<string, number>();

    if (snapshot.nodes) {
      // Process nodes based on snapshot format
      console.info(`   Total nodes: ${snapshot.nodes.length}`);
    }

    console.info('✅ Snapshot analysis complete');
    console.info('   Use Safari DevTools or WebKit GTK to view detailed analysis');
  }
}

// Example usage demonstrations
async function runMemoryDemos() {
  const profiler = new MemoryProfiler('Fire22 Memory Analysis');

  console.info('🧠 Fire22 Memory Profiler Demo');
  console.info('='.repeat(50));

  // Demo 1: Profile array operations
  await profiler.compareMemory('Array Creation', {
    'Array literal': () => {
      const arr = [];
      for (let i = 0; i < 10000; i++) {
        arr.push({ id: i, data: `item-${i}` });
      }
      return arr;
    },
    'Array.from': () => {
      return Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        data: `item-${i}`,
      }));
    },
    'Pre-allocated': () => {
      const arr = new Array(10000);
      for (let i = 0; i < 10000; i++) {
        arr[i] = { id: i, data: `item-${i}` };
      }
      return arr;
    },
  });

  // Demo 2: Profile string operations
  await profiler.compareMemory('String Concatenation', {
    'Plus operator': () => {
      let str = '';
      for (let i = 0; i < 1000; i++) {
        str += `Line ${i}\n`;
      }
      return str;
    },
    'Array.join': () => {
      const lines = [];
      for (let i = 0; i < 1000; i++) {
        lines.push(`Line ${i}`);
      }
      return lines.join('\n');
    },
    'Template literals': () => {
      const lines = [];
      for (let i = 0; i < 1000; i++) {
        lines.push(`Line ${i}`);
      }
      return `${lines.join('\n')}`;
    },
  });

  // Demo 3: Generate heap snapshot
  await profiler.generateHeapSnapshot('demo-heap.json');

  console.info('\n✅ Memory profiling demo complete!');
}

// Run demos if executed directly
if (import.meta.main) {
  await runMemoryDemos();
}

export default MemoryProfiler;
