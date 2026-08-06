import { describe, expect, test, beforeEach } from 'bun:test';
import {
  bookmakerEligibleForMockBet,
  listMockBets,
  placeMockBet,
  resetMockBetLedger,
} from '../lib/operator-research/bet-mock.ts';
import type { EdgeOpportunity } from '../lib/operator-research/edge-engine.ts';
import { asEdgeId, asEventId, asSportsbookId } from '../lib/types/branded.ts';

function sampleEdge(over: Partial<EdgeOpportunity> = {}): EdgeOpportunity {
  return {
    id: asEdgeId('1-arb'),
    event_id: asEventId('1'),
    sport: 'basketball',
    league: 'NBA',
    home: 'A',
    away: 'B',
    market: 'moneyline',
    type: 'arbitrage',
    edge_percent: 3.2,
    expected_value: 3.2,
    confidence: 0.9,
    kelly_fraction: 0,
    stake_suggestion: 25,
    bookmakers: ['softbook', 'sharpbook'],
    bookmaker_ids: [asSportsbookId('soft-book'), asSportsbookId('sharp-book')],
    odds: { book1: '2.10', book2: '2.10' },
    latency_ms: { book1: 80, book2: 60 },
    latency_adjusted: false,
    liquidity_tiers: ['medium', 'high'],
    timestamp: Date.now(),
    ...over,
  };
}

describe('bet-mock', () => {
  beforeEach(() => resetMockBetLedger());

  test('rejects missing edge and bad stake', () => {
    expect(placeMockBet(undefined, { edgeId: 'x', stake: 10, bookmaker: 'a' }).status).toBe(
      404,
    );
    expect(
      placeMockBet(sampleEdge(), { edgeId: '1-arb', stake: 0, bookmaker: 'softbook' }).status,
    ).toBe(400);
  });

  test('rejects illiquid bookmaker tier', () => {
    const edge = sampleEdge({
      bookmakers: ['toxic'],
      bookmaker_ids: [asSportsbookId('toxic')],
      liquidity_tiers: ['illiquid'],
    });
    expect(bookmakerEligibleForMockBet(edge, 'toxic')).toBe(false);
    const r = placeMockBet(edge, { edgeId: edge.id, stake: 10, bookmaker: 'toxic' });
    expect(r.ok).toBe(false);
    expect(r.status).toBe(400);
  });

  test('places mock bet with mock:true', () => {
    const edge = sampleEdge();
    // force success path by retrying
    let order = null as ReturnType<typeof placeMockBet>['order'];
    for (let i = 0; i < 20; i++) {
      const r = placeMockBet(edge, {
        edgeId: edge.id,
        stake: 25,
        bookmaker: 'softbook',
      }, { successRate: 1 });
      if (r.order?.success) {
        order = r.order;
        break;
      }
    }
    expect(order?.mock).toBe(true);
    expect(order?.orderId).toMatch(/^ord-/);
    expect(listMockBets().length).toBeGreaterThan(0);
  });
});
