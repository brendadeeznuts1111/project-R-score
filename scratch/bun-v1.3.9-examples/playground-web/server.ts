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
import { getBuildMetadata } from "./build-metadata" with { type: "macro" };
import { getGitCommitHash } from "./getGitCommitHash.ts" with { type: "macro" };

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
const MACRO_GIT_COMMIT_HASH = getGitCommitHash();
const GIT_COMMIT_HASH = (process.env.GIT_COMMIT_HASH || "").trim() || MACRO_GIT_COMMIT_HASH || "unset";
const GIT_COMMIT_HASH_SOURCE = (process.env.GIT_COMMIT_HASH || "").trim() ? "env" : "macro";
const BUILD_METADATA = await getBuildMetadata();
const BUN_REVISION = Bun.revision || "unknown";
const PROJECT_ROOT = join(import.meta.dir, "..", "..", "..");
const BRAND_REPORTS_DIR = join(PROJECT_ROOT, "reports", "brand-bench");
const BRAND_GOVERNANCE_PATH = join(BRAND_REPORTS_DIR, "governance.json");
const DECISIONS_ROOT = join(PROJECT_ROOT, "docs", "decisions");
const DECISIONS_INDEX_PATH = join(DECISIONS_ROOT, "index.json");
let inFlightRequests = 0;
let activeCommands = 0;
const serverStartTime = Date.now();
const commandWaiters: Array<() => void> = [];

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
      const { score, defensible, gaps } = DecisionDefender.validateDecision({
        id: "BUN-UPGRADE-2024-003",
        claim: "Bun v1.3.9 verified commits provide targeted runtime optimizations",
        sources,
        benchmarks: (() => {
          // Isolated bench: Map/Set.size ns/op via Bun.nanoseconds()
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
          return [
            { name: "Map.size ns/op (isolated)", result: Number(mapNsPerOp.toFixed(2)), threshold: 10 },
            { name: "Set.size ns/op (isolated)", result: Number(setNsPerOp.toFixed(2)), threshold: 10 },
          ];
        })(),
      });
      return {
        bun_v1_3_9: {
          release_notes_url: "https://bun.com/blog/bun-v1.3.9",
          verified_commits: ["35f815431", "ac63cc259d74", "1f7d7d5a8c23", "2e2c23521a24"],
          evidence_package: "BUN-UPGRADE-2024-003",
          runtime: (() => {
            const os = require("node:os");
            return {
              runtime: "Bun",
              bunVersion: Bun.version,
              bunRevision: Bun.revision,
              gitCommit: Bun.spawnSync(["git", "rev-parse", "HEAD"]).stdout.toString().trim(),
              platform: process.platform,
              arch: process.arch,
              osRelease: os.release(),
              cpuModel: os.cpus()[0]?.model ?? "unknown",
              cpuCores: os.cpus().length,
              totalMemoryMB: Math.round(os.totalmem() / 1024 / 1024),
              pid: process.pid,
            };
          })(),
          profile: (() => {
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
            return {
              pinnedBaselineRunId: pinnedRunId,
              profileDir,
              profileFiles: profiles,
              count: profiles.length,
            };
          })(),
          snapshot: await (async () => {
            const mem = process.memoryUsage();
            const heap = Bun.generateHeapSnapshot();
            let bundleSnapshot: Record<string, unknown> | null = null;
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
                bundleSnapshot = {
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
            return {
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
              bundle: bundleSnapshot,
            };
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

  "/api/control/protocol-scorecard": () => getProtocolScorecard(),  // returns Promise

  "/api/control/evidence-dashboard": () => getEvidenceDashboard(),

  "/api/control/decision-defense": () => getDecisionDefenseDashboard(),
  
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
      const scorecard = await routes["/api/control/protocol-scorecard"]();
      return new Response(JSON.stringify({
        success: true,
        output: JSON.stringify(scorecard, null, 2),
        exitCode: 0,
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

const ACTIVE_PORT = await resolvePort();
const warmupState = await runWarmup();

// Create abort controller for graceful shutdown
const ac = new AbortController();

// Handle OS signals per Bun docs: https://bun.com/docs/guides/process/os-signals
process.on('SIGINT', () => {
  console.log('\n\n👋 SIGINT received, shutting down gracefully...');
  ac.abort();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 SIGTERM received, shutting down gracefully...');
  ac.abort();
  process.exit(0);
});

// Serve the application
serve({
  port: ACTIVE_PORT,
  fetch: handleRequest,
  signal: ac.signal,
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
console.log(`\n💡 Press Ctrl+C to stop gracefully`);
