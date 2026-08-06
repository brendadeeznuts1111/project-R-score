// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
/**
 * Canonical event IDs + SQLite partner mapping.
 *
 * @see lib/research/types/event.ts
 * @see lib/operator-research/matching/schema.ts
 */

import type { Database } from 'bun:sqlite';
import { ensureMatchingSchema } from '../operator-research/matching/schema.ts';
import { openOddsDb } from '../operator-research/odds/odds-store.ts';
import type { PartnerEvent } from './types/event.ts';

function norm(s: string): string {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/** Stable short hash for sport|league|home|away|startTime. */
export function getCanonicalEventId(
  event: Pick<PartnerEvent, 'sport' | 'league' | 'homeTeam' | 'awayTeam' | 'startTime'>
): string {
  const day = String(event.startTime || '')
    .slice(0, 10)
    .replace(/[^0-9-]/g, '');
  const raw = [
    norm(event.sport),
    norm(event.league),
    norm(event.homeTeam),
    norm(event.awayTeam),
    day || 'unknown-day',
  ].join('|');
  return new Bun.CryptoHasher('sha256').update(raw).digest('hex').slice(0, 16);
}

export const CANONICAL_MAPPING_SCHEMA = `
CREATE TABLE IF NOT EXISTS canonical_event_mapping (
  canonical_id TEXT NOT NULL,
  partner_id TEXT NOT NULL,
  partner_event_id TEXT NOT NULL,
  event_row_id INTEGER,
  sport TEXT,
  league TEXT,
  home_team TEXT,
  away_team TEXT,
  session TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (canonical_id, partner_id)
);
CREATE INDEX IF NOT EXISTS idx_cem_partner_event
  ON canonical_event_mapping(partner_id, partner_event_id);
CREATE INDEX IF NOT EXISTS idx_cem_event_row ON canonical_event_mapping(event_row_id);

CREATE TABLE IF NOT EXISTS event_snapshots (
  id INTEGER PRIMARY KEY,
  canonical_id TEXT NOT NULL,
  partner_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  odds_hash TEXT NOT NULL,
  session TEXT,
  path TEXT NOT NULL,
  max_stake_usd REAL,
  UNIQUE(canonical_id, partner_id, timestamp)
);
CREATE INDEX IF NOT EXISTS idx_event_snapshots_canon
  ON event_snapshots(canonical_id, partner_id, timestamp DESC);
`;

export function ensureCanonicalSchema(db: Database = openOddsDb()): Database {
  ensureMatchingSchema(db);
  db.exec(CANONICAL_MAPPING_SCHEMA);
  return db;
}

function ensureTeam(db: Database, name: string, sport: string): number {
  const existing = db
    .query(`SELECT id FROM teams WHERE name = $name AND sport = $sport`)
    .get({ $name: name, $sport: sport }) as { id: number } | null;
  if (existing) return existing.id;
  db.query(
    `INSERT INTO teams (name, sport) VALUES ($name, $sport)
     ON CONFLICT(name, sport) DO NOTHING`
  ).run({ $name: name, $sport: sport });
  const row = db
    .query(`SELECT id FROM teams WHERE name = $name AND sport = $sport`)
    .get({ $name: name, $sport: sport }) as { id: number };
  return row.id;
}

function ensureLeague(db: Database, name: string, sport: string): number {
  const existing = db.query(`SELECT id FROM leagues WHERE name = $name`).get({ $name: name }) as {
    id: number;
  } | null;
  if (existing) return existing.id;
  try {
    db.query(`INSERT INTO leagues (name, sport) VALUES ($name, $sport)`).run({
      $name: name,
      $sport: sport,
    });
  } catch {
    /* race / unique */
  }
  const row = db.query(`SELECT id FROM leagues WHERE name = $name`).get({ $name: name }) as {
    id: number;
  };
  return row.id;
}

function ensureBookmaker(db: Database, partnerId: string): number {
  // brand-ok — opaque research/wire id
  const host =
    partnerId === 'hard-rock-florida'
      ? 'hardrock.bet'
      : partnerId === 'fonbet'
        ? 'fonbet.com'
        : `${partnerId}.local`;
  const existing = db
    .query(`SELECT id FROM bookmakers WHERE name = $name OR host = $host`)
    .get({ $name: partnerId, $host: host }) as { id: number } | null;
  if (existing) return existing.id;
  db.query(
    `INSERT INTO bookmakers (name, host, active) VALUES ($name, $host, 1)
     ON CONFLICT(name) DO UPDATE SET host = excluded.host`
  ).run({ $name: partnerId, $host: host });
  const row = db
    .query(`SELECT id FROM bookmakers WHERE name = $name`)
    .get({ $name: partnerId }) as { id: number };
  return row.id;
}

export type UpsertPartnerEventResult = {
  canonicalId: string; // brand-ok — opaque research/wire id
  eventRowId: number;
  bookmakerId: number;
};

/** Upsert leagues/teams/events + canonical + bookmaker_event_mapping. */
export function upsertPartnerEvent(
  event: PartnerEvent,
  db: Database = openOddsDb()
): UpsertPartnerEventResult {
  ensureCanonicalSchema(db);
  const canonicalId = getCanonicalEventId(event);
  const leagueId = ensureLeague(db, event.league, event.sport);
  const homeId = ensureTeam(db, event.homeTeam, event.sport);
  const awayId = ensureTeam(db, event.awayTeam, event.sport);
  const startUnix = Math.floor(new Date(event.startTime).getTime() / 1000) || null;
  const status = event.session === 'live' ? 'live' : 'scheduled';
  const externalId = `canon:${canonicalId}`;

  db.query(
    `INSERT INTO events (league_id, home_team_id, away_team_id, start_time, status, external_id, sport, league_name, metadata)
     VALUES ($leagueId, $homeId, $awayId, $start, $status, $ext, $sport, $league, $meta)
     ON CONFLICT(external_id) DO UPDATE SET
       status = excluded.status,
       start_time = COALESCE(excluded.start_time, events.start_time),
       sport = excluded.sport,
       league_name = excluded.league_name,
       metadata = excluded.metadata`
  ).run({
    $leagueId: leagueId,
    $homeId: homeId,
    $awayId: awayId,
    $start: startUnix,
    $status: status,
    $ext: externalId,
    $sport: event.sport,
    $league: event.league,
    $meta: JSON.stringify({
      session: event.session,
      canonicalId,
      source: event.source ?? 'fixture',
    }),
  });

  const eventRow = db
    .query(`SELECT id FROM events WHERE external_id = $ext`)
    .get({ $ext: externalId }) as { id: number };

  const bookmakerId = ensureBookmaker(db, event.partnerId);
  const now = Date.now();
  db.query(
    `INSERT INTO bookmaker_event_mapping
       (bookmaker_id, event_id, bookmaker_event_id, bookmaker_event_name, last_synced)
     VALUES ($bid, $eid, $peid, $name, $ts)
     ON CONFLICT(bookmaker_id, bookmaker_event_id) DO UPDATE SET
       event_id = excluded.event_id,
       bookmaker_event_name = excluded.bookmaker_event_name,
       last_synced = excluded.last_synced`
  ).run({
    $bid: bookmakerId,
    $eid: eventRow.id,
    $peid: event.id,
    $name: `${event.homeTeam} vs ${event.awayTeam}`,
    $ts: now,
  });

  const updatedAt = new Date().toISOString();
  db.query(
    `INSERT INTO canonical_event_mapping
       (canonical_id, partner_id, partner_event_id, event_row_id, sport, league, home_team, away_team, session, updated_at)
     VALUES ($cid, $pid, $peid, $eid, $sport, $league, $home, $away, $session, $ts)
     ON CONFLICT(canonical_id, partner_id) DO UPDATE SET
       partner_event_id = excluded.partner_event_id,
       event_row_id = excluded.event_row_id,
       session = excluded.session,
       updated_at = excluded.updated_at`
  ).run({
    $cid: canonicalId,
    $pid: event.partnerId,
    $peid: event.id,
    $eid: eventRow.id,
    $sport: event.sport,
    $league: event.league,
    $home: event.homeTeam,
    $away: event.awayTeam,
    $session: event.session,
    $ts: updatedAt,
  });

  return { canonicalId, eventRowId: eventRow.id, bookmakerId };
}

export function lookupEventRowId(canonicalId: string, db: Database = openOddsDb()): number | null {
  // brand-ok — opaque research/wire id
  ensureCanonicalSchema(db);
  const row = db
    .query(
      `SELECT event_row_id FROM canonical_event_mapping
       WHERE canonical_id = $cid AND event_row_id IS NOT NULL LIMIT 1`
    )
    .get({ $cid: canonicalId }) as { event_row_id: number } | null;
  return row?.event_row_id ?? null;
}

export type PartnerEventMapping = {
  canonicalId: string; // brand-ok — opaque research/wire id
  partnerId: string; // brand-ok — opaque research/wire id
  partnerEventId: string; // brand-ok — opaque research/wire id
  session: string | null;
  updatedAt: string;
};

export function listPartnerMappingsForEventRow(
  eventRowId: number,
  db: Database = openOddsDb()
): PartnerEventMapping[] {
  ensureCanonicalSchema(db);
  const rows = db
    .query(
      `SELECT canonical_id, partner_id, partner_event_id, session, updated_at
       FROM canonical_event_mapping
       WHERE event_row_id = $eid
       ORDER BY partner_id`
    )
    .all({ $eid: eventRowId }) as Array<{
    canonical_id: string; // brand-ok — opaque research/wire id
    partner_id: string; // brand-ok — opaque research/wire id
    partner_event_id: string; // brand-ok — opaque research/wire id
    session: string | null;
    updated_at: string;
  }>;
  return rows.map(r => ({
    canonicalId: r.canonical_id,
    partnerId: r.partner_id,
    partnerEventId: r.partner_event_id,
    session: r.session,
    updatedAt: r.updated_at,
  }));
}

export function lookupCanonicalIdForEventRow(
  eventRowId: number,
  db: Database = openOddsDb()
): string | null {
  const rows = listPartnerMappingsForEventRow(eventRowId, db);
  return rows[0]?.canonicalId ?? null;
}
