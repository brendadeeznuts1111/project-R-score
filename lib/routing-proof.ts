// @see https://bun.com/docs/runtime/bun-apis — Bun.mmap
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/docs/runtime/utils — Bun.inspect.table
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/networking/fetch
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/file-io — Bun.mmap
/**
 * Registry / portal routing proof — concurrent probes, latency stats,
 * regression vs previous artifact, SHA-256 fingerprint.
 *
 * Default base: score.factory-wager.com
 * Artifact: public/registry/@factorywager/routing-test/latest.json
 */
import { factoryWagerPagesCustomUrl } from '../config/r2-env.ts';
import { canonicalJson, sha256Hex } from './bun-utils-proof.ts';

/** Pages public origin for portal/registry HTTP probes — not npm `REGISTRY_URL`. */
export const DEFAULT_ROUTING_PROBE_BASE = factoryWagerPagesCustomUrl();

export function isLoopbackUrl(url: string): boolean {
  const u = url.trim();
  return (
    /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?(\/|$)/i.test(u) ||
    /^https?:\/\/(127\.0\.0\.1|localhost)/i.test(u)
  );
}

/**
 * Resolve origin for routing probes. `REGISTRY_URL` is the npm registry API
 * (`bun publish --registry`, bunfig, .npmrc) — never used here.
 * @see https://bun.com/docs/pm/cli/publish#registry-configuration
 * Override: CLI `--base`, `opts.baseUrl`, or `ROUTING_PROBE_BASE_URL` / `PAGES_PUBLIC_URL`.
 */
export function resolveRoutingProbeBaseUrl(explicit?: string): string {
  const fromExplicit = explicit?.trim().replace(/\/$/, '');
  if (fromExplicit) return fromExplicit;

  const fromEnv = (Bun.env.ROUTING_PROBE_BASE_URL || Bun.env.PAGES_PUBLIC_URL || '')
    .trim()
    .replace(/\/$/, '');
  if (fromEnv) return fromEnv;

  return DEFAULT_ROUTING_PROBE_BASE;
}

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

/** Per-route row for ops dashboard cards. */
export type RoutingOpsRouteRow = {
  path: string;
  status: number | 'ERR' | string;
  pass: boolean;
  critical: boolean;
  timeMs: number;
  contentType?: string;
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
  /** failed / total (0–1) */
  errorRate: number;
  meanMs: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
  proofHash: string;
  timestamp: string;
  regressions: number;
  criticalFailedPaths: string[];
  /** Compact per-route breakdown (failures first, then slowest). */
  routes: RoutingOpsRouteRow[];
  /** true when served from mem/disk cache (not a live probe this run). */
  cached?: boolean;
  stale?: boolean;
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
  // Factory R2 gateway returns 400 for empty key; serve-public returns the index (200).
  {
    path: '/api/registry',
    expectedStatus: [200, 400],
    requireOk: false,
    expectContentType: 'application/json',
    note: 'index (local) or empty-key 400 (R2 gateway)',
  },
  {
    path: '/api/registry/@factorywager/test-pkg',
    expectedStatus: [200, 404, 503],
    requireOk: false,
    note: 'SPA fallback 200 (Pages) or missing package 404/503',
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
    path: '/portal/dashboard/',
    requireOk: true,
    critical: true,
    note: 'executive dashboard',
  },
  {
    path: '/portal/dashboard.js',
    requireOk: true,
    expectContentType: 'application/javascript',
    critical: true,
    note: 'executive dashboard client',
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
  {
    path: '/registry/static.json',
    expectedStatus: [200, 404],
    requireOk: false,
    note: 'composite snapshot from ops:snapshot',
  },
  {
    path: '/api/registry/static',
    expectedStatus: [200, 400, 404, 503],
    requireOk: false,
    note: 'local serve-public 200 or R2 gateway empty-key 400',
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
  const workers = Array.from(
    { length: Math.max(1, Math.min(concurrency, items.length)) },
    async () => {
      while (true) {
        const i = next++;
        if (i >= items.length) break;
        results[i] = await fn(items[i]!, i);
      }
    }
  );
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
    if (prev.timeMs >= floor && cur.timeMs >= floor && cur.timeMs > prev.timeMs * factor) {
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
  const baseUrl = resolveRoutingProbeBaseUrl(opts.baseUrl);
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

  const probes = await mapPool(specs, concurrency, spec => probeEndpoint(baseUrl, spec, fetchImpl));

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

function routeRowsFromProof(proof: RoutingProofResult): RoutingOpsRouteRow[] {
  const rows: RoutingOpsRouteRow[] = proof.probes.map(p => ({
    path: p.path,
    status: p.status,
    pass: p.pass,
    critical: p.critical,
    timeMs: p.timeMs,
    contentType: p.contentType || undefined,
  }));
  // Failures first, then critical, then slowest
  rows.sort((a, b) => {
    if (a.pass !== b.pass) return a.pass ? 1 : -1;
    if (a.critical !== b.critical) return a.critical ? -1 : 1;
    return b.timeMs - a.timeMs;
  });
  return rows;
}

export function routingToOpsSlice(
  proof: RoutingProofResult | null | undefined,
  meta: { cached?: boolean; stale?: boolean } = {}
): RoutingOpsSlice {
  if (!proof?.probes?.length) {
    return {
      available: false,
      baseUrl: '',
      passed: 0,
      total: 0,
      failed: 0,
      httpOk: 0,
      criticalFailed: 0,
      errorRate: 0,
      meanMs: 0,
      p50Ms: 0,
      p95Ms: 0,
      maxMs: 0,
      proofHash: '',
      timestamp: '',
      regressions: 0,
      criticalFailedPaths: [],
      routes: [],
      cached: meta.cached,
      stale: meta.stale,
    };
  }
  const total = proof.summary.total;
  const failed = proof.summary.failed;
  return {
    available: true,
    baseUrl: proof.baseUrl,
    passed: proof.summary.passed,
    total,
    failed,
    httpOk: proof.summary.httpOk,
    criticalFailed: proof.summary.criticalFailed,
    errorRate: total > 0 ? Math.round((failed / total) * 1000) / 1000 : 0,
    meanMs: proof.latency.meanMs,
    p50Ms: proof.latency.p50Ms,
    p95Ms: proof.latency.p95Ms,
    maxMs: proof.latency.maxMs,
    proofHash: proof.proofHash ?? '',
    timestamp: proof.timestamp,
    regressions: proof.regression?.changes.length ?? 0,
    criticalFailedPaths: proof.summary.criticalFailedPaths,
    routes: routeRowsFromProof(proof),
    cached: meta.cached,
    stale: meta.stale,
  };
}

export const ROUTING_CACHE_REL =
  Bun.env.ROUTING_PROOF_CACHE_PATH?.trim() || 'tmp/routing-proof-cache.json';
export const ROUTING_CACHE_TTL_MS = Number(Bun.env.ROUTING_PROOF_TTL_MS || 5 * 60 * 1000);

type MemCache = { proof: RoutingProofResult; at: number };
let memCache: MemCache | null = null;

/** Exponential backoff with jitter. Returns null after exhausting retries. */
export async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries = 3,
  baseDelayMs = 1000
): Promise<T | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const delay = baseDelayMs * 2 ** (attempt - 1) + Math.random() * 500;
      console.warn(
        `[${label}] attempt ${attempt}/${maxRetries} failed: ${e instanceof Error ? e.message : e}`
      );
      if (attempt === maxRetries) {
        console.error(`[${label}] all retries failed`);
        return null;
      }
      await Bun.sleep(delay);
    }
  }
  return null;
}

function isFresh(isoOrMs: string | number, ttlMs: number, now = Date.now()): boolean {
  const t = typeof isoOrMs === 'number' ? isoOrMs : Date.parse(isoOrMs);
  if (!Number.isFinite(t)) return false;
  return now - t < ttlMs;
}

export type GetRoutingProofOpts = RunRoutingProofOpts & {
  forceRefresh?: boolean;
  ttlMs?: number;
  cachePath?: string;
  maxRetries?: number;
  baseDelayMs?: number;
  /** When true, write public/registry/@factorywager/routing-test/latest.json */
  writeArtifact?: boolean;
};

/**
 * Self-healing routing proof: mem cache → disk cache → live probe with retries →
 * optional stale fallback. Always fingerprints via runRoutingProof (CryptoHasher).
 */
export async function getRoutingProof(
  opts: GetRoutingProofOpts = {}
): Promise<{ proof: RoutingProofResult; cached: boolean; stale: boolean } | null> {
  const ttlMs = opts.ttlMs ?? ROUTING_CACHE_TTL_MS;
  const cachePath = opts.cachePath ?? ROUTING_CACHE_REL;
  const force = Boolean(opts.forceRefresh);
  const now = Date.now();

  if (!force && memCache && now - memCache.at < ttlMs) {
    return { proof: memCache.proof, cached: true, stale: false };
  }

  if (!force) {
    try {
      const file = Bun.file(cachePath);
      if (await file.exists()) {
        const disk = (await file.json()) as RoutingProofResult & { generatedAt?: string };
        const stamp = disk.timestamp || disk.generatedAt;
        if (disk?.probes?.length && stamp && isFresh(stamp, ttlMs, now)) {
          memCache = { proof: disk, at: now };
          return { proof: disk, cached: true, stale: false };
        }
      }
    } catch {
      /* corrupt cache ignored */
    }
  }

  const proof = await withRetry(
    () =>
      runRoutingProof({
        baseUrl: opts.baseUrl,
        specs: opts.specs,
        fetchImpl: opts.fetchImpl,
        now: opts.now,
        bunVersion: opts.bunVersion,
        bunRevision: opts.bunRevision,
        concurrency: opts.concurrency,
        previous: opts.previous,
        noPrevious: opts.noPrevious,
        latencyRegressionFactor: opts.latencyRegressionFactor,
        latencyRegressionFloorMs: opts.latencyRegressionFloorMs,
      }),
    'routing-proof',
    opts.maxRetries ?? 3,
    opts.baseDelayMs ?? 2000
  );

  if (proof) {
    memCache = { proof, at: now };
    try {
      const parent = cachePath.includes('/') ? cachePath.slice(0, cachePath.lastIndexOf('/')) : '.';
      if (parent && parent !== '.') await Bun.$`mkdir -p ${parent}`.quiet();
      await Bun.write(cachePath, `${JSON.stringify(proof, null, 2)}\n`);
    } catch {
      /* cache write best-effort */
    }
    if (opts.writeArtifact !== false) {
      await writeRoutingArtifact(proof);
    }
    return { proof, cached: false, stale: false };
  }

  // Stale fallback: mem then disk
  if (memCache?.proof) {
    console.warn('[routing-proof] using stale in-memory proof');
    return { proof: memCache.proof, cached: true, stale: true };
  }
  try {
    const file = Bun.file(cachePath);
    if (await file.exists()) {
      const disk = (await file.json()) as RoutingProofResult;
      if (disk?.probes?.length) {
        console.warn('[routing-proof] using stale disk cache');
        memCache = { proof: disk, at: now };
        return { proof: disk, cached: true, stale: true };
      }
    }
  } catch {
    /* ignore */
  }
  try {
    const prev = await loadPreviousRoutingProof();
    if (prev?.probes?.length) {
      console.warn('[routing-proof] using previous registry artifact (stale)');
      return { proof: prev, cached: true, stale: true };
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Load last written routing artifact for ops-summary (no network).
 * Prefers process mem cache, else Bun.mmap (sync) for disk artifact.
 */
export function loadRoutingOpsSliceSync(path: string = ROUTING_ARTIFACT_REL): RoutingOpsSlice {
  try {
    if (memCache?.proof) return routingToOpsSlice(memCache.proof, { cached: true });
    // @see https://bun.com/docs/runtime/file-io — Bun.mmap (sync path read)
    const mapped = Bun.mmap(path);
    const data = JSON.parse(new TextDecoder().decode(mapped)) as RoutingProofResult;
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
