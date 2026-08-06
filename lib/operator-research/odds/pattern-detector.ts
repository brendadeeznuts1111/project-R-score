// @see https://bun.com/docs/runtime/utils#bun-peek — Bun.peek
import {
  arbStakeWeights,
  deVigTwoWay,
  expectedValuePct,
  impliedProb,
  kellyFraction,
  multiWayArbEdge,
  overround,
  steamVelocity,
} from './edge-math.ts';
import type { DiffResult, EdgeSignal, OddsMarket, OddsSnapshot } from './types.ts';

const DEFAULT_LINE_MOVE_REL = 0.1; // 10%
const DEFAULT_VALUE_EV_PCT = 2; // 2% EV
const DEFAULT_STEAM_VEL = 0.02; // 2% relative per minute

function marketKey(m: OddsMarket): string {
  return m.name.trim().toLowerCase();
}

function selectionKey(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Detect line moves, steam (direction + velocity), new markets, and limit anomalies.
 */
export function detectPatterns(
  snapshot: OddsSnapshot,
  previousSnapshots: OddsSnapshot[],
  opts: {
    lineMoveRel?: number;
    steamVelocityMin?: number;
    diff?: DiffResult | null;
  } = {}
): EdgeSignal[] {
  const signals: EdgeSignal[] = [];
  const lineMoveRel = opts.lineMoveRel ?? DEFAULT_LINE_MOVE_REL;
  const steamVelMin = opts.steamVelocityMin ?? DEFAULT_STEAM_VEL;
  const observedAt = snapshot.timestamp;

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
          meta: { edgePct: pc.rel * 100 },
        });
      }
    }
  }

  const window = [...previousSnapshots, snapshot];
  if (window.length >= 2) {
    const first = window[0]!;
    const last = window[window.length - 1]!;
    const dirByMarket = new Map<string, number>();

    for (const market of last.markets) {
      const firstMarket = first.markets.find(m => m.id === market.id);
      if (!firstMarket) continue;
      for (const sel of market.selections) {
        const firstSel = firstMarket.selections.find(s => s.name === sel.name);
        if (!firstSel || firstSel.price === 0) continue;
        const change = (sel.price - firstSel.price) / Math.abs(firstSel.price);
        const vel = steamVelocity(firstSel.price, sel.price, first.timestamp, last.timestamp);

        if (Math.abs(change) >= lineMoveRel) {
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
              meta: { edgePct: Math.abs(change) * 100, velocityPerMin: vel },
            });
          }
          const prev = dirByMarket.get(market.id) ?? 0;
          dirByMarket.set(market.id, prev + (change > 0 ? 1 : -1));
        }

        // High velocity steam on a single selection
        if (Math.abs(vel) >= steamVelMin && Math.abs(change) >= lineMoveRel * 0.5) {
          signals.push({
            type: 'steam',
            confidence: Math.min(1, Math.abs(vel) * 10),
            host: snapshot.host,
            details: `Steam velocity ${sel.name}: ${vel.toFixed(4)}/min (${firstSel.price}→${sel.price})`,
            marketId: market.id,
            selection: sel.name,
            observedAt,
            meta: { velocityPerMin: vel, edgePct: Math.abs(change) * 100 },
          });
        }
      }
    }

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
        details: `Steam cluster: ${up} markets up, ${down} markets down over window of ${window.length}`,
        observedAt,
      });
    }
  }

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
 * Cross-book arbitrage: for each market name, take the **best** decimal price
 * per selection across books, then test multi-way invSum < 1.
 *
 * (Previously incorrectly summed inverse prices of the *same* selection across books.)
 */
export function detectArbitrage(
  snapshots: OddsSnapshot[],
  opts: { minEdge?: number } = {}
): EdgeSignal[] {
  const minEdge = opts.minEdge ?? 0.02;
  if (snapshots.length < 2) return [];

  type Quote = {
    host: OddsSnapshot['host'];
    price: number;
    marketId: string; // brand-ok
    selection: string;
  };

  // marketKey → selectionKey → best quote
  const markets = new Map<string, Map<string, Quote>>();

  for (const snap of snapshots) {
    for (const m of snap.markets) {
      const mk = marketKey(m);
      let selMap = markets.get(mk);
      if (!selMap) {
        selMap = new Map();
        markets.set(mk, selMap);
      }
      for (const s of m.selections) {
        if (!(s.price > 1)) continue;
        const sk = selectionKey(s.name);
        const prev = selMap.get(sk);
        if (!prev || s.price > prev.price) {
          selMap.set(sk, {
            host: snap.host,
            price: s.price,
            marketId: m.id,
            selection: s.name,
          });
        }
      }
    }
  }

  const signals: EdgeSignal[] = [];
  const now = Date.now();

  for (const [mk, selMap] of markets) {
    if (selMap.size < 2) continue;
    const quotes = [...selMap.values()];
    const bestPrices = quotes.map(q => q.price);
    const edge = multiWayArbEdge(bestPrices);
    if (edge < minEdge) continue;

    const invSum = bestPrices.reduce((a, p) => a + 1 / p, 0);
    const weights = arbStakeWeights(bestPrices);
    const legs = quotes.map((q, i) => ({
      host: String(q.host),
      selection: q.selection,
      price: q.price,
      weight: weights[i] ?? 0,
      marketId: q.marketId,
    }));

    // Host for signal = book with highest stake weight (largest inverse)
    const top = legs.slice().sort((a, b) => b.weight - a.weight)[0]!;
    const hostSnap = snapshots.find(s => String(s.host) === top.host);
    signals.push({
      type: 'arbitrage',
      confidence: Math.min(1, edge * 5),
      host: hostSnap?.host ?? quotes[0]!.host,
      details: `Arb on "${mk}": edge=${(edge * 100).toFixed(2)}% invSum=${invSum.toFixed(4)} · ${legs
        .map(
          l => `${l.selection}@${l.host} ${l.price.toFixed(3)} (${(l.weight * 100).toFixed(1)}%)`
        )
        .join(' · ')}`,
      marketId: top.marketId,
      observedAt: now,
      meta: {
        edgePct: edge * 100,
        invSum,
        legs,
      },
    });
  }

  return signals;
}

/**
 * Value edges: pick the sharpest book (lowest overround two-way), de-vig,
 * then flag soft books with EV above threshold.
 */
export function detectValueEdges(
  snapshots: OddsSnapshot[],
  opts: { minEvPct?: number; sharpHosts?: string[] } = {}
): EdgeSignal[] {
  const minEvPct = opts.minEvPct ?? DEFAULT_VALUE_EV_PCT;
  const sharpPrefer = new Set(
    (opts.sharpHosts ?? ['pinnacle.com', 'pinnacle', 'circa', 'bookmaker.eu']).map(h =>
      h.toLowerCase()
    )
  );
  if (snapshots.length < 2) return [];

  // Collect two-way markets by name
  type Side = { host: OddsSnapshot['host']; price: number; marketId: string; name: string }; // brand-ok
  const byMarket = new Map<string, Map<string, Side[]>>();

  for (const snap of snapshots) {
    for (const m of snap.markets) {
      if (m.selections.length !== 2) continue;
      const mk = marketKey(m);
      let sides = byMarket.get(mk);
      if (!sides) {
        sides = new Map();
        byMarket.set(mk, sides);
      }
      for (const s of m.selections) {
        const sk = selectionKey(s.name);
        const list = sides.get(sk) ?? [];
        list.push({
          host: snap.host,
          price: s.price,
          marketId: m.id,
          name: s.name,
        });
        sides.set(sk, list);
      }
    }
  }

  const signals: EdgeSignal[] = [];
  const now = Date.now();

  for (const [mk, sides] of byMarket) {
    if (sides.size !== 2) continue;
    const [selA, selB] = [...sides.keys()];
    const quotesA = sides.get(selA!)!;
    const quotesB = sides.get(selB!)!;

    // Per-host two-way pairs for overround ranking
    type Pair = {
      host: OddsSnapshot['host'];
      a: Side;
      b: Side;
      ov: number;
    };
    const pairs: Pair[] = [];
    for (const snap of snapshots) {
      const a = quotesA.find(q => String(q.host) === String(snap.host));
      const b = quotesB.find(q => String(q.host) === String(snap.host));
      if (!a || !b) continue;
      pairs.push({
        host: snap.host,
        a,
        b,
        ov: overround([a.price, b.price]),
      });
    }
    if (pairs.length < 2) continue;

    // Sharp: preferred host, else lowest overround
    let sharp =
      pairs.find(p => {
        const h = String(p.host).toLowerCase();
        return [...sharpPrefer].some(s => h.includes(s));
      }) ?? null;
    if (!sharp) {
      sharp = pairs.slice().sort((x, y) => x.ov - y.ov)[0]!;
    }

    const fair = deVigTwoWay(sharp.a.price, sharp.b.price);
    if (!fair) continue;

    for (const pair of pairs) {
      if (String(pair.host) === String(sharp.host)) continue;
      for (const [side, trueP] of [[pair.a, fair.pA] as const, [pair.b, fair.pB] as const]) {
        const ev = expectedValuePct(trueP, side.price);
        if (ev < minEvPct) continue;
        const kelly = kellyFraction(trueP, side.price);
        signals.push({
          type: 'value',
          confidence: Math.min(1, ev / 20),
          host: pair.host,
          details: `Value ${side.name} on ${String(pair.host)} vs sharp ${String(sharp.host)}: EV=${ev.toFixed(2)}% trueP=${(trueP * 100).toFixed(1)}% @ ${side.price} (market "${mk}")`,
          marketId: side.marketId,
          selection: side.name,
          observedAt: now,
          meta: {
            evPct: ev,
            kelly,
            trueProb: trueP,
            edgePct: ev,
            sharpHost: String(sharp.host),
            softHost: String(pair.host),
          },
        });
      }
    }
  }

  return signals;
}

/**
 * Full cross-book scan: arb + value + per-host pattern history (optional).
 */
export function scanCrossBookEdges(
  snapshots: OddsSnapshot[],
  opts: {
    minArbEdge?: number;
    minEvPct?: number;
    histories?: Map<string, OddsSnapshot[]>;
  } = {}
): EdgeSignal[] {
  const signals: EdgeSignal[] = [];
  signals.push(...detectArbitrage(snapshots, { minEdge: opts.minArbEdge }));
  signals.push(...detectValueEdges(snapshots, { minEvPct: opts.minEvPct }));

  if (opts.histories) {
    for (const snap of snapshots) {
      const hist = opts.histories.get(String(snap.host)) ?? [];
      signals.push(...detectPatterns(snap, hist));
    }
  }

  // Dedupe by type+host+market+selection+details prefix
  const seen = new Set<string>();
  const out: EdgeSignal[] = [];
  for (const s of signals) {
    const k = `${s.type}|${String(s.host)}|${s.marketId ?? ''}|${s.selection ?? ''}|${s.details.slice(0, 80)}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

export function peekSnapshot(
  promise: Promise<OddsSnapshot | null>
): OddsSnapshot | null | Promise<OddsSnapshot | null> {
  const status = Bun.peek.status(promise);
  if (status === 'fulfilled') {
    return Bun.peek(promise) as OddsSnapshot | null;
  }
  return promise;
}

// re-export math helpers for CLI convenience
export { impliedProb, overround, twoWayArbProfit, multiWayArbEdge, kellyFraction };
