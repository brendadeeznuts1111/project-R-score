/**
 * Pure odds math for live edge detection (decimal odds).
 * Shared by pattern-detector and edge-scan — no I/O.
 */

/** Implied probability from decimal odds. */
export function impliedProb(decimalOdds: number): number {
  if (!(decimalOdds > 1)) return 0;
  return 1 / decimalOdds;
}

/** Overround (vig) for a market: sum(1/price) − 1. 0 = fair. */
export function overround(prices: number[]): number {
  const sum = prices.reduce((acc, p) => (p > 1 ? acc + 1 / p : acc), 0);
  return Math.max(0, sum - 1);
}

/**
 * De-vig a two-way market into fair probabilities that sum to 1.
 * Uses proportional method: p_i / sum(p).
 */
export function deVigTwoWay(oddsA: number, oddsB: number): { pA: number; pB: number } | null {
  const a = impliedProb(oddsA);
  const b = impliedProb(oddsB);
  const s = a + b;
  if (!(s > 0)) return null;
  return { pA: a / s, pB: b / s };
}

/** Multi-way de-vig (proportional). */
export function deVigProportional(prices: number[]): number[] | null {
  if (prices.length === 0) return null;
  const imps = prices.map(impliedProb);
  const s = imps.reduce((a, b) => a + b, 0);
  if (!(s > 0)) return null;
  return imps.map(p => p / s);
}

/**
 * Two-way arbitrage profit fraction when both sides are taken at given odds.
 * Returns 0 if no arb.
 */
export function twoWayArbProfit(oddsA: number, oddsB: number): number {
  if (!(oddsA > 1) || !(oddsB > 1)) return 0;
  const sum = 1 / oddsA + 1 / oddsB;
  if (sum >= 1) return 0;
  return 1 / sum - 1;
}

/**
 * N-way arb edge: 1 − sum(1/bestPrice_i). Positive when a risk-free split exists.
 */
export function multiWayArbEdge(bestPrices: number[]): number {
  if (bestPrices.length < 2) return 0;
  let inv = 0;
  for (const p of bestPrices) {
    if (!(p > 1)) return 0;
    inv += 1 / p;
  }
  if (inv >= 1) return 0;
  return 1 - inv;
}

/** Stake weights for risk-free arb (proportional to inverse odds). Sum to 1. */
export function arbStakeWeights(bestPrices: number[]): number[] {
  const invs = bestPrices.map(p => 1 / p);
  const s = invs.reduce((a, b) => a + b, 0);
  if (!(s > 0)) return bestPrices.map(() => 0);
  return invs.map(i => i / s);
}

/** EV as percent of stake: (p * odds − 1) * 100 */
export function expectedValuePct(trueProb: number, decimalOdds: number): number {
  if (!(decimalOdds > 1) || trueProb <= 0) return 0;
  return (trueProb * decimalOdds - 1) * 100;
}

/** Full Kelly fraction for decimal odds. Clamped [0, 0.25]. */
export function kellyFraction(trueProb: number, decimalOdds: number): number {
  if (!(decimalOdds > 1) || trueProb <= 0 || trueProb >= 1) return 0;
  const b = decimalOdds - 1;
  const q = 1 - trueProb;
  const f = (b * trueProb - q) / b;
  if (!Number.isFinite(f) || f <= 0) return 0;
  return Math.min(0.25, f);
}

/**
 * Steam velocity: relative price change per minute over a time window.
 * Positive = price rising (underdog lengthening / favorite shortening depends on side).
 */
export function steamVelocity(
  priceFrom: number,
  priceTo: number,
  timestampFrom: number,
  timestampTo: number
): number {
  if (!(priceFrom > 0) || timestampTo <= timestampFrom) return 0;
  const rel = (priceTo - priceFrom) / priceFrom;
  const minutes = (timestampTo - timestampFrom) / 60_000;
  if (!(minutes > 0)) return rel; // same-ms snapshots: treat as unit pulse
  return rel / minutes;
}

/** American from decimal (approx). */
export function decimalToAmerican(decimal: number): number | null {
  if (!(decimal > 1)) return null;
  if (decimal >= 2) return Math.round((decimal - 1) * 100);
  return Math.round(-100 / (decimal - 1));
}
