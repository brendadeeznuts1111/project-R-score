// @see https://bun.com/docs/runtime/utils — Bun.inspect.table
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/networking/fetch
/**
 * Registry / portal routing proof — probe endpoints, table, SHA-256 fingerprint.
 *
 * Default base: score.factory-wager.com (Pages + custom domain).
 * Writes artifacts under public/registry/@factorywager/routing-test/ (allowlisted).
 */
import { canonicalJson, sha256Hex } from './bun-utils-proof.ts';

export type RoutingProbeSpec = {
  path: string;
  /** When set, status must match (or be in list) for pass. */
  expectedStatus?: number | number[];
  /** When true (default for most), any 2xx is pass. */
  requireOk?: boolean;
  note?: string;
};

export type RoutingProbeResult = {
  path: string;
  status: number | 'ERR';
  ok: boolean;
  /** Whether this probe met its expectation. */
  pass: boolean;
  timeMs: number;
  contentType: string;
  error?: string;
  note?: string;
};

export type RoutingProofResult = {
  schemaVersion: 1;
  bunVersion: string;
  bunRevision: string;
  baseUrl: string;
  timestamp: string;
  probes: RoutingProbeResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    httpOk: number;
  };
  proofHash?: string;
};

export type RunRoutingProofOpts = {
  baseUrl?: string;
  specs?: RoutingProbeSpec[];
  /** Inject fetch for tests. */
  fetchImpl?: typeof fetch;
  now?: () => Date;
  bunVersion?: string;
  bunRevision?: string;
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
  { path: '/api/operations/summary', requireOk: true, note: 'ops snapshot/live' },
  { path: '/api/monitoring', requireOk: true, note: 'monitoring payload' },
  { path: '/monitoring', requireOk: true },
  { path: '/portal', requireOk: true },
  { path: '/portal/ops/', requireOk: true },
  { path: '/registry/ops-summary.json', requireOk: true, note: 'static ops metrics' },
  {
    path: '/registry/@factorywager/bun-utils-test/latest.json',
    requireOk: true,
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

function probePasses(spec: RoutingProbeSpec, status: number | 'ERR', httpOk: boolean): boolean {
  if (spec.expectedStatus != null) {
    return statusMatches(status, spec.expectedStatus);
  }
  if (spec.requireOk === false) return status !== 'ERR';
  return httpOk;
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
    return {
      path: spec.path,
      status,
      ok: httpOk,
      pass: probePasses(spec, status, httpOk),
      timeMs,
      contentType: res.headers.get('content-type')?.split(';')[0]?.trim() || '',
      note: spec.note,
    };
  } catch (e) {
    return {
      path: spec.path,
      status: 'ERR',
      ok: false,
      pass: probePasses(spec, 'ERR', false),
      timeMs: 0,
      contentType: '',
      error: e instanceof Error ? e.message : String(e),
      note: spec.note,
    };
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

  const probes: RoutingProbeResult[] = [];
  for (const spec of specs) {
    probes.push(await probeEndpoint(baseUrl, spec, fetchImpl));
  }

  const passed = probes.filter(p => p.pass).length;
  const httpOk = probes.filter(p => p.ok).length;
  const body: RoutingProofResult = {
    schemaVersion: 1,
    bunVersion: opts.bunVersion ?? Bun.version,
    bunRevision: opts.bunRevision ?? (Bun.revision || 'unknown'),
    baseUrl,
    timestamp: now.toISOString(),
    probes,
    summary: {
      total: probes.length,
      passed,
      failed: probes.length - passed,
      httpOk,
    },
  };
  const proofHash = sha256Hex(canonicalJson(body));
  return { ...body, proofHash };
}

export function routingTableRows(result: RoutingProofResult): Record<string, unknown>[] {
  return result.probes.map(p => ({
    Endpoint: p.path,
    Status: p.status,
    OK: p.ok ? 'yes' : 'no',
    Pass: p.pass ? 'pass' : 'FAIL',
    Time: `${p.timeMs}ms`,
    Type: p.contentType,
    Note: p.note || p.error || '',
  }));
}
