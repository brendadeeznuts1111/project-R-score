/**
 * Bun-Specific Profiling Utilities
 *
 * Integrates Bun's native memory profiling, heap snapshots, and CPU profiling
 * into the monitoring dashboard.
 */

import { heapStats } from "bun:jsc";
import { generateHeapSnapshot } from "bun";
import path from "node:path";
import { DATABASE_PATHS, DIR_PATHS } from "./ServerConstants.js";

const __dirname = import.meta.dir;
const ROOT_DIR = path.resolve(__dirname, "../..");

export interface JavaScriptHeapStats {
  heapSize: number;
  heapCapacity: number;
  extraMemorySize: number;
  objectCount: number;
  protectedObjectCount: number;
  globalObjectCount: number;
  protectedGlobalObjectCount: number;
  objectTypeCounts: Record<string, number>;
  protectedObjectTypeCounts: Record<string, number>;
}

export interface NativeHeapStats {
  peak: string;
  total: string;
  freed: string;
  current: string;
  unit: string;
  count: number;
}

/**
 * Get detailed JavaScript heap statistics
 */
export function getJavaScriptHeapStats(): JavaScriptHeapStats {
  return heapStats();
}

/**
 * Calculate heap usage percentage
 */
export function getHeapUsagePercentage(stats: JavaScriptHeapStats): number {
  return (stats.heapSize / stats.heapCapacity) * 100;
}

/**
 * Get top object types by count
 */
export function getTopObjectTypes(stats: JavaScriptHeapStats, limit: number = 10): Array<{ type: string; count: number }> {
  return Object.entries(stats.objectTypeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([type, count]) => ({ type, count }));
}

/**
 * Get memory efficiency metrics
 */
export function getMemoryEfficiencyMetrics(stats: JavaScriptHeapStats): {
  heapUtilization: number;
  averageObjectSize: number;
  protectedObjectRatio: number;
  extraMemoryRatio: number;
} {
  const heapUtilization = (stats.heapSize / stats.heapCapacity) * 100;
  const averageObjectSize = stats.heapSize / stats.objectCount;
  const protectedObjectRatio = stats.protectedObjectCount / stats.objectCount;
  const extraMemoryRatio = stats.extraMemorySize / stats.heapSize;

  return {
    heapUtilization: Number(heapUtilization.toFixed(2)),
    averageObjectSize: Number(averageObjectSize.toFixed(2)),
    protectedObjectRatio: Number(protectedObjectRatio.toFixed(4)),
    extraMemoryRatio: Number(extraMemoryRatio.toFixed(4)),
  };
}

/**
 * Detect potential memory leaks by comparing heap stats
 */
export function detectMemoryLeaks(
  current: JavaScriptHeapStats,
  baseline: JavaScriptHeapStats,
  thresholdPercent: number = 50
): Array<{ type: string; current: number; baseline: number; increase: number; increasePercent: number }> {
  const leaks: Array<{ type: string; current: number; baseline: number; increase: number; increasePercent: number }> = [];

  for (const [type, count] of Object.entries(current.objectTypeCounts)) {
    const baselineCount = baseline.objectTypeCounts[type] || 0;
    const increase = count - baselineCount;
    const increasePercent = baselineCount > 0 ? (increase / baselineCount) * 100 : 0;

    if (increase > 100 && increasePercent > thresholdPercent) {
      leaks.push({
        type,
        current: count,
        baseline: baselineCount,
        increase,
        increasePercent: Number(increasePercent.toFixed(2)),
      });
    }
  }

  return leaks.sort((a, b) => b.increasePercent - a.increasePercent);
}

/**
 * Generate and save a heap snapshot
 */
export async function takeHeapSnapshot(label: string = "snapshot"): Promise<{
  filepath: string;
  size: number;
  timestamp: number;
  label: string;
}> {
  const snapshotsDir = path.join(ROOT_DIR, "snapshots");
  const timestamp = Date.now();
  const filename = `heap-${label}-${timestamp}.json`;
  const filepath = path.join(snapshotsDir, filename);

  // Generate snapshot
  const snapshot = generateHeapSnapshot();

  // Write to file
  const json = JSON.stringify(snapshot, null, 2);
  await Bun.write(filepath, json);

  return {
    filepath,
    size: json.length,
    timestamp,
    label,
  };
}

/**
 * Force garbage collection
 */
export function forceGarbageCollection(sync: boolean = true): void {
  Bun.gc(sync);
}

/**
 * Get process memory usage with heap stats
 */
export function getDetailedMemoryUsage(): {
  process: NodeJS.MemoryUsage;
  heap: JavaScriptHeapStats;
  efficiency: ReturnType<typeof getMemoryEfficiencyMetrics>;
  calculated: {
    totalJSHeap: number;
    totalMemory: number;
    heapUtilization: number;
    nonJSMemory: number;
  };
} {
  const processMemory = process.memoryUsage();
  const heapStatsValue = heapStats();
  const efficiency = getMemoryEfficiencyMetrics(heapStatsValue);

  const totalJSHeap = heapStatsValue.heapSize + heapStatsValue.extraMemorySize;
  const totalMemory = processMemory.rss;
  const heapUtilization = (totalJSHeap / totalMemory) * 100;
  const nonJSMemory = totalMemory - totalJSHeap;

  return {
    process: processMemory,
    heap: heapStatsValue,
    efficiency,
    calculated: {
      totalJSHeap: Number(totalJSHeap.toFixed(2)),
      totalMemory: Number(totalMemory.toFixed(2)),
      heapUtilization: Number(heapUtilization.toFixed(2)),
      nonJSMemory: Number(nonJSMemory.toFixed(2)),
    },
  };
}

/**
 * Get memory health score
 */
export function getMemoryHealthScore(): {
  score: number; // 0-100
  status: "healthy" | "warning" | "critical";
  issues: string[];
} {
  const stats = getDetailedMemoryUsage();
  const issues: string[] = [];
  let score = 100;

  // Check heap utilization
  if (stats.efficiency.heapUtilization > 90) {
    issues.push("Heap utilization above 90%");
    score -= 30;
  } else if (stats.efficiency.heapUtilization > 75) {
    issues.push("Heap utilization above 75%");
    score -= 15;
  }

  // Check protected object ratio
  if (stats.efficiency.protectedObjectRatio > 0.1) {
    issues.push(`High protected object ratio: ${(stats.efficiency.protectedObjectRatio * 100).toFixed(2)}%`);
    score -= 10;
  }

  // Check extra memory ratio
  if (stats.efficiency.extraMemoryRatio > 0.5) {
    issues.push(`Extra memory ratio high: ${(stats.efficiency.extraMemoryRatio * 100).toFixed(2)}%`);
    score -= 10;
  }

  // Check object count
  if (stats.heap.objectCount > 100000) {
    issues.push(`Object count very high: ${stats.heap.objectCount.toLocaleString()}`);
    score -= 20;
  } else if (stats.heap.objectCount > 50000) {
    issues.push(`Object count elevated: ${stats.heap.objectCount.toLocaleString()}`);
    score -= 10;
  }

  // Determine status
  let status: "healthy" | "warning" | "critical" = "healthy";
  if (score < 50) {
    status = "critical";
  } else if (score < 75) {
    status = "warning";
  }

  return {
    score: Math.max(0, score),
    status,
    issues,
  };
}

/**
 * Get memory trend data for monitoring
 */
export interface MemoryTrendData {
  timestamp: number;
  heapSize: number;
  heapCapacity: number;
  objectCount: number;
  rss: number;
  heapUtilization: number;
  totalMemory: number;
}

const memoryTrendBuffer: MemoryTrendData[] = [];
const MAX_TREND_POINTS = 100;

/**
 * Record a memory data point for trending
 */
export function recordMemoryTrend(): MemoryTrendData {
  const stats = getDetailedMemoryUsage();
  const dataPoint: MemoryTrendData = {
    timestamp: Date.now(),
    heapSize: stats.heap.heapSize,
    heapCapacity: stats.heap.heapCapacity,
    objectCount: stats.heap.objectCount,
    rss: stats.process.rss,
    heapUtilization: stats.calculated.heapUtilization,
    totalMemory: stats.calculated.totalMemory,
  };

  memoryTrendBuffer.push(dataPoint);

  // Keep only the last N points
  if (memoryTrendBuffer.length > MAX_TREND_POINTS) {
    memoryTrendBuffer.shift();
  }

  return dataPoint;
}

/**
 * Get memory trend data
 */
export function getMemoryTrend(limit?: number): MemoryTrendData[] {
  if (limit) {
    return memoryTrendBuffer.slice(-limit);
  }
  return [...memoryTrendBuffer];
}

/**
 * Clear memory trend buffer
 */
export function clearMemoryTrend(): void {
  memoryTrendBuffer.length = 0;
}

/**
 * Calculate memory growth rate
 */
export function calculateMemoryGrowthRate(windowMs: number = 60000): {
  growthRate: number; // bytes per second
  percentGrowth: number;
  trend: "increasing" | "decreasing" | "stable";
} {
  const now = Date.now();
  const windowStart = now - windowMs;

  const windowData = memoryTrendBuffer.filter(d => d.timestamp >= windowStart);

  if (windowData.length < 2) {
    return {
      growthRate: 0,
      percentGrowth: 0,
      trend: "stable",
    };
  }

  const oldest = windowData[0];
  const newest = windowData[windowData.length - 1];

  const timeDiff = (newest.timestamp - oldest.timestamp) / 1000; // seconds
  const memoryDiff = newest.totalMemory - oldest.totalMemory;
  const growthRate = timeDiff > 0 ? memoryDiff / timeDiff : 0;
  const percentGrowth = oldest.totalMemory > 0 ? (memoryDiff / oldest.totalMemory) * 100 : 0;

  let trend: "increasing" | "decreasing" | "stable" = "stable";
  if (Math.abs(percentGrowth) < 5) {
    trend = "stable";
  } else if (percentGrowth > 0) {
    trend = "increasing";
  } else {
    trend = "decreasing";
  }

  return {
    growthRate: Number(growthRate.toFixed(2)),
    percentGrowth: Number(percentGrowth.toFixed(2)),
    trend,
  };
}

/**
 * Get comprehensive memory report
 */
export function getMemoryReport(): {
  timestamp: number;
  detailed: ReturnType<typeof getDetailedMemoryUsage>;
  health: ReturnType<typeof getMemoryHealthScore>;
  topObjects: ReturnType<typeof getTopObjectTypes>;
  trend: {
    data: MemoryTrendData[];
    growth: ReturnType<typeof calculateMemoryGrowthRate>;
  };
} {
  const stats = getDetailedMemoryUsage();
  const health = getMemoryHealthScore();
  const topObjects = getTopObjectTypes(stats.heap, 10);
  const trend = {
    data: getMemoryTrend(20),
    growth: calculateMemoryGrowthRate(),
  };

  return {
    timestamp: Date.now(),
    detailed: stats,
    health,
    topObjects,
    trend,
  };
}
