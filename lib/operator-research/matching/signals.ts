// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/hashing#bun-hash — Bun.hash
import type { Database } from 'bun:sqlite';
import { openOddsDb } from '../odds/odds-store.ts';
import { detectCrossBookArbitrage } from './arbitrage.ts';
import { loadMergedRegistry } from '../../bookmakers/merge.ts';
import {
  loadAlertRules,
  type AlertPeriod,
  type AlertRule,
  edgeMatches,
  ruleMatchesPeriod,
} from './alerts.ts';
import type { AlertPattern, MovementPattern } from '../alert-vocabulary.ts';
import { detectNotableMovements, type LineMovement } from './line-movement.ts';
import { resolvePartnerContext, ruleMatchesPartners } from './partner-filters.ts';
import { ensureMatchingSchema } from './schema.ts';

export type OddsPeriod = 'prematch' | 'live' | 'all';

export type Signal = {
  id: string; // brand-ok — opaque research/wire id
  kind: 'arbitrage' | 'movement' | 'smart_money';
  pattern: AlertPattern;
  period: OddsPeriod;
  /** Edge as a fraction (0.02 = 2%). */
  edge: number;
  eventId: number | null;
  title: string;
  details: string;
  matchedRuleIds: string[];
  timestamp: number;
  payload: unknown;
};

function classifyMovementPattern(m: LineMovement): MovementPattern {
  const absPct = Math.abs(m.percentageChange);
  const minutes = m.timeDeltaMs / 60_000;
  // Spike: sharp move in a short window
  if (absPct >= 5 && minutes <= 5) return 'spike';
  // Drift: sustained move over a longer window
  if (absPct >= 2 && minutes > 5) return 'drift';
  // Reversal: recent flip vs prior direction isn't stored; treat large counter-moves as reversal
  if (absPct >= 8) return 'reversal';
  return 'spike';
}

function sessionForMapping(mappingId: number, db: Database): 'pregame' | 'live' | null {
  const row = db
    .query(
      `SELECT session FROM odds_history
       WHERE bookmaker_event_mapping_id = ?
       ORDER BY timestamp DESC LIMIT 1`
    )
    .get(mappingId) as { session: string | null } | null;
  if (row?.session === 'live' || row?.session === 'pregame') return row.session;
  return null;
}

function periodFromSession(session: 'pregame' | 'live' | null): OddsPeriod {
  if (session === 'live') return 'live';
  if (session === 'pregame') return 'prematch';
  return 'all';
}

function matchingRules(
  rules: AlertRule[],
  opts: {
    period: OddsPeriod;
    pattern: AlertPattern;
    edgeFraction: number;
    type: AlertRule['type'];
  }
): AlertRule[] {
  return rules.filter(r => {
    if (!r.enabled) return false;
    if (r.type !== opts.type) return false;
    if (!ruleMatchesPeriod(r, opts.period)) return false;
    if (r.pattern && r.pattern !== opts.pattern) return false;
    if (!edgeMatches(r, opts.edgeFraction)) return false;
    return true;
  });
}

/**
 * Derive live desk signals from arb + line-move detectors, annotated with
 * period/pattern/edge and matched TOML rules.
 */
export async function detectSignals(
  opts: { limit?: number; period?: OddsPeriod } = {},
  db: Database = openOddsDb()
): Promise<Signal[]> {
  ensureMatchingSchema(db);
  const rules = await loadAlertRules();
  const limit = Math.min(opts.limit ?? 50, 200);
  const periodFilter = opts.period ?? 'all';
  const out: Signal[] = [];

  const registry = loadMergedRegistry();
  const arbs = detectCrossBookArbitrage({ minEdgePct: 0.5 }, db);
  for (const a of arbs) {
    const edgeFrac = a.edgePct / 100;
    const period: OddsPeriod = 'all';
    if (periodFilter !== 'all' && period !== 'all' && periodFilter !== period) continue;
    const pattern: AlertPattern = 'arbitrage';
    const ctx = resolvePartnerContext(
      {
        hosts: a.legs.map(l => l.host),
        bookmakerNames: a.legs.map(l => l.bookmaker),
      },
      registry
    );
    const matched = matchingRules(rules, {
      period,
      pattern,
      edgeFraction: edgeFrac,
      type: 'arbitrage',
    }).filter(r =>
      ruleMatchesPartners(r, ctx, { marketCode: a.marketCode, requireArbEligible: true })
    );
    out.push({
      id: `sig-arb-${a.eventId}-${a.marketTypeId}-${Bun.hash(String(a.edgePct)).toString(16)}`,
      kind: 'arbitrage',
      pattern,
      period,
      edge: edgeFrac,
      eventId: a.eventId,
      title: `Arbitrage ${a.edgePct.toFixed(2)}% · ${a.homeTeam ?? '?'} vs ${a.awayTeam ?? '?'}`,
      details: a.legs
        .map(l => `${l.selection}@${l.bookmaker} ${l.oddsDecimal.toFixed(3)}`)
        .join(' · '),
      matchedRuleIds: matched.map(r => r.id),
      timestamp: Date.now(),
      payload: {
        ...a,
        partner_ids: ctx.partnerIds,
        partners: ctx.books.map(b => ({
          id: b.id,
          label: b.label,
          host: b.etldPlusOne,
          status: b.status,
          liquidityTier: b.liquidityTier,
        })),
      },
    });
  }

  const movements = detectNotableMovements({ minAbsPct: 1, sinceMs: 1, limit: 100 }, db);
  for (const m of movements) {
    const session = sessionForMapping(m.mappingId, db);
    const period = periodFromSession(session);
    if (periodFilter !== 'all' && period !== 'all' && periodFilter !== period) continue;
    const pattern = classifyMovementPattern(m);
    const edgeFrac = Math.abs(m.percentageChange) / 100;
    const matched = matchingRules(rules, {
      period,
      pattern,
      edgeFraction: edgeFrac,
      type: 'movement',
    });
    out.push({
      id: `sig-move-${m.mappingId}-${m.selection}-${m.latestTimestamp}`,
      kind: 'movement',
      pattern,
      period,
      edge: edgeFrac,
      eventId: null,
      title: `${pattern} ${m.direction} ${m.percentageChange.toFixed(2)}% · ${m.selection}`,
      details: `${m.from} → ${m.to} over ${m.timeDeltaMs}ms (${period})`,
      matchedRuleIds: matched.map(r => r.id),
      timestamp: m.latestTimestamp,
      payload: m,
    });
  }

  out.sort((a, b) => b.edge - a.edge || b.timestamp - a.timestamp);
  return out.slice(0, limit);
}
