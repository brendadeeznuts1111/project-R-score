#!/usr/bin/env bun
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
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Multi-target Bun networking optimization suite.
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
 *   # Human tables: omit --json. JSON still embeds Bun.inspect.table under .tables
 *   bun --fetch-preconnect https://api.elections.kalshi.com:443 tools/verify-networking.ts
 */

import { unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
import {
  mergeHotFromHealth,
  publicRouteCatalog,
  type HealthRouteObjects,
  type PublicRouteDef,
} from '../lib/http/public-routes.ts';

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

const LOCAL_BASE = flag('base') || Bun.env.HEALTH_URL || Bun.env.BASE_URL || 'http://127.0.0.1:3000';
const LOCAL_ONLY = has('local-only');
const ROUTES = has('routes') || has('routes-only') || has('local-only');
const ROUTES_ONLY = has('routes-only');
const SKIP_WRITE = has('skip-write');
const AS_JSON = has('json');
const TIMEOUT_MS = Number(flag('timeout-ms') ?? 10_000);

// ── Targets ────────────────────────────────────────────────────────────────

export type NetTarget = {
  name: string;
  url: string;
  category: string;
  /** Prefer HEAD; some hosts block HEAD → fall back to GET. */
  method?: 'HEAD' | 'GET';
  /** Skip response.bytes + Bun.write (rate limits / large HTML). */
  skipBuffer?: boolean;
  /** Treat these HTTP statuses as "reachable" for networking proof. */
  okStatuses?: number[];
};

function buildTargets(): NetTarget[] {
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

  if (LOCAL_ONLY) return out;

  out.push(
    {
      name: 'CF Dashboard',
      url: 'https://dash.cloudflare.com',
      category: 'dashboard',
      method: 'HEAD',
      // 403/302 still prove DNS+TLS+pool — dashboard often rejects unauth HEAD body paths
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

// ── Row model ──────────────────────────────────────────────────────────────

export type NetCheckRow = {
  target: string;
  category: string;
  optimization: string;
  metric: string;
  status: 'PASS' | 'FAIL' | 'SKIP' | 'INFO';
  detail?: string;
};

function ms(ns0: number): number {
  return (Bun.nanoseconds() - ns0) / 1e6;
}

function statusOk(status: number, ok: number[] | undefined): boolean {
  if (ok?.length) return ok.includes(status);
  return status >= 200 && status < 400;
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
): Promise<NetCheckRow[]> {
  const rows: NetCheckRow[] = [];
  const u = new URL(target.url);
  const cat = target.category;
  const name = target.name;

  // 1. DNS prefetch (host + connection port)
  const tPrefetch = Bun.nanoseconds();
  const dns = dnsPrefetchOrigin(target.url);
  rows.push({
    target: name,
    category: cat,
    optimization: 'DNS Prefetch',
    metric: `${ms(tPrefetch).toFixed(3)}ms`,
    status: dns.ok ? 'PASS' : 'FAIL',
    detail: dns.ok
      ? `dns.prefetch("${dns.host}"${dns.port != null ? `, ${dns.port}` : ''})`
      : dns.note,
  });

  // 2. Cache stats (no per-host entries array on Bun — use size/totalCount)
  const stats = dnsCacheStats();
  rows.push({
    target: name,
    category: cat,
    optimization: 'DNS Cache',
    metric: `size=${stats.size} total=${stats.totalCount}`,
    status: stats.size > 0 || stats.totalCount > 0 ? 'PASS' : 'INFO',
    detail: `hits=${stats.cacheHitsCompleted} miss=${stats.cacheMisses} err=${stats.errors}`,
  });

  // 3. Preconnect (safe helper — HTTPS becomes dns-only + CLI note)
  const warm = preconnectOrigin(target.url);
  rows.push({
    target: name,
    category: cat,
    optimization: 'Preconnect',
    metric: warm.fetchPreconnect ? 'tcp' : warm.dnsPrefetch ? 'dns-only' : 'skip',
    status: warm.fetchPreconnect || warm.dnsPrefetch ? 'PASS' : 'FAIL',
    detail: warm.fetchPreconnect
      ? `fetch.preconnect(${warm.origin})`
      : warm.note ?? `CLI: bun --fetch-preconnect ${preconnectCliUrl(target.url)} ./app.ts`,
  });

  // 4. Cold fetch
  const method = target.method ?? 'GET';
  const cold = await fetchTimed(target.url, { method });
  if ('error' in cold) {
    rows.push({
      target: name,
      category: cat,
      optimization: 'Cold Fetch',
      metric: `${cold.elapsedMs.toFixed(1)}ms`,
      status: 'FAIL',
      detail: cold.error,
    });
    return rows;
  }
  // Drain HEAD/GET body so the socket can return to the pool.
  if (method !== 'HEAD') await cold.res.arrayBuffer().catch(() => {});
  else await cold.res.body?.cancel().catch(() => {});

  const coldOk = statusOk(cold.res.status, target.okStatuses);
  rows.push({
    target: name,
    category: cat,
    optimization: 'Cold Fetch',
    metric: `${cold.elapsedMs.toFixed(1)}ms (${cold.res.status})`,
    status: coldOk ? 'PASS' : 'FAIL',
  });

  // 5. Warm fetch (connection pool / keep-alive)
  const warmFetch = await fetchTimed(target.url, { method });
  if ('error' in warmFetch) {
    rows.push({
      target: name,
      category: cat,
      optimization: 'Warm Fetch',
      metric: `${warmFetch.elapsedMs.toFixed(1)}ms`,
      status: 'FAIL',
      detail: warmFetch.error,
    });
    return rows;
  }
  if (method !== 'HEAD') await warmFetch.res.arrayBuffer().catch(() => {});
  else await warmFetch.res.body?.cancel().catch(() => {});

  const warmOk = statusOk(warmFetch.res.status, target.okStatuses);
  // Soft pool signal only — not a hard fail (jitter / TLS session / CDN)
  const pooled =
    warmOk && warmFetch.elapsedMs <= cold.elapsedMs * 0.95 && warmFetch.elapsedMs < cold.elapsedMs;
  rows.push({
    target: name,
    category: cat,
    optimization: 'Warm Fetch',
    metric: `${warmFetch.elapsedMs.toFixed(1)}ms (${warmFetch.res.status})`,
    status: warmOk ? 'PASS' : 'FAIL',
    detail: pooled ? 'faster than cold (likely reuse)' : 'timing only — not a pool guarantee',
  });

  if (target.skipBuffer) return rows;

  // 6. response.bytes() buffering
  const tBuf = Bun.nanoseconds();
  const get = await fetchTimed(target.url, { method: 'GET' });
  if ('error' in get) {
    rows.push({
      target: name,
      category: cat,
      optimization: 'Buffer',
      metric: `${get.elapsedMs.toFixed(1)}ms`,
      status: 'FAIL',
      detail: get.error,
    });
    return rows;
  }
  try {
    const bytes = await get.res.bytes();
    rows.push({
      target: name,
      category: cat,
      optimization: 'Buffer',
      metric: `${ms(tBuf).toFixed(1)}ms (${bytes.byteLength} B)`,
      status: get.res.ok || statusOk(get.res.status, target.okStatuses) ? 'PASS' : 'FAIL',
    });

    // 7. Bun.write small payloads
    if (!opts.skipWrite && bytes.byteLength > 0 && bytes.byteLength < 1_000_000) {
      const path = join(tmpdir(), `bun-net-${cat}-${Date.now()}.bin`);
      const tW = Bun.nanoseconds();
      try {
        await Bun.write(path, bytes);
        const exists = await Bun.file(path).exists();
        rows.push({
          target: name,
          category: cat,
          optimization: 'Disk Write',
          metric: `${ms(tW).toFixed(1)}ms`,
          status: exists ? 'PASS' : 'FAIL',
          detail: path,
        });
      } finally {
        try {
          unlinkSync(path);
        } catch {
          /* ignore */
        }
      }
    }
  } catch (err) {
    rows.push({
      target: name,
      category: cat,
      optimization: 'Buffer',
      metric: `${ms(tBuf).toFixed(1)}ms`,
      status: 'FAIL',
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  return rows;
}

export async function runNetworkingSuite(opts: {
  targets?: NetTarget[];
  skipWrite?: boolean;
} = {}): Promise<{ rows: NetCheckRow[]; targets: NetTarget[] }> {
  const targets = opts.targets ?? buildTargets();
  const rows: NetCheckRow[] = [];
  for (const t of targets) {
    rows.push(...(await verifyTarget(t, { skipWrite: opts.skipWrite })));
  }
  return { rows, targets };
}

// ── Local route catalog probe (dashboard + endpoints + route objects) ──────

export type RouteProbeRow = {
  path: string;
  name: string;
  category: string;
  kind: string;
  status: number | 'ERR';
  ms: number;
  pass: boolean;
  critical: boolean;
  note?: string;
};

export type RouteProbeResult = {
  base: string;
  health: HealthRouteObjects | null;
  catalog: PublicRouteDef[];
  rows: RouteProbeRow[];
  summary: { total: number; passed: number; failed: number; criticalFailed: number };
};

/** GET /health → routeStats + serve.hotPreloaded objects. */
export async function fetchHealthRouteObjects(
  base: string
): Promise<HealthRouteObjects | null> {
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

// ── Render ─────────────────────────────────────────────────────────────────

function table(
  rows: Record<string, unknown>[],
  columns: string[],
  colors = true
): string {
  // Object rows only — array-of-arrays leaves named columns empty in Bun.inspect.table.
  return Bun.inspect.table(rows, columns, { colors });
}

function renderCategory(category: string, rows: NetCheckRow[]): void {
  console.log(`\n── ${category.toUpperCase()} ──`);
  console.log(
    table(
      rows.map(r => ({
        target: r.target,
        optimization: r.optimization,
        metric: r.metric,
        status: r.status,
      })),
      ['target', 'optimization', 'metric', 'status']
    )
  );
}

/** Structured + rendered tables for route probe (human + --json.tables). */
export function buildRouteTables(
  probe: RouteProbeResult,
  opts: { colors?: boolean } = {}
): {
  routeStats: Record<string, unknown>[];
  hotPreloaded: Record<string, unknown>[];
  strategies: Record<string, unknown>[];
  /** Flat catalog probe — one row per path (main table people expect). */
  routes: Record<string, unknown>[];
  byCategory: Record<string, Record<string, unknown>[]>;
  rendered: {
    routeStats: string;
    hotPreloaded: string;
    strategies: string;
    routes: string;
    byCategory: Record<string, string>;
  };
} {
  const colors = opts.colors ?? false;
  const rs = probe.health?.routeStats;
  const serve = probe.health?.serve;

  const routeStats: Record<string, unknown>[] = rs
    ? [
        { field: 'staticRoutes', value: rs.staticRoutes ?? '—' },
        { field: 'fileRoutes', value: rs.fileRoutes ?? '—' },
        { field: 'staticHits', value: rs.staticHits ?? '—' },
        { field: 'fileHits', value: rs.fileHits ?? '—' },
        { field: 'notModified304', value: rs.notModified304 ?? '—' },
        {
          field: 'totalMemoryUsed',
          value:
            rs.totalMemoryUsed != null
              ? `${Math.round(rs.totalMemoryUsed / 1024)} KiB`
              : '—',
        },
        { field: 'decision.rule', value: rs.decision?.rule ?? '—' },
      ]
    : [{ field: '(no /health)', value: 'serve-public down?' }];

  const hotPreloaded = (serve?.hotPreloaded ?? []).map((p, i) => ({ i, path: p }));
  const strategies = Object.entries(serve?.strategies ?? {}).map(([k, v]) => ({
    strategy: k,
    rule: v,
  }));

  const routes = probe.rows.map(r => ({
    path: r.path,
    name: r.name,
    category: r.category,
    kind: r.kind,
    status: r.status,
    ms: r.ms,
    crit: r.critical ? 'Y' : '',
    pass: r.pass ? 'PASS' : 'FAIL',
  }));

  const byCategory: Record<string, Record<string, unknown>[]> = {};
  for (const r of probe.rows) {
    (byCategory[r.category] ??= []).push({
      path: r.path,
      kind: r.kind,
      status: String(r.status),
      ms: r.ms,
      crit: r.critical ? 'Y' : '',
      pass: r.pass ? 'PASS' : 'FAIL',
    });
  }

  const byCategoryRendered: Record<string, string> = {};
  for (const [c, slice] of Object.entries(byCategory)) {
    byCategoryRendered[c] = table(slice, ['path', 'kind', 'status', 'ms', 'crit', 'pass'], colors);
  }

  return {
    routeStats,
    hotPreloaded,
    strategies,
    routes,
    byCategory,
    rendered: {
      routeStats: table(routeStats, ['field', 'value'], colors),
      hotPreloaded: hotPreloaded.length
        ? table(hotPreloaded, ['i', 'path'], colors)
        : '(none)',
      strategies: strategies.length
        ? table(strategies, ['strategy', 'rule'], colors)
        : '(none)',
      routes: table(
        routes.map(r => ({
          path: r.path,
          kind: r.kind,
          status: String(r.status),
          ms: r.ms,
          crit: r.crit,
          pass: r.pass,
        })),
        ['path', 'kind', 'status', 'ms', 'crit', 'pass'],
        colors
      ),
      byCategory: byCategoryRendered,
    },
  };
}

function renderRouteObjects(probe: RouteProbeResult): void {
  const tables = buildRouteTables(probe, { colors: true });
  const serve = probe.health?.serve;

  console.log('\n── ROUTE OBJECTS (/health) ──');
  console.log(tables.rendered.routeStats);

  if (tables.hotPreloaded.length) {
    console.log('\n── HOT PRELOADED (serve.hotPreloaded) ──');
    console.log(tables.rendered.hotPreloaded);
  }
  if (serve?.etagScope) {
    console.log(`ETag scope: ${serve.etagScope}`);
  }
  if (tables.strategies.length) {
    console.log(tables.rendered.strategies);
  }

  console.log('\n── PUBLIC ROUTE CATALOG PROBE (all paths) ──');
  console.log(tables.rendered.routes);

  console.log('\n── BY CATEGORY ──');
  for (const [c, rendered] of Object.entries(tables.rendered.byCategory)) {
    console.log(`\n  · ${c}`);
    console.log(rendered);
  }

  console.log(
    `\nRoutes: ${probe.summary.passed}/${probe.summary.total} · critical fails: ${probe.summary.criticalFailed}`
  );
}

async function main(): Promise<void> {
  const t0 = Bun.nanoseconds();

  let rows: NetCheckRow[] = [];
  let targets: NetTarget[] = [];
  if (!ROUTES_ONLY) {
    const suite = await runNetworkingSuite({ skipWrite: SKIP_WRITE });
    rows = suite.rows;
    targets = suite.targets;
  }

  let routeProbe: RouteProbeResult | null = null;
  if (ROUTES || ROUTES_ONLY) {
    routeProbe = await probePublicRoutes(LOCAL_BASE);
  }

  const elapsed = ms(t0);
  const hard = rows.filter(r => r.status === 'PASS' || r.status === 'FAIL');
  const passed = hard.filter(r => r.status === 'PASS').length;
  const failed = hard.filter(r => r.status === 'FAIL').length;
  const routeFailed = routeProbe?.summary.failed ?? 0;
  const routeCritFailed = routeProbe?.summary.criticalFailed ?? 0;
  const finalDns = dnsCacheStats();

  // --json is machine output: still embeds Bun.inspect.table under .tables
  // (colors off). For live colored tables in the terminal, omit --json.
  const routeTables = routeProbe
    ? buildRouteTables(routeProbe, { colors: false })
    : null;

  if (AS_JSON) {
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
          rows,
          routeProbe,
          /** Object rows ready for Bun.inspect.table / spreadsheets. */
          tables: routeTables
            ? {
                routeStats: routeTables.routeStats,
                hotPreloaded: routeTables.hotPreloaded,
                strategies: routeTables.strategies,
                routes: routeTables.routes,
                byCategory: routeTables.byCategory,
                /** Pre-rendered Bun.inspect.table strings (colors: false). */
                rendered: routeTables.rendered,
              }
            : null,
          routeCatalog: publicRouteCatalog(),
          canonical: CANONICAL,
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
    console.log(
      `║  Targets: ${String(targets.length).padEnd(59)}║`
    );
    console.log(
      `║  Routes:  ${String(routeProbe?.catalog.length ?? 0).padEnd(59)}║`
    );
    console.log('╚══════════════════════════════════════════════════════════════════════╝');

    if (rows.length) {
      const cats = [...new Set(rows.map(r => r.category))];
      for (const c of cats) renderCategory(c, rows.filter(r => r.category === c));
      console.log(
        `\n${passed}/${hard.length} network checks passed · ${failed} failed · ${elapsed.toFixed(1)}ms`
      );
    }

    if (routeProbe) renderRouteObjects(routeProbe);

    console.log(
      `DNS cache: size=${finalDns.size} total=${finalDns.totalCount} hits=${finalDns.cacheHitsCompleted} miss=${finalDns.cacheMisses} err=${finalDns.errors}`
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
