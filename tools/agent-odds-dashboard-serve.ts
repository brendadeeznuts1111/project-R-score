#!/usr/bin/env bun
// @see https://bun.com/docs/api/http — Bun.serve
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
/**
 * Serve Bun Agent Live Odds Intelligence dashboard (v1.01) + mock odds APIs.
 *
 *   bun run agent:odds-dashboard
 *   open http://127.0.0.1:3000/
 *
 * Static: public/portal/agent-odds/dashboard.html
 * APIs:   GET /api/odds/options · /api/odds · /api/odds/stats · /api/platform
 *
 * When real operator-research HTTP lands, replace mock handlers — keep paths.
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

/** In-memory catalog (stable within process; regenerate via ?refresh=1). */
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

    if (path === '/api/platform') {
      return json({
        bun: Bun.version,
        auth: 'mock',
        webview: typeof (Bun as { WebView?: unknown }).WebView !== 'undefined',
        image: typeof (Bun as { Image?: unknown }).Image !== 'undefined',
        cron: true,
        operators: HOSTS.length,
        dashboard: 'agent-odds v1.01',
      });
    }

    // Static dashboard
    let filePath = path === '/' || path === '' ? '/dashboard.html' : path;
    if (filePath === '/index.html') filePath = '/dashboard.html';
    // only serve under agent-odds dir (no path escape)
    const safe = filePath.replace(/\.\./g, '').replace(/^\/+/, '');
    const abs = join(DASH_DIR, safe || 'dashboard.html');
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
  `agent-odds dashboard → http://${server.hostname}:${server.port}/  (dashboard.html + mock /api/odds/*)`,
);
