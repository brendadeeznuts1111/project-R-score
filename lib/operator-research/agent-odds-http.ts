// @see https://bun.com/docs/runtime/networking/dns#dns-prefetch — Bun.dns
// @see https://bun.com/docs/runtime/networking/dns#dns-prefetch — Bun.dns.prefetch
// @see https://bun.com/docs/runtime/webview#new-bun-webview-options — WebView
/**
 * Shared agent-odds HTTP + WebSocket handlers (v1.07 desk).
 *
 * Used by:
 *   - tools/agent-odds-dashboard-serve.ts (standalone desk)
 *   - scripts/serve-public.ts (portal + desk one process)
 *
 * Mock bet/backtest only — not production book placement.
 *
 * @see https://bun.com/docs/runtime/http/websockets
 * @see https://bun.com/docs/runtime/http/server#basic-setup
 */
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
// @see https://bun.com/docs/runtime/hashing — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/utils#bun-nanoseconds — Bun.nanoseconds

import {
  loadMergedRegistry,
  resolvePartnerForHost,
  type MergedPartnerHealth,
  type MergedRegistry,
} from '../bookmakers/merged-registry.ts';
import { joinPath } from '../path-bun.ts';
import { asRuleId, tryEdgeId, tryEventId, tryRuleId, type RuleId } from '../types/branded.ts';
import { runBacktest } from './backtest.ts';
import { listMockBets, placeMockBet } from './bet-mock.ts';
import {
  isAlertChannel,
  isAlertPeriod,
  isSimulatorAlertPattern,
  type AlertChannel,
  type AlertPeriod,
  type SimulatorAlertPattern,
} from './alert-vocabulary.ts';
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
} from './edge-engine.ts';

export const AGENT_ODDS_WS_TOPIC = 'agent-odds';
export const AGENT_ODDS_WS_PATHS = [
  '/ws',
  '/ws/',
  '/api/agent-odds/ws',
  '/api/agent-odds/ws/',
] as const;

const ROOT = joinPath(import.meta.dir, '../..');
const FALLBACK_HOSTS = [
  'hardrock.bet',
  'bet365.com',
  'stake.com',
  'cloudbet.com',
  'fonbet.com',
  'pinnacle.com',
] as const;

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
  bookmakerId?: string; // brand-ok — merged partner/bookmaker slug from hostIndex (desk wire)
  liquidityTier?: string;
  partnerStatus?: string;
  label?: string;
};

const poolState = { active: 8, idle: 4, streams: 12, prefetchHits: 0, http2: true };
const rateState = {
  rateCurrent: 12,
  rateLimit: 100,
  lastBackup: null as string | null,
};
const DEMO_USER = Bun.env.AGENT_DEMO_USER || 'analyst';
const DEMO_PASS = Bun.env.AGENT_DEMO_PASS || 'password123';

let MERGED: MergedRegistry | null = null;
let EVENTS_CACHE: AgentEvent[] | null = null;
let EDGES_CACHE: EdgeOpportunity[] | null = null;
let CATALOG: OddsRow[] | null = null;
let ALERT_RULES: AlertRule[] = defaultAlertRules();
const ALERT_HISTORY: Array<{ rule_id: RuleId; message: string; timestamp: number }> = [
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
];

let broadcastTimer: ReturnType<typeof setInterval> | null = null;
let publishServer: {
  publish: (topic: string, data: string | ArrayBuffer | SharedArrayBuffer) => number;
} | null = null;

function normalizeSimulatorChannels(value: unknown): AlertChannel[] | null {
  if (value == null) return ['ws'];
  if (!Array.isArray(value)) return null;
  const channels: AlertChannel[] = [];
  for (const channel of value) {
    if (typeof channel !== 'string' || !isAlertChannel(channel)) return null;
    channels.push(channel);
  }
  return channels;
}

function normalizeSimulatorPeriod(value: unknown): AlertPeriod | null {
  if (value == null || value === '') return 'all';
  return typeof value === 'string' && isAlertPeriod(value) ? value : null;
}

function normalizeSimulatorPattern(value: unknown): SimulatorAlertPattern | null {
  return typeof value === 'string' && isSimulatorAlertPattern(value) ? value : null;
}

function json(data: object, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

async function getMerged(): Promise<MergedRegistry> {
  if (!MERGED) MERGED = await loadMergedRegistry(ROOT);
  return MERGED;
}

function catalogHosts(merged: MergedRegistry): string[] {
  const hosts = new Set<string>();
  for (const h of Object.keys(merged.hostIndex)) {
    if (h.includes('.')) hosts.add(h);
  }
  if (hosts.size === 0) for (const h of FALLBACK_HOSTS) hosts.add(h);
  return [...hosts].sort();
}

function pick<T extends readonly string[]>(arr: T): T[number] {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function enrichRow(row: OddsRow, merged: MergedRegistry): OddsRow {
  const id = resolvePartnerForHost(merged.hostIndex, row.host);
  const partner = id ? merged.health.find(h => h.id === id) : undefined;
  return {
    ...row,
    bookmakerId: id, // brand-ok — partner slug passthrough onto OddsRow wire
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

async function getCatalog(refresh = false): Promise<OddsRow[]> {
  if (refresh) MERGED = null;
  const merged = await getMerged();
  if (!CATALOG || refresh) {
    CATALOG = generateOdds(120, catalogHosts(merged)).map(r => enrichRow(r, merged));
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
  if (liquidity) filtered = filtered.filter(r => r.liquidityTier === liquidity);
  if (status) filtered = filtered.filter(r => r.partnerStatus === status);
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
  return { bySport, byLiquidity, totalRows: rows.length, totalMarkets: markets, hosts: hostCount };
}

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

function publish(payload: object): void {
  if (!publishServer) return;
  try {
    publishServer.publish(AGENT_ODDS_WS_TOPIC, JSON.stringify(payload));
  } catch {
    /* no subscribers */
  }
}

/**
 * Handle agent-odds API / WS upgrade paths.
 * Returns null when the path is not an agent-odds API (caller continues).
 */
export async function handleAgentOddsRequest(
  req: Request,
  server?: {
    upgrade?: (req: Request, options?: { data?: Record<string, unknown> }) => boolean;
    publish?: (topic: string, data: string | ArrayBuffer | SharedArrayBuffer) => number;
  }
): Promise<Response | null> {
  const url = new URL(req.url);
  const path = url.pathname;

  if (AGENT_ODDS_WS_PATHS.includes(path as (typeof AGENT_ODDS_WS_PATHS)[number])) {
    if (!server?.upgrade) {
      return new Response('WebSocket upgrade unavailable', { status: 503 });
    }
    const ok = server.upgrade(req, { data: { joinedAt: Date.now(), topic: AGENT_ODDS_WS_TOPIC } });
    if (ok) return undefined as unknown as Response;
    return new Response('WebSocket upgrade failed', { status: 400 });
  }

  // Only claim known agent-odds API prefixes
  const claimed =
    path.startsWith('/api/odds') ||
    path.startsWith('/api/partners/health') ||
    path.startsWith('/api/events') ||
    path.startsWith('/api/edges') ||
    path.startsWith('/api/alerts/') ||
    path.startsWith('/api/bet') ||
    path.startsWith('/api/bets') ||
    path.startsWith('/api/backtest') ||
    path === '/api/upload' ||
    path === '/api/auth/login' ||
    path === '/api/backup' ||
    path === '/api/pool' ||
    path.startsWith('/api/prefetch') ||
    path === '/api/platform' ||
    path.startsWith('/api/agent-odds');
  if (!claimed) return null;

  if (path === '/api/odds/options' || path === '/api/agent-odds/options') {
    const merged = await getMerged();
    return json({
      hosts: catalogHosts(merged),
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
      plane: 'agent-odds',
      via: 'shared-handlers',
    });
  }

  if (path === '/api/odds' || path === '/api/odds/' || path === '/api/agent-odds/odds') {
    const refresh = url.searchParams.get('refresh') === '1';
    const rows = await getCatalog(refresh);
    const { data, total } = filterOdds(rows, url);
    return json({ data, total, generatedAt: new Date().toISOString() });
  }

  if (path === '/api/odds/stats' || path === '/api/agent-odds/stats') {
    const rows = await getCatalog();
    const merged = await getMerged();
    return json(statsFrom(rows, catalogHosts(merged).length));
  }

  if (path === '/api/odds/stream' || path === '/api/agent-odds/stream') {
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
    return json({
      generatedAt: merged.generatedAt,
      lastProbe: merged.health.find(p => p.lastProbe)?.lastProbe ?? null,
      source: merged.source,
      summary,
      health: merged.health,
      liquidity: summary.byLiquidity,
      plane: 'agent-odds',
    });
  }

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
    return json({ data: events, total: events.length, generatedAt: new Date().toISOString() });
  }

  const eventHistoryMatch = path.match(/^\/api\/events\/([^/]+)\/history\/?$/);
  if (eventHistoryMatch) {
    const eventId = tryEventId(decodeURIComponent(eventHistoryMatch[1]!));
    if (!eventId) return json({ ok: false, error: 'invalid event id' }, 400);
    const events = await getEvents();
    const ev = events.find(e => e.id === eventId);
    if (!ev) return json({ ok: false, error: 'event not found' }, 404);
    const market = url.searchParams.get('market') || 'moneyline';
    return json({
      event_id: eventId,
      market,
      data: generateEventHistory(eventId, market, Object.keys(ev.bookmakers)),
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
    return json({
      data: filtered.slice(0, limit),
      total: filtered.length,
      summary: edgesSummary(filtered),
      generatedAt: new Date().toISOString(),
    });
  }

  if (path === '/api/alerts/rules' || path === '/api/alerts/rules/') {
    if (req.method === 'GET') return json({ data: ALERT_RULES, total: ALERT_RULES.length });
    if (req.method === 'POST') {
      try {
        const rawBody: unknown = await req.json();
        if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
          return json({ ok: false, error: 'request body must be an object' }, 400);
        }
        const raw = rawBody as Record<string, unknown>;
        if (!raw.id || !raw.name) return json({ ok: false, error: 'id and name required' }, 400);
        const id = tryRuleId(String(raw.id));
        if (!id) return json({ ok: false, error: 'invalid rule id' }, 400);
        const channels = normalizeSimulatorChannels(raw.channels);
        if (!channels) return json({ ok: false, error: 'invalid alert channels' }, 400);
        const period = normalizeSimulatorPeriod(raw.period);
        if (!period) return json({ ok: false, error: 'invalid alert period' }, 400);
        const pattern = normalizeSimulatorPattern(raw.pattern);
        if (!pattern) return json({ ok: false, error: 'invalid alert pattern' }, 400);

        // Remaining fields retain the legacy simulator request semantics. The
        // closed alert vocabularies above are validated before this projection.
        const body = raw as Partial<AlertRule>;
        const idx = ALERT_RULES.findIndex(r => r.id === id);
        const next: AlertRule = {
          id,
          name: String(raw.name),
          description: body.description,
          active: body.active !== false,
          condition: body.condition || '',
          channels,
          email_recipients: body.email_recipients,
          period,
          pattern,
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
    if (ALERT_RULES.length === before) return json({ ok: false, error: 'rule not found' }, 404);
    return json({ ok: true, deleted: id });
  }

  if (path === '/api/alerts/history' || path === '/api/alerts/history/') {
    return json({ data: ALERT_HISTORY.slice(0, 50), total: ALERT_HISTORY.length });
  }
  if (path === '/api/alerts/performance' || path === '/api/alerts/performance/') {
    return json({ data: rulePerformanceSnapshot(ALERT_RULES) });
  }

  if ((path === '/api/bet' || path === '/api/bet/') && req.method === 'POST') {
    try {
      const body = (await req.json()) as {
        edgeId?: string; // brand-ok — wire JSON before tryEdgeId
        stake?: number;
        bookmaker?: string;
      };
      const edgeIdRaw = body.edgeId?.trim() ?? '';
      const edgeId = tryEdgeId(edgeIdRaw);
      if (!edgeId) return json({ ok: false, error: 'edgeId required or invalid', mock: true }, 400);
      const edges = await getEdges();
      const edge = edges.find(e => e.id === edgeId) || edges.find(e => String(e.id) === edgeIdRaw);
      const result = placeMockBet(edge, {
        edgeId,
        stake: Number(body.stake),
        bookmaker: String(body.bookmaker ?? ''),
      });
      if (result.order) {
        publish({ type: 'bet', at: new Date().toISOString(), order: result.order });
      }
      return json(
        {
          ok: result.ok,
          success: result.order?.success ?? false,
          orderId: result.order?.orderId || null,
          message: result.order?.message || result.error,
          mock: true as const,
          order: result.order,
        },
        result.status
      );
    } catch {
      return json({ ok: false, error: 'invalid json', mock: true }, 400);
    }
  }

  if (path === '/api/bets' || path === '/api/bets/') {
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 50), 1), 200);
    const data = listMockBets(limit);
    return json({ data, total: data.length, mock: true });
  }

  if ((path === '/api/backtest' || path === '/api/backtest/') && req.method === 'POST') {
    try {
      const body = (await req.json()) as {
        ruleId?: string; // brand-ok — wire JSON before tryRuleId
        startDate?: string;
        endDate?: string;
        seed?: number;
      };
      if (!body.ruleId || !body.startDate || !body.endDate) {
        return json({ ok: false, error: 'ruleId, startDate, endDate required' }, 400);
      }
      const ruleId = tryRuleId(String(body.ruleId));
      if (!ruleId) return json({ ok: false, error: 'invalid ruleId', mock: true }, 400);
      const out = runBacktest(ALERT_RULES, {
        ruleId,
        startDate: String(body.startDate),
        endDate: String(body.endDate),
        seed: body.seed,
      });
      if (!out.ok) return json({ ok: false, error: out.error, mock: true }, out.status);
      return json({ ok: true, data: out.result, mock: true });
    } catch {
      return json({ ok: false, error: 'invalid json', mock: true }, 400);
    }
  }

  if (path === '/api/upload' && req.method === 'POST') return handleUpload(req);

  if (path === '/api/auth/login' && req.method === 'POST') {
    try {
      const body = (await req.json()) as { username?: string; password?: string };
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
    poolState.active = 5 + Math.floor(Math.random() * 15);
    poolState.idle = Math.floor(Math.random() * 8);
    return json({ ...poolState });
  }

  if (path === '/api/prefetch' || path.startsWith('/api/prefetch')) {
    const host = url.searchParams.get('host') || 'hardrock.bet';
    const t0 = Bun.nanoseconds();
    try {
      if (typeof Bun.dns?.prefetch === 'function') Bun.dns.prefetch(host);
    } catch {
      /* ignore */
    }
    await Bun.sleep(50 + Math.floor(Math.random() * 120));
    const ms = Math.round((Bun.nanoseconds() - t0) / 1e6);
    poolState.prefetchHits += 1;
    return json({ ok: true, host, ms, prefetchHits: poolState.prefetchHits });
  }

  if (path === '/api/platform' || path === '/api/agent-odds/platform') {
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
      dashboard: 'agent-odds v1.07+serve-public',
      rateCurrent: rateState.rateCurrent,
      rateLimit: rateState.rateLimit,
      lastBackup: rateState.lastBackup,
      lastProbe: merged.health.find(p => p.lastProbe)?.lastProbe ?? null,
      features: [
        'serve-public',
        'edges',
        'events',
        'websocket',
        'mock-bet',
        'backtest',
        'ml-annotate',
        'partner-health',
        'liquidity-filter',
      ],
      mockDisclaimer: 'bet + backtest are local mock only — not production trading',
    });
  }

  return json({ ok: false, error: 'agent-odds route not found', path }, 404);
}

export function agentOddsWebSocketHandlers() {
  return {
    open(ws: { subscribe: (t: string) => void; send: (d: string) => void }) {
      ws.subscribe(AGENT_ODDS_WS_TOPIC);
      ws.send(
        JSON.stringify({
          type: 'system',
          at: new Date().toISOString(),
          message: 'Connected to agent-odds WS · local mock desk',
        })
      );
    },
    message(ws: { send: (d: string) => void }, message: string | Buffer) {
      const text = typeof message === 'string' ? message : new TextDecoder().decode(message);
      if (text === 'ping' || text === '{"type":"ping"}') {
        ws.send(JSON.stringify({ type: 'pong', at: new Date().toISOString() }));
      }
    },
    close(ws: { unsubscribe: (t: string) => void }) {
      try {
        ws.unsubscribe(AGENT_ODDS_WS_TOPIC);
      } catch {
        /* ignore */
      }
    },
  };
}

export function startAgentOddsBroadcast(server: {
  publish: (topic: string, data: string | ArrayBuffer | SharedArrayBuffer) => number;
}): void {
  publishServer = server;
  if (broadcastTimer) return;
  let tick = 0;
  broadcastTimer = setInterval(async () => {
    tick += 1;
    try {
      const edges = await getEdges(tick % 15 === 0);
      const top = edges[0];
      const payload =
        tick % 4 === 0 && ALERT_HISTORY[0]
          ? {
              type: 'alert' as const,
              at: new Date().toISOString(),
              rule_id: ALERT_HISTORY[0].rule_id,
              message: ALERT_HISTORY[0].message,
            }
          : top
            ? {
                type: 'edge' as const,
                at: new Date().toISOString(),
                edge: {
                  id: top.id,
                  type: top.type,
                  edge_percent: top.edge_percent,
                  home: top.home,
                  away: top.away,
                  league: top.league,
                  ml: top.ml,
                },
              }
            : { type: 'tick' as const, at: new Date().toISOString(), n: tick };
      publish(payload);
    } catch {
      /* ignore */
    }
  }, 2000);
}

export function stopAgentOddsBroadcast(): void {
  if (broadcastTimer) {
    clearInterval(broadcastTimer);
    broadcastTimer = null;
  }
  publishServer = null;
}

/** Prefixes claimed by agent-odds for public-read / auth skip (GET-safe plane). */
export const AGENT_ODDS_PUBLIC_READ_PREFIXES = [
  '/api/odds',
  '/api/partners/health',
  '/api/events',
  '/api/edges',
  '/api/alerts/',
  '/api/bets',
  '/api/pool',
  '/api/prefetch',
  '/api/platform',
  '/api/agent-odds',
] as const;
