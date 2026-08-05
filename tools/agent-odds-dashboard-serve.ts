#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/http/server#basic-setup — Bun.serve
// @see https://bun.com/docs/runtime/networking/dns#dns-prefetch — Bun.dns
// @see https://bun.com/docs/runtime/networking/dns#dns-prefetch — Bun.dns.prefetch
// @see https://bun.com/docs/runtime/webview#new-bun-webview-options — WebView
// @see https://bun.com/docs/api/http — Bun.serve
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/hashing — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/utils#bun-nanoseconds — Bun.nanoseconds
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
/**
 * Serve Bun Agent Live Odds Intelligence dashboard (v1.03) + mock APIs.
 *
 *   bun run agent:odds-dashboard
 *   open http://127.0.0.1:3000/
 *
 * Static:
 *   public/portal/agent-odds/dashboard-v1.03.html (latest index)
 *   public/portal/agent-odds/dashboard-v1.02.html · dashboard.html (prior)
 *
 * APIs:
 *   GET  /api/odds/options · /api/odds · /api/odds/stats · /api/odds/stream
 *   GET  /api/partners/health  (merged bookmakers + partners-ops)
 *   POST /api/upload · /api/auth/login · /api/backup
 *   GET  /api/pool · /api/prefetch · /api/platform
 */
import {
  loadMergedRegistry,
  resolvePartnerForHost,
  type MergedPartnerHealth,
  type MergedRegistry,
} from '../lib/bookmakers/merged-registry.ts';
import { joinPath } from '../lib/path-bun.ts';

const ROOT = joinPath(import.meta.dir, '..');
const DASH_DIR = joinPath(ROOT, 'public/portal/agent-odds');
const PORT = Number(Bun.env.PORT || Bun.env.AGENT_ODDS_PORT || 3000);
const HOST = Bun.env.HOST || '127.0.0.1';

/** Fallback hosts when registry has no urls.web */
const FALLBACK_HOSTS = [
  'hardrock.bet',
  'bet365.com',
  'stake.com',
  'cloudbet.com',
  'fonbet.com',
  'pinnacle.com',
] as const;

let MERGED: MergedRegistry | null = null;
async function getMerged(): Promise<MergedRegistry> {
  if (!MERGED) MERGED = await loadMergedRegistry(ROOT);
  return MERGED;
}

function catalogHosts(merged: MergedRegistry): string[] {
  const hosts = new Set<string>();
  for (const h of Object.keys(merged.hostIndex)) {
    if (h.includes('.')) hosts.add(h);
  }
  if (hosts.size === 0) {
    for (const h of FALLBACK_HOSTS) hosts.add(h);
  }
  return [...hosts].sort();
}

const SPORTS = [
  'basketball',
  'football',
  'tennis',
  'ice hockey',
  'baseball',
  'american football',
] as const;

const LEAGUES = [
  'NBA',
  'Premier League',
  'ATP',
  'NHL',
  'MLB',
  'NFL',
  'La Liga',
  'Serie A',
  'Bundesliga',
] as const;

const MARKETS = ['moneyline', 'spread', 'total', 'team_total', 'over_under'] as const;

const SESSIONS = ['pregame', 'live'] as const;

type OddsRow = {
  host: string;
  sport: string;
  league: string;
  market_type: string;
  session: string;
  price: string;
  timestamp: number;
  marketData: { selections: Array<{ price: string }> };
  bookmakerId?: string;
  liquidityTier?: string;
  partnerStatus?: string;
  label?: string;
};

const poolState = {
  active: 8,
  idle: 4,
  streams: 12,
  prefetchHits: 0,
  http2: true,
};

/** Demo-only credentials for local mock agent (not production). */
const DEMO_USER = Bun.env.AGENT_DEMO_USER || 'analyst';
const DEMO_PASS = Bun.env.AGENT_DEMO_PASS || 'password123';

const rateState = {
  rateCurrent: 12,
  rateLimit: 100,
  lastBackup: null as string | null,
};

function pick<T extends readonly string[]>(arr: T): T[number] {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function enrichRow(row: OddsRow, merged: MergedRegistry): OddsRow {
  const id = resolvePartnerForHost(merged.hostIndex, row.host);
  const partner = id ? merged.health.find(h => h.id === id) : undefined;
  return {
    ...row,
    bookmakerId: id,
    liquidityTier: partner?.liquidityTier ?? 'unknown',
    partnerStatus: partner?.status ?? 'unknown',
    label: partner?.label,
  };
}

function generateOdds(count: number, hosts: string[]): OddsRow[] {
  const hostPool = hosts.length ? hosts : [...FALLBACK_HOSTS];
  const out: OddsRow[] = [];
  for (let i = 0; i < count; i++) {
    const price = (1 + Math.random() * 3).toFixed(2);
    out.push({
      host: hostPool[Math.floor(Math.random() * hostPool.length)]!,
      sport: pick(SPORTS),
      league: pick(LEAGUES),
      market_type: pick(MARKETS),
      session: pick(SESSIONS),
      price,
      timestamp: Date.now() - Math.floor(Math.random() * 600_000),
      marketData: { selections: [{ price }] },
    });
  }
  return out;
}

let CATALOG: OddsRow[] | null = null;

async function getCatalog(refresh = false): Promise<OddsRow[]> {
  const merged = await getMerged();
  if (!CATALOG || refresh) {
    const hosts = catalogHosts(merged);
    CATALOG = generateOdds(120, hosts).map(r => enrichRow(r, merged));
  }
  return CATALOG;
}

function filterOdds(rows: OddsRow[], url: URL): { data: OddsRow[]; total: number } {
  let filtered = rows;
  const host = url.searchParams.get('host');
  const sport = url.searchParams.get('sport');
  const league = url.searchParams.get('league');
  const marketType = url.searchParams.get('market_type');
  const session = url.searchParams.get('session');
  const liquidity = url.searchParams.get('liquidity') || url.searchParams.get('liquidityTier');
  const status = url.searchParams.get('status') || url.searchParams.get('partner_status');
  if (host) filtered = filtered.filter(r => r.host === host);
  if (sport) filtered = filtered.filter(r => r.sport === sport);
  if (league) filtered = filtered.filter(r => r.league === league);
  if (marketType) filtered = filtered.filter(r => r.market_type === marketType);
  if (session) filtered = filtered.filter(r => r.session === session);
  if (liquidity) {
    filtered = filtered.filter(r => r.liquidityTier === liquidity);
  }
  if (status) {
    filtered = filtered.filter(r => r.partnerStatus === status);
  }
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 100), 1), 500);
  return { data: filtered.slice(0, limit), total: filtered.length };
}

function healthSummary(health: MergedPartnerHealth[]) {
  const online = health.filter(p => p.status === 'active' || p.status === 'low_balance').length;
  return {
    online,
    total: health.length,
    allOnline: online === health.length && health.length > 0,
    byStatus: health.reduce(
      (acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
    byLiquidity: health.reduce(
      (acc, p) => {
        acc[p.liquidityTier] = (acc[p.liquidityTier] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
  };
}

function statsFrom(rows: OddsRow[], hostCount: number) {
  const bySport: Record<string, number> = {};
  const byLiquidity: Record<string, number> = {};
  let markets = 0;
  for (const r of rows) {
    bySport[r.sport] = (bySport[r.sport] || 0) + 1;
    const tier = r.liquidityTier || 'unknown';
    byLiquidity[tier] = (byLiquidity[tier] || 0) + 1;
    markets += r.marketData.selections.length;
  }
  return {
    bySport,
    byLiquidity,
    totalRows: rows.length,
    totalMarkets: markets,
    hosts: hostCount,
  };
}

function json(data: object, status = 200): Response {
  const body = JSON.stringify(data);
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function contentType(path: string): string {
  if (path.endsWith('.html')) return 'text/html; charset=utf-8';
  if (path.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (path.endsWith('.css')) return 'text/css; charset=utf-8';
  if (path.endsWith('.svg')) return 'image/svg+xml';
  if (path.endsWith('.json')) return 'application/json; charset=utf-8';
  return 'application/octet-stream';
}

function oddsStreamResponse(hosts: string[]): Response {
  const hostPool = (hosts.length ? hosts : [...FALLBACK_HOSTS]) as readonly string[];
  let id = 0;
  let timer: ReturnType<typeof setInterval> | undefined;
  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      const send = () => {
        id += 1;
        const price = (1 + Math.random() * 3).toFixed(2);
        const payload = {
          id,
          host: hostPool[Math.floor(Math.random() * hostPool.length)]!,
          sport: pick(SPORTS),
          market: pick(MARKETS),
          price,
          session: pick(SESSIONS),
          at: new Date().toISOString(),
        };
        controller.enqueue(enc.encode(`id: ${id}\ndata: ${JSON.stringify(payload)}\n\n`));
        poolState.streams = Math.min(poolState.streams + 1, 99);
      };
      send();
      timer = setInterval(send, 1500);
    },
    cancel() {
      if (timer) clearInterval(timer);
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

async function handleUpload(req: Request): Promise<Response> {
  const t0 = Bun.nanoseconds();
  const form = await req.formData();
  const file = form.get('file');
  if (!file || typeof file === 'string') {
    return json({ ok: false, error: 'file field required (Blob/File)' }, 400);
  }
  const blob = file as Blob & { name?: string };
  const buf = new Uint8Array(await blob.arrayBuffer());
  const sha256 = new Bun.CryptoHasher('sha256').update(buf).digest('hex');
  const ms = Math.round((Bun.nanoseconds() - t0) / 1e6);
  poolState.active = Math.min(poolState.active + 1, 40);
  return json({
    ok: true,
    message: `FormData received · ${blob.name ?? 'blob'} · ${buf.byteLength} bytes`,
    name: blob.name ?? null,
    size: buf.byteLength,
    type: blob.type || 'application/octet-stream',
    kind: form.get('kind')?.toString() ?? null,
    sha256,
    ms,
  });
}

const server = Bun.serve({
  hostname: HOST,
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    if (path === '/api/odds/options') {
      const merged = await getMerged();
      const hosts = catalogHosts(merged);
      return json({
        hosts,
        sports: [...SPORTS],
        leagues: [...LEAGUES],
        marketTypes: [...MARKETS],
        sessions: [...SESSIONS],
        liquidityTiers: ['high', 'medium', 'low', 'illiquid', 'unknown'],
        partnerStatuses: ['active', 'low_balance', 'critical', 'degraded', 'offline', 'deferred'],
        partners: merged.health.map(p => ({
          id: p.id,
          label: p.label,
          liquidityTier: p.liquidityTier,
          status: p.status,
        })),
      });
    }

    if (path === '/api/odds' || path === '/api/odds/') {
      const refresh = url.searchParams.get('refresh') === '1';
      const rows = await getCatalog(refresh);
      const { data, total } = filterOdds(rows, url);
      return json({ data, total, generatedAt: new Date().toISOString() });
    }

    if (path === '/api/odds/stats') {
      const rows = await getCatalog();
      const merged = await getMerged();
      return json(statsFrom(rows, catalogHosts(merged).length));
    }

    if (path === '/api/odds/stream') {
      const merged = await getMerged();
      return oddsStreamResponse(catalogHosts(merged));
    }

    if (path === '/api/partners/health' || path === '/api/partners/health/') {
      const refresh = url.searchParams.get('refresh') === '1';
      if (refresh) MERGED = null;
      const merged = await getMerged();
      const summary = healthSummary(merged.health);
      const lastProbe = merged.health.find(partner => partner.lastProbe)?.lastProbe ?? null;
      return json({
        generatedAt: merged.generatedAt,
        lastProbe,
        source: merged.source,
        summary,
        health: merged.health,
        // compact list for table join / filters
        liquidity: summary.byLiquidity,
      });
    }

    if (path === '/api/upload' && req.method === 'POST') {
      return handleUpload(req);
    }

    if (path === '/api/auth/login' && req.method === 'POST') {
      try {
        const body = (await req.json()) as {
          username?: string;
          password?: string;
        };
        const username = body.username?.trim() ?? '';
        const password = body.password ?? '';
        if (username === DEMO_USER && password === DEMO_PASS) {
          rateState.rateCurrent = Math.min(rateState.rateCurrent + 1, rateState.rateLimit);
          return json({
            ok: true,
            user: username,
            token: 'demo-' + Bun.randomUUIDv7().slice(0, 8),
            note: 'local mock login — not for production',
          });
        }
        return json({ ok: false, error: 'invalid credentials' }, 401);
      } catch {
        return json({ ok: false, error: 'invalid json body' }, 400);
      }
    }

    if (path === '/api/backup' && req.method === 'POST') {
      rateState.lastBackup = new Date().toISOString();
      rateState.rateCurrent = Math.min(rateState.rateCurrent + 1, rateState.rateLimit);
      return json({
        ok: true,
        message: 'Mock SQLite backup complete',
        at: rateState.lastBackup,
        path: 'data/operator-research/backups/mock.db',
      });
    }

    if (path === '/api/pool') {
      // mild jitter so UI feels live
      poolState.active = 5 + Math.floor(Math.random() * 15);
      poolState.idle = Math.floor(Math.random() * 8);
      return json({ ...poolState });
    }

    if (path === '/api/prefetch') {
      const host = url.searchParams.get('host') || 'hardrock.bet';
      const t0 = Bun.nanoseconds();
      try {
        // DNS/TCP pre-warm signal (best-effort; no real book scrape)
        if (typeof Bun.dns?.prefetch === 'function') {
          Bun.dns.prefetch(host);
        }
      } catch {
        /* ignore */
      }
      await Bun.sleep(50 + Math.floor(Math.random() * 120));
      const ms = Math.round((Bun.nanoseconds() - t0) / 1e6);
      poolState.prefetchHits += 1;
      return json({ ok: true, host, ms, prefetchHits: poolState.prefetchHits });
    }

    if (path === '/api/platform') {
      rateState.rateCurrent = Math.min(
        rateState.rateCurrent + Math.floor(Math.random() * 3),
        rateState.rateLimit
      );
      const merged = await getMerged();
      const summary = healthSummary(merged.health);
      return json({
        bun: Bun.version,
        auth: 'mock',
        webview: typeof (Bun as { WebView?: unknown }).WebView !== 'undefined',
        image: typeof (Bun as { Image?: unknown }).Image !== 'undefined',
        cron: true,
        operators: merged.health.length,
        partnersOnline: summary.online,
        partnersTotal: summary.total,
        byLiquidity: summary.byLiquidity,
        dashboard: 'agent-odds v1.03+liquidity',
        rateCurrent: rateState.rateCurrent,
        rateLimit: rateState.rateLimit,
        lastBackup: rateState.lastBackup,
        lastProbe: merged.health.find(partner => partner.lastProbe)?.lastProbe ?? null,
        features: [
          'sse',
          'formdata',
          'pool',
          'prefetch',
          'auth',
          'backup',
          'arb-ui',
          'charts',
          'partner-health',
          'liquidity-filter',
        ],
      });
    }

    // Static: default to v1.03
    let filePath = path === '/' || path === '' ? '/dashboard-v1.03.html' : path;
    if (filePath === '/index.html') filePath = '/dashboard-v1.03.html';
    if (filePath === '/dashboard.html') {
      const v1 = joinPath(DASH_DIR, 'dashboard.html');
      if (!(await Bun.file(v1).exists())) {
        filePath = '/dashboard-v1.03.html';
      }
    }
    const safe = filePath.replace(/\.\./g, '').replace(/^\/+/, '');
    const abs = joinPath(DASH_DIR, safe || 'dashboard-v1.03.html');
    if (!abs.startsWith(DASH_DIR)) {
      return new Response('Forbidden', { status: 403 });
    }
    const file = Bun.file(abs);
    if (await file.exists()) {
      return new Response(file, {
        headers: {
          'Content-Type': contentType(abs),
          'Cache-Control': 'no-store',
        },
      });
    }
    return new Response('Not found', { status: 404 });
  },
});

console.log(
  `agent-odds dashboard v1.03+liquidity → http://${server.hostname}:${server.port}/  (health · liquidity · arb · auth mock)`
);
