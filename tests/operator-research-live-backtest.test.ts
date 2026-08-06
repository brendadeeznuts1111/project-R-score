import { describe, expect, test } from 'bun:test';
import { analyzeBacktestCsv, parseCsv } from '../lib/operator-research/backtest-upload.ts';
import { startResearchDashboard } from '../lib/operator-research/dashboard.ts';
import type { OddsQueryRow } from '../lib/operator-research/normalization/store.ts';
import { oddsStreamResponse } from '../lib/operator-research/signals-sse.ts';
import { parseRuleId, type RuleId } from '../lib/types/branded.ts';

const CSV = `timestamp,rule_id,edge_pct,outcome,odds_decimal,stake
2026-08-02T12:00:00.000Z,arbitrage,2.500,loss,2.00,100.00
2026-08-01T12:00:00.000Z,arbitrage,3.000,win,2.10,100.00
2026-08-03T12:00:00.000Z,arbitrage,1.000,push,1.90,50.00`;

type TestCsrf = { cookie: string; token: string };

async function issueCsrf(baseUrl: string): Promise<TestCsrf> {
  const response = await fetch(new URL('api/csrf', baseUrl));
  const body = (await response.json()) as { csrfToken?: string };
  const cookie = response.headers.get('set-cookie')?.split(';', 1)[0];
  if (!body.csrfToken || !cookie) throw new Error('missing test CSRF session');
  return { cookie, token: body.csrfToken };
}

function oddsRow(id: number): OddsQueryRow {
  return {
    id,
    eventId: 42,
    selection: 'Home',
    oddsDecimal: 2.1,
    oddsAmerican: 110,
    oddsHandicap: null,
    timestamp: 1_775_000_000_000 + id,
    session: 'pregame',
    marketCode: 'moneyline',
    bookmaker: 'Fixture Book',
    host: 'fixture.example',
    homeTeam: 'Home',
    awayTeam: 'Away',
    league: 'Test League',
    sport: 'Test Sport',
    source: 'fixture',
  };
}

describe('odds SSE contract', () => {
  test('emits retry, connected metadata, an ascending snapshot, and replay cursor', async () => {
    const abort = new AbortController();
    const response = oddsStreamResponse(new Request('http://localhost/api/stream/odds', { signal: abort.signal }), {
      requestId: 'request-test', // brand-ok — opaque request correlation id
      cursor: 0,
      limit: 2,
      pollMs: 10,
      source: {
        latest: () => [oddsRow(1), oddsRow(2)],
        after: () => [],
      },
    });
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    expect(response.headers.get('x-request-id')).toBe('request-test');
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let body = '';
    for (let attempt = 0; attempt < 3 && !body.includes('event: snapshot'); attempt += 1) {
      body += decoder.decode((await reader.read()).value);
    }
    abort.abort();
    reader.releaseLock();
    expect(body).toContain('retry: 3000');
    expect(body).toContain('event: connected');
    expect(body).toContain('event: snapshot');
    expect(body).toContain('id: 2');
    expect(body).toContain('"source":"fixture"');
  });

  test('uses the supplied cursor and reports storage failure without details', async () => {
    const response = oddsStreamResponse(new Request('http://localhost/api/stream/odds'), {
      requestId: 'request-replay', // brand-ok — opaque request correlation id
      cursor: 2,
      limit: 2,
      pollMs: 10,
      source: {
        latest: () => {
          throw new Error('latest must not run during replay');
        },
        after: () => {
          throw new Error('/secret/db.sqlite SQL exploded');
        },
      },
    });
    const body = await response.text();
    expect(body).toContain('event: stream_error');
    expect(body).toContain('ODDS_QUERY_FAILED');
    expect(body).not.toContain('/secret/db.sqlite');
  });
});

describe('settled-outcome CSV analysis', () => {
  test('parses RFC-style quotes and returns deterministic fixed-point metrics', () => {
    expect(parseCsv('a,b\r\n"x","y"\r\n')).toEqual({ ok: true, rows: [['a', 'b'], ['x', 'y']] });
    const analysis = analyzeBacktestCsv(CSV, {
      ruleId: parseRuleId('arbitrage'),
      ruleName: 'Arbitrage',
    });
    expect(analysis.ok).toBe(true);
    if (!analysis.ok) return;
    expect(analysis.result).toMatchObject({
      mock: false,
      analysisType: 'settled-outcomes',
      acceptedRows: 3,
      rejectedRows: 0,
      wins: 1,
      losses: 1,
      pushes: 1,
      totalStake: 250,
      totalProfit: 10,
      roiPct: 4,
      avgEdgePct: 2.17,
      maxDrawdown: 100,
      stakeMode: 'actual',
    });
    expect(analysis.result.dailyReturns).toEqual([110, -100, 0]);
    expect(analysis.result.inputSha256).toHaveLength(64);
  });

  test('rejects a CSV with no rows for the selected rule', () => {
    const analysis = analyzeBacktestCsv(CSV.replaceAll('arbitrage', 'price-move'), {
      ruleId: parseRuleId('arbitrage'),
      ruleName: 'Arbitrage',
    });
    expect(analysis).toMatchObject({ ok: false, status: 422 });
  });
});

describe('live and backtest HTTP routes', () => {
  test('enforces stream method and query validation', async () => {
    const dashboard = startResearchDashboard({ port: 0, withOdds: false, withResearchAgent: false });
    try {
      const invalid = await fetch(new URL('api/stream/odds?cursor=nope', dashboard.url));
      expect(invalid.status).toBe(400);
      expect(invalid.headers.get('x-request-id')).toBeTruthy();
      const wrongMethod = await fetch(new URL('api/stream/odds', dashboard.url), { method: 'POST' });
      expect(wrongMethod.status).toBe(405);
      expect(wrongMethod.headers.get('allow')).toBe('GET');
      const badPeriod = await fetch(new URL('api/signals?period=unknown', dashboard.url));
      expect(badPeriod.status).toBe(400);
    } finally {
      dashboard.stop();
    }
  });

  test('requires CSRF and analyzes one multipart CSV against an existing rule', async () => {
    const dashboard = startResearchDashboard({ port: 0, withOdds: false, withResearchAgent: false });
    try {
      const blockedForm = new FormData();
      blockedForm.set('ruleId', 'arbitrage');
      blockedForm.set('file', new File([CSV], 'history.csv', { type: 'text/csv' }));
      const blocked = await fetch(new URL('api/backtest/upload', dashboard.url), {
        method: 'POST',
        body: blockedForm,
      });
      expect(blocked.status).toBe(403);

      const csrf = await issueCsrf(dashboard.url);
      const form = new FormData();
      form.set('ruleId', 'arbitrage');
      form.set('file', new File([CSV], 'history.csv', { type: 'text/csv' }));
      const response = await fetch(new URL('api/backtest/upload', dashboard.url), {
        method: 'POST',
        headers: { cookie: csrf.cookie, 'x-csrf-token': csrf.token },
        body: form,
      });
      expect(response.status).toBe(200);
      expect(response.headers.get('x-request-id')).toBeTruthy();
      const body = (await response.json()) as {
        ok: boolean;
        data: { mock: boolean; ruleId: RuleId; totalProfit: number };
      };
      expect(body).toMatchObject({
        ok: true,
        data: { mock: false, ruleId: 'arbitrage', totalProfit: 10 },
      });
    } finally {
      dashboard.stop();
    }
  });
});
