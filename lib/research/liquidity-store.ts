/**
 * In-memory liquidity spot aggregation for Bun Agent partner intelligence.
 * Keeps the last 1000 contributions; aggregates by sport / league / market.
 */

export type LiquiditySpot = {
  id: string; // brand-ok — opaque research/wire id
  partnerId: string; // brand-ok — opaque research/wire id
  sport: string;
  league: string;
  marketType: string;
  maxStakeUsd: number;
  currency: string;
  source: 'manual' | 'research' | 'partner' | 'agent';
  note?: string;
  marketId?: string; // brand-ok — opaque research/wire id
  recordedAt: string;
};

export type LiquidityAggregate = {
  key: string;
  sport: string;
  league: string;
  marketType: string;
  totalStakeUsd: number;
  spotCount: number;
  partners: string[];
};

export type LiquiditySummary = {
  ok: true;
  totalStakeUsd: number;
  spotCount: number;
  partnerCount: number;
  topLeagues: Array<{ league: string; totalStakeUsd: number; spotCount: number }>;
  topMarkets: Array<{ marketType: string; totalStakeUsd: number; spotCount: number }>;
  aggregates: LiquidityAggregate[];
  recent: LiquiditySpot[];
  generatedAt: string;
};

const MAX_HISTORY = 1000;
const spots: LiquiditySpot[] = [];
let seq = 0;

function nextId(): string {
  seq += 1;
  return `liq_${Date.now().toString(36)}_${seq.toString(36)}`;
}

export function resetLiquidityStore(): void {
  spots.length = 0;
  seq = 0;
}

export function addLiquiditySpot(
  input: Omit<LiquiditySpot, 'id' | 'recordedAt'> & { recordedAt?: string }
): LiquiditySpot {
  const spot: LiquiditySpot = {
    id: nextId(),
    partnerId: String(input.partnerId || '').trim() || 'unknown',
    sport: String(input.sport || 'unknown').trim() || 'unknown',
    league: String(input.league || 'unknown').trim() || 'unknown',
    marketType: String(input.marketType || 'unknown').trim() || 'unknown',
    maxStakeUsd: Number.isFinite(input.maxStakeUsd) ? Number(input.maxStakeUsd) : 0,
    currency: String(input.currency || 'USD').trim() || 'USD',
    source: input.source ?? 'manual',
    note: input.note,
    marketId: input.marketId,
    recordedAt: input.recordedAt ?? new Date().toISOString(),
  };
  spots.unshift(spot);
  if (spots.length > MAX_HISTORY) spots.length = MAX_HISTORY;
  return spot;
}

export function listLiquiditySpots(limit = 50): LiquiditySpot[] {
  return spots.slice(0, Math.max(0, Math.min(limit, MAX_HISTORY)));
}

export function getLiquiditySummary(recentLimit = 25): LiquiditySummary {
  const byKey = new Map<string, LiquidityAggregate>();
  const byLeague = new Map<string, { totalStakeUsd: number; spotCount: number }>();
  const byMarket = new Map<string, { totalStakeUsd: number; spotCount: number }>();
  const partners = new Set<string>();
  let totalStakeUsd = 0;

  for (const spot of spots) {
    partners.add(spot.partnerId);
    totalStakeUsd += spot.maxStakeUsd;

    const key = `${spot.sport}|${spot.league}|${spot.marketType}`;
    const agg = byKey.get(key) ?? {
      key,
      sport: spot.sport,
      league: spot.league,
      marketType: spot.marketType,
      totalStakeUsd: 0,
      spotCount: 0,
      partners: [],
    };
    agg.totalStakeUsd += spot.maxStakeUsd;
    agg.spotCount += 1;
    if (!agg.partners.includes(spot.partnerId)) agg.partners.push(spot.partnerId);
    byKey.set(key, agg);

    const league = byLeague.get(spot.league) ?? { totalStakeUsd: 0, spotCount: 0 };
    league.totalStakeUsd += spot.maxStakeUsd;
    league.spotCount += 1;
    byLeague.set(spot.league, league);

    const market = byMarket.get(spot.marketType) ?? { totalStakeUsd: 0, spotCount: 0 };
    market.totalStakeUsd += spot.maxStakeUsd;
    market.spotCount += 1;
    byMarket.set(spot.marketType, market);
  }

  const topLeagues = [...byLeague.entries()]
    .map(([league, v]) => ({ league, ...v }))
    .sort((a, b) => b.totalStakeUsd - a.totalStakeUsd)
    .slice(0, 8);

  const topMarkets = [...byMarket.entries()]
    .map(([marketType, v]) => ({ marketType, ...v }))
    .sort((a, b) => b.totalStakeUsd - a.totalStakeUsd)
    .slice(0, 8);

  const aggregates = [...byKey.values()].sort((a, b) => b.totalStakeUsd - a.totalStakeUsd);

  return {
    ok: true,
    totalStakeUsd,
    spotCount: spots.length,
    partnerCount: partners.size,
    topLeagues,
    topMarkets,
    aggregates,
    recent: listLiquiditySpots(recentLimit),
    generatedAt: new Date().toISOString(),
  };
}
