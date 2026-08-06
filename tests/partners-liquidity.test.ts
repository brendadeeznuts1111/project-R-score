import { describe, expect, test, beforeEach } from 'bun:test';
import {
  addLiquiditySpot,
  getLiquiditySnapshot,
  liquidityKey,
  parseLiquidityBody,
  resetLiquidityStore,
} from '../lib/operator-research/partners-liquidity.ts';

describe('partners liquidity store', () => {
  beforeEach(() => {
    resetLiquidityStore();
  });

  test('liquidityKey normalizes case and whitespace', () => {
    expect(liquidityKey('Basketball', 'NBA', 'Moneyline')).toBe(
      'basketball|nba|moneyline'
    );
  });

  test('addLiquiditySpot accumulates aggregates by sport/league/market', () => {
    const a = addLiquiditySpot({
      partnerId: 'hard-rock-florida',
      sport: 'basketball',
      league: 'NBA',
      marketType: 'moneyline',
      amount: 500,
      source: 'agent',
    });
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    expect(a.total).toBe(500);

    addLiquiditySpot({
      partnerId: 'parlay21-com',
      sport: 'basketball',
      league: 'NBA',
      marketType: 'moneyline',
      amount: 250,
    });
    addLiquiditySpot({
      partnerId: 'pinnacle',
      sport: 'tennis',
      league: 'ATP',
      marketType: 'spread',
      amount: 1000,
    });

    const snap = getLiquiditySnapshot();
    expect(snap.totalLiquidity).toBe(1750);
    expect(snap.aggregates.bySport.basketball).toBe(750);
    expect(snap.aggregates.bySport.tennis).toBe(1000);
    expect(snap.aggregates.byLeague.NBA).toBe(750);
    expect(snap.aggregates.byMarketType.moneyline).toBe(750);
    expect(snap.recent[0]?.partnerId).toBe('pinnacle');
  });

  test('parseLiquidityBody accepts amount or maxStakeUsd', () => {
    expect(parseLiquidityBody(null)).toEqual({ error: 'Invalid JSON body' });
    expect(parseLiquidityBody({ partnerId: 'x' })).toHaveProperty('error');
    const viaAmount = parseLiquidityBody({
      partnerId: 'hard-rock-florida',
      sport: 'basketball',
      league: 'NBA',
      marketType: 'moneyline',
      amount: 10,
    });
    expect(viaAmount).toMatchObject({ amount: 10 });
    const viaMax = parseLiquidityBody({
      partnerId: 'hard-rock-florida',
      sport: 'basketball',
      league: 'NBA',
      marketType: 'moneyline',
      maxStakeUsd: 42,
    });
    expect(viaMax).toMatchObject({ amount: 42 });
  });
});
