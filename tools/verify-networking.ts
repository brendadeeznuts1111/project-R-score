#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/networking/fetch#custom-headers — custom headers
// @see https://bun.com/docs/runtime/networking/fetch#dns-prefetching — DNS prefetching
// @see https://bun.com/docs/runtime/networking/dns#dns-prefetch — dns.prefetch
// @see https://bun.com/docs/runtime/networking/dns#dns-getcachestats — dns.getCacheStats
// @see https://bun.com/docs/runtime/networking/fetch#preconnect-to-a-host — fetch.preconnect
// @see https://bun.com/docs/runtime/networking/fetch#preconnect-at-startup — --fetch-preconnect
// @see https://bun.com/docs/runtime/networking/fetch#connection-pooling-http-keep-alive — keepalive / pool
// @see https://bun.com/docs/runtime/networking/fetch#response-buffering — response.bytes()
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/utils#bun-nanoseconds — Bun.nanoseconds
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
// @see https://bun.com/docs/runtime/utils#bun-inspect-custom — Bun.inspect.custom
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
/**
 * Multi-target Bun networking optimization suite.
 *
 * Printing: prefer `console.log(report)` — RouteProbeReport implements
 * `[Bun.inspect.custom]` so Bun renders inspect.table automatically.
 * JSON: `JSON.stringify(report)` → toJSON() with rows + rendered tables.
 *
 * Grounded targets (not invent):
 *   - Cloudflare dashboard / Pages-facing registry
 *   - Local serve-public health + prediction report
 *   - Kalshi public exchange status
 *   - bun.com docs (HTTPS DNS control)
 *   - optional Telegram getMe when TELEGRAM_BOT_TOKEN is set
 *   - optional R2 public base via R2_PUBLIC_BASE
 *
 * Runtime matrix (Bun 1.4):
 *   dns.prefetch(host[, port])  — always preferred
 *   fetch.preconnect(http://host:port) — OK
 *   fetch.preconnect(https://…) — Invalid port → CLI --fetch-preconnect https://host:443
 *
 *   bun tools/verify-networking.ts
 *   bun tools/verify-networking.ts --local-only
 *   bun tools/verify-networking.ts --routes          # portal + API + hot static catalog
 *   bun tools/verify-networking.ts --routes-only     # tables via Bun.inspect.table
 *   bun tools/verify-networking.ts --routes-only --json   # machine JSON + tables.* strings
 *   bun tools/verify-networking.ts --skip-write
 *   bun tools/verify-networking.ts --remote --save
 *   bun tools/verify-networking.ts --save --path=public/registry/networking-proof.json
 *   # Human tables: omit --json. JSON still embeds Bun.inspect.table under .tables
 *   bun --fetch-preconnect https://api.elections.kalshi.com:443 tools/verify-networking.ts --remote
 */

// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
import { joinPath } from '../lib/path-bun.ts';
import {
  BUN_DNS_CACHE_STATS_DOCS,
  BUN_DNS_PREFETCHING_DOCS,
  BUN_DNS_PREFETCH_DOCS,
  BUN_FETCH_PRECONNECT_DOCS,
  BUN_FETCH_PRECONNECT_STARTUP_DOCS,
  dnsCacheStats,
  dnsPrefetchOrigin,
  preconnectCliUrl,
  preconnectOrigin,
} from '../lib/http/fetch-preconnect.ts';
import { installGlobalFetchHeaders } from '../lib/http/fetch-client.ts';
import {
  mergeHotFromHealth,
  publicRouteCatalog,
  type HealthRouteObjects,
  type PublicRouteDef,
} from '../lib/http/public-routes.ts';
import {
  NetworkingChecksReport,
  RouteProbeReport,
  netCheckRow,
  type NetCheckRow,
  type NetOptimizationType,
  type NetTargetCategory,
  type RouteProbeResult,
  type RouteProbeRow,
} from '../lib/http/networking-report.ts';
import { canonicalJson, sha256Hex } from '../lib/bun-utils-proof.ts';

export type {
  NetCheckRow,
  NetOptimizationType,
  NetTargetCategory,
  RouteProbeResult,
  RouteProbeRow,
} from '../lib/http/networking-report.ts';

// ── Canonical refs (bun.com) ───────────────────────────────────────────────

const CANONICAL = {
  dnsPrefetching: BUN_DNS_PREFETCHING_DOCS,
  dnsPrefetch: BUN_DNS_PREFETCH_DOCS,
  dnsCacheStats: BUN_DNS_CACHE_STATS_DOCS,
  preconnect: BUN_FETCH_PRECONNECT_DOCS,
  preconnectStartup: BUN_FETCH_PRECONNECT_STARTUP_DOCS,
  keepalive: 'https://bun.com/docs/runtime/networking/fetch#connection-pooling-http-keep-alive',
  responseBuffering: 'https://bun.com/docs/runtime/networking/fetch#response-buffering',
  write: 'https://bun.com/docs/runtime/file-io#writing-files-bun-write',
  nanoseconds: 'https://bun.com/docs/runtime/utils#bun-nanoseconds',
  inspectTable:
    'https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options',
  env: 'https://bun.com/docs/runtime/utils#bun-env',
} as const;

// ── CLI ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const has = (n: string) => args.includes(`--${n}`);
const flag = (n: string): string | undefined => {
  const hit = args.find(a => a.startsWith(`--${n}=`));
  return hit?.slice(n.length + 3);
};

const LOCAL_BASE =
  flag('base') || Bun.env.HEALTH_URL || Bun.env.BASE_URL || 'http://127.0.0.1:3000';
const LOCAL_ONLY = has('local-only');
const REMOTE = has('remote');
const ROUTES = has('routes') || has('routes-only') || has('local-only');
const ROUTES_ONLY = has('routes-only');
const SKIP_WRITE = has('skip-write');
const SAVE_PROOF = has('save');
const PROOF_PATH =
  flag('path') || Bun.env.NETWORKING_PROOF_PATH || 'public/registry/networking-proof.json';
const AS_JSON = has('json');
const TIMEOUT_MS = Number(flag('timeout-ms') ?? 10_000);

export const DEFAULT_NETWORKING_PROOF_PATH = 'public/registry/networking-proof.json';

// ── Targets ────────────────────────────────────────────────────────────────

export type NetTarget = {
  name: string;
  url: string;
  category: NetTargetCategory;
  /** Prefer HEAD; some hosts block HEAD → fall back to GET. */
  method?: 'HEAD' | 'GET';
  /** Skip response.bytes + Bun.write (rate limits / large HTML). */
  skipBuffer?: boolean;
  /** Treat these HTTP statuses as "reachable" for networking proof. */
  okStatuses?: number[];
};

export type TargetSummary = {
  coldFetchMs: number;
  warmFetchMs: number;
  reuseEfficiency: number;
  protocol: string;
  compression: string;
  dnsCacheHit: boolean;
  keepAlive: boolean;
  http3: boolean;
};

export type TargetVerification = {
  target: string;
  category: NetTargetCategory;
  summary: TargetSummary;
  timestamp: string;
  rows: NetCheckRow[];
};

export type NetworkingProofTarget = {
  name: string;
  category: string;
  optimizations: Record<string, { metric: string; status: string; detail?: string }>;
  summary: TargetSummary;
  timestamp: string;
};

export type NetworkingProofObj = {
  timestamp: string;
  bunVersion: string;
  bunRevision: string;
  targets: NetworkingProofTarget[];
  global: {
    elapsedMs: number;
    checksPassed: number;
    checksTotal: number;
    dnsCache: ReturnType<typeof dnsCacheStats>;
  };
};

function buildTargets(opts: { remote?: boolean } = {}): NetTarget[] {
  const local = LOCAL_BASE.replace(/\/$/, '');
  const out: NetTarget[] = [
    {
      name: 'Health',
      url: `${local}/health`,
      category: 'ops',
      method: 'GET',
      okStatuses: [200],
    },
    {
      name: 'Prediction report',
      url: `${local}/registry/prediction/report.html`,
      category: 'registry',
      method: 'GET',
      okStatuses: [200],
    },
  ];

  const includeRemote = opts.remote ?? REMOTE;
  if (LOCAL_ONLY || !includeRemote) return out;

  out.push(
    {
      name: 'CF Dashboard',
      url: 'https://dash.cloudflare.com',
      category: 'dashboard',
      method: 'HEAD',
      okStatuses: [200, 301, 302, 303, 307, 308, 401, 403],
      skipBuffer: true,
    },
    {
      name: 'CF Pages Prod',
      url: 'https://factory-wager.com',
      category: 'pages',
      method: 'HEAD',
      okStatuses: [200, 301, 302, 303, 307, 308],
      skipBuffer: true,
    },
    {
      name: 'CF Pages Preview',
      url: 'https://preview.factory-wager.com',
      category: 'pages',
      method: 'HEAD',
      okStatuses: [200, 301, 302, 303, 307, 308, 401, 403],
      skipBuffer: true,
    },
    {
      name: 'Registry (Pages)',
      url: 'https://registry.factory-wager.com/',
      category: 'pages',
      method: 'HEAD',
      okStatuses: [200, 301, 302, 303, 307, 308],
      skipBuffer: true,
    },
    {
      name: 'Kalshi API',
      url: 'https://api.elections.kalshi.com/v1/version',
      category: 'trading',
      method: 'GET',
      okStatuses: [200],
      skipBuffer: true,
    },
    {
      name: 'Kalshi exchange',
      url: 'https://api.elections.kalshi.com/trade-api/v2/exchange/status',
      category: 'trading',
      method: 'GET',
      okStatuses: [200],
    },
    {
      name: 'Bun docs',
      url: 'https://bun.com/docs',
      category: 'control',
      method: 'HEAD',
      okStatuses: [200, 301, 302],
      skipBuffer: true,
    },
    {
      name: 'R2 Health',
      url: 'https://operations-evidence.r2.dev/health-check',
      category: 'storage',
      method: 'HEAD',
      okStatuses: [200, 301, 302, 404],
      skipBuffer: true,
    }
  );

  const tg = Bun.env.TELEGRAM_BOT_TOKEN?.trim();
  if (tg) {
    out.push({
      name: 'Telegram getMe',
      url: `https://api.telegram.org/bot${tg}/getMe`,
      category: 'messaging',
      method: 'GET',
      okStatuses: [200],
      skipBuffer: true,
    });
  }

  const r2 = Bun.env.R2_PUBLIC_BASE?.trim() || Bun.env.R2_PUBLIC_URL?.trim();
  if (r2) {
    out.push({
      name: 'R2 public',
      url: r2,
      category: 'storage',
      method: 'HEAD',
      okStatuses: [200, 301, 302, 403, 404],
      skipBuffer: true,
    });
  }

  return out;
}

// ── Row model (types live in lib/http/networking-report.ts) ────────────────

function row(
  target: string,
  category: NetTargetCategory,
  type: NetOptimizationType,
  metric: string,
  status: NetCheckRow['status'],
  detail?: string
): NetCheckRow {
  return netCheckRow({ target, category, type, metric, status, detail });
}

function ms(ns0: number): number {
  return (Bun.nanoseconds() - ns0) / 1e6;
}

function statusOk(status: number, ok: number[] | undefined): boolean {
  if (ok?.length) return ok.includes(status);
  return status >= 200 && status < 400;
}

/** Honest header-derived signals — Bun fetch does not expose negotiated ALPN. */
function analyzeResponseHeaders(
  res: Response
): Pick<TargetSummary, 'protocol' | 'compression' | 'keepAlive' | 'http3'> {
  const encoding = res.headers.get('content-encoding')?.trim() || 'none';
  const conn = res.headers.get('connection')?.toLowerCase() ?? '';
  const keepAlive = conn.includes('keep-alive');
  const altSvc = res.headers.get('alt-svc') ?? '';
  const http3 = /\bh3(?:=|\b)/i.test(altSvc);
  return {
    protocol: 'unknown',
    compression: encoding,
    keepAlive,
    http3,
  };
}

function emptySummary(): TargetSummary {
  return {
    coldFetchMs: 0,
    warmFetchMs: 0,
    reuseEfficiency: 1,
    protocol: 'unknown',
    compression: 'none',
    dnsCacheHit: false,
    keepAlive: false,
    http3: false,
  };
}

async function fetchTimed(
  url: string,
  init: RequestInit & { method?: string }
): Promise<{ res: Response; elapsedMs: number } | { error: string; elapsedMs: number }> {
  const t0 = Bun.nanoseconds();
  try {
    const res = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      // Bun reuses connections by default; keepalive is for fetch RequestInit parity
      keepalive: true,
    });
    return { res, elapsedMs: ms(t0) };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : String(err),
      elapsedMs: ms(t0),
    };
  }
}

/** Per-target DNS → preconnect → cold/warm fetch → optional buffer + write. */
export async function verifyTarget(
  target: NetTarget,
  opts: { skipWrite?: boolean } = {}
): Promise<TargetVerification> {
  const rows: NetCheckRow[] = [];
  const summary = emptySummary();
  const timestamp = new Date().toISOString();
  const cat = target.category;
  const name = target.name;

  // 1. DNS prefetch (host + connection port)
  const tPrefetch = Bun.nanoseconds();
  const dns = dnsPrefetchOrigin(target.url);
  rows.push(
    row(
      name,
      cat,
      'dns-prefetch',
      `${ms(tPrefetch).toFixed(3)}ms`,
      dns.ok ? 'PASS' : 'FAIL',
      dns.ok ? `dns.prefetch("${dns.host}"${dns.port != null ? `, ${dns.port}` : ''})` : dns.note
    )
  );

  // 2. Cache stats (no per-host entries array on Bun — use size/totalCount)
  const stats = dnsCacheStats();
  summary.dnsCacheHit = stats.size > 0 || stats.cacheHitsCompleted > 0;
  rows.push(
    row(
      name,
      cat,
      'dns-cache',
      `size=${stats.size} total=${stats.totalCount}`,
      stats.size > 0 || stats.totalCount > 0 ? 'PASS' : 'INFO',
      `hits=${stats.cacheHitsCompleted} miss=${stats.cacheMisses} err=${stats.errors}`
    )
  );

  // 3. Preconnect (safe helper — HTTPS becomes dns-only + CLI note)
  const warm = preconnectOrigin(target.url);
  rows.push(
    row(
      name,
      cat,
      'preconnect',
      warm.fetchPreconnect ? 'tcp' : warm.dnsPrefetch ? 'dns-only' : 'skip',
      warm.fetchPreconnect || warm.dnsPrefetch ? 'PASS' : 'FAIL',
      warm.fetchPreconnect
        ? `fetch.preconnect(${warm.origin})`
        : (warm.note ?? `CLI: bun --fetch-preconnect ${preconnectCliUrl(target.url)} ./app.ts`)
    )
  );

  // 4. Cold fetch
  const method = target.method ?? 'GET';
  const cold = await fetchTimed(target.url, { method });
  if ('error' in cold) {
    rows.push(row(name, cat, 'cold-fetch', `${cold.elapsedMs.toFixed(1)}ms`, 'FAIL', cold.error));
    return { target: name, category: cat, summary, timestamp, rows };
  }
  // Drain HEAD/GET body so the socket can return to the pool.
  if (method !== 'HEAD') await cold.res.arrayBuffer().catch(() => {});
  else await cold.res.body?.cancel().catch(() => {});

  const coldOk = statusOk(cold.res.status, target.okStatuses);
  summary.coldFetchMs = cold.elapsedMs;
  Object.assign(summary, analyzeResponseHeaders(cold.res));
  rows.push(
    row(
      name,
      cat,
      'cold-fetch',
      `${cold.elapsedMs.toFixed(1)}ms (${cold.res.status})`,
      coldOk ? 'PASS' : 'FAIL'
    )
  );

  // 5. Warm fetch (connection pool / keep-alive)
  const warmFetch = await fetchTimed(target.url, { method });
  if ('error' in warmFetch) {
    rows.push(
      row(name, cat, 'warm-fetch', `${warmFetch.elapsedMs.toFixed(1)}ms`, 'FAIL', warmFetch.error)
    );
    return { target: name, category: cat, summary, timestamp, rows };
  }
  if (method !== 'HEAD') await warmFetch.res.arrayBuffer().catch(() => {});
  else await warmFetch.res.body?.cancel().catch(() => {});

  const warmOk = statusOk(warmFetch.res.status, target.okStatuses);
  summary.warmFetchMs = warmFetch.elapsedMs;
  const pooled =
    warmOk && warmFetch.elapsedMs <= cold.elapsedMs * 0.95 && warmFetch.elapsedMs < cold.elapsedMs;
  summary.reuseEfficiency =
    pooled && warmFetch.elapsedMs > 0 ? cold.elapsedMs / warmFetch.elapsedMs : 1;
  if (!summary.keepAlive) summary.keepAlive = analyzeResponseHeaders(warmFetch.res).keepAlive;
  rows.push(
    row(
      name,
      cat,
      'warm-fetch',
      `${warmFetch.elapsedMs.toFixed(1)}ms (${warmFetch.res.status})`,
      warmOk ? 'PASS' : 'FAIL',
      pooled ? 'faster than cold (likely reuse)' : 'timing only — not a pool guarantee'
    )
  );

  if (target.skipBuffer) return { target: name, category: cat, summary, timestamp, rows };

  // 6. response.bytes() buffering
  const tBuf = Bun.nanoseconds();
  const get = await fetchTimed(target.url, { method: 'GET' });
  if ('error' in get) {
    rows.push(row(name, cat, 'buffer', `${get.elapsedMs.toFixed(1)}ms`, 'FAIL', get.error));
    return { target: name, category: cat, summary, timestamp, rows };
  }
  try {
    const bytes = await get.res.bytes();
    rows.push(
      row(
        name,
        cat,
        'buffer',
        `${ms(tBuf).toFixed(1)}ms (${bytes.byteLength} B)`,
        get.res.ok || statusOk(get.res.status, target.okStatuses) ? 'PASS' : 'FAIL'
      )
    );

    // 7. Bun.write small payloads
    if (!opts.skipWrite && bytes.byteLength > 0 && bytes.byteLength < 1_000_000) {
      const path = joinPath(
        Bun.env.TMPDIR || Bun.env.TMP || '/tmp',
        `bun-net-${cat}-${Date.now()}.bin`
      );
      const tW = Bun.nanoseconds();
      try {
        await Bun.write(path, bytes);
        const exists = await Bun.file(path).exists();
        rows.push(
          row(name, cat, 'disk-write', `${ms(tW).toFixed(1)}ms`, exists ? 'PASS' : 'FAIL', path)
        );
      } finally {
        try {
          await Bun.$`rm -f ${path}`.quiet();
        } catch {
          /* ignore */
        }
      }
    }
  } catch (err) {
    rows.push(
      row(
        name,
        cat,
        'buffer',
        `${ms(tBuf).toFixed(1)}ms`,
        'FAIL',
        err instanceof Error ? err.message : String(err)
      )
    );
  }

  return { target: name, category: cat, summary, timestamp, rows };
}

function rowsToOptimizations(rows: NetCheckRow[]): NetworkingProofTarget['optimizations'] {
  const out: NetworkingProofTarget['optimizations'] = {};
  for (const r of rows) {
    out[r.optimization] = {
      metric: r.metric,
      status: r.status,
      ...(r.detail ? { detail: r.detail } : {}),
    };
  }
  return out;
}

function proofTargetsFromResults(results: TargetVerification[]): NetworkingProofTarget[] {
  return results.map(r => ({
    name: r.target,
    category: r.category,
    optimizations: rowsToOptimizations(r.rows),
    summary: r.summary,
    timestamp: r.timestamp,
  }));
}

export type RunNetworkingVerificationOpts = {
  saveProof?: boolean;
  proofPath?: string;
  targets?: NetTarget[];
  skipWrite?: boolean;
  remote?: boolean;
};

/** Production entry — SHA-256 proof hash + optional artifact write. */
export async function runNetworkingVerification(opts: RunNetworkingVerificationOpts = {}): Promise<{
  proofHash: string;
  results: TargetVerification[];
  proofObj: NetworkingProofObj;
  ok: boolean;
}> {
  const tStart = Bun.nanoseconds();
  const targets = opts.targets ?? buildTargets({ remote: opts.remote });
  const results: TargetVerification[] = [];
  for (const t of targets) {
    results.push(await verifyTarget(t, { skipWrite: opts.skipWrite }));
  }

  const allRows = results.flatMap(r => r.rows);
  const hard = allRows.filter(r => r.status === 'PASS' || r.status === 'FAIL');
  const checksPassed = hard.filter(r => r.status === 'PASS').length;
  const checksTotal = hard.length;
  const elapsedMs = (Bun.nanoseconds() - tStart) / 1e6;
  const finalDns = dnsCacheStats();

  const proofObj: NetworkingProofObj = {
    timestamp: new Date().toISOString(),
    bunVersion: Bun.version,
    bunRevision: Bun.revision || 'unknown',
    targets: proofTargetsFromResults(results),
    global: {
      elapsedMs,
      checksPassed,
      checksTotal,
      dnsCache: finalDns,
    },
  };

  const proofHash = sha256Hex(canonicalJson(proofObj));
  const path = opts.proofPath ?? DEFAULT_NETWORKING_PROOF_PATH;

  if (opts.saveProof) {
    await Bun.write(path, `${JSON.stringify({ proofHash, ...proofObj }, null, 2)}\n`);
  }

  return {
    proofHash,
    results,
    proofObj,
    ok: checksTotal === 0 ? true : checksPassed === checksTotal,
  };
}

export async function runNetworkingSuite(
  opts: {
    targets?: NetTarget[];
    skipWrite?: boolean;
    remote?: boolean;
  } = {}
): Promise<{ rows: NetCheckRow[]; targets: NetTarget[]; results: TargetVerification[] }> {
  const targets = opts.targets ?? buildTargets({ remote: opts.remote });
  const results: TargetVerification[] = [];
  for (const t of targets) {
    results.push(await verifyTarget(t, { skipWrite: opts.skipWrite }));
  }
  return { rows: results.flatMap(r => r.rows), targets, results };
}

// ── Local route catalog probe (dashboard + endpoints + route objects) ──────

/** GET /health → routeStats + serve.hotPreloaded objects. */
export async function fetchHealthRouteObjects(base: string): Promise<HealthRouteObjects | null> {
  try {
    const res = await fetch(new URL('/health', base.endsWith('/') ? base : `${base}/`), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return (await res.json()) as HealthRouteObjects;
  } catch {
    return null;
  }
}

/** Probe every catalog path (and live hotPreloaded extras) against local base. */
export async function probePublicRoutes(
  base: string,
  opts: { catalog?: PublicRouteDef[] } = {}
): Promise<RouteProbeResult> {
  const origin = base.replace(/\/$/, '');
  const health = await fetchHealthRouteObjects(origin);
  const catalog = mergeHotFromHealth(opts.catalog ?? publicRouteCatalog(), health);
  const rows: RouteProbeRow[] = [];

  // One DNS warm for the base (shared by all local paths).
  preconnectOrigin(origin);

  for (const route of catalog) {
    const url = `${origin}${route.path.startsWith('/') ? route.path : `/${route.path}`}`;
    const method = route.method ?? 'GET';
    const t0 = Bun.nanoseconds();
    try {
      const res = await fetch(url, {
        method,
        keepalive: true,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      // drain so pool reuses
      if (method === 'GET') await res.arrayBuffer().catch(() => {});
      else await res.body?.cancel().catch(() => {});
      const elapsed = ms(t0);
      const okList = route.okStatuses ?? [200];
      const pass = okList.includes(res.status);
      rows.push({
        path: route.path,
        name: route.name,
        category: route.category,
        kind: route.kind,
        status: res.status,
        ms: Number(elapsed.toFixed(1)),
        pass,
        critical: Boolean(route.critical),
        note: route.note,
      });
    } catch (err) {
      rows.push({
        path: route.path,
        name: route.name,
        category: route.category,
        kind: route.kind,
        status: 'ERR',
        ms: Number(ms(t0).toFixed(1)),
        pass: false,
        critical: Boolean(route.critical),
        note: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const failed = rows.filter(r => !r.pass);
  return {
    base: origin,
    health,
    catalog,
    rows,
    summary: {
      total: rows.length,
      passed: rows.filter(r => r.pass).length,
      failed: failed.length,
      criticalFailed: failed.filter(r => r.critical).length,
    },
  };
}

// ── Render (Bun.inspect.custom + inspect.table) ────────────────────────────

async function main(): Promise<void> {
  installGlobalFetchHeaders();
  const t0 = Bun.nanoseconds();

  let rows: NetCheckRow[] = [];
  let targets: NetTarget[] = [];
  let proofHash: string | null = null;
  if (!ROUTES_ONLY) {
    const remote = REMOTE;
    const verification = await runNetworkingVerification({
      saveProof: SAVE_PROOF,
      proofPath: PROOF_PATH,
      skipWrite: SKIP_WRITE,
      remote,
    });
    rows = verification.results.flatMap(r => r.rows);
    targets = buildTargets({ remote });
    proofHash = verification.proofHash;
    if (!verification.ok && !AS_JSON) {
      console.error(
        `Networking verification failed: ${verification.proofObj.global.checksPassed}/${verification.proofObj.global.checksTotal} checks passed`
      );
    }
  }

  let routeProbe: RouteProbeResult | null = null;
  let routeReport: RouteProbeReport | null = null;
  if (ROUTES || ROUTES_ONLY) {
    routeProbe = await probePublicRoutes(LOCAL_BASE);
    routeReport = new RouteProbeReport(routeProbe);
  }

  const netReport =
    rows.length > 0
      ? new NetworkingChecksReport(rows, {
          base: LOCAL_BASE,
          bun: Bun.version,
          revision: Bun.revision || 'unknown',
        })
      : null;

  const elapsed = ms(t0);
  const hard = rows.filter(r => r.status === 'PASS' || r.status === 'FAIL');
  const passed = hard.filter(r => r.status === 'PASS').length;
  const failed = hard.filter(r => r.status === 'FAIL').length;
  const routeFailed = routeProbe?.summary.failed ?? 0;
  const routeCritFailed = routeProbe?.summary.criticalFailed ?? 0;
  const finalDns = dnsCacheStats();

  if (AS_JSON) {
    // toJSON on reports includes rows + rendered inspect.table strings
    const routeJson = routeReport?.toJSON() ?? null;
    console.log(
      JSON.stringify(
        {
          bun: Bun.version,
          revision: Bun.revision,
          base: LOCAL_BASE,
          elapsedMs: elapsed,
          summary: {
            passed,
            failed,
            total: hard.length,
            targets: targets.length,
            routes: routeProbe?.summary ?? null,
          },
          dns: finalDns,
          maxHttpRequests: Bun.env.BUN_CONFIG_MAX_HTTP_REQUESTS ?? '256 (default)',
          /** Typed rows + byType / byCategory tables (NetworkingChecksReport.toJSON). */
          networking: netReport?.toJSON() ?? null,
          routeProbe,
          /** Same as routeReport.toJSON() — tables.routes / tables.rendered.routes */
          tables: routeJson
            ? {
                routeStats: routeJson.routeStats,
                hotPreloaded: routeJson.hotPreloaded,
                strategies: routeJson.strategies,
                routes: routeJson.routes,
                byCategory: routeJson.byCategory,
                rendered: routeJson.rendered,
              }
            : null,
          routeReport: routeJson,
          routeCatalog: publicRouteCatalog(),
          canonical: CANONICAL,
          proofHash,
        },
        null,
        2
      )
    );
  } else {
    console.log('╔══════════════════════════════════════════════════════════════════════╗');
    console.log('║  Bun Networking Optimization — Multi-Target + Routes                 ║');
    console.log(
      `║  Bun:  ${(Bun.version + ' / ' + (Bun.revision || 'unknown').slice(0, 8)).padEnd(62)}║`
    );
    console.log(`║  Base: ${LOCAL_BASE.slice(0, 62).padEnd(62)}║`);
    console.log(`║  Targets: ${String(targets.length).padEnd(59)}║`);
    console.log(`║  Routes:  ${String(routeProbe?.catalog.length ?? 0).padEnd(59)}║`);
    console.log('╚══════════════════════════════════════════════════════════════════════╝');

    // console.log → Bun.inspect → [Bun.inspect.custom] → inspect.table
    if (netReport) {
      console.log('');
      console.log(netReport);
      console.log(
        `\n${passed}/${hard.length} network checks passed · ${failed} failed · ${elapsed.toFixed(1)}ms`
      );
    }

    if (routeReport) {
      console.log('');
      console.log(routeReport);
    }

    console.log(
      `\nDNS cache: size=${finalDns.size} total=${finalDns.totalCount} hits=${finalDns.cacheHitsCompleted} miss=${finalDns.cacheMisses} err=${finalDns.errors}`
    );
    console.log(
      `HTTP request limit: ${Bun.env.BUN_CONFIG_MAX_HTTP_REQUESTS ?? '256 (default)'} · BUN_CONFIG_MAX_HTTP_REQUESTS`
    );
    if (!ROUTES_ONLY && !Bun.env.TELEGRAM_BOT_TOKEN) {
      console.log('(Telegram skipped — set TELEGRAM_BOT_TOKEN to include messaging)');
    }
    if (!ROUTES_ONLY && !Bun.env.R2_PUBLIC_BASE && !Bun.env.R2_PUBLIC_URL) {
      console.log('(R2 skipped — set R2_PUBLIC_BASE to a public object/URL)');
    }
    console.log('\nCanonical API references (bun.com):');
    for (const [k, url] of Object.entries(CANONICAL)) {
      console.log(`  • ${k.padEnd(18)} ${url}`);
    }
    console.log(
      '\nTip: console.log(report) uses Bun.inspect.custom → inspect.table automatically.'
    );
    console.log('     JSON: --json  →  .tables.rendered.routes  (or omit --json for live tables)');
    if (proofHash) {
      console.log(`\nProof hash: ${proofHash}`);
      if (SAVE_PROOF) console.log(`Proof saved: ${PROOF_PATH}`);
    }
    if (!REMOTE && !LOCAL_ONLY) {
      console.log('(Remote targets skipped — pass --remote for Cloudflare / Kalshi / R2 checks)');
    }
  }

  if (failed > 0 || routeCritFailed > 0) process.exit(1);
  if (routeFailed > 0 && has('strict-routes')) process.exit(1);
}

if (import.meta.main) {
  main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
  });
}
