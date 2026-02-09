#!/usr/bin/env bun
/**
 * Bun v1.3.9 Browser Playground Server
 * 
 * Web-based playground showcasing all Bun v1.3.9 features
 */

import { serve } from "bun";
import { readFile } from "node:fs/promises";
import { createServer } from "node:net";
import { join } from "node:path";

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
const FETCH_DECOMPRESS = parseBool(process.env.PLAYGROUND_FETCH_DECOMPRESS, BASE_STANDARD.fetchDecompress);
const FETCH_VERBOSE = parseFetchVerbose(process.env.PLAYGROUND_FETCH_VERBOSE, BASE_STANDARD.fetchVerbose);
const S3_DEFAULT_CONTENT_TYPE = process.env.PLAYGROUND_S3_DEFAULT_CONTENT_TYPE || "application/octet-stream";
const PROJECT_ROOT = join(import.meta.dir, "..", "..", "..");
const BRAND_REPORTS_DIR = join(PROJECT_ROOT, "reports", "brand-bench");
let inFlightRequests = 0;
let activeCommands = 0;
const commandWaiters: Array<() => void> = [];

type FeatureRequest = Request | null;
type FeatureDefinition<T> = {
  envVar: string | string[];
  parse: (val: string) => T;
  default: T | ((req?: FeatureRequest) => T);
};

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

// Demo configurations
const DEMOS = [
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
    id: "performance",
    name: "Performance Optimizations",
    description: "RegExp JIT, Markdown, String optimizations",
    category: "Performance",
    code: `// RegExp JIT (3.9x faster)
/(?:abc){3}/      // Fixed-count → JIT-optimized
/(?:abc)+/        // Variable count → interpreter

// Markdown (3-15% faster)
Bun.Markdown.toHTML(markdown);
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
  return {
    generatedAt: new Date().toISOString(),
    source: "bun-runtime-playground",
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

function getProtocolScorecard() {
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

// API routes
const routes = {
  "/api/info": () => ({
    bunVersion: Bun.version || "1.3.9+",
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
      proxyDefaultEnabled: Boolean(resolveFeature<string | null>("proxy")),
      proxyAuthConfigured: Boolean(PROXY_AUTH_TOKEN),
    },
  }),
  
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

    const [latestRaw, baselineRaw, warnEval, strictEval] = await Promise.all([
      readFile(latestPath, "utf8").catch(() => null),
      readFile(baselinePath, "utf8").catch(() => null),
      runCommand(["bun", "run", "scripts/brand-bench-evaluate.ts", "--json"], PROJECT_ROOT),
      runCommand(["bun", "run", "scripts/brand-bench-evaluate.ts", "--json", "--strict"], PROJECT_ROOT),
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
          }
        : { ok: false, status: "fail", anomalyType: "stable", violations: null, raw: warnEval.output || warnEval.error },
      strictGate: strictEvalJson
        ? {
            ok: strictEvalJson.ok,
            status: strictEvalJson.status,
            anomalyType: strictEvalJson.anomalyType,
            violations: strictEvalJson.violations?.length ?? 0,
          }
        : { ok: false, status: "fail", anomalyType: "stable", violations: null, raw: strictEval.output || strictEval.error },
      exits: {
        warn: warnEval.exitCode,
        strict: strictEval.exitCode,
      },
    };
  },

  "/api/control/features": (req: Request) => ({
    features: resolveAllFeatures(req),
  }),

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

  "/api/control/protocol-scorecard": () => getProtocolScorecard(),
  
  "/api/run/:id": async (req: Request) => {
    const url = new URL(req.url);
    const id = url.pathname.split("/").pop();

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
      const scorecard = routes["/api/control/protocol-scorecard"]();
      return new Response(JSON.stringify({
        success: true,
        output: JSON.stringify(scorecard, null, 2),
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
    };
    
    const scriptName = scriptMap[id || ""] || id;
    
    // Run the demo script from the parent demos directory
    const demoScript = join(import.meta.dir, "..", "playground", "demos", `${scriptName}.ts`);
    
    try {
      const { output, error, exitCode } = await runCommand(["bun", "run", demoScript], import.meta.dir);
      
      return new Response(JSON.stringify({
        success: exitCode === 0,
        output: output || (exitCode === 0 ? "Demo completed successfully!" : ""),
        error: error || undefined,
        exitCode,
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
        return jsonResponse({
          ...routes["/api/info"](),
          runtime: {
            dedicatedPort: DEDICATED_PORT,
            portRange: PORT_RANGE,
            maxConcurrentRequests: MAX_CONCURRENT_REQUESTS,
            maxCommandWorkers: MAX_COMMAND_WORKERS,
            inFlightRequests,
            activeCommands,
          },
        });
      }
      
      if (url.pathname === "/api/demos") {
        return jsonResponse(routes["/api/demos"]());
      }

      if (url.pathname === "/api/brand/status") {
        return jsonResponse(await routes["/api/brand/status"]());
      }

      if (url.pathname === "/api/control/network-smoke") {
        return jsonResponse(await routes["/api/control/network-smoke"](req));
      }

      if (url.pathname === "/api/control/features") {
        return jsonResponse(routes["/api/control/features"](req));
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
        return jsonResponse(routes["/api/control/protocol-scorecard"]());
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
      "/styles.css": { file: "styles.css", contentType: "text/css" },
      "/app.js": { file: "app.js", contentType: "application/javascript" },
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

const ACTIVE_PORT = await resolvePort();
const warmupState = await runWarmup();

// Serve the application
serve({
  port: ACTIVE_PORT,
  fetch: handleRequest,
});

console.log(`🚀 Bun v1.3.9 Browser Playground`);
console.log(`📡 Server running at http://localhost:${ACTIVE_PORT}`);
console.log(`🌐 Open http://localhost:${ACTIVE_PORT} in your browser`);
console.log(
  `🧰 Pooling: maxRequests=${MAX_CONCURRENT_REQUESTS} maxCommandWorkers=${MAX_COMMAND_WORKERS} range=${PORT_RANGE}`
);
console.log(
  `🛰️ Warmup: prefetch=${warmupState.prefetch.length} preconnect=${warmupState.preconnect.length} enabled=${!warmupState.skipped}`
);
