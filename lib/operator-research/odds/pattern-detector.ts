// @see https://bun.com/docs/runtime/utils#bun-peek — Bun.peek
import type { DiffResult, EdgeSignal, OddsSnapshot } from './types.ts';

const DEFAULT_LINE_MOVE_REL = 0.1; // 10%

/**
 * Detect line moves, steam, new markets, and simple cross-snapshot anomalies.
 * Pure function over historical snapshots — no network I/O.
 */
export function detectPatterns(
  snapshot: OddsSnapshot,
  previousSnapshots: OddsSnapshot[],
  opts: {
    lineMoveRel?: number;
    diff?: DiffResult | null;
  } = {}
): EdgeSignal[] {
  const signals: EdgeSignal[] = [];
  const lineMoveRel = opts.lineMoveRel ?? DEFAULT_LINE_MOVE_REL;
  const observedAt = snapshot.timestamp;

  // New markets from latest diff
  if (opts.diff?.marketsAdded?.length) {
    for (const marketId of opts.diff.marketsAdded) {
      signals.push({
        type: 'new_market',
        confidence: 0.7,
        host: snapshot.host,
        details: `New market ${marketId}`,
        marketId,
        observedAt,
      });
    }
  }

  // Price moves from latest diff with high relative change
  if (opts.diff?.priceChanges?.length) {
    for (const pc of opts.diff.priceChanges) {
      if (pc.rel >= lineMoveRel) {
        signals.push({
          type: 'line_move',
          confidence: Math.min(1, pc.rel),
          host: snapshot.host,
          details: `${pc.selection} moved from ${pc.from} to ${pc.to} (rel=${pc.rel.toFixed(3)})`,
          marketId: pc.marketId,
          selection: pc.selection,
          observedAt,
        });
      }
    }
  }

  // Historical window: compare first vs last of previous+current
  const window = [...previousSnapshots, snapshot];
  if (window.length >= 2) {
    const first = window[0]!;
    const last = window[window.length - 1]!;
    const dirByMarket = new Map<string, number>(); // +1 up, -1 down

    for (const market of last.markets) {
      const firstMarket = first.markets.find(m => m.id === market.id);
      if (!firstMarket) continue;
      for (const sel of market.selections) {
        const firstSel = firstMarket.selections.find(s => s.name === sel.name);
        if (!firstSel || firstSel.price === 0) continue;
        const change = (sel.price - firstSel.price) / Math.abs(firstSel.price);
        if (Math.abs(change) >= lineMoveRel) {
          // Avoid duplicate if already flagged from diff
          const already = signals.some(
            s => s.type === 'line_move' && s.marketId === market.id && s.selection === sel.name
          );
          if (!already) {
            signals.push({
              type: 'line_move',
              confidence: Math.min(1, Math.abs(change)),
              host: snapshot.host,
              details: `${sel.name} window move ${firstSel.price} → ${sel.price}`,
              marketId: market.id,
              selection: sel.name,
              observedAt,
            });
          }
          const prev = dirByMarket.get(market.id) ?? 0;
          dirByMarket.set(market.id, prev + (change > 0 ? 1 : -1));
        }
      }
    }

    // Steam: ≥2 markets moving same direction in the window
    let up = 0;
    let down = 0;
    for (const v of dirByMarket.values()) {
      if (v > 0) up++;
      if (v < 0) down++;
    }
    if (up >= 2 || down >= 2) {
      signals.push({
        type: 'steam',
        confidence: Math.min(1, Math.max(up, down) / 5),
        host: snapshot.host,
        details: `Steam signal: ${up} markets up, ${down} markets down over window of ${window.length}`,
        observedAt,
      });
    }
  }

  // Suspicious: large limit drop with no price change
  if (
    opts.diff?.limitChanges &&
    opts.diff.priceChanges.length === 0 &&
    opts.diff.limitChanges.from.maxBet != null &&
    opts.diff.limitChanges.to.maxBet != null &&
    opts.diff.limitChanges.to.maxBet < opts.diff.limitChanges.from.maxBet * 0.5
  ) {
    signals.push({
      type: 'suspicious',
      confidence: 0.55,
      host: snapshot.host,
      details: `Max bet cut ${opts.diff.limitChanges.from.maxBet} → ${opts.diff.limitChanges.to.maxBet} without price moves`,
      observedAt,
    });
  }

  return signals;
}

/**
 * Optional multi-book arbitrage: same market/selection names across hosts.
 * Returns empty when fewer than 2 books or no overlapping selections.
 */
export function detectArbitrage(
  snapshots: OddsSnapshot[],
  opts: { minEdge?: number } = {}
): EdgeSignal[] {
  const minEdge = opts.minEdge ?? 0.02; // 2% gross edge on decimal odds inverse
  if (snapshots.length < 2) return [];

  // Index: selection key → { host, price }[]
  type Quote = { host: OddsSnapshot['host']; price: number; marketId: string }; // brand-ok — opaque research/wire id
  const book: Map<string, Quote[]> = new Map();

  for (const snap of snapshots) {
    for (const m of snap.markets) {
      for (const s of m.selections) {
        const key = `${m.name}::${s.name}`.toLowerCase();
        const list = book.get(key) ?? [];
        list.push({ host: snap.host, price: s.price, marketId: m.id });
        book.set(key, list);
      }
    }
  }

  const signals: EdgeSignal[] = [];
  const now = Date.now();
  for (const [key, quotes] of book) {
    if (quotes.length < 2) continue;
    // For decimal odds: arb if sum(1/price) < 1
    const invSum = quotes.reduce((acc, q) => acc + 1 / q.price, 0);
    if (invSum < 1 - minEdge) {
      const edge = 1 - invSum;
      const best = quotes.slice().sort((a, b) => b.price - a.price)[0]!;
      signals.push({
        type: 'arbitrage',
        confidence: Math.min(1, edge * 5),
        host: best.host,
        details: `Arb on ${key}: invSum=${invSum.toFixed(4)} edge=${(edge * 100).toFixed(2)}% across ${quotes.length} books`,
        marketId: best.marketId,
        selection: key.split('::')[1],
        observedAt: now,
      });
    }
  }
  return signals;
}

/**
 * Optimistic resolve helper for dashboard APIs — if a snapshot promise is
 * already settled, Bun.peek returns the value without awaiting a microtask.
 */
export function peekSnapshot(
  promise: Promise<OddsSnapshot | null>
): OddsSnapshot | null | Promise<OddsSnapshot | null> {
  const status = Bun.peek.status(promise);
  if (status === 'fulfilled') {
    return Bun.peek(promise) as OddsSnapshot | null;
  }
  return promise;
}
