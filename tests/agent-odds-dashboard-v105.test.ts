import { describe, expect, test } from 'bun:test';
import {
  clearAlertRulesCache,
  edgeMatches,
  loadAlertRules,
  reloadAlertRules,
  ruleMatchesPeriod,
} from '../lib/operator-research/matching/alerts.ts';
import { detectSignals } from '../lib/operator-research/matching/signals.ts';
import { startResearchDashboard } from '../lib/operator-research/dashboard.ts';

type TestCsrfSession = {
  cookie: string;
  token: string;
};

async function issueTestCsrf(baseUrl: string): Promise<TestCsrfSession> {
  const response = await fetch(new URL('api/csrf', baseUrl));
  expect(response.status).toBe(200);
  const body = (await response.json()) as { csrfToken?: string };
  const setCookie = response.headers.get('set-cookie');
  const cookie = setCookie?.split(';', 1)[0];
  if (!body.csrfToken || !cookie) {
    throw new Error('CSRF bootstrap did not return a token and session cookie');
  }
  return { cookie, token: body.csrfToken };
}

function csrfHeaders(session: TestCsrfSession, json = false): Record<string, string> {
  return {
    cookie: session.cookie,
    'x-csrf-token': session.token,
    ...(json ? { 'content-type': 'application/json' } : {}),
  };
}

describe('Bun Agent dashboard v1.05', () => {
  test('Pages redirects retired static aliases to their canonical dashboard', async () => {
    const redirects = await Bun.file('public/_redirects').text();
    expect(redirects).toContain(
      '/portal/agent-odds/dashboard.html  /portal/agent-odds/dashboard-v1.05.html  301'
    );
    expect(redirects).toContain(
      '/portal/agent-odds/dashboard-events-v1.05.html  /portal/agent-odds/dashboard-v1.05.html  301'
    );
    expect(redirects).toContain(
      '/portal/agent-odds/dashboard-v1.10.html  /portal/agent-odds/dashboard-v1.11.html  301'
    );
    expect(await Bun.file('public/portal/agent-odds/dashboard.html').exists()).toBe(false);
    expect(await Bun.file('public/portal/agent-odds/dashboard-events-v1.05.html').exists()).toBe(false);
    expect(await Bun.file('public/portal/agent-odds/dashboard-v1.10.html').exists()).toBe(false);
  });

  test('TOML rules expose period, pattern, and edge', async () => {
    clearAlertRulesCache();
    const rules = await loadAlertRules();
    const price = rules.find(r => r.id === 'price-move');
    expect(price?.period).toBe('all');
    expect(price?.pattern).toBe('spike');
    expect(ruleMatchesPeriod(price!, 'prematch')).toBe(true);

    const arb = rules.find(r => r.id === 'arbitrage');
    expect(arb?.period).toBeTruthy();
    if (arb?.edge) {
      expect(edgeMatches(arb, arb.edge.min)).toBe(true);
      expect(edgeMatches(arb, arb.edge.min / 2)).toBe(false);
    }
  });

  test('serves v1.05 events desk with signals + reload', async () => {
    const dash = startResearchDashboard({
      port: 0,
      withOdds: false,
      withResearchAgent: false,
    });
    try {
      const home = await fetch(dash.url);
      expect(home.status).toBe(200);
      const html = await home.text();
      expect(html).toContain('v1.05');
      expect(html).toMatch(/Signals|📡/);
      expect(html).toContain('rulePeriod');
      expect(html).toContain('filterSignalPeriod');
      expect(html).toContain('/api/events');

      for (const path of ['dashboard-v1.05.html']) {
        const stable = await fetch(new URL(path, dash.url));
        expect(stable.status).toBe(200);
        expect(await stable.text()).toContain('v1.05');
      }

      for (const [path, canonical] of [
        ['dashboard.html', '/dashboard-v1.05.html'],
        ['dashboard-events-v1.05.html', '/dashboard-v1.05.html'],
        ['dashboard-v1.10.html', '/dashboard-v1.11.html'],
      ]) {
        const legacy = await fetch(new URL(path, dash.url), { redirect: 'manual' });
        expect(legacy.status).toBe(301);
        expect(new URL(legacy.headers.get('location')!).pathname).toBe(canonical);
      }

      const packages = await fetch(new URL('packages', dash.url));
      expect(packages.status).toBe(200);
      expect(await packages.text()).toContain('v1.11');

      for (const path of ['system', 'dashboard-v1.12.html']) {
        const system = await fetch(new URL(path, dash.url));
        expect(system.status).toBe(200);
        expect(await system.text()).toContain('v1.12');
      }

      const rules = await (await fetch(`${dash.url}api/alerts/rules`)).json();
      expect(rules.rules[0]).toHaveProperty('period');
      expect(rules.rules[0]).toHaveProperty('pattern');

      const csrf = await issueTestCsrf(dash.url);
      const reload = await fetch(`${dash.url}api/alerts/rules/reload`, {
        method: 'POST',
        headers: csrfHeaders(csrf),
      });
      expect(reload.status).toBe(200);
      const reloaded = (await reload.json()) as { ok: boolean; status: string; count: number };
      expect(reloaded.ok).toBe(true);
      expect(reloaded.status).toBe('reloaded');
      expect(reloaded.count).toBeGreaterThan(0);

      const signalsRes = await fetch(`${dash.url}api/signals?period=all`);
      expect(signalsRes.status).toBe(200);
      const signals = (await signalsRes.json()) as { signals: unknown[] };
      expect(Array.isArray(signals.signals)).toBe(true);

      const direct = await detectSignals({ limit: 10 });
      expect(Array.isArray(direct)).toBe(true);

    } finally {
      dash.stop();
      clearAlertRulesCache();
    }
  });

  test('reloadAlertRules re-parses TOML', async () => {
    clearAlertRulesCache();
    const a = await loadAlertRules();
    const b = await reloadAlertRules();
    expect(b.length).toBe(a.length);
    expect(b.map(r => r.id).sort()).toEqual(a.map(r => r.id).sort());
  });

  test('alert rule CRUD persists period/pattern/edge', async () => {
    const dash = startResearchDashboard({
      port: 0,
      withOdds: false,
      withResearchAgent: false,
    });
    const id = `tmp-v105-${Date.now()}`;
    let csrf: TestCsrfSession | null = null;
    try {
      csrf = await issueTestCsrf(dash.url);
      const create = await fetch(`${dash.url}api/alerts/rules`, {
        method: 'POST',
        headers: csrfHeaders(csrf, true),
        body: JSON.stringify({
          id,
          name: 'Temp v1.05 rule',
          condition: 'arb_percent > 9',
          channels: ['ws'],
          active: false,
          period: 'live',
          pattern: 'arbitrage',
          edge: { min: 0.09, max: 0.2 },
        }),
      });
      expect(create.status).toBe(200);
      const created = (await create.json()) as {
        ok: boolean;
        rule: {
          id: string; // brand-ok — decoded HTTP response at the test boundary
          period?: string;
          pattern?: string | null;
          edge?: { min?: number; max?: number } | null;
        };
      };
      expect(created.ok).toBe(true);
      expect(created.rule.id).toBe(id);
      expect(created.rule.period).toBe('live');
      expect(created.rule.pattern).toBe('arbitrage');
      expect(created.rule.edge?.min).toBeCloseTo(0.09, 5);

      clearAlertRulesCache();
      const found = (await loadAlertRules()).find(r => r.id === id);
      expect(found?.period).toBe('live');
      expect(found?.edge?.min).toBeCloseTo(0.09, 5);

      const del = await fetch(`${dash.url}api/alerts/rules/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: csrfHeaders(csrf),
      });
      expect(del.status).toBe(200);
    } finally {
      if (csrf) {
        try {
          await fetch(`${dash.url}api/alerts/rules/${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: csrfHeaders(csrf),
          });
        } catch {
          /* ignore */
        }
      }
      dash.stop();
      clearAlertRulesCache();
    }
  });
});
