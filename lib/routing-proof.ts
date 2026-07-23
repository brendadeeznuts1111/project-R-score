// @see https://bun.com/docs/runtime/utils — Bun.inspect.table
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/networking/fetch
// @see https://bun.com/docs/runtime/file-io — Bun.file
/**
 * Registry / portal routing proof — concurrent probes, latency stats,
 * regression vs previous artifact, SHA-256 fingerprint.
 *
 * Default base: score.factory-wager.com
 * Artifact: public/registry/@factorywager/routing-test/latest.json
 */
import { existsSync, readFileSync } from 'node:fs';
import { canonicalJson, sha256Hex } from './bun-utils-proof.ts';

export const ROUTING_ARTIFACT_PACKAGE = '@factorywager/routing-test';
export const ROUTING_ARTIFACT_REL = `public/registry/${ROUTING_ARTIFACT_PACKAGE}/latest.json`;

export type RoutingProbeSpec = {
  path: string;
  /** When set, status must match (or be in list) for pass. */
  expectedStatus?: number | number[];
  /** When true (default for most), any 2xx is pass. */
  requireOk?: boolean;
  /** Soft content-type prefix check when status is 2xx (e.g. "application/json"). */
  expectContentType?: string;
  /** Critical path — failures fail the overall proof harder / surface in ops. */
  critical?: boolean;
  note?: string;
};

export type RoutingProbeResult = {
  path: string;
  status: number | 'ERR';
  ok: boolean;
  pass: boolean;
  critical: boolean;
  timeMs: number;
  contentType: string;
  error?: string;
  note?: string;
};

export type LatencyStats = {
  minMs: number;
  maxMs: number;
  meanMs: number;
  p50Ms: number;
  p95Ms: number;
};

export type RoutingRegression = {
  path: string;
  kind: 'status' | 'pass' | 'latency';
  detail: string;
};

export type RoutingProofResult = {
  schemaVersion: 2;
  bunVersion: string;
  bunRevision: string;
  baseUrl: string;
  timestamp: string;
  concurrency: number;
  probes: RoutingProbeResult[];
  latency: LatencyStats;
  summary: {
    total: number;
    passed: number;
    failed: number;
    httpOk: number;
    criticalFailed: number;
    criticalFailedPaths: string[];
  };
  /** Diff vs previous latest.json (when available). */
  regression?: {
    previousTimestamp?: string;
    previousProofHash?: string;
    changes: RoutingRegression[];
  };
  proofHash?: string;
};

/** Compact slice embedded in ops-summary / portal. */
export type RoutingOpsSlice = {
  available: boolean;
  baseUrl: string;
  passed: number;
  total: number;
  failed: number;
  httpOk: number;
  criticalFailed: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
  proofHash: string;
  timestamp: string;
  regressions: number;
  criticalFailedPaths: string[];
};

export type RunRoutingProofOpts = {
  baseUrl?: string;
  specs?: RoutingProbeSpec[];
  fetchImpl?: typeof fetch;
  now?: () => Date;
  bunVersion?: string;
  bunRevision?: string;
  /** Parallel probes (default 6). */
  concurrency?: number;
  /** Previous proof for regression (auto-loaded from disk when omitted). */
  previous?: RoutingProofResult | null;
  /** Skip loading previous artifact from disk. */
  noPrevious?: boolean;
  /** Latency regression threshold multiplier vs previous timeMs (default 2.5). */
  latencyRegressionFactor?: number;
  /** Absolute ms floor before latency regression counts (default 250). */
  latencyRegressionFloorMs?: number;
};

/** FactoryWager Pages + portal routes (aligned with production surface). */
export const DEFAULT_ROUTING_SPECS: RoutingProbeSpec[] = [
  { path: '/health', requireOk: true, note: 'may be SPA HTML' },
  { path: '/ready', requireOk: true, note: 'may be SPA HTML' },
  { path: '/api/registry', expectedStatus: 400, requireOk: false, note: 'empty key → 400' },
  {
    path: '/api/registry/@factorywager/test-pkg',
    expectedStatus: [404, 503],
    requireOk: false,
    note: 'placeholder package',
  },
  {
    path: '/api/registry/@factorywager/bun-utils-test/latest.json',
    expectedStatus: [200, 404, 503],
    requireOk: false,
    note: 'R2 optional; static path preferred',
  },
  {
    path: '/api/registry/@factorywager/routing-test/latest.json',
    expectedStatus: [200, 404, 503],
    requireOk: false,
    note: 'R2 optional',
  },
  {
    path: '/api/operations/summary',
    requireOk: true,
    expectContentType: 'application/json',
    critical: true,
    note: 'ops snapshot/live',
  },
  {
    path: '/api/monitoring',
    requireOk: true,
    expectContentType: 'application/json',
    critical: true,
    note: 'monitoring payload',
  },
  { path: '/monitoring', requireOk: true },
  { path: '/portal', requireOk: true },
  {
    path: '/portal/ops/',
    requireOk: true,
    critical: true,
    note: 'ops dashboard',
  },
  {
    path: '/registry/ops-summary.json',
    requireOk: true,
    expectContentType: 'application/json',
    critical: true,
    note: 'static ops metrics',
  },
  {
    path: '/registry/@factorywager/bun-utils-test/latest.json',
    requireOk: true,
    expectContentType: 'application/json',
    critical: true,
    note: 'static bun utils proof',
  },
  {
    path: '/registry/@factorywager/routing-test/latest.json',
    expectedStatus: [200, 404],
    requireOk: false,
    note: 'this artifact (404 until first --write deploy)',
  },
];

function statusMatches(status: number | 'ERR', expected: number | number[]): boolean {
  if (status === 'ERR') return false;
  if (Array.isArray(expected)) return expected.includes(status);
  return status === expected;
}

function probePasses(
  spec: RoutingProbeSpec,
  status: number | 'ERR',
  httpOk: boolean,
  contentType: string
): boolean {
  if (spec.expectedStatus != null) {
    if (!statusMatches(status, spec.expectedStatus)) return false;
  } else if (spec.requireOk === false) {
    if (status === 'ERR') return false;
  } else if (!httpOk) {
    return false;
  }

  if (spec.expectContentType && httpOk) {
    if (!contentType.startsWith(spec.expectContentType)) return false;
  }
  return true;
}

export function computeLatencyStats(times: number[]): LatencyStats {
  if (times.length === 0) {
    return { minMs: 0, maxMs: 0, meanMs: 0, p50Ms: 0, p95Ms: 0 };
  }
  const sorted = [...times].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const pct = (p: number) => {
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
    return sorted[idx]!;
  };
  return {
    minMs: sorted[0]!,
    maxMs: sorted[sorted.length - 1]!,
    meanMs: Math.round((sum / sorted.length) * 100) / 100,
    p50Ms: pct(50),
    p95Ms: pct(95),
  };
}

export async function probeEndpoint(
  baseUrl: string,
  spec: RoutingProbeSpec,
  fetchImpl: typeof fetch = fetch
): Promise<RoutingProbeResult> {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const url = new URL(spec.path.replace(/^\//, ''), base);
  const t0 = performance.now();
  try {
    const res = await fetchImpl(url, { redirect: 'follow' });
    const timeMs = Math.round((performance.now() - t0) * 100) / 100;
    const status = res.status;
    const httpOk = res.ok;
    const contentType = res.headers.get('content-type')?.split(';')[0]?.trim() || '';
    return {
      path: spec.path,
      status,
      ok: httpOk,
      pass: probePasses(spec, status, httpOk, contentType),
      critical: Boolean(spec.critical),
      timeMs,
      contentType,
      note: spec.note,
    };
  } catch (e) {
    return {
      path: spec.path,
      status: 'ERR',
      ok: false,
      pass: probePasses(spec, 'ERR', false, ''),
      critical: Boolean(spec.critical),
      timeMs: 0,
      contentType: '',
      error: e instanceof Error ? e.message : String(e),
      note: spec.note,
    };
  }
}

/** Bounded parallel map preserving order. */
export async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) break;
      results[i] = await fn(items[i]!, i);
    }
  });
  await Promise.all(workers);
  return results;
}

export function compareRoutingProofs(
  current: Pick<RoutingProofResult, 'probes'>,
  previous: Pick<RoutingProofResult, 'probes' | 'timestamp' | 'proofHash'>,
  opts: { latencyFactor?: number; latencyFloorMs?: number } = {}
): RoutingRegression[] {
  const factor = opts.latencyFactor ?? 2.5;
  const floor = opts.latencyFloorMs ?? 250;
  const prevByPath = new Map(previous.probes.map(p => [p.path, p]));
  const changes: RoutingRegression[] = [];

  for (const cur of current.probes) {
    const prev = prevByPath.get(cur.path);
    if (!prev) continue;

    if (String(cur.status) !== String(prev.status)) {
      changes.push({
        path: cur.path,
        kind: 'status',
        detail: `${prev.status} → ${cur.status}`,
      });
    }
    if (cur.pass !== prev.pass) {
      changes.push({
        path: cur.path,
        kind: 'pass',
        detail: prev.pass ? 'pass → FAIL' : 'FAIL → pass',
      });
    }
    if (
      prev.timeMs >= floor &&
      cur.timeMs >= floor &&
      cur.timeMs > prev.timeMs * factor
    ) {
      changes.push({
        path: cur.path,
        kind: 'latency',
        detail: `${prev.timeMs}ms → ${cur.timeMs}ms (>${factor}x)`,
      });
    }
  }
  return changes;
}

export async function loadPreviousRoutingProof(
  path: string = ROUTING_ARTIFACT_REL
): Promise<RoutingProofResult | null> {
  try {
    const file = Bun.file(path);
    if (!(await file.exists())) return null;
    const data = (await file.json()) as RoutingProofResult;
    if (!data || !Array.isArray(data.probes)) return null;
    return data;
  } catch {
    return null;
  }
}

export async function runRoutingProof(opts: RunRoutingProofOpts = {}): Promise<RoutingProofResult> {
  const baseUrl =
    opts.baseUrl ||
    Bun.env.REGISTRY_URL ||
    Bun.env.FACTORY_REGISTRY_URL ||
    'https://score.factory-wager.com';
  const specs = opts.specs ?? DEFAULT_ROUTING_SPECS;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const now = opts.now?.() ?? new Date();
  const concurrency = opts.concurrency ?? Number(Bun.env.ROUTING_PROOF_CONCURRENCY || 6);

  const previous =
    opts.previous !== undefined
      ? opts.previous
      : opts.noPrevious
        ? null
        : await loadPreviousRoutingProof();

  const probes = await mapPool(specs, concurrency, spec =>
    probeEndpoint(baseUrl, spec, fetchImpl)
  );

  const passed = probes.filter(p => p.pass).length;
  const httpOk = probes.filter(p => p.ok).length;
  const criticalFailedPaths = probes.filter(p => p.critical && !p.pass).map(p => p.path);
  const latency = computeLatencyStats(probes.map(p => p.timeMs));

  const body: RoutingProofResult = {
    schemaVersion: 2,
    bunVersion: opts.bunVersion ?? Bun.version,
    bunRevision: opts.bunRevision ?? (Bun.revision || 'unknown'),
    baseUrl,
    timestamp: now.toISOString(),
    concurrency,
    probes,
    latency,
    summary: {
      total: probes.length,
      passed,
      failed: probes.length - passed,
      httpOk,
      criticalFailed: criticalFailedPaths.length,
      criticalFailedPaths,
    },
  };

  if (previous) {
    const changes = compareRoutingProofs(body, previous, {
      latencyFactor: opts.latencyRegressionFactor,
      latencyFloorMs: opts.latencyRegressionFloorMs,
    });
    body.regression = {
      previousTimestamp: previous.timestamp,
      previousProofHash: previous.proofHash,
      changes,
    };
  }

  // Hash without proofHash; exclude volatile regression? Include it for audit of "what we compared".
  const proofHash = sha256Hex(canonicalJson(body));
  return { ...body, proofHash };
}

export function routingToOpsSlice(proof: RoutingProofResult | null | undefined): RoutingOpsSlice {
  if (!proof?.probes?.length) {
    return {
      available: false,
      baseUrl: '',
      passed: 0,
      total: 0,
      failed: 0,
      httpOk: 0,
      criticalFailed: 0,
      p50Ms: 0,
      p95Ms: 0,
      maxMs: 0,
      proofHash: '',
      timestamp: '',
      regressions: 0,
      criticalFailedPaths: [],
    };
  }
  return {
    available: true,
    baseUrl: proof.baseUrl,
    passed: proof.summary.passed,
    total: proof.summary.total,
    failed: proof.summary.failed,
    httpOk: proof.summary.httpOk,
    criticalFailed: proof.summary.criticalFailed,
    p50Ms: proof.latency.p50Ms,
    p95Ms: proof.latency.p95Ms,
    maxMs: proof.latency.maxMs,
    proofHash: proof.proofHash ?? '',
    timestamp: proof.timestamp,
    regressions: proof.regression?.changes.length ?? 0,
    criticalFailedPaths: proof.summary.criticalFailedPaths,
  };
}

/** Sync load of last written artifact for ops-summary (no network). */
export function loadRoutingOpsSliceSync(path: string = ROUTING_ARTIFACT_REL): RoutingOpsSlice {
  try {
    if (!existsSync(path)) return routingToOpsSlice(null);
    const data = JSON.parse(readFileSync(path, 'utf8')) as RoutingProofResult;
    return routingToOpsSlice(data);
  } catch {
    return routingToOpsSlice(null);
  }
}

export function routingTableRows(result: RoutingProofResult): Record<string, unknown>[] {
  return result.probes.map(p => ({
    Endpoint: p.path,
    Status: p.status,
    OK: p.ok ? 'yes' : 'no',
    Pass: p.pass ? 'pass' : 'FAIL',
    Crit: p.critical ? 'Y' : '',
    Time: `${p.timeMs}ms`,
    Type: p.contentType,
    Note: p.note || p.error || '',
  }));
}

export async function writeRoutingArtifact(
  result: RoutingProofResult,
  opts: { dir?: string; version?: string } = {}
): Promise<{ latestPath: string; versionPath: string }> {
  const pkg = ROUTING_ARTIFACT_PACKAGE;
  const dir = opts.dir ?? `public/registry/${pkg}`;
  const version =
    opts.version ||
    Bun.env.VERSION ||
    `v${new Date().toISOString().replace(/[-:.]/g, '').slice(0, 14)}`;
  await Bun.$`mkdir -p ${dir}`.quiet();
  const body = `${JSON.stringify(result, null, 2)}\n`;
  const latestPath = `${dir}/latest.json`;
  const versionPath = `${dir}/${version}.json`;
  await Bun.write(latestPath, body);
  await Bun.write(versionPath, body);
  return { latestPath, versionPath };
}
