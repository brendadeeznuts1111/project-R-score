// @see https://bun.com/docs/runtime/semver — Bun.semver (unused; retained for token parity)
/**
 * Partner anchor-stability analysis ("stale anchor" detector).
 *
 * Grounded re-scope of the "Echo Snipe" proposal: instead of executing blind
 * bets against an unverified PPH/Fonbet mirror, this module turns the drift +
 * stability idea into an ANALYTICS/risk artifact over the real partner limit
 * history (`limit-tracker.getLimitsHistory` → `LimitHistoryRow[]`).
 *
 * Signal semantics:
 *   - drift:      net change of `maxStakeUsd` across the older window
 *   - stability:  variance of `maxStakeUsd` across the newer window
 *   - stale:      |drift| >= minDrift AND stability variance < maxVariance
 *
 * A "stale anchor" means a partner book has been sitting at a drifted,
 * unchanging limit — a candidate mispricing/staleness signal for
 * reconciliation (mirrors `BookBalanceMismatch` in book-reconcile.ts) and
 * liquidity (LiquidityUpdate in partners-liquidity.ts). It never places bets.
 *
 * @see https://bun.com/docs/runtime/utils#bun-nanoseconds — Bun.nanoseconds
 */

import { getLimitsHistory, openLimitsDb, type LimitHistoryRow } from '../research/limit-tracker.ts';

export type AnchorStabilityOpts = {
  /** Minimum absolute drift (USD) across the drift window to flag. */
  minDriftUsd?: number;
  /** Maximum variance (USD²) in the stability window to consider stable. */
  maxVarianceUsd?: number;
  /** Minimum observations required in each window (else signal is null). */
  minObservations?: number;
  /** How many history rows (newest-first) to consume. */
  historyLimit?: number;
};

export type StaleAnchorSignal = {
  kind: 'stale_anchor';
  partnerId: string; // brand-ok — opaque research/wire id (mirrors LimitHistoryRow)
  marketId: string; // brand-ok — opaque research/wire id
  league: string;
  marketType: string;
  sport: string;
  /** Net drift (USD) across the drift window — negative = limit lowered. */
  driftUsd: number;
  /** Variance (USD²) of the stability window. */
  varianceUsd: number;
  /** Latest max stake (USD) on record. */
  currentMaxStakeUsd: number;
  /** Sample count per window: [drift, stability]. */
  windows: [number, number];
  detail: string;
};

const DEFAULTS: Required<AnchorStabilityOpts> = {
  minDriftUsd: 100,
  maxVarianceUsd: 25,
  minObservations: 2,
  historyLimit: 100,
};

/** Split newest-first history into [driftWindow, stabilityWindow], oldest→newest each. */
export function splitWindows(
  history: LimitHistoryRow[],
  opts: AnchorStabilityOpts = {}
): { drift: LimitHistoryRow[]; stability: LimitHistoryRow[] } {
  const { historyLimit } = { ...DEFAULTS, ...opts };
  const rows = [...history].slice(0, historyLimit).reverse(); // oldest → newest
  const mid = Math.floor(rows.length / 2);
  return { drift: rows.slice(0, mid), stability: rows.slice(mid) };
}

/** Net drift (USD) = last - first across the window (oldest→newest). */
export function calculateNetDrift(rows: LimitHistoryRow[]): number {
  if (rows.length < 2) return 0;
  return rows[rows.length - 1].maxStakeUsd - rows[0].maxStakeUsd;
}

/** Population variance (USD²) of maxStakeUsd across the window. */
export function calculateVariance(rows: LimitHistoryRow[]): number {
  if (rows.length === 0) return 0;
  const mean = rows.reduce((sum, r) => sum + r.maxStakeUsd, 0) / rows.length;
  return rows.reduce((sum, r) => sum + (r.maxStakeUsd - mean) ** 2, 0) / rows.length;
}

/**
 * Check a single partner/market history for a stale-anchor signal.
 * Returns null when the market is not stale (or has too little data).
 */
export function checkAnchorStability(
  history: LimitHistoryRow[],
  opts: AnchorStabilityOpts = {}
): StaleAnchorSignal | null {
  const { minDriftUsd, maxVarianceUsd, minObservations } = {
    ...DEFAULTS,
    ...opts,
  };
  const { drift, stability } = splitWindows(history, opts);
  if (drift.length < minObservations || stability.length < minObservations) {
    return null;
  }

  const driftUsd = calculateNetDrift(drift);
  const varianceUsd = calculateVariance(stability);

  if (Math.abs(driftUsd) < minDriftUsd || varianceUsd >= maxVarianceUsd) {
    return null;
  }

  const latest = history[0]; // newest-first input
  return {
    kind: 'stale_anchor',
    partnerId: latest.partnerId,
    marketId: latest.marketId,
    league: latest.league,
    marketType: latest.marketType,
    sport: latest.sport,
    driftUsd,
    varianceUsd,
    currentMaxStakeUsd: latest.maxStakeUsd,
    windows: [drift.length, stability.length],
    detail:
      `${latest.partnerId} ${latest.league} ${latest.marketType}: ` +
      `drift $${driftUsd.toFixed(0)} stable at $${latest.maxStakeUsd.toFixed(0)} ` +
      `(variance $${varianceUsd.toFixed(2)})`,
  };
}

/**
 * Scan histories for many partner/market keys at once.
 * Input: partnerId → newest-first limit history (e.g. from getLimitsHistory).
 */
export function scanStaleAnchors(
  histories: Record<string, LimitHistoryRow[]>,
  opts: AnchorStabilityOpts = {}
): StaleAnchorSignal[] {
  const signals: StaleAnchorSignal[] = [];
  for (const rows of Object.values(histories)) {
    const perMarket = groupByMarket(rows);
    for (const marketRows of perMarket.values()) {
      const signal = checkAnchorStability(marketRows, opts);
      if (signal) signals.push(signal);
    }
  }
  return signals;
}

/** Group newest-first history rows by partnerId|marketId (drift is per-market). */
export function groupByMarket(history: LimitHistoryRow[]): Map<string, LimitHistoryRow[]> {
  const map = new Map<string, LimitHistoryRow[]>();
  for (const row of history) {
    const key = `${row.partnerId}|${row.marketId}`;
    const list = map.get(key);
    if (list) list.push(row);
    else map.set(key, [row]);
  }
  return map;
}

/** Distinct partner ids that have recorded limit history. */
export function listPartnersWithHistory(opts: { path?: string } = {}): string[] {
  const database = openLimitsDb(opts.path);
  const rows = database
    .query(`SELECT DISTINCT partner_id AS partnerId FROM account_limits ORDER BY partnerId`)
    .all() as Array<{ partnerId: string }>; // brand-ok — account_limits.partner_id
  return rows.map(r => r.partnerId);
}

/**
 * DB-backed scan: enumerate every partner with limit history, read each
 * partner's newest-first history, and run stale-anchor detection.
 * Safe with an empty database (returns ok with zero signals).
 */
export function scanStaleAnchorsFromDb(opts: AnchorStabilityOpts & { path?: string } = {}) {
  const { path, ...rest } = opts;
  const partners = listPartnersWithHistory({ path });
  const histories: Record<string, LimitHistoryRow[]> = {};
  for (const partnerId of partners) {
    histories[partnerId] = getLimitsHistory(partnerId, {
      limit: rest.historyLimit ?? 100,
      path,
    });
  }
  const signals = scanStaleAnchors(histories, rest);
  return {
    ok: true as const,
    scanned: partners.length,
    signals,
    generatedAt: new Date().toISOString(),
    opts: rest,
  };
}
