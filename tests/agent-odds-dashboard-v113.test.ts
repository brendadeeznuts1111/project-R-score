import { describe, expect, test } from 'bun:test';
import { startResearchDashboard } from '../lib/operator-research/dashboard.ts';

function compileInlineScripts(html: string): void {
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .map(match => match[1]?.trim())
    .filter((script): script is string => Boolean(script));

  expect(scripts.length).toBeGreaterThan(0);
  for (const script of scripts) {
    expect(() => new Function(script)).not.toThrow();
  }
}

describe('Bun Agent dashboard v1.13 preview', () => {
  test('serves the preview without replacing the v1.05 default', async () => {
    const dash = startResearchDashboard({
      port: 0,
      withOdds: false,
      withResearchAgent: false,
    });

    try {
      const home = await fetch(dash.url);
      expect(home.status).toBe(200);
      expect(await home.text()).toContain('v1.05');

      for (const path of ['v1.13', 'v1.13.html', 'dashboard-v1.13.html']) {
        const response = await fetch(new URL(path, dash.url));
        expect(response.status).toBe(200);
        const html = await response.text();
        expect(html).toContain('Operator Desk v1.13');
        expect(html).toContain('role="tablist"');
        expect(html).toContain('aria-selected="true"');
        expect(html).toContain('filterSignalPeriod');
        expect(html).toContain('signalKpiAvgArb');
        expect(html).toContain('healthLiquidityMix');
        expect(html).toContain('healthLimitMedian');
        expect(html).toContain('tab-button-live');
        expect(html).toContain('tab-button-backtest');
        expect(html).toContain('EventSource');
        expect(html).toContain('/api/csrf');
        expect(html).toContain('rel="canonical" href="https://score.factory-wager.com/v1.13"');
        expect(html).toContain('apiAvailabilityNotice');
        expect(html).toContain('PAGES_API_ROUTE_NOT_FOUND');
        expect(html).toContain('Live odds API is not deployed on this Pages preview');
        compileInlineScripts(html);
      }
    } finally {
      dash.stop();
    }
  });

  test('only advertises contracts mounted by the main dashboard server', async () => {
    const html = await Bun.file(
      new URL('../public/portal/agent-odds/dashboard-v1.13.html', import.meta.url),
    ).text();

    expect(html).toContain('/api/events');
    expect(html).toContain('/api/signals');
    expect(html).toContain('/api/alerts');
    expect(html).toContain('/api/partners/health');
    expect(html).not.toContain('/api/edges');
    expect(html).not.toContain('/api/partners/liquidity');
    expect(html).toContain('/api/stream/odds');
    expect(html).toContain('/api/backtest/upload');
    expect(html).not.toContain('/api/bet');
    expect(html).not.toContain('new WebSocket');
  });
});
