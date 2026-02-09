/**
 * Dashboard Data Aggregation and Caching
 *
 * Handles:
 * - Data caching with TTL
 * - Running all benchmarks and tests
 * - Aggregating results and stats
 */

import type {
  BenchmarkResult,
  TestResult,
  P2PGatewayResult,
  ProfileResult,
  WebSocketBenchmarkResult,
  QuickWin,
} from '../types.ts';
import { runAllCoreBenchmarks } from '../benchmarks/core.ts';
import { runProfileBenchmarks } from '../benchmarks/profile.ts';
import { runAllTests } from '../benchmarks/tests.ts';
import {
  saveBenchmarkHistory,
  saveTestHistory,
  saveP2PHistory,
  saveProfileHistory,
} from '../db/history.ts';
import { broadcastUpdate } from '../websocket/manager.ts';

interface CacheEntry {
  data: DashboardData;
  timestamp: number;
}

export interface DashboardData {
  timestamp: string;
  quickWins: number;
  quickWinsList: QuickWin[];
  tests: TestResult[];
  benchmarks: BenchmarkResult[];
  p2pResults: P2PGatewayResult[];
  profileResults: ProfileResult[];
  wsResults: WebSocketBenchmarkResult[];
  stats: {
    testsPassed: number;
    testsTotal: number;
    benchmarksPassed: number;
    benchmarksTotal: number;
    performanceScore: number;
    byPaymentType: Record<string, number>;
    p2pTotal: number;
    profileTotal: number;
    wsTotal: number;
  };
  cached: boolean;
}

export interface DataDependencies {
  dashboardConfig: any;
  benchmarksConfig: any;
  quickWinsConfig: any;
  serverConfig: any;
  profileEngine: any;
  getQuickWins: () => QuickWin[];
  runP2PBenchmarks: () => Promise<P2PGatewayResult[]>;
  runWebSocketBenchmarks: () => Promise<WebSocketBenchmarkResult[]>;
}

/**
 * Create a data cache with TTL
 */
export function createDataCache(ttl: number) {
  const cache = new Map<string, CacheEntry>();

  return {
    get(key: string): CacheEntry | undefined {
      const entry = cache.get(key);
      if (!entry) return undefined;
      if (Date.now() - entry.timestamp >= ttl) {
        cache.delete(key);
        return undefined;
      }
      return entry;
    },

    set(key: string, data: DashboardData): void {
      cache.set(key, { data, timestamp: Date.now() });
    },

    clear(): void {
      cache.clear();
    },

    has(key: string): boolean {
      return cache.has(key) && Date.now() - cache.get(key)!.timestamp < ttl;
    },
  };
}

/**
 * Get dashboard data with optional caching
 */
export async function getData(
  deps: DataDependencies,
  dataCache: ReturnType<typeof createDataCache>,
  useCache = true
): Promise<DashboardData> {
  const cacheKey = 'dashboard-data';
  const now = Date.now();

  // Check cache first (fast path)
  if (useCache) {
    const cached = dataCache.get(cacheKey);
    if (cached) {
      return {
        ...cached.data,
        timestamp: new Date().toISOString(),
        cached: true,
      };
    }
  }

  // Run benchmarks and tests in parallel (slow path)
  const [benchmarks, tests, p2pResults, profileResults, wsResults] = await Promise.all([
    runAllCoreBenchmarks(
      deps.benchmarksConfig,
      deps.profileEngine,
      deps.serverConfig,
      deps.dashboardConfig
    ),
    runAllTests(),
    deps.dashboardConfig.p2p?.enabled ? deps.runP2PBenchmarks() : Promise.resolve([]),
    deps.dashboardConfig.profiling?.enabled
      ? runProfileBenchmarks(deps.dashboardConfig.profiling, deps.profileEngine)
      : Promise.resolve([]),
    deps.runWebSocketBenchmarks(),
  ]);

  const quickWinsList = deps.getQuickWins();

  // Broadcast individual benchmark results
  benchmarks.forEach((result) => {
    broadcastUpdate('benchmark:complete', result);
  });

  if (p2pResults.length > 0) {
    p2pResults.forEach((result) => {
      broadcastUpdate('p2p:complete', result);
    });
  }

  if (profileResults.length > 0) {
    profileResults.forEach((result) => {
      broadcastUpdate('profile:complete', result);
    });
  }

  if (wsResults.length > 0) {
    wsResults.forEach((result) => {
      broadcastUpdate('websocket:complete', result);
    });
  }

  broadcastUpdate('tests:complete', {
    total: tests.length,
    passed: tests.filter((t) => t.status === 'pass').length,
    failed: tests.filter((t) => t.status === 'fail').length,
    results: tests,
  });

  // Save to history
  saveBenchmarkHistory(benchmarks);
  saveTestHistory(tests);
  if (p2pResults.length > 0) {
    saveP2PHistory(p2pResults);
  }
  if (profileResults.length > 0) {
    saveProfileHistory(profileResults);
  }

  const passedTests = tests.filter((t) => t.status === 'pass').length;
  const passedBenchmarks = benchmarks.filter((b) => b.status === 'pass' || b.status === 'warning').length;
  const performanceScore = benchmarks.length > 0
    ? Math.round((passedBenchmarks / benchmarks.length) * 100)
    : 0;

  // Payment-type counts
  let byPaymentType: Record<string, number> = { venmo: 0, cashapp: 0, paypal: 0, other: 0 };
  try {
    byPaymentType = deps.profileEngine.getPaymentTypeCounts();
  } catch {
    // Profile DB unavailable
  }

  const data: DashboardData = {
    timestamp: new Date().toISOString(),
    quickWins: quickWinsList.length,
    quickWinsList,
    tests,
    benchmarks,
    p2pResults: p2pResults || [],
    profileResults: profileResults || [],
    wsResults: wsResults || [],
    stats: {
      testsPassed: passedTests,
      testsTotal: tests.length,
      benchmarksPassed: passedBenchmarks,
      benchmarksTotal: benchmarks.length,
      performanceScore,
      byPaymentType,
      p2pTotal: p2pResults.length,
      profileTotal: profileResults.length,
      wsTotal: wsResults.length,
    },
    cached: false,
  };

  // Cache the response
  dataCache.set(cacheKey, data);

  // Broadcast data update
  broadcastUpdate('data:updated', {
    timestamp: data.timestamp,
    stats: data.stats,
  });

  return data;
}

/**
 * Compare current benchmarks with previous run
 */
export function compareBenchmarks(
  current: BenchmarkResult[],
  previous: BenchmarkResult[]
): Array<BenchmarkResult & { previousTime?: number; change?: string; percentChange?: string }> {
  return current.map((curr) => {
    const prev = previous.find((p) => p.name === curr.name);
    if (!prev) return { ...curr, change: 'new' };

    const timeDiff = curr.time - prev.time;
    const percentChange = prev.time > 0 ? (timeDiff / prev.time) * 100 : 0;

    return {
      ...curr,
      previousTime: prev.time,
      change: percentChange > 5 ? 'slower' : percentChange < -5 ? 'faster' : 'same',
      percentChange: Math.abs(percentChange).toFixed(1),
    };
  });
}
