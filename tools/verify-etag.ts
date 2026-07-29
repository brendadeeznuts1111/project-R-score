#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/networking/fetch#custom-headers — custom headers
// @see https://bun.com/docs/runtime/networking/fetch#sending-an-http-request — fetch / Bun.fetch
// @see https://bun.com/docs/runtime/networking/fetch#preconnect-to-a-host — fetch.preconnect
// @see https://bun.com/docs/runtime/networking/fetch#preconnect-at-startup — --fetch-preconnect
// @see https://bun.com/docs/runtime/networking/fetch#dns-prefetching — DNS prefetching
// @see https://bun.com/docs/runtime/networking/dns#dns-prefetch — dns.prefetch
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/utils#bun-nanoseconds — Bun.nanoseconds
// @see https://bun.com/docs/runtime/utils#bun-deepequals — Bun.deepEquals
// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/utils#bun-revision — Bun.revision
/**
 * ETag verification suite — shared data-ETag across health formats.
 *
 * Grounded routes (serve-public):
 *   GET /health      → application/json  · ETag = data hash
 *   GET /health/pre  → text/plain        · same ETag (Vary: Accept)
 *
 * Offline always proves lib/http/data-etag.ts + deepEquals.
 * Online probes a live base (default http://127.0.0.1:3000) when reachable
 * or when --online is set. Warms the base with dns.prefetch + fetch.preconnect
 * (HTTP) before the burst — see lib/http/fetch-preconnect.ts.
 *
 *   bun tools/verify-etag.ts
 *   bun tools/verify-etag.ts --online
 *   bun tools/verify-etag.ts --online --skip-ttl
 *   # HTTPS warmup must use CLI (API throws Invalid port):
 *   bun --fetch-preconnect https://ops.example.com:443 tools/verify-etag.ts --online
 *   HEALTH_URL=https://example.com bun run check:etag -- --online
 *   bun tools/verify-etag.ts --base=http://127.0.0.1:3000 --json
 */

import {
  ACCEPT_JSON,
  ACCEPT_PLAIN,
  BUN_FETCH_CUSTOM_HEADERS_DOCS,
  installGlobalFetchHeaders,
  mergeFetchInit,
} from '../lib/http/fetch-headers.ts';
import {
  computeDataETag,
  isFresh,
  notModified,
  respondWithSharedETag,
} from '../lib/http/data-etag.ts';
import { BUN_DEEP_EQUALS_DOCS, deepEqualsModes, deepEqualsStrict } from '../lib/deep-equals.ts';
import { inspectTable } from '../lib/console-depth.ts';
import {
  BUN_DNS_PREFETCHING_DOCS,
  BUN_FETCH_PRECONNECT_STARTUP_DOCS,
  dnsCacheStats,
  preconnectOrigin,
} from '../lib/http/fetch-preconnect.ts';

// ── Canonical API refs (bun.com — institutional SSOT; not bun.sh) ──────────

const CANONICAL = {
  fetch: 'https://bun.com/docs/runtime/networking/fetch#sending-an-http-request',
  customHeaders: BUN_FETCH_CUSTOM_HEADERS_DOCS,
  preconnect: 'https://bun.com/docs/runtime/networking/fetch#preconnect-to-a-host',
  preconnectStartup: BUN_FETCH_PRECONNECT_STARTUP_DOCS,
  dnsPrefetching: BUN_DNS_PREFETCHING_DOCS,
  dnsPrefetch: 'https://bun.com/docs/runtime/networking/dns#dns-prefetch',
  inspectTable:
    'https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options',
  cryptoHasher: 'https://bun.com/docs/runtime/hashing#bun-cryptohasher',
  nanoseconds: 'https://bun.com/docs/runtime/utils#bun-nanoseconds',
  deepEquals: BUN_DEEP_EQUALS_DOCS,
  sleep: 'https://bun.com/docs/runtime/utils#bun-sleep',
  env: 'https://bun.com/docs/runtime/utils#bun-env',
  version: 'https://bun.com/docs/runtime/utils#bun-version',
  revision: 'https://bun.com/docs/runtime/utils#bun-revision',
} as const;

// ── CLI ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const hit = args.find(a => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
};
const has = (name: string) => args.includes(`--${name}`);

const BASE = flag('base') || Bun.env.HEALTH_URL || Bun.env.BASE_URL || 'http://127.0.0.1:3000';
const WANT_ONLINE = has('online') || has('probe');
const SKIP_TTL = has('skip-ttl');
const AS_JSON = has('json');
const VERBOSE = has('verbose');
/** Wait past HEALTH_TTL_MS (5s) + slack — content-hash may still be unchanged. */
const TTL_WAIT_MS = Number(flag('ttl-ms') ?? 6_000);

// ── Result rows ────────────────────────────────────────────────────────────

export type ETagCheckRow = {
  step: string;
  endpoint: string;
  format: string;
  etag: string;
  status: string;
  cache: string;
  pass: boolean;
  detail?: string;
};

function shortEtag(etag: string | null | undefined, n = 14): string {
  if (!etag) return '—';
  if (etag.length <= n + 1) return etag;
  return `${etag.slice(0, n)}…`;
}

function cacheLabel(
  status: number,
  kind: 'hit' | 'miss' | 'shared' | 'broken' | 'none' | 'stable' | 'changed'
): string {
  switch (kind) {
    case 'hit':
      return status === 304 ? 'HIT' : 'MISS';
    case 'miss':
      return status === 200 ? 'MISS' : String(status);
    case 'shared':
      return 'SHARED';
    case 'broken':
      return 'BROKEN';
    case 'stable':
      return 'STABLE';
    case 'changed':
      return 'CHANGED';
    default:
      return '—';
  }
}

// ── Offline: data-etag + deepEquals (no network) ───────────────────────────

/**
 * Prove shared data-ETag + strict deepEquals locally.
 * Same underlying data → same ETag across JSON / plain render paths.
 */
export function runOfflineETagProof(): ETagCheckRow[] {
  const data = { status: 'ok', packages: 3, bun: Bun.version };
  const dataSameShape = { bun: Bun.version, packages: 3, status: 'ok' }; // key order differs
  const dataDrift = { status: 'ok', packages: 4, bun: Bun.version };

  const etag = computeDataETag(data);
  const etagReordered = computeDataETag(dataSameShape);
  const etagDrift = computeDataETag(dataDrift);

  const rows: ETagCheckRow[] = [];

  // 1. CryptoHasher stable across key order
  const orderOk = etag === etagReordered && etag !== etagDrift;
  rows.push({
    step: '1. offline hash order',
    endpoint: 'computeDataETag',
    format: 'data',
    etag: shortEtag(etag),
    status: orderOk ? 'eq' : 'ne',
    cache: orderOk ? 'STABLE' : 'BROKEN',
    pass: orderOk,
    detail: 'same data (key order) → same ETag; drift changes ETag',
  });

  // 2. deepEquals strict on payload shape (house default)
  const deq = deepEqualsModes(data, dataSameShape);
  rows.push({
    step: '2. deepEquals data',
    endpoint: 'deepEquals',
    format: 'strict',
    etag: shortEtag(etag),
    status: deq.strict ? 'true' : 'false',
    cache: deq.diverges ? 'DIVERGES' : deq.strict ? 'EQUAL' : 'UNEQUAL',
    pass: deq.strict && deq.loose && !deq.diverges,
    detail: `${BUN_DEEP_EQUALS_DOCS} · modes=${JSON.stringify(deq)}`,
  });

  // 3. JSON 200 with shared ETag
  const jsonReq = new Request('http://local/health', {
    headers: { Accept: 'application/json' },
  });
  const rJson = respondWithSharedETag(
    jsonReq,
    data,
    { body: JSON.stringify(data), contentType: 'application/json' },
    { etag, vary: 'Accept' }
  );
  const jsonEtag = rJson.headers.get('ETag');
  rows.push({
    step: '3. offline JSON 200',
    endpoint: '/health',
    format: 'JSON',
    etag: shortEtag(jsonEtag),
    status: String(rJson.status),
    cache: cacheLabel(rJson.status, 'miss'),
    pass: rJson.status === 200 && jsonEtag === etag && rJson.headers.get('Vary') === 'Accept',
  });

  // 4. Plain with If-None-Match → 304 (shared across format)
  const plainReq = new Request('http://local/health/pre', {
    headers: {
      Accept: 'text/plain',
      'If-None-Match': etag,
    },
  });
  const sharedFresh = isFresh(plainReq, etag);
  const r304 = notModified(etag);
  rows.push({
    step: '4. offline plain 304',
    endpoint: '/health/pre',
    format: 'plain',
    etag: shortEtag(etag),
    status: String(r304.status),
    cache: sharedFresh && r304.status === 304 ? 'SHARED' : 'BROKEN',
    pass: sharedFresh && r304.status === 304 && r304.headers.get('Vary') === 'Accept',
    detail: 'same data ETag on plain → 304 even though format differs',
  });

  // 5. deepEquals on ETag strings (identity of shared scope)
  const etagEqual = deepEqualsStrict(jsonEtag, etag);
  rows.push({
    step: '5. deepEquals ETag',
    endpoint: 'ETag header',
    format: 'all',
    etag: shortEtag(etag),
    status: etagEqual ? 'match' : 'mismatch',
    cache: etagEqual ? 'SHARED' : 'BROKEN',
    pass: etagEqual,
    detail: 'JSON response ETag deepEquals computed data ETag (strict)',
  });

  // 6. undefined key ≠ missing under strict (docs shape — not used for wire hash)
  const a = { entries: [1, 2] };
  const b = { entries: [1, 2], extra: undefined };
  const modes = deepEqualsModes(a, b);
  rows.push({
    step: '6. strict docs shape',
    endpoint: 'deepEquals',
    format: 'strict',
    etag: '—',
    status: `${modes.strict}/${modes.loose}`,
    cache: modes.diverges ? 'DIVERGES' : '—',
    pass: modes.diverges && !modes.strict && modes.loose,
    detail: 'undefined key ≠ missing (house strict default)',
  });

  return rows;
}

// ── Online: live /health + /health/pre ─────────────────────────────────────

async function fetchHealth(
  base: string,
  path: string,
  opts: { accept: string; ifNoneMatch?: string; method?: string } = {
    accept: ACCEPT_JSON,
  }
): Promise<{
  status: number;
  etag: string | null;
  vary: string | null;
  scope: string | null;
  body: unknown;
  text: string;
}> {
  const headers: Record<string, string> = { Accept: opts.accept };
  if (opts.ifNoneMatch) headers['If-None-Match'] = opts.ifNoneMatch;
  const res = await fetch(
    new URL(path, base.endsWith('/') ? base : `${base}/`),
    mergeFetchInit({
      method: opts.method ?? 'GET',
      headers,
      ...(VERBOSE ? { verbose: true } : {}),
    })
  );
  const etag = res.headers.get('ETag');
  const vary = res.headers.get('Vary');
  const scope = res.headers.get('X-ETag-Scope');
  let body: unknown = null;
  let text = '';
  if (res.status !== 304) {
    text = await res.text();
    if (opts.accept.includes('json')) {
      try {
        body = JSON.parse(text) as unknown;
      } catch {
        body = text;
      }
    } else {
      body = text;
    }
  }
  return { status: res.status, etag, vary, scope, body, text };
}

export async function runOnlineETagSuite(
  base: string,
  opts: { skipTtl?: boolean; ttlWaitMs?: number } = {}
): Promise<ETagCheckRow[]> {
  const rows: ETagCheckRow[] = [];
  const skipTtl = opts.skipTtl ?? false;
  const ttlWaitMs = opts.ttlWaitMs ?? TTL_WAIT_MS;

  // 0. Warm DNS (fetch#dns-prefetching) + fetch.preconnect when runtime accepts the URL.
  // Gap between warm and first GET is intentional — see preconnect / DNS prefetch docs.
  const warm = preconnectOrigin(base);
  const dnsStats = dnsCacheStats();
  rows.push({
    step: '0. dns.prefetch base',
    endpoint: warm.origin,
    format: warm.port != null ? `dns:${warm.port}` : 'dns',
    etag: '—',
    status: warm.dnsPrefetch ? 'ok' : 'fail',
    cache: `size=${dnsStats.size}`,
    pass: warm.dnsPrefetch,
    detail: `dns.prefetch(${warm.host}${warm.port != null ? `, ${warm.port}` : ''}) · totalCount=${dnsStats.totalCount}`,
  });
  rows.push({
    step: '0b. preconnect base',
    endpoint: warm.origin,
    format: 'warm',
    etag: '—',
    status: warm.fetchPreconnect ? 'tcp+tls' : warm.dnsPrefetch ? 'dns-only' : 'skip',
    cache: warm.fetchPreconnect ? 'PRECONNECT' : '—',
    pass: warm.dnsPrefetch || warm.fetchPreconnect,
    detail: warm.note,
  });

  // 1. GET /health JSON
  const json = await fetchHealth(base, '/health', { accept: ACCEPT_JSON });
  const etag = json.etag;
  rows.push({
    step: '1. GET /health',
    endpoint: '/health',
    format: 'JSON',
    etag: shortEtag(etag),
    status: String(json.status),
    cache: '—',
    pass: json.status === 200 && Boolean(etag) && (json.vary?.includes('Accept') ?? false),
    detail: `scope=${json.scope ?? '—'} vary=${json.vary ?? '—'}`,
  });

  if (!etag) {
    rows.push({
      step: '2–6. skipped',
      endpoint: '/health/*',
      format: 'all',
      etag: '—',
      status: '—',
      cache: 'BROKEN',
      pass: false,
      detail: 'no ETag on /health — remaining online steps skipped',
    });
    return rows;
  }

  // 2. Same path If-None-Match → 304
  const reJson = await fetchHealth(base, '/health', {
    accept: ACCEPT_JSON,
    ifNoneMatch: etag,
  });
  rows.push({
    step: '2. revalidate JSON',
    endpoint: '/health',
    format: 'JSON',
    etag: shortEtag(etag),
    status: String(reJson.status),
    cache: reJson.status === 304 ? 'HIT' : 'MISS',
    pass: reJson.status === 304,
  });

  // 3. /health/pre with same ETag → 304 (shared format)
  const pre304 = await fetchHealth(base, '/health/pre', {
    accept: ACCEPT_PLAIN,
    ifNoneMatch: etag,
  });
  rows.push({
    step: '3. GET /health/pre',
    endpoint: '/health/pre',
    format: 'plain',
    etag: shortEtag(etag),
    status: String(pre304.status),
    cache: pre304.status === 304 ? 'HIT' : 'MISS',
    pass: pre304.status === 304,
    detail: 'shared data ETag across JSON + plain (Vary: Accept)',
  });

  // 4. Fresh plain 200 must emit the same ETag (deepEquals)
  const pre200 = await fetchHealth(base, '/health/pre', { accept: ACCEPT_PLAIN });
  const etagsMatch = deepEqualsStrict(pre200.etag, etag);
  rows.push({
    step: '4. plain ETag shared',
    endpoint: '/health/pre',
    format: 'plain',
    etag: shortEtag(pre200.etag),
    status: String(pre200.status),
    cache: etagsMatch ? 'SHARED' : 'BROKEN',
    pass: pre200.status === 200 && etagsMatch && (pre200.vary?.includes('Accept') ?? false),
    detail: 'deepEqualsStrict(plain.ETag, json.ETag)',
  });

  // 5. Dual revalidate both formats
  const vJson = await fetchHealth(base, '/health', {
    accept: ACCEPT_JSON,
    ifNoneMatch: etag,
  });
  const vPre = await fetchHealth(base, '/health/pre', {
    accept: ACCEPT_PLAIN,
    ifNoneMatch: etag,
  });
  const sharedOk = vJson.status === 304 && vPre.status === 304;
  rows.push({
    step: '5. verify shared',
    endpoint: '/health/*',
    format: 'all',
    etag: shortEtag(etag),
    status: `${vJson.status}/${vPre.status}`,
    cache: sharedOk ? 'SHARED' : 'BROKEN',
    pass: sharedOk,
  });

  // 6. After TTL: content-hash may stay stable — re-check shared contract
  if (skipTtl) {
    rows.push({
      step: '6. after TTL',
      endpoint: '/health',
      format: 'JSON',
      etag: shortEtag(etag),
      status: 'skipped',
      cache: '—',
      pass: true,
      detail: '--skip-ttl',
    });
  } else {
    await Bun.sleep(ttlWaitMs);
    const fresh = await fetchHealth(base, '/health', { accept: ACCEPT_JSON });
    const freshEtag = fresh.etag;
    const changed = freshEtag !== etag;
    // Pass if: 200 + has ETag + shared revalidate still works with fresh tag
    // (ETag change is content-driven, not time-driven — STABLE is OK)
    let newShared = false;
    if (freshEtag) {
      const nJson = await fetchHealth(base, '/health', {
        accept: ACCEPT_JSON,
        ifNoneMatch: freshEtag,
      });
      const nPre = await fetchHealth(base, '/health/pre', {
        accept: ACCEPT_PLAIN,
        ifNoneMatch: freshEtag,
      });
      newShared = nJson.status === 304 && nPre.status === 304;
    }
    rows.push({
      step: '6. after TTL',
      endpoint: '/health',
      format: 'JSON',
      etag: `${shortEtag(etag, 8)} → ${shortEtag(freshEtag, 8)}`,
      status: String(fresh.status),
      cache: changed ? 'CHANGED' : 'STABLE',
      pass: fresh.status === 200 && Boolean(freshEtag) && newShared,
      detail: changed
        ? 'content hash rotated; new ETag shared across formats'
        : 'content-stable ETag (expected when health payload unchanged); shared revalidate still holds',
    });
  }

  return rows;
}

async function baseReachable(base: string): Promise<boolean> {
  try {
    const res = await fetch(
      new URL('/health', base.endsWith('/') ? base : `${base}/`),
      mergeFetchInit({ signal: AbortSignal.timeout(2_000), headers: { Accept: ACCEPT_JSON } })
    );
    return res.status > 0;
  } catch {
    return false;
  }
}

// ── Render ─────────────────────────────────────────────────────────────────

function renderTable(rows: ETagCheckRow[]): string {
  // Bun.inspect.table wants objects — array-of-arrays leaves named columns empty.
  return inspectTable(
    rows.map(r => ({
      step: r.step,
      format: r.format,
      etag: r.etag,
      status: r.status,
      cache: r.cache,
      pass: r.pass ? 'PASS' : 'FAIL',
    })),
    ['step', 'format', 'etag', 'status', 'cache', 'pass'],
    { colors: true }
  );
}

function printBanner(base: string, elapsedMs: number, mode: string): void {
  const bunLine = `${Bun.version} / ${(Bun.revision || 'unknown').slice(0, 8)}`;
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  ETag Verification Suite                                             ║');
  console.log(`║  Mode: ${mode.padEnd(62)}║`);
  console.log(`║  Base: ${base.slice(0, 62).padEnd(62)}║`);
  console.log(`║  Bun:  ${bunLine.padEnd(62)}║`);
  console.log(`║  Time: ${(elapsedMs.toFixed(2) + 'ms').padEnd(61)}║`);
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('');
}

function printCanonicalFooter(): void {
  console.log('\nCanonical API references (bun.com):');
  for (const [k, url] of Object.entries(CANONICAL)) {
    console.log(`  • ${k.padEnd(14)} ${url}`);
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  installGlobalFetchHeaders();
  const t0 = Bun.nanoseconds();
  const offline = runOfflineETagProof();

  let online: ETagCheckRow[] = [];
  let mode = 'offline (data-etag + deepEquals)';
  const probe = WANT_ONLINE || (await baseReachable(BASE));

  if (WANT_ONLINE && !(await baseReachable(BASE))) {
    console.error(`--online requested but base not reachable: ${BASE}`);
    process.exit(2);
  }

  if (probe) {
    online = await runOnlineETagSuite(BASE, { skipTtl: SKIP_TTL, ttlWaitMs: TTL_WAIT_MS });
    mode = SKIP_TTL ? 'offline + online (--skip-ttl)' : 'offline + online';
  }

  const rows = [...offline, ...online];
  const elapsedMs = (Bun.nanoseconds() - t0) / 1e6;
  const passed = rows.filter(r => r.pass).length;
  const total = rows.length;

  if (AS_JSON) {
    console.log(
      JSON.stringify(
        {
          base: BASE,
          mode,
          bun: Bun.version,
          revision: Bun.revision,
          elapsedMs,
          summary: { passed, total, ok: passed === total },
          rows,
          canonical: CANONICAL,
        },
        null,
        2
      )
    );
  } else {
    printBanner(BASE, elapsedMs, mode);
    console.log(renderTable(rows));
    console.log('');
    console.log(`${passed}/${total} checks passed`);
    if (passed < total) {
      console.log('\nFAILURES:');
      for (const r of rows.filter(x => !x.pass)) {
        console.log(
          `  • ${r.step}: status=${r.status} cache=${r.cache}${r.detail ? ` — ${r.detail}` : ''}`
        );
      }
    } else {
      console.log('\nAll ETag behaviors correct');
    }
    if (!probe) {
      console.log(
        `\n(online skipped — start scripts/serve-public.ts or pass --online / HEALTH_URL=${BASE})`
      );
    }
    printCanonicalFooter();
  }

  if (passed < total) process.exit(1);
}

if (import.meta.main) {
  main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
  });
}
