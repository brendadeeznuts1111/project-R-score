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
 * Serve Bun Agent Live Odds Intelligence dashboard (v1.06 Uncovered Edges) + mock APIs.
 *
 *   bun run agent:odds-dashboard
 *   open http://127.0.0.1:3000/
 *
 * Static:
 *   public/portal/agent-odds/dashboard-v1.06.html (default /)
 *   public/portal/agent-odds/dashboard-v1.03.html · v1.02 · dashboard.html
 *
 * APIs:
 *   GET  /api/odds/* · /api/partners/health
 *   GET  /api/events · /api/events/:id · /api/events/:id/history
 *   GET  /api/edges  (arb · value · steam · Kelly · latency-adjusted)
 *   GET|POST /api/alerts/rules · DELETE /api/alerts/rules/:id
 *   GET  /api/alerts/history · /api/alerts/performance
 *   POST /api/upload · /api/auth/login · /api/backup
 *   GET  /api/pool · /api/prefetch · /api/platform
 */
import {
  loadMergedRegistry,
  resolvePartnerForHost,
  type MergedPartnerHealth,
  type MergedRegistry,
} from '../lib/bookmakers/merged-registry.ts';
import {
  defaultAlertRules,
  detectEdges,
  edgesSummary,
  filterEdges,
  generateEventHistory,
  generateEvents,
  rulePerformanceSnapshot,
  type AgentEvent,
  type AlertRule,
  type EdgeOpportunity,
} from '../lib/operator-research/edge-engine.ts';
import { joinPath } from '../lib/path-bun.ts';
import {
  asRuleId,
  tryEventId,
  tryRuleId,
  type RuleId,
  type SportsbookId,
} from '../lib/types/branded.ts';

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
  bookmakerId?: SportsbookId;
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

/** In-memory edge / events / rules plane (local mock agent). */
let EVENTS_CACHE: AgentEvent[] | null = null;
let EDGES_CACHE: EdgeOpportunity[] | null = null;
let ALERT_RULES: AlertRule[] = defaultAlertRules();
const ALERT_HISTORY: Array<{
  rule_id: RuleId;
  message: string;
  timestamp: number;
}> = [
  {
    rule_id: asRuleId('price-move'),
    message: 'NBA: Lakers vs Celtics moved 6.2% (latency 210ms)',
    timestamp: Date.now() - 120_000,
  },
  {
    rule_id: asRuleId('arbitrage'),
    message: 'Arbitrage 2.4% on NFL: Chiefs vs 49ers (cross-book)',
    timestamp: Date.now() - 300_000,
  },
  {
    rule_id: asRuleId('steam'),
    message: 'Steam move 9.1% on NHL: Rangers vs Bruins',
    timestamp: Date.now() - 450_000,
  },
  {
    rule_id: asRuleId('value-bet'),
    message: 'Value bet 4.2% EV on Premier League: Arsenal vs Chelsea',
    timestamp: Date.now() - 600_000,
  },
];

async function getEvents(refresh = false): Promise<AgentEvent[]> {
  if (refresh) MERGED = null;
  if (!EVENTS_CACHE || refresh) {
    const merged = await getMerged();
    EVENTS_CACHE = generateEvents(merged.health, 24);
    EDGES_CACHE = null;
  }
  return EVENTS_CACHE;
}

async function getEdges(refresh = false): Promise<EdgeOpportunity[]> {
  const events = await getEvents(refresh);
  if (!EDGES_CACHE || refresh) {
    EDGES_CACHE = detectEdges(events, { minEdgePct: 0.3 });
  }
  return EDGES_CACHE;
}

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
  if (refresh) MERGED = null;
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
      if (refresh) {
        MERGED = null;
        CATALOG = null;
        EVENTS_CACHE = null;
        EDGES_CACHE = null;
      }
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

    // ── Events / Edges / Alerts (v1.06) ──────────────────────────
    if (path === '/api/events' || path === '/api/events/') {
      const refresh = url.searchParams.get('refresh') === '1';
      let events = await getEvents(refresh);
      const sport = url.searchParams.get('sport');
      const league = url.searchParams.get('league');
      const status = url.searchParams.get('status');
      const geo = url.searchParams.get('geo');
      const state = url.searchParams.get('state');
      if (sport) events = events.filter(e => e.sport === sport);
      if (league) events = events.filter(e => e.league === league);
      if (status) events = events.filter(e => e.status === status);
      if (geo) events = events.filter(e => e.geo === geo);
      if (state) events = events.filter(e => e.state === state);
      return json({
        data: events,
        total: events.length,
        generatedAt: new Date().toISOString(),
      });
    }

    const eventHistoryMatch = path.match(/^\/api\/events\/([^/]+)\/history\/?$/);
    if (eventHistoryMatch) {
      const eventId = tryEventId(decodeURIComponent(eventHistoryMatch[1]!));
      if (!eventId) return json({ ok: false, error: 'invalid event id' }, 400);
      const events = await getEvents();
      const ev = events.find(e => e.id === eventId);
      if (!ev) return json({ ok: false, error: 'event not found' }, 404);
      const market = url.searchParams.get('market') || 'moneyline';
      const books = Object.keys(ev.bookmakers);
      return json({
        event_id: eventId,
        market,
        data: generateEventHistory(eventId, market, books),
      });
    }

    const eventMatch = path.match(/^\/api\/events\/([^/]+)\/?$/);
    if (eventMatch && req.method === 'GET') {
      const eventId = tryEventId(decodeURIComponent(eventMatch[1]!));
      if (!eventId) return json({ ok: false, error: 'invalid event id' }, 400);
      const events = await getEvents();
      const ev = events.find(e => e.id === eventId);
      if (!ev) return json({ ok: false, error: 'event not found' }, 404);
      return json({ data: ev });
    }

    if (path === '/api/edges' || path === '/api/edges/') {
      const refresh = url.searchParams.get('refresh') === '1';
      const all = await getEdges(refresh);
      const filtered = filterEdges(all, {
        sport: url.searchParams.get('sport'),
        league: url.searchParams.get('league'),
        type: url.searchParams.get('type'),
        minEdge: url.searchParams.get('min') ? Number(url.searchParams.get('min')) : null,
      });
      const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 100), 1), 500);
      const data = filtered.slice(0, limit);
      return json({
        data,
        total: filtered.length,
        summary: edgesSummary(filtered),
        generatedAt: new Date().toISOString(),
      });
    }

    if (path === '/api/alerts/rules' || path === '/api/alerts/rules/') {
      if (req.method === 'GET') {
        return json({ data: ALERT_RULES, total: ALERT_RULES.length });
      }
      if (req.method === 'POST') {
        try {
          const body = (await req.json()) as Partial<AlertRule>;
          if (!body?.id || !body?.name) {
            return json({ ok: false, error: 'id and name required' }, 400);
          }
          const id = tryRuleId(String(body.id));
          if (!id) return json({ ok: false, error: 'invalid rule id' }, 400);
          const idx = ALERT_RULES.findIndex(r => r.id === id);
          const next: AlertRule = {
            id,
            name: String(body.name),
            description: body.description,
            active: body.active !== false,
            condition: body.condition || '',
            channels: Array.isArray(body.channels) ? body.channels.map(String) : ['ws'],
            email_recipients: body.email_recipients,
            period: body.period || 'all',
            pattern: body.pattern || '',
            market_type: body.market_type || 'all',
            geo: body.geo || 'all',
            state: body.state || '',
            edge: body.edge,
            limit: body.limit,
            latency_threshold: body.latency_threshold,
            bookmaker_comparison: body.bookmaker_comparison,
          };
          if (idx >= 0) ALERT_RULES[idx] = next;
          else ALERT_RULES.push(next);
          ALERT_HISTORY.unshift({
            rule_id: next.id,
            message: `Rule ${idx >= 0 ? 'updated' : 'created'}: ${next.name}`,
            timestamp: Date.now(),
          });
          return json({ ok: true, data: next });
        } catch {
          return json({ ok: false, error: 'invalid json' }, 400);
        }
      }
    }

    const ruleMatch = path.match(/^\/api\/alerts\/rules\/([^/]+)\/?$/);
    if (ruleMatch && req.method === 'DELETE') {
      const id = tryRuleId(decodeURIComponent(ruleMatch[1]!));
      if (!id) return json({ ok: false, error: 'invalid rule id' }, 400);
      const before = ALERT_RULES.length;
      ALERT_RULES = ALERT_RULES.filter(r => r.id !== id);
      if (ALERT_RULES.length === before) {
        return json({ ok: false, error: 'rule not found' }, 404);
      }
      return json({ ok: true, deleted: id });
    }

    if (path === '/api/alerts/history' || path === '/api/alerts/history/') {
      return json({ data: ALERT_HISTORY.slice(0, 50), total: ALERT_HISTORY.length });
    }

    if (path === '/api/alerts/performance' || path === '/api/alerts/performance/') {
      return json({ data: rulePerformanceSnapshot(ALERT_RULES) });
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
        dashboard: 'agent-odds v1.06 edges',
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
          'edges',
          'events',
          'alert-rules',
          'kelly',
          'steam',
          'value-bets',
        ],
      });
    }

    // Static: default to v1.06 Uncovered Edges
    let filePath = path === '/' || path === '' ? '/dashboard-v1.06.html' : path;
    if (filePath === '/index.html') filePath = '/dashboard-v1.06.html';
    if (filePath === '/dashboard.html') {
      const v1 = joinPath(DASH_DIR, 'dashboard.html');
      if (!(await Bun.file(v1).exists())) {
        filePath = '/dashboard-v1.06.html';
      }
    }
    const safe = filePath.replace(/\.\./g, '').replace(/^\/+/, '');
    const abs = joinPath(DASH_DIR, safe || 'dashboard-v1.06.html');
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
  `agent-odds dashboard v1.06 edges → http://${server.hostname}:${server.port}/  (edges · events · alerts · health)`
);
