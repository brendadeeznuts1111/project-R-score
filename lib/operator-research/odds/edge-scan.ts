// @see https://bun.com/docs/runtime/utils#bun-nanoseconds — Bun.nanoseconds
import { endpointFromHost, runMonitorTick } from './pipeline.ts';
import { getLastSnapshots, ensureOddsStore } from './odds-store.ts';
import { parseOddsJson } from './odds-parser.ts';
import { scanCrossBookEdges } from './pattern-detector.ts';
import type { EdgeScanReport, EdgeSignal, OddsSnapshot } from './types.ts';
import { FIXTURES_DIR } from '../paths.ts';
import { joinPath } from '../../path-bun.ts';

export type EdgeScanOptions = {
  hosts: string[];
  fixtureFallback?: boolean;
  store?: boolean;
  window?: number;
  minArbEdge?: number;
  minEvPct?: number;
  /** Load fixture pairs without network (host → fixture id). */
  seedFixtures?: Record<string, string>;
  includeHistoryPatterns?: boolean;
};

async function loadFixtureSnapshot(
  host: string,
  fixtureId: string
): Promise<OddsSnapshot | null> {
  const path = joinPath(FIXTURES_DIR, 'odds', `${fixtureId}.json`);
  const f = Bun.file(path);
  if (!(await f.exists())) return null;
  return parseOddsJson(await f.text(), { host, source: 'fixture' });
}

/**
 * Multi-host edge scan: optional fixture seed → monitor tick → arb/value/steam report.
 */
export async function runEdgeScan(opts: EdgeScanOptions): Promise<EdgeScanReport> {
  if (opts.store !== false) await ensureOddsStore();

  const snapshots: OddsSnapshot[] = [];
  const histories = new Map<string, OddsSnapshot[]>();

  if (opts.seedFixtures) {
    for (const [host, fid] of Object.entries(opts.seedFixtures)) {
      const snap = await loadFixtureSnapshot(host, fid);
      if (snap) snapshots.push(snap);
    }
  } else {
    const endpoints = opts.hosts.map(h => endpointFromHost(h));
    const ticks = await runMonitorTick({
      endpoints,
      fixtureFallback: opts.fixtureFallback !== false,
      store: opts.store !== false,
      window: opts.window ?? 5,
      crossBookArb: false, // we scan below with full meta
      crossBookValue: false,
      evaluateAlerts: false,
    });
    for (const t of ticks) {
      if (t.snapshot) snapshots.push(t.snapshot);
    }
  }

  for (const host of opts.hosts) {
    histories.set(host, getLastSnapshots(host, opts.window ?? 5));
  }

  const signals = scanCrossBookEdges(snapshots, {
    minArbEdge: opts.minArbEdge ?? 0.015,
    minEvPct: opts.minEvPct ?? 2,
    histories: opts.includeHistoryPatterns ? histories : undefined,
  });

  const summary = {
    arbitrage: 0,
    value: 0,
    steam: 0,
    line_move: 0,
    new_market: 0,
    suspicious: 0,
  };
  for (const s of signals) {
    if (s.type in summary) {
      summary[s.type as keyof typeof summary]++;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    hosts: opts.hosts,
    snapshots: snapshots.length,
    signals,
    summary,
  };
}

export function rankSignals(signals: EdgeSignal[]): EdgeSignal[] {
  const weight: Record<string, number> = {
    arbitrage: 100,
    value: 80,
    steam: 60,
    line_move: 40,
    suspicious: 50,
    new_market: 20,
  };
  return signals.slice().sort((a, b) => {
    const wa = (weight[a.type] ?? 0) + a.confidence * 10 + (a.meta?.edgePct ?? a.meta?.evPct ?? 0);
    const wb = (weight[b.type] ?? 0) + b.confidence * 10 + (b.meta?.edgePct ?? b.meta?.evPct ?? 0);
    return wb - wa;
  });
}
