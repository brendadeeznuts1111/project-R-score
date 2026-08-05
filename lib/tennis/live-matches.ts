/**
 * Live tennis match rows for portal desk bake.
 * Pure builders + optional event-store SQLite read.
 *
 * @see lib/tennis/board-metrics.ts
 * @see scripts/bake-tennis-board.ts
 * @see public/portal/tennis/
 */
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
import { Database } from 'bun:sqlite';
import { joinPath } from '../path-bun.ts';
import { humanizeSeries, midFromStoredBook } from './board-metrics.ts';
import { normalizePlayerSlug as normalizeFromAvatarIndex } from './avatar-index.ts';

/** Prefer avatar-index SSOT for slug mapping. */
export function normalizePlayerSlug(label: string): string {
  return normalizeFromAvatarIndex(label);
}

export type LiveMatchSide = {
  label: string;
  slug: string;
  midCents: number | null;
  ticker?: string;
};

/** Per-row book completeness for desk indicators. */
export type MidDataStatus = 'ok' | 'partial' | 'missing';

export type LiveMatchRow = {
  eventId: string; // brand-ok — opaque event-store primary key on wire DTO
  eventTicker?: string;
  series: string;
  seriesLabel: string;
  venue: string; // kalshi etc for venue badge
  status: string;
  sideA: LiveMatchSide;
  sideB: LiveMatchSide;
  edgeCents: number | null; // midA - midB or null
  /** Both / one / no side mids — board yellow-dot when not ok. */
  midStatus: MidDataStatus;
};

/** Aggregate data-quality for live desk (bake + portal health strip). */
export type LiveMatchesQuality = {
  scannedEvents: number;
  withBothMids: number;
  withOneMid: number;
  withNoMids: number;
  listedWithBothMids: number;
  listedMissingMids: number;
  /** Fraction of scanned events that have both side mids (0–100). */
  coveragePct: number;
  /** Latest book_ticks.ts when present (ms epoch). */
  latestBookTs?: number;
  /** ISO of latestBookTs when known. */
  latestBookAt?: string;
};

export type LiveMatchesDoc = {
  schemaVersion: 1;
  kind: 'tennis-live-matches';
  generatedAt: string;
  source: 'event-store' | 'sample';
  limit: number;
  matches: LiveMatchRow[];
  quality?: LiveMatchesQuality;
  note?: string;
};

export function midStatusFromSides(a: number | null, b: number | null): MidDataStatus {
  const n = (a != null ? 1 : 0) + (b != null ? 1 : 0);
  if (n === 2) return 'ok';
  if (n === 1) return 'partial';
  return 'missing';
}

function outcomeRank(outcome: string): number {
  const o = (outcome || '').toLowerCase();
  // Prefer live / upcoming desk rows over completed history.
  if (o === 'in_progress' || o === 'live') return 3;
  if (o === 'scheduled' || o === 'open') return 2;
  if (o === 'completed' || o === 'settled' || o === 'final') return 0;
  return 1;
}

const ROOT = joinPath(import.meta.dir, '../..');

/** Default Kalshi-bot event-store path (when present). */
export const DEFAULT_LIVE_MATCHES_DB = joinPath(ROOT, 'Kalshi-bot/research/cache/event-store.db');

const DEFAULT_LIMIT = 12;

const SAMPLE_VENUES = ['kalshi', 'polymarket', 'pinnacle', 'betfair'] as const;

/** Market ticker → event ticker (strip last `-SIDE` segment). */
export function eventTickerFromMarketTicker(ticker: string): string {
  const i = ticker.lastIndexOf('-');
  return i > 0 ? ticker.slice(0, i) : ticker;
}

function edgeFromMids(a: number | null, b: number | null): number | null {
  if (a == null || b == null) return null;
  return a - b;
}

function makeSide(label: string, midCents: number | null, ticker?: string): LiveMatchSide {
  const side: LiveMatchSide = {
    label: label || 'TBD',
    slug: normalizePlayerSlug(label || 'TBD'),
    midCents,
  };
  if (ticker) side.ticker = ticker;
  return side;
}

/** Demo rows for portal when event-store is absent. */
export function sampleLiveMatches(now = new Date(), limit = DEFAULT_LIMIT): LiveMatchesDoc {
  const pairs: Array<{
    a: string;
    b: string;
    midA: number;
    midB: number;
    series: string;
    status: string;
  }> = [
    {
      a: 'Jannik Sinner',
      b: 'Carlos Alcaraz',
      midA: 54,
      midB: 48,
      series: 'KXATPMATCH',
      status: 'scheduled',
    },
    {
      a: 'Coco Gauff',
      b: 'Iga Swiatek',
      midA: 42,
      midB: 58,
      series: 'KXWTAMATCH',
      status: 'scheduled',
    },
    {
      a: 'Daniil Medvedev',
      b: 'Alexander Zverev',
      midA: 49,
      midB: 51,
      series: 'KXATPMATCH',
      status: 'in_progress',
    },
    {
      a: 'Aryna Sabalenka',
      b: 'Elena Rybakina',
      midA: 55,
      midB: 46,
      series: 'KXWTAMATCH',
      status: 'scheduled',
    },
    {
      a: 'Novak Djokovic',
      b: 'Taylor Fritz',
      midA: 62,
      midB: 39,
      series: 'KXATPMATCH',
      status: 'scheduled',
    },
    {
      a: 'Jessica Pegula',
      b: 'Madison Keys',
      midA: 51,
      midB: 49,
      series: 'KXWTAMATCH',
      status: 'scheduled',
    },
  ];

  const matches: LiveMatchRow[] = pairs.slice(0, Math.max(0, limit)).map((p, i) => {
    const venue = SAMPLE_VENUES[i % SAMPLE_VENUES.length]!;
    const sideA = makeSide(p.a, p.midA);
    const sideB = makeSide(p.b, p.midB);
    return {
      eventId: `sample-${sideA.slug}-vs-${sideB.slug}`,
      eventTicker: `${p.series}-SAMPLE${String(i + 1).padStart(2, '0')}`,
      series: p.series,
      seriesLabel: humanizeSeries(p.series),
      venue,
      status: p.status,
      sideA,
      sideB,
      edgeCents: edgeFromMids(sideA.midCents, sideB.midCents),
      midStatus: midStatusFromSides(sideA.midCents, sideB.midCents),
    };
  });

  const withBoth = matches.filter(m => m.midStatus === 'ok').length;
  return {
    schemaVersion: 1,
    kind: 'tennis-live-matches',
    generatedAt: now.toISOString(),
    source: 'sample',
    limit,
    matches,
    quality: {
      scannedEvents: matches.length,
      withBothMids: withBoth,
      withOneMid: matches.filter(m => m.midStatus === 'partial').length,
      withNoMids: matches.filter(m => m.midStatus === 'missing').length,
      listedWithBothMids: withBoth,
      listedMissingMids: matches.filter(m => m.midStatus !== 'ok').length,
      coveragePct: matches.length > 0 ? Math.round((withBoth / matches.length) * 100) : 0,
    },
    note: 'Sample live matches — run bake with event-store present',
  };
}

type TickRow = { ticker: string; levels_json: string };
type MarketSideRow = {
  event_id: string; // brand-ok — opaque event-store SQLite PK on wire row
  ticker: string;
  series: string;
  venue: string;
  yes_side_label: string;
  side_code: string;
  player_a: string;
  player_b: string;
  outcome: string;
  start_ts: string;
};

function loadLatestMids(db: Database): { mids: Map<string, number>; latestBookTs?: number } {
  const mids = new Map<string, number>();
  const hasTicks = db
    .query(`SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name='book_ticks'`)
    .get() as { ok: number } | null;
  if (!hasTicks) return { mids };

  const tickRows = db
    .query(
      `SELECT bt.ticker, bt.levels_json, bt.ts
       FROM book_ticks bt
       WHERE bt.id IN (
         SELECT MAX(id) FROM book_ticks WHERE ticker IS NOT NULL GROUP BY ticker
       )`
    )
    .all() as Array<TickRow & { ts?: number | null }>;

  let latestBookTs: number | undefined;
  for (const row of tickRows) {
    if (!row.ticker) continue;
    if (typeof row.ts === 'number' && Number.isFinite(row.ts)) {
      if (latestBookTs == null || row.ts > latestBookTs) latestBookTs = row.ts;
    }
    try {
      const book = JSON.parse(row.levels_json) as {
        bids?: Array<{ priceCents?: number }>;
        asks?: Array<{ priceCents?: number }>;
        crossed?: boolean;
      };
      const mid = midFromStoredBook(book);
      if (mid != null) mids.set(row.ticker, mid);
    } catch {
      /* skip bad tick */
    }
  }
  return { mids, latestBookTs };
}

/**
 * Pair sides from markets (venue kalshi) under each event; attach latest book mids.
 * Returns null when db missing / unreadable / no markets table.
 */
export function collectLiveMatchesFromEventStore(
  dbPath: string = DEFAULT_LIVE_MATCHES_DB,
  opts?: { limit?: number }
): LiveMatchesDoc | null {
  const limit = opts?.limit ?? DEFAULT_LIMIT;
  const file = Bun.file(dbPath);
  // empty / missing → null (Bun.file size 0 for missing on some platforms; exists check too)
  if (!file.size) return null;

  let db: Database;
  try {
    db = new Database(dbPath, { readonly: true });
  } catch {
    return null;
  }

  try {
    const hasMarkets = db
      .query(`SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name='markets'`)
      .get() as { ok: number } | null;
    const hasEvents = db
      .query(`SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name='events'`)
      .get() as { ok: number } | null;
    if (!hasMarkets || !hasEvents) return null;

    const { mids: midsByTicker, latestBookTs } = loadLatestMids(db);

    // Kalshi match markets; ranking applied after pairing (prefer usable mids).
    const marketRows = db
      .query(
        `SELECT e.event_id AS event_id,
                e.player_a AS player_a,
                e.player_b AS player_b,
                e.outcome AS outcome,
                e.start_ts AS start_ts,
                m.ticker AS ticker,
                m.series AS series,
                m.venue AS venue,
                m.yes_side_label AS yes_side_label,
                m.side_code AS side_code
         FROM events e
         INNER JOIN markets m ON m.event_id = e.event_id
         WHERE lower(m.venue) = 'kalshi'
           AND (
             m.market_kind = 'match_winner'
             OR m.market_kind = ''
             OR m.market_kind IS NULL
           )
         ORDER BY e.start_ts DESC, e.event_id, m.ticker`
      )
      .all() as MarketSideRow[];

    if (marketRows.length === 0) {
      return {
        schemaVersion: 1,
        kind: 'tennis-live-matches',
        generatedAt: new Date().toISOString(),
        source: 'event-store',
        limit,
        matches: [],
        quality: {
          scannedEvents: 0,
          withBothMids: 0,
          withOneMid: 0,
          withNoMids: 0,
          listedWithBothMids: 0,
          listedMissingMids: 0,
          coveragePct: 0,
          ...(latestBookTs != null
            ? {
                latestBookTs,
                latestBookAt: new Date(latestBookTs).toISOString(),
              }
            : {}),
        },
        note: 'Event-store present but no kalshi match markets',
      };
    }

    type Acc = {
      eventId: string; // brand-ok — opaque event-store key while grouping rows
      playerA: string;
      playerB: string;
      outcome: string;
      startTs: string;
      series: string;
      venue: string;
      sides: Array<{ label: string; ticker: string; mid: number | null }>;
    };

    const byEvent = new Map<string, Acc>();
    for (const row of marketRows) {
      let acc = byEvent.get(row.event_id);
      if (!acc) {
        acc = {
          eventId: row.event_id,
          playerA: row.player_a ?? '',
          playerB: row.player_b ?? '',
          outcome: row.outcome || 'unknown',
          startTs: row.start_ts ?? '',
          series: row.series || '',
          venue: String(row.venue || 'kalshi').toLowerCase(),
          sides: [],
        };
        byEvent.set(row.event_id, acc);
      }
      if (!acc.series && row.series) acc.series = row.series;
      const label = (row.yes_side_label || '').trim() || (row.side_code || '').trim() || row.ticker;
      acc.sides.push({
        label,
        ticker: row.ticker,
        mid: midsByTicker.get(row.ticker) ?? null,
      });
    }

    type Ranked = LiveMatchRow & { _midScore: number; _outcomeRank: number; _startTs: string };

    const ranked: Ranked[] = [];
    for (const acc of byEvent.values()) {
      // Prefer sides matching player_a / player_b labels; else first two markets.
      const norm = (s: string) => s.trim().toLowerCase();
      let sideARow = acc.sides.find(s => norm(s.label) === norm(acc.playerA));
      let sideBRow = acc.sides.find(s => norm(s.label) === norm(acc.playerB));

      if (!sideARow || !sideBRow) {
        const unique = dedupeSidesByLabel(acc.sides);
        if (unique.length < 1) continue;
        sideARow = sideARow ?? unique[0]!;
        sideBRow = sideBRow ??
          unique.find(s => s.ticker !== sideARow!.ticker) ??
          unique[1] ?? {
            label: acc.playerB || 'B',
            ticker: '',
            mid: null,
          };
      }

      const labelA = acc.playerA || sideARow.label || 'A';
      const labelB = acc.playerB || sideBRow.label || 'B';
      const sideA = makeSide(labelA, sideARow.mid, sideARow.ticker || undefined);
      const sideB = makeSide(labelB, sideBRow.mid, sideBRow.ticker || undefined);
      const sampleTicker = sideARow.ticker || sideBRow.ticker || '';
      const eventTicker = sampleTicker ? eventTickerFromMarketTicker(sampleTicker) : undefined;
      const series = acc.series || (eventTicker ? seriesFromEventTicker(eventTicker) : '');
      const midStatus = midStatusFromSides(sideA.midCents, sideB.midCents);
      const midScore = (sideA.midCents != null ? 1 : 0) + (sideB.midCents != null ? 1 : 0);

      ranked.push({
        eventId: acc.eventId,
        ...(eventTicker ? { eventTicker } : {}),
        series,
        seriesLabel: humanizeSeries(series || 'UNKNOWN'),
        venue: acc.venue || 'kalshi',
        status: acc.outcome || 'unknown',
        sideA,
        sideB,
        edgeCents: edgeFromMids(sideA.midCents, sideB.midCents),
        midStatus,
        _midScore: midScore,
        _outcomeRank: outcomeRank(acc.outcome),
        _startTs: acc.startTs || '',
      });
    }

    // Prefer usable mids, then live/scheduled, then recency.
    ranked.sort((a, b) => {
      if (b._midScore !== a._midScore) return b._midScore - a._midScore;
      if (b._outcomeRank !== a._outcomeRank) return b._outcomeRank - a._outcomeRank;
      return b._startTs.localeCompare(a._startTs);
    });

    const withBothMids = ranked.filter(r => r._midScore === 2).length;
    const withOneMid = ranked.filter(r => r._midScore === 1).length;
    const withNoMids = ranked.filter(r => r._midScore === 0).length;
    const coveragePct = ranked.length > 0 ? Math.round((withBothMids / ranked.length) * 100) : 0;

    const matches: LiveMatchRow[] = ranked
      .slice(0, limit)
      .map(({ _midScore: _ms, _outcomeRank: _or, _startTs: _st, ...row }) => row);
    const listedWithBothMids = matches.filter(m => m.midStatus === 'ok').length;
    const listedMissingMids = matches.filter(m => m.midStatus !== 'ok').length;

    const quality: LiveMatchesQuality = {
      scannedEvents: ranked.length,
      withBothMids,
      withOneMid,
      withNoMids,
      listedWithBothMids,
      listedMissingMids,
      coveragePct,
      ...(latestBookTs != null
        ? {
            latestBookTs,
            latestBookAt: new Date(latestBookTs).toISOString(),
          }
        : {}),
    };

    const noteParts = [
      `Live from event-store · ${matches.length} listed`,
      `${listedWithBothMids}/${matches.length} with mids`,
      `${midsByTicker.size} ticker mids`,
      `${withBothMids} events full-book / ${ranked.length} scanned`,
    ];
    if (listedMissingMids > 0 && listedWithBothMids === 0) {
      noteParts.push('no listed row has books — book ingestion lag');
    }

    return {
      schemaVersion: 1,
      kind: 'tennis-live-matches',
      generatedAt: new Date().toISOString(),
      source: 'event-store',
      limit,
      matches,
      quality,
      note: noteParts.join(' · '),
    };
  } finally {
    db.close();
  }
}

function dedupeSidesByLabel(
  sides: Array<{ label: string; ticker: string; mid: number | null }>
): Array<{ label: string; ticker: string; mid: number | null }> {
  const seen = new Set<string>();
  const out: Array<{ label: string; ticker: string; mid: number | null }> = [];
  for (const s of sides) {
    const k = s.label.trim().toLowerCase() || s.ticker;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

function seriesFromEventTicker(eventTicker: string): string {
  // KXATPMATCH-25JUL30… → KXATPMATCH
  const m = eventTicker.match(/^(KX[A-Z]+)/i);
  return m?.[1]?.toUpperCase() ?? eventTicker.split('-')[0] ?? eventTicker;
}

/** Prefer event-store; fall back to sample. */
export function loadLiveMatchesDoc(
  dbPath: string = DEFAULT_LIVE_MATCHES_DB,
  opts?: { limit?: number; sample?: boolean }
): LiveMatchesDoc {
  if (opts?.sample) return sampleLiveMatches(new Date(), opts.limit ?? DEFAULT_LIMIT);
  return (
    collectLiveMatchesFromEventStore(dbPath, { limit: opts?.limit }) ??
    sampleLiveMatches(new Date(), opts?.limit ?? DEFAULT_LIMIT)
  );
}
