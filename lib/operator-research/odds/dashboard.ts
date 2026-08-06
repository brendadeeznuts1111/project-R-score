// @see https://bun.com/docs/runtime/utils#bun-gzipsync — Bun.gzipSync
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/http/websockets — WebSocket pub/sub
// @see https://bun.com/docs/runtime/http/server — Bun.serve
import { inspect } from 'bun';
import { authEnabled, checkApiKey, isPublicPath } from '../auth/api-key.ts';
import {
  ensureAlertsSchema,
  evaluateAlerts,
  listRecentAlerts,
  setAlertSink,
  type AlertEvent,
} from '../matching/alerts.ts';
import { detectCrossBookArbitrage } from '../matching/arbitrage.ts';
import { compareTiers, detectDelays } from '../matching/delay-detector.ts';
import { queryOddsHistorySeries } from '../matching/history-query.ts';
import { detectNotableMovements } from '../matching/line-movement.ts';
import { detectSmartMoney } from '../matching/smart-money.ts';
import { getMarketTypeId } from '../normalization/market-classifier.ts';
import { queryNormalizedOdds } from '../normalization/store.ts';
import { writeAndRespondBunFile } from '../http/bun-file.ts';
import { EXPORTS_DIR, ensureResearchDirs } from '../paths.ts';
import { getPlatformSnapshot } from '../platform.ts';
import { getLastSnapshot, listRecentEdges } from './odds-store.ts';
import { peekSnapshot } from './pattern-detector.ts';
import type { EdgeSignal, MonitorTickResult } from './types.ts';
import { joinPath } from '../../path-bun.ts';

export type OddsDashboardServer = {
  port: number;
  url: string;
  publishTick: (results: MonitorTickResult[]) => void;
  publishPatterns: (host: string, patterns: EdgeSignal[]) => void;
  publishAlert: (alert: AlertEvent) => void;
  stop: () => void;
};

const TOPIC = 'odds-updates';

// eslint-disable-next-line harness/no-unknown-function-param -- HTTP JSON response edge
function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

/**
 * Minimal real-time odds dashboard: HTTP JSON + WebSocket fan-out.
 */
export function startOddsDashboard(
  opts: { port?: number; hostname?: string } = {}
): OddsDashboardServer {
  const port = opts.port ?? 8787;
  const hostname = opts.hostname ?? '127.0.0.1';
  ensureAlertsSchema();

  const server = Bun.serve({
    port,
    hostname,
    async fetch(req, srv) {
      const url = new URL(req.url);

      if (url.pathname === '/ws') {
        const upgraded = srv.upgrade(req, { data: { topic: TOPIC } });
        if (!upgraded) {
          return new Response('WebSocket upgrade failed', { status: 400 });
        }
        return undefined as unknown as Response;
      }

      if (!isPublicPath(url.pathname) && url.pathname.startsWith('/api/')) {
        const auth = checkApiKey(req);
        if (!auth.ok) return json({ error: auth.error }, auth.status);
      }

      if (url.pathname === '/health') {
        return json({ ok: true, bun: Bun.version, auth: authEnabled() });
      }

      if (url.pathname === '/api/platform') {
        return json(await getPlatformSnapshot());
      }

      if (url.pathname === '/api/arbitrage' || url.pathname === '/api/arb') {
        const minEdgePct = Number(url.searchParams.get('minEdgePct') ?? '1.5');
        const eventId = url.searchParams.get('eventId');
        const market = url.searchParams.get('market') ?? undefined;
        const opportunities = detectCrossBookArbitrage({
          minEdgePct,
          market,
          eventId: eventId ? Number(eventId) : undefined,
        });
        return json({ count: opportunities.length, opportunities });
      }

      if (url.pathname === '/api/alerts') {
        if (url.searchParams.get('evaluate') === '1') {
          const emitted = await evaluateAlerts();
          return json({ count: emitted.length, alerts: emitted, evaluated: true });
        }
        const alerts = listRecentAlerts(Number(url.searchParams.get('limit') ?? '50'));
        return json({ count: alerts.length, alerts });
      }

      if (url.pathname === '/api/smart-money') {
        const signals = await detectSmartMoney({
          sinceMs: 1,
          limit: Number(url.searchParams.get('limit') ?? '50'),
        });
        return json({ count: signals.length, signals });
      }

      if (url.pathname === '/api/odds/history') {
        const eventId = Number(url.searchParams.get('eventId'));
        if (!Number.isFinite(eventId) || eventId <= 0) {
          return json({ error: 'Missing or invalid eventId' }, 400);
        }
        const series = queryOddsHistorySeries({
          eventId,
          market: url.searchParams.get('market') ?? 'moneyline',
          selection: url.searchParams.get('selection') ?? undefined,
          bucketMs: url.searchParams.get('bucketMs')
            ? Number(url.searchParams.get('bucketMs'))
            : undefined,
          limit: Number(url.searchParams.get('limit') ?? '500'),
        });
        return json(series);
      }

      if (url.pathname === '/api/export') {
        const format = (url.searchParams.get('format') ?? 'json').toLowerCase();
        const rows = queryNormalizedOdds({
          sport: url.searchParams.get('sport') ?? undefined,
          league: url.searchParams.get('league') ?? undefined,
          market: url.searchParams.get('market') ?? undefined,
          host: url.searchParams.get('host') ?? undefined,
          limit: Number(url.searchParams.get('limit') ?? '500'),
        });
        if (format === 'csv') {
          const header = [
            'host',
            'bookmaker',
            'league',
            'home',
            'away',
            'market',
            'selection',
            'oddsDecimal',
            'oddsAmerican',
            'session',
          ];
          const lines = [
            header.join(','),
            ...rows.map(r =>
              [
                r.host ?? '',
                r.bookmaker ?? '',
                r.league ?? '',
                r.homeTeam ?? '',
                r.awayTeam ?? '',
                r.marketCode ?? '',
                r.selection ?? '',
                r.oddsDecimal ?? '',
                r.oddsAmerican ?? '',
                r.session ?? '',
              ]
                .map(v => `"${String(v).replaceAll('"', '""')}"`)
                .join(',')
            ),
          ];
          const body = lines.join('\n');
          const gzip = url.searchParams.get('gzip') === '1';
          await ensureResearchDirs();
          if (gzip) {
            const gzPath = joinPath(EXPORTS_DIR, `odds-export-${Date.now()}.csv.gz`);
            const compressed = Bun.gzipSync(Buffer.from(body));
            return writeAndRespondBunFile(gzPath, compressed, {
              type: 'application/gzip',
              downloadAs: 'odds.csv.gz',
              cacheControl: 'no-store',
            });
          }
          const csvPath = joinPath(EXPORTS_DIR, `odds-export-${Date.now()}.csv`);
          return writeAndRespondBunFile(csvPath, body, {
            type: 'text/csv;charset=utf-8',
            downloadAs: 'odds.csv',
            cacheControl: 'no-store',
          });
        }
        // JSON export via Bun.write + Bun.file.type
        if (format === 'json' && url.searchParams.get('file') === '1') {
          await ensureResearchDirs();
          const jsonPath = joinPath(EXPORTS_DIR, `odds-export-${Date.now()}.json`);
          return writeAndRespondBunFile(
            jsonPath,
            JSON.stringify({ count: rows.length, rows }, null, 2),
            {
              type: 'application/json;charset=utf-8',
              downloadAs: 'odds.json',
              cacheControl: 'no-store',
            }
          );
        }
        return json({ count: rows.length, rows });
      }

      // Filtered normalized odds (sport/league/market/host/session)
      if (url.pathname === '/api/odds' || url.pathname === '/api/normalized-odds') {
        const rows = queryNormalizedOdds({
          sport: url.searchParams.get('sport') ?? undefined,
          league: url.searchParams.get('league') ?? undefined,
          market: url.searchParams.get('market') ?? undefined,
          host: url.searchParams.get('host') ?? undefined,
          bookmaker: url.searchParams.get('bookmaker') ?? undefined,
          session: (url.searchParams.get('session') as 'pregame' | 'live' | null) ?? undefined,
          limit: Number(url.searchParams.get('limit') ?? '50'),
        });
        return json({ count: rows.length, rows });
      }

      if (url.pathname === '/api/delays') {
        const eventId = Number(url.searchParams.get('eventId'));
        const market =
          url.searchParams.get('marketType') ?? url.searchParams.get('market') ?? 'moneyline';
        const selection = url.searchParams.get('selection') ?? undefined;
        if (!Number.isFinite(eventId) || eventId <= 0) {
          return json({ error: 'Missing or invalid eventId' }, 400);
        }
        const marketTypeId = getMarketTypeId(market);
        if (marketTypeId == null) {
          return json({ error: `Unknown marketType: ${market}` }, 400);
        }
        const delays = detectDelays(eventId, marketTypeId, { selection });
        return json({ eventId, market, selection: selection ?? null, delays });
      }

      if (url.pathname === '/api/movements') {
        const minAbsPct = Number(url.searchParams.get('minPct') ?? '2');
        const sinceMin = Number(url.searchParams.get('sinceMin') ?? '5256000');
        const movements = detectNotableMovements({
          minAbsPct,
          sinceMs: Date.now() - sinceMin * 60 * 1000,
          limit: Number(url.searchParams.get('limit') ?? '50'),
        });
        return json({ count: movements.length, movements });
      }

      if (url.pathname === '/api/tiers') {
        const eventId = Number(url.searchParams.get('eventId'));
        const market =
          url.searchParams.get('marketType') ?? url.searchParams.get('market') ?? 'moneyline';
        const selection = url.searchParams.get('selection') ?? undefined;
        if (!Number.isFinite(eventId) || eventId <= 0) {
          return json({ error: 'Missing or invalid eventId' }, 400);
        }
        const marketTypeId = getMarketTypeId(market);
        if (marketTypeId == null) {
          return json({ error: `Unknown marketType: ${market}` }, 400);
        }
        const tiers = compareTiers(eventId, marketTypeId, { selection });
        return json({ eventId, market, selection: selection ?? null, tiers });
      }

      if (url.pathname.startsWith('/api/odds/')) {
        const host = decodeURIComponent(url.pathname.slice('/api/odds/'.length));
        if (!host || host === 'history') return new Response('host required', { status: 400 });
        const promise = Promise.resolve(getLastSnapshot(host));
        const peeked = peekSnapshot(promise);
        if (peeked && typeof (peeked as Promise<unknown>).then === 'function') {
          return (peeked as Promise<unknown>).then(s =>
            s
              ? Response.json(s)
              : new Response(JSON.stringify({ error: 'no snapshot' }), {
                  status: 404,
                  headers: { 'content-type': 'application/json' },
                })
          );
        }
        return peeked
          ? Response.json(peeked)
          : new Response(JSON.stringify({ error: 'no snapshot' }), {
              status: 404,
              headers: { 'content-type': 'application/json' },
            });
      }

      if (url.pathname === '/api/edges') {
        const host = url.searchParams.get('host');
        const limit = Number(url.searchParams.get('limit') ?? '20');
        return Response.json(listRecentEdges(host, limit));
      }

      if (url.pathname === '/' || url.pathname === '/index.html') {
        return new Response(DASHBOARD_HTML, {
          headers: { 'content-type': 'text/html; charset=utf-8' },
        });
      }

      return new Response('not found', { status: 404 });
    },
    websocket: {
      open(ws) {
        ws.subscribe(TOPIC);
        ws.send(JSON.stringify({ type: 'hello', bun: Bun.version }));
      },
      message(ws, message) {
        if (String(message) === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', t: Date.now() }));
        }
      },
      close(ws) {
        ws.unsubscribe(TOPIC);
      },
    },
  });

  const publishAlert = (alert: AlertEvent) => {
    server.publish(
      TOPIC,
      JSON.stringify({
        type: 'alert',
        alert,
        at: Date.now(),
      })
    );
  };
  setAlertSink(publishAlert);

  return {
    port: server.port,
    url: `http://${hostname}:${server.port}/`,
    publishTick(results) {
      server.publish(
        TOPIC,
        JSON.stringify({
          type: 'tick',
          at: Date.now(),
          results: results.map(r => ({
            host: String(r.host),
            ok: r.ok,
            identical: r.identical,
            patterns: r.patterns.length,
            error: r.error,
            elapsedMs: r.elapsedMs,
          })),
        })
      );
    },
    publishPatterns(host, patterns) {
      server.publish(
        TOPIC,
        JSON.stringify({
          type: 'patterns',
          host,
          patterns,
          inspect: inspect(patterns, { depth: 3, colors: false }),
        })
      );
    },
    publishAlert,
    stop() {
      setAlertSink(null);
      server.stop(true);
    },
  };
}

const DASHBOARD_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Odds monitor</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <style>
    :root { --bg:#0b0f14; --panel:#161b22; --border:#30363d; --text:#e6edf3; --muted:#8b949e; --ok:#3fb950; --bad:#f85149; --warn:#d29922; --accent:#58a6ff; }
    * { box-sizing: border-box; }
    body { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background: var(--bg); color: var(--text); margin: 0; padding: 1.25rem; }
    h1 { font-size: 1.05rem; margin: 0 0 1rem; }
    h2 { font-size: 0.85rem; margin: 0 0 0.6rem; color: var(--muted); font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; }
    .meta { color: var(--muted); } .ok { color: var(--ok); } .bad { color: var(--bad); } .warn { color: var(--warn); }
    .grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 1rem; }
    @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
    .card { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 0.9rem; min-height: 120px; }
    .row { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1rem; align-items: end; }
    label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 11px; color: var(--muted); }
    input, select, button { background: #0d1117; color: var(--text); border: 1px solid var(--border); border-radius: 6px; padding: 0.4rem 0.55rem; font: inherit; font-size: 12px; }
    button { cursor: pointer; background: #21262d; }
    button:hover { border-color: var(--accent); }
    #log { white-space: pre-wrap; font-size: 11px; line-height: 1.4; max-height: 180px; overflow: auto; }
    .item { border-left: 3px solid var(--accent); padding: 0.45rem 0.6rem; margin: 0.35rem 0; background: #0d1117; border-radius: 0 6px 6px 0; font-size: 12px; }
    .item.critical { border-left-color: var(--bad); }
    .item.warn { border-left-color: var(--warn); }
    .stat { font-size: 12px; padding: 0.35rem 0.55rem; background: #0d1117; border: 1px solid var(--border); border-radius: 6px; }
    canvas { max-height: 220px; width: 100% !important; }
    a { color: var(--accent); }
  </style>
</head>
<body>
  <h1>Live odds monitor <span class="meta" id="status">connecting…</span>
    <span class="stat" id="statArb">arb 0</span>
    <span class="stat" id="statAlert">alerts 0</span>
  </h1>
  <div class="row">
    <label>eventId <input id="eventId" type="number" placeholder="1" style="width:6rem" /></label>
    <label>market
      <select id="market"><option>moneyline</option><option>spread</option><option>total</option></select>
    </label>
    <label>selection <input id="selection" placeholder="optional" style="width:7rem" /></label>
    <button id="refresh">Refresh APIs</button>
    <button id="evalAlerts">Evaluate alerts</button>
    <a href="/api/export?format=csv" download>Export CSV</a>
  </div>
  <div class="grid">
    <div class="card">
      <h2>Arbitrage</h2>
      <div id="arbs"><div class="meta">Loading…</div></div>
    </div>
    <div class="card">
      <h2>Alert feed</h2>
      <div id="alerts"><div class="meta">Loading…</div></div>
    </div>
    <div class="card" style="grid-column: 1 / -1;">
      <h2>Line history</h2>
      <canvas id="chart" height="120"></canvas>
    </div>
    <div class="card" style="grid-column: 1 / -1;">
      <h2>WebSocket log</h2>
      <div id="log"></div>
    </div>
  </div>
  <script>
    const log = document.getElementById('log');
    const status = document.getElementById('status');
    const arbsEl = document.getElementById('arbs');
    const alertsEl = document.getElementById('alerts');
    let chart;
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(proto + '://' + location.host + '/ws');
    ws.onopen = () => { status.textContent = 'live'; status.className = 'ok'; };
    ws.onclose = () => { status.textContent = 'closed'; status.className = 'bad'; };
    ws.onmessage = (ev) => {
      const line = document.createElement('div');
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'alert') {
          prependAlert(msg.alert);
          document.getElementById('statAlert').textContent = 'alerts +1';
        }
        line.textContent = new Date().toISOString() + ' ' + JSON.stringify(msg);
      } catch {
        line.textContent = String(ev.data);
      }
      log.prepend(line);
    };

    function prependAlert(a) {
      if (!a) return;
      const div = document.createElement('div');
      div.className = 'item ' + (a.severity === 'critical' ? 'critical' : a.severity === 'warn' ? 'warn' : '');
      div.innerHTML = '<strong>' + escapeHtml(a.title) + '</strong><div class="meta">' + escapeHtml(a.details) + '</div>';
      alertsEl.prepend(div);
    }

    function escapeHtml(s) {
      return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }

    async function loadArbs() {
      const res = await fetch('/api/arbitrage?minEdgePct=1.5');
      const data = await res.json();
      document.getElementById('statArb').textContent = 'arb ' + (data.count || 0);
      if (!data.opportunities?.length) {
        arbsEl.innerHTML = '<div class="meta">No arbitrage detected.</div>';
        return;
      }
      arbsEl.innerHTML = data.opportunities.map(a => {
        const legs = (a.legs || []).map(l => l.selection + '@' + l.bookmaker + ' ' + Number(l.oddsDecimal).toFixed(3)).join(' · ');
        return '<div class="item"><strong>' + a.edgePct.toFixed(2) + '% · ' + escapeHtml((a.homeTeam||'?') + ' vs ' + (a.awayTeam||'?')) +
          '</strong><div class="meta">' + escapeHtml(legs) + ' · invSum=' + a.invSum.toFixed(4) +
          ' · <a href="#" data-eid="' + a.eventId + '">chart</a></div></div>';
      }).join('');
      arbsEl.querySelectorAll('[data-eid]').forEach(el => {
        el.addEventListener('click', (e) => {
          e.preventDefault();
          document.getElementById('eventId').value = el.getAttribute('data-eid');
          loadHistory();
        });
      });
      if (!document.getElementById('eventId').value && data.opportunities[0]) {
        document.getElementById('eventId').value = data.opportunities[0].eventId;
      }
    }

    async function loadAlerts() {
      const res = await fetch('/api/alerts?limit=30');
      const data = await res.json();
      document.getElementById('statAlert').textContent = 'alerts ' + (data.count || 0);
      if (!data.alerts?.length) {
        alertsEl.innerHTML = '<div class="meta">No alerts yet. Click Evaluate alerts.</div>';
        return;
      }
      alertsEl.innerHTML = '';
      data.alerts.forEach(prependAlert);
    }

    async function loadHistory() {
      const eventId = document.getElementById('eventId').value;
      if (!eventId) return;
      const market = document.getElementById('market').value;
      const selection = document.getElementById('selection').value;
      const qs = new URLSearchParams({ eventId, market, bucketMs: '60000' });
      if (selection) qs.set('selection', selection);
      const res = await fetch('/api/odds/history?' + qs);
      const data = await res.json();
      const byBook = {};
      for (const p of data.points || []) {
        const key = p.bookmaker + ' · ' + p.selection;
        (byBook[key] = byBook[key] || []).push({ x: p.timestamp, y: p.oddsDecimal });
      }
      const colors = ['#58a6ff','#3fb950','#d29922','#f85149','#a371f7','#79c0ff'];
      const datasets = Object.entries(byBook).map(([label, pts], i) => ({
        label, data: pts, borderColor: colors[i % colors.length], tension: 0.2, pointRadius: 2, borderWidth: 2
      }));
      if (chart) chart.destroy();
      chart = new Chart(document.getElementById('chart'), {
        type: 'line',
        data: { datasets },
        options: {
          parsing: false,
          scales: {
            x: { type: 'linear', ticks: { color: '#8b949e', callback: v => new Date(v).toLocaleTimeString() }, grid: { color: '#21262d' } },
            y: { ticks: { color: '#8b949e' }, grid: { color: '#21262d' } }
          },
          plugins: { legend: { labels: { color: '#e6edf3', boxWidth: 12, font: { size: 10 } } } }
        }
      });
    }

    document.getElementById('refresh').onclick = () => { loadArbs(); loadAlerts(); loadHistory(); };
    document.getElementById('evalAlerts').onclick = async () => {
      await fetch('/api/alerts?evaluate=1');
      loadAlerts();
      loadArbs();
    };
    loadArbs().then(loadHistory);
    loadAlerts();
  </script>
</body>
</html>
`;
