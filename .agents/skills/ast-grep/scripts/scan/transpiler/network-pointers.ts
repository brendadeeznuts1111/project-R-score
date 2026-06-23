/** Navigation index for supply-chain network loop — flags, modules, scripts, baselines, ground truth. */

import { BASELINE_SCHEMA_VERSION } from "./network-baseline.ts";
import { DEFAULT_SCANNER_VERSION } from "./snapshot.ts";

export const NETWORK_DOC_POINTERS = {
  fetch: "https://bun.com/docs/runtime/networking/fetch",
  websocket: "https://bun.com/docs/runtime/networking/websocket",
  tcp: "https://bun.com/docs/runtime/networking/tcp",
  dns: "https://bun.com/docs/runtime/networking/dns",
  openapi: "https://swagger.io/specification/",
  layer45: "bundle-threat-profiles.json#supply-chain-network-dist",
  semver: "https://bun.com/docs/runtime/semver",
  secrets: "https://bun.com/docs/runtime/secrets",
  snapshotPolicy: "policies/security.policy.toml",
} as const;

export type GroundTruthKind =
  | "baseline"
  | "policy"
  | "profile"
  | "catalog"
  | "openapi"
  | "schema"
  | "test"
  | "registry";

export type GroundTruthReference = {
  id: string;
  path: string;
  kind: GroundTruthKind;
  role: string;
  /** Pinned counts or versions used for drift gates and regression tests. */
  pinned?: Record<string, string | number | boolean>;
};

/**
 * Repo-local canonical sources — baselines, policies, shapes, and golden fixtures.
 * Prefer these over ad-hoc dist scans when asserting drift or writing tests.
 */
export const NETWORK_GROUND_TRUTH_REFERENCES: GroundTruthReference[] = [
  {
    id: "sports-terminal-snapshot",
    path: "baselines/sports-terminal-os/snapshot.json",
    kind: "baseline",
    role: "Golden DoctorSnapshotV2 network section for sports-terminal-os",
    pinned: {
      snapshotVersion: "2.0.0",
      endpointCount: 22,
      routeCount: 22,
      healthRouteCount: 3,
      networkUnique: 20,
      networkRaw: 102,
      scanPath: "projects/active/sports-terminal-os/dist/frontend",
    },
  },
  {
    id: "sports-terminal-openapi",
    path: "projects/active/sports-terminal-os/openapi.json",
    kind: "openapi",
    role: "Live API catalog source — auto-discovered near --path dist/frontend",
    pinned: { routeFingerprints: 22 },
  },
  {
    id: "network-baseline-schema",
    path: "scripts/scan/transpiler/network-baseline.ts",
    kind: "schema",
    role: "NetworkBaseline + NetworkBaselineDelta + json5 reader",
    pinned: { schemaVersion: BASELINE_SCHEMA_VERSION },
  },
  {
    id: "snapshot-network-shape",
    path: "scripts/scan/transpiler/expect-shape-catalog.ts",
    kind: "schema",
    role: "expectSnapshotNetworkSection required keys",
    pinned: { shapeId: "snapshot-network-section" },
  },
  {
    id: "security-policy-network",
    path: "policies/security.policy.toml",
    kind: "policy",
    role: "Layer network rules — fetch, WebSocket, TCP, DNS, UDP",
    pinned: {
      ruleIds: "fetch-call,http-client,websocket-constructor,dns-lookup,tcp-listen,tcp-connect,udp-socket",
    },
  },
  {
    id: "network-dist-profile",
    path: "bundle-threat-profiles.json",
    kind: "profile",
    role: "supply-chain-network-dist — dist heatmap + endpoint_meta",
    pinned: {
      profile: "supply-chain-network-dist",
      network_audit: true,
      network_dedupe: true,
      endpoint_meta: true,
      max_file_kb: 4096,
    },
  },
  {
    id: "supply-chain-layers",
    path: "supply-chain-layers.json",
    kind: "catalog",
    role: "Layer 4.5 stack entry — NetworkMatcher, bundle-scanner, rule-engine",
    pinned: { layer: "4.5", scannerVersion: DEFAULT_SCANNER_VERSION },
  },
  {
    id: "skill-loop-registry",
    path: "skill-loop-registry.json",
    kind: "registry",
    role: "Per-skill network phase scanPath/domain for ast-grep + sports-terminal-os",
  },
  {
    id: "integration-network-tests",
    path: "tests/integration/concurrent-platform-network.test.ts",
    kind: "test",
    role: "Loop, baseline diff, herdr-tab, sports-terminal dist regression",
  },
  {
    id: "unit-network-dry-run",
    path: "tests/unit/network-loop-dry-run.test.ts",
    kind: "test",
    role: "runNetworkAuditOnce, seed, pointers, formatters",
  },
  {
    id: "bun-test-profile-network",
    path: "bun-test-profiles.json",
    kind: "catalog",
    role: "Domain preset — EndpointCatalog + platform network integration",
    pinned: { profile: "network" },
  },
];

export const NETWORK_STANDARDS = {
  schemas: {
    networkBaseline: { version: BASELINE_SCHEMA_VERSION, deltaFields: [
      "endpoints_added", "endpoints_removed", "routes_added", "routes_removed",
      "network_unique_delta", "health_status", "drift",
    ] },
    doctorSnapshot: { version: "2.0.0", compatibleRange: "^2.0.0", scannerVersion: DEFAULT_SCANNER_VERSION },
    auditResult: { schemaVersion: 1, tool: "supply-chain-network", modes: ["dry-run", "loop", "pointers"] },
    routeFingerprint: { format: "METHOD /path", example: "GET /api/health" },
  },
  drift: {
    triggers: ["added_routes", "removed_routes", "endpoints_added", "endpoints_removed"],
    healthStatus: ["stable", "changed", "degraded", "unknown"] as const,
    failOnDrift: "loop only — ignored in --dry-run",
  },
  health: {
    overall: ["healthy", "degraded", "unreachable"] as const,
    pathPattern: "^/api/health|^/health",
    endpointKinds: ["health", "metrics", "proxy", "api"] as const,
    probeFields: ["url", "ok", "status", "latency_ms"],
  },
  surfaces: ["fetch", "http_client", "websocket", "dns", "tcp", "udp", "spawn", "external_import"] as const,
  output: {
    dryRunFormats: ["table", "json", "herdr"] as const,
    loopStdout: ["json", "herdr-tab", "markdown report on initial tick"],
    quietOverrides: ["verbose", "dashboard", "dry-run table"],
  },
  seed: {
    autoBeforeLoop: "when no baseline and not --no-seed",
    writes: ["baselines/<domain>/snapshot.json#network", "baselines/<domain>/network-baseline.json5"],
    force: "--seed refreshes even when baseline exists",
  },
  policy: {
    file: "policies/security.policy.toml",
    networkRuleIds: [
      "fetch-call", "http-client", "websocket-constructor", "dns-lookup",
      "tcp-listen", "tcp-connect", "udp-socket",
    ],
  },
  expectShapes: ["bundle-scan-report", "doctor-snapshot-v2", "snapshot-network-section"],
} as const;

export type NetworkModulePointer = {
  id: string;
  path: string;
  role: string;
};

/** Module → file pointers (relative to skill root). */
export const NETWORK_MODULE_POINTERS: NetworkModulePointer[] = [
  { id: "cli", path: "scripts/network-cli.ts", role: "CLI entry — dry-run, seed, loop, output formats" },
  { id: "loop", path: "scripts/scan/transpiler/network-loop.ts", role: "runNetworkAuditOnce, runNetworkAuditLoop, buildTick" },
  { id: "seed", path: "scripts/scan/transpiler/network-seed.ts", role: "seedNetworkBaseline before loop; merge snapshot network section" },
  { id: "audit-result", path: "scripts/scan/transpiler/network-audit-result.ts", role: "NetworkAuditResult + table/json/herdr formatters" },
  { id: "baseline", path: "scripts/scan/transpiler/network-baseline.ts", role: "captureBaselineFromReport, diffAgainstBaseline, json5 I/O" },
  { id: "snapshot-network", path: "scripts/scan/transpiler/snapshot-network.ts", role: "loadDomainBaseline, baselineToSnapshotNetwork" },
  { id: "endpoint-catalog", path: "scripts/scan/transpiler/endpoint-catalog.ts", role: "OpenAPI parse, health probes, route classification" },
  { id: "network-matcher", path: "scripts/scan/transpiler/network-matcher.ts", role: "Dist heatmap — fetch/WebSocket/TCP surfaces" },
  { id: "bundle-scanner", path: "scripts/scan/transpiler/bundle-scanner.ts", role: "runBundleScan — Layer 4.5 report with network + endpoints" },
  { id: "herdr-tab", path: "scripts/scan/transpiler/herdr-tab.ts", role: "Herdr tab + loop JSON fingerprints" },
  { id: "loop-color", path: "scripts/scan/transpiler/loop-color.ts", role: "Colored stderr dashboard lines" },
  { id: "health-secrets", path: "scripts/scan/transpiler/health-secrets.ts", role: "Bun.secrets health URL resolution" },
  { id: "profile", path: "bundle-threat-profiles.json", role: "supply-chain-network-dist profile tuning" },
  { id: "helper", path: "scripts/ast_grep_helper.py", role: "bun supply-chain network — Python wrapper" },
  { id: "ground-truth", path: "scripts/scan/transpiler/network-ground-truth-validator.ts", role: "validateNetworkGroundTruth + compareAuditToGroundTruth" },
  { id: "snapshot-bench", path: "scripts/scan/transpiler/snapshot-bench-loop.ts", role: "runSnapshotBenchLoop — phase timings + pass_rate rating" },
  { id: "close-loop", path: "scripts/scan/transpiler/close-loop.ts", role: "runCloseLoop — ground-truth → bench-snapshot → baseline diff/write" },
  { id: "close-loop-effect", path: "scripts/scan/transpiler/effect/", role: "Effect layer — CloseLoopEngine Tag, TaggedError, Stream, Schema" },
  { id: "skill-loop-cli", path: "scripts/skill-loop-cli.ts", role: "bench-snapshot, full --preset snapshot-bench" },
  { id: "mcp", path: "mcp/ast-grep-mcp.ts", role: "ast_grep_network + ast_grep_skill_loop MCP tools" },
];

export type NetworkScriptPointer = {
  id: string;
  cmd: string;
  note: string;
};

export const NETWORK_SCRIPT_POINTERS: NetworkScriptPointer[] = [
  { id: "dry-run", cmd: "bun run supply-chain:network:dry-run", note: "Single audit, table + verbose catalog" },
  { id: "seed", cmd: "bun run supply-chain:network:seed", note: "Capture baselines/<domain>/ snapshot + legacy json5" },
  { id: "loop", cmd: "bun run supply-chain:network:loop", note: "Health probes + dist watch" },
  { id: "loop-herdr", cmd: "bun run supply-chain:network:loop:herdr", note: "Loop with Herdr tab stdout" },
  { id: "dist-scan", cmd: "bun run supply-chain:network:dist", note: "One-shot markdown report on dist" },
  { id: "snapshot-capture", cmd: "bun run supply-chain:snapshot:capture:net", note: "Full snapshot.json with network section" },
  { id: "test-network", cmd: "bun run test:bun:network", note: "bun-test-profiles.json network domain preset" },
  { id: "validate", cmd: "bun run supply-chain:network:validate", note: "Ground-truth + standards compliance gate" },
  { id: "bench-snapshot", cmd: "bun run skill-loop:bench-snapshot", note: "Repeated snapshot validate + live network drift rate bench" },
  { id: "bench-snapshot-plan", cmd: "bun run skill-loop:bench-snapshot:plan", note: "Dry-run --explain per-iteration pipeline" },
  { id: "snapshot-bench-preset", cmd: "bun run loop:snapshot-bench", note: "full --preset snapshot-bench (registry benchSnapshot)" },
  { id: "snapshot-bench-plan", cmd: "bun run loop:snapshot-bench:plan", note: "Preset dry-run with substeps" },
  { id: "bench-snapshot-ci", cmd: "bun run skill-loop:bench-snapshot:ci", note: "CI gate: 3× pass + fail-on-rating ≥70" },
  { id: "close-loop", cmd: "bun run close-loop", note: "Ground-truth gate → bench-snapshot → baseline diff" },
  { id: "close-loop-plan", cmd: "bun run close-loop:plan", note: "Dry-run closed-loop pipeline" },
  { id: "close-loop-ci", cmd: "bun run close-loop:ci", note: "CI shell gate with fail-on-rating" },
  { id: "loop-close-loop", cmd: "bun run loop:close-loop", note: "Registry preset close-loop with baseline write" },
  { id: "loop-close-loop-plan", cmd: "bun run loop:close-loop:plan", note: "Preset dry-run closed-loop" },
];

export const NETWORK_BASELINE_POINTERS = {
  snapshot: "baselines/<domain>/snapshot.json",
  legacy: "baselines/<domain>/network-baseline.json5",
  sportsTerminal: "baselines/sports-terminal-os/snapshot.json",
} as const;

export const NETWORK_FLOW_POINTERS = [
  "seed → baselines/<domain>/snapshot.json + network-baseline.json5",
  "dry-run → runNetworkAuditOnce → table | json | herdr",
  "loop → seed (auto if missing) → initial tick → watch/probe ticks → delta vs baseline",
  "skill-loop network phase → runNetworkAuditOnce + compareAuditToGroundTruth",
  "snapshot-bench preset → runSnapshotBenchLoop ×N — skill-loop-registry.json presets.snapshot-bench",
  "close-loop → validateNetworkGroundTruth → bench-snapshot → diffLoopBaselines → writeLoopBaseline",
] as const;

export const NETWORK_CLI_FLAGS_HELP = `
supply-chain network flags:
  --path, -p          Dist/bundle scan path (required)
  --domain            Baseline domain id (default: inferred from --path)
  --profile           supply-chain-network-dist (default) | supply-chain-network
  --dry-run, -n       Single audit, emit summary, exit (no loop/probes/watch)
  --seed              Capture snapshot+baseline before --loop (or seed-only exit)
  --no-seed           Skip auto-seed when no baseline exists
  --verbose, -v       Endpoint/route catalog in dry-run or loop stderr
  --quiet, -q         Errors only (overrides --verbose)
  --output            Dry-run format: table (default) | json | herdr
  --loop              Continuous audit — health probes + optional watch
  --watch             With --loop: re-scan dist on file changes
  --health-url        Probe live health during scan/loop
  --health-url-secret DOMAIN/NAME   Resolve health URL via Bun.secrets
  --baseline          Override network-baseline.json5 path
  --snapshot          Override baselines/<domain>/snapshot.json path
  --baseline-write    Write legacy baseline on initial loop tick
  --snapshot-write    Merge network section into snapshot on initial tick
  --fail-on-health    Exit 1 when health degraded/unreachable (loop only)
  --fail-on-drift     Exit 1 when route catalog drifts (loop only)
  --json              Loop/dry-run JSON stdout (--output json for dry-run)
  --herdr-tab         Herdr-formatted stdout
  --no-color          Plain stderr loop lines
  --watch-interval    Dist poll ms (default: 750)
  --probe-interval    Health probe ms (default: 8000)
  --pointers          Print module/ground-truth/standards index
  --validate-ground-truth   Verify repo references + pinned golden counts
  --check-standards   Alias for --validate-ground-truth
`.trim();

export function formatNetworkModulePointers(): string {
  const lines = ["modules:"];
  for (const m of NETWORK_MODULE_POINTERS) {
    lines.push(`  ${m.id.padEnd(18)} ${m.path}`);
    lines.push(`    ${m.role}`);
  }
  return lines.join("\n");
}

export function formatNetworkGroundTruthPointers(): string {
  const lines = ["ground-truth (repo):"];
  for (const g of NETWORK_GROUND_TRUTH_REFERENCES) {
    lines.push(`  ${g.id.padEnd(28)} [${g.kind}] ${g.path}`);
    lines.push(`    ${g.role}`);
    if (g.pinned) {
      const bits = Object.entries(g.pinned).map(([k, v]) => `${k}=${v}`).join(" ");
      lines.push(`    pinned: ${bits}`);
    }
  }
  return lines.join("\n");
}

export function formatNetworkStandards(): string {
  const s = NETWORK_STANDARDS;
  return [
    "standards:",
    `  baseline schema     v${s.schemas.networkBaseline.version}`,
    `  snapshot            ${s.schemas.doctorSnapshot.version} (range ${s.schemas.doctorSnapshot.compatibleRange})`,
    `  route fingerprint   ${s.schemas.routeFingerprint.format}`,
    `  drift triggers      ${s.drift.triggers.join(", ")}`,
    `  health overall      ${s.health.overall.join(" | ")}`,
    `  endpoint kinds      ${s.health.endpointKinds.join(", ")}`,
    `  network surfaces    ${s.surfaces.join(", ")}`,
    `  policy rules        ${s.policy.networkRuleIds.join(", ")}`,
    `  expect shapes       ${s.expectShapes.join(", ")}`,
    `  seed                ${s.seed.autoBeforeLoop}`,
  ].join("\n");
}

export function formatNetworkScriptPointers(): string {
  const lines = ["scripts:"];
  for (const s of NETWORK_SCRIPT_POINTERS) {
    lines.push(`  ${s.id.padEnd(14)} ${s.cmd}`);
    lines.push(`    ${s.note}`);
  }
  return lines.join("\n");
}

export function formatNetworkPointersText(): string {
  return [
    NETWORK_CLI_FLAGS_HELP,
    "",
    formatNetworkModulePointers(),
    "",
    formatNetworkScriptPointers(),
    "",
    "baselines:",
    `  snapshot  ${NETWORK_BASELINE_POINTERS.snapshot}`,
    `  legacy    ${NETWORK_BASELINE_POINTERS.legacy}`,
    `  example   ${NETWORK_BASELINE_POINTERS.sportsTerminal}`,
    "",
    "flow:",
    ...NETWORK_FLOW_POINTERS.map((f) => `  ${f}`),
    "",
    formatNetworkGroundTruthPointers(),
    "",
    formatNetworkStandards(),
    "",
    "docs:",
    ...Object.entries(NETWORK_DOC_POINTERS).map(([k, v]) => `  ${k.padEnd(12)} ${v}`),
    "",
    "run: bun scripts/network-cli.ts --help",
    "run: python3 scripts/ast_grep_helper.py bun supply-chain network --path dist/frontend --dry-run",
  ].join("\n");
}

export function formatNetworkPointersJson(): string {
  return JSON.stringify({
    schemaVersion: 1,
    tool: "supply-chain-network",
    mode: "pointers",
    flagsHelp: NETWORK_CLI_FLAGS_HELP,
    modules: NETWORK_MODULE_POINTERS,
    scripts: NETWORK_SCRIPT_POINTERS,
    baselines: NETWORK_BASELINE_POINTERS,
    flow: NETWORK_FLOW_POINTERS,
    groundTruth: NETWORK_GROUND_TRUTH_REFERENCES,
    standards: NETWORK_STANDARDS,
    docs: NETWORK_DOCS_POINTERS_JSON(),
  }, null, 2);
}

export function getGroundTruthReference(id: string): GroundTruthReference | undefined {
  return NETWORK_GROUND_TRUTH_REFERENCES.find((g) => g.id === id);
}

function NETWORK_DOCS_POINTERS_JSON(): Record<string, string> {
  return { ...NETWORK_DOC_POINTERS };
}

export function getNetworkModulePointer(id: string): NetworkModulePointer | undefined {
  return NETWORK_MODULE_POINTERS.find((m) => m.id === id);
}