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
 *   bun tools/verify-networking.ts --skip-write
 *   bun tools/verify-networking.ts --json
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

// ── Render ─────────────────────────────────────────────────────────────────

function renderCategory(category: string, rows: NetCheckRow[]): void {
  console.log(`\n── ${category.toUpperCase()} ──`);
  console.log(
    Bun.inspect.table(
      rows.map(r => ({
        target: r.target,
        optimization: r.optimization,
        metric: r.metric,
        status: r.status,
      })),
      ['target', 'optimization', 'metric', 'status'],
      { colors: true }
    )
  );
}

async function main(): Promise<void> {
  const t0 = Bun.nanoseconds();
  const { rows, targets } = await runNetworkingSuite({ skipWrite: SKIP_WRITE });
  const elapsed = ms(t0);
  const hard = rows.filter(r => r.status === 'PASS' || r.status === 'FAIL');
  const passed = hard.filter(r => r.status === 'PASS').length;
  const failed = hard.filter(r => r.status === 'FAIL').length;
  const finalDns = dnsCacheStats();

  if (AS_JSON) {
    console.log(
      JSON.stringify(
        {
          bun: Bun.version,
          revision: Bun.revision,
          base: LOCAL_BASE,
          elapsedMs: elapsed,
          summary: { passed, failed, total: hard.length, targets: targets.length },
          dns: finalDns,
          maxHttpRequests: Bun.env.BUN_CONFIG_MAX_HTTP_REQUESTS ?? '256 (default)',
          rows,
          canonical: CANONICAL,
        },
        null,
        2
      )
    );
  } else {
    console.log('╔══════════════════════════════════════════════════════════════════════╗');
    console.log('║  Bun Networking Optimization — Multi-Target                          ║');
    console.log(
      `║  Bun:  ${(Bun.version + ' / ' + (Bun.revision || 'unknown').slice(0, 8)).padEnd(62)}║`
    );
    console.log(`║  Base: ${LOCAL_BASE.slice(0, 62).padEnd(62)}║`);
    console.log(
      `║  Targets: ${String(targets.length).padEnd(59)}║`
    );
    console.log('╚══════════════════════════════════════════════════════════════════════╝');

    const cats = [...new Set(rows.map(r => r.category))];
    for (const c of cats) renderCategory(c, rows.filter(r => r.category === c));

    console.log(`\n${passed}/${hard.length} hard checks passed · ${failed} failed · ${elapsed.toFixed(1)}ms`);
    console.log(
      `DNS cache: size=${finalDns.size} total=${finalDns.totalCount} hits=${finalDns.cacheHitsCompleted} miss=${finalDns.cacheMisses} err=${finalDns.errors}`
    );
    console.log(
      `HTTP request limit: ${Bun.env.BUN_CONFIG_MAX_HTTP_REQUESTS ?? '256 (default)'} · BUN_CONFIG_MAX_HTTP_REQUESTS`
    );
    if (!Bun.env.TELEGRAM_BOT_TOKEN) {
      console.log('(Telegram skipped — set TELEGRAM_BOT_TOKEN to include messaging)');
    }
    if (!Bun.env.R2_PUBLIC_BASE && !Bun.env.R2_PUBLIC_URL) {
      console.log('(R2 skipped — set R2_PUBLIC_BASE to a public object/URL)');
    }
    console.log('\nCanonical API references (bun.com):');
    for (const [k, url] of Object.entries(CANONICAL)) {
      console.log(`  • ${k.padEnd(18)} ${url}`);
    }
  }

  if (failed > 0) process.exit(1);
}

if (import.meta.main) {
  main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
  });
}
