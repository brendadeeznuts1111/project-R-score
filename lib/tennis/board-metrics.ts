/**
 * Tennis board metrics — mid buckets + series volume for portal / CLI.
 * Pure helpers; bake script loads event-store SQLite when present.
 *
 * @see scripts/bake-tennis-board.ts
 * @see public/portal/tennis/
 */

export type MidBucket = {
  range: string;
  count: number;
  pct: number;
};

export type SeriesVolumeRow = {
  series: string;
  label: string;
  markets: number;
  volume24h: number;
  display: string;
};

export type VenueCountRow = {
  venue: string;
  count: number;
};

export type TennisBoardMetrics = {
  schemaVersion: 1;
  kind: 'tennis-board-metrics';
  generatedAt: string;
  source: 'event-store' | 'sample' | 'partial';
  eventStorePath?: string;
  bookTicksLatest: number;
  midsUsable: number;
  markets: number;
  buckets: MidBucket[];
  seriesVolume: SeriesVolumeRow[];
  venues: VenueCountRow[];
  note?: string;
};

const MID_RANGES: Array<{ range: string; lo: number; hi: number }> = [
  { range: '1–20¢', lo: 1, hi: 20 },
  { range: '21–40¢', lo: 21, hi: 40 },
  { range: '41–60¢', lo: 41, hi: 60 },
  { range: '61–80¢', lo: 61, hi: 80 },
  { range: '81–99¢', lo: 81, hi: 99 },
];

/** Human label for Kalshi series tickers. */
export function humanizeSeries(series: string): string {
  const s = series.trim().toUpperCase();
  const map: Record<string, string> = {
    KXATPMATCH: 'ATP',
    KXWTAMATCH: 'WTA',
    KXITFMATCH: 'ITF M',
    KXITFWMATCH: 'ITF W',
    KXITFDOUBLES: 'ITF M DBL',
    KXITFWDOUBLES: 'ITF W DBL',
    KXATPCHALLENGER: 'ATP CH',
  };
  if (map[s]) return map[s];
  return (
    series
      .replace(/^KX/i, '')
      .replace(/MATCH$/i, '')
      .replace(/DOUBLES$/i, ' DBL')
      .slice(0, 12) || series
  );
}

export function formatVolume(v: number): string {
  if (!Number.isFinite(v) || v <= 0) return '0';
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return String(Math.round(v));
}

/** Mid from stored BookSnapshot JSON (bids/asks priceCents). */
export function midFromStoredBook(book: {
  bids?: Array<{ priceCents?: number }>;
  asks?: Array<{ priceCents?: number }>;
  crossed?: boolean;
}): number | null {
  if (book.crossed) return null;
  const bid = book.bids?.[0]?.priceCents;
  const ask = book.asks?.[0]?.priceCents;
  if (bid == null || ask == null) return null;
  if (!Number.isFinite(bid) || !Number.isFinite(ask)) return null;
  if (bid > ask) return null;
  return Math.round((bid + ask) / 2);
}

export function bucketMidCents(mids: readonly number[]): MidBucket[] {
  const counts = MID_RANGES.map(() => 0);
  let n = 0;
  for (const m of mids) {
    if (!Number.isFinite(m)) continue;
    const c = Math.round(m);
    if (c < 1 || c > 99) continue;
    n++;
    const i = MID_RANGES.findIndex(r => c >= r.lo && c <= r.hi);
    if (i >= 0) counts[i]!++;
  }
  return MID_RANGES.map((r, i) => ({
    range: r.range,
    count: counts[i]!,
    pct: n > 0 ? Math.round((counts[i]! / n) * 100) : 0,
  }));
}

export function sampleBoardMetrics(now = new Date()): TennisBoardMetrics {
  const mids = [
    ...Array(124).fill(12),
    ...Array(89).fill(30),
    ...Array(67).fill(50),
    ...Array(45).fill(70),
    ...Array(28).fill(90),
  ] as number[];
  return {
    schemaVersion: 1,
    kind: 'tennis-board-metrics',
    generatedAt: now.toISOString(),
    source: 'sample',
    bookTicksLatest: 0,
    midsUsable: mids.length,
    markets: 0,
    buckets: bucketMidCents(mids),
    seriesVolume: [
      { series: 'KXATPMATCH', label: 'ATP', markets: 0, volume24h: 3.2e6, display: '3.2M' },
      { series: 'KXWTAMATCH', label: 'WTA', markets: 0, volume24h: 1.8e6, display: '1.8M' },
      { series: 'KXITFWMATCH', label: 'ITF W', markets: 0, volume24h: 9.5e5, display: '950K' },
      { series: 'KXITFMATCH', label: 'ITF M', markets: 0, volume24h: 4.2e5, display: '420K' },
    ],
    venues: [
      { venue: 'kalshi', count: 0 },
      { venue: 'polymarket', count: 0 },
      { venue: 'pinnacle', count: 0 },
      { venue: 'betfair', count: 0 },
    ],
    note: 'Sample metrics — run bun run tennis:board:bake with event-store present',
  };
}

/** Mid-distribution slice for legacy /registry/tennis/mid-distribution.json */
export function toMidDistributionDoc(m: TennisBoardMetrics) {
  return {
    schemaVersion: 1,
    kind: 'tennis-mid-distribution',
    generatedAt: m.generatedAt,
    source: m.source,
    n: m.midsUsable,
    note: m.note,
    buckets: m.buckets,
    eventStorePath: m.eventStorePath,
  };
}
