// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * Cross-book arbitrage from provenance odds_history (canonical events).
 */
import type { Database } from 'bun:sqlite';
import { getMarketTypeId } from '../normalization/market-classifier.ts';
import { openOddsDb } from '../odds/odds-store.ts';
import { ensureMatchingSchema } from './schema.ts';

export type ArbLeg = {
  selection: string;
  bookmaker: string;
  host: string | null;
  tier: number;
  oddsDecimal: number;
  mappingId: number;
};

export type ArbitrageOpportunity = {
  eventId: number;
  marketTypeId: number;
  marketCode: string;
  invSum: number;
  edge: number;
  edgePct: number;
  legs: ArbLeg[];
  homeTeam: string | null;
  awayTeam: string | null;
  league: string | null;
};

type LatestQuote = {
  eventId: number;
  marketTypeId: number;
  selection: string;
  oddsDecimal: number;
  bookmaker: string;
  host: string | null;
  tier: number;
  mappingId: number;
  homeTeam: string | null;
  awayTeam: string | null;
  league: string | null;
  marketCode: string;
};

/**
 * Latest quote per (event, market, selection, bookmaker).
 */
export function loadLatestQuotes(
  opts: { eventId?: number; marketTypeId?: number; maxAgeMs?: number } = {},
  db: Database = openOddsDb()
): LatestQuote[] {
  ensureMatchingSchema(db);
  const maxAge = opts.maxAgeMs ?? 7 * 24 * 60 * 60 * 1000;
  const since = Date.now() - maxAge;
  // Fixture timestamps may be in the past — also allow historical floor
  const floor = Math.min(since, 1_700_000_000_000);

  const rows = db
    .query(
      `SELECT
         bem.event_id AS eventId,
         oh.market_type_id AS marketTypeId,
         oh.selection AS selection,
         oh.odds_decimal AS oddsDecimal,
         b.name AS bookmaker,
         b.host AS host,
         COALESCE(b.tier, 3) AS tier,
         bem.id AS mappingId,
         th.name AS homeTeam,
         ta.name AS awayTeam,
         COALESCE(e.league_name, l.name) AS league,
         mt.code AS marketCode,
         oh.timestamp AS timestamp
       FROM odds_history oh
       JOIN bookmaker_event_mapping bem ON bem.id = oh.bookmaker_event_mapping_id
       JOIN bookmakers b ON b.id = bem.bookmaker_id
       JOIN events e ON e.id = bem.event_id
       LEFT JOIN teams th ON th.id = e.home_team_id
       LEFT JOIN teams ta ON ta.id = e.away_team_id
       LEFT JOIN leagues l ON l.id = e.league_id
       LEFT JOIN market_types mt ON mt.id = oh.market_type_id
       WHERE oh.timestamp >= ?
         AND oh.odds_decimal > 1
         AND oh.selection IS NOT NULL
         AND oh.market_type_id IS NOT NULL
         AND (? IS NULL OR bem.event_id = ?)
         AND (? IS NULL OR oh.market_type_id = ?)
       ORDER BY oh.timestamp DESC`
    )
    .all(
      floor,
      opts.eventId ?? null,
      opts.eventId ?? null,
      opts.marketTypeId ?? null,
      opts.marketTypeId ?? null
    ) as (LatestQuote & { timestamp: number })[];

  const seen = new Set<string>();
  const out: LatestQuote[] = [];
  for (const r of rows) {
    const key = `${r.eventId}|${r.marketTypeId}|${r.selection}|${r.bookmaker}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

/**
 * 2-way (or n-way) arbitrage: for each event/market, take the best decimal
 * price per distinct selection across books. Arb when Σ 1/price < 1.
 */
export function detectCrossBookArbitrage(
  opts: {
    eventId?: number;
    market?: string;
    minEdgePct?: number;
    maxAgeMs?: number;
  } = {},
  db: Database = openOddsDb()
): ArbitrageOpportunity[] {
  ensureMatchingSchema(db);
  const marketTypeId = opts.market ? getMarketTypeId(opts.market, db) : null;
  const minEdge = (opts.minEdgePct ?? 1.5) / 100;
  const quotes = loadLatestQuotes(
    { eventId: opts.eventId, marketTypeId: marketTypeId ?? undefined, maxAgeMs: opts.maxAgeMs },
    db
  );

  // Group by event + market
  const groups = new Map<string, LatestQuote[]>();
  for (const q of quotes) {
    const key = `${q.eventId}|${q.marketTypeId}`;
    const list = groups.get(key) ?? [];
    list.push(q);
    groups.set(key, list);
  }

  const opportunities: ArbitrageOpportunity[] = [];
  for (const [, group] of groups) {
    // Best price per selection
    const bestBySel = new Map<string, LatestQuote>();
    for (const q of group) {
      const cur = bestBySel.get(q.selection);
      if (!cur || q.oddsDecimal > cur.oddsDecimal) bestBySel.set(q.selection, q);
    }
    if (bestBySel.size < 2) continue;

    // Require legs from at least 2 different books for a real cross-book arb
    const books = new Set([...bestBySel.values()].map(v => v.bookmaker));
    if (books.size < 2) continue;

    const legs = [...bestBySel.values()];
    const invSum = legs.reduce((acc, l) => acc + 1 / l.oddsDecimal, 0);
    if (!(invSum < 1 - minEdge)) continue;

    const edge = 1 - invSum;
    const sample = legs[0]!;
    opportunities.push({
      eventId: sample.eventId,
      marketTypeId: sample.marketTypeId,
      marketCode: sample.marketCode,
      invSum,
      edge,
      edgePct: edge * 100,
      legs: legs.map(l => ({
        selection: l.selection,
        bookmaker: l.bookmaker,
        host: l.host,
        tier: l.tier,
        oddsDecimal: l.oddsDecimal,
        mappingId: l.mappingId,
      })),
      homeTeam: sample.homeTeam,
      awayTeam: sample.awayTeam,
      league: sample.league,
    });
  }

  opportunities.sort((a, b) => b.edgePct - a.edgePct);
  return opportunities;
}
