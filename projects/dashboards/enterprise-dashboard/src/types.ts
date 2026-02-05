// Shared types for server and client

// Generic API response wrapper
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// Paginated response
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface Project {
  id: string;
  name: string;
  branch: string;
  status: "clean" | "modified" | "staged" | "conflict";
  modifiedFiles: number;
  remote: "ahead" | "behind" | "up-to-date" | "diverged";
  aheadBy: number;
  behindBy: number;
  lastCommit: string;
  lastActivity: Date;
  health: number; // 0-100
}

export interface Alert {
  id: string;
  type: "warning" | "error" | "info" | "success";
  message: string;
  project?: string;
  timestamp: Date;
}

export interface DashboardStats {
  totalRequests: number;
  successRate: number;
  avgLatency: number;
  uptime: number;
  timeline: TimelinePoint[];
  alerts: Alert[];
}

export interface TimelinePoint {
  timestamp: Date;
  requests: number;
  latency: number;
  errors: number;
}

export interface DashboardData {
  projects: Project[];
  stats: DashboardStats;
  system?: SystemMetrics;
}

export interface WebSocketMessage {
  type: "update" | "alert" | "stats";
  payload: DashboardData | Alert | DashboardStats;
}

// Session tracking
export interface SessionData {
  sessionId: string;
  firstSeen: number;
  lastSeen: number;
  pageViews: number;
  userAgent?: string;
}

// UI state persistence
export interface UIState {
  collapsedProjects: Record<string, boolean>;
  sidebarCollapsed: boolean;
  recentFilters: string[];
  lastVisited: Record<string, number>;
}

// Theme type
export type Theme = "dark" | "light";

// System Metrics - CPU, Memory, Process Monitoring
export interface CpuMetrics {
  usage: number;        // 0-100 percentage
  cores: number;        // Number of CPU cores
  model: string;        // CPU model name
  speed: number;        // MHz
  loadAvg: number[];    // 1, 5, 15 minute load averages
}

export interface MemoryMetrics {
  total: number;        // Total memory in bytes
  used: number;         // Used memory in bytes
  free: number;         // Free memory in bytes
  heapUsed: number;     // Node/Bun heap used
  heapTotal: number;    // Node/Bun heap total
  rss: number;          // Resident set size
  usagePercent: number; // 0-100
}

export interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number;          // CPU percentage
  memory: number;       // Memory in bytes
  uptime: number;       // Seconds
  status: "running" | "sleeping" | "stopped";
}

export interface SystemMetrics {
  cpu: CpuMetrics;
  memory: MemoryMetrics;
  processes: ProcessInfo[];
  platform: string;
  hostname: string;
  uptime: number;       // System uptime in seconds
  timestamp: Date;
  // Enhanced metrics (optional for backwards compatibility)
  queue?: QueueStats;
  enhanced?: EnhancedMemoryMetrics;
}

// Git scanner queue statistics
export interface QueueStats {
  active: number;           // Currently running spawns
  pending: number;          // Waiting in queue
  maxConcurrent: number;    // Max allowed concurrent spawns
  isThrottled: boolean;     // At capacity?
  utilizationPercent: number; // 0-100
}

// Enhanced memory metrics with RSS/Heap analysis
export interface EnhancedMemoryMetrics {
  rss: number;              // Resident Set Size (true process memory)
  heapUsed: number;         // V8/JSC heap used
  heapTotal: number;        // V8/JSC heap total
  external: number;         // Memory used by C++ objects bound to JS
  arrayBuffers: number;     // Memory for ArrayBuffers and SharedArrayBuffers
  efficiency: number;       // heapUsed / rss * 100 (higher = less native overhead)
  overhead: number;         // rss - heapUsed (native/runtime overhead in bytes)
  pressure: "low" | "medium" | "high" | "critical"; // Memory pressure level
}

// Extended Project with process info
export interface ProjectWithProcess extends Project {
  process?: {
    pid?: number;
    port?: number;
    status: "running" | "stopped" | "error";
    cpu?: number;
    memory?: number;
  };
}

// =============================================================================
// Anomaly Detection Types
// =============================================================================

/** Result of checking a single metric against trained thresholds */
export interface AnomalyResult {
  metric: string;
  value: number;
  isAnomaly: boolean;
  reason?: "z_score" | "iqr_bounds" | "both";
  zScore?: number;
  deviation?: {
    fromMean: number;
    fromBounds: number;
  };
  thresholds: {
    mean: number;
    stdDev: number;
    lowerBound: number;
    upperBound: number;
  };
}

/** Severity levels for anomaly detection */
export type AnomalySeverity = "none" | "low" | "medium" | "high" | "critical";

/** Full detection result with all metrics analyzed */
export interface DetectionResult {
  timestamp: number;
  anomalies: AnomalyResult[];
  hasAnomalies: boolean;
  severity: AnomalySeverity;
}

/** Model info for display in UI */
export interface AnomalyModelInfo {
  loaded: boolean;
  version?: string;
  trainedAt?: string;
  sampleCount?: number;
  metrics?: string[];
}

// =============================================================================
// URLPattern Observability Types
// =============================================================================

/** Full URLPattern analysis result */
export interface URLPatternAnalysis {
  pattern: string | URLPatternInit;
  complexity: number;
  groups: Array<{ name: string; type: 'static' | 'dynamic' | 'wildcard' }>;
  wptCompliance: boolean;
  wptTestsPassed: number; // 408 tests pass for Bun's implementation
  performance: {
    execNs: number;
    opsPerSec: number;
    cacheHitRate: number;
    deoptimizationCount: number;
    memoryDeltaKB: number;
  };
  memory: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
    deltaKB: number;
  };
  bunSpecific: {
    supportsExecMethod: boolean;
    supportsTestMethod: boolean;
    performanceBoost: number;
  };
  execAnalysis: {
    returnsURLPatternResult: boolean;
    execTime: number;
    matchDetails: {
      groups: Record<string, string>;
      protocol: string;
      hostname: string;
      port: string;
      pathname: string;
    };
  };
  proxyAnalysis: {
    fetchProxyOptionSupported: boolean;
    connectHeadersForwarded: boolean;
    proxyAuthorizationHandled: boolean;
    proxyPatterns: Array<{
      pattern: string;
      method: string;
      headers: Record<string, string>;
      authorizationType: string;
    }>;
  };
  agentAnalysis: {
    httpAgentKeepAliveWorking: boolean;
    agentPerformance: number;
    keepAliveIssues: string[];
  };
  patternProperties: {
    protocol?: string;
    username?: string;
    password?: string;
    hostname?: string;
    port?: string;
    pathname?: string;
    search?: string;
    hash?: string;
    hasAllProperties: boolean;
    propertyCount: number;
  };
  hasRegExpGroups: boolean; // Detects if pattern uses custom regular expressions
}

/** Request payload for pattern analysis */
export interface URLPatternAnalysisRequest {
  pattern?: string | URLPatternInit;
  analyzeAll?: boolean;
}

/** Bun 1.3.4 feature test results */
export interface URLPatternTestResult {
  version: string;
  urlPattern: {
    execMethod: boolean;
    testMethod: boolean;
    initMethods: string[];
  };
  fetch: {
    proxyOption: boolean;
    connectHeaders: boolean;
    proxyAuth: boolean;
  };
  httpAgent: {
    keepAliveFixed: boolean;
    performance: number;
  };
  recommendations: string[];
}

/** Summary of all pattern analyses */
export interface URLPatternAnalysisSummary {
  totalPatterns: number;
  avgComplexity: number;
  bun134Features: {
    execMethod: number;
    testMethod: number;
    fetchProxy: number;
    connectHeaders: number;
    agentKeepAlive: number;
    proxyAuth: number;
  };
  recommendations: string[];
}

// =============================================================================
// Authentication & RBAC Types
// =============================================================================

/** Permission string type - format: "resource:action" or "admin" */
export type Permission =
  | "admin"
  | "urlpattern:read"
  | "urlpattern:write"
  | "database:read"
  | "database:write"
  | "system:read"
  | "system:write"
  | "pty:access"
  | "projects:read"
  | "projects:write";

/** Authentication context attached to requests */
export interface AuthContext {
  isAuthenticated: boolean;
  apiKeyId?: string;
  keyName?: string;
  permissions: Permission[];
  isAdmin: boolean;
}

/** API key record (without sensitive data) */
export interface ApiKey {
  id: string;
  keyPrefix: string;
  name: string;
  permissions: Permission[];
  createdAt: number;
  expiresAt?: number;
  lastUsedAt?: number;
  revokedAt?: number;
  metadata?: Record<string, unknown>;
}

/** API key creation options */
export interface CreateApiKeyOptions {
  name: string;
  permissions: Permission[];
  expiresAt?: number;
  metadata?: Record<string, unknown>;
}

/** API key creation result (includes raw key - only shown once) */
export interface CreateApiKeyResult {
  key: string;
  id: string;
  prefix: string;
}

/** API key validation result */
export interface ApiKeyValidation {
  valid: boolean;
  apiKey?: ApiKey;
  error?: string;
}

// =============================================================================
// Benchmark Types
// =============================================================================

export interface Benchmark {
  name: string;
  description: string;
  category: "runtime" | "route" | "project";
  script?: string;
  status: "ready" | "running" | "error";
  group?: string; // Route group for route benchmarks
}

export interface BenchmarkResult {
  name: string;
  avg: number; // Average time in nanoseconds
  min: number;
  max: number;
  p75: number;
  p99: number;
  heap?: {
    avg: number;
    min: number;
    max: number;
  };
  samples: number[];
  timestamp: string;
}

export interface BenchmarkRun {
  benchmark: string;
  results: BenchmarkResult[];
  timestamp: string;
  duration: number; // Total duration in ms
  projectId?: string;
  route?: string;
  method?: string;
}

export interface RouteBenchmarkResult {
  route: string;
  method: string;
  responseTime: number; // Average response time in ms
  statusCode: number;
  payloadSize: number; // Response payload size in bytes
  errorRate: number; // 0-1
  p95ResponseTime: number;
  throughput: number; // Requests per second
  timestamp: string;
}

export interface ProjectBenchmarkResult {
  projectId: string;
  projectName: string;
  operations: Array<{
    operation: string;
    time: number; // Time in ms
    success: boolean;
    error?: string;
  }>;
  totalTime: number;
  timestamp: string;
}

export interface HostBenchmarkResult extends RouteBenchmarkResult {
  hostId: string;
  hostUrl: string;
}

// =============================================================================
// Test Runner Types
// =============================================================================

export interface TestRunOptions {
  pattern?: string;
  testNamePattern?: string;
  timeout?: number;
  concurrent?: boolean;
  maxConcurrency?: number;
  seed?: number;
  bail?: number;
  watch?: boolean;
  coverage?: boolean;
  updateSnapshots?: boolean;
  rerunEach?: number;
  randomize?: boolean;
  reporter?: "junit" | "dots" | "default";
  reporterOutfile?: string;
}

export interface TestResult {
  success: boolean;
  passed: number;
  failed: number;
  skipped: number;
  todo: number;
  duration: number;
  output: string;
  error?: string;
  seed?: number;
  coverage?: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
}

// =============================================================================
// PTY Types
// =============================================================================

/** Session info returned by API (list, get, create response) */
export interface PTYSessionInfo {
  id: string;
  command: string;
  args: string[];
  cols: number;
  rows: number;
  createdAt: number;
  lastActivity: number;
  outputLines: number;
  outputBytes: number;
  status: "running" | "exited" | "error";
  exitCode: number | null;
}

/** Client-facing session type (same as PTYSessionInfo) */
export type PTYSession = PTYSessionInfo;

export interface PTYCreateOptions {
  command: string;
  args?: string[];
  cols?: number;
  rows?: number;
  cwd?: string;
  env?: Record<string, string>;
}

export interface PTYStats {
  activeSessions: number;
  totalCreated: number;
  totalBytes: number;
  avgSessionDurationMs: number;
  peakConcurrent: number;
}
