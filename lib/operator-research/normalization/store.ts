// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
import type { Database } from 'bun:sqlite';
import { openOddsDb } from '../odds/odds-store.ts';
import type { OddsSnapshot } from '../odds/types.ts';
import { classifyMarketWithDb, getMarketTypeId } from './market-classifier.ts';
import { extractHandicapFromSelection, normalizeOdds } from './odds-converter.ts';
import { ensureNormalizationSchema } from './schema.ts';
import { parseMatchupTokens, resolveLeague, resolveTeam } from './team-resolver.ts';

export type StoreNormalizedOptions = {
  session?: 'pregame' | 'live';
  snapshotBlobId?: string; // brand-ok — opaque research/wire id
  sportHint?: string;
  leagueHint?: string;
};

export type NormalizedLineRow = {
  id: number;
  bookmakerId: number;
  eventId: number | null;
  marketTypeId: number | null;
  selection: string;
  oddsDecimal: number;
  oddsAmerican: number;
  oddsHandicap: number | null;
  timestamp: number;
  session: string;
};

function upsertBookmaker(host: string, sportsbookId: string | null, db: Database): number {
  // brand-ok — opaque research/wire id
  const byHost = db.query(`SELECT id FROM bookmakers WHERE host = ?`).get(host) as {
    id: number;
  } | null;
  if (byHost) return byHost.id;

  const name = sportsbookId ?? host;
  try {
    db.query(`INSERT INTO bookmakers (name, host, active, config) VALUES (?, ?, 1, ?)`).run(
      name,
      host,
      JSON.stringify({ id: sportsbookId, host })
    );
  } catch {
    db.query(`UPDATE bookmakers SET host = ? WHERE name = ?`).run(host, name);
  }
  const row = db.query(`SELECT id FROM bookmakers WHERE host = ?`).get(host) as {
    id: number;
  };
  return row.id;
}

function upsertEvent(opts: {
  externalId: string; // brand-ok — opaque research/wire id
  homeId: number | null;
  awayId: number | null;
  leagueId: number | null;
  startTime?: number | null;
  metadata?: unknown;
  db: Database;
}): number {
  const existing = opts.db
    .query(`SELECT id FROM events WHERE external_id = ?`)
    .get(opts.externalId) as { id: number } | null;
  if (existing) {
    opts.db
      .query(
        `UPDATE events SET
          league_id = COALESCE(?, league_id),
          home_team_id = COALESCE(?, home_team_id),
          away_team_id = COALESCE(?, away_team_id),
          metadata = ?
         WHERE id = ?`
      )
      .run(
        opts.leagueId,
        opts.homeId,
        opts.awayId,
        JSON.stringify(opts.metadata ?? {}),
        existing.id
      );
    return existing.id;
  }
  opts.db
    .query(
      `INSERT INTO events (
        league_id, home_team_id, away_team_id, start_time, status, external_id, metadata
      ) VALUES (?, ?, ?, ?, 'scheduled', ?, ?)`
    )
    .run(
      opts.leagueId,
      opts.homeId,
      opts.awayId,
      opts.startTime ?? null,
      opts.externalId,
      JSON.stringify(opts.metadata ?? {})
    );
  return (
    opts.db.query(`SELECT id FROM events WHERE external_id = ?`).get(opts.externalId) as {
      id: number;
    }
  ).id;
}

/**
 * Dual-write: expand an OddsSnapshot into relational odds_normalized rows.
 */
export function storeNormalizedSnapshot(
  snapshot: OddsSnapshot,
  opts: StoreNormalizedOptions = {},
  db: Database = openOddsDb()
): { lines: number; events: number } {
  ensureNormalizationSchema(db);
  const host = String(snapshot.host);
  const bookmakerId = upsertBookmaker(
    host,
    snapshot.sportsbookId ? String(snapshot.sportsbookId) : null,
    db
  );
  const session = opts.session ?? 'pregame';
  const insert = db.query(`
    INSERT INTO odds_normalized (
      bookmaker_id, event_id, market_type_id, selection,
      odds_original, odds_decimal, odds_american, odds_handicap,
      timestamp, session, snapshot_blob_id, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let lines = 0;
  const eventIds = new Set<number>();

  for (const market of snapshot.markets) {
    const marketCode = classifyMarketWithDb(market.name, db);
    let marketTypeId = getMarketTypeId(marketCode, db);
    if (marketTypeId == null && marketCode !== 'unknown') {
      marketTypeId = getMarketTypeId('unknown', db);
    }

    const tokens = parseMatchupTokens(market.name, market.id);
    const league =
      resolveLeague(opts.leagueHint ?? tokens.leagueHint ?? '', db) ??
      (tokens.leagueHint ? resolveLeague(tokens.leagueHint.toUpperCase(), db) : null);

    const sport = opts.sportHint ?? league?.sport;
    const home = tokens.home ? resolveTeam(tokens.home, sport, db) : null;
    const away = tokens.away ? resolveTeam(tokens.away, sport, db) : null;

    const externalId = `${host}:${market.id.replace(/-(ml|total|spread|ah)$/i, '')}`;
    const eventId = upsertEvent({
      externalId,
      homeId: home?.id ?? null,
      awayId: away?.id ?? null,
      leagueId: league?.id ?? home?.leagueId ?? away?.leagueId ?? null,
      metadata: {
        marketId: market.id,
        marketName: market.name,
        homeToken: tokens.home,
        awayToken: tokens.away,
      },
      db,
    });
    eventIds.add(eventId);

    for (const sel of market.selections) {
      const normalized =
        normalizeOdds(sel.american ?? sel.price, sel.american != null ? 'american' : 'decimal') ??
        normalizeOdds(sel.price, 'decimal');
      if (!normalized) continue;
      const handicap = normalized.handicap ?? extractHandicapFromSelection(sel.name) ?? null;
      insert.run(
        bookmakerId,
        eventId,
        marketTypeId,
        sel.name,
        String(sel.american ?? sel.price),
        normalized.oddsDecimal,
        normalized.oddsAmerican,
        handicap,
        snapshot.timestamp,
        session,
        opts.snapshotBlobId ?? null,
        JSON.stringify({
          marketId: market.id,
          marketName: market.name,
          marketCode,
          source: snapshot.source,
        })
      );
      lines++;
    }
  }

  return { lines, events: eventIds.size };
}

export type OddsQueryFilter = {
  sport?: string;
  league?: string;
  market?: string;
  host?: string;
  bookmaker?: string;
  session?: 'pregame' | 'live';
  limit?: number;
};

export type OddsQueryRow = {
  id: number;
  eventId: number | null;
  selection: string;
  oddsDecimal: number | null;
  oddsAmerican: number | null;
  oddsHandicap: number | null;
  timestamp: number | null;
  session: string | null;
  marketCode: string | null;
  bookmaker: string | null;
  host: string | null;
  homeTeam: string | null;
  awayTeam: string | null;
  league: string | null;
  sport: string | null;
  source: string | null;
};

export function queryNormalizedOdds(
  filter: OddsQueryFilter = {},
  db: Database = openOddsDb()
): OddsQueryRow[] {
  ensureNormalizationSchema(db);
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filter.sport) {
    clauses.push(`(l.sport = ? OR th.sport = ? OR ta.sport = ?)`);
    params.push(filter.sport, filter.sport, filter.sport);
  }
  if (filter.league) {
    clauses.push(`l.name = ? COLLATE NOCASE`);
    params.push(filter.league);
  }
  if (filter.market) {
    clauses.push(`mt.code = ?`);
    params.push(filter.market);
  }
  if (filter.host) {
    clauses.push(`b.host = ?`);
    params.push(filter.host);
  }
  if (filter.bookmaker) {
    clauses.push(`b.name = ? COLLATE NOCASE`);
    params.push(filter.bookmaker);
  }
  if (filter.session) {
    clauses.push(`o.session = ?`);
    params.push(filter.session);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const limit = Math.min(Math.max(filter.limit ?? 50, 1), 500);
  params.push(limit);

  const sql = `
    SELECT
      o.id,
      o.event_id AS eventId,
      o.selection,
      o.odds_decimal AS oddsDecimal,
      o.odds_american AS oddsAmerican,
      o.odds_handicap AS oddsHandicap,
      o.timestamp,
      o.session,
      mt.code AS marketCode,
      b.name AS bookmaker,
      b.host AS host,
      th.name AS homeTeam,
      ta.name AS awayTeam,
      l.name AS league,
      COALESCE(l.sport, th.sport, ta.sport) AS sport,
      json_extract(o.metadata, '$.source') AS source
    FROM odds_normalized o
    LEFT JOIN bookmakers b ON b.id = o.bookmaker_id
    LEFT JOIN events e ON e.id = o.event_id
    LEFT JOIN teams th ON th.id = e.home_team_id
    LEFT JOIN teams ta ON ta.id = e.away_team_id
    LEFT JOIN leagues l ON l.id = e.league_id
    LEFT JOIN market_types mt ON mt.id = o.market_type_id
    ${where}
    ORDER BY o.timestamp DESC, o.id DESC
    LIMIT ?
  `;
  return db.query(sql).all(...params) as OddsQueryRow[];
}

/** Cursor query for same-origin SSE consumers. Rows are ordered oldest → newest. */
export function queryNormalizedOddsAfter(
  afterId: number,
  filter: Pick<OddsQueryFilter, 'session' | 'limit'> = {},
  db: Database = openOddsDb()
): OddsQueryRow[] {
  ensureNormalizationSchema(db);
  const clauses = ['o.id > ?'];
  const params: Array<number | string> = [
    Number.isFinite(afterId) ? Math.max(0, Math.floor(afterId)) : 0,
  ];
  if (filter.session) {
    clauses.push('o.session = ?');
    params.push(filter.session);
  }
  const limit = Math.min(Math.max(filter.limit ?? 50, 1), 500);
  params.push(limit);
  return db
    .query(
      `SELECT
        o.id,
        o.event_id AS eventId,
        o.selection,
        o.odds_decimal AS oddsDecimal,
        o.odds_american AS oddsAmerican,
        o.odds_handicap AS oddsHandicap,
        o.timestamp,
        o.session,
        mt.code AS marketCode,
        b.name AS bookmaker,
        b.host AS host,
        th.name AS homeTeam,
        ta.name AS awayTeam,
        l.name AS league,
        COALESCE(l.sport, th.sport, ta.sport) AS sport,
        json_extract(o.metadata, '$.source') AS source
      FROM odds_normalized o
      LEFT JOIN bookmakers b ON b.id = o.bookmaker_id
      LEFT JOIN events e ON e.id = o.event_id
      LEFT JOIN teams th ON th.id = e.home_team_id
      LEFT JOIN teams ta ON ta.id = e.away_team_id
      LEFT JOIN leagues l ON l.id = e.league_id
      LEFT JOIN market_types mt ON mt.id = o.market_type_id
      WHERE ${clauses.join(' AND ')}
      ORDER BY o.id ASC
      LIMIT ?`
    )
    .all(...params) as OddsQueryRow[];
}
