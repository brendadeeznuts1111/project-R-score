/**
 * URLPattern-based Route Validation
 *
 * Provides type-safe route matching with RegExp validation.
 * Uses the standard URLPattern API (Bun v1.3.4+).
 *
 * Benefits over plain string routes:
 * - Parameter validation (e.g., :port must be numeric)
 * - Pattern introspection via hasRegExpGroups
 * - Grouping for middleware-like behavior
 * - Full URL matching including query params
 *
 * Performance optimization via Bun.peek():
 * - Pre-compiled patterns cached with metadata
 * - Synchronous access via peek() (no await overhead)
 * - Cache statistics for observability
 */

import { peek } from "bun";
import type { AuthContext } from "../types";
import { getRoutePermission, hasPermission } from "./auth/permissions";

const BASE_URL = "http://localhost"; // URLPattern needs base for relative paths

// =============================================================================
// Peek Cache System - Sync URLPattern Access
// =============================================================================

/**
 * Cached pattern entry with compilation metadata
 */
interface CachedPattern {
  pattern: URLPattern;
  pathname: string;
  compiledAt: number;
  compileTimeNs: number;
  hasRegExpGroups: boolean;
  matchCount: number;
  lastMatchAt: number;
}

/**
 * Cache statistics for observability
 */
interface CacheStats {
  hits: number;
  misses: number;
  syncHits: number;
  asyncHits: number;
  errors: number;
  totalMatchTime: number;
  avgMatchTimeNs: number;
}

// Pattern cache: key -> Promise<CachedPattern>
const patternCache = new Map<string, Promise<CachedPattern>>();
const MAX_PATTERN_CACHE_SIZE = 500;

/**
 * Evict least recently matched patterns when cache exceeds size limit
 */
async function evictStalePatternCache(): Promise<void> {
  if (patternCache.size <= MAX_PATTERN_CACHE_SIZE) return;

  // Collect resolved patterns with metadata
  const entries: { key: string; lastMatchAt: number }[] = [];
  for (const [key, promise] of patternCache.entries()) {
    const result = peek(promise);
    if (result !== promise && typeof result === "object" && result !== null) {
      entries.push({ key, lastMatchAt: (result as CachedPattern).lastMatchAt });
    }
  }

  // Sort by lastMatchAt (oldest first)
  entries.sort((a, b) => a.lastMatchAt - b.lastMatchAt);

  // Remove oldest entries until under limit
  const toRemove = patternCache.size - MAX_PATTERN_CACHE_SIZE;
  for (let i = 0; i < toRemove && i < entries.length; i++) {
    patternCache.delete(entries[i].key);
  }
}

// Cache statistics
const cacheStats: CacheStats = {
  hits: 0,
  misses: 0,
  syncHits: 0,
  asyncHits: 0,
  errors: 0,
  totalMatchTime: 0,
  avgMatchTimeNs: 0,
};

/**
 * Compile a pattern asynchronously with timing metadata
 */
async function compilePattern(pathname: string, baseUrl: string): Promise<CachedPattern> {
  const start = Bun.nanoseconds();
  try {
    const pattern = new URLPattern(pathname, baseUrl);
    return {
      pattern,
      pathname,
      compiledAt: Date.now(),
      compileTimeNs: Bun.nanoseconds() - start,
      hasRegExpGroups: pattern.hasRegExpGroups,
      matchCount: 0,
      lastMatchAt: 0,
    };
  } catch (error) {
    cacheStats.errors++;
    throw error;
  }
}

/**
 * Get a compiled pattern with peek()-based sync access
 *
 * Returns immediately if pattern is cached and resolved (sync hit).
 * Otherwise returns the promise for async resolution.
 */
function getCachedPattern(pathname: string, baseUrl: string = BASE_URL): {
  cached: CachedPattern | null;
  promise: Promise<CachedPattern>;
  cacheHit: "sync" | "async" | "miss";
} {
  const key = `${baseUrl}::${pathname}`;
  const existing = patternCache.get(key);

  if (existing) {
    // Try sync access via peek()
    const result = peek(existing);
    if (result !== existing) {
      // Promise resolved - sync hit!
      cacheStats.syncHits++;
      cacheStats.hits++;
      return { cached: result as CachedPattern, promise: existing, cacheHit: "sync" };
    }
    // Promise still pending - async hit
    cacheStats.asyncHits++;
    cacheStats.hits++;
    return { cached: null, promise: existing, cacheHit: "async" };
  }

  // Cache miss - compile new pattern
  cacheStats.misses++;
  const promise = compilePattern(pathname, baseUrl);
  patternCache.set(key, promise);

  // Async eviction (non-blocking)
  if (patternCache.size > MAX_PATTERN_CACHE_SIZE) {
    evictStalePatternCache().catch(() => {}); // Fire-and-forget cleanup
  }

  return { cached: null, promise, cacheHit: "miss" };
}

/**
 * Peek at cache status without triggering compilation
 */
function peekCacheStatus(pathname: string, baseUrl: string = BASE_URL): "fulfilled" | "pending" | "rejected" | "uncached" {
  const key = `${baseUrl}::${pathname}`;
  const existing = patternCache.get(key);
  if (!existing) return "uncached";
  return peek.status(existing);
}

// =============================================================================
// Route Pattern Definitions
// =============================================================================

/**
 * API route patterns with validation
 * Uses RegExp groups for parameter constraints
 */
export const patterns = {
  // Core dashboard routes
  dashboard: new URLPattern("/api/dashboard", BASE_URL),
  stats: new URLPattern("/api/stats", BASE_URL),
  routes: new URLPattern("/api/routes", BASE_URL),
  rescan: new URLPattern("/api/rescan", BASE_URL),
  healthCheck: new URLPattern("/api/health-check", BASE_URL),

  // Project routes - projectId can be name or UUID
  projects: new URLPattern("/api/projects", BASE_URL),
  project: new URLPattern("/api/projects/:projectId([\\w-]+)", BASE_URL),
  projectOpen: new URLPattern("/api/projects/:projectId([\\w-]+)/open", BASE_URL),
  projectGit: new URLPattern("/api/projects/:projectId([\\w-]+)/git", BASE_URL),

  // Snapshot routes
  snapshot: new URLPattern("/api/snapshot", BASE_URL),
  snapshots: new URLPattern("/api/snapshots", BASE_URL),
  snapshotFile: new URLPattern("/api/snapshots/:filename([\\w.-]+)", BASE_URL),

  // System routes - port must be numeric (1-65535)
  system: new URLPattern("/api/system", BASE_URL),
  systemLive: new URLPattern("/api/system/live", BASE_URL),
  systemPort: new URLPattern("/api/system/port/:port(\\d+)", BASE_URL),
  systemGc: new URLPattern("/api/system/gc", BASE_URL),
  systemEnhanced: new URLPattern("/api/system/enhanced", BASE_URL),
  systemQueue: new URLPattern("/api/system/queue", BASE_URL),

  // Network routes
  networkStats: new URLPattern("/api/network/stats", BASE_URL),
  networkPrefetch: new URLPattern("/api/network/prefetch", BASE_URL),
  networkPreconnect: new URLPattern("/api/network/preconnect", BASE_URL),
  networkPrefetchBatch: new URLPattern("/api/network/prefetch/batch", BASE_URL),
  networkConfig: new URLPattern("/api/network/config", BASE_URL),
  networkLimit: new URLPattern("/api/network/limit", BASE_URL),
  networkTtl: new URLPattern("/api/network/ttl", BASE_URL),
  networkClear: new URLPattern("/api/network/clear", BASE_URL),
  networkLatencyTest: new URLPattern("/api/network/latency-test", BASE_URL),
  networkOptimizations: new URLPattern("/api/network/optimizations", BASE_URL),
  networkProbe: new URLPattern("/api/network/probe", BASE_URL),

  // Database routes
  dbStats: new URLPattern("/api/db/stats", BASE_URL),
  dbMetrics: new URLPattern("/api/db/metrics", BASE_URL),
  dbActivity: new URLPattern("/api/db/activity", BASE_URL),
  dbSettings: new URLPattern("/api/db/settings", BASE_URL),
  dbSetting: new URLPattern("/api/db/settings/:key([\\w_]+)", BASE_URL),
  dbSnapshots: new URLPattern("/api/db/snapshots", BASE_URL),
  dbCleanup: new URLPattern("/api/db/cleanup", BASE_URL),
  dbVacuum: new URLPattern("/api/db/vacuum", BASE_URL),

  // Analytics routes
  analyticsMatrix: new URLPattern("/api/analytics/matrix", BASE_URL),
  analyticsEndpoint: new URLPattern("/api/analytics/endpoint", BASE_URL),
  analyticsProjects: new URLPattern("/api/analytics/projects", BASE_URL),

  // Anomaly detection routes
  anomaliesDetect: new URLPattern("/api/anomalies/detect", BASE_URL),
  anomaliesModel: new URLPattern("/api/anomalies/model", BASE_URL),

  // Metrics routes
  metricsEnterprise: new URLPattern("/api/metrics/enterprise", BASE_URL),
  metricsEnterpriseJson: new URLPattern("/api/metrics/enterprise.json", BASE_URL),
  serverMetrics: new URLPattern("/api/server/metrics", BASE_URL),

  // Integrity check - project name
  integrity: new URLPattern("/api/integrity/:projectName([\\w-]+)", BASE_URL),

  // Session & UI routes
  theme: new URLPattern("/api/theme", BASE_URL),
  session: new URLPattern("/api/session", BASE_URL),
  uiState: new URLPattern("/api/ui-state", BASE_URL),
  logout: new URLPattern("/api/logout", BASE_URL),
  sync: new URLPattern("/api/sync", BASE_URL),

  // CLI Tools routes
  cliAnalyze: new URLPattern("/api/cli/analyze", BASE_URL),
  cliDiagnose: new URLPattern("/api/cli/diagnose", BASE_URL),
  cliBang: new URLPattern("/api/cli/bang", BASE_URL),
  cliCommands: new URLPattern("/api/cli/commands", BASE_URL),

  // Diagnose API routes (enhanced with JSON output)
  diagnoseHealth: new URLPattern("/api/diagnose/health", BASE_URL),
  diagnoseGrade: new URLPattern("/api/diagnose/grade", BASE_URL),
  diagnosePainpoints: new URLPattern("/api/diagnose/painpoints", BASE_URL),
  diagnoseBenchmark: new URLPattern("/api/diagnose/benchmark", BASE_URL),
  diagnoseCacheClear: new URLPattern("/api/diagnose/cache/clear", BASE_URL),

  // Config & runtime
  configs: new URLPattern("/api/configs", BASE_URL),
  runtime: new URLPattern("/api/runtime", BASE_URL),

  // Export routes
  exportS3: new URLPattern("/api/export/s3", BASE_URL),

  // Logs
  logsSearch: new URLPattern("/api/logs/search", BASE_URL),

  // URLPattern observability routes
  urlpatternAnalyze: new URLPattern("/api/urlpattern/analyze", BASE_URL),
  urlpatternTest: new URLPattern("/api/urlpattern/test", BASE_URL),
  urlpatternReport: new URLPattern("/api/urlpattern/report", BASE_URL),
  urlpatternPatterns: new URLPattern("/api/urlpattern/patterns", BASE_URL),

  // Peek cache routes
  peekCacheStats: new URLPattern("/api/peek-cache/stats", BASE_URL),
  peekCacheWarm: new URLPattern("/api/peek-cache/warm", BASE_URL),
  peekCacheClear: new URLPattern("/api/peek-cache/clear", BASE_URL),

  // Topology routes
  topology: new URLPattern("/api/topology", BASE_URL),

  // PTY routes - session ID is UUIDv7
  ptySessions: new URLPattern("/api/pty/sessions", BASE_URL),
  ptyCreate: new URLPattern("/api/pty/create", BASE_URL),
  ptySession: new URLPattern("/api/pty/session/:sessionId([\\w-]+)", BASE_URL),
  ptyWrite: new URLPattern("/api/pty/session/:sessionId([\\w-]+)/write", BASE_URL),
  ptyResize: new URLPattern("/api/pty/session/:sessionId([\\w-]+)/resize", BASE_URL),
  ptyOutput: new URLPattern("/api/pty/session/:sessionId([\\w-]+)/output", BASE_URL),
  ptyKill: new URLPattern("/api/pty/session/:sessionId([\\w-]+)/kill", BASE_URL),
  ptyStats: new URLPattern("/api/pty/stats", BASE_URL),
  ptyExec: new URLPattern("/api/pty/exec", BASE_URL),

  // KYC routes
  kycFailsafe: new URLPattern("/api/kyc/failsafe", BASE_URL),
  kycReviewQueue: new URLPattern("/api/kyc/review-queue", BASE_URL),
  kycReviewItem: new URLPattern("/api/kyc/review-queue/:traceId([\\w-]+)", BASE_URL),
  kycMetrics: new URLPattern("/api/kyc/metrics", BASE_URL),
  kycAuditLog: new URLPattern("/api/kyc/audit/:traceId([\\w-]+)", BASE_URL),

  // Benchmark routes
  benchmarks: new URLPattern("/api/benchmarks", BASE_URL),
  benchmark: new URLPattern("/api/benchmarks/:name([\\w-]+)", BASE_URL),
  benchmarkRun: new URLPattern("/api/benchmarks/:name([\\w-]+)/run", BASE_URL),
  benchmarkResults: new URLPattern("/api/benchmarks/results", BASE_URL),
  benchmarkRoute: new URLPattern("/api/benchmarks/routes/*", BASE_URL),
  benchmarkProject: new URLPattern("/api/benchmarks/projects/:projectId([\\w-]+)", BASE_URL),
  benchmarkSeed: new URLPattern("/api/benchmarks/seed", BASE_URL),
  benchmarkHost: new URLPattern("/api/benchmarks/hosts/:hostId([\\w-]+)", BASE_URL),

  // Test runner routes
  tests: new URLPattern("/api/tests", BASE_URL),
  testRun: new URLPattern("/api/tests/run", BASE_URL),
  testList: new URLPattern("/api/tests/list", BASE_URL),
} as const;

/**
 * Route groups for middleware-like validation
 */
export const routeGroups = {
  // All API routes
  api: new URLPattern("/api/*", BASE_URL),

  // Core routes (public)
  dashboard: new URLPattern("/api/dashboard", BASE_URL),
  healthCheck: new URLPattern("/api/health-check", BASE_URL),

  // Project-related routes
  projects: new URLPattern("/api/projects{/*}?", BASE_URL),

  // Snapshot routes
  snapshots: new URLPattern("/api/snapshot{s,}{/*}?", BASE_URL),

  // Network routes (DNS, prefetch, connection pool)
  network: new URLPattern("/api/network/*", BASE_URL),

  // Database routes (require auth in production)
  database: new URLPattern("/api/db/*", BASE_URL),

  // System/admin routes (require elevated permissions)
  system: new URLPattern("/api/system/*", BASE_URL),

  // Debug routes (disabled in production)
  debug: new URLPattern("/api/debug/*", BASE_URL),

  // Admin routes (require admin role)
  admin: new URLPattern("/api/admin/*", BASE_URL),

  // Metrics routes
  metrics: new URLPattern("/api/metrics/*", BASE_URL),
  serverMetrics: new URLPattern("/api/server/metrics", BASE_URL),

  // Analytics routes (including anomaly detection)
  analytics: new URLPattern("/api/analytics/*", BASE_URL),
  anomalies: new URLPattern("/api/anomalies/*", BASE_URL),

  // Session & UI routes
  session: new URLPattern("/api/session", BASE_URL),
  uiState: new URLPattern("/api/ui-state", BASE_URL),

  // Config & export
  configs: new URLPattern("/api/configs", BASE_URL),
  export: new URLPattern("/api/export/*", BASE_URL),

  // Logs
  logs: new URLPattern("/api/logs/*", BASE_URL),

  // Topology (route visualization)
  topology: new URLPattern("/api/topology", BASE_URL),

  // PTY routes (interactive terminal sessions)
  pty: new URLPattern("/api/pty/*", BASE_URL),

  // URLPattern analysis routes (require auth)
  urlpattern: new URLPattern("/api/urlpattern/*", BASE_URL),

  // Peek cache routes (same permissions as urlpattern)
  "peek-cache": new URLPattern("/api/peek-cache/*", BASE_URL),

  // KYC routes (require kyc permissions)
  kyc: new URLPattern("/api/kyc/*", BASE_URL),

  // CLI Tools routes
  cli: new URLPattern("/api/cli/*", BASE_URL),

  // Benchmark routes (require system:read permission)
  benchmarks: new URLPattern("/api/benchmarks/*", BASE_URL),

  // Test runner routes (require system:read permission)
  tests: new URLPattern("/api/tests/*", BASE_URL),
} as const;

// =============================================================================
// Type Definitions
// =============================================================================

export type RoutePattern = keyof typeof patterns;
export type RouteGroup = keyof typeof routeGroups;

export interface RouteMatch<T extends RoutePattern> {
  pattern: T;
  params: Record<string, string>;
  hasRegExpGroups: boolean;
}

export interface RouteValidation {
  valid: boolean;
  group?: RouteGroup;
  error?: string;
}

// =============================================================================
// Route Matching Functions
// =============================================================================

/**
 * Match a URL against a specific pattern
 * Returns typed params if matched, null otherwise
 */
export function matchRoute<T extends RoutePattern>(
  url: string | URL,
  patternName: T
): RouteMatch<T> | null {
  const pattern = patterns[patternName];
  const urlStr = typeof url === "string" ? url : url.href;

  // Ensure URL has base for relative patterns
  const fullUrl = urlStr.startsWith("http") ? urlStr : `${BASE_URL}${urlStr}`;

  const result = pattern.exec(fullUrl);
  if (!result) return null;

  return {
    pattern: patternName,
    params: result.pathname.groups as Record<string, string>,
    hasRegExpGroups: pattern.hasRegExpGroups,
  };
}

/**
 * Test if a URL matches a specific pattern (faster than exec)
 */
export function testRoute(url: string | URL, patternName: RoutePattern): boolean {
  const pattern = patterns[patternName];
  const urlStr = typeof url === "string" ? url : url.href;
  const fullUrl = urlStr.startsWith("http") ? urlStr : `${BASE_URL}${urlStr}`;
  return pattern.test(fullUrl);
}

/**
 * Find which route group a URL belongs to
 * Note: Skips the generic "api" group and only uses it as fallback
 */
export function getRouteGroup(url: string | URL): RouteGroup | null {
  const urlStr = typeof url === "string" ? url : url.href;
  const fullUrl = urlStr.startsWith("http") ? urlStr : `${BASE_URL}${urlStr}`;

  // First pass: check all specific groups (skip generic "api")
  for (const [group, pattern] of Object.entries(routeGroups)) {
    if (group === "api") continue; // Skip generic fallback
    if (pattern.test(fullUrl)) {
      return group as RouteGroup;
    }
  }

  // Fallback: check if it's an API route at all
  if (routeGroups.api.test(fullUrl)) {
    return "api";
  }

  return null;
}

/**
 * Validate route parameters with additional constraints
 */
export function validateRouteParams(
  patternName: RoutePattern,
  params: Record<string, string>
): RouteValidation {
  switch (patternName) {
    // System routes
    case "systemPort": {
      const port = parseInt(params.port, 10);
      if (isNaN(port) || port < 1 || port > 65535) {
        return { valid: false, error: `Invalid port: ${params.port} (must be 1-65535)` };
      }
      return { valid: true, group: "system" };
    }
    case "system":
    case "systemLive":
    case "systemGc":
    case "systemEnhanced":
    case "systemQueue":
      return { valid: true, group: "system" };

    // Project routes
    case "project":
    case "projectOpen":
    case "projectGit": {
      const id = params.projectId;
      if (!id || id.length > 100) {
        return { valid: false, error: "Invalid project ID" };
      }
      return { valid: true, group: "projects" };
    }
    case "projects":
      return { valid: true, group: "projects" };

    // Snapshot routes
    case "snapshotFile": {
      const filename = params.filename;
      if (filename.includes("..") || filename.includes("/")) {
        return { valid: false, error: "Invalid snapshot filename" };
      }
      return { valid: true, group: "snapshots" };
    }
    case "snapshot":
    case "snapshots":
      return { valid: true, group: "snapshots" };

    // Database routes
    case "dbSetting": {
      const key = params.key;
      const validKeys = ["theme", "sidebar", "notifications", "timezone", "locale"];
      if (!validKeys.includes(key)) {
        return { valid: false, error: `Unknown setting: ${key}` };
      }
      return { valid: true, group: "database" };
    }
    case "dbStats":
    case "dbMetrics":
    case "dbActivity":
    case "dbSettings":
    case "dbSnapshots":
    case "dbCleanup":
    case "dbVacuum":
      return { valid: true, group: "database" };

    // Network routes
    case "networkStats":
    case "networkPrefetch":
    case "networkPreconnect":
    case "networkPrefetchBatch":
    case "networkConfig":
    case "networkLimit":
    case "networkTtl":
    case "networkClear":
    case "networkLatencyTest":
    case "networkOptimizations":
    case "networkProbe":
      return { valid: true, group: "network" };

    // Analytics routes
    case "analyticsMatrix":
    case "analyticsEndpoint":
    case "analyticsProjects":
      return { valid: true, group: "analytics" };

    // Anomaly routes
    case "anomaliesDetect":
    case "anomaliesModel":
      return { valid: true, group: "anomalies" };

    // Metrics routes
    case "metricsEnterprise":
    case "metricsEnterpriseJson":
    case "serverMetrics":
      return { valid: true, group: "metrics" };

    // Integrity check
    case "integrity": {
      const name = params.projectName;
      if (!name || name.length > 100) {
        return { valid: false, error: "Invalid project name" };
      }
      return { valid: true, group: "projects" };
    }

    // Core routes
    case "dashboard":
    case "stats":
    case "routes":
    case "rescan":
    case "healthCheck":
      return { valid: true, group: "dashboard" };

    // Session routes
    case "theme":
    case "session":
    case "uiState":
    case "logout":
    case "sync":
      return { valid: true, group: "session" };

    // Config routes
    case "configs":
    case "runtime":
      return { valid: true, group: "configs" };

    // Export routes
    case "exportS3":
      return { valid: true, group: "export" };

    // Logs
    case "logsSearch":
      return { valid: true, group: "logs" };

    // Benchmark routes
    case "benchmarks":
    case "benchmark":
    case "benchmarkResults":
      return { valid: true, group: "benchmarks" };
    case "benchmarkRun":
    case "benchmarkRoute":
    case "benchmarkProject":
    case "benchmarkSeed":
    case "benchmarkHost":
      return { valid: true, group: "benchmarks" };

    // Test runner routes
    case "tests":
    case "testRun":
    case "testList":
      return { valid: true, group: "tests" };

    default:
      return { valid: true };
  }
}

// =============================================================================
// Route Debugging & Introspection
// =============================================================================

/**
 * Get pattern info for debugging/documentation
 */
export function getPatternInfo(patternName: RoutePattern) {
  const pattern = patterns[patternName];
  return {
    name: patternName,
    pathname: pattern.pathname,
    hasRegExpGroups: pattern.hasRegExpGroups,
    protocol: pattern.protocol,
    hostname: pattern.hostname,
  };
}

/**
 * List all patterns with their RegExp status
 */
export function listPatterns() {
  return Object.entries(patterns).map(([name, pattern]) => ({
    name,
    pathname: pattern.pathname,
    hasRegExpGroups: pattern.hasRegExpGroups,
  }));
}

/**
 * List all route groups
 */
export function listRouteGroups() {
  return Object.entries(routeGroups).map(([name, pattern]) => ({
    name,
    pathname: pattern.pathname,
  }));
}

// =============================================================================
// Middleware-style Route Guards
// =============================================================================

export interface RouteGuardContext {
  url: URL;
  method: string;
  group: RouteGroup | null;
  isDevelopment: boolean;
  auth?: AuthContext;
}

export type RouteGuardResult =
  | { allowed: true }
  | { allowed: false; status: number; message: string };

/**
 * Check if a route should be allowed based on environment/permissions
 */
export function checkRouteGuard(ctx: RouteGuardContext): RouteGuardResult {
  const { group, method, isDevelopment, auth } = ctx;

  // Debug routes only in development
  if (group === "debug" && !isDevelopment) {
    return {
      allowed: false,
      status: 404,
      message: "Debug routes disabled in production",
    };
  }

  // Get required permission for this route group and method
  const requiredPermission = group ? getRoutePermission(group, method) : null;

  // If permission is required, check authentication and authorization
  if (requiredPermission) {
    // Must be authenticated
    if (!auth?.isAuthenticated) {
      return {
        allowed: false,
        status: 401,
        message: "Authentication required",
      };
    }

    // Must have required permission (admin bypasses all checks)
    if (!hasPermission(auth.permissions, requiredPermission)) {
      return {
        allowed: false,
        status: 403,
        message: `Permission '${requiredPermission}' required`,
      };
    }
  }

  // Admin routes require admin permission (even in development for security)
  if (group === "admin") {
    if (!auth?.isAuthenticated) {
      return {
        allowed: false,
        status: 401,
        message: "Authentication required",
      };
    }
    if (!auth.isAdmin) {
      return {
        allowed: false,
        status: 403,
        message: "Admin access required",
      };
    }
  }

  return { allowed: true };
}

// =============================================================================
// Express-style path-to-regexp compatibility
// =============================================================================

/**
 * Convert express-style path to URLPattern
 * Handles common patterns like :id, :id?, *
 */
export function createPattern(path: string, baseUrl = BASE_URL): URLPattern {
  return new URLPattern(path, baseUrl);
}

/**
 * Match multiple patterns and return first match
 */
export function matchFirst(
  url: string | URL,
  patternNames: RoutePattern[]
): RouteMatch<RoutePattern> | null {
  for (const name of patternNames) {
    const match = matchRoute(url, name);
    if (match) return match;
  }
  return null;
}

// =============================================================================
// Peek Cache - High-Performance Matching
// =============================================================================

/**
 * Extended route match with cache metadata
 */
export interface CachedRouteMatch<T extends RoutePattern> extends RouteMatch<T> {
  cacheHit: "sync" | "async" | "miss";
  matchTimeNs: number;
  compileTimeNs: number;
}

/**
 * Match a URL with peek()-based cache access
 *
 * If the pattern is pre-warmed, returns synchronously without await overhead.
 * This is the recommended matching function for hot paths.
 */
export function matchRouteCached<T extends RoutePattern>(
  url: string | URL,
  patternName: T
): CachedRouteMatch<T> | null {
  const pattern = patterns[patternName];
  const urlStr = typeof url === "string" ? url : url.href;
  const fullUrl = urlStr.startsWith("http") ? urlStr : `${BASE_URL}${urlStr}`;

  // Get from peek cache
  const { cached, cacheHit } = getCachedPattern(pattern.pathname, BASE_URL);

  const matchStart = Bun.nanoseconds();

  // Use cached pattern if available (sync), otherwise use static pattern
  const pat = cached?.pattern ?? pattern;
  const result = pat.exec(fullUrl);

  const matchTimeNs = Bun.nanoseconds() - matchStart;
  cacheStats.totalMatchTime += matchTimeNs;
  cacheStats.avgMatchTimeNs = cacheStats.totalMatchTime / (cacheStats.hits + cacheStats.misses);

  if (!result) return null;

  // Update match stats if we have cached entry
  if (cached) {
    cached.matchCount++;
    cached.lastMatchAt = Date.now();
  }

  return {
    pattern: patternName,
    params: result.pathname.groups as Record<string, string>,
    hasRegExpGroups: pattern.hasRegExpGroups,
    cacheHit,
    matchTimeNs,
    compileTimeNs: cached?.compileTimeNs ?? 0,
  };
}

/**
 * Test a URL with peek()-based cache access (faster than exec)
 */
export function testRouteCached(url: string | URL, patternName: RoutePattern): {
  matched: boolean;
  cacheHit: "sync" | "async" | "miss";
  testTimeNs: number;
} {
  const pattern = patterns[patternName];
  const urlStr = typeof url === "string" ? url : url.href;
  const fullUrl = urlStr.startsWith("http") ? urlStr : `${BASE_URL}${urlStr}`;

  const { cached, cacheHit } = getCachedPattern(pattern.pathname, BASE_URL);

  const testStart = Bun.nanoseconds();
  const pat = cached?.pattern ?? pattern;
  const matched = pat.test(fullUrl);
  const testTimeNs = Bun.nanoseconds() - testStart;

  if (cached) {
    cached.matchCount++;
    cached.lastMatchAt = Date.now();
  }

  return { matched, cacheHit, testTimeNs };
}

/**
 * Match first pattern with cache stats
 */
export function matchFirstCached(
  url: string | URL,
  patternNames: RoutePattern[]
): CachedRouteMatch<RoutePattern> | null {
  for (const name of patternNames) {
    const match = matchRouteCached(url, name);
    if (match) return match;
  }
  return null;
}

// =============================================================================
// Cache Warm-up & Statistics
// =============================================================================

/**
 * Pre-warm the pattern cache for all defined routes
 *
 * Call this at server startup to ensure sync cache hits for all patterns.
 * Returns when all patterns are compiled and cached.
 */
export async function warmPatternCache(): Promise<{
  warmed: number;
  errors: number;
  totalTimeMs: number;
}> {
  const start = performance.now();
  let warmed = 0;
  let errors = 0;

  const allPatterns = [
    ...Object.values(patterns).map(p => p.pathname),
    ...Object.values(routeGroups).map(p => p.pathname),
  ];

  // Dedupe patterns
  const uniquePatterns = [...new Set(allPatterns)];

  // Compile all patterns in parallel
  const results = await Promise.allSettled(
    uniquePatterns.map(pathname => getCachedPattern(pathname, BASE_URL).promise)
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      warmed++;
    } else {
      errors++;
    }
  }

  return {
    warmed,
    errors,
    totalTimeMs: performance.now() - start,
  };
}

/**
 * Get current cache statistics
 */
export function getCacheStats(): CacheStats & {
  size: number;
  syncHitRate: string;
  patterns: Array<{
    pathname: string;
    status: "fulfilled" | "pending" | "rejected" | "uncached";
    matchCount: number;
    compileTimeNs: number;
  }>;
} {
  const patternStats: Array<{
    pathname: string;
    status: "fulfilled" | "pending" | "rejected" | "uncached";
    matchCount: number;
    compileTimeNs: number;
  }> = [];

  for (const [key, promise] of patternCache.entries()) {
    const pathname = key.split("::")[1];
    const status = peek.status(promise);
    const cached = status === "fulfilled" ? (peek(promise) as CachedPattern) : null;

    patternStats.push({
      pathname,
      status,
      matchCount: cached?.matchCount ?? 0,
      compileTimeNs: cached?.compileTimeNs ?? 0,
    });
  }

  const totalHits = cacheStats.syncHits + cacheStats.asyncHits;
  const syncHitRate = totalHits > 0
    ? ((cacheStats.syncHits / totalHits) * 100).toFixed(1) + "%"
    : "0%";

  return {
    ...cacheStats,
    size: patternCache.size,
    syncHitRate,
    patterns: patternStats,
  };
}

/**
 * Clear the pattern cache (useful for testing)
 */
export function clearPatternCache(): void {
  patternCache.clear();
  cacheStats.hits = 0;
  cacheStats.misses = 0;
  cacheStats.syncHits = 0;
  cacheStats.asyncHits = 0;
  cacheStats.errors = 0;
  cacheStats.totalMatchTime = 0;
  cacheStats.avgMatchTimeNs = 0;
}

/**
 * Get cache entry for a specific pattern
 */
export function getPatternCacheEntry(patternName: RoutePattern): {
  cached: CachedPattern | null;
  status: "fulfilled" | "pending" | "rejected" | "uncached";
} {
  const pattern = patterns[patternName];
  const status = peekCacheStatus(pattern.pathname, BASE_URL);

  if (status !== "fulfilled") {
    return { cached: null, status };
  }

  const { cached } = getCachedPattern(pattern.pathname, BASE_URL);
  return { cached, status };
}
