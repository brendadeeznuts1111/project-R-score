// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
import type { Database } from 'bun:sqlite';
import { resolveLeague, resolveTeam } from '../normalization/team-resolver.ts';
import { openOddsDb } from '../odds/odds-store.ts';
import { ensureMatchingSchema } from './schema.ts';

export type MatchEventInput = {
  homeName: string;
  awayName: string;
  league?: string;
  sport?: string;
  startTime?: number | null;
  bookmakerId: number;
  externalId: string; // brand-ok — opaque research/wire id
  bookmakerEventName?: string;
  /** Match window in ms (default ±30 minutes). */
  windowMs?: number;
};

export type MatchEventResult = {
  eventId: number;
  mappingId: number;
  created: boolean;
  homeTeamId: number | null;
  awayTeamId: number | null;
};

/**
 * Map a bookmaker-specific event to a canonical event + bookmaker_event_mapping.
 * Match key: resolved home/away + league + start_time within window.
 */
export function matchEvent(input: MatchEventInput, db: Database = openOddsDb()): MatchEventResult {
  ensureMatchingSchema(db);

  const league = input.league ? resolveLeague(input.league, db) : null;
  const sport = input.sport ?? league?.sport;
  const home = resolveTeam(input.homeName, sport, db);
  const away = resolveTeam(input.awayName, sport, db);

  const windowMs = input.windowMs ?? 30 * 60 * 1000;
  const startTime = input.startTime ?? null;

  let eventId: number | null = null;
  let created = false;

  if (home && away) {
    // Prefer team pair + league; optionally constrain by start_time window
    if (startTime != null) {
      const row = db
        .query(
          `SELECT id FROM events
           WHERE home_team_id = ? AND away_team_id = ?
             AND (? IS NULL OR league_id = ?)
             AND start_time IS NOT NULL
             AND ABS(start_time - ?) < ?
           ORDER BY ABS(start_time - ?) ASC
           LIMIT 1`
        )
        .get(
          home.id,
          away.id,
          league?.id ?? null,
          league?.id ?? null,
          startTime,
          windowMs,
          startTime
        ) as { id: number } | null;
      if (row) eventId = row.id;
    }

    if (eventId == null) {
      const row = db
        .query(
          `SELECT id FROM events
           WHERE home_team_id = ? AND away_team_id = ?
             AND (? IS NULL OR league_id = ?)
           ORDER BY id DESC
           LIMIT 1`
        )
        .get(home.id, away.id, league?.id ?? null, league?.id ?? null) as {
        id: number;
      } | null;
      if (row) eventId = row.id;
    }
  }

  if (eventId == null) {
    // Fall back: reuse external_id if we already created a per-book stub
    const byExt = db.query(`SELECT id FROM events WHERE external_id = ?`).get(input.externalId) as {
      id: number;
    } | null;
    if (byExt) {
      eventId = byExt.id;
    } else {
      db.query(
        `INSERT INTO events (
          league_id, home_team_id, away_team_id, start_time, status,
          external_id, metadata, sport, league_name, external_ids
        ) VALUES (?, ?, ?, ?, 'scheduled', ?, ?, ?, ?, ?)`
      ).run(
        league?.id ?? null,
        home?.id ?? null,
        away?.id ?? null,
        startTime,
        input.externalId,
        JSON.stringify({
          homeName: input.homeName,
          awayName: input.awayName,
        }),
        sport ?? null,
        league?.name ?? input.league ?? null,
        JSON.stringify({ [String(input.bookmakerId)]: input.externalId })
      );
      eventId = (
        db.query(`SELECT id FROM events WHERE external_id = ?`).get(input.externalId) as {
          id: number;
        }
      ).id;
      created = true;
    }
  } else {
    // Merge external id into events.external_ids JSON
    const cur = db.query(`SELECT external_ids FROM events WHERE id = ?`).get(eventId) as {
      external_ids: string | null;
    };
    let map: Record<string, string> = {};
    try {
      map = cur.external_ids ? (JSON.parse(cur.external_ids) as Record<string, string>) : {};
    } catch {
      map = {};
    }
    map[String(input.bookmakerId)] = input.externalId;
    db.query(
      `UPDATE events SET
         external_ids = ?,
         sport = COALESCE(sport, ?),
         league_name = COALESCE(league_name, ?),
         league_id = COALESCE(league_id, ?),
         home_team_id = COALESCE(home_team_id, ?),
         away_team_id = COALESCE(away_team_id, ?),
         start_time = COALESCE(start_time, ?)
       WHERE id = ?`
    ).run(
      JSON.stringify(map),
      sport ?? null,
      league?.name ?? input.league ?? null,
      league?.id ?? null,
      home?.id ?? null,
      away?.id ?? null,
      startTime,
      eventId
    );
  }

  const existingMapping = db
    .query(
      `SELECT id FROM bookmaker_event_mapping
       WHERE bookmaker_id = ? AND bookmaker_event_id = ?`
    )
    .get(input.bookmakerId, input.externalId) as { id: number } | null;

  let mappingId: number;
  const eventName =
    input.bookmakerEventName ??
    `${home?.canonical ?? input.homeName} vs ${away?.canonical ?? input.awayName}`;

  if (existingMapping) {
    mappingId = existingMapping.id;
    db.query(
      `UPDATE bookmaker_event_mapping SET
         event_id = ?, bookmaker_event_name = ?, last_synced = ?
       WHERE id = ?`
    ).run(eventId, eventName, Date.now(), mappingId);
  } else {
    db.query(
      `INSERT INTO bookmaker_event_mapping (
         bookmaker_id, event_id, bookmaker_event_id, bookmaker_event_name, last_synced
       ) VALUES (?, ?, ?, ?, ?)`
    ).run(input.bookmakerId, eventId, input.externalId, eventName, Date.now());
    mappingId = (
      db
        .query(
          `SELECT id FROM bookmaker_event_mapping
           WHERE bookmaker_id = ? AND bookmaker_event_id = ?`
        )
        .get(input.bookmakerId, input.externalId) as { id: number }
    ).id;
  }

  return {
    eventId,
    mappingId,
    created,
    homeTeamId: home?.id ?? null,
    awayTeamId: away?.id ?? null,
  };
}
