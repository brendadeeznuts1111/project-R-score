// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
import type { Database } from 'bun:sqlite';
import { openOddsDb } from '../odds/odds-store.ts';
import { ensureMatchingSchema } from './schema.ts';

export type EventMarketOdds = {
  home?: string | number;
  away?: string | number;
  over?: string | number;
  under?: string | number;
};

export type EventBookmakerOdds = {
  odds: {
    moneyline?: EventMarketOdds;
    spread?: EventMarketOdds;
    total?: EventMarketOdds;
    [market: string]: EventMarketOdds | undefined;
  };
  /** Age of latest tick in ms (staleness proxy for latency). */
  latency: number;
};

export type EventPartnerId = {
  partner_id: string; // brand-ok — opaque research/wire id
  partner_event_id: string; // brand-ok — opaque research/wire id
};

export type EventRow = {
  id: number;
  sport: string | null;
  league: string | null;
  home_team: string | null;
  away_team: string | null;
  start_time: number | null;
  status: string | null;
  /** live | pregame — from metadata.session or status */
  session: string | null;
  external_id: string | null; // brand-ok — opaque research/wire id
  canonical_id: string | null; // brand-ok — opaque research/wire id
  partner_hosts: string[];
  /** Partner book → partner event id (from mapping tables). */
  partner_event_ids: EventPartnerId[];
  /** Country / region code derived from league or event metadata. */
  country: string | null;
  geo: string | null;
  state: string | null;
  markets: Record<string, EventMarketOdds>;
  bookmakers: Record<string, EventBookmakerOdds>;
  limits: { min: number | null; max: number | null };
  avg_latency: number | null;
};

export type EventListFilter = {
  sport?: string;
  league?: string;
  status?: string;
  /** live | pregame — maps onto events.status / metadata.session */
  session?: string;
  geo?: string;
  state?: string;
  limit?: number;
};

type MetaShape = {
  geo?: string;
  country?: string;
  state?: string;
  session?: string;
  canonicalId?: string; // brand-ok — opaque research/wire id
  limits?: { min?: number; max?: number };
};

function parseMeta(raw: string | null | undefined): MetaShape {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as MetaShape;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function bookKey(name: string | null, host: string | null): string {
  const base = (name || host || 'unknown').toLowerCase();
  if (base.includes('fonbet')) return 'fonbet';
  if (base.includes('betmgm') || base.includes('mgm')) return 'betmgm';
  if (base.includes('stake')) return 'stake';
  if (base.includes('hardrock') || base.includes('hard-rock')) return 'hardrock';
  if (base.includes('bet365')) return 'bet365';
  // Prefer short name without TLD noise
  const hostOnly = (host || name || 'unknown').toLowerCase().replace(/^www\./, '');
  return hostOnly.split('.')[0] || hostOnly;
}

function selectionSide(selection: string | null | undefined): keyof EventMarketOdds | null {
  if (!selection) return null;
  const s = selection.toLowerCase();
  if (s.includes('over')) return 'over';
  if (s.includes('under')) return 'under';
  if (s.includes('home') || s === '1' || s.includes('hometeam')) return 'home';
  if (s.includes('away') || s === '2' || s.includes('awayteam')) return 'away';
  // Heuristic: first selection often home for moneyline
  return null;
}

function marketBucket(code: string | null | undefined): string {
  const c = (code || 'moneyline').toLowerCase();
  if (c.includes('spread') || c.includes('handicap') || c === 'ah') return 'spread';
  if (c.includes('total') || c.includes('ou') || c === 'over_under') return 'total';
  return 'moneyline';
}

type BaseRow = {
  id: number;
  sport: string | null;
  league: string | null;
  home_team: string | null;
  away_team: string | null;
  start_time: number | null;
  status: string | null;
  external_id: string | null; // brand-ok — opaque research/wire id
  partner_hosts: string | null;
  country: string | null;
  metadata: string | null;
};

function mapBase(
  row: BaseRow
): Omit<
  EventRow,
  'markets' | 'bookmakers' | 'limits' | 'avg_latency' | 'geo' | 'state' | 'country'
> & { country: string | null; geo: string | null; state: string | null; meta: MetaShape } {
  let partner_hosts: string[] = [];
  if (row.partner_hosts) {
    partner_hosts = row.partner_hosts
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }
  const meta = parseMeta(row.metadata);
  const country = meta.country || row.country || null;
  const geo = meta.geo || country || null;
  const state = meta.state || null;
  return {
    id: row.id,
    sport: row.sport,
    league: row.league,
    home_team: row.home_team,
    away_team: row.away_team,
    start_time: row.start_time,
    status: row.status,
    external_id: row.external_id,
    partner_hosts,
    country,
    geo,
    state,
    meta,
  };
}

const EVENT_SELECT = `
  SELECT
    e.id,
    COALESCE(e.sport, l.sport) AS sport,
    COALESCE(e.league_name, l.name) AS league,
    th.name AS home_team,
    ta.name AS away_team,
    e.start_time,
    e.status,
    e.external_id,
    e.metadata,
    l.country AS country,
    (
      SELECT GROUP_CONCAT(DISTINCT COALESCE(b.host, b.name))
      FROM bookmaker_event_mapping bem
      JOIN bookmakers b ON b.id = bem.bookmaker_id
      WHERE bem.event_id = e.id
    ) AS partner_hosts
  FROM events e
  LEFT JOIN teams th ON th.id = e.home_team_id
  LEFT JOIN teams ta ON ta.id = e.away_team_id
  LEFT JOIN leagues l ON l.id = e.league_id
`;

type OddsTick = {
  event_id: number;
  book_name: string | null;
  book_host: string | null;
  market_code: string | null;
  selection: string | null;
  odds_decimal: number | null;
  timestamp: number | null;
};

function loadOddsTicks(eventIds: number[], db: Database): Map<number, OddsTick[]> {
  const map = new Map<number, OddsTick[]>();
  if (!eventIds.length) return map;
  const placeholders = eventIds.map(() => '?').join(',');
  // Prefer odds_history via mapping; fall back to odds_normalized.
  let rows: OddsTick[] = [];
  try {
    rows = db
      .query(
        `SELECT
           bem.event_id AS event_id,
           b.name AS book_name,
           b.host AS book_host,
           mt.code AS market_code,
           oh.selection AS selection,
           oh.odds_decimal AS odds_decimal,
           oh.timestamp AS timestamp
         FROM odds_history oh
         JOIN bookmaker_event_mapping bem ON bem.id = oh.bookmaker_event_mapping_id
         JOIN bookmakers b ON b.id = bem.bookmaker_id
         LEFT JOIN market_types mt ON mt.id = oh.market_type_id
         WHERE bem.event_id IN (${placeholders})
         ORDER BY oh.timestamp DESC`
      )
      .all(...eventIds) as OddsTick[];
  } catch {
    rows = [];
  }
  if (!rows.length) {
    try {
      rows = db
        .query(
          `SELECT
             onorm.event_id AS event_id,
             b.name AS book_name,
             b.host AS book_host,
             mt.code AS market_code,
             onorm.selection AS selection,
             onorm.odds_decimal AS odds_decimal,
             onorm.timestamp AS timestamp
           FROM odds_normalized onorm
           JOIN bookmakers b ON b.id = onorm.bookmaker_id
           LEFT JOIN market_types mt ON mt.id = onorm.market_type_id
           WHERE onorm.event_id IN (${placeholders})
           ORDER BY onorm.timestamp DESC`
        )
        .all(...eventIds) as OddsTick[];
    } catch {
      rows = [];
    }
  }
  for (const row of rows) {
    const list = map.get(row.event_id) ?? [];
    list.push(row);
    map.set(row.event_id, list);
  }
  return map;
}

function resolveSession(base: ReturnType<typeof mapBase>): string | null {
  const fromMeta = (base.meta.session || '').toLowerCase();
  if (fromMeta === 'live' || fromMeta === 'pregame' || fromMeta === 'prematch') {
    return fromMeta === 'prematch' ? 'pregame' : fromMeta;
  }
  const st = (base.status || '').toLowerCase();
  if (st === 'live') return 'live';
  if (st === 'scheduled' || st === 'pregame' || st === 'prematch') return 'pregame';
  return null;
}

function loadPartnerEventIds(eventIds: number[], db: Database): Map<number, EventPartnerId[]> {
  const map = new Map<number, EventPartnerId[]>();
  if (!eventIds.length) return map;
  try {
    // Prefer research canonical mapping when present
    db.exec(`CREATE TABLE IF NOT EXISTS canonical_event_mapping (
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
    )`);
    const placeholders = eventIds.map(() => '?').join(',');
    const canon = db
      .query(
        `SELECT event_row_id, partner_id, partner_event_id
         FROM canonical_event_mapping
         WHERE event_row_id IN (${placeholders})`
      )
      .all(...eventIds) as Array<{
      event_row_id: number;
      partner_id: string; // brand-ok — opaque research/wire id
      partner_event_id: string; // brand-ok — opaque research/wire id
    }>;
    for (const row of canon) {
      const list = map.get(row.event_row_id) ?? [];
      list.push({ partner_id: row.partner_id, partner_event_id: row.partner_event_id });
      map.set(row.event_row_id, list);
    }
  } catch {
    /* ignore */
  }
  const missing = eventIds.filter(id => !map.has(id));
  if (missing.length) {
    try {
      const placeholders = missing.map(() => '?').join(',');
      const bem = db
        .query(
          `SELECT bem.event_id, COALESCE(b.name, b.host) AS partner_id, bem.bookmaker_event_id
           FROM bookmaker_event_mapping bem
           JOIN bookmakers b ON b.id = bem.bookmaker_id
           WHERE bem.event_id IN (${placeholders})`
        )
        .all(...missing) as Array<{
        event_id: number;
        partner_id: string; // brand-ok — opaque research/wire id
        bookmaker_event_id: string; // brand-ok — opaque research/wire id
      }>;
      for (const row of bem) {
        const list = map.get(row.event_id) ?? [];
        list.push({ partner_id: row.partner_id, partner_event_id: row.bookmaker_event_id });
        map.set(row.event_id, list);
      }
    } catch {
      /* ignore */
    }
  }
  return map;
}

function enrichEvent(
  base: ReturnType<typeof mapBase>,
  ticks: OddsTick[],
  partnerIds: EventPartnerId[] = [],
  nowMs = Date.now()
): EventRow {
  const markets: Record<string, EventMarketOdds> = {};
  const bookmakers: Record<string, EventBookmakerOdds> = {};
  const latestByBook = new Map<string, number>();

  for (const tick of ticks) {
    const mkt = marketBucket(tick.market_code);
    const side = selectionSide(tick.selection);
    const price =
      tick.odds_decimal != null && Number.isFinite(tick.odds_decimal)
        ? Number(tick.odds_decimal.toFixed(3))
        : undefined;
    if (price != null && side) {
      markets[mkt] = markets[mkt] ?? {};
      if (markets[mkt]![side] == null) markets[mkt]![side] = price;
    }

    const key = bookKey(tick.book_name, tick.book_host);
    if (!bookmakers[key]) {
      bookmakers[key] = { odds: {}, latency: 0 };
    }
    const book = bookmakers[key]!;
    book.odds[mkt] = book.odds[mkt] ?? {};
    if (price != null && side && book.odds[mkt]![side] == null) {
      book.odds[mkt]![side] = price;
    }
    const ts = tick.timestamp != null ? Number(tick.timestamp) : 0;
    // timestamps may be seconds or ms
    const tsMs = ts > 0 && ts < 1e12 ? ts * 1000 : ts;
    if (tsMs > 0) {
      const prev = latestByBook.get(key) ?? 0;
      if (tsMs > prev) latestByBook.set(key, tsMs);
    }
  }

  for (const [key, tsMs] of latestByBook) {
    const age = Math.max(0, nowMs - tsMs);
    if (bookmakers[key]) bookmakers[key]!.latency = Math.round(age);
  }

  const latencies = Object.values(bookmakers)
    .map(b => b.latency)
    .filter(n => Number.isFinite(n));
  const avg_latency = latencies.length
    ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
    : null;

  const limits = {
    min: base.meta.limits?.min ?? 10,
    max: base.meta.limits?.max ?? 500,
  };

  return {
    id: base.id,
    sport: base.sport,
    league: base.league,
    home_team: base.home_team,
    away_team: base.away_team,
    start_time: base.start_time,
    status: base.status,
    session: resolveSession(base),
    external_id: base.external_id,
    canonical_id: base.meta.canonicalId ?? null,
    partner_hosts: base.partner_hosts,
    partner_event_ids: partnerIds,
    country: base.country,
    geo: base.geo,
    state: base.state,
    markets,
    bookmakers,
    limits,
    avg_latency,
  };
}

function matchesGeoState(ev: EventRow, filter: EventListFilter): boolean {
  if (filter.geo) {
    const g = filter.geo.toLowerCase();
    const hit = (ev.geo || ev.country || '').toLowerCase() === g;
    if (!hit) return false;
  }
  if (filter.state) {
    if ((ev.state || '').toLowerCase() !== filter.state.toLowerCase()) return false;
  }
  return true;
}

export function listEvents(filter: EventListFilter = {}, db: Database = openOddsDb()): EventRow[] {
  ensureMatchingSchema(db);
  const clauses: string[] = [];
  const params: Array<string | number> = [];

  if (filter.sport) {
    clauses.push(`LOWER(COALESCE(e.sport, l.sport, '')) = LOWER(?)`);
    params.push(filter.sport);
  }
  if (filter.league) {
    clauses.push(`LOWER(COALESCE(e.league_name, l.name, '')) = LOWER(?)`);
    params.push(filter.league);
  }
  const session = (filter.session || '').toLowerCase();
  if (session === 'live') {
    clauses.push(`LOWER(COALESCE(e.status, '')) = 'live'`);
  } else if (session === 'pregame' || session === 'prematch') {
    clauses.push(
      `(LOWER(COALESCE(e.status, '')) IN ('scheduled', 'pregame', 'prematch')
        OR LOWER(COALESCE(json_extract(e.metadata, '$.session'), '')) = 'pregame')`
    );
  } else if (filter.status) {
    const st = filter.status.toLowerCase();
    if (st === 'pregame' || st === 'prematch') {
      clauses.push(`LOWER(COALESCE(e.status, '')) IN ('scheduled', 'pregame', 'prematch')`);
    } else {
      clauses.push(`LOWER(COALESCE(e.status, '')) = LOWER(?)`);
      params.push(filter.status);
    }
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  // Over-fetch when geo/state filters applied (metadata-derived)
  const limit = Math.min(Math.max(filter.limit ?? 100, 1), 500);
  const fetchLimit = filter.geo || filter.state ? Math.min(limit * 5, 500) : limit;
  params.push(fetchLimit);

  const rows = db
    .query(
      `${EVENT_SELECT}
       ${where}
       ORDER BY COALESCE(e.start_time, 0) DESC, e.id DESC
       LIMIT ?`
    )
    .all(...params) as BaseRow[];

  const bases = rows.map(mapBase);
  const ids = bases.map(b => b.id);
  const ticks = loadOddsTicks(ids, db);
  const partnerMap = loadPartnerEventIds(ids, db);
  const enriched = bases.map(b =>
    enrichEvent(b, ticks.get(b.id) ?? [], partnerMap.get(b.id) ?? [])
  );
  return enriched.filter(ev => matchesGeoState(ev, filter)).slice(0, limit);
}

export function getEvent(eventId: number, db: Database = openOddsDb()): EventRow | null {
  ensureMatchingSchema(db);
  if (!Number.isFinite(eventId) || eventId <= 0) return null;
  const row = db.query(`${EVENT_SELECT} WHERE e.id = ?`).get(eventId) as BaseRow | null;
  if (!row) return null;
  const base = mapBase(row);
  const ticks = loadOddsTicks([eventId], db);
  const partnerMap = loadPartnerEventIds([eventId], db);
  return enrichEvent(base, ticks.get(eventId) ?? [], partnerMap.get(eventId) ?? []);
}

export function listEventFilterOptions(db: Database = openOddsDb()): {
  sports: string[];
  leagues: string[];
  statuses: string[];
  geos: string[];
  states: string[];
} {
  ensureMatchingSchema(db);
  const sports = (
    db
      .query(
        `SELECT DISTINCT COALESCE(e.sport, l.sport) AS v
         FROM events e LEFT JOIN leagues l ON l.id = e.league_id
         WHERE COALESCE(e.sport, l.sport) IS NOT NULL
         ORDER BY v`
      )
      .all() as { v: string }[]
  ).map(r => r.v);
  const leagues = (
    db
      .query(
        `SELECT DISTINCT COALESCE(e.league_name, l.name) AS v
         FROM events e LEFT JOIN leagues l ON l.id = e.league_id
         WHERE COALESCE(e.league_name, l.name) IS NOT NULL
         ORDER BY v`
      )
      .all() as { v: string }[]
  ).map(r => r.v);
  const statuses = (
    db
      .query(
        `SELECT DISTINCT status AS v FROM events
         WHERE status IS NOT NULL AND status != ''
         ORDER BY v`
      )
      .all() as { v: string }[]
  ).map(r => r.v);
  const geos = (
    db
      .query(
        `SELECT DISTINCT country AS v FROM leagues
         WHERE country IS NOT NULL AND country != ''
         ORDER BY v`
      )
      .all() as { v: string }[]
  ).map(r => r.v);

  // States come from event metadata when present
  const statesSet = new Set<string>();
  const metaRows = db
    .query(`SELECT metadata FROM events WHERE metadata IS NOT NULL AND metadata != '' LIMIT 500`)
    .all() as { metadata: string }[];
  for (const row of metaRows) {
    const meta = parseMeta(row.metadata);
    if (meta.state) statesSet.add(meta.state);
  }

  return {
    sports,
    leagues,
    statuses,
    geos: geos.length ? geos : ['US', 'UK', 'EU', 'CA'],
    states: statesSet.size ? [...statesSet].sort() : ['NV', 'NJ', 'PA', 'CA', 'NY', 'FL'],
  };
}
