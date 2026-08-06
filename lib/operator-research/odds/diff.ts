// @see https://bun.com/docs/runtime/utils#bun-deepequals — Bun.deepEquals
import type { DiffResult, OddsLimits, OddsSnapshot, PriceChange } from './types.ts';

function relChange(from: number, to: number): number {
  if (from === 0) return to === 0 ? 0 : 1;
  return Math.abs((to - from) / from);
}

function limitsEqual(a: OddsLimits, b: OddsLimits): boolean {
  return (
    a.maxBet === b.maxBet && a.minBet === b.minBet && (a.currency ?? null) === (b.currency ?? null)
  );
}

/**
 * Structural + market/price/limit diff between two odds snapshots.
 * Uses Bun.deepEquals for the identical short-circuit (ignoring timestamp/hash).
 */
export function detectChanges(prev: OddsSnapshot, curr: OddsSnapshot): DiffResult {
  const prevBody = {
    markets: prev.markets,
    limits: prev.limits,
  };
  const currBody = {
    markets: curr.markets,
    limits: curr.limits,
  };

  if (Bun.deepEquals(prevBody, currBody, true)) {
    return {
      identical: true,
      marketsAdded: [],
      marketsRemoved: [],
      priceChanges: [],
      limitChanges: null,
    };
  }

  // contentHash fast path when both present and markets/limits still need detail
  if (prev.contentHash && curr.contentHash && prev.contentHash === curr.contentHash) {
    return {
      identical: true,
      marketsAdded: [],
      marketsRemoved: [],
      priceChanges: [],
      limitChanges: null,
    };
  }

  const prevMarketIds = new Set(prev.markets.map(m => m.id));
  const currMarketIds = new Set(curr.markets.map(m => m.id));

  const marketsAdded: string[] = [];
  const marketsRemoved: string[] = [];
  for (const id of currMarketIds) {
    if (!prevMarketIds.has(id)) marketsAdded.push(id);
  }
  for (const id of prevMarketIds) {
    if (!currMarketIds.has(id)) marketsRemoved.push(id);
  }

  const priceChanges: PriceChange[] = [];
  for (const currMarket of curr.markets) {
    const prevMarket = prev.markets.find(m => m.id === currMarket.id);
    if (!prevMarket) continue;
    for (const currSel of currMarket.selections) {
      const prevSel = prevMarket.selections.find(s => s.name === currSel.name);
      if (!prevSel) continue;
      if (prevSel.price !== currSel.price) {
        priceChanges.push({
          marketId: currMarket.id,
          selection: currSel.name,
          from: prevSel.price,
          to: currSel.price,
          rel: relChange(prevSel.price, currSel.price),
        });
      }
    }
  }

  const limitChanges = limitsEqual(prev.limits, curr.limits)
    ? null
    : { from: prev.limits, to: curr.limits };

  return {
    identical: false,
    marketsAdded,
    marketsRemoved,
    priceChanges,
    limitChanges,
  };
}
