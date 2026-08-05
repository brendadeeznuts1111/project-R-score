#!/usr/bin/env bun
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
 *   POST /api/upload · /api/auth/login · /api/backup
 *   GET  /api/pool · /api/prefetch · /api/platform
 */
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const DASH_DIR = join(ROOT, 'public/portal/agent-odds');
const PORT = Number(process.env.PORT || process.env.AGENT_ODDS_PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';

const HOSTS = [
  'hardrock.bet',
  'bet365.com',
  'stake.com',
  'cloudbet.com',
  'fonbet.com',
  'tipsport.cz',
  'synottip.cz',
  'draftkings.com',
  'fanduel.com',
  'betmgm.com',
  'caesars.com',
  'betrivers.com',
  'pointsbet.com',
  'bovada.lv',
  'betway.com',
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

const MARKETS = [
  'moneyline',
  'spread',
  'total',
  'team_total',
  'over_under',
] as const;

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
};

const poolState = {
  active: 8,
  idle: 4,
  streams: 12,
  prefetchHits: 0,
  http2: true,
};

/** Demo-only credentials for local mock agent (not production). */
const DEMO_USER = process.env.AGENT_DEMO_USER || 'analyst';
const DEMO_PASS = process.env.AGENT_DEMO_PASS || 'password123';

const rateState = {
  rateCurrent: 12,
  rateLimit: 100,
  lastBackup: null as string | null,
};

function pick<T extends readonly string[]>(arr: T): T[number] {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function generateOdds(count: number): OddsRow[] {
  const out: OddsRow[] = [];
  for (let i = 0; i < count; i++) {
    const price = (1 + Math.random() * 3).toFixed(2);
    out.push({
      host: pick(HOSTS),
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

let CATALOG: OddsRow[] = generateOdds(120);

function filterOdds(url: URL): { data: OddsRow[]; total: number } {
  if (url.searchParams.get('refresh') === '1') {
    CATALOG = generateOdds(120);
  }
  let rows = CATALOG;
  const host = url.searchParams.get('host');
  const sport = url.searchParams.get('sport');
  const league = url.searchParams.get('league');
  const marketType = url.searchParams.get('market_type');
  const session = url.searchParams.get('session');
  if (host) rows = rows.filter(r => r.host === host);
  if (sport) rows = rows.filter(r => r.sport === sport);
  if (league) rows = rows.filter(r => r.league === league);
  if (marketType) rows = rows.filter(r => r.market_type === marketType);
  if (session) rows = rows.filter(r => r.session === session);
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 100), 1), 500);
  return { data: rows.slice(0, limit), total: rows.length };
}

function statsFrom(rows: OddsRow[]) {
  const bySport: Record<string, number> = {};
  let markets = 0;
  for (const r of rows) {
    bySport[r.sport] = (bySport[r.sport] || 0) + 1;
    markets += r.marketData.selections.length;
  }
  return {
    bySport,
    totalRows: rows.length,
    totalMarkets: markets,
    hosts: HOSTS.length,
  };
}

function json(data: unknown, status = 200): Response {
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

function oddsStreamResponse(): Response {
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
          host: pick(HOSTS),
          sport: pick(SPORTS),
          market: pick(MARKETS),
          price,
          session: pick(SESSIONS),
          at: new Date().toISOString(),
        };
        controller.enqueue(
          enc.encode(`id: ${id}\ndata: ${JSON.stringify(payload)}\n\n`),
        );
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
      return json({
        hosts: [...HOSTS],
        sports: [...SPORTS],
        leagues: [...LEAGUES],
        marketTypes: [...MARKETS],
        sessions: [...SESSIONS],
      });
    }

    if (path === '/api/odds' || path === '/api/odds/') {
      const { data, total } = filterOdds(url);
      return json({ data, total, generatedAt: new Date().toISOString() });
    }

    if (path === '/api/odds/stats') {
      return json(statsFrom(CATALOG));
    }

    if (path === '/api/odds/stream') {
      return oddsStreamResponse();
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
        rateState.rateLimit,
      );
      return json({
        bun: Bun.version,
        auth: 'mock',
        webview: typeof (Bun as { WebView?: unknown }).WebView !== 'undefined',
        image: typeof (Bun as { Image?: unknown }).Image !== 'undefined',
        cron: true,
        operators: HOSTS.length,
        dashboard: 'agent-odds v1.03',
        rateCurrent: rateState.rateCurrent,
        rateLimit: rateState.rateLimit,
        lastBackup: rateState.lastBackup,
        features: [
          'sse',
          'formdata',
          'pool',
          'prefetch',
          'auth',
          'backup',
          'arb-ui',
          'charts',
        ],
      });
    }

    // Static: default to v1.03
    let filePath = path === '/' || path === '' ? '/dashboard-v1.03.html' : path;
    if (filePath === '/index.html') filePath = '/dashboard-v1.03.html';
    if (filePath === '/dashboard.html') {
      const v1 = join(DASH_DIR, 'dashboard.html');
      if (!(await Bun.file(v1).exists())) {
        filePath = '/dashboard-v1.03.html';
      }
    }
    const safe = filePath.replace(/\.\./g, '').replace(/^\/+/, '');
    const abs = join(DASH_DIR, safe || 'dashboard-v1.03.html');
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
  `agent-odds dashboard v1.03 → http://${server.hostname}:${server.port}/  (arb · alerts · charts · auth mock)`,
);
