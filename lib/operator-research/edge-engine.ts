/**
 * Uncovered-edges engine for agent-odds dashboard (v1.06).
 *
 * Pure functions: arbitrage, value EV, steam moves, Kelly, latency-adjusted
 * confidence. Events/edges are simulated from partner catalog hosts when no
 * live odds feed is attached.
 *
 * @see tools/agent-odds-dashboard-serve.ts
 */
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7

import type { LiquidityTier, MergedPartnerHealth } from '../bookmakers/merged-registry.ts';
import {
  asEdgeId,
  asEventId,
  asRuleId,
  asSportsbookId,
  type EdgeId,
  type EventId,
  type RuleId,
  type SportsbookId,
} from '../types/branded.ts';

export type EdgeType = 'arbitrage' | 'value' | 'steam';
export type EventStatus = 'scheduled' | 'live' | 'finished';

export type BookQuote = {
  bookmakerId: SportsbookId;
  label: string;
  host: string;
  liquidityTier: LiquidityTier;
  partnerStatus: string;
  latencyMs: number;
  moneyline: { home: number; away: number };
  /** Prior moneyline for steam detection */
  priorMoneyline?: { home: number; away: number };
};

export type AgentEvent = {
  id: EventId;
  sport: string;
  league: string;
  home_team: string;
  away_team: string;
  start_time: number;
  status: EventStatus;
  geo: string;
  state: string;
  markets: {
    moneyline: { home: string; away: string };
    spread: { home: string; away: string };
    total: { over: string; under: string };
  };
  bookmakers: Record<
    string,
    {
      odds: { moneyline: { home: string; away: string } };
      latency: number;
      liquidityTier?: string;
      partnerStatus?: string;
      bookmakerId: SportsbookId;
    }
  >;
  limits: { min: number; max: number };
};

export type EdgeOpportunity = {
  id: EdgeId;
  event_id: EventId;
  sport: string;
  league: string;
  home: string;
  away: string;
  market: string;
  type: EdgeType;
  edge_percent: number;
  expected_value: number;
  confidence: number;
  kelly_fraction: number;
  stake_suggestion: number;
  bookmakers: string[];
  bookmaker_ids: SportsbookId[];
  odds: { book1: string; book2: string };
  latency_ms: { book1: number; book2: number };
  latency_adjusted: boolean;
  liquidity_tiers: string[];
  timestamp: number;
};

export type AlertRule = {
  id: RuleId;
  name: string;
  description?: string;
  active: boolean;
  condition: string;
  channels: string[];
  email_recipients?: string[];
  period: string;
  pattern: string;
  market_type: string;
  geo: string;
  state: string;
  edge?: { min?: number; max?: number };
  limit?: { min?: number; max?: number };
  latency_threshold?: number;
  bookmaker_comparison?: string;
};

export type RulePerformance = {
  rule_id: RuleId;
  name: string;
  triggered: number;
  hit_rate: number;
  avg_profit: number;
  total_pnl: number;
};

export type HistoryPoint = {
  timestamp: number;
  odds_decimal: number;
  bookmaker: string;
};

const SPORTS = [
  'basketball',
  'football',
  'tennis',
  'ice hockey',
  'baseball',
  'american football',
] as const;

const LEAGUES = [
  'NBA',
  'Premier League',
  'ATP',
  'NHL',
  'MLB',
  'NFL',
  'La Liga',
  'Serie A',
] as const;

const GEOS = ['US', 'UK', 'EU', 'CA'] as const;
const STATES = ['NV', 'NJ', 'PA', 'CA', 'NY', 'FL', 'TX', 'IL', 'CO', 'MI'] as const;

const BANKROLL_USD = 1_000;

/** Implied probability from decimal odds. */
export function impliedProb(decimalOdds: number): number {
  if (!(decimalOdds > 1)) return 0;
  return 1 / decimalOdds;
}

/**
 * Two-way arbitrage profit fraction when both sides are taken.
 * Returns 0 if no arb.
 */
export function twoWayArbProfit(oddsA: number, oddsB: number): number {
  if (!(oddsA > 1) || !(oddsB > 1)) return 0;
  const sum = 1 / oddsA + 1 / oddsB;
  if (sum >= 1) return 0;
  return 1 / sum - 1;
}

/** EV as percent of stake: (p * odds - 1) * 100 */
export function expectedValuePct(trueProb: number, decimalOdds: number): number {
  if (!(decimalOdds > 1) || trueProb <= 0) return 0;
  return (trueProb * decimalOdds - 1) * 100;
}

/** Full Kelly fraction for decimal odds. Clamped [0, 0.25] for desk safety. */
export function kellyFraction(trueProb: number, decimalOdds: number): number {
  if (!(decimalOdds > 1) || trueProb <= 0 || trueProb >= 1) return 0;
  const b = decimalOdds - 1;
  const q = 1 - trueProb;
  const f = (b * trueProb - q) / b;
  if (!Number.isFinite(f) || f <= 0) return 0;
  return Math.min(0.25, f);
}

/**
 * Latency-adjusted confidence: high latency reduces confidence that the edge
 * is still live (stale book).
 */
export function latencyAdjustedConfidence(
  base: number,
  latencyMs: number,
  thresholdMs = 250
): number {
  const lag = Math.max(0, latencyMs - thresholdMs);
  const penalty = Math.min(0.45, lag / 1000);
  return Math.max(0.05, Math.min(0.99, base * (1 - penalty)));
}

/** Eligible partners for arb/value (not illiquid / offline / deferred). */
export function partnerEligibleForEdge(p: MergedPartnerHealth): boolean {
  if (p.liquidityTier === 'illiquid') return false;
  if (p.status === 'offline' || p.status === 'critical' || p.status === 'deferred') {
    return false;
  }
  return true;
}

function randBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function decimal(n: number, d = 2): string {
  return n.toFixed(d);
}

/**
 * Build simulated multi-book events from partner health catalog.
 */
export function generateEvents(partners: MergedPartnerHealth[], count = 24): AgentEvent[] {
  const eligible = partners.filter(partnerEligibleForEdge);
  const pool = eligible.length >= 2 ? eligible : partners.slice(0, 6);
  const books =
    pool.length > 0
      ? pool
      : ([
          {
            id: asSportsbookId('pinnacle'),
            label: 'Pinnacle',
            hosts: ['pinnacle.com'],
            liquidityTier: 'high',
            status: 'active',
          },
        ] as unknown as MergedPartnerHealth[]);

  const events: AgentEvent[] = [];
  for (let i = 1; i <= count; i++) {
    const sport = pick(SPORTS);
    const league = pick(LEAGUES);
    const status = (['scheduled', 'live', 'live', 'finished'] as EventStatus[])[
      Math.floor(Math.random() * 4)
    ]!;
    const home = `Team ${String.fromCharCode(65 + (i % 26))}`;
    const away = `Team ${String.fromCharCode(75 + (i % 26))}`;
    const mlHome = randBetween(1.55, 2.8);
    const mlAway = Math.max(1.35, 3.05 - mlHome + randBetween(-0.15, 0.15));

    const bookmakers: AgentEvent['bookmakers'] = {};
    const bookSlice = books
      .slice()
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(5, Math.max(2, books.length)));

    bookSlice.forEach(p => {
      const skew = randBetween(-0.05, 0.07);
      const key = (p.label || p.id).toLowerCase().replace(/\s+/g, '');
      bookmakers[key] = {
        odds: {
          moneyline: {
            home: decimal(Math.max(1.25, mlHome + skew)),
            away: decimal(Math.max(1.25, mlAway - skew * 0.45)),
          },
        },
        latency: Math.floor(40 + Math.random() * 420),
        liquidityTier: p.liquidityTier,
        partnerStatus: p.status,
        bookmakerId: p.id,
      };
    });

    // Force a two-way arb on ~55% of multi-book events: fat home on A, fat away on B.
    const keys = Object.keys(bookmakers);
    if (keys.length >= 2 && Math.random() > 0.45) {
      const a = bookmakers[keys[0]!]!;
      const b = bookmakers[keys[1]!]!;
      a.odds.moneyline.home = decimal(Math.max(2.05, Number(a.odds.moneyline.home) + 0.35));
      b.odds.moneyline.away = decimal(Math.max(2.05, Number(b.odds.moneyline.away) + 0.35));
    }

    // consensus markets for the event row
    const first = Object.values(bookmakers)[0];
    events.push({
      id: asEventId(String(i)),
      sport,
      league,
      home_team: home,
      away_team: away,
      start_time: Date.now() + i * 3_600_000,
      status,
      geo: pick(GEOS),
      state: pick(STATES),
      markets: {
        moneyline: {
          home: first?.odds.moneyline.home ?? decimal(mlHome),
          away: first?.odds.moneyline.away ?? decimal(mlAway),
        },
        spread: {
          home: decimal(randBetween(-6.5, 6.5), 1),
          away: decimal(randBetween(-6.5, 6.5), 1),
        },
        total: {
          over: decimal(randBetween(1.75, 2.15)),
          under: decimal(randBetween(1.75, 2.15)),
        },
      },
      bookmakers,
      limits: {
        min: 10 + Math.floor(Math.random() * 20),
        max: 100 + Math.floor(Math.random() * 900),
      },
    });
  }
  return events;
}

/**
 * Detect uncovered edges from events:
 * - arbitrage across books on moneyline sides
 * - value vs sharp (highest liquidity / pinnacle-like) true price
 * - steam from synthetic prior quotes
 */
export function detectEdges(
  events: AgentEvent[],
  opts?: {
    bankroll?: number;
    minEdgePct?: number;
    includeFinished?: boolean;
  }
): EdgeOpportunity[] {
  const bankroll = opts?.bankroll ?? BANKROLL_USD;
  const minEdge = opts?.minEdgePct ?? 0.4;
  const edges: EdgeOpportunity[] = [];
  const now = Date.now();

  for (const ev of events) {
    if (ev.status === 'finished' && !opts?.includeFinished) continue;
    const entries = Object.entries(ev.bookmakers).filter(
      ([, b]) =>
        b.liquidityTier !== 'illiquid' &&
        b.partnerStatus !== 'offline' &&
        b.partnerStatus !== 'critical' &&
        b.partnerStatus !== 'deferred'
    );
    if (entries.length < 2) continue;

    // --- Arbitrage: best home vs best away across books ---
    let bestHome = {
      key: '',
      odds: 0,
      lat: 0,
      id: null as SportsbookId | null,
      tier: 'unknown',
    };
    let bestAway = {
      key: '',
      odds: 0,
      lat: 0,
      id: null as SportsbookId | null,
      tier: 'unknown',
    };
    for (const [key, b] of entries) {
      const h = Number(b.odds.moneyline.home);
      const a = Number(b.odds.moneyline.away);
      if (h > bestHome.odds) {
        bestHome = {
          key,
          odds: h,
          lat: b.latency,
          id: b.bookmakerId,
          tier: b.liquidityTier || 'unknown',
        };
      }
      if (a > bestAway.odds) {
        bestAway = {
          key,
          odds: a,
          lat: b.latency,
          id: b.bookmakerId,
          tier: b.liquidityTier || 'unknown',
        };
      }
    }
    if (
      bestHome.key &&
      bestAway.key &&
      bestHome.id &&
      bestAway.id &&
      bestHome.key !== bestAway.key
    ) {
      const profit = twoWayArbProfit(bestHome.odds, bestAway.odds);
      if (profit > 0) {
        const edgePct = profit * 100;
        if (edgePct >= minEdge) {
          const maxLat = Math.max(bestHome.lat, bestAway.lat);
          const conf = latencyAdjustedConfidence(0.92, maxLat);
          const stake = Math.round(bankroll * Math.min(0.05, profit * 2));
          edges.push({
            id: asEdgeId(`${ev.id}-arb`),
            event_id: ev.id,
            sport: ev.sport,
            league: ev.league,
            home: ev.home_team,
            away: ev.away_team,
            market: 'moneyline',
            type: 'arbitrage',
            edge_percent: +edgePct.toFixed(2),
            expected_value: +edgePct.toFixed(2),
            confidence: +conf.toFixed(3),
            kelly_fraction: 0, // risk-free split, not Kelly
            stake_suggestion: stake,
            bookmakers: [bestHome.key, bestAway.key],
            bookmaker_ids: [bestHome.id, bestAway.id],
            odds: {
              book1: decimal(bestHome.odds),
              book2: decimal(bestAway.odds),
            },
            latency_ms: { book1: bestHome.lat, book2: bestAway.lat },
            latency_adjusted: maxLat > 250,
            liquidity_tiers: [bestHome.tier, bestAway.tier],
            timestamp: now - Math.floor(Math.random() * 180_000),
          });
        }
      }
    }

    // --- Value: true prob from sharpest book (prefer high liquidity) ---
    const ranked = [...entries].sort((a, b) => {
      const rank = (t?: string) => (t === 'high' ? 0 : t === 'medium' ? 1 : t === 'low' ? 2 : 3);
      return rank(a[1].liquidityTier) - rank(b[1].liquidityTier);
    });
    const sharp = ranked[0]!;
    const sharpHomeP = impliedProb(Number(sharp[1].odds.moneyline.home));
    const sharpAwayP = impliedProb(Number(sharp[1].odds.moneyline.away));
    // de-vig rough: renormalize
    const vigSum = sharpHomeP + sharpAwayP || 1;
    const trueHome = sharpHomeP / vigSum;
    const trueAway = sharpAwayP / vigSum;

    for (const [key, b] of entries) {
      if (key === sharp[0]) continue;
      for (const side of ['home', 'away'] as const) {
        const odds = Number(b.odds.moneyline[side]);
        const trueP = side === 'home' ? trueHome : trueAway;
        const evPct = expectedValuePct(trueP, odds);
        if (evPct < minEdge) continue;
        const kelly = kellyFraction(trueP, odds);
        const conf = latencyAdjustedConfidence(0.55 + Math.min(0.35, evPct / 20), b.latency);
        edges.push({
          id: asEdgeId(`${ev.id}-val-${key}-${side}`),
          event_id: ev.id,
          sport: ev.sport,
          league: ev.league,
          home: ev.home_team,
          away: ev.away_team,
          market: `moneyline_${side}`,
          type: 'value',
          edge_percent: +evPct.toFixed(2),
          expected_value: +evPct.toFixed(2),
          confidence: +conf.toFixed(3),
          kelly_fraction: +kelly.toFixed(4),
          stake_suggestion: Math.max(5, Math.round(bankroll * kelly * 0.5)),
          bookmakers: [key, sharp[0]],
          bookmaker_ids: [b.bookmakerId, sharp[1].bookmakerId],
          odds: {
            book1: decimal(odds),
            book2: sharp[1].odds.moneyline[side],
          },
          latency_ms: { book1: b.latency, book2: sharp[1].latency },
          latency_adjusted: b.latency > 250,
          liquidity_tiers: [b.liquidityTier || 'unknown', sharp[1].liquidityTier || 'unknown'],
          timestamp: now - Math.floor(Math.random() * 240_000),
        });
      }
    }

    // --- Steam: synthetic prior vs current on a random book ---
    if (ev.status === 'live' || Math.random() > 0.4) {
      const [key, b] = pick(entries);
      const cur = Number(b.odds.moneyline.home);
      const prior = cur * (1 + randBetween(0.05, 0.14)); // steam down on favorite
      const movePct = ((prior - cur) / prior) * 100;
      if (movePct >= 5) {
        const conf = latencyAdjustedConfidence(0.7, b.latency, 150);
        edges.push({
          id: asEdgeId(`${ev.id}-steam-${key}`),
          event_id: ev.id,
          sport: ev.sport,
          league: ev.league,
          home: ev.home_team,
          away: ev.away_team,
          market: 'moneyline_home',
          type: 'steam',
          edge_percent: +movePct.toFixed(2),
          expected_value: +(movePct * 0.35).toFixed(2),
          confidence: +conf.toFixed(3),
          kelly_fraction: +Math.min(0.08, movePct / 200).toFixed(4),
          stake_suggestion: Math.round(bankroll * Math.min(0.08, movePct / 200)),
          bookmakers: [key],
          bookmaker_ids: [b.bookmakerId],
          odds: { book1: decimal(cur), book2: decimal(prior) },
          latency_ms: { book1: b.latency, book2: b.latency },
          latency_adjusted: b.latency > 150,
          liquidity_tiers: [b.liquidityTier || 'unknown'],
          timestamp: now - Math.floor(Math.random() * 90_000),
        });
      }
    }
  }

  edges.sort((a, b) => b.edge_percent - a.edge_percent);
  return edges;
}

export function filterEdges(
  edges: EdgeOpportunity[],
  q: {
    sport?: string | null;
    league?: string | null;
    type?: string | null;
    minEdge?: number | null;
  }
): EdgeOpportunity[] {
  let out = edges;
  if (q.sport) out = out.filter(e => e.sport === q.sport);
  if (q.league) out = out.filter(e => e.league === q.league);
  if (q.type) out = out.filter(e => e.type === q.type);
  if (q.minEdge != null && Number.isFinite(q.minEdge)) {
    out = out.filter(e => e.edge_percent >= (q.minEdge as number));
  }
  return out;
}

export function defaultAlertRules(): AlertRule[] {
  return [
    {
      id: asRuleId('price-move'),
      name: 'Price movement > 5%',
      description: 'Trigger when odds change more than 5%',
      active: true,
      condition: 'price_change_percent > 5',
      channels: ['ws', 'email'],
      email_recipients: ['admin@example.com'],
      period: 'live',
      pattern: 'spike',
      market_type: 'all',
      geo: 'US',
      state: '',
      edge: { min: 0.02, max: 0.1 },
      limit: { min: 10, max: 500 },
      latency_threshold: 200,
      bookmaker_comparison: 'sharp_vs_soft',
    },
    {
      id: asRuleId('arbitrage'),
      name: 'Arbitrage > 2%',
      active: true,
      condition: 'arb_percent > 2',
      channels: ['ws'],
      period: 'live',
      pattern: 'arbitrage',
      market_type: 'moneyline',
      geo: 'all',
      state: '',
      edge: { min: 0.02 },
      limit: { min: 5 },
      latency_threshold: 300,
      bookmaker_comparison: '',
    },
    {
      id: asRuleId('steam'),
      name: 'Steam move > 8%',
      active: true,
      condition: 'steam_move > 8',
      channels: ['ws', 'email'],
      period: 'live',
      pattern: 'spike',
      market_type: 'all',
      geo: 'all',
      state: '',
      edge: { min: 0.08 },
      limit: { min: 10, max: 300 },
      latency_threshold: 150,
      bookmaker_comparison: '',
    },
    {
      id: asRuleId('value-bet'),
      name: 'Value bet > 3% EV',
      active: true,
      condition: 'expected_value > 3',
      channels: ['ws'],
      period: 'prematch',
      pattern: 'value',
      market_type: 'moneyline',
      geo: 'US',
      state: 'NV',
      edge: { min: 0.03 },
      limit: { min: 20, max: 200 },
      latency_threshold: 100,
      bookmaker_comparison: '',
    },
  ];
}

export function rulePerformanceSnapshot(rules: AlertRule[]): RulePerformance[] {
  return rules.map(rule => ({
    rule_id: rule.id,
    name: rule.name,
    triggered: Math.floor(Math.random() * 20),
    hit_rate: +(0.3 + Math.random() * 0.5).toFixed(2),
    avg_profit: +(0.5 + Math.random() * 5).toFixed(2),
    total_pnl: +(10 + Math.random() * 50).toFixed(2),
  }));
}

export function generateEventHistory(
  eventId: EventId,
  marketType: string,
  bookKeys: string[]
): HistoryPoint[] {
  const points = 20;
  const data: HistoryPoint[] = [];
  const books = bookKeys.length ? bookKeys : ['sharp', 'soft'];
  for (const book of books.slice(0, 3)) {
    let val = 1.8 + Math.random() * 0.25;
    for (let i = 0; i < points; i++) {
      val += (Math.random() - 0.5) * 0.12;
      if (val < 1.05) val = 1.05;
      data.push({
        timestamp: Date.now() - (points - i) * 60_000,
        odds_decimal: +val.toFixed(3),
        bookmaker: book,
      });
    }
  }
  // tag market in silence for API consumers
  void eventId;
  void marketType;
  return data.sort((a, b) => a.timestamp - b.timestamp);
}

export function edgesSummary(edges: EdgeOpportunity[]) {
  if (edges.length === 0) {
    return {
      count: 0,
      avgEdge: 0,
      maxEdge: 0,
      byType: {} as Record<string, number>,
    };
  }
  const byType: Record<string, number> = {};
  let sum = 0;
  let max = 0;
  for (const e of edges) {
    sum += e.edge_percent;
    if (e.edge_percent > max) max = e.edge_percent;
    byType[e.type] = (byType[e.type] || 0) + 1;
  }
  return {
    count: edges.length,
    avgEdge: +(sum / edges.length).toFixed(2),
    maxEdge: +max.toFixed(2),
    byType,
  };
}
