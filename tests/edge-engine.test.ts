import { describe, expect, test } from 'bun:test';
import {
  attachMlPredictions,
  detectEdges,
  expectedValuePct,
  filterEdges,
  generateEvents,
  impliedProb,
  kellyFraction,
  latencyAdjustedConfidence,
  partnerEligibleForEdge,
  twoWayArbProfit,
  type AgentEvent,
  type EdgeOpportunity,
} from '../lib/operator-research/edge-engine.ts';
import type { MergedPartnerHealth } from '../lib/bookmakers/merged-registry.ts';
import { asEventId, asSportsbookId } from '../lib/types/branded.ts';

describe('edge math', () => {
  test('impliedProb and twoWayArbProfit', () => {
    expect(impliedProb(2)).toBeCloseTo(0.5, 5);
    // classic arb: 2.10 / 2.10
    expect(twoWayArbProfit(2.1, 2.1)).toBeGreaterThan(0);
    expect(twoWayArbProfit(3, 3)).toBeCloseTo(0.5, 5);
    expect(twoWayArbProfit(1.9, 1.9)).toBe(0);
  });

  test('EV and Kelly', () => {
    // fair coin at 2.2 → +10% EV
    expect(expectedValuePct(0.5, 2.2)).toBeCloseTo(10, 5);
    const k = kellyFraction(0.55, 2.0);
    expect(k).toBeGreaterThan(0);
    expect(k).toBeLessThanOrEqual(0.25);
  });

  test('latency reduces confidence', () => {
    const base = 0.9;
    expect(latencyAdjustedConfidence(base, 100)).toBeCloseTo(0.9, 2);
    expect(latencyAdjustedConfidence(base, 800)).toBeLessThan(
      latencyAdjustedConfidence(base, 100),
    );
  });
});

describe('detectEdges', () => {
  test('finds arbitrage when books disagree enough', () => {
    const ev: AgentEvent = {
      id: asEventId('1'),
      sport: 'basketball',
      league: 'NBA',
      home_team: 'A',
      away_team: 'B',
      start_time: Date.now(),
      status: 'live',
      geo: 'US',
      state: 'NV',
      markets: {
        moneyline: { home: '2.10', away: '2.10' },
        spread: { home: '-1.5', away: '1.5' },
        total: { over: '1.90', under: '1.90' },
      },
      bookmakers: {
        soft: {
          odds: { moneyline: { home: '2.20', away: '1.70' } },
          latency: 80,
          liquidityTier: 'medium',
          partnerStatus: 'active',
          bookmakerId: asSportsbookId('soft'),
        },
        sharp: {
          odds: { moneyline: { home: '1.70', away: '2.20' } },
          latency: 60,
          liquidityTier: 'high',
          partnerStatus: 'active',
          bookmakerId: asSportsbookId('sharp'),
        },
      },
      limits: { min: 10, max: 500 },
    };
    const edges = detectEdges([ev], { minEdgePct: 0.1 });
    const arb = edges.find(e => e.type === 'arbitrage');
    expect(arb).toBeDefined();
    expect(arb!.edge_percent).toBeGreaterThan(0);
    expect(arb!.bookmakers).toHaveLength(2);
    expect(arb!.ml?.model).toBe('SharpProxy');
    expect(arb!.ml?.predicted_prob).toBeGreaterThan(0);
  });

  test('attachMlPredictions fills model fields', () => {
    const bare = {
      id: 'x-steam',
      type: 'steam',
      edge_percent: 8,
      expected_value: 2.8,
      confidence: 0.7,
      kelly_fraction: 0.04,
      odds: { book1: '2.0', book2: '2.2' },
    } as unknown as EdgeOpportunity;
    const [out] = attachMlPredictions([bare]);
    expect(out?.ml?.model).toBe('LSTM');
    expect(out?.ml?.confidence).toBeGreaterThan(0);
  });

  test('does not publish edges from deferred partner quotes', () => {
    const ev: AgentEvent = {
      id: asEventId('deferred-event'),
      sport: 'basketball',
      league: 'NBA',
      home_team: 'A',
      away_team: 'B',
      start_time: Date.now(),
      status: 'live',
      geo: 'US',
      state: 'NV',
      markets: {
        moneyline: { home: '3.00', away: '3.00' },
        spread: { home: '-1.5', away: '1.5' },
        total: { over: '1.90', under: '1.90' },
      },
      bookmakers: {
        active: {
          odds: { moneyline: { home: '3.00', away: '1.50' } },
          latency: 50,
          liquidityTier: 'high',
          partnerStatus: 'active',
          bookmakerId: asSportsbookId('active'),
        },
        deferred: {
          odds: { moneyline: { home: '1.50', away: '3.00' } },
          latency: 50,
          liquidityTier: 'high',
          partnerStatus: 'deferred',
          bookmakerId: asSportsbookId('deferred'),
        },
      },
      limits: { min: 10, max: 500 },
    };

    expect(detectEdges([ev], { minEdgePct: 0 })).toHaveLength(0);
  });

  test('filterEdges by type and min', () => {
    const edges = detectEdges(
      generateEvents(
        [
          {
            id: 'pinnacle',
            label: 'Pinnacle',
            status: 'active',
            balance: null,
            balanceAsOf: null,
            latencyMs: null,
            errorRate: null,
            uptime24h: null,
            liquidityTier: 'high',
            maxBetUsd: null,
            minBetUsd: null,
            lastProbe: null,
            urls: { web: 'https://pinnacle.com', api: null },
            fetcher: 'rest',
            sports: ['tennis'],
            hosts: ['pinnacle.com'],
            outsReady: 1,
            outsTotal: 1,
            skin: null,
          },
          {
            id: 'soft',
            label: 'Soft',
            status: 'active',
            balance: null,
            balanceAsOf: null,
            latencyMs: null,
            errorRate: null,
            uptime24h: null,
            liquidityTier: 'medium',
            maxBetUsd: 200,
            minBetUsd: null,
            lastProbe: null,
            urls: { web: 'https://soft.example', api: null },
            fetcher: 'seat',
            sports: ['basketball'],
            hosts: ['soft.example'],
            outsReady: 1,
            outsTotal: 1,
            skin: null,
          },
        ] as MergedPartnerHealth[],
        12,
      ),
      { minEdgePct: 0 },
    );
    const filtered = filterEdges(edges, { type: 'value', minEdge: 0 });
    expect(filtered.every(e => e.type === 'value')).toBe(true);
  });

  test('partnerEligibleForEdge excludes illiquid and deferred', () => {
    expect(
      partnerEligibleForEdge({
        id: 'x',
        label: 'X',
        status: 'deferred',
        balance: null,
        balanceAsOf: null,
        latencyMs: null,
        errorRate: null,
        uptime24h: null,
        liquidityTier: 'high',
        maxBetUsd: null,
        minBetUsd: null,
        lastProbe: null,
        urls: { web: null, api: null },
        fetcher: null,
        sports: [],
        hosts: [],
        outsReady: 0,
        outsTotal: 0,
        skin: null,
      }),
    ).toBe(false);
  });
});
