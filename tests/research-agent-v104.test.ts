import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  addLiquiditySpot,
  getLiquiditySummary,
  listLiquiditySpots,
  resetLiquidityStore,
} from '../lib/research/liquidity-store.ts';
import {
  closeLimitsDb,
  getLimitsHistory,
  getResearchCoverage,
  openLimitsDb,
  recordLimit,
} from '../lib/research/limit-tracker.ts';
import { runResearchCycle } from '../lib/research/agent.ts';
import { fetchHardRockMarkets } from '../lib/research/fetchers/hardrock.ts';
import { fetchFonbetMarkets } from '../lib/research/fetchers/fonbet.ts';
import { startResearchDashboard } from '../lib/operator-research/dashboard.ts';

describe('liquidity-store', () => {
  beforeEach(() => {
    resetLiquidityStore();
  });

  test('aggregates spots by league and market', () => {
    addLiquiditySpot({
      partnerId: 'hard-rock-florida',
      sport: 'basketball',
      league: 'NBA',
      marketType: 'moneyline',
      maxStakeUsd: 500,
      currency: 'USD',
      source: 'manual',
    });
    addLiquiditySpot({
      partnerId: 'fonbet',
      sport: 'basketball',
      league: 'NBA',
      marketType: 'total',
      maxStakeUsd: 250,
      currency: 'USD',
      source: 'research',
    });
    addLiquiditySpot({
      partnerId: 'fonbet',
      sport: 'football',
      league: 'Premier League',
      marketType: 'moneyline',
      maxStakeUsd: 100,
      currency: 'USD',
      source: 'manual',
    });

    const summary = getLiquiditySummary();
    expect(summary.ok).toBe(true);
    expect(summary.spotCount).toBe(3);
    expect(summary.partnerCount).toBe(2);
    expect(summary.totalStakeUsd).toBe(850);
    expect(summary.topLeagues[0]?.league).toBe('NBA');
    expect(summary.topLeagues[0]?.totalStakeUsd).toBe(750);
    expect(listLiquiditySpots(2)).toHaveLength(2);
  });
});

describe('limit-tracker', () => {
  let dbDir: string;
  let dbPath: string;

  beforeEach(() => {
    closeLimitsDb();
    dbDir = mkdtempSync(join(tmpdir(), 'limits-v104-'));
    dbPath = join(dbDir, 'limits.db');
    openLimitsDb(dbPath);
  });

  afterEach(() => {
    closeLimitsDb();
    rmSync(dbDir, { recursive: true, force: true });
  });

  test('records and queries partner limit history + coverage', () => {
    recordLimit(
      {
        partnerId: 'hard-rock-florida',
        marketId: 'hr-1',
        sport: 'basketball',
        league: 'NBA',
        marketType: 'moneyline',
        maxStakeUsd: 500,
        currency: 'USD',
        source: 'research:fixture',
        observedAt: '2026-08-05T12:00:00.000Z',
      },
      dbPath
    );
    recordLimit(
      {
        partnerId: 'hard-rock-florida',
        marketId: 'hr-2',
        sport: 'basketball',
        league: 'NBA',
        marketType: 'total',
        maxStakeUsd: 400,
        currency: 'USD',
        source: 'research:fixture',
        observedAt: '2026-08-05T12:05:00.000Z',
      },
      dbPath
    );
    recordLimit(
      {
        partnerId: 'fonbet',
        marketId: 'fb-1',
        sport: 'tennis',
        league: 'ATP',
        marketType: 'moneyline',
        maxStakeUsd: 750,
        currency: 'USD',
        source: 'research:fixture',
        observedAt: '2026-08-05T12:10:00.000Z',
      },
      dbPath
    );

    const history = getLimitsHistory('hard-rock-florida', { path: dbPath });
    expect(history.length).toBe(2);
    expect(history[0]?.marketId).toBe('hr-2');

    const coverage = getResearchCoverage({ path: dbPath });
    expect(coverage.length).toBeGreaterThanOrEqual(2);
    const nba = coverage.find(
      r => r.partnerId === 'hard-rock-florida' && r.league === 'NBA'
    );
    expect(nba?.marketCount).toBe(2);
  });
});

describe('research agent fixtures', () => {
  let dbDir: string;
  let dbPath: string;

  beforeEach(() => {
    resetLiquidityStore();
    closeLimitsDb();
    dbDir = mkdtempSync(join(tmpdir(), 'agent-v104-'));
    dbPath = join(dbDir, 'limits.db');
    openLimitsDb(dbPath);
  });

  afterEach(() => {
    closeLimitsDb();
    rmSync(dbDir, { recursive: true, force: true });
  });

  test('fetchers return fixture markets without live', async () => {
    const hr = await fetchHardRockMarkets({ live: false });
    const fb = await fetchFonbetMarkets({ live: false });
    expect(hr.ok).toBe(true);
    expect(hr.mode).toBe('fixture');
    expect(hr.markets.length).toBeGreaterThan(0);
    expect(fb.ok).toBe(true);
    expect(fb.markets.length).toBeGreaterThan(0);
  });

  test('runResearchCycle records limits and pushes liquidity', async () => {
    const result = await runResearchCycle({ live: false });
    expect(result.ok).toBe(true);
    expect(result.markets.length).toBeGreaterThan(0);
    expect(result.limitsRecorded).toBe(result.markets.length);
    expect(result.liquidityPushed).toBe(result.markets.length);

    const summary = getLiquiditySummary();
    expect(summary.spotCount).toBeGreaterThan(0);

    const partners = new Set(result.markets.map(m => m.partnerId));
    for (const partnerId of partners) {
      const hist = getLimitsHistory(partnerId, { path: dbPath });
      expect(hist.length).toBeGreaterThan(0);
    }
  });
});

describe('dashboard partner routes smoke', () => {
  test('serves health, liquidity, limits, coverage', async () => {
    resetLiquidityStore();
    const dash = startResearchDashboard({
      port: 0,
      withOdds: false,
      withResearchAgent: false,
    });
    try {
      const base = dash.url.replace(/\/$/, '');

      const health = await fetch(`${base}/api/partners/health`);
      expect(health.ok).toBe(true);
      expect(health.headers.get('x-request-id')).toBeTruthy();
      const healthJson = (await health.json()) as { ok: boolean; health: unknown[] };
      expect(healthJson.ok).toBe(true);
      expect(healthJson.health.length).toBeGreaterThan(0);

      const csrfRes = await fetch(`${base}/api/csrf`);
      expect(csrfRes.ok).toBe(true);
      const csrfToken = csrfRes.headers.get('x-csrf-token') ?? '';
      expect(csrfToken.length).toBeGreaterThan(0);
      const csrfCookie = csrfRes.headers.getSetCookie?.() ?? [];
      const cookieHeader = csrfCookie.map(c => c.split(';')[0]).join('; ');

      const postLiq = await fetch(`${base}/api/partners/liquidity`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': csrfToken,
          ...(cookieHeader ? { cookie: cookieHeader } : {}),
        },
        body: JSON.stringify({
          partnerId: 'hard-rock-florida',
          sport: 'basketball',
          league: 'NBA',
          marketType: 'moneyline',
          maxStakeUsd: 123,
          source: 'manual',
        }),
      });
      expect(postLiq.status).toBe(201);
      const postJson = (await postLiq.json()) as { ok: boolean };
      expect(postJson.ok).toBe(true);

      const getLiq = await fetch(`${base}/api/partners/liquidity`);
      expect(getLiq.ok).toBe(true);
      const liqJson = (await getLiq.json()) as { ok: boolean; spotCount: number };
      expect(liqJson.ok).toBe(true);
      expect(liqJson.spotCount).toBeGreaterThanOrEqual(1);

      const limits = await fetch(
        `${base}/api/research/limits?partnerId=hard-rock-florida`
      );
      expect(limits.ok).toBe(true);
      const limitsJson = (await limits.json()) as { ok: boolean };
      expect(limitsJson.ok).toBe(true);

      const coverage = await fetch(`${base}/api/research/coverage`);
      expect(coverage.ok).toBe(true);
      const covJson = (await coverage.json()) as { ok: boolean; coverage: unknown[] };
      expect(covJson.ok).toBe(true);
      expect(Array.isArray(covJson.coverage)).toBe(true);

      const markets = await fetch(`${base}/api/research/markets`);
      expect(markets.ok).toBe(true);
      const mJson = (await markets.json()) as { ok: boolean; markets: unknown[] };
      expect(mJson.ok).toBe(true);
      expect(Array.isArray(mJson.markets)).toBe(true);

      const html = await fetch(`${base}/`);
      expect(html.ok).toBe(true);
      const page = await html.text();
      expect(page).toMatch(/v1\.0[3-9]/);
      expect(page).toMatch(/Live Odds Intelligence|Bun Agent/i);
      expect(page).toMatch(/partner|liquidity|odds/i);
    } finally {
      dash.stop();
    }
  });
});
