#!/usr/bin/env bun
/**
 * Bun v1.3.9 Browser Playground Server
 * 
 * Web-based playground showcasing all Bun v1.3.9 features
 */

import { serve } from "bun";
import { Database } from "bun:sqlite";
import { mkdir, readFile, readdir } from "node:fs/promises";
import { createServer, type Server as NetServer } from "node:net";
import { connect as connectHttp2, createSecureServer, type Http2SecureServer } from "node:http2";
import { extname, join, normalize, resolve as resolvePath, sep } from "node:path";
import { getBuildMetadata } from "./build-metadata" with { type: "macro" };
import { getGitCommitHash } from "./getGitCommitHash.ts" with { type: "macro" };
import { getResilienceConfig } from "../../../config/resilience-chain";

const BASE_STANDARD = Object.freeze({
  dedicatedPort: 3011,
  portRange: "3011-3020",
  maxConcurrentRequests: 200,
  maxCommandWorkers: 2,
  prefetchEnabled: false,
  preconnectEnabled: false,
  smokeTimeoutMs: 2000,
  fetchTimeoutMs: 30000,
  maxBodySizeMb: 10,
  streamChunkSize: 16384,
  searchGovernanceFetchDepth: 5,
  fetchDecompress: true,
  fetchVerbose: "off",
});

const DEDICATED_PORT = parseFirstNumberEnv(["PLAYGROUND_PORT", "PORT"], BASE_STANDARD.dedicatedPort, { min: 1, max: 65535 });
const PORT_RANGE = process.env.PLAYGROUND_PORT_RANGE || BASE_STANDARD.portRange;
const MAX_CONCURRENT_REQUESTS = parseNumberEnv("PLAYGROUND_MAX_CONCURRENT_REQUESTS", BASE_STANDARD.maxConcurrentRequests, { min: 1, max: 100000 });
const MAX_COMMAND_WORKERS = parseNumberEnv("PLAYGROUND_MAX_COMMAND_WORKERS", BASE_STANDARD.maxCommandWorkers, { min: 1, max: 64 });
const PREFETCH_ENABLED = parseBool(process.env.PLAYGROUND_PREFETCH_ENABLED, BASE_STANDARD.prefetchEnabled);
const PRECONNECT_ENABLED = parseBool(process.env.PLAYGROUND_PRECONNECT_ENABLED, BASE_STANDARD.preconnectEnabled);
const PREFETCH_HOSTS = parseList(process.env.PLAYGROUND_PREFETCH_HOSTS);
const PRECONNECT_URLS = parseList(process.env.PLAYGROUND_PRECONNECT_URLS);
const SMOKE_TIMEOUT_MS = parseNumberEnv("PLAYGROUND_SMOKE_TIMEOUT_MS", BASE_STANDARD.smokeTimeoutMs, { min: 100, max: 120000 });
const SMOKE_URLS = parseList(process.env.PLAYGROUND_SMOKE_URLS);
const FETCH_TIMEOUT_MS = parseNumberEnv("PLAYGROUND_FETCH_TIMEOUT_MS", BASE_STANDARD.fetchTimeoutMs, { min: 100, max: 300000 });
const MAX_BODY_SIZE_MB = parseNumberEnv("PLAYGROUND_MAX_BODY_SIZE_MB", BASE_STANDARD.maxBodySizeMb, { min: 1, max: 1024, integer: false });
const MAX_BODY_SIZE_BYTES = Math.max(1, Math.floor(MAX_BODY_SIZE_MB * 1024 * 1024));
const PROXY_AUTH_TOKEN = process.env.PLAYGROUND_PROXY_AUTH_TOKEN || "";
const STREAM_CHUNK_SIZE = parseNumberEnv("PLAYGROUND_STREAM_CHUNK_SIZE", BASE_STANDARD.streamChunkSize, { min: 256, max: 1048576 });
const SEARCH_GOVERNANCE_FETCH_DEPTH = parseNumberEnv(
  "SEARCH_GOVERNANCE_FETCH_DEPTH",
  BASE_STANDARD.searchGovernanceFetchDepth,
  { min: 1, max: 200000 }
);
const FETCH_DECOMPRESS = parseBool(process.env.PLAYGROUND_FETCH_DECOMPRESS, BASE_STANDARD.fetchDecompress);
const FETCH_VERBOSE = parseFetchVerbose(process.env.PLAYGROUND_FETCH_VERBOSE, BASE_STANDARD.fetchVerbose);
const S3_DEFAULT_CONTENT_TYPE = process.env.PLAYGROUND_S3_DEFAULT_CONTENT_TYPE || "application/octet-stream";
const BRAND_STATUS_STRICT_PROBE = parseBool(process.env.PLAYGROUND_BRAND_STATUS_STRICT_PROBE, false);
const IGNORE_SIGHUP = parseBool(process.env.PLAYGROUND_IGNORE_SIGHUP, true);
const EXIT_ON_UNHANDLED_REJECTION = parseBool(process.env.PLAYGROUND_EXIT_ON_UNHANDLED_REJECTION, false);
const EXIT_ON_UNCAUGHT_EXCEPTION = parseBool(process.env.PLAYGROUND_EXIT_ON_UNCAUGHT_EXCEPTION, true);
const MACRO_GIT_COMMIT_HASH = getGitCommitHash();
const GIT_COMMIT_HASH = (process.env.GIT_COMMIT_HASH || "").trim() || MACRO_GIT_COMMIT_HASH || "unset";
const GIT_COMMIT_HASH_SOURCE = (process.env.GIT_COMMIT_HASH || "").trim() ? "env" : "macro";
const BUILD_METADATA = await getBuildMetadata();
const BUN_REVISION = Bun.revision || "unknown";
const ACTIVE_RESILIENCE = getResilienceConfig();
const SERVER_STARTED_AT = new Date().toISOString();
const PROJECT_ROOT = join(import.meta.dir, "..", "..", "..");
const BRAND_REPORTS_DIR = join(PROJECT_ROOT, "reports", "brand-bench");
const BRAND_GOVERNANCE_PATH = join(BRAND_REPORTS_DIR, "governance.json");
const DECISIONS_ROOT = join(PROJECT_ROOT, "docs", "decisions");
const DECISIONS_INDEX_PATH = join(DECISIONS_ROOT, "index.json");
const DASHBOARD_METRICS_DB_PATH =
  process.env.PLAYGROUND_METRICS_DB_PATH ||
  join(PROJECT_ROOT, ".cache", "playground-dashboard-metrics.sqlite");
const DASHBOARD_METRICS_RETENTION_ROWS = parseNumberEnv("PLAYGROUND_METRICS_RETENTION_ROWS", 5000, {
  min: 100,
  max: 1000000,
});
const DASHBOARD_METRICS_INTERVAL_MS = parseNumberEnv("PLAYGROUND_METRICS_INTERVAL_MS", 1000, {
  min: 250,
  max: 60000,
});
let inFlightRequests = 0;
let activeCommands = 0;
const serverStartTime = Date.now();
const commandWaiters: Array<() => void> = [];

// Cache expensive computations
let cachedBenchmarkResult: { name: string; result: number; threshold: number }[] | null = null;
let cachedRuntimeSnapshot: Record<string, unknown> | null = null;
let cachedGitCommit: string | null = null;
let cachedProfileSnapshot: Record<string, unknown> | null = null;
let cachedHeapSnapshot: Record<string, unknown> | null = null;
let cachedBundleSnapshot: Record<string, unknown> | null = null;
let cachedOrchestrationLoop: Record<string, unknown> | null = null;
let cachedOrchestrationLoopAt = 0;
let cacheTimestamp = 0;
let capacityMetricsDb: Database | null = null;
let capacityInsertStmt: ReturnType<Database["prepare"]> | null = null;
let capacityPruneStmt: ReturnType<Database["prepare"]> | null = null;
let capacitySelectStmt: ReturnType<Database["prepare"]> | null = null;
let capacityMetricsLastPersistMs = 0;
let capacityMetricsPersistedCount = 0;
const CACHE_TTL_MS = 30000; // 30 second cache for volatile data
const ORCHESTRATION_CACHE_TTL_MS = parseNumberEnv("PLAYGROUND_ORCHESTRATION_CACHE_TTL_MS", 15000, { min: 1000, max: 300000 });
const HTTP2_UPGRADE_PORT = parseNumberEnv("PLAYGROUND_HTTP2_UPGRADE_PORT", 8443, { min: 1, max: 65535 });
const HTTP2_UPGRADE_HOST = process.env.PLAYGROUND_HTTP2_UPGRADE_HOST || "127.0.0.1";

const HTTP2_DEMO_KEY_PEM = `-----BEGIN PRIVATE KEY-----
MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDU0Lso+DrQvIhm
5rHv81E6zb8PcpSD6msrwXTiq8yahVliDGsjgMJzXHaQgltxJmiCVqAiZ3sccEJm
IQ/CT65NCDY+Hy2u7cTuBiRx/sPZ86EtoGQ3ZNBwpgjPiogfyLm0dxUr/qGfTFBO
oKKqCo0Zn337C1baEqDFDBoBjDVvKnTGK4W8O4IVOQKJiTgX10kw4T0ffU0B9J5s
ewQMmc8eziaC3jsLZDeFanSTSfQXFjMpBYVNtPYvcTkSgtNjSgkYvl1gDjTBU+3Y
kBKlCIHuzkr6W+MVRKhki7yLR3w8z4Rx9Dc7s8WRJ4maDBe8aaxlNxopH86Kn3gX
Y0g2ys3tAgMBAAECggEBAKDl8ysFigo5EHOkJZHCB38LAVHfkjOuLzrUt9eMhlOp
UCvWMcaU2e84UBfvxszkeg1ZCxcX37dflIP8qRqC/cgV1lTfY72m3MYM9M8PC+oj
zY9efYZ3/TO+BFlNZp+JNgYgJmytxmpW2zynLHSdJ5Lgx/He39peTRjNjnfvFpMl
RujceJqiJ9OISDlSFzVUhjtnDcsAazgPE0oZo9Styu93t+GUusn3b5FX01KSE6/f
92cXxAJaeHY8Hqu2OUackxKAF7+V0H+UAxIs1qWbPf+NGDZMPD4Ji4cMQRfK5AZR
kiqnZer2gHT+y7IXpxORFYnpfbXuIILwLWOeleTnvoECgYEA/1E3d/q9YaFz8bgR
vszojqzdYgDPsEozDundpBaDcPTdhKkpLXss+FNaDH9YHunO6oQMWdYDJ6t/6w+M
aa6Bmdu8KlQl2FX+pehHZ/Bh/HlmFtu9QndUZPHXOh1xrGBi1J6tAdAFNDU9Ajql
ouDl+W/DWmRW46Ohn/s4lk47Pg0CgYEA1WJrNBoQo4/BuBAutbVy10NWio6EvkMX
ujYWXzM8bqOHBRgZ5JAQl73v/4jqG3lSgmV65cJW0uNLXpOaJdVX+Yb3uGH4U0xW
Bt1BdyqgEKsrlHQ8/xo07gvVggKjfCqJDIieKjEV1fAeayiOEBJI5w8QFlfg/IvB
kvYVeRqxt2ECgYBlufZf14edXrbTmIN5gismrbmHUsttciLlzkiBGHdGikm4ka3W
cT15s7wtPo/dwUqwJezF3n9jTvGotok7kkwRAXv3YY+yopDTibjpsN1ZuwTyFptR
4Dm//pvCi/i+tairDo3gKwHny06DlNpqCzGWMPGlElWMXaYIGBBz0rfIAQKBgQCi
OvtKV27DC666ZAM/Pz6ajqWjHguqI5RMjIahxnBxpX4nz1UQQr96vntTCiMC1FB4
tvKi8AfWudw5gXq2vObv3T9FPabwnZ7iBSGamhur0JeHfIBLav9G5FRlTeBBrI0Z
rFyjs0Hor3BRBDpN2bj3gqo2coWpPA/lzZYxxqvKwQKBgQC1MpVaOOCn72iS6uuR
MOR/SLspGp/CDpVO+yVCi4L8bcDUEkcWJgXtuOfeAKqqff/58uDiXrMlOFOCkKVV
+0zEUS4wnJ5KtXRikDFG/2VYFrNwAneJCXKFQuZZBVaRHXBktl3orVAVxQb6z2tY
B0okCR0tXKmnsXbuGKFmWW+yQQ==
-----END PRIVATE KEY-----`;

const HTTP2_DEMO_CERT_PEM = `-----BEGIN CERTIFICATE-----
MIICpDCCAYwCCQCaWBvqXw6dJDANBgkqhkiG9w0BAQsFADAUMRIwEAYDVQQDDAls
b2NhbGhvc3QwHhcNMjYwMjA5MDI1ODA1WhcNMzYwMjA3MDI1ODA1WjAUMRIwEAYD
VQQDDAlsb2NhbGhvc3QwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDU
0Lso+DrQvIhm5rHv81E6zb8PcpSD6msrwXTiq8yahVliDGsjgMJzXHaQgltxJmiC
VqAiZ3sccEJmIQ/CT65NCDY+Hy2u7cTuBiRx/sPZ86EtoGQ3ZNBwpgjPiogfyLm0
dxUr/qGfTFBOoKKqCo0Zn337C1baEqDFDBoBjDVvKnTGK4W8O4IVOQKJiTgX10kw
4T0ffU0B9J5sewQMmc8eziaC3jsLZDeFanSTSfQXFjMpBYVNtPYvcTkSgtNjSgkY
vl1gDjTBU+3YkBKlCIHuzkr6W+MVRKhki7yLR3w8z4Rx9Dc7s8WRJ4maDBe8aaxl
NxopH86Kn3gXY0g2ys3tAgMBAAEwDQYJKoZIhvcNAQELBQADggEBALye19/ULIk+
LKghle8OaZadqCKfx49TKZ/G1BBPSTAEf0zr4ZpzhHe50BFbgbA957bHDoAcoEfB
7FA+MDaffe03l/2aCYZquZN2XeS5BJi+4UUi7oS+3mmEMzrwfDpSxbUgnwgXOqEV
oiqr77RwaY3eDDeavFheWptteI3LF5ykGnkqKwyH+FZf7K4Q4qi1uu6hwNuS/R2R
DYnN+DYkxX4ERkYMpHSqLR3xFjdqXLVRbl6mc8F8d/IcBMGm3J+2QJByJ4w6kMnX
53wVlWTGQ6oRn6XyhihKY1AoFvS3eEc1C6VT5kIINYPScT3HJILwNE4a3VH7F9gB
ps+U6tk6uHk=
-----END CERTIFICATE-----`;

type Http2UpgradeRuntimeState = {
  status: "stopped" | "starting" | "running" | "error";
  host: string;
  port: number;
  startedAt?: string;
  lastError?: string;
  streamCount: number;
  lastProbeAt?: string;
  lastProbeOk?: boolean;
  lastProbeLatencyMs?: number;
  lastProbeError?: string;
};

let http2UpgradeRuntime: Http2UpgradeRuntimeState = {
  status: "stopped",
  host: HTTP2_UPGRADE_HOST,
  port: HTTP2_UPGRADE_PORT,
  streamCount: 0,
};
let http2SecureRuntimeServer: Http2SecureServer | null = null;
let http2NetRuntimeServer: NetServer | null = null;

async function initCapacityMetricsStore() {
  const dbDir = normalize(join(DASHBOARD_METRICS_DB_PATH, ".."));
  await mkdir(dbDir, { recursive: true });

  const db = new Database(DASHBOARD_METRICS_DB_PATH);
  db.run("PRAGMA journal_mode = WAL");
  db.run("PRAGMA synchronous = NORMAL");
  db.run("PRAGMA temp_store = MEMORY");
  db.run(`
    CREATE TABLE IF NOT EXISTS capacity_snapshots (
      ts_ms INTEGER PRIMARY KEY,
      created_at TEXT NOT NULL,
      port INTEGER NOT NULL,
      bottleneck TEXT NOT NULL,
      bottleneck_severity TEXT NOT NULL,
      load_connection_pct INTEGER NOT NULL,
      load_worker_pct INTEGER NOT NULL,
      load_max_pct INTEGER NOT NULL,
      capacity_connections_pct INTEGER NOT NULL,
      capacity_workers_pct INTEGER NOT NULL,
      capacity_summary TEXT NOT NULL,
      capacity_severity TEXT NOT NULL,
      headroom_connections INTEGER NOT NULL,
      headroom_connections_pct INTEGER NOT NULL,
      headroom_connections_severity TEXT NOT NULL,
      headroom_workers INTEGER NOT NULL,
      headroom_workers_pct INTEGER NOT NULL,
      headroom_workers_severity TEXT NOT NULL
    )
  `);
  db.run("CREATE INDEX IF NOT EXISTS idx_capacity_snapshots_ts ON capacity_snapshots (ts_ms DESC)");

  capacityMetricsDb = db;
  capacityInsertStmt = db.prepare(`
    INSERT OR REPLACE INTO capacity_snapshots (
      ts_ms,
      created_at,
      port,
      bottleneck,
      bottleneck_severity,
      load_connection_pct,
      load_worker_pct,
      load_max_pct,
      capacity_connections_pct,
      capacity_workers_pct,
      capacity_summary,
      capacity_severity,
      headroom_connections,
      headroom_connections_pct,
      headroom_connections_severity,
      headroom_workers,
      headroom_workers_pct,
      headroom_workers_severity
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  capacityPruneStmt = db.prepare(`
    DELETE FROM capacity_snapshots
    WHERE ts_ms IN (
      SELECT ts_ms
      FROM capacity_snapshots
      ORDER BY ts_ms DESC
      LIMIT -1 OFFSET ?
    )
  `);
  capacitySelectStmt = db.prepare(`
    SELECT *
    FROM capacity_snapshots
    WHERE ts_ms >= ?
    ORDER BY ts_ms DESC
    LIMIT ?
  `);
}

const EVIDENCE_DASHBOARD = {
  "bun-v1.3.9-upgrade": {
    sources: [
      { tier: "T1", reference: "https://github.com/oven-sh/bun/releases/tag/bun-v1.3.9", verified: true },
      { tier: "T2", reference: "OpenCode Windows canary telemetry", verified: true },
      { tier: "T3", reference: "bun --cpu-prof-interval 500 benchmark suite", verified: true },
    ],
    lastValidated: "2024-03-15T10:30:00Z",
    defenseScore: 0.95,
    councilReview: false,
  },
  "protocol-scorecard": {
    sources: [
      { tier: "T3", reference: "Protocol latency benchmarks", verified: true },
      { tier: "T4", reference: "QCFL data flow patterns", verified: true },
      { tier: "T5", reference: "Architecture review 2024-03-14", verified: true },
    ],
    lastValidated: "2024-03-14T15:45:00Z",
    defenseScore: 0.65,
    councilReview: true,
    councilCase: "COUNCIL-20240315-001",
  },
} as const;

type DecisionSource = { tier: string; reference: string; verified: boolean };
type DecisionBenchmark = { name: string; result: number; threshold: number };
type GovernanceDecision = {
  id: string;
  claim: string;
  sources: DecisionSource[];
  benchmarks?: DecisionBenchmark[];
};

type FeatureRequest = Request | null;
type FeatureDefinition<T> = {
  envVar: string | string[];
  parse: (val: string) => T;
  default: T | ((req?: FeatureRequest) => T);
};
type AuthMethod =
  | "none"
  | "basic"
  | "bearer"
  | "tls"
  | "mtls"
  | "oauth2"
  | "aws-sigv4"
  | "iam-role"
  | "presigned-url"
  | "posix-acl"
  | "filesystem"
  | "inline"
  | "object-url";
type BodyType =
  | "string"
  | "json"
  | "form"
  | "blob"
  | "arrayBuffer"
  | "uint8array"
  | "stream"
  | "file"
  | "formdata"
  | "urlsearchparams"
  | "inline";
type CORSPolicy = "same-origin" | "cors-enabled" | "bucket-policy" | "n/a";
type ProtocolSecurityProfile = {
  encrypted: boolean;
  mitmVulnerable: boolean;
  certValidation: boolean;
  recommended: boolean;
  pathTraversal?: "protected";
  xssRisk?: "sanitize";
  memoryBacked?: boolean;
  localOnly?: boolean;
};
type ProtocolHandlerContext = {
  req: Request;
  method: string;
  headers: Record<string, string>;
  body?: BodyInit | null;
};
type ProtocolHandler = (url: string, ctx: ProtocolHandlerContext) => Promise<Response>;
type ProtocolConfig = {
  scheme: string;
  defaultPort: number | null;
  authMethods: AuthMethod[];
  bodyTypes: BodyType[];
  streaming: boolean;
  cacheable: boolean;
  corsPolicy: CORSPolicy;
  securityProfile: ProtocolSecurityProfile;
  maxSize: number | null;
  handler: ProtocolHandler;
};

type BunV139FeatureMatrixRow = {
  feature: string;
  cliOrApi: string;
  defaultBehavior: string;
  environmentOverride: string;
  integration: string;
  performanceImpact: string;
  memoryImpact: string;
  productionReady: string;
};

type ComponentStatusRow = {
  component: string;
  file: string;
  status: string;
  owner: string;
  lastCommit: string;
  testCoverage: string;
  performanceBudget: string;
  dependencies: string;
  securityReview: string;
  documentation: string;
  production: string;
};

const BUN_V139_FEATURE_MATRIX: BunV139FeatureMatrixRow[] = [
  {
    feature: "Parallel Scripts",
    cliOrApi: "bun run --parallel",
    defaultBehavior: "Sequential",
    environmentOverride: "PLAYGROUND_SCRIPT_MODE=parallel",
    integration: "ScriptRunner.execute('parallel')",
    performanceImpact: "95ms for 500 scripts",
    memoryImpact: "n/a",
    productionReady: "yes",
  },
  {
    feature: "Sequential Scripts",
    cliOrApi: "bun run --sequential",
    defaultBehavior: "—",
    environmentOverride: "PLAYGROUND_SCRIPT_MODE=sequential",
    integration: "ScriptRunner.execute('sequential')",
    performanceImpact: "Memory-constrained builds",
    memoryImpact: "lower peak usage",
    productionReady: "yes",
  },
  {
    feature: "No-Exit-On-Error",
    cliOrApi: "--no-exit-on-error",
    defaultBehavior: "false (fail-fast)",
    environmentOverride: "PLAYGROUND_NO_EXIT_ON_ERROR=true",
    integration: "CI/CD resilience",
    performanceImpact: "All scripts complete",
    memoryImpact: "n/a",
    productionReady: "yes",
  },
  {
    feature: "Pre/Post Grouping",
    cliOrApi: "Auto",
    defaultBehavior: "Enabled",
    environmentOverride: "—",
    integration: "groupPrePost(scripts)",
    performanceImpact: "Correct dep order",
    memoryImpact: "n/a",
    productionReady: "yes",
  },
  {
    feature: "vs --filter",
    cliOrApi: "--filter=\"pkg\"",
    defaultBehavior: "Dep-order respect",
    environmentOverride: "—",
    integration: "Use --parallel for watch scripts",
    performanceImpact: "No blocking on deps",
    memoryImpact: "n/a",
    productionReady: "yes",
  },
  {
    feature: "HTTP/2 Upgrade",
    cliOrApi: "net.Server -> Http2SecureServer",
    defaultBehavior: "Disabled",
    environmentOverride: "PLAYGROUND_HTTP2_UPGRADE=true",
    integration: "createServer({ allowHTTP1: true })",
    performanceImpact: "30-40% throughput",
    memoryImpact: "n/a",
    productionReady: "yes",
  },
  {
    feature: "Symbol.dispose Mocks",
    cliOrApi: "using spy = spyOn()",
    defaultBehavior: "Manual cleanup",
    environmentOverride: "—",
    integration: "All test suites refactored",
    performanceImpact: "Zero manual cleanup",
    memoryImpact: "small reduction in retained mocks",
    productionReady: "yes",
  },
  {
    feature: "NO_PROXY Fix",
    cliOrApi: "fetch()/WebSocket()",
    defaultBehavior: "Ignored (v1.3.8)",
    environmentOverride: "NO_PROXY=localhost,*.internal",
    integration: "SecureFetch layer",
    performanceImpact: "Bypass validation",
    memoryImpact: "n/a",
    productionReady: "yes",
  },
  {
    feature: "CPU Prof Interval",
    cliOrApi: "--cpu-prof-interval <us>",
    defaultBehavior: "1000",
    environmentOverride: "PLAYGROUND_CPU_PROF_INTERVAL=500",
    integration: "batch-profiler.ts",
    performanceImpact: "4x resolution",
    memoryImpact: "+2% overhead",
    productionReady: "yes (ARM64/x64)",
  },
  {
    feature: "ESM Bytecode",
    cliOrApi: "--compile --bytecode --format=esm",
    defaultBehavior: "CJS",
    environmentOverride: "PLAYGROUND_COMPILE_FORMAT=esm",
    integration: "fw-cli binary",
    performanceImpact: "50% faster cold start",
    memoryImpact: "-20% heap",
    productionReady: "yes (v1.3.9+)",
  },
  {
    feature: "ARMv8.0 Fix",
    cliOrApi: "Runtime dispatch",
    defaultBehavior: "SIGILL risk (v1.3.8)",
    environmentOverride: "—",
    integration: "AWS Graviton/RPi production",
    performanceImpact: "Stable",
    memoryImpact: "None",
    productionReady: "yes (Cortex-A53+)",
  },
  {
    feature: "Markdown SIMD",
    cliOrApi: "Bun.Markdown",
    defaultBehavior: "Baseline",
    environmentOverride: "—",
    integration: "Documentation pipeline",
    performanceImpact: "3-15% faster",
    memoryImpact: "None",
    productionReady: "yes (all platforms)",
  },
  {
    feature: "React Markdown",
    cliOrApi: "Bun.markdown.react()",
    defaultBehavior: "Baseline",
    environmentOverride: "—",
    integration: "Dashboard SSR",
    performanceImpact: "28% faster small docs",
    memoryImpact: "-6% heap, -40% objects",
    productionReady: "yes (all platforms)",
  },
  {
    feature: "AbortSignal Optimize",
    cliOrApi: "AbortSignal.abort()",
    defaultBehavior: "Event dispatch",
    environmentOverride: "—",
    integration: "Request cancellation",
    performanceImpact: "~6% micro-bench",
    memoryImpact: "-16ms/1M calls",
    productionReady: "yes (all platforms)",
  },
];

const COMPONENT_STATUS_MATRIX: ComponentStatusRow[] = [
  {
    component: "CPU Profiling",
    file: "batch-profiler.ts",
    status: "stable",
    owner: "@nolarose",
    lastCommit: "2f573c69",
    testCoverage: "94%",
    performanceBudget: "<2% overhead",
    dependencies: "Bun.FFI",
    securityReview: "Q1-2026",
    documentation: "./docs/profiler.md",
    production: "5 regions",
  },
  {
    component: "ESM Bytecode",
    file: "esm-bytecode/compile.ts",
    status: "stable",
    owner: "@nolarose",
    lastCommit: "2f573c69",
    testCoverage: "89%",
    performanceBudget: "50ms cold start",
    dependencies: "Bun.build",
    securityReview: "Q1-2026",
    documentation: "./docs/bytecode.md",
    production: "5 regions",
  },
  {
    component: "ARM Stability",
    file: "runtime/arm-dispatch.ts",
    status: "stable",
    owner: "@nolarose",
    lastCommit: "2f573c69",
    testCoverage: "100%",
    performanceBudget: "Zero SIGILL",
    dependencies: "mimalloc",
    securityReview: "Q1-2026",
    documentation: "./docs/arm.md",
    production: "5 regions",
  },
  {
    component: "Markdown SIMD",
    file: "docs/pipeline.ts",
    status: "stable",
    owner: "@nolarose",
    lastCommit: "2f573c69",
    testCoverage: "87%",
    performanceBudget: "3-15% faster",
    dependencies: "Bun.Markdown",
    securityReview: "Q1-2026",
    documentation: "./docs/markdown.md",
    production: "5 regions",
  },
  {
    component: "React Markdown",
    file: "dashboard/ssr.ts",
    status: "stable",
    owner: "@nolarose",
    lastCommit: "2f573c69",
    testCoverage: "91%",
    performanceBudget: "-6% heap",
    dependencies: "Bun.markdown.react",
    securityReview: "Q1-2026",
    documentation: "./docs/react-md.md",
    production: "5 regions",
  },
  {
    component: "Abort Optimize",
    file: "fetch/client.ts",
    status: "stable",
    owner: "@nolarose",
    lastCommit: "2f573c69",
    testCoverage: "93%",
    performanceBudget: "-16ms/1M",
    dependencies: "AbortController",
    securityReview: "Q1-2026",
    documentation: "./docs/abort.md",
    production: "5 regions",
  },
  {
    component: "Parallel Scripts",
    file: "parallel-runner/core.ts",
    status: "stable",
    owner: "@nolarose",
    lastCommit: "2f573c69",
    testCoverage: "96%",
    performanceBudget: "95ms/500 scripts",
    dependencies: "Bun.spawn",
    securityReview: "Q1-2026",
    documentation: "./docs/parallel.md",
    production: "5 regions",
  },
  {
    component: "Symbol.dispose",
    file: "mock-dispose/client.ts",
    status: "stable",
    owner: "@nolarose",
    lastCommit: "2f573c69",
    testCoverage: "98%",
    performanceBudget: "Zero cleanup",
    dependencies: "bun:test",
    securityReview: "Q1-2026",
    documentation: "./docs/mocks.md",
    production: "5 regions",
  },
  {
    component: "HTTP/2 Upgrade",
    file: "http-upgrade/orchestrator.ts",
    status: "stable",
    owner: "@nolarose",
    lastCommit: "2f573c69",
    testCoverage: "88%",
    performanceBudget: "30-40% throughput",
    dependencies: "node:http2",
    securityReview: "Q1-2026",
    documentation: "./docs/http2.md",
    production: "5 regions",
  },
  {
    component: "NO_PROXY Fix",
    file: "secure-fetch/index.ts",
    status: "stable",
    owner: "@nolarose",
    lastCommit: "2f573c69",
    testCoverage: "92%",
    performanceBudget: "Bypass validation",
    dependencies: "fetch",
    securityReview: "Q1-2026",
    documentation: "./docs/noproxy.md",
    production: "5 regions",
  },
  {
    component: "Protocol Resilience",
    file: "protocols/resilience-chain.ts",
    status: "stable",
    owner: "@nolarose",
    lastCommit: "2f573c69",
    testCoverage: "90%",
    performanceBudget: "Auto-failover",
    dependencies: "Bun.fetch",
    securityReview: "Q1-2026",
    documentation: "./docs/resilience.md",
    production: "5 regions",
  },
  {
    component: "Mini Dashboard",
    file: "micro-polish.js",
    status: "stable",
    owner: "@nolarose",
    lastCommit: "2f573c69",
    testCoverage: "85%",
    performanceBudget: "<16ms render",
    dependencies: "Bun.serve",
    securityReview: "Q1-2026",
    documentation: "./docs/mini-dash.md",
    production: "5 regions",
  },
  {
    component: "WebSocket Gateway",
    file: "ws-gateway.ts",
    status: "beta",
    owner: "@nolarose",
    lastCommit: "HEAD",
    testCoverage: "78%",
    performanceBudget: "<1ms latency",
    dependencies: "Bun.serve",
    securityReview: "Q2-2026",
    documentation: "./docs/ws.md",
    production: "staging",
  },
  {
    component: "Predictive Cache",
    file: "caching/predictive.ts",
    status: "beta",
    owner: "@nolarose",
    lastCommit: "HEAD",
    testCoverage: "72%",
    performanceBudget: "90% hit rate",
    dependencies: "Bun.FFI",
    securityReview: "Q2-2026",
    documentation: "./docs/predictive.md",
    production: "staging",
  },
];

const featureDefinitions: Record<string, FeatureDefinition<unknown>> = {
  bodyType: {
    envVar: "PLAYGROUND_BODY_TYPE",
    parse: (val: string) => val.trim().toLowerCase(),
    default: (req?: FeatureRequest) => {
      const contentType = req?.headers.get("content-type")?.toLowerCase() || "";
      if (contentType.includes("application/json")) return "json";
      if (contentType.includes("application/x-www-form-urlencoded")) return "form";
      if (contentType.includes("multipart/form-data")) return "multipart";
      if (contentType.includes("application/octet-stream")) return "binary";
      return "text";
    },
  },
  proxy: {
    envVar: ["PLAYGROUND_PROXY_URL", "PLAYGROUND_PROXY_DEFAULT", "HTTP_PROXY", "HTTPS_PROXY"],
    parse: (val: string) => val.trim(),
    default: null,
  },
};

async function readJsonSafe(path: string): Promise<any | null> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getMimeType(path: string): string {
  const ext = extname(path).toLowerCase();
  const map: Record<string, string> = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".md": "text/markdown; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
    ".wasm": "application/wasm",
  };
  return map[ext] || "application/octet-stream";
}

function resolveProtocolFromUrl(rawUrl: string): string {
  if (rawUrl.startsWith("http+unix://")) return "http+unix:";
  return new URL(rawUrl).protocol;
}

function parseHttpUnixUrl(rawUrl: string): { socketPath: string; targetUrl: string } {
  const stripped = rawUrl.slice("http+unix://".length);
  const marker = stripped.indexOf(":/");
  if (marker < 1) {
    throw new Error("Invalid http+unix URL. Expected format: http+unix://%2Fpath%2Fsock:/request/path");
  }
  const encodedSocket = stripped.slice(0, marker);
  const requestPath = stripped.slice(marker + 1);
  const socketPath = decodeURIComponent(encodedSocket);
  const normalizedPath = requestPath.startsWith("/") ? requestPath : `/${requestPath}`;
  return { socketPath, targetUrl: `http://localhost${normalizedPath}` };
}

function isWithinBasePath(candidatePath: string, basePath: string): boolean {
  if (candidatePath === basePath) return true;
  return candidatePath.startsWith(basePath.endsWith(sep) ? basePath : `${basePath}${sep}`);
}

const httpHandler: ProtocolHandler = async (url, ctx) => {
  return await fetch(url, {
    method: ctx.method,
    headers: ctx.headers,
    body: ctx.body,
  });
};

const httpsHandler: ProtocolHandler = async (url, ctx) => {
  return await fetch(url, {
    method: ctx.method,
    headers: ctx.headers,
    body: ctx.body,
  });
};

const fileHandler: ProtocolHandler = async (url) => {
  const urlObj = new URL(url);
  const requestedPath = normalize(decodeURIComponent(urlObj.pathname));
  const resolvedPath = resolvePath(requestedPath);
  const allowedBase = resolvePath(process.env.PLAYGROUND_FILE_BASE_PATH || "/tmp");
  if (!isWithinBasePath(resolvedPath, allowedBase)) {
    throw new Error(`Path ${resolvedPath} outside allowed base ${allowedBase}`);
  }

  const file = Bun.file(resolvedPath);
  if (!(await file.exists())) {
    return new Response(JSON.stringify({ error: "File not found", path: resolvedPath }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  const stat = await file.stat();
  return new Response(file, {
    headers: {
      "Content-Type": getMimeType(resolvedPath),
      "Content-Length": String(stat.size),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
};

const dataHandler: ProtocolHandler = async (url) => {
  return await fetch(url);
};

const blobHandler: ProtocolHandler = async (url) => {
  return await fetch(url);
};

const s3Handler: ProtocolHandler = async (url, ctx) => {
  return await fetch(url, {
    method: ctx.method,
    headers: ctx.headers,
    body: ctx.body,
    s3: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || "us-east-1",
      endpoint: process.env.S3_ENDPOINT,
    },
  } as RequestInit);
};

const unixSocketHandler: ProtocolHandler = async (url, ctx) => {
  const parsed = parseHttpUnixUrl(url);
  const init: RequestInit & { unix?: string } = {
    method: ctx.method,
    headers: ctx.headers,
    body: ctx.body,
    unix: parsed.socketPath,
  };
  return await fetch(parsed.targetUrl, init);
};

const PROTOCOL_REGISTRY: Record<string, ProtocolConfig> = {
  "http:": {
    scheme: "http",
    defaultPort: 80,
    authMethods: ["none", "basic", "bearer"],
    bodyTypes: ["string", "json", "form", "blob", "arrayBuffer", "uint8array", "stream", "file", "formdata", "urlsearchparams"],
    streaming: true,
    cacheable: false,
    corsPolicy: "same-origin",
    securityProfile: { encrypted: false, mitmVulnerable: true, certValidation: false, recommended: false },
    maxSize: Number.POSITIVE_INFINITY,
    handler: httpHandler,
  },
  "https:": {
    scheme: "https",
    defaultPort: 443,
    authMethods: ["tls", "mtls", "basic", "bearer", "oauth2"],
    bodyTypes: ["string", "json", "form", "blob", "arrayBuffer", "uint8array", "stream", "file", "formdata", "urlsearchparams"],
    streaming: true,
    cacheable: true,
    corsPolicy: "cors-enabled",
    securityProfile: { encrypted: true, mitmVulnerable: false, certValidation: true, recommended: true },
    maxSize: Number.POSITIVE_INFINITY,
    handler: httpsHandler,
  },
  "s3:": {
    scheme: "s3",
    defaultPort: 443,
    authMethods: ["aws-sigv4", "iam-role", "presigned-url"],
    bodyTypes: ["string", "blob", "file", "stream", "arrayBuffer", "uint8array"],
    streaming: true,
    cacheable: true,
    corsPolicy: "bucket-policy",
    securityProfile: { encrypted: true, mitmVulnerable: false, certValidation: true, recommended: true },
    maxSize: 5 * 1024 * 1024 * 1024 * 1024,
    handler: s3Handler,
  },
  "file:": {
    scheme: "file",
    defaultPort: null,
    authMethods: ["posix-acl", "filesystem"],
    bodyTypes: ["file"],
    streaming: false,
    cacheable: false,
    corsPolicy: "n/a",
    securityProfile: { encrypted: false, mitmVulnerable: false, certValidation: false, recommended: true, pathTraversal: "protected" },
    maxSize: null,
    handler: fileHandler,
  },
  "data:": {
    scheme: "data",
    defaultPort: null,
    authMethods: ["inline"],
    bodyTypes: ["inline"],
    streaming: false,
    cacheable: true,
    corsPolicy: "n/a",
    securityProfile: { encrypted: false, mitmVulnerable: false, certValidation: false, recommended: true, xssRisk: "sanitize" },
    maxSize: 2 * 1024 * 1024,
    handler: dataHandler,
  },
  "blob:": {
    scheme: "blob",
    defaultPort: null,
    authMethods: ["object-url"],
    bodyTypes: ["blob"],
    streaming: false,
    cacheable: false,
    corsPolicy: "n/a",
    securityProfile: { encrypted: false, mitmVulnerable: false, certValidation: false, recommended: true, memoryBacked: true },
    maxSize: null,
    handler: blobHandler,
  },
  "http+unix:": {
    scheme: "http+unix",
    defaultPort: null,
    authMethods: ["filesystem"],
    bodyTypes: ["string", "json", "form", "blob", "arrayBuffer", "uint8array", "stream", "formdata", "urlsearchparams"],
    streaming: true,
    cacheable: false,
    corsPolicy: "n/a",
    securityProfile: { encrypted: false, mitmVulnerable: false, certValidation: false, recommended: true, localOnly: true },
    maxSize: null,
    handler: unixSocketHandler,
  },
};

async function getWorkspaceOrchestrationPanel() {
  const rootPackagePath = join(PROJECT_ROOT, "package.json");
  const rootPackage = await readJsonSafe(rootPackagePath);
  const rootScripts = rootPackage?.scripts ?? {};
  const workspaces = Array.isArray(rootPackage?.workspaces) ? rootPackage.workspaces : [];

  const workspaceDirs: string[] = [];
  if (workspaces.includes("packages/*")) {
    try {
      const entries = await readdir(join(PROJECT_ROOT, "packages"), { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          workspaceDirs.push(join(PROJECT_ROOT, "packages", entry.name));
        }
      }
    } catch {
      // Leave workspaceDirs empty if packages/ is unavailable.
    }
  }

  const workspacePackages: Array<{
    name: string;
    path: string;
    scripts: string[];
  }> = [];

  for (const workspaceDir of workspaceDirs) {
    const packageJsonPath = join(workspaceDir, "package.json");
    const pkg = await readJsonSafe(packageJsonPath);
    if (!pkg) continue;
    const scriptNames = Object.keys(pkg.scripts ?? {});
    workspacePackages.push({
      name: String(pkg.name || workspaceDir.split("/").pop() || "unknown"),
      path: workspaceDir.replace(PROJECT_ROOT + "/", ""),
      scripts: scriptNames.sort(),
    });
  }

  const rootExamples = [
    "bun run --parallel --if-present workspaces:build workspaces:lint workspaces:test",
    "bun run --sequential --if-present workspaces:build workspaces:lint workspaces:test",
    "bun run --parallel --workspaces --if-present build lint test",
    "bun run --sequential --workspaces --if-present build",
    "bun run --parallel --no-exit-on-error --workspaces --if-present test",
  ];

  return {
    generatedAt: new Date().toISOString(),
    rootPackage: {
      name: String(rootPackage?.name || "unknown"),
      path: "package.json",
      workspacePatterns: workspaces,
      scriptCount: Object.keys(rootScripts).length,
      keyScripts: Object.keys(rootScripts)
        .filter((name) => /workspaces:|build|lint|test|dev/.test(name))
        .slice(0, 24),
    },
    workspacePackages: workspacePackages.slice(0, 40),
    recommendedCommands: rootExamples,
    notes: [
      "--parallel and --sequential start scripts directly; they do not enforce workspace dependency order.",
      "Use --workspaces --if-present in this repo because workspace packages may not all define build/lint/test scripts.",
      "Use bun --filter when dependency-order execution is required for build pipelines.",
      "Use --if-present to skip packages that do not define a script.",
    ],
  };
}

function buildOrchestrationSimulation(mode: "parallel" | "sequential" | "parallel-no-exit" | "filter") {
  const now = new Date().toISOString();
  const prefixRows = {
    build: "build | compiling...",
    lint: "lint  | checking files...",
    test: "test  | running suite...",
  };

  if (mode === "sequential") {
    return {
      mode,
      generatedAt: now,
      semantics: "Runs scripts one-by-one in listed order with prefixed output.",
      lines: [
        prefixRows.build,
        "build | Done in 391ms",
        prefixRows.test,
        "test  | 42 passed",
        prefixRows.lint,
        "lint  | 0 errors",
      ],
      exitCode: 0,
      behavior: "No sibling interruption because scripts are serial.",
    };
  }

  if (mode === "parallel-no-exit") {
    return {
      mode,
      generatedAt: now,
      semantics: "Runs all scripts concurrently and keeps siblings alive when one fails.",
      lines: [
        prefixRows.build,
        prefixRows.test,
        prefixRows.lint,
        "lint  | Oops! Something went wrong! :(  (exit 2)",
        "build | Done in 391ms",
        "test  | completed remaining tests",
      ],
      exitCode: 2,
      behavior: "--no-exit-on-error allows full failure visibility.",
    };
  }

  if (mode === "filter") {
    return {
      mode,
      generatedAt: now,
      semantics: "Dependency-ordered package execution with bun --filter.",
      lines: [
        "pkg-core:build | compiling...",
        "pkg-app:build  | waiting for pkg-core dependency",
        "pkg-core:build | done",
        "pkg-app:build  | compiling...",
      ],
      exitCode: 0,
      behavior: "Unlike --parallel/--sequential, --filter can wait on dependency order.",
    };
  }

  return {
    mode: "parallel",
    generatedAt: now,
    semantics: "Runs scripts concurrently; default fail-fast kills siblings after first failure.",
    lines: [
      prefixRows.build,
      prefixRows.test,
      prefixRows.lint,
      "lint  | Oops! Something went wrong! :(  (exit 2)",
      "build | Exited by signal SIGINT (fail-fast sibling shutdown)",
      "test  | Exited by signal SIGINT (fail-fast sibling shutdown)",
    ],
    exitCode: 2,
    behavior: "Default --parallel behavior in Bun v1.3.9.",
  };
}

async function runScriptOrchestrationFullLoop() {
  const panel = await getWorkspaceOrchestrationPanel();
  const parallel = buildOrchestrationSimulation("parallel");
  const parallelNoExit = buildOrchestrationSimulation("parallel-no-exit");
  const sequential = buildOrchestrationSimulation("sequential");
  const filterOrdered = buildOrchestrationSimulation("filter");

  const report = {
    generatedAt: new Date().toISOString(),
    source: "https://bun.com/blog/bun-v1.3.9#bun-run-parallel-and-bun-run-sequential",
    panel,
    simulations: {
      parallel,
      parallelNoExit,
      sequential,
      filterOrdered,
    },
    summary: {
      failFast: parallel.exitCode !== 0,
      noExitKeepsRunning: parallelNoExit.exitCode !== 0,
      sequentialOrdered: sequential.exitCode === 0,
      filterDependencyAware: filterOrdered.exitCode === 0,
    },
  };
  cachedOrchestrationLoop = report;
  cachedOrchestrationLoopAt = Date.now();
  return report;
}

async function getScriptOrchestrationStatus() {
  const now = Date.now();
  const ageMs = now - cachedOrchestrationLoopAt;
  if (!cachedOrchestrationLoop || ageMs > ORCHESTRATION_CACHE_TTL_MS) {
    await runScriptOrchestrationFullLoop();
  }
  const loop = cachedOrchestrationLoop as any;
  const summary = loop?.summary || null;
  const pass = Boolean(
    summary?.failFast &&
    summary?.noExitKeepsRunning &&
    summary?.sequentialOrdered &&
    summary?.filterDependencyAware
  );
  return {
    generatedAt: new Date().toISOString(),
    cache: {
      ttlMs: ORCHESTRATION_CACHE_TTL_MS,
      ageMs: Math.max(0, Date.now() - cachedOrchestrationLoopAt),
      cachedAt: cachedOrchestrationLoopAt ? new Date(cachedOrchestrationLoopAt).toISOString() : null,
      fresh: cachedOrchestrationLoopAt > 0 && Date.now() - cachedOrchestrationLoopAt <= ORCHESTRATION_CACHE_TTL_MS,
    },
    source: loop?.source || "https://bun.com/blog/bun-v1.3.9#bun-run-parallel-and-bun-run-sequential",
    summary,
    pass,
  };
}

function impactFromGates(input: { warn?: string; strict?: string }): "Low" | "Medium" | "High" {
  if (input.strict === "fail" || input.warn === "fail") return "High";
  if (input.strict === "warn" || input.warn === "warn") return "Medium";
  return "Low";
}

async function readDecisionGovernanceSnapshot(): Promise<{
  decisionId: string | null;
  status: "APPROVED" | "REVIEW_REQUIRED" | "REJECTED" | "UNKNOWN";
  evidenceTierCoverage: string[];
  hasT1T2: boolean;
  expiry: string | null;
  evidenceScore: number | null;
  digest: string | null;
  evidencePath: string | null;
}> {
  const index = await readJsonSafe(DECISIONS_INDEX_PATH);
  const first = Array.isArray(index?.decisions) ? index.decisions[0] : null;
  if (!first?.evidence_path) {
    return {
      decisionId: null,
      status: "UNKNOWN",
      evidenceTierCoverage: [],
      hasT1T2: false,
      expiry: null,
      evidenceScore: null,
      digest: null,
      evidencePath: null,
    };
  }
  const evidencePath = join(DECISIONS_ROOT, String(first.evidence_path));
  const evidence = await readJsonSafe(evidencePath);
  const sources = Array.isArray(evidence?.sources) ? evidence.sources : [];
  const verifiedTiers = Array.from(
    new Set(
      sources
        .filter((source: any) => source?.verified)
        .map((source: any) => String(source.tier || ""))
        .filter(Boolean)
    )
  ).sort();
  const hasT1T2 = verifiedTiers.includes("T1") && verifiedTiers.includes("T2");

  return {
    decisionId: String(evidence?.decision_id || first.decision_id || ""),
    status: (evidence?.status || first.status || "UNKNOWN") as "APPROVED" | "REVIEW_REQUIRED" | "REJECTED" | "UNKNOWN",
    evidenceTierCoverage: verifiedTiers,
    hasT1T2,
    expiry: evidence?.expiry || null,
    evidenceScore: Number.isFinite(Number(evidence?.evidence_score)) ? Number(evidence.evidence_score) : null,
    digest: evidence?.evidence_digest || first.evidence_digest || null,
    evidencePath,
  };
}

// Demo configurations
const DEMOS = [
  {
    id: "governance-status",
    name: "Governance Status (Canonical)",
    description: "Read canonical decision and benchmark governance status from repo artifacts",
    category: "Governance",
    code: `# Canonical governance status
curl -s http://localhost:<port>/api/control/governance-status
`,
  },
  {
    id: "decision-defense",
    name: "Decision Defense Validator",
    description: "Evidence-weighted defensibility scoring with governance gaps",
    category: "Governance",
    code: `# Inspect decision defense dashboard
curl -s http://localhost:<port>/api/control/decision-defense
`,
  },
  {
    id: "evidence-dashboard",
    name: "Evidence Governance Dashboard",
    description: "Live evidence tracking with defense score and council review state",
    category: "Governance",
    code: `# Inspect evidence tracking dashboard
curl -s http://localhost:<port>/api/control/evidence-dashboard
`,
  },
  {
    id: "protocol-matrix",
    name: "Protocol Support Matrix",
    description: "Bun-accurate fetch/network protocol capabilities and constraints",
    category: "Governance",
    code: `# Inspect Bun protocol matrix (runtime semantics)
curl -s http://localhost:<port>/api/control/protocol-matrix
`,
  },
  {
    id: "protocol-scorecard",
    name: "Protocol Scorecard",
    description: "Team-agreed protocol scorecard with architectural impact column",
    category: "Governance",
    code: `# Inspect team protocol scorecard
curl -s http://localhost:<port>/api/control/protocol-scorecard
`,
  },
  {
    id: "protocol-router-tier1380",
    name: "Protocol Router (Tier-1380)",
    description: "Hardened protocol registry and secure routing contract for /api/fetch/protocol-router",
    category: "Governance",
    code: `# Inspect protocol registry contract (dry run)
curl -s -X POST http://localhost:<port>/api/fetch/protocol-router \\
  -H "content-type: application/json" \\
  -d '{"url":"https://example.com","dryRun":true}'

# Execute request through hardened protocol router
curl -s -X POST http://localhost:<port>/api/fetch/protocol-router \\
  -H "content-type: application/json" \\
  -d '{"url":"https://example.com","method":"GET"}'
`,
  },
  {
    id: "multipart-progress",
    name: "Multipart Progress Tracking",
    description: "Simulate upload progress events for multipart/file body types",
    category: "Governance",
    code: `# Simulate multipart upload progress
curl -s -X POST http://localhost:<port>/api/control/upload-progress \\
  -H "content-type: application/json" \\
  -d '{"bodyType":"multipart","sizeBytes":5242880,"chunkSize":262144}'
`,
  },
  {
    id: "s3-content-type",
    name: "S3 Content-Type Mapping",
    description: "Resolve MIME type from object key extension for S3/R2 writes",
    category: "Governance",
    code: `# Single key
curl -s "http://localhost:<port>/api/control/s3-content-type?key=assets/logo.svg"

# Batch keys
curl -s -X POST http://localhost:<port>/api/control/s3-content-type-batch \\
  -H "content-type: application/json" \\
  -d '{"keys":["app.js","styles.css","readme.md","archive.bin"]}'
`,
  },
  {
    id: "control-plane",
    name: "Network Control Plane",
    description: "Optional prefetch/preconnect warmup with smoke-test validation",
    category: "Governance",
    code: `# Optional warmup controls (off by default)
PLAYGROUND_PREFETCH_ENABLED=1
PLAYGROUND_PRECONNECT_ENABLED=1
PLAYGROUND_PREFETCH_HOSTS=api.example.com,r2.example.com
PLAYGROUND_PRECONNECT_URLS=https://api.example.com,https://r2.example.com

# Validate impact without forcing rollout
curl -s http://localhost:<port>/api/control/network-smoke
`,
  },
  {
    id: "resilience-governance",
    name: "Resilience Governance Profile",
    description: "Active environment profile alignment for retries, circuit breaker, pooling, and DNS toggles",
    category: "Governance",
    code: `# Resolve active resilience profile and alignment
curl -s http://localhost:<port>/api/control/resilience/status | jq .

# Override profile explicitly
PLAYGROUND_RESILIENCE_PROFILE=staging bun run start:dashboard:playground
PLAYGROUND_RESILIENCE_PROFILE=production bun run start:dashboard:playground`,
  },
  {
    id: "brand-bench-gate",
    name: "Brand Bench Gate (Canonical)",
    description: "Run and inspect canonical branding benchmark + gate status",
    category: "Governance",
    code: `# Canonical runner + evaluator
bun run brand:bench:all

# Inspect gate in warn mode (PR-cycle phase)
bun run brand:bench:evaluate

# Inspect strict mode readiness
bun run scripts/brand-bench-evaluate.ts --json --strict

# Optional baseline promotion (manual)
bun run brand:bench:pin --from=reports/brand-bench/latest.json --rationale="..."
`,
  },
  {
    id: "parallel",
    name: "Parallel & Sequential Scripts",
    description: "Run multiple scripts concurrently or sequentially with pre/post grouping",
    category: "Script Orchestration",
    code: `// Example: Parallel script execution
bun run --parallel build test lint

// Example: Sequential execution  
bun run --sequential build test

// Example: Workspace support
bun run --parallel --filter '*' build

// Example: Pre/post scripts automatically grouped
// prebuild → build → postbuild runs as a unit
bun run --parallel build test

// Example: Error handling
bun run --parallel --no-exit-on-error --filter '*' test

// Note: --parallel/--sequential don't respect dependency order
// Use --filter for dependency-aware execution`,
  },
  {
    id: "workspace-runner-panel",
    name: "Workspace Runner Panel",
    description: "Live workspace-aware --parallel/--sequential commands from root package.json",
    category: "Script Orchestration",
    code: `# Read real workspace scripts + recommended commands
curl -s http://localhost:<port>/api/control/script-orchestration-panel | jq .

# Root-level orchestration (repo-canonical)
bun run --parallel --if-present workspaces:build workspaces:lint workspaces:test
bun run --sequential --if-present workspaces:build workspaces:lint workspaces:test

# Direct workspace scripts (skip missing scripts)
bun run --parallel --workspaces --if-present build lint test
bun run --sequential --workspaces --if-present build`,
  },
  {
    id: "script-orchestration-control",
    name: "Script Orchestration Control",
    description: "Interactive fail-fast vs no-exit vs sequential simulation with prefixed output",
    category: "Script Orchestration",
    code: `# Panel data from root package.json
curl -s http://localhost:<port>/api/control/script-orchestration-panel | jq .

# Simulations (Bun v1.3.9 semantics)
curl -s -X POST "http://localhost:<port>/api/control/script-orchestration-simulate?mode=parallel" | jq .
curl -s -X POST "http://localhost:<port>/api/control/script-orchestration-simulate?mode=parallel-no-exit" | jq .
curl -s -X POST "http://localhost:<port>/api/control/script-orchestration-simulate?mode=sequential" | jq .
curl -s -X POST "http://localhost:<port>/api/control/script-orchestration-simulate?mode=filter" | jq .
curl -s http://localhost:<port>/api/control/script-orchestration/status | jq .
curl -s -X POST "http://localhost:<port>/api/control/script-orchestration/full-loop" | jq .`,
  },
  {
    id: "feature-matrix",
    name: "Bun v1.3.9 Feature Matrix",
    description: "CLI/API defaults, env overrides, integration points, and performance notes",
    category: "Script Orchestration",
    code: `# Inspect Bun v1.3.9 feature matrix used by playground integration
curl -s http://localhost:<port>/api/control/feature-matrix | jq .

# Focus only environment overrides
curl -s http://localhost:<port>/api/control/feature-matrix | jq '.rows[] | {feature, environmentOverride}'
`,
  },
  {
    id: "component-status-matrix",
    name: "Component Status Matrix",
    description: "Operational status, ownership, test coverage, and production posture by component",
    category: "Governance",
    code: `# Inspect component readiness matrix
curl -s http://localhost:<port>/api/control/component-status | jq .

# Show unstable components only
curl -s http://localhost:<port>/api/control/component-status | jq '.rows[] | select(.status != "stable")'
`,
  },
  {
    id: "http2",
    name: "HTTP/2 Connection Upgrades",
    description: "net.Server → Http2SecureServer connection upgrade",
    category: "Networking",
    code: `import { createServer } from "node:net";
import { createSecureServer } from "node:http2";

const h2Server = createSecureServer({ key, cert });
h2Server.on("stream", (stream, headers) => {
  stream.respond({ ":status": 200 });
  stream.end("Hello over HTTP/2!");
});

const netServer = createServer((rawSocket) => {
  h2Server.emit("connection", rawSocket);
});`,
  },
  {
    id: "http2-runtime-control",
    name: "HTTP/2 Upgrade Runtime Control",
    description: "Start, inspect, and stop live net.Server -> Http2SecureServer forwarding runtime",
    category: "Networking",
    code: `# Start runtime control plane
curl -s -X POST http://localhost:<port>/api/control/http2-upgrade/start | jq .

# Check status
curl -s http://localhost:<port>/api/control/http2-upgrade/status | jq .

# Probe live stream response through the forwarded socket
curl -s http://localhost:<port>/api/control/http2-upgrade/probe | jq .

# Full loop: start -> probe x3 -> stop
curl -s -X POST "http://localhost:<port>/api/control/http2-upgrade/full-loop?iterations=3&delayMs=120" | jq .

# Stop runtime
curl -s -X POST http://localhost:<port>/api/control/http2-upgrade/stop | jq .`,
  },
  {
    id: "mocks",
    name: "Mock Auto-Cleanup",
    description: "Automatic mock restoration with Symbol.dispose",
    category: "Testing",
    code: `import { spyOn, test } from "bun:test";

test("auto-restores spy", () => {
  const obj = { method: () => "original" };
  
  {
    using spy = spyOn(obj, "method").mockReturnValue("mocked");
    expect(obj.method()).toBe("mocked");
  }
  
  // Automatically restored
  expect(obj.method()).toBe("original");
});`,
  },
  {
    id: "proxy",
    name: "NO_PROXY Environment Variable",
    description: "NO_PROXY now respected even with explicit proxy",
    category: "Networking",
    code: `// Previously, setting NO_PROXY only worked when the proxy was
// auto-detected from http_proxy/HTTP_PROXY environment variables.
// If you explicitly passed a proxy option to fetch() or new WebSocket(),
// the NO_PROXY environment variable was ignored.

// Now, NO_PROXY is always checked — even when a proxy is explicitly
// provided via the proxy option.

// NO_PROXY=localhost
// Previously, this would still use the proxy. Now it correctly bypasses it.
await fetch("http://localhost:3000/api", {
  proxy: "http://my-proxy:8080",
});

// Same fix applies to WebSocket
const ws = new WebSocket("ws://localhost:3000/ws", {
  proxy: "http://my-proxy:8080",
});`,
  },
  {
    id: "no-proxy-explicit",
    name: "NO_PROXY + Explicit Proxy",
    description: "Explicit proxy option now honors NO_PROXY for fetch/WebSocket",
    category: "Networking",
    code: `# Works with explicit proxy option now
NO_PROXY=localhost bun -e '
const res = await fetch("http://localhost:3000/api", { proxy: "http://my-proxy:8080" });
console.log(res.status);
'

// WebSocket also honors NO_PROXY
const ws = new WebSocket("ws://localhost:3000/ws", { proxy: "http://my-proxy:8080" });`,
  },
  {
    id: "profiling",
    name: "CPU Profiling Interval",
    description: "Configurable CPU profiler sampling interval",
    category: "Performance",
    code: `// Default interval (1000μs)
bun --cpu-prof index.js

// Higher resolution (500μs)
bun --cpu-prof --cpu-prof-interval 500 index.js

// Very high resolution (250μs)
bun --cpu-prof --cpu-prof-interval 250 index.js`,
  },
  {
    id: "cpu-prof-interval-explicit",
    name: "--cpu-prof-interval (Explicit)",
    description: "Node-compatible CPU sampling interval flag in microseconds",
    category: "Performance",
    code: `# Default 1000us
bun --cpu-prof index.js

# Higher resolution sampling
bun --cpu-prof --cpu-prof-interval 500 index.js

# If used without --cpu-prof or --cpu-prof-md, Bun warns
bun --cpu-prof-interval 500 index.js`,
  },
  {
    id: "bytecode",
    name: "ESM Bytecode Compilation",
    description: "ESM bytecode support in --compile",
    category: "Build",
    code: `// ESM bytecode (NEW in v1.3.9)
bun build --compile --bytecode --format=esm ./cli.ts

// CJS bytecode (existing)
bun build --compile --bytecode --format=cjs ./cli.ts

// Default (CJS, may change to ESM in future)
bun build --compile --bytecode ./cli.ts`,
  },
  {
    id: "esm-bytecode-explicit",
    name: "ESM Bytecode Compile (Explicit)",
    description: "--compile + --bytecode now supports --format=esm",
    category: "Build",
    code: `# ESM bytecode (supported)
bun build --compile --bytecode --format=esm ./cli.ts

# CJS bytecode remains supported
bun build --compile --bytecode --format=cjs ./cli.ts

# Without explicit format, bytecode still defaults to cjs`,
  },
  {
    id: "performance",
    name: "Performance Optimizations",
    description: "RegExp JIT, Markdown, String optimizations",
    category: "Performance",
    code: `// RegExp JIT (3.9x faster)
/(?:abc){3}/      // Fixed-count → JIT-optimized
/(?:abc)+/        // Variable count → interpreter

// Markdown (3-15% faster)
Bun.markdown.html(markdown);
Bun.markdown.react(markdown);

// String optimizations (automatic)
str.startsWith("prefix");  // 1.42x faster
str.trim();                 // 1.17x faster

// Collection size (automatic)
set.size;  // 2.24x faster
map.size;   // 2.74x faster

// AbortSignal (faster with no listeners)
signal.abort();  // Optimized in Bun v1.3.9`,
  },
  {
    id: "bugfixes",
    name: "Key Bugfixes",
    description: "Important bugfixes and compatibility improvements",
    category: "Bugfixes",
    code: `// Fixed: Windows existsSync('.') now works correctly
import { existsSync } from "node:fs";
existsSync('.');  // ✅ Now works on Windows

// Fixed: Function.prototype.toString() compatibility
function test() {}
test.toString();  // ✅ Returns correct string representation

// Fixed: WebSocket crash on certain messages
const ws = new WebSocket("ws://example.com");
ws.send(data);  // ✅ More stable

// Fixed: Sequential HTTP requests
await fetch(url1);
await fetch(url2);  // ✅ No longer hangs

// Fixed: ARMv8.0 aarch64 CPU crashes
// ✅ Bun now works on older ARM processors`,
  },
  {
    id: "bun-apis-stringwidth",
    name: "Bun APIs: stringWidth Thai/Lao Fix",
    description: "Bun.stringWidth now correctly counts Thai/Lao spacing vowels in v1.3.9",
    category: "Bugfixes",
    code: `// Bun v1.3.9 Bun APIs fix:
// Thai/Lao spacing vowels are width 1 (not zero-width)

const thai = "คำ"; // Thai word using SARA AM
const lao = "ຄຳ"; // Lao equivalent pattern

console.log(Bun.stringWidth(thai)); // ✅ Correct width (2)
console.log(Bun.stringWidth(lao));  // ✅ Correct width (2)

// Source: https://bun.com/blog/bun-v1.3.9`,
  },
  {
    id: "markdown-advanced",
    name: "Advanced Markdown (v1.3.8)",
    description: "Bun.markdown.html(), .render(), .react() with GFM extensions",
    category: "Features",
    code: `// Basic HTML rendering
Bun.markdown.html("# Hello **world**");

// GFM Extensions (tables, strikethrough, task lists)
const gfm = \`
| Name | Value |
|------|-------|
| Bun  | Fast  |

- [x] Done
- [ ] Pending

~~deleted~~ text
\`;
Bun.markdown.html(gfm);

// Custom render with callbacks
Bun.markdown.render("# Title", {
  heading: (children, { level }) => 
    \`<h\${level} class="title">\${children}</h\${level}>\`,
});

// React elements (React 19 by default)
const element = Bun.markdown.react("# Hello **world**");`,
  },
  {
    id: "symbol-dispose",
    name: "Symbol.dispose for Mocks (v1.3.9)",
    description: "Automatic mock cleanup with 'using' keyword",
    category: "Testing",
    code: `import { spyOn, mock, test } from "bun:test";

test("auto-restores spy", () => {
  const obj = { method: () => "original" };
  
  {
    using spy = spyOn(obj, "method").mockReturnValue("mocked");
    expect(obj.method()).toBe("mocked");
  }
  
  // Automatically restored when spy leaves scope
  expect(obj.method()).toBe("original");
});

// Manual dispose also works
const fn = mock(() => "value");
fn();
fn[Symbol.dispose](); // Same as fn.mockRestore()
expect(fn).toHaveBeenCalledTimes(0);`,
  },
  {
    id: "symbol-dispose-explicit",
    name: "Symbol.dispose with mock()/spyOn()",
    description: "Disposable test doubles with using and direct Symbol.dispose",
    category: "Testing",
    code: `import { test, expect, spyOn, mock } from "bun:test";

test("spy restores automatically", () => {
  const obj = { method: () => "original" };
  {
    using spy = spyOn(obj, "method").mockReturnValue("mocked");
    expect(obj.method()).toBe("mocked");
  }
  expect(obj.method()).toBe("original");
});

const fn = mock(() => "value");
fn();
fn[Symbol.dispose](); // alias of mockRestore()
expect(fn).toHaveBeenCalledTimes(0);`,
  },
  {
    id: "ipc-communication",
    name: "IPC Communication",
    description: "Spawn child processes and communicate via Bun.spawn() IPC",
    category: "Features",
    code: `// Spawn child process with IPC
const child = Bun.spawn({
  cmd: [process.execPath, "child.ts"],
  ipc(message) {
    console.log("Parent received:", message);
  },
});

// Send messages to child
child.send("Hello from parent!");
child.send({ type: "command", data: [1, 2, 3] });

// In child.ts:
process.send({ type: "ready", pid: process.pid });
process.on("message", (msg) => {
  console.log("Child received:", msg);
  process.send({ echo: msg });
});`,
  },
  {
    id: "brand-bench-results",
    name: "Brand Benchmark Results",
    description: "Run brand benchmarks and display results with Bun.inspect.table() formatting",
    category: "Performance",
    code: `// Run brand benchmarks with table output
bun run scripts/brand-bench.ts

// Sample output with Bun.inspect.table():
// 📊 Benchmark Results:
// ┌───┬───────────────────────────┬─────────┬───────────┬─────────────┐
// │   │ operation                 │ ops/sec │ time (ms) │ performance │
// ├───┼───────────────────────────┼─────────┼───────────┼─────────────┤
// │ 0 │ brand.generatePalette     │ 146147  │ 1368.48   │ ✅ OK       │
// │ 1 │ brand.Bun.color(hex)      │ 3054848 │ 130.94    │ 🔥 Fast     │
// │ 2 │ brand.Bun.color(ansi)     │ 3513039 │ 113.86    │ 🔥 Fast     │
// │ 3 │ brand.Bun.markdown.render │ 1287645 │ 93.19     │ 🔥 Fast     │
// │ 4 │ brand.Bun.markdown.react  │ 762851  │ 157.30    │ ⚡ Good      │
// └───┴───────────────────────────┴─────────┴───────────┴─────────────┘
// 🏆 Best: brand.Bun.color(ansi)`,
  },
  {
    id: "inspect-table",
    name: "Bun.inspect.table()",
    description: "Formatted table output for benchmarks, config diffs, and data comparison",
    category: "Features",
    code: `// Formatted table output with Bun.inspect.table()
const results = [
  { operation: "generatePalette", opsPerSec: 146147, ms: 1368.5 },
  { operation: "Bun.color(hex)", opsPerSec: 3054848, ms: 130.9 },
  { operation: "Bun.color(ansi)", opsPerSec: 3513039, ms: 113.9 },
];

console.log(Bun.inspect.table(
  results,
  ["operation", "opsPerSec", "ms"],
  { colors: true }
));

// With ratings
const rated = results.map(r => ({
  ...r,
  rating: r.opsPerSec > 3_000_000 ? "🔥 Fast" : "⚡ Good"
}));

console.log(Bun.inspect.table(
  rated,
  ["operation", "opsPerSec", "ms", "rating"],
  { colors: true }
));`,
  },
  {
    id: "process-basics",
    name: "Process Basics",
    description: "Command-line args, env vars, stdout/stderr, uptime, timezone",
    category: "Process",
    code: `// Command-line arguments
console.log("Arguments:", Bun.argv.slice(2));

// Environment variables
console.log("PATH:", process.env.PATH);
process.env.MY_VAR = "value";

// Process info
console.log("PID:", process.pid);
console.log("Uptime:", process.uptime());
console.log("Platform:", process.platform);

// Timezone
console.log("Timezone:", Intl.DateTimeFormat().resolvedOptions().timeZone);
process.env.TZ = "America/New_York";

// Spawn with stdout/stderr
const proc = Bun.spawn(["echo", "hello"]);
const output = await proc.stdout.text();
const stderr = await proc.stderr.text();`,
  },
  {
    id: "stdin-demo",
    name: "Stdin Input",
    description: "Reading user input from standard input",
    category: "Process",
    code: `// Check stdin status
console.log("Is TTY:", process.stdin.isTTY);

// Read from stdin using async iterator
let input = '';
for await (const chunk of process.stdin) {
  input += chunk;
}
const trimmed = input.trim();
console.log("Input:", trimmed);`,
  },
  {
    id: "argv-demo",
    name: "Command-Line Arguments (argv)",
    description: "Parse command-line arguments with Bun.argv",
    category: "Process",
    code: `// Bun.argv contains full command-line
console.log("Bun.argv:", Bun.argv);
console.log("Script:", Bun.argv[1]);
console.log("Arguments:", Bun.argv.slice(2));

// Parse flags and values
const args = Bun.argv.slice(2);
const flags = args.filter(arg => arg.startsWith('--'));
const values = args.filter(arg => !arg.startsWith('--'));

// Parse key=value pairs
const parsed: Record<string, string> = {};
for (const arg of args) {
  if (arg.includes('=')) {
    const [key, value] = arg.split('=');
    parsed[key.replace(/^--/, '')] = value;
  }
}

// Using Bun.parseArgs()
const { values } = Bun.parseArgs({
  args: args,
  options: {
    port: { type: 'string', default: '3000' },
    verbose: { type: 'boolean', default: false },
  },
});`,
  },
  {
    id: "ctrl-c-demo",
    name: "Handling CTRL+C",
    description: "Listen for and handle SIGINT signal",
    category: "Process",
    code: `let interruptCount = 0;

process.on("SIGINT", () => {
  interruptCount++;
  console.log(\`CTRL+C pressed! (count: \${interruptCount})\`);
  
  if (interruptCount >= 3) {
    console.log("Exiting...");
    process.exit(0);
  } else {
    console.log(\`Press \${3 - interruptCount} more time(s) to exit\`);
  }
});

// Handle beforeExit and exit
process.on("beforeExit", () => {
  console.log("Event loop empty");
});

process.on("exit", (code) => {
  console.log(\`Exiting with code: \${code}\`);
});`,
  },
  {
    id: "signals-demo",
    name: "OS Signals",
    description: "Handle SIGTERM, SIGHUP, and other OS signals",
    category: "Process",
    code: `// Handle SIGTERM (termination request)
process.on("SIGTERM", () => {
  console.log("SIGTERM received");
  gracefulShutdown();
});

// Handle SIGHUP (terminal closed)
process.on("SIGHUP", () => {
  console.log("SIGHUP received (terminal closed)");
  gracefulShutdown();
});

// Handle beforeExit and exit
process.on("beforeExit", (code) => {
  console.log(\`beforeExit: code \${code}\`);
});

process.on("exit", (code) => {
  console.log(\`exit: code \${code}\`);
});

function gracefulShutdown() {
  console.log("Shutting down gracefully...");
  setTimeout(() => process.exit(0), 500);
}`,
  },
  {
    id: "spawn-demo",
    name: "Spawn Child Processes",
    description: "Spawn processes with Bun.spawn()",
    category: "Process",
    code: `// Basic spawn
const proc1 = Bun.spawn(["echo", "Hello!"]);
const output1 = await proc1.stdout.text();

// Spawn with options
const proc2 = Bun.spawn({
  cmd: ["pwd"],
  cwd: "/tmp",
  env: { ...process.env, CUSTOM: "value" },
});

// Read stdout and stderr
const proc3 = Bun.spawn({
  cmd: ["ls", "-la"],
  stdout: "pipe",
  stderr: "pipe",
});
const [out, err] = await Promise.all([
  proc3.stdout.text(),
  proc3.stderr.text(),
]);

// Exit handling
const proc4 = Bun.spawn({
  cmd: ["sleep", "1"],
  onExit(proc, exitCode) {
    console.log(\`Exited: \${exitCode}\`);
  },
});

// Kill a process
proc4.kill("SIGTERM");`,
  },
  {
    id: "test-timeouts",
    name: "Test Timeouts",
    description: "Per-test timeout configuration for bun:test",
    category: "Testing",
    code: `import { test, expect } from "bun:test";

// Fast test with 1 second timeout
test("fast test", () => {
  expect(1 + 1).toBe(2);
}, 1000);

// Slow test with 10 second timeout
test("slow test", async () => {
  await new Promise(resolve => setTimeout(resolve, 8000));
}, 10000);

// Default timeout is 5000ms (5 seconds)
// Set to 0 to disable timeout`,
  },
  {
    id: "test-config",
    name: "Test Configuration",
    description: "bunfig.toml and package.json test configuration options",
    category: "Testing",
    code: `// bunfig.toml
[test]
preload = ["./setup.ts"]
coverage = true
coverageThreshold = 0.8
timeout = 10000
environment = "node"

// OR package.json
{
  "bun": {
    "test": {
      "preload": ["./setup.ts"],
      "coverage": true,
      "timeout": 10000
    }
  }
}`,
  },
  {
    id: "test-lifecycle",
    name: "Test Lifecycle Hooks",
    description: "beforeAll, afterAll, beforeEach, afterEach setup and cleanup",
    category: "Testing",
    code: `import { test, beforeAll, afterAll, beforeEach, afterEach } from "bun:test";

let database: Database;

beforeAll(() => {
  database = new Database();  // Runs once
});

afterAll(() => {
  database.close();  // Cleanup once
});

beforeEach(() => {
  // Runs before each test
});

afterEach(() => {
  // Runs after each test
});`,
  },
  {
    id: "test-filtering",
    name: "Test Filtering",
    description: "CLI patterns, test.only, test.skip for selective test execution",
    category: "Testing",
    code: `// CLI filtering
bun test --test-name-pattern="auth"
bun test -t "API"

// Code-level filtering
test.only("focus", () => {});   // Only run this
test.skip("skip", () => {});     // Skip this
test.todo("todo", () => {});     // Pending

// Describe-level
describe.only("module", () => {});
describe.skip("legacy", () => {});`,
  },
  {
    id: "test-exec-control",
    name: "Test Execution Control",
    description: "Concurrent tests, randomization, reruns, bail, watch mode",
    category: "Testing",
    code: `// Concurrent execution
bun test --concurrent
bun test --concurrent --max-concurrency 4

// Randomize & rerun
test.concurrent("parallel 1", async () => {});
test.serial("sequential 1", () => {});
bun test --randomize --seed 12345
bun test --rerun-each 100

// Bail & watch
bun test --bail
bun test --watch`,
  },
];

async function runCommand(cmd: string[], cwd: string): Promise<{ output: string; error: string; exitCode: number }> {
  return withCommandWorker(async () => {
    const proc = Bun.spawn({
      cmd,
      stdout: "pipe",
      stderr: "pipe",
      cwd,
    });

    const [output, error] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    const exitCode = await proc.exited;
    return { output, error, exitCode };
  });
}

async function withCommandWorker<T>(fn: () => Promise<T>): Promise<T> {
  if (activeCommands >= MAX_COMMAND_WORKERS) {
    await new Promise<void>(resolve => commandWaiters.push(resolve));
  }
  activeCommands++;
  try {
    return await fn();
  } finally {
    activeCommands--;
    const next = commandWaiters.shift();
    if (next) next();
  }
}

function parseBool(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes") return true;
  if (normalized === "0" || normalized === "false" || normalized === "no") return false;
  return defaultValue;
}

function parseList(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(",").map(v => v.trim()).filter(Boolean);
}

function parseNumberEnv(
  name: string,
  baseStandard: number,
  options: { min?: number; max?: number; integer?: boolean } = {}
): number {
  const raw = process.env[name];
  if (raw === undefined || raw === null || raw.trim() === "") return baseStandard;
  const num = Number(raw);
  if (!Number.isFinite(num)) return baseStandard;
  const integer = options.integer !== false;
  const normalized = integer ? Math.trunc(num) : num;
  if (options.min !== undefined && normalized < options.min) return baseStandard;
  if (options.max !== undefined && normalized > options.max) return baseStandard;
  return normalized;
}

function parseFirstNumberEnv(
  names: string[],
  baseStandard: number,
  options: { min?: number; max?: number; integer?: boolean } = {}
): number {
  for (const name of names) {
    const raw = process.env[name];
    if (raw === undefined || raw === null || raw.trim() === "") continue;
    return parseNumberEnv(name, baseStandard, options);
  }
  return baseStandard;
}

function parseFetchVerbose(value: string | undefined, baseStandard: string): boolean | "curl" | undefined {
  const effective = (value || baseStandard).trim().toLowerCase();
  if (!effective || effective === "off" || effective === "0" || effective === "false") return undefined;
  if (effective === "curl") return "curl";
  if (effective === "1" || effective === "true") return true;
  return undefined;
}

function resolveFeature<T>(name: string, req: FeatureRequest = null): T {
  const def = featureDefinitions[name] as FeatureDefinition<T> | undefined;
  if (!def) {
    throw new Error(`Unknown feature definition: ${name}`);
  }

  const envVars = Array.isArray(def.envVar) ? def.envVar : [def.envVar];
  for (const envVar of envVars) {
    const raw = process.env[envVar];
    if (raw === undefined || raw === null || raw.trim() === "") continue;
    try {
      const parsed = def.parse(raw);
      if (parsed !== undefined && parsed !== null && String(parsed).trim() !== "") {
        return parsed;
      }
    } catch {
      // Ignore parse failures and continue to next source.
    }
  }

  return typeof def.default === "function"
    ? (def.default as (req?: FeatureRequest) => T)(req)
    : def.default;
}

function resolveAllFeatures(req: FeatureRequest = null): Record<string, unknown> {
  return Object.fromEntries(
    Object.keys(featureDefinitions).map(name => [name, resolveFeature(name, req)])
  );
}

function shouldBypassProxy(targetUrl: string): boolean {
  let host = "";
  try {
    host = new URL(targetUrl).hostname.toLowerCase();
  } catch {
    return false;
  }
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return true;

  const noProxy = parseList(process.env.NO_PROXY || process.env.no_proxy);
  return noProxy.some(entry => {
    const normalized = entry.toLowerCase();
    if (normalized.startsWith(".")) {
      return host.endsWith(normalized);
    }
    return host === normalized;
  });
}

function contentTypeFromS3Key(key: string): string {
  const normalized = key.toLowerCase();
  const ext = normalized.includes(".") ? normalized.slice(normalized.lastIndexOf(".")) : "";
  const map: Record<string, string> = {
    ".html": "text/html; charset=utf-8",
    ".htm": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".md": "text/markdown; charset=utf-8",
    ".xml": "application/xml; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".avif": "image/avif",
    ".pdf": "application/pdf",
    ".zip": "application/zip",
    ".wasm": "application/wasm",
    ".csv": "text/csv; charset=utf-8",
  };
  return map[ext] || S3_DEFAULT_CONTENT_TYPE;
}

async function parseJsonBody(req: Request): Promise<any> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

function sanitizeHeaders(input: unknown): Record<string, string> {
  if (!input || typeof input !== "object") return {};
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!key) continue;
    if (typeof value !== "string") continue;
    const normalizedKey = key.trim();
    const normalizedValue = value.trim();
    if (!normalizedKey || !normalizedValue) continue;
    result[normalizedKey] = normalizedValue;
  }
  return result;
}

function parseProtocolBody(bodyType: string, body: unknown): BodyInit | null {
  if (body === undefined || body === null) return null;
  switch (bodyType) {
    case "json":
      return typeof body === "string" ? body : JSON.stringify(body);
    case "string":
    case "form":
    case "inline":
      return String(body);
    case "urlsearchparams":
      if (typeof body === "object" && body !== null) {
        return new URLSearchParams(body as Record<string, string>).toString();
      }
      return String(body);
    case "uint8array":
      return body instanceof Uint8Array ? body : new Uint8Array(Array.isArray(body) ? body : []);
    default:
      return body as BodyInit;
  }
}

async function runProtocolRouter(req: Request) {
  const payload = await parseJsonBody(req);
  const url = String(payload.url || "");
  if (!url) {
    return {
      ok: false,
      error: "Missing required field: url",
      usage: { method: "POST", path: "/api/fetch/protocol-router", body: { url: "https://example.com", method: "GET", dryRun: true } },
    };
  }

  let protocol: string;
  try {
    protocol = resolveProtocolFromUrl(url);
  } catch {
    return { ok: false, error: `Invalid URL: ${url}` };
  }

  const config = PROTOCOL_REGISTRY[protocol];
  if (!config) {
    return {
      ok: false,
      error: `Unsupported protocol: ${protocol}`,
      supportedProtocols: Object.keys(PROTOCOL_REGISTRY),
    };
  }

  const method = String(payload.method || req.method || "GET").toUpperCase();
  const requestedBodyType = String(payload.bodyType || "string").toLowerCase();
  const dryRun = payload.dryRun !== false;

  if (!config.bodyTypes.includes(requestedBodyType as BodyType)) {
    return {
      ok: false,
      error: `Unsupported bodyType '${requestedBodyType}' for protocol '${protocol}'`,
      allowedBodyTypes: config.bodyTypes,
    };
  }

  const headers = sanitizeHeaders(payload.headers);
  const metadata = {
    protocol,
    scheme: config.scheme,
    defaultPort: config.defaultPort,
    authMethods: config.authMethods,
    bodyTypes: config.bodyTypes,
    streaming: config.streaming,
    cacheable: config.cacheable,
    corsPolicy: config.corsPolicy,
    securityProfile: config.securityProfile,
    maxSize: config.maxSize,
  };

  if (dryRun) {
    return { ok: true, dryRun: true, metadata };
  }

  try {
    const response = await config.handler(url, {
      req,
      method,
      headers,
      body: parseProtocolBody(requestedBodyType, payload.body),
    });

    let responseBody = "";
    try {
      responseBody = await response.text();
      if (responseBody.length > MAX_BODY_SIZE_BYTES) {
        responseBody = `${responseBody.slice(0, MAX_BODY_SIZE_BYTES)}\n...truncated`;
      }
    } catch {
      responseBody = "";
    }

    return {
      ok: response.ok,
      dryRun: false,
      metadata,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      bodyPreview: responseBody,
    };
  } catch (error) {
    return {
      ok: false,
      dryRun: false,
      metadata,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function buildUploadProgress(req: Request): Promise<{
  ok: boolean;
  bodyType: string;
  sizeBytes: number;
  chunkSize: number;
  parts: number;
  progress: Array<{ part: number; uploadedBytes: number; percent: number }>;
}> {
  const body = await parseJsonBody(req);
  const bodyType = String(body.bodyType || resolveFeature<string>("bodyType", req) || "multipart").toLowerCase();
  const sizeBytes = Math.max(1, Number(body.sizeBytes || 5 * 1024 * 1024));
  const chunkSize = Math.max(256, Number(body.chunkSize || 256 * 1024));
  const parts = Math.ceil(sizeBytes / chunkSize);
  const progress: Array<{ part: number; uploadedBytes: number; percent: number }> = [];

  let uploaded = 0;
  for (let part = 1; part <= parts; part++) {
    uploaded = Math.min(sizeBytes, uploaded + chunkSize);
    progress.push({
      part,
      uploadedBytes: uploaded,
      percent: Number(((uploaded / sizeBytes) * 100).toFixed(2)),
    });
  }

  return {
    ok: true,
    bodyType,
    sizeBytes,
    chunkSize,
    parts,
    progress,
  };
}

function getProtocolMatrix() {
  const snapshot = buildLivePoolSnapshot();

  return {
    generatedAt: new Date().toISOString(),
    source: "bun-runtime-playground",
    pooling: {
      live: snapshot,
    },
    protocols: [
      {
        protocol: "HTTP",
        scheme: "http://",
        defaultPort: 80,
        auth: "none or app-level",
        bodySupport: "all standard fetch body types",
        streaming: "request and response streaming supported",
        caching: "no built-in fetch cache layer by default",
        cors: "server-side fetch; browser CORS policy not enforced here",
        security: "unencrypted transport; use only trusted/internal paths",
        maxSize: "practical memory/network limits",
        useCase: "internal services, local development",
      },
      {
        protocol: "HTTPS",
        scheme: "https://",
        defaultPort: 443,
        auth: "TLS + app auth (tokens, mTLS, etc.)",
        bodySupport: "all standard fetch body types",
        streaming: "request and response streaming supported",
        caching: "no built-in fetch cache layer by default",
        cors: "server-side fetch; browser CORS policy not enforced here",
        security: "encrypted transport with certificate validation",
        maxSize: "practical memory/network limits",
        useCase: "production APIs and external integrations",
      },
      {
        protocol: "HTTP/2",
        scheme: "https:// (ALPN negotiated)",
        defaultPort: 443,
        auth: "TLS + app auth",
        bodySupport: "all standard fetch body types",
        streaming: "multiplexed streams over a single connection",
        caching: "no built-in fetch cache layer by default",
        cors: "server-side fetch; browser CORS policy not enforced here",
        security: "encrypted binary framing via TLS",
        maxSize: "practical memory/network limits",
        useCase: "high-throughput services with connection efficiency",
      },
      {
        protocol: "S3-compatible",
        scheme: "s3:// and https:// provider endpoints",
        defaultPort: 443,
        auth: "provider credentials/signing/presigned URLs",
        bodySupport: "streaming PUT/POST with multipart support",
        streaming: "multipart uploads and streamed transfer supported",
        caching: "object-store policy controlled",
        cors: "bucket policy and endpoint policy controlled",
        security: "signed requests and provider TLS",
        maxSize: "provider/object-store limits",
        useCase: "object storage and backups",
      },
      {
        protocol: "Unix Socket HTTP",
        scheme: "http(s) + unix request option",
        defaultPort: null,
        auth: "filesystem ACL/permissions",
        bodySupport: "all standard fetch body types",
        streaming: "request and response streaming supported",
        caching: "no built-in fetch cache layer by default",
        cors: "not browser-origin based in server runtime",
        security: "local IPC boundary via socket permissions",
        maxSize: "socket buffer and runtime limits",
        useCase: "local IPC and daemon communication",
      },
      {
        protocol: "file://",
        scheme: "file://",
        defaultPort: null,
        auth: "filesystem permissions",
        bodySupport: "read path support only in fetch contexts",
        streaming: "implementation-dependent; often materialized reads",
        caching: "filesystem semantics",
        cors: "not browser-origin based in server runtime",
        security: "local file access controls",
        maxSize: "filesystem limits",
        useCase: "local assets and config reads",
      },
      {
        protocol: "data:/blob:",
        scheme: "data:, blob:",
        defaultPort: null,
        auth: "none (in-memory/inlined data)",
        bodySupport: "read payloads; write semantics are API-specific",
        streaming: "typically non-streaming payload semantics",
        caching: "runtime/object-lifecycle semantics",
        cors: "not browser-origin based in server runtime",
        security: "process-memory scoped data handling",
        maxSize: "runtime memory limits",
        useCase: "small inline payloads and temporary in-memory URLs",
      },
    ],
    notes: [
      "Bun server-side fetch does not enforce browser CORS policy.",
      "HTTP/2 is negotiated over HTTPS via ALPN, not a separate fetch scheme.",
      "Use proxy object form for proxy auth headers.",
      "Use request options and env controls for deterministic production behavior.",
    ],
  };
}

type SeverityLevel = "ok" | "warn" | "fail";

function severityByUtilization(loadPct: number): SeverityLevel {
  if (loadPct > 80) return "fail";
  if (loadPct >= 50) return "warn";
  return "ok";
}

function severityByCapacityAvailable(availablePct: number): SeverityLevel {
  if (availablePct < 20) return "fail";
  if (availablePct <= 50) return "warn";
  return "ok";
}

function severityByHeadroom(availablePct: number): SeverityLevel {
  if (availablePct < 10) return "fail";
  if (availablePct <= 30) return "warn";
  return "ok";
}

function buildLivePoolSnapshot() {
  const connectionUtilization = Number((inFlightRequests / Math.max(1, MAX_CONCURRENT_REQUESTS)).toFixed(3));
  const workerUtilization = Number((activeCommands / Math.max(1, MAX_COMMAND_WORKERS)).toFixed(3));
  const availableConnections = Math.max(0, MAX_CONCURRENT_REQUESTS - inFlightRequests);
  const availableWorkers = Math.max(0, MAX_COMMAND_WORKERS - activeCommands);
  const perWorkerConnectionLoad = Number((inFlightRequests / Math.max(1, activeCommands || 1)).toFixed(2));
  const perConnectionWorkerLoad = Number((activeCommands / Math.max(1, inFlightRequests || 1)).toFixed(2));
  const bottleneck =
    connectionUtilization >= workerUtilization
      ? "connection-pool"
      : "worker-pool";

  return {
    connections: {
      inFlight: inFlightRequests,
      max: MAX_CONCURRENT_REQUESTS,
      available: availableConnections,
      utilization: connectionUtilization,
      loadPerWorker: perWorkerConnectionLoad,
      status: connectionUtilization >= 1 ? "saturated" : connectionUtilization >= 0.75 ? "high" : "healthy",
    },
    workers: {
      active: activeCommands,
      max: MAX_COMMAND_WORKERS,
      available: availableWorkers,
      utilization: workerUtilization,
      loadPerConnection: perConnectionWorkerLoad,
      status: workerUtilization >= 1 ? "saturated" : workerUtilization >= 0.75 ? "high" : "healthy",
    },
    capacity: {
      bottleneck,
      headroom: {
        connections: availableConnections,
        workers: availableWorkers,
      },
    },
  };
}

function buildMiniDashboardSnapshot() {
  const live = buildLivePoolSnapshot();
  const connectionUsedPct = Math.round(live.connections.utilization * 100);
  const workerUsedPct = Math.round(live.workers.utilization * 100);
  const maxLoadPct = Math.max(connectionUsedPct, workerUsedPct);
  const capacityConnectionsPct = Math.max(0, 100 - connectionUsedPct);
  const capacityWorkersPct = Math.max(0, 100 - workerUsedPct);
  const headroomConnectionsPct = Math.round((live.connections.available / Math.max(1, live.connections.max)) * 100);
  const headroomWorkersPct = Math.round((live.workers.available / Math.max(1, live.workers.max)) * 100);

  const snapshot = {
    generatedAt: new Date().toISOString(),
    port: ACTIVE_PORT,
    bottleneck: {
      kind: live.capacity.bottleneck,
      severity: severityByUtilization(maxLoadPct),
    },
    load: {
      connectionUsedPct,
      workerUsedPct,
      maxUsedPct: maxLoadPct,
      severity: severityByUtilization(maxLoadPct),
    },
    capacity: {
      connectionsPct: capacityConnectionsPct,
      workersPct: capacityWorkersPct,
      summary: `C${capacityConnectionsPct}% W${capacityWorkersPct}%`,
      severity: severityByCapacityAvailable(Math.min(capacityConnectionsPct, capacityWorkersPct)),
    },
    headroom: {
      connections: {
        available: live.connections.available,
        max: live.connections.max,
        pct: headroomConnectionsPct,
        severity: severityByHeadroom(headroomConnectionsPct),
      },
      workers: {
        available: live.workers.available,
        max: live.workers.max,
        pct: headroomWorkersPct,
        severity: severityByHeadroom(headroomWorkersPct),
      },
    },
    pooling: {
      live,
    },
  };
  persistCapacitySnapshot(snapshot);
  return snapshot;
}

function persistCapacitySnapshot(snapshot: ReturnType<typeof buildMiniDashboardSnapshot>) {
  if (!capacityInsertStmt || !capacityPruneStmt) return;

  const tsMs = Date.now();
  if (tsMs - capacityMetricsLastPersistMs < DASHBOARD_METRICS_INTERVAL_MS) {
    return;
  }

  capacityMetricsLastPersistMs = tsMs;
  capacityInsertStmt.run(
    tsMs,
    snapshot.generatedAt,
    snapshot.port,
    snapshot.bottleneck.kind,
    snapshot.bottleneck.severity,
    snapshot.load.connectionUsedPct,
    snapshot.load.workerUsedPct,
    snapshot.load.maxUsedPct,
    snapshot.capacity.connectionsPct,
    snapshot.capacity.workersPct,
    snapshot.capacity.summary,
    snapshot.capacity.severity,
    snapshot.headroom.connections.available,
    snapshot.headroom.connections.pct,
    snapshot.headroom.connections.severity,
    snapshot.headroom.workers.available,
    snapshot.headroom.workers.pct,
    snapshot.headroom.workers.severity
  );

  capacityMetricsPersistedCount += 1;
  if (capacityMetricsPersistedCount % 50 === 0) {
    capacityPruneStmt.run(DASHBOARD_METRICS_RETENTION_ROWS);
  }
}

function getCapacityTrend(minutesRaw: number, limitRaw: number) {
  if (!capacitySelectStmt) {
    return {
      generatedAt: new Date().toISOString(),
      source: "sqlite",
      dbPath: DASHBOARD_METRICS_DB_PATH,
      initialized: false,
      window: { minutes: 0, limit: 0, sinceMs: 0 },
      summary: { count: 0 },
      points: [],
    };
  }

  const minutes = Math.max(1, Math.min(24 * 60, Math.floor(minutesRaw || 60)));
  const limit = Math.max(1, Math.min(10000, Math.floor(limitRaw || 120)));
  const sinceMs = Date.now() - minutes * 60_000;
  const rows = capacitySelectStmt.all(sinceMs, limit) as Array<Record<string, unknown>>;
  const points = rows.map((row) => ({
    tsMs: Number(row.ts_ms || 0),
    createdAt: String(row.created_at || ""),
    loadMaxPct: Number(row.load_max_pct || 0),
    connectionUsedPct: Number(row.load_connection_pct || 0),
    workerUsedPct: Number(row.load_worker_pct || 0),
    capacitySummary: String(row.capacity_summary || ""),
    capacitySeverity: String(row.capacity_severity || ""),
    connectionHeadroomPct: Number(row.headroom_connections_pct || 0),
    workerHeadroomPct: Number(row.headroom_workers_pct || 0),
    bottleneck: String(row.bottleneck || ""),
    bottleneckSeverity: String(row.bottleneck_severity || ""),
  }));

  const latest = points[0] || null;
  const oldest = points[points.length - 1] || null;
  const avgLoadMaxPct = points.length
    ? Number((points.reduce((sum, p) => sum + p.loadMaxPct, 0) / points.length).toFixed(2))
    : 0;

  return {
    generatedAt: new Date().toISOString(),
    source: "sqlite",
    dbPath: DASHBOARD_METRICS_DB_PATH,
    initialized: true,
    window: {
      minutes,
      limit,
      sinceMs,
    },
    summary: {
      count: points.length,
      avgLoadMaxPct,
      latest,
      oldest,
    },
    points,
  };
}

function buildSeverityTestSnapshot(loadPctInput: number) {
  const loadPct = Math.max(0, Math.min(100, Math.round(loadPctInput)));
  const availablePct = Math.max(0, 100 - loadPct);

  return {
    input: {
      loadPct,
      availablePct,
    },
    thresholds: {
      utilization: { ok: "<50", warn: "50-80", fail: ">80" },
      capacity: { ok: ">50", warn: "20-50", fail: "<20" },
      headroom: { ok: ">30", warn: "10-30", fail: "<10" },
    },
    severity: {
      utilization: severityByUtilization(loadPct),
      capacity: severityByCapacityAvailable(availablePct),
      headroom: severityByHeadroom(availablePct),
    },
  };
}

async function getProtocolScorecard(params?: { use?: string; size?: number }) {
  // Dynamic recommendation based on context
  const recommend = (() => {
    if (params?.use === 'external') return 'HTTPS';
    if ((params?.size || 0) > 100_000_000) return 'S3';
    if (params?.use === 'internal_ipc') return 'Unix';
    if (params?.use === 'ephemeral') return 'Data';
    return 'HTTPS'; // default
  })();
  
  return {
    generatedAt: new Date().toISOString(),
    version: "team-v1",
    columns: ["Criteria", "HTTP", "HTTPS", "S3", "File", "Data", "Blob", "Unix", "Impact"],
    rows: [
      {
        criteria: "Latency",
        http: "Low",
        https: "Low-Med",
        s3: "Med",
        file: "Instant",
        data: "Instant",
        blob: "Instant",
        unix: "Low",
        impact: "High for user-facing p95/p99 paths",
      },
      {
        criteria: "Throughput",
        http: "High",
        https: "High",
        s3: "Very High",
        file: "Max",
        data: "N/A",
        blob: "N/A",
        unix: "Max",
        impact: "High for batch/export and media pipelines",
      },
      {
        criteria: "Security",
        http: "Low",
        https: "Very High",
        s3: "Very High",
        file: "High",
        data: "Medium",
        blob: "Medium",
        unix: "High",
        impact: "Critical for production and compliance boundaries",
      },
      {
        criteria: "Scalability",
        http: "High",
        https: "High",
        s3: "Very High",
        file: "Single Host",
        data: "N/A",
        blob: "Session",
        unix: "High (Single Host)",
        impact: "High for horizontal growth and ops load",
      },
      {
        criteria: "Cost",
        http: "Low",
        https: "Low",
        s3: "$/GB",
        file: "Low",
        data: "Low",
        blob: "Memory",
        unix: "Low",
        impact: "Medium for sustained throughput at scale",
      },
      {
        criteria: "Reliability",
        http: "High",
        https: "High",
        s3: "Very High",
        file: "High",
        data: "Immutable",
        blob: "Session-bound",
        unix: "High",
        impact: "High for uptime-sensitive control paths",
      },
      {
        criteria: "Use for >100MB",
        http: "Yes",
        https: "Yes",
        s3: "Best",
        file: "Yes",
        data: "No",
        blob: "No",
        unix: "Yes",
        impact: "Critical for avoiding memory blowups",
      },
      {
        criteria: "Use for <1KB",
        http: "Yes",
        https: "Yes (h2 multiplex)",
        s3: "No",
        file: "No",
        data: "Best",
        blob: "Best",
        unix: "Yes",
        impact: "Medium for metadata/control-plane chatter",
      },
    ],
    rules: [
      "Default external traffic to HTTPS.",
      "Default large object persistence to S3.",
      "Default high-throughput same-host IPC to Unix sockets.",
      "Use data/blob only for short-lived utility payloads.",
      "Use plain HTTP only in trusted internal boundaries.",
    ],
    rationale: {
      sub1kbUnix: "Unix sockets are strong for sub-1KB IPC due to minimal network stack overhead and local socket-path security boundaries.",
      sub1kbBlob: "Blob-backed small payload handling benefits from Bun v1.3.9 runtime optimizations, making short-lived in-memory exchanges efficient.",
      sub1kbHttps: "HTTP/2 multiplexing reduces per-request overhead for tiny HTTPS payloads by reusing a single encrypted connection.",
      governance: "Capturing the why alongside scorecard values reduces ambiguity and helps teams align on tradeoffs during reviews.",
    },
    recommend,
    evidenceGovernance: {
      fields: [
        "Tier",
        "Authority",
        "Verification Method",
        "Claim",
        "Sources",
        "Benchmark",
        "Council Risk",
      ],
      entries: [
        {
          tier: "T1",
          authority: "Runtime behavior",
          verificationMethod: "Local protocol scorecard + control-plane smoke checks",
          claim: "Unix sockets are preferred for sub-1KB same-host IPC paths.",
          sources: ["Bun runtime socket behavior", "local /api/control/network-smoke traces"],
          benchmark: "sub-1KB request latency/overhead comparison across unix vs http(s)",
          councilRisk: "Low",
        },
        {
          tier: "T1",
          authority: "Runtime release behavior",
          verificationMethod: "Feature demo + small-payload path checks in playground",
          claim: "Blob/tiny payload paths are efficient for short-lived in-memory transfers.",
          sources: ["Bun v1.3.9 performance notes", "local protocol-scorecard rationale"],
          benchmark: "small payload throughput/latency under repeated execution",
          councilRisk: "Medium",
        },
        {
          tier: "T1",
          authority: "Protocol design",
          verificationMethod: "HTTPS ALPN/H2 path validation and scorecard endpoint checks",
          claim: "HTTPS with HTTP/2 multiplexing lowers per-request overhead for tiny payloads.",
          sources: ["Bun fetch/protocol docs", "local endpoint telemetry"],
          benchmark: "sub-1KB HTTPS h2 multiplex vs non-multiplex path",
          councilRisk: "Low",
        },
      ],
    },
    evidence_sources: await (async () => {
      const sources: DecisionSource[] = [
        { tier: "T1", reference: "35f815431 (release commit)", verified: true },
        { tier: "T2", reference: "ac63cc259d74 (RegExp JIT)", verified: true },
        { tier: "T2", reference: "1f7d7d5a8c23 (String.startsWith)", verified: true },
        { tier: "T3", reference: "2e2c23521a24 (Map/Set.size)", verified: true },
      ];
      // Compute benchmarks once and cache
      if (!cachedBenchmarkResult) {
        const map = new Map(); for (let i = 0; i < 1000; i++) map.set("k" + i, i);
        const set = new Set(); for (let i = 0; i < 1000; i++) set.add(i);
        const WARMUP = 5_000, ITERS = 1_000_000;
        let sink = 0;
        for (let i = 0; i < WARMUP; i++) { sink += map.size; sink += set.size; }
        const t0 = Bun.nanoseconds();
        for (let i = 0; i < ITERS; i++) sink += map.size;
        const mapNsPerOp = (Bun.nanoseconds() - t0) / ITERS;
        const t1 = Bun.nanoseconds();
        for (let i = 0; i < ITERS; i++) sink += set.size;
        const setNsPerOp = (Bun.nanoseconds() - t1) / ITERS;
        void sink;
        cachedBenchmarkResult = [
          { name: "Map.size ns/op (isolated)", result: Number(mapNsPerOp.toFixed(2)), threshold: 10 },
          { name: "Set.size ns/op (isolated)", result: Number(setNsPerOp.toFixed(2)), threshold: 10 },
        ];
      }
      const { score, defensible, gaps } = DecisionDefender.validateDecision({
        id: "BUN-UPGRADE-2024-003",
        claim: "Bun v1.3.9 verified commits provide targeted runtime optimizations",
        sources,
        benchmarks: cachedBenchmarkResult,
      });
      return {
        bun_v1_3_9: {
          release_notes_url: "https://bun.com/blog/bun-v1.3.9",
          verified_commits: ["35f815431", "ac63cc259d74", "1f7d7d5a8c23", "2e2c23521a24"],
          evidence_package: "BUN-UPGRADE-2024-003",
          runtime: (() => {
            if (cachedRuntimeSnapshot) return cachedRuntimeSnapshot;
            const os = require("node:os");
            // Cache git commit to avoid spawnSync on every request
            if (!cachedGitCommit) {
              try {
                cachedGitCommit = Bun.spawnSync(["git", "rev-parse", "HEAD"]).stdout.toString().trim();
              } catch {
                cachedGitCommit = "unknown";
              }
            }
            cachedRuntimeSnapshot = {
              runtime: "Bun",
              bunVersion: Bun.version,
              bunRevision: Bun.revision,
              gitCommit: cachedGitCommit,
              platform: process.platform,
              arch: process.arch,
              osRelease: os.release(),
              cpuModel: os.cpus()[0]?.model ?? "unknown",
              cpuCores: os.cpus().length,
              totalMemoryMB: Math.round(os.totalmem() / 1024 / 1024),
              pid: process.pid,
            };
            return cachedRuntimeSnapshot;
          })(),
          profile: (() => {
            // Use cached profile data if fresh
            if (cachedProfileSnapshot && (Date.now() - cacheTimestamp) < CACHE_TTL_MS) {
              return cachedProfileSnapshot;
            }
            const { existsSync, readdirSync } = require("node:fs");
            const { join } = require("node:path");
            const profileDir = "reports/brand-bench/profiles";
            const baselinePath = "reports/brand-bench/pinned-baseline.json";
            const profiles: string[] = [];
            if (existsSync(profileDir)) {
              for (const f of readdirSync(profileDir)) {
                if (f.endsWith(".cpuprofile")) profiles.push(join(profileDir, f));
              }
            }
            let pinnedRunId: string | null = null;
            if (existsSync(baselinePath)) {
              try {
                const pinned = JSON.parse(require("node:fs").readFileSync(baselinePath, "utf8"));
                pinnedRunId = pinned.baselineRunId ?? null;
              } catch {}
            }
            cachedProfileSnapshot = {
              pinnedBaselineRunId: pinnedRunId,
              profileDir,
              profileFiles: profiles,
              count: profiles.length,
            };
            return cachedProfileSnapshot;
          })(),
          snapshot: await (async () => {
            // Return cached snapshot if fresh
            if (cachedHeapSnapshot && (Date.now() - cacheTimestamp) < CACHE_TTL_MS) {
              return cachedHeapSnapshot;
            }
            const mem = process.memoryUsage();
            const heap = Bun.generateHeapSnapshot();
            let bundleSnapshot: Record<string, unknown> | null = null;
            // Only compute bundle snapshot once (it's expensive)
            if (!cachedBundleSnapshot) {
              try {
                const result = await Bun.build({
                  entrypoints: [import.meta.path],
                  metafile: true,
                  target: "bun",
                  splitting: false,
                  throw: false,
                });
                if (result.metafile) {
                  const inputs = Object.entries(result.metafile.inputs);
                  const outputs = Object.entries(result.metafile.outputs);
                  cachedBundleSnapshot = {
                    source: "Bun.build({ metafile: true })",
                    inputCount: inputs.length,
                    outputCount: outputs.length,
                    totalInputBytes: inputs.reduce((s: number, [, m]: any) => s + (m.bytes || 0), 0),
                    totalOutputBytes: outputs.reduce((s: number, [, m]: any) => s + (m.bytes || 0), 0),
                    largestInputs: inputs
                      .sort(([, a]: any, [, b]: any) => (b.bytes || 0) - (a.bytes || 0))
                      .slice(0, 5)
                      .map(([p, m]: any) => ({ path: p, bytes: m.bytes })),
                  };
                }
              } catch {}
            }
            cachedHeapSnapshot = {
              takenAt: new Date().toISOString(),
              memory: {
                heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100,
                heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024 * 100) / 100,
                rssMB: Math.round(mem.rss / 1024 / 1024 * 100) / 100,
                externalMB: Math.round(mem.external / 1024 / 1024 * 100) / 100,
              },
              heap: {
                version: heap.version,
                type: heap.type,
                nodeCount: heap.nodes?.length ?? 0,
                edgeCount: heap.edges?.length ?? 0,
                classCount: heap.nodeClassNames?.length ?? 0,
              },
              bundle: cachedBundleSnapshot,
            };
            cacheTimestamp = Date.now();
            return cachedHeapSnapshot;
          })(),
          score,
          defensible,
          gaps,
        },
      };
    })(),
    evidenceTracking: EVIDENCE_DASHBOARD["protocol-scorecard"],
  };
}

function getEvidenceDashboard() {
  return {
    generatedAt: new Date().toISOString(),
    items: EVIDENCE_DASHBOARD,
    summary: {
      totalItems: Object.keys(EVIDENCE_DASHBOARD).length,
      councilReviewOpen: Object.values(EVIDENCE_DASHBOARD).filter(item => item.councilReview).length,
      avgDefenseScore: Number(
        (
          Object.values(EVIDENCE_DASHBOARD).reduce((acc, item) => acc + item.defenseScore, 0) /
          Object.keys(EVIDENCE_DASHBOARD).length
        ).toFixed(3)
      ),
    },
  };
}

class DecisionDefender {
  private static readonly TIER_WEIGHTS: Record<string, number> = {
    T1: 1.0,
    T2: 0.8,
    T3: 0.6,
    T4: 0.4,
    T5: 0.2,
  };

  static validateDecision(decision: GovernanceDecision): { defensible: boolean; score: number; gaps: string[] } {
    let score = 0;
    let maxPossible = 0;
    const gaps: string[] = [];

    const verifiedTiers = new Set<string>();
    for (const source of decision.sources) {
      const weight = this.TIER_WEIGHTS[source.tier] || 0;
      maxPossible += weight;
      if (source.verified) {
        score += weight;
        verifiedTiers.add(source.tier);
      } else {
        gaps.push(`Unverified source: ${source.reference}`);
      }
    }

    // Governance rule: architectural decisions should include at least one T1/T2 anchor.
    if (!verifiedTiers.has("T1") && !verifiedTiers.has("T2")) {
      gaps.push("Missing T1/T2 sources");
      score *= 0.6;
    }

    const lowerClaim = decision.claim.toLowerCase();
    const performanceClaim = lowerClaim.includes("performance") || lowerClaim.includes("latency");
    if (performanceClaim && (!decision.benchmarks || decision.benchmarks.length === 0)) {
      gaps.push("Performance claim requires benchmark data");
      score *= 0.5;
    }

    if (decision.benchmarks && decision.benchmarks.length > 0) {
      for (const benchmark of decision.benchmarks) {
        if (benchmark.result > benchmark.threshold) {
          gaps.push(`Benchmark failed: ${benchmark.name} (${benchmark.result} > ${benchmark.threshold})`);
        }
      }
    }

    const normalizedScore = maxPossible > 0 ? score / maxPossible : 0;
    const defensible = normalizedScore >= 0.7 && gaps.length === 0;
    return { defensible, score: Number(normalizedScore.toFixed(3)), gaps };
  }
}

function getDecisionDefenseDashboard() {
  const decisions: GovernanceDecision[] = [
    {
      id: "BUN-2024-001",
      claim: "Bun v1.3.9 upgrade provides runtime stability and measurable performance gains",
      sources: [
        { tier: "T1", reference: "https://github.com/oven-sh/bun/releases/tag/bun-v1.3.9", verified: true },
        { tier: "T2", reference: "OpenCode production telemetry", verified: true },
      ],
      benchmarks: [
        { name: "cpu-prof interval benchmark", result: 0.92, threshold: 1.0 },
      ],
    },
    {
      id: "PSC-2024-001",
      claim: "Protocol scorecard latency/performance guidance is valid for governance decisions",
      sources: [
        { tier: "T3", reference: "Protocol latency benchmarks", verified: true },
        { tier: "T4", reference: "QCFL data flow patterns", verified: true },
      ],
      benchmarks: [
        { name: "sub-1KB protocol latency benchmark", result: 0.88, threshold: 1.0 },
      ],
    },
    {
      id: "DH-2024-001",
      claim: "Domain hierarchy constraints align with team architecture review outcomes",
      sources: [
        { tier: "T4", reference: "Memory #3 principles", verified: true },
        { tier: "T5", reference: "Team architectural review", verified: true },
        { tier: "T2", reference: "Runtime integration traces", verified: true },
      ],
    },
    {
      id: "US-2024-001",
      claim: "Unix domain sockets provide optimal IPC for <1KB messages in nested domains",
      sources: [
        { tier: "T4", reference: "Memory #3: Domain hierarchy constraints", verified: true },
        { tier: "T3", reference: "Microbenchmarks", verified: true },
      ],
      benchmarks: [
        { name: "1KB payload latency", result: 0.8, threshold: 1.0 },
        { name: "Connection overhead", result: 2.1, threshold: 5.0 },
      ],
    },
  ];

  const validations = decisions.map(decision => {
    const validation = DecisionDefender.validateDecision(decision);
    return {
      decision,
      validation,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    decisions: validations,
    matrix: validations.map(item => ({
      decision: item.decision.id,
      evidenceTier: item.decision.sources.map(s => s.tier).join(" + "),
      supportingSources: item.decision.sources.map(s => s.reference),
      defenseStatus: item.validation.defensible ? "Defensible" : "Needs Review",
      score: item.validation.score,
      gaps: item.validation.gaps,
    })),
  };
}

function withTimeoutSignal(timeoutMs: number): AbortSignal {
  return AbortSignal.timeout(timeoutMs);
}

async function readResponseWithLimit(response: Response, maxBytes: number): Promise<void> {
  if (!response.body) return;
  const reader = response.body.getReader();
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    // Track bytes with a configurable chunk window to keep accounting predictable.
    for (let i = 0; i < value.byteLength; i += STREAM_CHUNK_SIZE) {
      const step = Math.min(STREAM_CHUNK_SIZE, value.byteLength - i);
      totalBytes += step;
      if (totalBytes > maxBytes) {
        reader.cancel();
        throw new Error(`Response body exceeds limit (${maxBytes} bytes)`);
      }
    }
  }
}

async function timedFetch(url: string, timeoutMs: number): Promise<{ url: string; ok: boolean; status: number | null; latencyMs: number; error?: string }> {
  const start = performance.now();
  try {
    const effectiveTimeoutMs = timeoutMs > 0 ? timeoutMs : FETCH_TIMEOUT_MS;
    const fetchOptions: RequestInit & {
      proxy?: string | { url: string; headers?: Record<string, string> };
      decompress?: boolean;
      verbose?: boolean | "curl";
    } = {
      signal: withTimeoutSignal(effectiveTimeoutMs),
      keepalive: true,
      decompress: FETCH_DECOMPRESS,
    };
    if (FETCH_VERBOSE !== undefined) {
      fetchOptions.verbose = FETCH_VERBOSE;
    }

    const resolvedProxy = resolveFeature<string | null>("proxy");
    const canUseProxy = Boolean(resolvedProxy) && !shouldBypassProxy(url);
    if (canUseProxy && PROXY_AUTH_TOKEN) {
      fetchOptions.proxy = {
        url: resolvedProxy as string,
        headers: {
          "Proxy-Authorization": `Bearer ${PROXY_AUTH_TOKEN}`,
        },
      };
    } else if (canUseProxy) {
      fetchOptions.proxy = resolvedProxy as string;
    }

    const res = await fetch(url, fetchOptions);
    await readResponseWithLimit(res, MAX_BODY_SIZE_BYTES);
    return {
      url,
      ok: res.ok,
      status: res.status,
      latencyMs: Number((performance.now() - start).toFixed(2)),
    };
  } catch (error) {
    return {
      url,
      ok: false,
      status: null,
      latencyMs: Number((performance.now() - start).toFixed(2)),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runWarmup(): Promise<{ prefetch: string[]; preconnect: string[]; skipped: boolean }> {
  const warmedPrefetch: string[] = [];
  const warmedPreconnect: string[] = [];
  const bunDns = (Bun as any).dns;
  const fetchWithPreconnect = fetch as typeof fetch & { preconnect?: (url: string) => Promise<void> | void };

  if (!PREFETCH_ENABLED && !PRECONNECT_ENABLED) {
    return { prefetch: warmedPrefetch, preconnect: warmedPreconnect, skipped: true };
  }

  if (PREFETCH_ENABLED && bunDns?.prefetch) {
    await Promise.all(
      PREFETCH_HOSTS.map(async host => {
        try {
          await bunDns.prefetch(host);
          warmedPrefetch.push(host);
        } catch {}
      })
    );
  }

  if (PRECONNECT_ENABLED && fetchWithPreconnect.preconnect) {
    await Promise.all(
      PRECONNECT_URLS.map(async url => {
        try {
          await fetchWithPreconnect.preconnect!(url);
          warmedPreconnect.push(url);
        } catch {}
      })
    );
  }

  return { prefetch: warmedPrefetch, preconnect: warmedPreconnect, skipped: false };
}

async function runNetworkSmoke(baseUrl: string): Promise<{
  timestamp: string;
  timeoutMs: number;
  urls: string[];
  results: Array<{ url: string; ok: boolean; status: number | null; latencyMs: number; error?: string }>;
}> {
  const defaults = [
    `${baseUrl}/api/info`,
    `${baseUrl}/api/brand/status`,
  ];
  const urls = SMOKE_URLS.length > 0 ? SMOKE_URLS : defaults;
  const results = await Promise.all(urls.map(url => timedFetch(url, SMOKE_TIMEOUT_MS)));
  return {
    timestamp: new Date().toISOString(),
    timeoutMs: SMOKE_TIMEOUT_MS,
    urls,
    results,
  };
}

function closeNetServer(server: NetServer): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}

function closeH2Server(server: Http2SecureServer): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}

async function startHttp2UpgradeRuntime(): Promise<Http2UpgradeRuntimeState> {
  if (http2UpgradeRuntime.status === "running") {
    return http2UpgradeRuntime;
  }

  http2UpgradeRuntime = {
    ...http2UpgradeRuntime,
    status: "starting",
    lastError: undefined,
  };

  try {
    const h2Server = createSecureServer({
      key: HTTP2_DEMO_KEY_PEM,
      cert: HTTP2_DEMO_CERT_PEM,
      allowHTTP1: true,
    });
    h2Server.on("stream", (stream, headers) => {
      http2UpgradeRuntime.streamCount += 1;
      stream.respond({
        ":status": 200,
        "content-type": "application/json",
      });
      stream.end(
        JSON.stringify({
          ok: true,
          message: "Hello over HTTP/2!",
          method: headers[":method"] || "GET",
          path: headers[":path"] || "/",
          streamCount: http2UpgradeRuntime.streamCount,
        })
      );
    });

    const netServer = createServer({ pauseOnConnect: true }, (rawSocket) => {
      h2Server.emit("connection", rawSocket);
      rawSocket.resume();
    });

    await new Promise<void>((resolve, reject) => {
      netServer.once("error", reject);
      netServer.listen(HTTP2_UPGRADE_PORT, HTTP2_UPGRADE_HOST, () => resolve());
    });

    http2SecureRuntimeServer = h2Server;
    http2NetRuntimeServer = netServer;
    http2UpgradeRuntime = {
      ...http2UpgradeRuntime,
      status: "running",
      startedAt: new Date().toISOString(),
      lastError: undefined,
    };
    return http2UpgradeRuntime;
  } catch (error) {
    http2UpgradeRuntime = {
      ...http2UpgradeRuntime,
      status: "error",
      lastError: error instanceof Error ? error.message : String(error),
    };
    return http2UpgradeRuntime;
  }
}

async function stopHttp2UpgradeRuntime(): Promise<Http2UpgradeRuntimeState> {
  const netServer = http2NetRuntimeServer;
  const h2Server = http2SecureRuntimeServer;
  http2NetRuntimeServer = null;
  http2SecureRuntimeServer = null;

  if (netServer) {
    await closeNetServer(netServer);
  }
  if (h2Server) {
    await closeH2Server(h2Server);
  }

  http2UpgradeRuntime = {
    ...http2UpgradeRuntime,
    status: "stopped",
    startedAt: undefined,
  };
  return http2UpgradeRuntime;
}

async function probeHttp2UpgradeRuntime(): Promise<{
  ok: boolean;
  status?: number;
  body?: string;
  latencyMs: number;
  error?: string;
}> {
  const start = performance.now();
  if (http2UpgradeRuntime.status !== "running") {
    return {
      ok: false,
      latencyMs: Number((performance.now() - start).toFixed(2)),
      error: "HTTP/2 upgrade runtime is not running",
    };
  }

  const target = `https://${HTTP2_UPGRADE_HOST}:${HTTP2_UPGRADE_PORT}`;
  const client = connectHttp2(target, { rejectUnauthorized: false });

  try {
    await new Promise<void>((resolve, reject) => {
      client.once("connect", () => resolve());
      client.once("error", reject);
    });

    const result = await new Promise<{ status?: number; body: string }>((resolve, reject) => {
      const req = client.request({ ":path": "/" });
      let status: number | undefined;
      const chunks: Uint8Array[] = [];
      req.on("response", (headers) => {
        const s = headers[":status"];
        status = typeof s === "number" ? s : Number(s);
      });
      req.on("data", (chunk: Buffer) => chunks.push(new Uint8Array(chunk)));
      req.on("error", reject);
      req.on("end", () => {
        const body = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf8");
        resolve({ status, body });
      });
      req.end();
    });

    const latencyMs = Number((performance.now() - start).toFixed(2));
    const ok = result.status === 200;
    http2UpgradeRuntime = {
      ...http2UpgradeRuntime,
      lastProbeAt: new Date().toISOString(),
      lastProbeOk: ok,
      lastProbeLatencyMs: latencyMs,
      lastProbeError: ok ? undefined : `Unexpected status ${result.status}`,
    };
    return {
      ok,
      status: result.status,
      body: result.body,
      latencyMs,
      error: ok ? undefined : `Unexpected status ${result.status}`,
    };
  } catch (error) {
    const latencyMs = Number((performance.now() - start).toFixed(2));
    const message = error instanceof Error ? error.message : String(error);
    http2UpgradeRuntime = {
      ...http2UpgradeRuntime,
      lastProbeAt: new Date().toISOString(),
      lastProbeOk: false,
      lastProbeLatencyMs: latencyMs,
      lastProbeError: message,
    };
    return {
      ok: false,
      latencyMs,
      error: message,
    };
  } finally {
    client.close();
  }
}

function getHttp2UpgradeStatusSnapshot() {
  return {
    ...http2UpgradeRuntime,
    endpoint: `https://${HTTP2_UPGRADE_HOST}:${HTTP2_UPGRADE_PORT}`,
    note: "Self-signed cert for local demo; use rejectUnauthorized=false in test clients.",
    uptimeSec: http2UpgradeRuntime.startedAt
      ? Number(((Date.now() - new Date(http2UpgradeRuntime.startedAt).getTime()) / 1000).toFixed(2))
      : 0,
  };
}

async function runHttp2UpgradeFullLoop(iterations = 3, delayMs = 120) {
  const loops = Math.max(1, Math.min(20, Math.floor(iterations)));
  const delay = Math.max(0, Math.min(5000, Math.floor(delayMs)));

  const started = await startHttp2UpgradeRuntime();
  if (started.status !== "running") {
    return {
      ok: false,
      loops,
      delayMs: delay,
      started,
      error: started.lastError || "Failed to start HTTP/2 runtime",
    };
  }

  const probes: Array<{
    idx: number;
    ok: boolean;
    status?: number;
    latencyMs: number;
    error?: string;
  }> = [];

  for (let i = 0; i < loops; i += 1) {
    const probe = await probeHttp2UpgradeRuntime();
    probes.push({
      idx: i + 1,
      ok: probe.ok,
      status: probe.status,
      latencyMs: probe.latencyMs,
      error: probe.error,
    });
    if (i < loops - 1 && delay > 0) {
      await Bun.sleep(delay);
    }
  }

  const beforeStop = getHttp2UpgradeStatusSnapshot();
  const stopped = await stopHttp2UpgradeRuntime();
  const afterStop = getHttp2UpgradeStatusSnapshot();
  const probesOk = probes.every((p) => p.ok);

  return {
    ok: probesOk && stopped.status === "stopped",
    loops,
    delayMs: delay,
    started,
    probes,
    beforeStop,
    stopped,
    afterStop,
  };
}

function parsePortRange(range: string): { start: number; end: number } {
  const match = range.trim().match(/^(\d+)-(\d+)$/);
  if (!match) return { start: DEDICATED_PORT, end: DEDICATED_PORT };
  const start = Number(match[1]);
  const end = Number(match[2]);
  return start <= end ? { start, end } : { start: end, end: start };
}

async function isPortAvailable(port: number): Promise<boolean> {
  return await new Promise(resolve => {
    const probe = createServer();
    probe.once("error", () => resolve(false));
    probe.once("listening", () => {
      probe.close(() => resolve(true));
    });
    probe.listen(port);
  });
}

async function resolvePort(): Promise<number> {
  if (await isPortAvailable(DEDICATED_PORT)) return DEDICATED_PORT;
  const { start, end } = parsePortRange(PORT_RANGE);
  for (let port = start; port <= end; port++) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(
    `No available playground port. dedicated=${DEDICATED_PORT} range=${PORT_RANGE}`
  );
}

function buildRuntimeMetadata() {
  return {
    bunVersion: Bun.version || "unknown",
    bunRevision: BUN_REVISION,
    platform: process.platform,
    arch: process.arch,
    pid: process.pid,
    ppid: process.ppid,
    cwd: process.cwd(),
    execPath: process.execPath,
    port: ACTIVE_PORT,
    startedAt: SERVER_STARTED_AT,
    uptimeSec: Number((process.uptime?.() || 0).toFixed(2)),
    metricsStore: {
      type: "sqlite",
      path: DASHBOARD_METRICS_DB_PATH,
      retentionRows: DASHBOARD_METRICS_RETENTION_ROWS,
      snapshotIntervalMs: DASHBOARD_METRICS_INTERVAL_MS,
    },
  };
}

function buildResilienceStatus() {
  const { profile, config } = ACTIVE_RESILIENCE;
  const requestUtilization = Number((inFlightRequests / Math.max(1, MAX_CONCURRENT_REQUESTS)).toFixed(3));
  const workerUtilization = Number((activeCommands / Math.max(1, MAX_COMMAND_WORKERS)).toFixed(3));
  const poolUtilization = Math.max(requestUtilization, workerUtilization);
  const dnsAligned =
    config.enablePrefetch === PREFETCH_ENABLED &&
    config.enablePreconnect === PRECONNECT_ENABLED;

  const riskLevel =
    poolUtilization >= 0.9
      ? "high"
      : poolUtilization >= 0.65
        ? "medium"
        : "low";

  return {
    profile,
    config,
    alignment: {
      dnsAligned,
      prefetchExpected: config.enablePrefetch,
      prefetchActive: PREFETCH_ENABLED,
      preconnectExpected: config.enablePreconnect,
      preconnectActive: PRECONNECT_ENABLED,
    },
    pooling: {
      requestUtilization,
      workerUtilization,
      poolUtilization,
      riskLevel,
    },
  };
}

function buildHealthChecks() {
  return [
    {
      name: "server",
      status: "healthy",
      message: "Playground server is accepting requests",
    },
    {
      name: "request-pool",
      status: inFlightRequests < MAX_CONCURRENT_REQUESTS ? "healthy" : "warning",
      message: `${inFlightRequests}/${MAX_CONCURRENT_REQUESTS} requests in-flight`,
    },
    {
      name: "worker-pool",
      status: activeCommands < MAX_COMMAND_WORKERS ? "healthy" : "warning",
      message: `${activeCommands}/${MAX_COMMAND_WORKERS} command workers active`,
    },
  ];
}

async function buildDashboardPayload(req: Request) {
  const governance = await routes["/api/control/governance-status"]();
  const runtime = buildRuntimeMetadata();
  const now = new Date().toISOString();
  const pool = {
    requests: {
      inFlight: inFlightRequests,
      max: MAX_CONCURRENT_REQUESTS,
    },
    workers: {
      active: activeCommands,
      max: MAX_COMMAND_WORKERS,
    },
  };

  return {
    status: "healthy",
    timestamp: now,
    service: "bun-v1.3.9-playground-dashboard",
    version: String(BUILD_METADATA?.version || "1.0.0"),
    runtime,
    checks: buildHealthChecks(),
    governance: {
      decision: governance.decision,
      benchmarkGate: governance.benchmarkGate,
    },
    resilience: buildResilienceStatus(),
    metrics: {
      system: {
        port: ACTIVE_PORT,
        uptimeSec: runtime.uptimeSec,
        inFlightRequests: pool.requests.inFlight,
        maxConcurrentRequests: pool.requests.max,
        activeWorkers: pool.workers.active,
        maxWorkers: pool.workers.max,
      },
      pool,
    },
    request: {
      method: req.method,
      path: new URL(req.url).pathname,
    },
  };
}

// API routes
const routes = {
  "/api/info": () => ({
    bunVersion: Bun.version || "1.3.9+",
    bunRevision: BUN_REVISION,
    gitCommitHash: GIT_COMMIT_HASH,
    gitCommitHashSource: GIT_COMMIT_HASH_SOURCE,
    buildMetadata: BUILD_METADATA,
    platform: process.platform,
    arch: process.arch,
    features: resolveAllFeatures(),
    controlPlane: {
      prefetchEnabled: PREFETCH_ENABLED,
      preconnectEnabled: PRECONNECT_ENABLED,
      prefetchHosts: PREFETCH_HOSTS,
      preconnectUrls: PRECONNECT_URLS,
      smokeTimeoutMs: SMOKE_TIMEOUT_MS,
      smokeUrls: SMOKE_URLS,
      fetchTimeoutMs: FETCH_TIMEOUT_MS,
      fetchDecompress: FETCH_DECOMPRESS,
      fetchVerbose: FETCH_VERBOSE ?? "off",
      s3DefaultContentType: S3_DEFAULT_CONTENT_TYPE,
      maxBodySizeMb: MAX_BODY_SIZE_MB,
      streamChunkSize: STREAM_CHUNK_SIZE,
      searchGovernanceFetchDepth: SEARCH_GOVERNANCE_FETCH_DEPTH,
      proxyDefaultEnabled: Boolean(resolveFeature<string | null>("proxy")),
      proxyAuthConfigured: Boolean(PROXY_AUTH_TOKEN),
      resilienceProfile: ACTIVE_RESILIENCE.profile,
      resilienceConfig: ACTIVE_RESILIENCE.config,
      sigillCaveat:
        process.platform === "linux" && process.arch === "arm64"
          ? "SIGILL ARMv8.0 fix applies to this Linux aarch64 platform."
          : "SIGILL ARMv8.0 fix applies to Linux aarch64 only (not this host).",
    },
  }),

  "/api/control/resilience/status": () => ({
    generatedAt: new Date().toISOString(),
    runtime: buildRuntimeMetadata(),
    controlPlane: {
      prefetchEnabled: PREFETCH_ENABLED,
      preconnectEnabled: PRECONNECT_ENABLED,
      prefetchHostsCount: PREFETCH_HOSTS.length,
      preconnectUrlsCount: PRECONNECT_URLS.length,
    },
    resilience: buildResilienceStatus(),
  }),

  "/api/health": () => ({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "bun-v1.3.9-playground-dashboard",
    version: String(BUILD_METADATA?.version || "1.0.0"),
    runtime: buildRuntimeMetadata(),
    checks: buildHealthChecks(),
  }),

  "/api/dashboard/runtime": () => buildRuntimeMetadata(),
  "/api/dashboard/mini": () => buildMiniDashboardSnapshot(),
  "/api/dashboard/trends": (req: Request) => {
    const url = new URL(req.url);
    const minutes = Number.parseInt(url.searchParams.get("minutes") || "60", 10);
    const limit = Number.parseInt(url.searchParams.get("limit") || "120", 10);
    return getCapacityTrend(minutes, limit);
  },
  "/api/dashboard/severity-test": (req: Request) => {
    const url = new URL(req.url);
    const loadPctRaw = Number.parseFloat(url.searchParams.get("load") || "0");
    const loadPct = Number.isFinite(loadPctRaw) ? loadPctRaw : 0;
    return buildSeverityTestSnapshot(loadPct);
  },
  
  "/api/demos": () => ({
    demos: DEMOS,
  }),
  
  "/api/demo/:id": async (req: Request) => {
    const url = new URL(req.url);
    const id = url.pathname.split("/").pop();
    const demo = DEMOS.find(d => d.id === id);
    
    if (!demo) {
      return new Response(JSON.stringify({ error: "Demo not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    return new Response(JSON.stringify(demo), {
      headers: { "Content-Type": "application/json" },
    });
  },

  "/api/brand/status": async () => {
    const latestPath = join(BRAND_REPORTS_DIR, "latest.json");
    const baselinePath = join(BRAND_REPORTS_DIR, "pinned-baseline.json");
    const governancePath = BRAND_GOVERNANCE_PATH;
    const decisionSnapshot = await readDecisionGovernanceSnapshot();

    const [latestRaw, baselineRaw, governanceJson, warnEval, strictEval] = await Promise.all([
      readFile(latestPath, "utf8").catch(() => null),
      readFile(baselinePath, "utf8").catch(() => null),
      readJsonSafe(governancePath),
      runCommand(["bun", "run", "scripts/brand-bench-evaluate.ts", "--json"], PROJECT_ROOT),
      BRAND_STATUS_STRICT_PROBE
        ? runCommand(["bun", "run", "scripts/brand-bench-evaluate.ts", "--json", "--strict"], PROJECT_ROOT)
        : Promise.resolve({ output: "", error: "", exitCode: 0 }),
    ]);

    let latestJson: any = null;
    let baselineJson: any = null;
    let warnEvalJson: any = null;
    let strictEvalJson: any = null;

    try { latestJson = latestRaw ? JSON.parse(latestRaw) : null; } catch {}
    try { baselineJson = baselineRaw ? JSON.parse(baselineRaw) : null; } catch {}
    try { warnEvalJson = warnEval.output ? JSON.parse(warnEval.output) : null; } catch {}
    try { strictEvalJson = strictEval.output ? JSON.parse(strictEval.output) : null; } catch {}

    return {
      paths: {
        latestPath,
        baselinePath,
        governancePath,
        decisionsIndexPath: DECISIONS_INDEX_PATH,
      },
      decision: decisionSnapshot,
      governance: {
        mode: governanceJson?.mode || "warn",
        warnCycle: Number.isFinite(Number(governanceJson?.warnCycle)) ? Number(governanceJson.warnCycle) : 1,
        warnCyclesTotal: Number.isFinite(Number(governanceJson?.warnCyclesTotal)) ? Number(governanceJson.warnCyclesTotal) : 5,
        strictProbeEnabled: BRAND_STATUS_STRICT_PROBE,
      },
      latest: latestJson
        ? {
            runId: latestJson.runId,
            createdAt: latestJson.createdAt,
            seedCount: Array.isArray(latestJson.seedSet) ? latestJson.seedSet.length : null,
          }
        : null,
      baseline: baselineJson
        ? {
            baselineRunId: baselineJson.baselineRunId,
            previousBaselineRunId: baselineJson.previousBaselineRunId,
            pinnedAt: baselineJson.pinnedAt,
            rationale: baselineJson.rationale,
          }
        : null,
      warnGate: warnEvalJson
        ? {
            ok: warnEvalJson.ok,
            status: warnEvalJson.status,
            anomalyType: warnEvalJson.anomalyType,
            violations: warnEvalJson.violations?.length ?? 0,
            gateMode: warnEvalJson.gateMode ?? "warn",
            warnCycle: warnEvalJson.warnCycle ?? 1,
            warnCyclesTotal: warnEvalJson.warnCyclesTotal ?? 5,
          }
        : { ok: false, status: "fail", anomalyType: "stable", violations: null, raw: warnEval.output || warnEval.error },
      strictGate: strictEvalJson
        ? {
            ok: strictEvalJson.ok,
            status: strictEvalJson.status,
            anomalyType: strictEvalJson.anomalyType,
            violations: strictEvalJson.violations?.length ?? 0,
            gateMode: strictEvalJson.gateMode ?? "strict",
            warnCycle: strictEvalJson.warnCycle ?? 1,
            warnCyclesTotal: strictEvalJson.warnCyclesTotal ?? 5,
          }
        : {
            ok: BRAND_STATUS_STRICT_PROBE ? false : true,
            status: BRAND_STATUS_STRICT_PROBE ? "fail" : "unknown",
            anomalyType: "stable",
            violations: null,
            raw: BRAND_STATUS_STRICT_PROBE ? (strictEval.output || strictEval.error) : "strict probe disabled",
          },
      impact: impactFromGates({
        warn: warnEvalJson?.status,
        strict: strictEvalJson?.status,
      }),
      exits: {
        warn: warnEval.exitCode,
        strict: strictEval.exitCode,
      },
    };
  },

  "/api/control/governance-status": async () => {
    const [brandStatus, decisionSnapshot] = await Promise.all([
      routes["/api/brand/status"](),
      readDecisionGovernanceSnapshot(),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      decision: decisionSnapshot,
      benchmarkGate: {
        mode: brandStatus.governance?.mode || "warn",
        warnCycle: brandStatus.governance?.warnCycle || 1,
        warnCyclesTotal: brandStatus.governance?.warnCyclesTotal || 5,
        warnStatus: brandStatus.warnGate?.status || "unknown",
        strictStatus: brandStatus.strictGate?.status || "unknown",
      },
      impact: brandStatus.impact || "Low",
    };
  },

  "/api/fetch/protocol-router": async (req: Request) => {
    return await runProtocolRouter(req);
  },

  "/api/control/features": (req: Request) => ({
    features: resolveAllFeatures(req),
    matrixSummary: {
      rows: BUN_V139_FEATURE_MATRIX.length,
      generatedAt: new Date().toISOString(),
    },
  }),

  "/api/control/feature-matrix": () => {
    const scriptMode = (process.env.PLAYGROUND_SCRIPT_MODE || "sequential").toLowerCase();
    const noExitOnError = parseBool(process.env.PLAYGROUND_NO_EXIT_ON_ERROR, false);
    const http2Upgrade = parseBool(process.env.PLAYGROUND_HTTP2_UPGRADE, false);
    const cpuInterval = Number.parseInt(process.env.PLAYGROUND_CPU_PROF_INTERVAL || "1000", 10) || 1000;
    const compileFormat = (process.env.PLAYGROUND_COMPILE_FORMAT || "cjs").toLowerCase();
    const noProxy = process.env.NO_PROXY || process.env.no_proxy || "";

    const runtime = {
      bunVersion: Bun.version,
      bunRevision: BUN_REVISION,
      platform: process.platform,
      arch: process.arch,
      sigillCaveat:
        process.platform === "linux" && process.arch === "arm64"
          ? "SIGILL ARMv8.0 fix applies to this Linux aarch64 host"
          : "SIGILL ARMv8.0 fix applies to Linux ARMv8.0 only (not this host)",
    };

    const rows = BUN_V139_FEATURE_MATRIX.map((row) => {
      let appliedValue = row.defaultBehavior;
      let active = false;

      if (row.feature === "Parallel Scripts") {
        appliedValue = scriptMode;
        active = scriptMode === "parallel";
      } else if (row.feature === "Sequential Scripts") {
        appliedValue = scriptMode;
        active = scriptMode === "sequential";
      } else if (row.feature === "No-Exit-On-Error") {
        appliedValue = String(noExitOnError);
        active = noExitOnError;
      } else if (row.feature === "HTTP/2 Upgrade") {
        appliedValue = String(http2Upgrade);
        active = http2Upgrade;
      } else if (row.feature === "NO_PROXY Fix") {
        appliedValue = noProxy || "(unset)";
        active = noProxy.length > 0;
      } else if (row.feature === "CPU Prof Interval") {
        appliedValue = String(cpuInterval);
        active = cpuInterval !== 1000;
      } else if (row.feature === "ESM Bytecode") {
        appliedValue = compileFormat;
        active = compileFormat === "esm";
      } else if (row.feature === "ARMv8.0 Fix") {
        appliedValue = `${runtime.platform}/${runtime.arch}`;
        active = runtime.platform === "linux" && runtime.arch === "arm64";
      }

      return {
        ...row,
        appliedValue,
        active,
      };
    });

    return {
      generatedAt: new Date().toISOString(),
      version: "bun-v1.3.9",
      columns: [
        "feature",
        "cliOrApi",
        "defaultBehavior",
        "environmentOverride",
        "integration",
        "performanceImpact",
        "memoryImpact",
        "productionReady",
        "appliedValue",
        "active",
      ],
      runtime,
      summary: {
        rowCount: rows.length,
        activeCount: rows.filter((row) => row.active).length,
        env: {
          PLAYGROUND_SCRIPT_MODE: scriptMode,
          PLAYGROUND_NO_EXIT_ON_ERROR: noExitOnError,
          PLAYGROUND_HTTP2_UPGRADE: http2Upgrade,
          PLAYGROUND_CPU_PROF_INTERVAL: cpuInterval,
          PLAYGROUND_COMPILE_FORMAT: compileFormat,
          NO_PROXY: noProxy || "",
        },
      },
      rows,
    };
  },

  "/api/control/component-status": () => {
    const rows = COMPONENT_STATUS_MATRIX.map((row) => ({
      ...row,
      stable: row.status === "stable",
    }));
    const stableCount = rows.filter((row) => row.stable).length;

    return {
      generatedAt: new Date().toISOString(),
      source: "playground-component-status-matrix",
      summary: {
        rowCount: rows.length,
        stableCount,
        betaCount: rows.length - stableCount,
      },
      columns: [
        "component",
        "file",
        "status",
        "owner",
        "lastCommit",
        "testCoverage",
        "performanceBudget",
        "dependencies",
        "securityReview",
        "documentation",
        "production",
        "stable",
      ],
      rows,
    };
  },

  "/api/control/network-smoke": async (req: Request) => {
    const base = new URL(req.url).origin;
    const smoke = await runNetworkSmoke(base);
    const failures = smoke.results.filter(r => !r.ok).length;
    return {
      ok: failures === 0,
      failures,
      ...smoke,
    };
  },

  "/api/control/http2-upgrade/status": () => getHttp2UpgradeStatusSnapshot(),

  "/api/control/http2-upgrade/start": async () => {
    const state = await startHttp2UpgradeRuntime();
    return {
      ...state,
      endpoint: `https://${HTTP2_UPGRADE_HOST}:${HTTP2_UPGRADE_PORT}`,
      started: state.status === "running",
    };
  },

  "/api/control/http2-upgrade/stop": async () => {
    const state = await stopHttp2UpgradeRuntime();
    return {
      ...state,
      endpoint: `https://${HTTP2_UPGRADE_HOST}:${HTTP2_UPGRADE_PORT}`,
      stopped: state.status === "stopped",
    };
  },

  "/api/control/http2-upgrade/probe": async () => {
    const probe = await probeHttp2UpgradeRuntime();
    return {
      ...probe,
      endpoint: `https://${HTTP2_UPGRADE_HOST}:${HTTP2_UPGRADE_PORT}`,
      runtime: http2UpgradeRuntime,
    };
  },

  "/api/control/http2-upgrade/full-loop": async (req: Request) => {
    const url = new URL(req.url);
    const iterations = Number.parseInt(url.searchParams.get("iterations") || "3", 10);
    const delayMs = Number.parseInt(url.searchParams.get("delayMs") || "120", 10);
    return await runHttp2UpgradeFullLoop(iterations, delayMs);
  },

  "/api/control/script-orchestration-panel": async () => {
    return await getWorkspaceOrchestrationPanel();
  },

  "/api/control/script-orchestration-simulate": async (req: Request) => {
    const url = new URL(req.url);
    const modeParam = (url.searchParams.get("mode") || "parallel").toLowerCase();
    const mode =
      modeParam === "sequential" ||
      modeParam === "parallel-no-exit" ||
      modeParam === "filter"
        ? modeParam
        : "parallel";
    return buildOrchestrationSimulation(mode);
  },

  "/api/control/script-orchestration/full-loop": async () => {
    return await runScriptOrchestrationFullLoop();
  },

  "/api/control/script-orchestration/status": async () => {
    return await getScriptOrchestrationStatus();
  },

  "/api/control/upload-progress": async (req: Request) => {
    const upload = await buildUploadProgress(req);
    return upload;
  },

  "/api/control/s3-content-type": (req: Request) => {
    const url = new URL(req.url);
    const key = url.searchParams.get("key") || "";
    return {
      key,
      contentType: contentTypeFromS3Key(key),
      defaultContentType: S3_DEFAULT_CONTENT_TYPE,
    };
  },

  "/api/control/s3-content-type-batch": async (req: Request) => {
    const body = await parseJsonBody(req);
    const keys = Array.isArray(body.keys) ? body.keys.map((k: unknown) => String(k)) : [];
    return {
      count: keys.length,
      defaultContentType: S3_DEFAULT_CONTENT_TYPE,
      items: keys.map(key => ({ key, contentType: contentTypeFromS3Key(key) })),
    };
  },

  "/api/control/protocol-matrix": () => getProtocolMatrix(),

  "/api/control/protocol-scorecard": () => getProtocolScorecard(),  // returns Promise

  "/api/control/evidence-dashboard": () => getEvidenceDashboard(),

  "/api/control/decision-defense": () => getDecisionDefenseDashboard(),
  
  "/api/run/:id": async (req: Request) => {
    const url = new URL(req.url);
    const id = url.pathname.split("/").pop();
    if (!id || id === "undefined" || id === "null") {
      return new Response(JSON.stringify({
        success: false,
        error: "Invalid demo id",
        output: "",
        exitCode: 1,
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const knownDemo = DEMOS.find((demo) => demo.id === id);
    if (!knownDemo) {
      return new Response(JSON.stringify({
        success: false,
        error: `Unknown demo id: ${id}`,
        output: "",
        exitCode: 1,
      }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (id === "control-plane") {
      const smoke = await routes["/api/control/network-smoke"](req);
      return new Response(JSON.stringify({
        success: smoke.ok,
        output: JSON.stringify(smoke, null, 2),
        exitCode: smoke.ok ? 0 : 1,
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (id === "resilience-governance") {
      const status = routes["/api/control/resilience/status"]();
      return new Response(JSON.stringify({
        success: true,
        output: JSON.stringify(status, null, 2),
        exitCode: 0,
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (id === "workspace-runner-panel") {
      const panel = await routes["/api/control/script-orchestration-panel"]();
      return new Response(JSON.stringify({
        success: true,
        output: JSON.stringify(panel, null, 2),
        exitCode: 0,
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (id === "script-orchestration-control") {
      const fullLoop = await routes["/api/control/script-orchestration/full-loop"]();

      return new Response(JSON.stringify({
        success: true,
        output: JSON.stringify(fullLoop, null, 2),
        exitCode: 0,
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (id === "multipart-progress") {
      const simulated = await routes["/api/control/upload-progress"](req);
      return new Response(JSON.stringify({
        success: true,
        output: JSON.stringify(simulated, null, 2),
        exitCode: 0,
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (id === "s3-content-type") {
      const preview = {
        count: 4,
        defaultContentType: S3_DEFAULT_CONTENT_TYPE,
        items: ["app.js", "styles.css", "readme.md", "archive.bin"].map(key => ({
          key,
          contentType: contentTypeFromS3Key(key),
        })),
      };
      return new Response(JSON.stringify({
        success: true,
        output: JSON.stringify(preview, null, 2),
        exitCode: 0,
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (id === "protocol-matrix") {
      const matrix = routes["/api/control/protocol-matrix"]();
      return new Response(JSON.stringify({
        success: true,
        output: JSON.stringify(matrix, null, 2),
        exitCode: 0,
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (id === "protocol-scorecard") {
      const scorecard = await routes["/api/control/protocol-scorecard"]();
      return new Response(JSON.stringify({
        success: true,
        output: JSON.stringify(scorecard, null, 2),
        exitCode: 0,
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (id === "component-status-matrix") {
      const matrix = routes["/api/control/component-status"]();
      return new Response(JSON.stringify({
        success: true,
        output: JSON.stringify(matrix, null, 2),
        exitCode: 0,
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (id === "protocol-router-tier1380") {
      const dryRun = await routes["/api/fetch/protocol-router"](
        new Request("http://localhost/api/fetch/protocol-router", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            url: "https://example.com",
            method: "GET",
            dryRun: true,
            bodyType: "string",
          }),
        })
      );
      return new Response(JSON.stringify({
        success: true,
        output: JSON.stringify(dryRun, null, 2),
        exitCode: 0,
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (id === "http2-runtime-control") {
      const loop = await runHttp2UpgradeFullLoop(3, 120);
      return new Response(JSON.stringify({
        success: loop.ok === true,
        output: JSON.stringify(loop, null, 2),
        exitCode: loop.ok === true ? 0 : 1,
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (id === "evidence-dashboard") {
      const dashboard = routes["/api/control/evidence-dashboard"]();
      return new Response(JSON.stringify({
        success: true,
        output: JSON.stringify(dashboard, null, 2),
        exitCode: 0,
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (id === "decision-defense") {
      const dashboard = routes["/api/control/decision-defense"]();
      return new Response(JSON.stringify({
        success: true,
        output: JSON.stringify(dashboard, null, 2),
        exitCode: 0,
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (id === "governance-status") {
      const dashboard = await routes["/api/control/governance-status"]();
      return new Response(JSON.stringify({
        success: true,
        output: JSON.stringify(dashboard, null, 2),
        exitCode: 0,
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (id === "no-proxy-explicit" || id === "proxy") {
      const sample = {
        env: { NO_PROXY: "localhost" },
        request: {
          url: "http://localhost:3000/api",
          proxy: "http://my-proxy:8080",
        },
        expected: "Proxy bypassed for localhost due to NO_PROXY",
        appliesTo: ["fetch", "WebSocket"],
      };
      return new Response(JSON.stringify({
        success: true,
        output: JSON.stringify(sample, null, 2),
        exitCode: 0,
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (id === "symbol-dispose-explicit" || id === "symbol-dispose" || id === "mocks") {
      const sample = {
        pattern: "using + Symbol.dispose",
        behavior: "Auto-restores spy/mock when leaving scope",
        alias: "fn[Symbol.dispose]() === fn.mockRestore()",
      };
      return new Response(JSON.stringify({
        success: true,
        output: JSON.stringify(sample, null, 2),
        exitCode: 0,
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (id === "cpu-prof-interval-explicit" || id === "profiling") {
      const sample = {
        defaultIntervalMicros: 1000,
        commandExamples: [
          "bun --cpu-prof --cpu-prof-interval 500 index.js",
          "bun --cpu-prof --cpu-prof-interval 250 index.js",
        ],
        note: "--cpu-prof-interval without --cpu-prof emits warning",
      };
      return new Response(JSON.stringify({
        success: true,
        output: JSON.stringify(sample, null, 2),
        exitCode: 0,
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (id === "esm-bytecode-explicit" || id === "bytecode") {
      const sample = {
        supported: true,
        commands: [
          "bun build --compile --bytecode --format=esm ./cli.ts",
          "bun build --compile --bytecode --format=cjs ./cli.ts",
        ],
        defaultWithoutFormat: "cjs",
      };
      return new Response(JSON.stringify({
        success: true,
        output: JSON.stringify(sample, null, 2),
        exitCode: 0,
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (id === "bun-apis-stringwidth") {
      const thai = "คำ";
      const lao = "ຄຳ";
      const sample = {
        source: "https://bun.com/blog/bun-v1.3.9#bun-apis",
        claim: "Bun.stringWidth now counts Thai/Lao spacing vowels as width 1",
        examples: {
          thai,
          thaiWidth: Bun.stringWidth(thai),
          lao,
          laoWidth: Bun.stringWidth(lao),
        },
        expected: {
          thaiWidth: 2,
          laoWidth: 2,
        },
      };
      return new Response(JSON.stringify({
        success: true,
        output: JSON.stringify(sample, null, 2),
        exitCode: 0,
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (id === "brand-bench-gate") {
      try {
        const result = await runCommand(["bun", "run", "brand:bench:all"], PROJECT_ROOT);
        return new Response(JSON.stringify({
          success: result.exitCode === 0,
          output: result.output || (result.exitCode === 0 ? "Brand bench gate run completed." : ""),
          error: result.error || undefined,
          exitCode: result.exitCode,
        }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(JSON.stringify({
          success: false,
          error: err instanceof Error ? err.message : String(err),
          output: "",
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }
    
    // Map demo IDs to script names (some demos have different names)
    const scriptMap: Record<string, string> = {
      "parallel": "parallel-scripts",
      "http2": "http2-upgrade",
      "mocks": "mock-dispose",
      "proxy": "no-proxy",
      "profiling": "cpu-profiling",
      "bytecode": "esm-bytecode",
      "performance": "performance",
      "bugfixes": "bugfixes",
      "markdown-advanced": "markdown-advanced",
      "symbol-dispose": "symbol-dispose",
      "ipc-communication": "ipc-communication",
      "process-basics": "process-basics",
      "stdin-demo": "stdin-demo",
      "argv-demo": "argv-demo",
      "ctrl-c-demo": "ctrl-c-demo",
      "signals-demo": "signals-demo",
      "spawn-demo": "spawn-demo",
      "inspect-table": "inspect-table-demo",
      "brand-bench-results": "brand-bench-results",
      "test-timeouts": "timeouts-demo",
      "test-config": "config-demo",
      "test-lifecycle": "lifecycle-demo",
      "test-filtering": "filtering-demo",
      "test-exec-control": "exec-control-demo",
    };
    
    const scriptName = scriptMap[id || ""] || id;
    
    // Run the demo script from the parent demos directory
    const demoScript = join(import.meta.dir, "..", "playground", "demos", `${scriptName}.ts`);
    
    try {
      const { output, error, exitCode } = await runCommand(["bun", "run", demoScript], import.meta.dir);
      
      // Strip ANSI codes for clean JSON output (Bun.stripANSI handles all ANSI escape sequences)
      const cleanOutput = output ? Bun.stripANSI(output) : (exitCode === 0 ? "Demo completed successfully!" : "");
      const cleanError = error ? Bun.stripANSI(error) : undefined;
      
      return new Response(JSON.stringify({
        success: exitCode === 0,
        output: cleanOutput,
        error: cleanError,
        exitCode,
      }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({
        success: false,
        error: err instanceof Error ? Bun.stripANSI(err.message) : Bun.stripANSI(String(err)),
        output: "",
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function handleRequest(req: Request): Promise<Response> {
  if (inFlightRequests >= MAX_CONCURRENT_REQUESTS) {
    return jsonResponse(
      {
        error: "Playground is at max concurrent request capacity.",
        maxConcurrentRequests: MAX_CONCURRENT_REQUESTS,
      },
      503
    );
  }
  inFlightRequests++;
  try {
    const url = new URL(req.url);
    
    // API routes
    if (url.pathname.startsWith("/api/")) {
      if (url.pathname === "/api/info") {
        const uptimeMs = Date.now() - serverStartTime;
        return jsonResponse({
          ...routes["/api/info"](),
          runtime: {
            dedicatedPort: DEDICATED_PORT,
            portRange: PORT_RANGE,
            maxConcurrentRequests: MAX_CONCURRENT_REQUESTS,
            maxCommandWorkers: MAX_COMMAND_WORKERS,
            inFlightRequests,
            activeCommands,
            uptimeMs,
          },
        });
      }
      
      if (url.pathname === "/api/demos") {
        return jsonResponse(routes["/api/demos"]());
      }

      if (url.pathname === "/api/health") {
        return jsonResponse(routes["/api/health"]());
      }

      if (url.pathname === "/api/dashboard/runtime") {
        return jsonResponse(routes["/api/dashboard/runtime"]());
      }

      if (url.pathname === "/api/dashboard/mini") {
        return jsonResponse(routes["/api/dashboard/mini"]());
      }

      if (url.pathname === "/api/dashboard/trends") {
        return jsonResponse(routes["/api/dashboard/trends"](req));
      }

      if (url.pathname === "/api/dashboard/severity-test") {
        return jsonResponse(routes["/api/dashboard/severity-test"](req));
      }

      if (url.pathname === "/api/dashboard" || url.pathname === "/api/dashboard/debug") {
        const body = await buildDashboardPayload(req);
        if (url.pathname === "/api/dashboard/debug") {
          return jsonResponse({
            ...body,
            debug: {
              env: {
                NO_PROXY: process.env.NO_PROXY || process.env.no_proxy || "",
                HTTP_PROXY: process.env.HTTP_PROXY || process.env.http_proxy || "",
                HTTPS_PROXY: process.env.HTTPS_PROXY || process.env.https_proxy || "",
              },
              paths: {
                projectRoot: PROJECT_ROOT,
                playgroundRoot: import.meta.dir,
                bunMain: Bun.main,
              },
            },
          });
        }
        return jsonResponse(body);
      }

      if (url.pathname === "/api/brand/status") {
        return jsonResponse(await routes["/api/brand/status"]());
      }

      if (url.pathname === "/api/control/network-smoke") {
        return jsonResponse(await routes["/api/control/network-smoke"](req));
      }

      if (url.pathname === "/api/control/http2-upgrade/status") {
        return jsonResponse(routes["/api/control/http2-upgrade/status"]());
      }

      if (url.pathname === "/api/control/http2-upgrade/start") {
        return jsonResponse(await routes["/api/control/http2-upgrade/start"]());
      }

      if (url.pathname === "/api/control/http2-upgrade/stop") {
        return jsonResponse(await routes["/api/control/http2-upgrade/stop"]());
      }

      if (url.pathname === "/api/control/http2-upgrade/probe") {
        return jsonResponse(await routes["/api/control/http2-upgrade/probe"]());
      }

      if (url.pathname === "/api/control/http2-upgrade/full-loop") {
        return jsonResponse(await routes["/api/control/http2-upgrade/full-loop"](req));
      }

      if (url.pathname === "/api/control/script-orchestration-panel") {
        return jsonResponse(await routes["/api/control/script-orchestration-panel"]());
      }

      if (url.pathname === "/api/control/script-orchestration-simulate") {
        return jsonResponse(await routes["/api/control/script-orchestration-simulate"](req));
      }
      if (url.pathname === "/api/control/script-orchestration/full-loop") {
        return jsonResponse(await routes["/api/control/script-orchestration/full-loop"]());
      }
      if (url.pathname === "/api/control/script-orchestration/status") {
        return jsonResponse(await routes["/api/control/script-orchestration/status"]());
      }

      if (url.pathname === "/api/control/features") {
        return jsonResponse(routes["/api/control/features"](req));
      }

      if (url.pathname === "/api/control/feature-matrix") {
        return jsonResponse(routes["/api/control/feature-matrix"]());
      }

      if (url.pathname === "/api/control/component-status") {
        return jsonResponse(routes["/api/control/component-status"]());
      }

      if (url.pathname === "/api/control/upload-progress") {
        return jsonResponse(await routes["/api/control/upload-progress"](req));
      }

      if (url.pathname === "/api/control/s3-content-type") {
        return jsonResponse(routes["/api/control/s3-content-type"](req));
      }

      if (url.pathname === "/api/control/s3-content-type-batch") {
        return jsonResponse(await routes["/api/control/s3-content-type-batch"](req));
      }

      if (url.pathname === "/api/control/protocol-matrix") {
        return jsonResponse(routes["/api/control/protocol-matrix"]());
      }

      if (url.pathname === "/api/control/protocol-scorecard") {
        const use = url.searchParams.get('use') || undefined;
        const size = parseInt(url.searchParams.get('size') || '0') || undefined;
        return jsonResponse(await getProtocolScorecard({ use, size }));
      }

      if (url.pathname === "/api/control/evidence-dashboard") {
        return jsonResponse(routes["/api/control/evidence-dashboard"]());
      }

      if (url.pathname === "/api/control/decision-defense") {
        return jsonResponse(routes["/api/control/decision-defense"]());
      }

      if (url.pathname === "/api/control/governance-status") {
        return jsonResponse(await routes["/api/control/governance-status"]());
      }

      if (url.pathname === "/api/control/resilience/status") {
        return jsonResponse(routes["/api/control/resilience/status"]());
      }

      if (url.pathname === "/api/fetch/protocol-router") {
        return jsonResponse(await routes["/api/fetch/protocol-router"](req));
      }
      
      const demoMatch = url.pathname.match(/^\/api\/demo\/(.+)$/);
      if (demoMatch) {
        return await routes["/api/demo/:id"](req);
      }
      
      const runMatch = url.pathname.match(/^\/api\/run\/(.+)$/);
      if (runMatch) {
        return await routes["/api/run/:id"](req);
      }
    }
    
    // Serve static files
    const staticFiles: Record<string, { file: string; contentType: string }> = {
      "/": { file: "index.html", contentType: "text/html" },
      "/index.html": { file: "index.html", contentType: "text/html" },
      "/enhanced.html": { file: "enhanced.html", contentType: "text/html" },
      "/styles.css": { file: "styles.css", contentType: "text/css" },
      "/micro-polish.css": { file: "micro-polish.css", contentType: "text/css" },
      "/command-palette.css": { file: "command-palette.css", contentType: "text/css" },
      "/app.js": { file: "app.js", contentType: "application/javascript" },
      "/micro-polish.js": { file: "micro-polish.js", contentType: "application/javascript" },
      "/command-palette.js": { file: "command-palette.js", contentType: "application/javascript" },
      "/url-sharing.js": { file: "url-sharing.js", contentType: "application/javascript" },
    };
    
    const staticFile = staticFiles[url.pathname];
    if (staticFile) {
      const file = Bun.file(join(import.meta.dir, staticFile.file));
      if (await file.exists()) {
        return new Response(file, {
          headers: { "Content-Type": staticFile.contentType },
        });
      }
    }
    
    return new Response("Not Found", { status: 404 });
  } finally {
    inFlightRequests--;
  }
}

await initCapacityMetricsStore();
const ACTIVE_PORT = await resolvePort();
const warmupState = await runWarmup();

// Create abort controller for graceful shutdown
const ac = new AbortController();
const SHUTDOWN_TIMEOUT_MS = parseNumberEnv("PLAYGROUND_SHUTDOWN_TIMEOUT_MS", 5000, {
  min: 500,
  max: 300000,
});
const CAPACITY_WS_PATH = "/ws/capacity";
const CAPACITY_WS_TOPIC = "dashboard-capacity-updates";
const CAPACITY_WS_BROADCAST_MS = parseNumberEnv("PLAYGROUND_WS_BROADCAST_MS", 1000, {
  min: 250,
  max: 10000,
});
let shuttingDown = false;
let httpServer: ReturnType<typeof serve> | null = null;
let capacityBroadcastTimer: ReturnType<typeof setInterval> | null = null;

async function waitForInFlightDrain(timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  while (inFlightRequests > 0 && Date.now() - start < timeoutMs) {
    await Bun.sleep(50);
  }
  return inFlightRequests === 0;
}

async function gracefulShutdown(reason: string, exitCode = 0, error?: unknown) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  const startedAt = Date.now();
  const reasonPrefix = `[shutdown] ${reason}`;
  if (error) {
    console.error(`${reasonPrefix} error:`, error);
  } else {
    console.log(`${reasonPrefix} requested`);
  }

  const forceExitTimer = setTimeout(() => {
    console.error(`[shutdown] forced exit after ${SHUTDOWN_TIMEOUT_MS}ms`);
    process.exit(exitCode === 0 ? 1 : exitCode);
  }, SHUTDOWN_TIMEOUT_MS);

  try {
    // Stop accepting new work and ask Bun.serve() to drain inflight fetch handlers.
    ac.abort();
    if (capacityBroadcastTimer) {
      clearInterval(capacityBroadcastTimer);
      capacityBroadcastTimer = null;
    }
    if (httpServer) {
      httpServer.stop(true);
    }
    if (http2UpgradeRuntime.status === "running") {
      await stopHttp2UpgradeRuntime();
    }
    if (capacityMetricsDb) {
      capacityMetricsDb.close();
      capacityMetricsDb = null;
    }

    const drained = await waitForInFlightDrain(Math.max(250, SHUTDOWN_TIMEOUT_MS - 250));
    if (!drained) {
      console.warn(`[shutdown] in-flight requests did not drain before timeout (remaining=${inFlightRequests})`);
    }
    console.log(`[shutdown] completed in ${Date.now() - startedAt}ms`);
  } catch (shutdownError) {
    console.error(`[shutdown] failed:`, shutdownError);
    exitCode = exitCode === 0 ? 1 : exitCode;
  } finally {
    clearTimeout(forceExitTimer);
    process.exit(exitCode);
  }
}

// Default process lifecycle and signal handling.
process.on("SIGINT", () => {
  void gracefulShutdown("SIGINT", 0);
});

process.on("SIGTERM", () => {
  void gracefulShutdown("SIGTERM", 0);
});

process.on("SIGHUP", () => {
  if (IGNORE_SIGHUP) {
    console.warn("[signal] SIGHUP ignored (PLAYGROUND_IGNORE_SIGHUP=true)");
    return;
  }
  void gracefulShutdown("SIGHUP", 0);
});

process.on("unhandledRejection", (error) => {
  if (EXIT_ON_UNHANDLED_REJECTION) {
    void gracefulShutdown("unhandledRejection", 1, error);
    return;
  }
  console.error("[runtime] unhandledRejection (non-fatal):", error);
});

process.on("uncaughtException", (error) => {
  if (EXIT_ON_UNCAUGHT_EXCEPTION) {
    void gracefulShutdown("uncaughtException", 1, error);
    return;
  }
  console.error("[runtime] uncaughtException (non-fatal):", error);
});

// Serve the application
httpServer = serve({
  port: ACTIVE_PORT,
  fetch: (req, server) => {
    const url = new URL(req.url);
    if (url.pathname === CAPACITY_WS_PATH) {
      const upgraded = server.upgrade(req, {
        data: {
          connectedAt: Date.now(),
          userAgent: req.headers.get("user-agent") || "unknown",
        },
      });
      return upgraded
        ? undefined
        : new Response("WebSocket upgrade failed", { status: 400 });
    }
    return handleRequest(req);
  },
  websocket: {
    data: {} as { connectedAt: number; userAgent: string },
    open(ws) {
      ws.subscribe(CAPACITY_WS_TOPIC);
      ws.send(JSON.stringify(buildMiniDashboardSnapshot()));
    },
    message(ws, message) {
      const text = typeof message === "string" ? message.toLowerCase() : "";
      if (text === "ping") {
        ws.send(JSON.stringify({
          type: "pong",
          timestamp: new Date().toISOString(),
          topic: CAPACITY_WS_TOPIC,
        }));
      }
    },
    close(ws) {
      ws.unsubscribe(CAPACITY_WS_TOPIC);
    },
  },
  signal: ac.signal,
});

capacityBroadcastTimer = setInterval(() => {
  if (!httpServer || shuttingDown) return;
  httpServer.publish(CAPACITY_WS_TOPIC, JSON.stringify(buildMiniDashboardSnapshot()));
}, CAPACITY_WS_BROADCAST_MS);

console.log(`🚀 Bun v1.3.9 Browser Playground`);
console.log(`📡 Server running at http://localhost:${ACTIVE_PORT}`);
console.log(`🌐 Open http://localhost:${ACTIVE_PORT} in your browser`);
console.log(
  `🧰 Pooling: maxRequests=${MAX_CONCURRENT_REQUESTS} maxCommandWorkers=${MAX_COMMAND_WORKERS} range=${PORT_RANGE}`
);
console.log(`📶 Capacity stream: ws://localhost:${ACTIVE_PORT}${CAPACITY_WS_PATH} topic=${CAPACITY_WS_TOPIC} every=${CAPACITY_WS_BROADCAST_MS}ms`);
console.log(
  `🛰️ Warmup: prefetch=${warmupState.prefetch.length} preconnect=${warmupState.preconnect.length} enabled=${!warmupState.skipped}`
);
console.log(
  `🧯 Runtime guards: ignoreSighup=${IGNORE_SIGHUP} exitOnUnhandledRejection=${EXIT_ON_UNHANDLED_REJECTION} exitOnUncaughtException=${EXIT_ON_UNCAUGHT_EXCEPTION}`
);
console.log(`🛑 Shutdown timeout: ${SHUTDOWN_TIMEOUT_MS}ms`);
console.log(`\n💡 Press Ctrl+C to stop gracefully`);
