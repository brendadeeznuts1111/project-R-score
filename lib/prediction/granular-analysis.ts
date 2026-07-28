// @see https://bun.com/docs/runtime/sqlite
/**
 * Granular limit analysis — breakdown by sportsbook, sport, market, bet type
 * with regulatory correlation (state licenses, regulatory limits).
 */
import type { Database } from 'bun:sqlite';
import { AccountLimitsRepository } from '../account-limits-repo.ts';

// ── Types ────────────────────────────────────────────────────────────────

export type DimensionBreakdown = {
  key: string;
  label: string;
  totalChanges: number;
  raises: number;
  decreases: number;
  netDelta: number;
  avgMagnitudePct: number;
  mostRecent: number | null;
  trend7d: number; // average daily change
};

export type GranularAnalysis = {
  generated: string;
  hours: number;
  bySportsbook: DimensionBreakdown[];
  bySport: DimensionBreakdown[];
  byMarket: DimensionBreakdown[];
  byBetType: DimensionBreakdown[];
  regulatoryCorrelations: RegulatoryCorrelation[];
};

export type RegulatoryCorrelation = {
  stateCode: string;
  partner: string;
  sportsbook: string;
  sportId: string; // brand-ok — SportId wire
  marketId: string; // brand-ok — MarketId wire
  currentLimit: number;
  regulatoryMax: number | null;
  status: 'under_limit' | 'at_limit' | 'over_limit' | 'no_regulation';
  licensed: boolean;
};

// ── Analysis ─────────────────────────────────────────────────────────────

/** Aggregate limit changes broken down by dimension. */
export function analyzeByDimension(
  db: Database,
  hours = 48
): {
  bySportsbook: DimensionBreakdown[];
  bySport: DimensionBreakdown[];
  byMarket: DimensionBreakdown[];
  byBetType: DimensionBreakdown[];
} {
  const since = Math.floor(Date.now() / 1000) - hours * 3600;
  const repo = new AccountLimitsRepository(db);
  const partners = db
    .query(`SELECT DISTINCT node_id FROM partner_account_limits WHERE recorded_at > $since`)
    .all({ $since: since }) as Array<{ node_id: string }>; // brand-ok — TreeNodeId wire

  const bySportsbook = new Map<string, DimensionBreakdown>();
  const bySport = new Map<string, DimensionBreakdown>();
  const byMarket = new Map<string, DimensionBreakdown>();
  const byBetType = new Map<string, DimensionBreakdown>();

  for (const { node_id } of partners) {
    const raises = repo.detectRaises(node_id, since);
    const decreases = repo.detectDecreases(node_id, since);

    for (const r of [
      ...raises.map(r => ({ ...r, dir: 'up' as const })),
      ...decreases.map(r => ({ ...r, dir: 'down' as const })),
    ]) {
      const pct = r.previous_max > 0 ? ((r.new_limit - r.previous_max) / r.previous_max) * 100 : 0;

      const acc = (map: Map<string, DimensionBreakdown>, key: string, label: string) => {
        const existing = map.get(key) ?? {
          key,
          label,
          totalChanges: 0,
          raises: 0,
          decreases: 0,
          netDelta: 0,
          avgMagnitudePct: 0,
          mostRecent: 0,
          trend7d: 0,
        };
        existing.totalChanges++;
        if (r.dir === 'up') existing.raises++;
        else existing.decreases++;
        existing.netDelta += r.new_limit - r.previous_max;
        existing.mostRecent = Math.max(existing.mostRecent ?? 0, r.increased_at);
        map.set(key, existing);
      };

      acc(bySportsbook, r.sportsbook, r.sportsbook);
      acc(bySport, r.sport_id, r.sport_id);
      acc(byMarket, r.market_id, r.market_id);
      acc(byBetType, r.bet_type, r.bet_type);
    }
  }

  const finalize = (map: Map<string, DimensionBreakdown>): DimensionBreakdown[] =>
    [...map.entries()]
      .map(([key, d]) => ({
        ...d,
        avgMagnitudePct:
          d.raises > 0 ? Number((d.netDelta / d.raises / (d.netDelta > 0 ? 1 : -1)).toFixed(1)) : 0,
        trend7d: d.mostRecent > 0 ? Number((d.netDelta / (hours / 24)).toFixed(0)) : 0,
      }))
      .sort((a, b) => b.totalChanges - a.totalChanges);

  return {
    bySportsbook: finalize(bySportsbook),
    bySport: finalize(bySport),
    byMarket: finalize(byMarket),
    byBetType: finalize(byBetType),
  };
}

/** Cross-reference current limits with regulatory limits and licensing. */
export function correlateWithRegulations(db: Database, hours = 48): RegulatoryCorrelation[] {
  const since = Math.floor(Date.now() / 1000) - hours * 3600;
  const results: RegulatoryCorrelation[] = [];

  // Get current limits per partner+book+sport+market
  const currentLimits = db
    .query(
      `
    SELECT a.node_id, a.sportsbook, a.sport_id, a.market_id, a.max_wager, a.recorded_at
    FROM partner_account_limits a
    WHERE a.recorded_at > $since
      AND a.id IN (
        SELECT MAX(id) FROM partner_account_limits
        WHERE node_id = a.node_id AND sportsbook = a.sportsbook
          AND sport_id = a.sport_id AND market_id = a.market_id
      )
    GROUP BY a.node_id, a.sportsbook, a.sport_id, a.market_id
  `,
      { $since: since }
    )
    .all() as Array<{
    node_id: string; // brand-ok — TreeNodeId wire
    sportsbook: string;
    sport_id: string; // brand-ok — SportId wire
    market_id: string; // brand-ok — MarketId wire
    max_wager: number;
    recorded_at: number;
  }>;

  // Get partner state licenses
  const licenses = db
    .query(
      `
    SELECT node_id, state_code, status FROM partner_state_licenses WHERE status = 'active'
  `
    )
    .all() as Array<{ node_id: string; state_code: string; status: string }>; // brand-ok — TreeNodeId wire
  const licenseMap = new Map<string, string[]>();
  for (const l of licenses) {
    const arr = licenseMap.get(l.node_id) ?? [];
    arr.push(l.state_code);
    licenseMap.set(l.node_id, arr);
  }

  // Get regulatory limits
  const regLimits = db
    .query(
      `
    SELECT state_code, sport_id, market_id, max_wager FROM regulatory_limits
    WHERE effective_to IS NULL OR effective_to > unixepoch()
  `
    )
    .all() as Array<{ state_code: string; sport_id: string; market_id: string; max_wager: number }>; // brand-ok ×3 — opaque DB wire
  const regKey = (
    r: { state_code: string; sport_id: string; market_id: string } // brand-ok ×3 — opaque DB wire
  ) => `${r.state_code}:${r.sport_id}:${r.market_id}`;
  const regMap = new Map<string, number>();
  for (const r of regLimits) {
    regMap.set(regKey(r), r.max_wager);
  }

  for (const cl of currentLimits) {
    const partnerLicenses = licenseMap.get(cl.node_id) ?? [];
    for (const stateCode of partnerLicenses) {
      const regMax = regMap.get(
        regKey({ state_code: stateCode, sport_id: cl.sport_id, market_id: cl.market_id })
      );
      const status = !regMax
        ? 'no_regulation'
        : cl.max_wager > regMax
          ? 'over_limit'
          : cl.max_wager === regMax
            ? 'at_limit'
            : 'under_limit';
      results.push({
        stateCode,
        partner: cl.node_id,
        sportsbook: cl.sportsbook,
        sportId: cl.sport_id,
        marketId: cl.market_id,
        currentLimit: cl.max_wager,
        regulatoryMax: regMax ?? null,
        status,
        licensed: partnerLicenses.length > 0,
      });
    }
  }

  return results.sort((a, b) => {
    const order = { over_limit: 0, at_limit: 1, under_limit: 2, no_regulation: 3 };
    return (order[a.status] ?? 4) - (order[b.status] ?? 4);
  });
}

/** Full granular analysis with regulatory correlation. */
export function runGranularAnalysis(db: Database, hours = 48): GranularAnalysis {
  const dims = analyzeByDimension(db, hours);
  const correlations = correlateWithRegulations(db, hours);
  return {
    generated: new Date().toISOString(),
    hours,
    ...dims,
    regulatoryCorrelations: correlations,
  };
}

// ── Formatters ───────────────────────────────────────────────────────────

export function formatDimensionTable(title: string, data: DimensionBreakdown[], limit = 8): string {
  if (data.length === 0) return `  ${title}: No data`;
  const rows = data
    .slice(0, limit)
    .map(d => [
      d.label,
      String(d.totalChanges),
      String(d.raises),
      d.decreases > 0 ? String(d.decreases) : '—',
      `${d.netDelta >= 0 ? '+' : ''}${d.netDelta}`,
      d.avgMagnitudePct ? `${d.avgMagnitudePct}%` : '—',
      d.trend7d ? `${d.trend7d >= 0 ? '+' : ''}${d.trend7d}/d` : '—',
    ]);
  const headers = ['Name', 'Total', '🚀', '⬇', 'Net', 'Avg%', 'Trend'];
  const pad = (s: string, w: number) => s + ' '.repeat(Math.max(0, w - s.length));
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map(r => String(r[i] ?? '').length))
  );
  const border = (l: string, j: string, r: string) =>
    l + widths.map(w => '─'.repeat(w + 2)).join(j) + r;
  const line = (cells: string[]) =>
    '│ ' + cells.map((c, i) => pad(c, widths[i]!)).join(' │ ') + ' │';
  return [
    `  ${title}`,
    border('┌', '┬', '┐'),
    line(headers),
    border('├', '┼', '┤'),
    ...rows.map(r => line(r.map(String))),
    border('└', '┴', '┘'),
  ].join('\n');
}

export function formatRegulatoryTable(correlations: RegulatoryCorrelation[], limit = 10): string {
  if (correlations.length === 0) return '  No regulatory correlations found.';
  const show = correlations.slice(0, limit);
  const rows = show.map(c => [
    c.partner.slice(0, 12),
    c.sportsbook,
    c.sportId,
    c.marketId,
    `$${c.currentLimit}`,
    c.regulatoryMax != null ? `$${c.regulatoryMax}` : '—',
    c.status === 'over_limit'
      ? '⚠️ OVER'
      : c.status === 'at_limit'
        ? '⚡ AT'
        : c.status === 'under_limit'
          ? '✅ OK'
          : '—',
  ]);
  const headers = ['Partner', 'Book', 'Sport', 'Market', 'Limit', 'RegMax', 'Status'];
  const pad = (s: string, w: number) => s + ' '.repeat(Math.max(0, w - s.length));
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map(r => String(r[i] ?? '').length))
  );
  const border = (l: string, j: string, r: string) =>
    l + widths.map(w => '─'.repeat(w + 2)).join(j) + r;
  const line = (cells: string[]) =>
    '│ ' + cells.map((c, i) => pad(c, widths[i]!)).join(' │ ') + ' │';
  return [
    border('┌', '┬', '┐'),
    line(headers),
    border('├', '┼', '┤'),
    ...rows.map(r => line(r)),
    border('└', '┴', '┘'),
    `  ${correlations.length} total · ${correlations.filter(c => c.status === 'over_limit').length} over limit · ${correlations.filter(c => c.status === 'at_limit').length} at limit`,
  ].join('\n');
}
