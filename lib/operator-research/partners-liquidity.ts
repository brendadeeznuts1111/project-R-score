/**
 * Accounting-facing liquidity helpers for the Bun Agent desk.
 *
 * Thin facade over `lib/research/liquidity-store.ts` so dashboard / partners
 * can POST `{ amount }` while the research agent uses `maxStakeUsd`.
 *
 * @see lib/research/liquidity-store.ts
 * @see lib/operator-research/dashboard.ts — /api/partners/liquidity*
 */

import {
  addLiquiditySpot as addResearchSpot,
  getLiquiditySummary,
  resetLiquidityStore as resetResearchStore,
  type LiquiditySpot,
} from '../research/liquidity-store.ts';

export type LiquidityUpdate = {
  partnerId: string; // brand-ok — opaque research/wire id
  sport: string;
  league: string;
  marketType: string;
  amount: number;
  timestamp: string;
  note?: string;
  source?: 'partner' | 'agent' | 'manual' | 'research';
};

export type LiquidityAggregates = {
  bySport: Record<string, number>;
  byLeague: Record<string, number>;
  byMarketType: Record<string, number>;
  byCombination: Record<string, number>;
};

export type LiquiditySnapshot = {
  ok: true;
  aggregates: LiquidityAggregates;
  recent: LiquidityUpdate[];
  totalLiquidity: number;
  historyCount: number;
  generatedAt: string;
  lastUpdated: string;
};

export function liquidityKey(sport: string, league: string, marketType: string): string {
  return `${norm(sport)}|${norm(league)}|${norm(marketType)}`;
}

function norm(raw: string): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function resetLiquidityStore(): void {
  resetResearchStore();
}

export type AddLiquidityInput = {
  partnerId: string; // brand-ok — opaque research/wire id
  sport: string;
  league: string;
  marketType: string;
  amount: number;
  note?: string;
  source?: LiquidityUpdate['source'];
};

export type AddLiquidityResult =
  | { ok: true; key: string; total: number; entry: LiquidityUpdate; spot: LiquiditySpot }
  | { ok: false; status: number; error: string };

export function addLiquiditySpot(input: AddLiquidityInput): AddLiquidityResult {
  const partnerId = String(input.partnerId ?? '').trim();
  const sport = String(input.sport ?? '').trim();
  const league = String(input.league ?? '').trim();
  const marketType = String(input.marketType ?? '').trim();
  const amount = Number(input.amount);

  if (!partnerId || !sport || !league || !marketType) {
    return {
      ok: false,
      status: 400,
      error: 'Missing fields: partnerId, sport, league, marketType, amount',
    };
  }
  if (!Number.isFinite(amount)) {
    return { ok: false, status: 400, error: 'amount must be a finite number' };
  }

  const source =
    input.source === 'partner' ||
    input.source === 'agent' ||
    input.source === 'manual' ||
    input.source === 'research'
      ? input.source
      : 'manual';

  const spot = addResearchSpot({
    partnerId,
    sport,
    league,
    marketType,
    maxStakeUsd: amount,
    currency: 'USD',
    source,
    note: input.note,
  });

  const entry: LiquidityUpdate = {
    partnerId: spot.partnerId,
    sport: spot.sport,
    league: spot.league,
    marketType: spot.marketType,
    amount: spot.maxStakeUsd,
    timestamp: spot.recordedAt,
    source: spot.source,
  };
  if (spot.note) entry.note = spot.note;

  return {
    ok: true,
    key: liquidityKey(sport, league, marketType),
    total: spot.maxStakeUsd,
    entry,
    spot,
  };
}

export function getLiquiditySnapshot(opts: { recentLimit?: number } = {}): LiquiditySnapshot {
  const summary = getLiquiditySummary(opts.recentLimit ?? 20);
  const aggregates: LiquidityAggregates = {
    bySport: {},
    byLeague: {},
    byMarketType: {},
    byCombination: {},
  };
  for (const agg of summary.aggregates) {
    aggregates.bySport[agg.sport] = (aggregates.bySport[agg.sport] ?? 0) + agg.totalStakeUsd;
    aggregates.byLeague[agg.league] = (aggregates.byLeague[agg.league] ?? 0) + agg.totalStakeUsd;
    aggregates.byMarketType[agg.marketType] =
      (aggregates.byMarketType[agg.marketType] ?? 0) + agg.totalStakeUsd;
    aggregates.byCombination[agg.key] = agg.totalStakeUsd;
  }
  return {
    ok: true,
    aggregates,
    recent: summary.recent.map(s => ({
      partnerId: s.partnerId,
      sport: s.sport,
      league: s.league,
      marketType: s.marketType,
      amount: s.maxStakeUsd,
      timestamp: s.recordedAt,
      note: s.note,
      source: s.source,
    })),
    totalLiquidity: summary.totalStakeUsd,
    historyCount: summary.spotCount,
    generatedAt: summary.generatedAt,
    lastUpdated: summary.generatedAt,
  };
}

export function parseLiquidityBody(body: unknown): AddLiquidityInput | { error: string } {
  if (!body || typeof body !== 'object') return { error: 'Invalid JSON body' };
  const b = body as Record<string, unknown>;
  const amount =
    typeof b.amount === 'number'
      ? b.amount
      : typeof b.maxStakeUsd === 'number'
        ? b.maxStakeUsd
        : NaN;
  if (
    b.partnerId == null ||
    b.sport == null ||
    b.league == null ||
    b.marketType == null ||
    !Number.isFinite(amount)
  ) {
    return {
      error: 'Missing fields: partnerId, sport, league, marketType, amount',
    };
  }
  return {
    partnerId: String(b.partnerId),
    sport: String(b.sport),
    league: String(b.league),
    marketType: String(b.marketType),
    amount,
    note: b.note != null ? String(b.note) : undefined,
    source:
      b.source === 'partner' ||
      b.source === 'agent' ||
      b.source === 'manual' ||
      b.source === 'research'
        ? b.source
        : undefined,
  };
}
