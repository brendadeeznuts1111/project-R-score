// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * Dual-write provenance: match events across books + append odds_history.
 */
import type { Database } from 'bun:sqlite';
import { classifyMarketWithDb, getMarketTypeId } from '../normalization/market-classifier.ts';
import { extractHandicapFromSelection, normalizeOdds } from '../normalization/odds-converter.ts';
import { parseMatchupTokens, resolveLeague } from '../normalization/team-resolver.ts';
import { openOddsDb } from '../odds/odds-store.ts';
import type { OddsSnapshot } from '../odds/types.ts';
import { detectMovements, type LineMovement } from './line-movement.ts';
import { matchEvent } from './event-matcher.ts';
import { appendOddsHistory } from './odds-history.ts';
import { ensureMatchingSchema } from './schema.ts';

export type ProvenanceWriteResult = {
  eventIds: number[];
  mappingIds: number[];
  historyRows: number;
  movements: LineMovement[];
};

function bookmakerIdForHost(host: string, sportsbookId: string | null, db: Database): number {
  // brand-ok — opaque research/wire id
  const byHost = db.query(`SELECT id FROM bookmakers WHERE host = ?`).get(host) as {
    id: number;
  } | null;
  if (byHost) return byHost.id;
  const name = sportsbookId ?? host;
  try {
    db.query(
      `INSERT INTO bookmakers (name, host, active, tier, config) VALUES (?, ?, 1, 3, ?)`
    ).run(name, host, JSON.stringify({ id: sportsbookId, host }));
  } catch {
    db.query(`UPDATE bookmakers SET host = ? WHERE name = ?`).run(host, name);
  }
  return (db.query(`SELECT id FROM bookmakers WHERE host = ?`).get(host) as { id: number }).id;
}

/**
 * For each market in a snapshot: match canonical event, upsert bookmaker mapping,
 * append odds_history rows, and surface notable line movements.
 */
export function writeProvenanceFromSnapshot(
  snapshot: OddsSnapshot,
  opts: {
    session?: 'pregame' | 'live';
    startTime?: number | null;
    minMovePct?: number;
  } = {},
  db: Database = openOddsDb()
): ProvenanceWriteResult {
  ensureMatchingSchema(db);
  const host = String(snapshot.host);
  const bookmakerId = bookmakerIdForHost(
    host,
    snapshot.sportsbookId ? String(snapshot.sportsbookId) : null,
    db
  );
  const session = opts.session ?? 'pregame';
  const eventIds = new Set<number>();
  const mappingIds = new Set<number>();
  const movements: LineMovement[] = [];
  let historyRows = 0;

  for (const market of snapshot.markets) {
    const tokens = parseMatchupTokens(market.name, market.id);
    if (!tokens.home || !tokens.away) continue;

    const league = tokens.leagueHint
      ? (resolveLeague(tokens.leagueHint, db) ?? resolveLeague(tokens.leagueHint.toUpperCase(), db))
      : null;

    const externalId = `${host}:${market.id.replace(/-(ml|total|spread|ah|ou|h2h)$/i, '')}`;
    const matched = matchEvent(
      {
        homeName: tokens.home,
        awayName: tokens.away,
        league: league?.name ?? tokens.leagueHint,
        sport: league?.sport,
        startTime: opts.startTime ?? snapshot.timestamp,
        bookmakerId,
        externalId,
        bookmakerEventName: `${tokens.home} vs ${tokens.away}`,
      },
      db
    );
    eventIds.add(matched.eventId);
    mappingIds.add(matched.mappingId);

    const marketCode = classifyMarketWithDb(market.name, db);
    const marketTypeId = getMarketTypeId(marketCode, db) ?? getMarketTypeId('unknown', db);

    for (const sel of market.selections) {
      const normalized =
        normalizeOdds(sel.american ?? sel.price, sel.american != null ? 'american' : 'decimal') ??
        normalizeOdds(sel.price, 'decimal');
      if (!normalized) continue;

      appendOddsHistory(
        {
          mappingId: matched.mappingId,
          marketTypeId,
          selection: sel.name,
          oddsDecimal: normalized.oddsDecimal,
          oddsAmerican: normalized.oddsAmerican,
          oddsHandicap: normalized.handicap ?? extractHandicapFromSelection(sel.name) ?? null,
          timestamp: snapshot.timestamp,
          session,
          rawPayload: {
            host,
            marketId: market.id,
            marketName: market.name,
            selection: sel,
            source: snapshot.source,
          },
        },
        db
      );
      historyRows++;

      if (marketTypeId != null) {
        const move = detectMovements(
          matched.mappingId,
          marketTypeId,
          { selection: sel.name, minAbsPct: opts.minMovePct ?? 0 },
          db
        );
        if (move && Math.abs(move.percentageChange) >= (opts.minMovePct ?? 2)) {
          movements.push(move);
        }
      }
    }
  }

  return {
    eventIds: [...eventIds],
    mappingIds: [...mappingIds],
    historyRows,
    movements,
  };
}
